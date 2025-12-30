import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools/index.js';

/**
 * Islamic Finance MCP Calculator Server
 *
 * Provides tools for calculating profit/loss distribution in Islamic finance contracts:
 * - Musharakah (شراكة - Partnership): Partners share both capital and profits/losses
 * - Mudharabah (مضاربة): Capital provider and entrepreneur partnership
 *
 * All calculations follow Shariah-compliant principles.
 */

// Initialize MCP server with new API
const server = new McpServer({
  name: 'islamic-finance-calculator',
  version: '1.0.0',
});

// Register all calculation tools
registerTools(server);

// Start server with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log('Islamic Finance MCP Calculator server started');
  console.log('Available tools: calculate_musharakah, calculate_mudharabah');
}

// Graceful shutdown
process.stdin.on('close', () => {
  console.log('Islamic Finance MCP Calculator server closed');
  server.close();
});

// Start the server
main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
