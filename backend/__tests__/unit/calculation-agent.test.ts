import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CalculationAgent, CalculationAgentError } from '@/agents/calculation-agent';

// Mock dependencies
vi.mock('@langchain/ollama');

// Create a single mock MCP instance that will be reused
const mockMCPInstance = {
  connect: vi.fn(),
  callTool: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('@/lib/mcp-client', () => ({
  MCPClient: {
    getInstance: vi.fn(() => mockMCPInstance),
  },
  MCPClientError: class extends Error {
    constructor(
      message: string,
      public code: string,
      public originalError?: unknown
    ) {
      super(message);
      this.name = 'MCPClientError';
    }
  },
}));

import { ChatOllama } from '@langchain/ollama';

describe('CalculationAgent', () => {
  let agent: CalculationAgent;
  let mockLLMInvoke: ReturnType<typeof vi.fn>;
  let mockMCPCallTool: ReturnType<typeof vi.fn>;
  let mockMCPConnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup LLM mock
    mockLLMInvoke = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ChatOllama as any).mockImplementation(function () {
      return {
        invoke: mockLLMInvoke,
      };
    });

    // Setup MCP mock references
    mockMCPConnect = mockMCPInstance.connect;
    mockMCPCallTool = mockMCPInstance.callTool;

    // Default MCP mock response
    mockMCPConnect.mockResolvedValue(undefined);
    mockMCPCallTool.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            summary: 'Test Summary',
            contract_type: 'Test Contract',
            total_investment: 100000,
            total_profit_loss: 20000,
            is_loss: false,
            distribution: [],
            shariah_explanation: 'Test explanation',
            calculation_steps: ['Step 1', 'Step 2'],
          }),
        },
      ],
      isError: false,
    });

    agent = new CalculationAgent();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with default config', () => {
      const testAgent = new CalculationAgent();
      expect(testAgent).toBeDefined();
    });

    it('should initialize with custom config', () => {
      const testAgent = new CalculationAgent({
        baseUrl: 'http://custom:11434',
        model: 'custom-model',
        maxRetries: 5,
        temperature: 0.2,
      });
      expect(testAgent).toBeDefined();
    });

    it('should use environment variables if provided', () => {
      process.env.OLLAMA_BASE_URL = 'http://env:11434';
      process.env.OLLAMA_MODEL = 'env-model';
      const testAgent = new CalculationAgent();
      expect(testAgent).toBeDefined();
      delete process.env.OLLAMA_BASE_URL;
      delete process.env.OLLAMA_MODEL;
    });
  });

  describe('Empty Query Validation', () => {
    it('should throw EMPTY_QUERY error for empty string', async () => {
      await expect(agent.process('')).rejects.toThrow(CalculationAgentError);
      await expect(agent.process('')).rejects.toMatchObject({
        code: 'EMPTY_QUERY',
      });
    });

    it('should throw EMPTY_QUERY error for whitespace only', async () => {
      await expect(agent.process('   ')).rejects.toThrow(CalculationAgentError);
      await expect(agent.process('   ')).rejects.toMatchObject({
        code: 'EMPTY_QUERY',
      });
    });
  });

  describe('Musharakah Extraction', () => {
    it('should extract basic Musharakah parameters', async () => {
      mockLLMInvoke.mockResolvedValue({
        content: JSON.stringify({
          type: 'musharakah',
          parameters: {
            partners: [
              { name: 'Ali', investment: 50000 },
              { name: 'Sara', investment: 30000 },
            ],
            totalProfit: 20000,
          },
        }),
      });

      mockMCPCallTool.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              summary: 'MUSHARAKAH - Profit Distribution',
              contract_type: 'Musharakah (شراكة - Partnership)',
              total_investment: 80000,
              total_profit_loss: 20000,
              is_loss: false,
              distribution: [
                { partner: 'Ali', share: '12500.00', capitalRatio: '0.625' },
                { partner: 'Sara', share: '7500.00', capitalRatio: '0.375' },
              ],
              shariah_explanation: 'Profits distributed by capital ratio',
              calculation_steps: [
                'Total Investment = 50000 + 30000 = 80000',
                'Ali: 20000 × 62.50% = 12500.00',
                'Sara: 20000 × 37.50% = 7500.00',
              ],
            }),
          },
        ],
        isError: false,
      });

      const result = await agent.process(
        'Calculate Musharakah with Ali investing $50k, Sara $30k, profit $20k'
      );

      expect(result).toBeDefined();
      expect(result.calculation.type).toBe('musharakah');
      expect(result.calculation.outputs).toHaveProperty('Ali');
      expect(result.calculation.outputs).toHaveProperty('Sara');
    });

    it('should handle Musharakah with custom profit ratio', async () => {
      mockLLMInvoke.mockResolvedValue({
        content: JSON.stringify({
          type: 'musharakah',
          parameters: {
            partners: [
              { name: 'Partner A', investment: 100000 },
              { name: 'Partner B', investment: 200000 },
            ],
            totalProfit: 30000,
            profitRatio: [0.6, 0.4],
          },
        }),
      });

      mockMCPCallTool.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              summary: 'MUSHARAKAH - Profit Distribution',
              contract_type: 'Musharakah (شراكة - Partnership)',
              total_investment: 300000,
              total_profit_loss: 30000,
              is_loss: false,
              distribution: [
                {
                  partner: 'Partner A',
                  share: '18000.00',
                  capitalRatio: '0.333',
                },
                {
                  partner: 'Partner B',
                  share: '12000.00',
                  capitalRatio: '0.667',
                },
              ],
              shariah_explanation: 'Custom profit ratio applied',
              calculation_steps: ['Step 1', 'Step 2'],
            }),
          },
        ],
        isError: false,
      });

      const result = await agent.process(
        'Partnership: $100k and $200k investment, profit $30k split 60-40'
      );

      expect(result.calculation.type).toBe('musharakah');
    });

    it('should handle Musharakah with loss', async () => {
      mockLLMInvoke.mockResolvedValue({
        content: JSON.stringify({
          type: 'musharakah',
          parameters: {
            partners: [
              { name: 'Partner A', investment: 100000 },
              { name: 'Partner B', investment: 200000 },
              { name: 'Partner C', investment: 150000 },
            ],
            totalProfit: -45000,
          },
        }),
      });

      mockMCPCallTool.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              summary: 'MUSHARAKAH - Loss Distribution',
              contract_type: 'Musharakah (شراكة - Partnership)',
              total_investment: 450000,
              total_profit_loss: -45000,
              is_loss: true,
              distribution: [
                {
                  partner: 'Partner A',
                  share: '-10000.00',
                  capitalRatio: '0.222',
                },
                {
                  partner: 'Partner B',
                  share: '-20000.00',
                  capitalRatio: '0.444',
                },
                {
                  partner: 'Partner C',
                  share: '-15000.00',
                  capitalRatio: '0.333',
                },
              ],
              shariah_explanation: 'Losses distributed by capital ratio',
              calculation_steps: ['Step 1'],
            }),
          },
        ],
        isError: false,
      });

      const result = await agent.process('Three partners: $100k, $200k, $150k with loss of $45k');

      expect(result.calculation.type).toBe('musharakah');
      expect(result.result).toContain('Loss');
    });
  });

  describe('Mudharabah Extraction', () => {
    it('should extract basic Mudharabah parameters', async () => {
      mockLLMInvoke.mockResolvedValue({
        content: JSON.stringify({
          type: 'mudharabah',
          parameters: {
            capitalAmount: 100000,
            profit: 30000,
            capitalProviderRatio: 0.6,
            entrepreneurRatio: 0.4,
          },
        }),
      });

      mockMCPCallTool.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              summary: 'MUDHARABAH - Profit Distribution',
              contract_type: 'Mudharabah (مضاربة)',
              capital_amount: 100000,
              profit_loss: 30000,
              is_loss: false,
              distribution: {
                capital_provider_rabb_al_mal: {
                  share: '18000.00',
                  ratio: '0.6',
                },
                entrepreneur_mudarib: { share: '12000.00', ratio: '0.4' },
              },
              shariah_explanation: 'Profit shared by agreed ratio',
              calculation_steps: ['Step 1', 'Step 2'],
            }),
          },
        ],
        isError: false,
      });

      const result = await agent.process('Mudharabah: capital $100k, 60-40 split, profit $30k');

      expect(result.calculation.type).toBe('mudharabah');
      expect(result.calculation.outputs).toHaveProperty('capital_provider');
      expect(result.calculation.outputs).toHaveProperty('entrepreneur');
    });

    it('should handle Mudharabah with entrepreneur percentage', async () => {
      mockLLMInvoke.mockResolvedValue({
        content: JSON.stringify({
          type: 'mudharabah',
          parameters: {
            capitalAmount: 500000,
            profit: 80000,
            capitalProviderRatio: 0.7,
            entrepreneurRatio: 0.3,
          },
        }),
      });

      mockMCPCallTool.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              summary: 'MUDHARABAH - Profit Distribution',
              contract_type: 'Mudharabah (مضاربة)',
              capital_amount: 500000,
              profit_loss: 80000,
              is_loss: false,
              distribution: {
                capital_provider_rabb_al_mal: {
                  share: '56000.00',
                  ratio: '0.7',
                },
                entrepreneur_mudarib: { share: '24000.00', ratio: '0.3' },
              },
              shariah_explanation: 'Entrepreneur gets 30%',
              calculation_steps: ['Step 1'],
            }),
          },
        ],
        isError: false,
      });

      const result = await agent.process(
        'Capital provider invests $500k, entrepreneur gets 30%, profit $80k'
      );

      expect(result.calculation.type).toBe('mudharabah');
    });

    it('should handle Mudharabah with loss', async () => {
      mockLLMInvoke.mockResolvedValue({
        content: JSON.stringify({
          type: 'mudharabah',
          parameters: {
            capitalAmount: 200000,
            profit: -20000,
            capitalProviderRatio: 0.7,
            entrepreneurRatio: 0.3,
          },
        }),
      });

      mockMCPCallTool.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              summary: 'MUDHARABAH - Loss Distribution',
              contract_type: 'Mudharabah (مضاربة)',
              capital_amount: 200000,
              profit_loss: -20000,
              is_loss: true,
              distribution: {
                capital_provider_rabb_al_mal: {
                  share: '-20000.00',
                  ratio: '1.0',
                },
                entrepreneur_mudarib: { share: '0.00', ratio: '0.0' },
              },
              shariah_explanation: 'Capital provider bears all losses',
              calculation_steps: ['Step 1'],
            }),
          },
        ],
        isError: false,
      });

      const result = await agent.process(
        'Mudharabah with $200k capital, Rabb al-Mal gets 70%, loss of $20k'
      );

      expect(result.calculation.type).toBe('mudharabah');
      expect(result.result).toContain('Loss');
    });
  });

  describe('Edge Cases', () => {
    it('should handle large numbers', async () => {
      mockLLMInvoke.mockResolvedValue({
        content: JSON.stringify({
          type: 'mudharabah',
          parameters: {
            capitalAmount: 5000000,
            profit: 1500000,
            capitalProviderRatio: 0.7,
            entrepreneurRatio: 0.3,
          },
        }),
      });

      const result = await agent.process(
        'Calculate 70:30 Mudharabah for $1.5M profit, capital was $5M'
      );

      expect(result).toBeDefined();
    });

    it('should handle small amounts', async () => {
      mockLLMInvoke.mockResolvedValue({
        content: JSON.stringify({
          type: 'musharakah',
          parameters: {
            partners: [
              { name: 'Partner A', investment: 5 },
              { name: 'Partner B', investment: 3 },
            ],
            totalProfit: 2,
          },
        }),
      });

      const result = await agent.process('Partnership with investments of $5 and $3, profit is $2');

      expect(result).toBeDefined();
    });

    it('should handle zero profit', async () => {
      mockLLMInvoke.mockResolvedValue({
        content: JSON.stringify({
          type: 'mudharabah',
          parameters: {
            capitalAmount: 100000,
            profit: 0,
            capitalProviderRatio: 0.6,
            entrepreneurRatio: 0.4,
          },
        }),
      });

      mockMCPCallTool.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              summary: 'MUDHARABAH - No Profit/Loss',
              contract_type: 'Mudharabah (مضاربة)',
              capital_amount: 100000,
              profit_loss: 0,
              is_loss: false,
              distribution: {
                capital_provider_rabb_al_mal: { share: '0.00', ratio: '0.6' },
                entrepreneur_mudarib: { share: '0.00', ratio: '0.4' },
              },
              shariah_explanation: 'No profit or loss',
              calculation_steps: ['No distribution needed'],
            }),
          },
        ],
        isError: false,
      });

      const result = await agent.process('Mudharabah with $100k capital and zero profit');

      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw EXTRACTION_PARSE_ERROR for invalid JSON', async () => {
      mockLLMInvoke.mockResolvedValue({
        content: 'invalid json response',
      });

      await expect(agent.process('Calculate something')).rejects.toThrow(CalculationAgentError);
      await expect(agent.process('Calculate something')).rejects.toMatchObject({
        code: 'EXTRACTION_PARSE_ERROR',
      });
    });

    it('should handle markdown code blocks in LLM response', async () => {
      mockLLMInvoke.mockResolvedValue({
        content:
          '```json\n{"type":"musharakah","parameters":{"partners":[{"name":"A","investment":100}],"totalProfit":10}}\n```',
      });

      const result = await agent.process('Test query');
      expect(result).toBeDefined();
    });

    it('should throw error for missing type in extraction', async () => {
      mockLLMInvoke.mockResolvedValue({
        content: JSON.stringify({
          parameters: { some: 'data' },
        }),
      });

      await expect(agent.process('Test query')).rejects.toMatchObject({
        code: 'EXTRACTION_PARSE_ERROR',
      });
    });

    it('should throw error for invalid calculation type', async () => {
      mockLLMInvoke.mockResolvedValue({
        content: JSON.stringify({
          type: 'invalid_type',
          parameters: {},
        }),
      });

      await expect(agent.process('Test query')).rejects.toMatchObject({
        code: 'EXTRACTION_PARSE_ERROR',
      });
    });

    it('should handle MCP validation errors', async () => {
      mockLLMInvoke.mockResolvedValue({
        content: JSON.stringify({
          type: 'musharakah',
          parameters: { partners: [], totalProfit: 100 },
        }),
      });

      mockMCPCallTool.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Validation Error: partners: Array must contain at least 2 element(s)',
          },
        ],
        isError: true,
      });

      await expect(agent.process('Invalid query')).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
      });
    });

    it('should handle MCP connection errors', async () => {
      mockLLMInvoke.mockResolvedValue({
        content: JSON.stringify({
          type: 'musharakah',
          parameters: {
            partners: [
              { name: 'A', investment: 100 },
              { name: 'B', investment: 200 },
            ],
            totalProfit: 50,
          },
        }),
      });

      mockMCPConnect.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(agent.process('Test query')).rejects.toThrow();
    });

    it('should preserve original error in CalculationAgentError', async () => {
      mockLLMInvoke.mockResolvedValue({
        content: 'invalid',
      });

      try {
        await agent.process('Test query');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CalculationAgentError);
        expect((error as CalculationAgentError).originalError).toBeDefined();
      }
    });
  });

  describe('Retry Logic', () => {
    it('should not retry on EXTRACTION_PARSE_ERROR', async () => {
      mockLLMInvoke.mockResolvedValue({
        content: 'invalid json',
      });

      await expect(agent.process('Test query')).rejects.toThrow();
      expect(mockLLMInvoke).toHaveBeenCalledTimes(1);
    });

    it('should not retry on VALIDATION_ERROR', async () => {
      mockLLMInvoke.mockResolvedValue({
        content: JSON.stringify({
          type: 'musharakah',
          parameters: {},
        }),
      });

      mockMCPCallTool.mockResolvedValue({
        content: [{ type: 'text', text: 'Validation Error: Invalid parameters' }],
        isError: true,
      });

      await expect(agent.process('Test')).rejects.toThrow();
      expect(mockMCPCallTool).toHaveBeenCalledTimes(1);
    });

    it('should retry on connection errors', async () => {
      mockLLMInvoke.mockResolvedValue({
        content: JSON.stringify({
          type: 'musharakah',
          parameters: {
            partners: [
              { name: 'A', investment: 100 },
              { name: 'B', investment: 200 },
            ],
            totalProfit: 50,
          },
        }),
      });

      mockMCPConnect
        .mockRejectedValueOnce(new Error('connection refused'))
        .mockRejectedValueOnce(new Error('connection refused'))
        .mockResolvedValueOnce(undefined);

      mockMCPCallTool.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              summary: 'Test',
              contract_type: 'Test',
              total_investment: 300,
              total_profit_loss: 50,
              is_loss: false,
              distribution: [],
              shariah_explanation: 'Test',
              calculation_steps: [],
            }),
          },
        ],
        isError: false,
      });

      const result = await agent.process('Test query');
      expect(result).toBeDefined();
      expect(mockMCPConnect).toHaveBeenCalledTimes(3);
    });
  });

  describe('Response Formatting', () => {
    it('should format result with markdown', async () => {
      mockLLMInvoke.mockResolvedValue({
        content: JSON.stringify({
          type: 'musharakah',
          parameters: {
            partners: [
              { name: 'Ali', investment: 50000 },
              { name: 'Sara', investment: 30000 },
            ],
            totalProfit: 20000,
          },
        }),
      });

      mockMCPCallTool.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              summary: 'MUSHARAKAH - Profit Distribution',
              contract_type: 'Musharakah (شراكة - Partnership)',
              total_investment: 80000,
              total_profit_loss: 20000,
              is_loss: false,
              distribution: [
                { partner: 'Ali', share: '12500.00', capitalRatio: '0.625' },
                { partner: 'Sara', share: '7500.00', capitalRatio: '0.375' },
              ],
              shariah_explanation: 'Profits distributed by capital ratio',
              calculation_steps: [
                'Total Investment = 80000',
                'Ali: 20000 × 62.50% = 12500',
                'Sara: 20000 × 37.50% = 7500',
              ],
            }),
          },
        ],
        isError: false,
      });

      const result = await agent.process('Test query');

      expect(result.result).toContain('##');
      expect(result.result).toContain('Distribution:');
      expect(result.result).toContain('Shariah Compliance:');
      expect(result.result).toContain('Calculation Steps:');
      expect(result.result).toContain('62.50%'); // Percentage format
    });

    it('should include calculation steps in result', async () => {
      mockLLMInvoke.mockResolvedValue({
        content: JSON.stringify({
          type: 'mudharabah',
          parameters: {
            capitalAmount: 100000,
            profit: 30000,
            capitalProviderRatio: 0.6,
            entrepreneurRatio: 0.4,
          },
        }),
      });

      mockMCPCallTool.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              summary: 'MUDHARABAH - Profit Distribution',
              contract_type: 'Mudharabah (مضاربة)',
              capital_amount: 100000,
              profit_loss: 30000,
              is_loss: false,
              distribution: {
                capital_provider_rabb_al_mal: {
                  share: '18000.00',
                  ratio: '0.6',
                },
                entrepreneur_mudarib: { share: '12000.00', ratio: '0.4' },
              },
              shariah_explanation: 'Profit shared',
              calculation_steps: ['Capital = 100000', 'Profit = 30000', 'Distribution calculated'],
            }),
          },
        ],
        isError: false,
      });

      const result = await agent.process('Test query');

      expect(result.calculation.steps).toHaveLength(3);
      expect(result.calculation.steps[0]).toBe('Capital = 100000');
    });
  });

  describe('Performance', () => {
    it('should complete within reasonable time', async () => {
      mockLLMInvoke.mockResolvedValue({
        content: JSON.stringify({
          type: 'musharakah',
          parameters: {
            partners: [
              { name: 'A', investment: 100 },
              { name: 'B', investment: 200 },
            ],
            totalProfit: 50,
          },
        }),
      });

      const startTime = Date.now();
      await agent.process('Test query');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
