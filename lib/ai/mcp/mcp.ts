import * as dotenv from 'dotenv';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { MCPServerConfig } from '@/config';
import { loadMcpServers } from '@/config';
import { ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { getDisplayName } from '@modelcontextprotocol/sdk/shared/metadataUtils.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';

dotenv.config();

export async function connectToMCP(serverUrl: string, name: string) {
  try {
    const transport = new StreamableHTTPClientTransport(new URL(serverUrl), {
      sessionId: name,
    });

    console.log(`Connecting ${name} MCP Service...`);
    // const client = Client({
    //   transport,
    //   name,
    //   onUncaughtError: (error) => {
    //     console.error(`${name} MCP Connect Error: ${error}`);
    //   },
    // });
    const client = new Client(
      {
        name: 'example-client',
        version: '1.0.0',
      },
      {
        capabilities: {
          elicitation: {},
        },
      },
    );
    await client.connect(transport);
    console.log(`Connected ${name} MCP Service at ${serverUrl}`);
    return client;
  } catch (error) {
    console.error(
      `Failed to connect ${name} MCP Service at ${serverUrl}:`,
      error,
    );
    throw error;
  }
}

export class Mcp {
  private cfgs: MCPServerConfig[];
  private clients = new Map<string, Client>();
  private tools = new Map<string, any>();

  constructor(cfgs: MCPServerConfig[]) {
    this.cfgs = cfgs;
  }

  async connect() {
    const toolsRequest = {
      method: 'tools/list',
      params: {},
    };
    console.log('Connecting to MCP servers...');
    for (const cfg of this.cfgs) {
      try {
        const existingClient = this.clients.get(cfg.name);
        if (existingClient) {
          continue;
        }
        // Connect to the server
        const client = await connectToMCP(cfg.urlOrCommand, cfg.name);
        this.clients.set(cfg.name, client);
        // Fetch and store tools
        // const tools = await client.tools();
        const toolsResult = await client.request(
          toolsRequest,
          ListToolsResultSchema,
        );
        if (toolsResult.tools.length > 0) {
          this.tools.set(cfg.name, toolsResult.tools);
        } else {
          throw new Error(`No tools found for ${cfg.name}`);
        }
        if (toolsResult.tools.length === 0) {
          console.log('No tools available');
        } else {
          // for (const tool of toolsResult.tools) {
          //     console.log(`  - id: ${tool.name}, name: ${getDisplayName(tool)}, description: ${tool.description}`);
          // }
        }
      } catch (error) {
        console.error(`Failed to connect to ${cfg.name}:`, error);
        // Remove entries for failed connections
        this.clients.delete(cfg.name);
        this.tools.delete(cfg.name);
      }
    }
  }

  get(name: string) {
    return this.clients.get(name);
  }

  getTools(name: string) {
    return this.tools.get(name);
  }

  allClients(): any[] {
    return Array.from(this.clients.values()).filter((client) => client);
  }

  allTools() {
    return Object.assign(
      {},
      ...Array.from(this.tools.entries()).map(([key, value]) => value),
    );
  }

  cfgLength(): number {
    return this.cfgs.length;
  }

  close() {
    for (const client of this.clients.values()) {
      client.close();
    }
  }
}

const gMcp = new Mcp(loadMcpServers());

export async function getMcpTools() {
  if (gMcp?.allClients()?.length !== gMcp?.cfgLength()) {
    await gMcp?.connect();
  }
  return gMcp?.allTools();
}

export async function getClient(name: string) {
  if (gMcp?.allClients()?.length !== gMcp?.cfgLength()) {
    await gMcp?.connect();
  }
  return gMcp?.get(name);
}

export async function callTool(client: Client, name: string, args: any) {
  if (!client) {
    throw new Error('Failed to get client');
  }
  try {
    const request = {
      method: 'tools/call',
      params: {
        name,
        arguments: args,
      },
    };
    console.log(`Calling tool '${name}' with arguments:`, args);
    const result = await client.request(request, CallToolResultSchema);
    const texts: string[] = [];
    result.content.forEach((item) => {
      if (item.type === 'text') {
        // console.log(` Text: ${item.text}`);
        texts.push(item.text);
      } else {
        console.log(`  [Unknown content type]:`, item);
        throw new Error(`Unknown content type: ${item}`);
      }
    });
    if (texts.length == 0) {
      throw new Error(`No text returned from tool ${name}`);
    }
    return texts;
  } catch (error) {
    console.log(`Error calling tool ${name}: ${error}`);
    throw error;
  }
}
