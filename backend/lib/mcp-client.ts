import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import { resolve } from 'path';

export class MCPClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'MCPClientError';
  }
}

export interface MCPToolResult {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
}

export class MCPClient {
  private static instance: MCPClient | null = null;
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private isConnected = false;

  private constructor() {}

  static getInstance(): MCPClient {
    if (!MCPClient.instance) {
      MCPClient.instance = new MCPClient();
    }
    return MCPClient.instance;
  }

  async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      return;
    }

    try {
      const serverPath = process.env.MCP_SERVER_PATH || '../mcp-server/dist/index.js';
      const absolutePath = resolve(process.cwd(), serverPath);

      // Spawn MCP server process
      const serverProcess = spawn('node', [absolutePath], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      serverProcess.on('error', (error) => {
        console.error('MCP server process error:', error);
      });

      serverProcess.stderr?.on('data', (data) => {
        console.error('MCP server stderr:', data.toString());
      });

      // Create stdio transport
      this.transport = new StdioClientTransport({
        command: 'node',
        args: [absolutePath],
      });

      // Create client and connect
      this.client = new Client(
        {
          name: 'calculation-agent-client',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      await this.client.connect(this.transport);
      this.isConnected = true;

      console.log('MCP client connected successfully');
    } catch (error) {
      this.isConnected = false;
      throw new MCPClientError('Failed to connect to MCP server', 'CONNECTION_ERROR', error);
    }
  }

  async callTool(toolName: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    if (!this.isConnected || !this.client) {
      await this.connect();
    }

    try {
      const result = await this.client!.callTool({
        name: toolName,
        arguments: args,
      });

      return result as MCPToolResult;
    } catch (error) {
      throw new MCPClientError(`Tool call failed: ${toolName}`, 'TOOL_CALL_ERROR', error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
      } catch (error) {
        console.error('Error closing MCP client:', error);
      }
      this.client = null;
      this.transport = null;
      this.isConnected = false;
      console.log('MCP client disconnected');
    }
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, disconnecting MCP client...');
  await MCPClient.getInstance().disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, disconnecting MCP client...');
  await MCPClient.getInstance().disconnect();
  process.exit(0);
});
