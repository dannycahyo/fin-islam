import { BasePromptBuilder } from './base-prompt-builder';

/**
 * Prompt builder for the RoutingAgent.
 * Builds classification prompts for categorizing Islamic finance queries.
 */
export class RoutingPromptBuilder extends BasePromptBuilder<string> {
  buildPrompt(query: string): string {
    return [
      this.buildSystemPrompt(),
      this.buildOutputFormat(),
      this.buildExamples(),
      this.buildQuerySection(query),
    ].join('\n\n');
  }

  protected buildSystemPrompt(): string {
    return `You are a query classifier for Islamic finance. Classify each query into exactly ONE category.

CATEGORIES:
- principles: Questions about Islamic finance fundamentals, concepts, Shariah principles, halal/haram rules
- products: Questions about specific Islamic financial products (Murabaha, Ijarah, Sukuk, Takaful, etc.)
- compliance: Questions about Shariah compliance verification, auditing, governance
- comparison: Questions comparing Islamic vs conventional finance, or comparing Islamic products
- calculation: Questions requiring profit-sharing calculations (Mudharabah, Musharakah profit distribution)
- general: Greetings, small talk, unclear queries not fitting other categories`;
  }

  protected buildOutputFormat(): string {
    return 'OUTPUT FORMAT: category|confidence|explanation';
  }

  protected buildExamples(): string {
    const examples = [
      {
        input: 'What is riba and why is it prohibited?',
        output: 'principles|0.95|Query asks about fundamental prohibition in Islamic finance',
      },
      {
        input: 'How does Murabaha financing work?',
        output: 'products|0.92|Query about specific Islamic finance product',
      },
      {
        input: 'Is my investment Shariah-compliant?',
        output: 'compliance|0.90|Query about checking Shariah compliance',
      },
      {
        input: "What's the difference between Islamic and conventional banking?",
        output: 'comparison|0.93|Direct comparison between two systems',
      },
      {
        input: 'Calculate profit distribution for 60-40 Mudharabah with $100,000 profit',
        output: 'calculation|0.95|Requires profit-sharing calculation',
      },
      {
        input: 'Hello, can you help me?',
        output: 'general|0.85|Greeting without specific Islamic finance question',
      },
      {
        input: 'Why is gharar prohibited in transactions?',
        output: 'principles|0.94|Question about core Islamic finance principle',
      },
      {
        input: 'Explain how Sukuk bonds work',
        output: 'products|0.91|Query about specific Islamic financial instrument',
      },
      {
        input: 'Does my portfolio meet Islamic standards?',
        output: 'compliance|0.89|Question about Shariah compliance verification',
      },
      {
        input: 'Compare Takaful vs conventional insurance',
        output: 'comparison|0.92|Comparing Islamic and conventional products',
      },
      {
        input: "What's 70-30 split of $50,000 profit in Musharakah?",
        output: 'calculation|0.94|Specific profit-sharing calculation',
      },
      {
        input: 'Thanks for your help!',
        output: 'general|0.88|Gratitude expression',
      },
      {
        input: 'What is maqasid al-shariah?',
        output: 'principles|0.93|Question about foundational Islamic law concept',
      },
      {
        input: 'How does Ijarah leasing structure work?',
        output: 'products|0.90|Query about specific Islamic lease product',
      },
      {
        input: 'Shariah board certification process requirements?',
        output: 'compliance|0.87|Question about compliance governance',
      },
      {
        input: 'Islamic mortgage vs conventional - key differences?',
        output: 'comparison|0.91|Direct comparison of financing methods',
      },
      {
        input: 'Musharakah profit-sharing formula?',
        output: 'calculation|0.86|Question about calculation methodology',
      },
      {
        input: 'Hi there',
        output: 'general|0.90|Simple greeting',
      },
      {
        input: 'Explain the maslaha principle',
        output: 'principles|0.92|Question about Islamic jurisprudence principle',
      },
      {
        input: 'What is Wakalah in Islamic finance?',
        output: 'products|0.89|Query about Islamic finance product/contract',
      },
    ];

    return `EXAMPLES:\n${examples.map((ex) => `Query: "${ex.input}"\nOutput: ${ex.output}`).join('\n\n')}`;
  }

  private buildQuerySection(query: string): string {
    return `Now classify this query:\nQuery: "${query}"\nOutput:`;
  }
}
