import { tool, type UIMessageStreamWriter } from 'ai';
import { z } from 'zod';
import { getClient, callTool } from '../mcp';

export const minerPenalty = () =>
  tool({
    description:
      'Calculate the penalty for terminating sectors by Filecoin Miner.',
    inputSchema: z.object({
      minerID: z.string(),
    }),
    execute: async ({ minerID }) => {
      const client = await getClient('filecoin-mcp');
      if (!client) {
        throw new Error('Failed to get client');
      }
      const name = 'minerPenalty';
      const args = { minerID: minerID };
      try {
        const toolsResult = await callTool(client, name, args);
        return toolsResult[0];
      } catch (error) {
        console.error(`Failed to call tool '${name}':`, error);
        throw error;
      }
    },
  });
