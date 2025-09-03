/**
 * 配置模块入口文件
 * 整合所有配置并导出
 */

import { config as dotenvConfig } from 'dotenv';
import { readFileSync } from 'node:fs';

// 加载环境变量
dotenvConfig();

// MCP 服务器配置文件路径
const MCP_SERVERS_PATH = process.env.MCP_SERVERS_PATH || './mcp.json';

/**
 * 加载 MCP 服务器配置
 * @param path MCP 服务器配置文件路径
 * @returns MCP 服务器配置列表
 */
export function loadMcpServers(
  path: string = MCP_SERVERS_PATH,
): MCPServerConfig[] {
  const mcpServers = readFileSync(path, 'utf-8');
  return JSON.parse(mcpServers);
}

/**
 * Types for MCP (Model Context Protocol) service
 */

/**
 * MCP server configuration
 */
export interface MCPServerConfig {
  /**
   * Server name
   */
  name: string;

  /**
   * MCP server URL or command
   * - For HTTP transport: URL to the MCP server
   * - For STDIO transport: Command to start the MCP server
   */
  urlOrCommand: string;

  /**
   * Transport type
   */
  transportType: 'http' | 'stdio';

  /**
   * Authentication token (optional)
   */
  authToken?: string;

  /**
   * Connection timeout in milliseconds (optional, default: 30000)
   */
  connectionTimeout?: number;

  /**
   * Retry settings (optional)
   */
  retry?: {
    /**
     * Maximum number of retries (default: 3)
     */
    maxRetries?: number;

    /**
     * Retry delay in milliseconds (default: 1000)
     */
    retryDelay?: number;
  };

  /**
   * Maximum number of retries (optional, default: 3)
   */
  maxRetries?: number;

  /**
   * Retry delay in milliseconds (optional, default: 1000)
   */
  retryDelay?: number;

  /**
   * Log level (optional, default: 'info')
   */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';

  /**
   * Additional arguments for STDIO transport (optional)
   */
  args?: string[];

  /**
   * Environment variables for STDIO transport (optional)
   */
  env?: Record<string, string>;

  /**
   * HTTP headers for HTTP transport (optional)
   */
  headers?: Record<string, string>;

  /**
   * 包含模式 - 只保留这些工具和资源 (optional)
   * 如果指定，只有名称/URI匹配这些模式的工具和资源会被保留
   * 优先级高于 exclude
   */
  include?: string[];

  /**
   * 排除模式 - 排除这些工具和资源 (optional)
   * 名称/URI匹配这些模式的工具和资源会被排除
   */
  exclude?: string[];
}
