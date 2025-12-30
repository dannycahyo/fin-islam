import { MudharabahInput } from '../schemas/index.js';

export interface MudharabahDistribution {
  capitalProvider: {
    ratio?: string;
    share: string;
    explanation?: string;
  };
  entrepreneur: {
    ratio?: string;
    share: string;
    explanation?: string;
  };
}

export interface MudharabahResult {
  type: 'mudharabah';
  capitalAmount: number;
  profit: number;
  isLoss: boolean;
  distribution: MudharabahDistribution;
  explanation: string;
  calculationSteps: string[];
}

/**
 * Calculate profit/loss distribution in a Mudharabah contract
 *
 * Islamic Finance Rule:
 * - Capital Provider (Rabb al-Mal): Provides capital, bears all financial losses
 * - Entrepreneur (Mudarib): Provides labor/expertise, loses time/effort in case of loss
 * - Profits: Shared according to pre-agreed ratio
 * - Losses: Borne entirely by capital provider (entrepreneur receives nothing)
 *
 * @param input - Mudharabah calculation parameters
 * @returns Detailed distribution with step-by-step explanation
 */
export function calculateMudharabah(input: MudharabahInput): MudharabahResult {
  const steps: string[] = [];

  // Step 1: Record capital amount
  steps.push(`1. Capital Amount = ${input.capitalAmount}`);

  // Step 2: Determine if profit or loss
  const isLoss = input.profit < 0;
  const profitOrLossType = isLoss ? 'Loss' : 'Profit';
  steps.push(`2. ${profitOrLossType} Amount = ${Math.abs(input.profit)}`);

  // Step 3: Validate ratios sum to 1
  const ratioSum = input.capitalProviderRatio + input.entrepreneurRatio;
  if (Math.abs(ratioSum - 1) > 0.0001) {
    throw new Error(
      `Capital provider ratio (${input.capitalProviderRatio}) + Entrepreneur ratio (${input.entrepreneurRatio}) must equal 1, got ${ratioSum}`
    );
  }

  if (isLoss) {
    steps.push('3. Loss Distribution Rule: Capital provider (Rabb al-Mal) bears all losses');
    steps.push(`   Capital Provider (Rabb al-Mal) Loss: ${input.profit}`);
    steps.push('   Entrepreneur (Mudarib) Share: 0 (loses time/effort only)');

    return {
      type: 'mudharabah',
      capitalAmount: input.capitalAmount,
      profit: input.profit,
      isLoss: true,
      distribution: {
        capitalProvider: {
          share: input.profit.toFixed(2),
          explanation: 'Bears all financial losses (Shariah requirement)',
        },
        entrepreneur: {
          share: '0',
          explanation: 'Receives nothing, loses time and effort invested',
        },
      },
      explanation:
        'In Mudharabah, the capital provider (Rabb al-Mal) bears all financial losses as per Shariah. The entrepreneur (Mudarib) receives nothing but loses their time and effort.',
      calculationSteps: steps,
    };
  }

  // Step 3: Calculate profit distribution
  const capitalProviderShare = input.profit * input.capitalProviderRatio;
  const entrepreneurShare = input.profit * input.entrepreneurRatio;

  steps.push(`3. Profit Distribution:`);
  steps.push(
    `   Capital Provider (Rabb al-Mal): ${input.profit} × ${(input.capitalProviderRatio * 100).toFixed(0)}% = ${capitalProviderShare.toFixed(2)}`
  );
  steps.push(
    `   Entrepreneur (Mudarib): ${input.profit} × ${(input.entrepreneurRatio * 100).toFixed(0)}% = ${entrepreneurShare.toFixed(2)}`
  );

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
    explanation:
      'In Mudharabah, profits are distributed according to the pre-agreed ratio between the capital provider (Rabb al-Mal) and the entrepreneur (Mudarib).',
    calculationSteps: steps,
  };
}
