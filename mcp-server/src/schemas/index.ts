import { z } from 'zod';

/**
 * Schema for Musharakah (partnership) contract calculations
 * Partners share profits according to agreement (or capital ratio)
 * and losses according to capital ratio
 */
export const MusharakahInputSchema = z.object({
  partners: z
    .array(
      z.object({
        name: z.string().describe('Partner name'),
        investment: z.number().positive().describe('Investment amount (must be positive)'),
      })
    )
    .min(2)
    .describe('List of partners with their investments (minimum 2 partners)'),
  totalProfit: z.number().describe('Total profit or loss (negative for loss)'),
  profitRatio: z
    .array(z.number().min(0).max(1))
    .optional()
    .describe('Optional custom profit sharing ratios (must sum to 1)'),
});

/**
 * Schema for Mudharabah contract calculations
 * Capital provider (Rabb al-Mal) provides capital
 * Entrepreneur (Mudarib) provides labor
 * Capital provider bears losses, profits shared by agreement
 */
export const MudharabahInputSchema = z.object({
  capitalAmount: z.number().positive().describe('Capital amount provided'),
  profit: z.number().describe('Profit or loss (negative for loss)'),
  capitalProviderRatio: z
    .number()
    .min(0)
    .max(1)
    .describe('Capital provider profit share ratio (0-1)'),
  entrepreneurRatio: z.number().min(0).max(1).describe('Entrepreneur profit share ratio (0-1)'),
});

export type MusharakahInput = z.infer<typeof MusharakahInputSchema>;
export type MudharabahInput = z.infer<typeof MudharabahInputSchema>;
