import { MusharakahInput } from '../schemas/index.js';

export interface MusharakahPartnerResult {
  partner: string;
  investment: number;
  capitalRatio: string;
  share: string;
}

export interface MusharakahResult {
  type: 'musharakah';
  totalInvestment: number;
  totalProfit: number;
  isLoss: boolean;
  distribution: MusharakahPartnerResult[];
  explanation: string;
  calculationSteps: string[];
}

/**
 * Calculate profit/loss distribution in a Musharakah (partnership) contract
 *
 * Islamic Finance Rule:
 * - Profits: Distributed according to agreed ratio (or capital ratio if not specified)
 * - Losses: MUST be distributed according to capital ratio (Shariah requirement)
 *
 * @param input - Musharakah calculation parameters
 * @returns Detailed distribution with step-by-step explanation
 */
export function calculateMusharakah(input: MusharakahInput): MusharakahResult {
  const steps: string[] = [];

  // Step 1: Calculate total investment
  const totalInvestment = input.partners.reduce((sum, p) => sum + p.investment, 0);
  steps.push(
    `1. Total Investment = ${input.partners.map((p) => p.investment).join(' + ')} = ${totalInvestment}`
  );

  // Step 2: Determine if profit or loss
  const isLoss = input.totalProfit < 0;
  const profitOrLossType = isLoss ? 'Loss' : 'Profit';
  steps.push(`2. ${profitOrLossType} Amount = ${Math.abs(input.totalProfit)}`);

  // Step 3: Validate profit ratio if provided
  if (input.profitRatio && input.profitRatio.length > 0) {
    if (input.profitRatio.length !== input.partners.length) {
      throw new Error(
        `Profit ratio array length (${input.profitRatio.length}) must match number of partners (${input.partners.length})`
      );
    }
    const ratioSum = input.profitRatio.reduce((sum, r) => sum + r, 0);
    if (Math.abs(ratioSum - 1) > 0.0001) {
      throw new Error(`Profit ratios must sum to 1, got ${ratioSum}`);
    }
  }

  // Step 4: Calculate each partner's share
  steps.push(
    `3. Distribution Method: ${isLoss ? 'Capital Ratio (Shariah requirement for losses)' : input.profitRatio ? 'Custom Profit Ratio' : 'Capital Ratio'}`
  );

  const results = input.partners.map((partner, index) => {
    const capitalRatio = partner.investment / totalInvestment;

    let share: number;
    let shareCalculation: string;

    if (isLoss) {
      // For losses, always use capital ratio (Shariah requirement)
      share = input.totalProfit * capitalRatio;
      shareCalculation = `${partner.name}: ${input.totalProfit} × ${(capitalRatio * 100).toFixed(2)}% = ${share.toFixed(2)}`;
    } else if (input.profitRatio && input.profitRatio.length === input.partners.length) {
      // For profits with custom ratio
      share = input.totalProfit * input.profitRatio[index];
      shareCalculation = `${partner.name}: ${input.totalProfit} × ${(input.profitRatio[index] * 100).toFixed(2)}% = ${share.toFixed(2)}`;
    } else {
      // For profits without custom ratio, use capital ratio
      share = input.totalProfit * capitalRatio;
      shareCalculation = `${partner.name}: ${input.totalProfit} × ${(capitalRatio * 100).toFixed(2)}% = ${share.toFixed(2)}`;
    }

    steps.push(`   ${shareCalculation}`);

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
      ? 'In Musharakah, losses MUST be distributed according to capital ratio (Shariah requirement). Each partner bears losses proportional to their investment.'
      : input.profitRatio
        ? 'Profits distributed according to the agreed custom ratio between partners.'
        : 'Profits distributed according to capital ratio (proportional to investment).',
    calculationSteps: steps,
  };
}
