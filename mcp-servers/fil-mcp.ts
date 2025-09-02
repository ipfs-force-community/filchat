#!/usr/bin/env node

/**
 * Filecoin MCP Server Implementation
 * Provide Filecoin related query interface
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { Command } from 'commander';
import { StreamableHTTPServer } from './utils';
import logger from './logger';
import { fetchMinerPenalty } from './http';

const instructions = `
## Filecoin MCP User Guide
  Providing miner related query functions
`;

/**
 * Table interface for SQLite tables
 */
interface TableInfo {
  name: string;
}

/**
 * Get SQLite MCP server
 * @param options Server options including name, version and database instance
 * @returns The MCP server instance
 */
function getServer(options: {
  name?: string;
  version?: string;
}): McpServer {
  const { name = 'filecoin-mcp', version = '1.0.0' } = options;

  // Create MCP server
  const server = new McpServer(
    {
      name,
      version,
    },
    {
      instructions,
    },
  );

  // Add tables tool
  server.tool(
    'minerPenalty',
    'Calculate the penalty for terminating sectors by Filecoin Miner',
    {
      minerID: z
        .string()
        .describe('miner id, miner id should be in the form of f010023'),
    },
    async ({ minerID }) => {
      try {
        const res = await fetchMinerPenalty(minerID);
        logger.info(
          `Get miner ${minerID} penalty information: ${JSON.stringify(res)}`,
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(res) }],
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to get table information: ${errorMessage} `);
      }
    },
  );

  return server;
}

export async function createAndRun(options: {
  name?: string;
  version?: string;
  port: string;
  transportType: string;
}) {
  const server = getServer({
    name: options.name,
    version: options.version,
  });

  if (options.transportType === 'stdio') {
    // Connect to stdio transport
    logger.info(`Using Stdio transport`);
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } else {
    await new StreamableHTTPServer(server, Number(options.port), logger).run();
  }
}

interface Options {
  port: string;
  type: string;
}

const name = 'filecoin-mcp';
const version = '1.0.0';
const program = new Command();
program
  .name(name)
  .description('Filecoin MCP Server - Provide Filecoin related query interface')
  .version(version)
  .option('--port <port>', 'Server port', '3002')
  .option('--type <transport type>', 'Transport type: stdio or http', 'http')
  .action((options: Options) => {
    createAndRun({
      name,
      version,
      port: options.port,
      transportType: options.type,
    }).catch((error: unknown) => {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('Failed to start SQLite MCP server:', errorMessage);
      process.exit(1);
    });
  });

program.parse();
