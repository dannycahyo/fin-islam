import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Musharakah calculation schema
const MusharakahInputSchema = z.object({
  partners: z.array(
    z.object({
      name: z.string(),
      investment: z.number().positive(),
    })
  ),
  totalProfit: z.number(),
  profitRatio: z.array(z.number()).optional().describe('Optional custom profit sharing ratio'),
});

// Mudharabah calculation schema
const MudharabahInputSchema = z.object({
  capitalAmount: z.number().positive(),
  profit: z.number(),
  capitalProviderRatio: z.number().min(0).max(1),
  entrepreneurRatio: z.number().min(0).max(1),
});

// Calculator functions
function calculateMusharakah(input: z.infer<typeof MusharakahInputSchema>) {
  const totalInvestment = input.partners.reduce((sum, p) => sum + p.investment, 0);
  const isLoss = input.totalProfit < 0;

  const results = input.partners.map((partner, index) => {
    const capitalRatio = partner.investment / totalInvestment;

    // For losses, always use capital ratio
    // For profits, use custom ratio if provided, otherwise capital ratio
    let share: number;
    if (isLoss) {
      share = input.totalProfit * capitalRatio;
    } else if (input.profitRatio && input.profitRatio.length === input.partners.length) {
      share = input.totalProfit * input.profitRatio[index];
    } else {
      share = input.totalProfit * capitalRatio;
    }

    return {
      partner: partner.name,
      investment: partner.investment,
      capitalRatio: (capitalRatio * 100).toFixed(2) + '%',
      share: share.toFixed(2),
    };
  });

  return {
    type: 'musharakah',
    totalInvestment,
    totalProfit: input.totalProfit,
    isLoss,
    distribution: results,
    explanation: isLoss
      ? 'Losses are distributed according to capital ratio (Shariah requirement)'
      : 'Profits distributed according to agreed ratio',
  };
}

function calculateMudharabah(input: z.infer<typeof MudharabahInputSchema>) {
  const isLoss = input.profit < 0;

  if (isLoss) {
    return {
      type: 'mudharabah',
      capitalAmount: input.capitalAmount,
      profit: input.profit,
      isLoss: true,
      distribution: {
        capitalProvider: {
          share: input.profit,
          explanation: 'Capital provider bears all losses',
        },
        entrepreneur: {
          share: 0,
          explanation: 'Entrepreneur receives nothing in case of loss',
        },
      },
      explanation:
        'In Mudharabah, capital provider bears all losses, entrepreneur loses their effort',
    };
  }

  const capitalProviderShare = input.profit * input.capitalProviderRatio;
  const entrepreneurShare = input.profit * input.entrepreneurRatio;

  return {
    type: 'mudharabah',
    capitalAmount: input.capitalAmount,
    profit: input.profit,
    isLoss: false,
    distribution: {
      capitalProvider: {
        ratio: (input.capitalProviderRatio * 100).toFixed(0) + '%',
        share: capitalProviderShare.toFixed(2),
      },
      entrepreneur: {
        ratio: (input.entrepreneurRatio * 100).toFixed(0) + '%',
        share: entrepreneurShare.toFixed(2),
      },
    },
    explanation: 'Profits distributed according to agreed ratio between parties',
  };
}

// Define MCP tools
const tools: Tool[] = [
  {
    name: 'calculate_musharakah',
    description:
      'Calculate profit/loss distribution in a Musharakah (partnership) contract. Partners share profits according to agreement (or capital ratio) and losses according to capital ratio.',
    inputSchema: {
      type: 'object',
      properties: {
        partners: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              investment: { type: 'number' },
            },
            required: ['name', 'investment'],
          },
        },
        totalProfit: { type: 'number' },
        profitRatio: {
          type: 'array',
          items: { type: 'number' },
          description: 'Optional custom profit sharing ratio',
        },
      },
      required: ['partners', 'totalProfit'],
    },
  },
  {
    name: 'calculate_mudharabah',
    description:
      'Calculate profit/loss distribution in a Mudharabah contract between capital provider (Rabb al-Mal) and entrepreneur (Mudarib). Capital provider bears losses, profits shared by agreement.',
    inputSchema: {
      type: 'object',
      properties: {
        capitalAmount: { type: 'number' },
        profit: { type: 'number' },
        capitalProviderRatio: { type: 'number', minimum: 0, maximum: 1 },
        entrepreneurRatio: { type: 'number', minimum: 0, maximum: 1 },
      },
      required: ['capitalAmount', 'profit', 'capitalProviderRatio', 'entrepreneurRatio'],
    },
  },
];

// Initialize MCP server
const server = new Server(
  {
    name: 'islamic-finance-calculator',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'calculate_musharakah') {
      const input = MusharakahInputSchema.parse(args);
      const result = calculateMusharakah(input);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    if (name === 'calculate_mudharabah') {
      const input = MudharabahInputSchema.parse(args);
      const result = calculateMudharabah(input);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid input: ${error.message}`);
    }
    throw error;
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Islamic Finance MCP Calculator started');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
