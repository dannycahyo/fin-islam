import { BasePromptBuilder } from './base-prompt-builder';

export class CalculationPromptBuilder extends BasePromptBuilder<string> {
  buildPrompt(query: string): string {
    return [
      this.buildSystemPrompt(),
      this.buildOutputFormat(),
      this.buildExamples(),
      this.buildQuerySection(query),
    ].join('\n\n');
  }

  protected buildSystemPrompt(): string {
    return `You are a parameter extractor for Islamic finance calculations.
Extract calculation type and numerical parameters from user queries.

CALCULATION TYPES:
1. musharakah - Partnership where multiple partners invest capital and share profit/loss
   - All partners contribute capital
   - Profits distributed by pre-agreed ratio (or capital ratio if not specified)
   - Losses ALWAYS distributed by capital ratio (Shariah requirement)

2. mudharabah - Capital provider (Rabb al-Mal) + Entrepreneur (Mudarib)
   - Capital provider supplies 100% capital
   - Entrepreneur provides labor and expertise
   - Profits shared by pre-agreed ratio
   - Losses borne entirely by capital provider (Shariah requirement)

PARAMETERS TO EXTRACT:

For Musharakah:
  - partners: Array of {name: string, investment: number}
  - totalProfit: number (negative for loss)
  - profitRatio: Array of numbers (optional, must sum to 1.0)

For Mudharabah:
  - capitalAmount: number
  - profit: number (negative for loss)
  - capitalProviderRatio: number (0-1)
  - entrepreneurRatio: number (0-1, must sum to 1.0 with capitalProviderRatio)

EXTRACTION RULES:
1. Convert all percentages to decimals (60% → 0.6, 25% → 0.25)
2. Normalize ratios that don't sum to 1:
   - "3 to 2 ratio" → 3/(3+2) = 0.6, 2/(3+2) = 0.4
   - "60:40" → 0.6, 0.4
3. Infer partner names if not specified (use "Partner A", "Partner B", "Partner C", etc.)
4. If profit ratio not specified in Musharakah, omit profitRatio field (will default to capital ratio)
5. For Mudharabah, if only one ratio given (e.g., "entrepreneur gets 30%"), calculate the other (0.7, 0.3)
6. Negative amounts indicate losses
7. Extract numerical values accurately, including decimals and large numbers`;
  }

  protected buildOutputFormat(): string {
    return `OUTPUT FORMAT (strict JSON only, no markdown):
{
  "type": "musharakah" | "mudharabah",
  "parameters": {
    // For musharakah:
    "partners": [{"name": string, "investment": number}, ...],
    "totalProfit": number,
    "profitRatio"?: [number, ...]  // optional

    // For mudharabah:
    "capitalAmount": number,
    "profit": number,
    "capitalProviderRatio": number,
    "entrepreneurRatio": number
  }
}`;
  }

  protected buildExamples(): string {
    const examples = [
      {
        input: 'Calculate Musharakah with Ali investing $50k, Sara $30k, profit $20k',
        output: JSON.stringify(
          {
            type: 'musharakah',
            parameters: {
              partners: [
                { name: 'Ali', investment: 50000 },
                { name: 'Sara', investment: 30000 },
              ],
              totalProfit: 20000,
            },
          },
          null,
          2
        ),
        description: 'Musharakah without custom profit ratio',
      },
      {
        input: 'Partnership: $100k and $200k investment, profit $30k split 60-40',
        output: JSON.stringify(
          {
            type: 'musharakah',
            parameters: {
              partners: [
                { name: 'Partner A', investment: 100000 },
                { name: 'Partner B', investment: 200000 },
              ],
              totalProfit: 30000,
              profitRatio: [0.6, 0.4],
            },
          },
          null,
          2
        ),
        description: 'Musharakah with custom profit ratio',
      },
      {
        input: 'Three partners: $100k, $200k, $150k with loss of $45k',
        output: JSON.stringify(
          {
            type: 'musharakah',
            parameters: {
              partners: [
                { name: 'Partner A', investment: 100000 },
                { name: 'Partner B', investment: 200000 },
                { name: 'Partner C', investment: 150000 },
              ],
              totalProfit: -45000,
            },
          },
          null,
          2
        ),
        description: 'Musharakah with loss (negative profit)',
      },
      {
        input: 'Mudharabah: capital $100k, 60-40 split, profit $30k',
        output: JSON.stringify(
          {
            type: 'mudharabah',
            parameters: {
              capitalAmount: 100000,
              profit: 30000,
              capitalProviderRatio: 0.6,
              entrepreneurRatio: 0.4,
            },
          },
          null,
          2
        ),
        description: 'Mudharabah with explicit ratio',
      },
      {
        input: 'Capital provider invests $500k, entrepreneur gets 30%, profit $80k',
        output: JSON.stringify(
          {
            type: 'mudharabah',
            parameters: {
              capitalAmount: 500000,
              profit: 80000,
              capitalProviderRatio: 0.7,
              entrepreneurRatio: 0.3,
            },
          },
          null,
          2
        ),
        description: 'Mudharabah with entrepreneur ratio (calculate provider ratio)',
      },
      {
        input: 'Mudharabah with $200k capital, Rabb al-Mal gets 70%, loss of $20k',
        output: JSON.stringify(
          {
            type: 'mudharabah',
            parameters: {
              capitalAmount: 200000,
              profit: -20000,
              capitalProviderRatio: 0.7,
              entrepreneurRatio: 0.3,
            },
          },
          null,
          2
        ),
        description: 'Mudharabah with loss scenario',
      },
      {
        input: 'Calculate 70:30 Mudharabah for $1.5M profit, capital was $5M',
        output: JSON.stringify(
          {
            type: 'mudharabah',
            parameters: {
              capitalAmount: 5000000,
              profit: 1500000,
              capitalProviderRatio: 0.7,
              entrepreneurRatio: 0.3,
            },
          },
          null,
          2
        ),
        description: 'Large numbers with ratio notation',
      },
      {
        input:
          'Four-way Musharakah: Ahmed $25k, Fatima $35k, Omar $40k, Aisha $20k. Profit $24k with custom split 30-25-25-20',
        output: JSON.stringify(
          {
            type: 'musharakah',
            parameters: {
              partners: [
                { name: 'Ahmed', investment: 25000 },
                { name: 'Fatima', investment: 35000 },
                { name: 'Omar', investment: 40000 },
                { name: 'Aisha', investment: 20000 },
              ],
              totalProfit: 24000,
              profitRatio: [0.3, 0.25, 0.25, 0.2],
            },
          },
          null,
          2
        ),
        description: 'Multiple partners with names and custom ratio',
      },
      {
        input: 'Partnership with investments of $5 and $3, profit is $2',
        output: JSON.stringify(
          {
            type: 'musharakah',
            parameters: {
              partners: [
                { name: 'Partner A', investment: 5 },
                { name: 'Partner B', investment: 3 },
              ],
              totalProfit: 2,
            },
          },
          null,
          2
        ),
        description: 'Small amounts',
      },
      {
        input: 'Mudarib receives 25% in a Mudharabah with $750k capital and $150k profit',
        output: JSON.stringify(
          {
            type: 'mudharabah',
            parameters: {
              capitalAmount: 750000,
              profit: 150000,
              capitalProviderRatio: 0.75,
              entrepreneurRatio: 0.25,
            },
          },
          null,
          2
        ),
        description: 'Islamic terminology (Mudarib)',
      },
    ];

    return this.formatExamples(examples);
  }

  private buildQuerySection(query: string): string {
    return `Extract parameters from this query. Return ONLY the JSON object, no markdown formatting.

Query: "${query}"

Output:`;
  }
}
