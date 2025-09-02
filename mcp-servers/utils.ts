import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { Request, Response } from 'express';
import express from 'express';
import type { Logger } from 'winston';

export class StreamableHTTPServer {
  private server: McpServer;
  private port: number;
  private logger: Logger;
  private transports: { [key: string]: SSEServerTransport } = {};

  constructor(server: McpServer, port: number, logger: Logger) {
    this.server = server;
    this.port = port;
    this.logger = logger;
  }

  async run() {
    const app = express();
    const logger = this.logger;
    const server = this.server;
    const transports = this.transports;
    logger.info(`Using HTTP transport`);

    app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({ status: 'ok' });
    });

    app.post('/mcp', async (req: Request, res: Response) => {
      try {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
        });

        res.on('close', () => {
          transport.close();
          server.close();
        });

        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        logger.error(`Error handling MCP request: ${error}`);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal server error',
            },
            id: null,
          });
        }
      }
    });

    app.get('/mcp', async (req: Request, res: Response) => {
      logger.info('Received GET request to /sse (establishing SSE stream)');
      try {
        // Create a new SSE transport for the client
        // The endpoint for POST messages is '/messages'
        const transport = new SSEServerTransport('/messages', res);
        // Store the transport by session ID
        const sessionId = transport.sessionId;
        transports[sessionId] = transport;
        // Set up onclose handler to clean up transport when closed
        transport.onclose = () => {
          logger.info(`SSE transport closed for session ${sessionId}`);
          delete transports[sessionId];
        };

        await server.connect(transport);
        logger.info(`SSE transport connected for session ${sessionId}`);
      } catch (error) {
        logger.error(`Error establishing SSE stream: ${error}`);
        if (!res.headersSent) {
          res.status(500).send('Error establishing SSE stream');
        }
      }
    });

    app.post('/messages', async (req: Request, res: Response) => {
      logger.info('Received POST request to /messages');
      // Extract session ID from URL query parameter
      // In the SSE protocol, this is added by the client based on the endpoint event
      const sessionId = req.query.sessionId;
      if (!sessionId) {
        logger.error('No session ID provided in request URL');
        res.status(400).send('Missing sessionId parameter');
        return;
      }
      const transport = transports[sessionId.toString()];
      if (!transport) {
        logger.error(`No active transport found for session ID: ${sessionId}`);
        res.status(404).send('Session not found');
        return;
      }
      try {
        // Handle the POST message with the transport
        await transport.handlePostMessage(req, res, req.body);
      } catch (error) {
        logger.error(`Error handling request: ${error}`);
        if (!res.headersSent) {
          res.status(500).send('Error handling request');
        }
      }
    });

    app.listen(this.port, () => {
      logger.info(
        `MCP Stateless Streamable HTTP Server listening on port ${this.port}`,
      );
    });
  }
}
