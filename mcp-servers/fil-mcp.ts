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
import { parse } from 'csv-parse/sync';

const instructions = `
## Filecoin MCP User Guide
  Providing miner related query functions
`;

/**
 * Get Filecoin MCP server
 * @param options Server options including name, version
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

  server.tool(
    'minerPenalty',
    'Calculate the penalty for terminating sectors by Filecoin Miner',
    {
      minerID: z
        .string()
        .describe(
          'miner id, miner id should be in the form of f010023 or t010023',
        ),
    },
    async ({ minerID }) => {
      try {
        const res = await fetchMinerPenalty(minerID);
        logger.info(
          `Get miner ${minerID} penalty information: ${JSON.stringify(res)}`,
        );

        return {
          content: [{ type: 'text', text: removeMidColumn(res) }],
        };
      } catch (error: unknown) {
        let errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `Failed to get miner ${minerID} penalty: ${errorMessage}`,
        );
        if (errorMessage.includes('not miner')) {
          errorMessage = minerID + ' is not miner';
        }
        return {
          content: [{ type: 'text', text: errorMessage }],
        };
      }
    },
  );

  return server;
}

// 定义数据类型
interface CsvRow {
  date: string;
  mid: string;
  sectors_sum: string;
  'power(TiB)': string;
  pledge: string;
  penalty: string;
}

interface FormattedRow {
  date: string;
  sectors_sum: string;
  'power(TiB)': string;
  pledge: string;
  penalty: string;
}

// 解析 CSV 并移除 mid 列
function removeMidColumn(csv: string): string {
  // 解析 CSV 数据
  const records: CsvRow[] = parse(csv, {
    columns: true,
    skip_empty_lines: true,
  });

  // 移除 mid 列
  const formattedRecords: FormattedRow[] = records.map(
    ({ date, sectors_sum, 'power(TiB)': power, pledge, penalty }) => ({
      date,
      sectors_sum,
      'power(TiB)': power,
      pledge: pledge,
      penalty: penalty,
    }),
  );

  // 转换回 CSV 格式
  const header = Object.keys(formattedRecords[0]).join(',');
  const rows = formattedRecords.map((row) =>
    Object.values(row)
      .map((value) => `"${value}"`)
      .join(','),
  );
  return [header, ...rows].join('\n');
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
      console.error('Failed to start Filecoin MCP server:', errorMessage);
      process.exit(1);
    });
  });

program.parse();
