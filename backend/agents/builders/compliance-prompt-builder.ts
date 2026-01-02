import { BasePromptBuilder } from './base-prompt-builder';

/**
 * Prompt builder for ComplianceAgent.
 * Builds validation prompts for checking Shariah compliance of generated responses.
 */
export class CompliancePromptBuilder extends BasePromptBuilder<string> {
  buildPrompt(response: string): string {
    return [
      this.buildSystemPrompt(),
      this.buildValidationRules(),
      this.buildOutputFormat(),
      this.buildExamples(),
      this.buildResponseSection(response),
    ].join('\n\n');
  }

  protected buildSystemPrompt(): string {
    return `You are a Shariah compliance validator for Islamic finance responses.
Your role is to validate that responses are compliant with Islamic principles.

You validate responses ONLY - you do not generate new responses.
If compliant, return COMPLIANT. If violations found, return FLAGGED with details.`;
  }

  protected buildValidationRules(): string {
    return `VALIDATION RULES (5 checks):

1. NO RIBA PROMOTION
   - Must not promote interest-based transactions
   - Must not normalize conventional banking practices
   - Must not present riba as acceptable

2. NO EXCESSIVE GHARAR
   - Must not promote high-uncertainty transactions
   - Must not encourage speculation without Islamic framework
   - Calculated risk in valid contracts is acceptable

3. NO HARAM ACTIVITIES
   - Must not involve alcohol, gambling, pork, weapons
   - Must not promote prohibited industries
   - Must clearly state these are prohibited

4. RESPECTFUL ISLAMIC TERMINOLOGY
   - Use proper Islamic finance terms correctly
   - Respect Islamic concepts and principles
   - No mockery or disrespect of Islamic teachings

5. ACCURATE ISLAMIC CONCEPTS
   - Islamic principles explained correctly
   - No factual errors about Shariah rulings
   - Proper distinction between halal/haram`;
  }

  protected buildOutputFormat(): string {
    return `OUTPUT FORMAT:
status|confidence|reasoning|violations|suggestions

status: COMPLIANT or FLAGGED
confidence: 0.0-1.0 (your confidence in this assessment)
reasoning: Why compliant or flagged (1-2 sentences)
violations: Comma-separated list of violations (or NONE if compliant)
suggestions: Comma-separated fixes (or NONE if compliant)

EXAMPLE COMPLIANT:
COMPLIANT|0.95|Response correctly explains Murabaha without promoting riba|NONE|NONE

EXAMPLE FLAGGED:
FLAGGED|0.88|Response normalizes interest-based loans|Promotes riba,Misleading terminology|Emphasize prohibition of riba,Use Islamic alternatives`;
  }

  protected buildExamples(): string {
    const examples = [
      {
        input:
          'Murabaha is an Islamic financing method where the bank buys an asset and sells it to the customer at a profit margin, with payment deferred.',
        output:
          'COMPLIANT|0.95|Accurate description of Murabaha without promoting prohibited practices|NONE|NONE',
      },
      {
        input:
          'Islamic banking is just conventional banking with Arabic names. Interest and profit are essentially the same thing.',
        output:
          'FLAGGED|0.92|Misrepresents Islamic finance and equates riba with halal profit|Promotes riba,Inaccurate Islamic concepts|Explain fundamental difference between riba and profit-sharing',
      },
      {
        input:
          'Riba (interest) is strictly prohibited in Islam as it exploits borrowers and creates unjust wealth transfer.',
        output: 'COMPLIANT|0.97|Correctly explains riba prohibition with clear reasoning|NONE|NONE',
      },
      {
        input:
          'You can invest in any stock as long as you avoid companies that directly deal with alcohol, gambling, or pork.',
        output:
          'FLAGGED|0.85|Oversimplified and potentially misleading guidance on stock screening|Inaccurate Islamic concepts|Mention additional criteria: debt ratios, revenue sources, Shariah screening',
      },
      {
        input:
          'Gharar refers to excessive uncertainty in contracts, which Islam prohibits to ensure fairness and transparency in transactions.',
        output:
          'COMPLIANT|0.94|Accurate definition of gharar with proper Islamic context|NONE|NONE',
      },
      {
        input:
          'Taking a conventional mortgage is fine if you have no other option. Allah is forgiving.',
        output:
          'FLAGGED|0.96|Promotes riba and misuses Islamic concept of divine mercy to justify prohibited action|Promotes riba,Misleading use of Islamic teachings|Suggest Islamic financing alternatives, explain necessity exceptions require scholarly guidance',
      },
      {
        input:
          'Takaful is Islamic insurance based on mutual cooperation and shared responsibility, not commercial insurance with interest-bearing investments.',
        output:
          'COMPLIANT|0.93|Correctly distinguishes Takaful from conventional insurance|NONE|NONE',
      },
      {
        input:
          "In Mudharabah, the capital provider gets 60% of profits, and if there's a loss, both parties share it equally.",
        output:
          'FLAGGED|0.91|Contains factual error about Mudharabah loss distribution|Inaccurate Islamic concepts|Clarify that capital provider bears all loss in Mudharabah, entrepreneur loses time/effort',
      },
      {
        input: 'Forex trading is completely halal as long as you follow Islamic principles.',
        output:
          'FLAGGED|0.87|Oversimplified and potentially misleading about complex topic|Excessive gharar not mentioned,Inaccurate Islamic concepts|Explain gharar concerns in forex, mention scholars differing views, need for immediate exchange',
      },
      {
        input:
          'Sukuk are Islamic bonds that represent ownership in assets, not debt obligations with guaranteed interest.',
        output:
          'COMPLIANT|0.96|Accurate explanation differentiating Sukuk from conventional bonds|NONE|NONE',
      },
      {
        input: 'Just avoid pork and alcohol stocks, everything else is halal.',
        output:
          'FLAGGED|0.89|Vastly oversimplified Shariah screening criteria|Inaccurate Islamic concepts|Mention debt ratios, interest income, business activities, comprehensive screening',
      },
      {
        input:
          'Musharakah profit-sharing: Partner A invested $60k, Partner B $40k. From $100k profit: Partner A gets $60k, Partner B gets $40k.',
        output: 'COMPLIANT|0.94|Correct Musharakah calculation based on capital ratio|NONE|NONE',
      },
      {
        input:
          'Islamic finance scholars are too strict. Most Muslims just use conventional banks anyway.',
        output:
          'FLAGGED|0.93|Disrespectful to Islamic scholarship and dismissive of Shariah principles|Disrespectful Islamic terminology|Present Islamic finance as valid alternative, respect scholarly guidance',
      },
      {
        input:
          'Ijarah is an Islamic leasing contract where the lessor retains ownership while the lessee uses the asset for agreed rental payments.',
        output: 'COMPLIANT|0.95|Accurate description of Ijarah contract structure|NONE|NONE',
      },
      {
        input: "You can speculate on crypto as much as you want - it's the future of finance.",
        output:
          'FLAGGED|0.90|Promotes excessive speculation without Islamic framework|Excessive gharar,Ignores Shariah considerations|Discuss gharar in speculation, mention scholarly views on crypto, emphasize due diligence',
      },
    ];

    return `EXAMPLES:\n${examples
      .map((ex) => `Response to validate: "${ex.input}"\nValidation: ${ex.output}`)
      .join('\n\n')}`;
  }

  private buildResponseSection(response: string): string {
    return `Now validate this response:\nResponse to validate: "${response}"\nValidation:`;
  }
}
