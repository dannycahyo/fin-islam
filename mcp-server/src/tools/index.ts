import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { MusharakahInputSchema, MudharabahInputSchema } from '../schemas/index.js';
import { calculateMusharakah } from '../calculators/musharakah.js';
import { calculateMudharabah } from '../calculators/mudharabah.js';

/**
 * Register all Islamic finance calculation tools with the MCP server
 *
 * @param server - McpServer instance to register tools with
 */
export function registerTools(server: McpServer): void {
  // Register Musharakah calculation tool
  server.registerTool(
    'calculate_musharakah',
    {
      title: 'Calculate Musharakah Profit/Loss Distribution',
      description:
        'Calculate profit/loss distribution in a Musharakah (شراكة - partnership) contract. ' +
        'In Musharakah, all partners contribute capital and share management. ' +
        'Profits are distributed according to pre-agreed ratio (or capital ratio if not specified). ' +
        'Losses MUST be distributed according to capital ratio as per Shariah requirements.',
      inputSchema: MusharakahInputSchema,
    },
    async (input) => {
      try {
        const validatedInput = MusharakahInputSchema.parse(input);
        const result = calculateMusharakah(validatedInput);

        // Format output with step-by-step explanation
        const output = {
          summary: `${result.type.toUpperCase()} - ${result.isLoss ? 'Loss' : 'Profit'} Distribution`,
          contract_type: 'Musharakah (شراكة - Partnership)',
          total_investment: result.totalInvestment,
          total_profit_loss: result.totalProfit,
          is_loss: result.isLoss,
          distribution: result.distribution,
          shariah_explanation: result.explanation,
          calculation_steps: result.calculationSteps,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(output, null, 2),
            },
          ],
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          return {
            content: [
              {
                type: 'text',
                text: `Validation Error: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
              },
            ],
            isError: true,
          };
        }
        throw error;
      }
    }
  );

  // Register Mudharabah calculation tool
  server.registerTool(
    'calculate_mudharabah',
    {
      title: 'Calculate Mudharabah Profit/Loss Distribution',
      description:
        'Calculate profit/loss distribution in a Mudharabah (مضاربة) contract between capital provider (Rabb al-Mal) and entrepreneur (Mudarib). ' +
        'The capital provider supplies 100% capital, the entrepreneur provides labor and expertise. ' +
        'Profits are shared according to pre-agreed ratio. ' +
        'Losses are borne entirely by the capital provider (Shariah requirement), while the entrepreneur loses their time and effort.',
      inputSchema: MudharabahInputSchema,
    },
    async (input) => {
      try {
        const validatedInput = MudharabahInputSchema.parse(input);
        const result = calculateMudharabah(validatedInput);

        // Format output with step-by-step explanation
        const output = {
          summary: `${result.type.toUpperCase()} - ${result.isLoss ? 'Loss' : 'Profit'} Distribution`,
          contract_type: 'Mudharabah (مضاربة)',
          capital_amount: result.capitalAmount,
          profit_loss: result.profit,
          is_loss: result.isLoss,
          distribution: {
            capital_provider_rabb_al_mal: result.distribution.capitalProvider,
            entrepreneur_mudarib: result.distribution.entrepreneur,
          },
          shariah_explanation: result.explanation,
          calculation_steps: result.calculationSteps,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(output, null, 2),
            },
          ],
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          return {
            content: [
              {
                type: 'text',
                text: `Validation Error: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
              },
            ],
            isError: true,
          };
        }
        throw error;
      }
    }
  );
}
