import { BasePromptBuilder } from './base-prompt-builder';
import type { KnowledgeInput } from '../types';

/**
 * Prompt builder for the KnowledgeAgent.
 * Builds answer generation prompts using retrieved context from Islamic finance documents.
 */
export class KnowledgePromptBuilder extends BasePromptBuilder<KnowledgeInput> {
  buildPrompt(input: KnowledgeInput): string {
    return [
      this.buildSystemPrompt(),
      this.buildOutputFormat(),
      this.buildExamples(),
      this.buildQuerySection(input),
    ].join('\n\n');
  }

  protected buildSystemPrompt(): string {
    return `You are an Islamic finance expert assistant. Answer questions accurately using ONLY the provided context from verified Islamic finance documents.

RULES:
1. Base answers strictly on the provided context
2. Use Islamic finance terminology correctly
3. Be clear and concise
4. If context is insufficient, say "I don't have enough information to answer that question accurately"
5. Never make up information or provide personal opinions
6. Cite concepts from the context when relevant
7. Structure your answer logically with proper explanations`;
  }

  protected buildOutputFormat(): string {
    return 'OUTPUT FORMAT: Natural language answer based on context';
  }

  protected buildExamples(): string {
    const examples = [
      {
        query: 'What is Riba?',
        context:
          'Riba is an Arabic term that literally means "increase" or "excess". In Islamic finance, riba refers to the practice of charging or paying interest on loans. It is strictly prohibited in Islam based on Quranic verses and Hadith. The prohibition is because it involves exploitation and creates social inequality.',
        answer:
          'Riba is an Arabic term meaning "increase" or "excess." In Islamic finance, it refers to charging or paying interest on loans, which is strictly prohibited in Islam. This prohibition is rooted in Quranic verses and Hadith, as riba involves exploitation and creates social inequality.',
      },
      {
        query: 'How does Murabaha work?',
        context:
          'Murabaha is a cost-plus-profit financing structure. The Islamic bank purchases an asset requested by the customer and then sells it to the customer at a marked-up price. The customer pays in installments over an agreed period. The profit margin is disclosed upfront and remains fixed.',
        answer:
          'Murabaha is a cost-plus-profit financing structure where an Islamic bank purchases an asset on behalf of the customer and sells it to them at a marked-up price. The customer then pays in installments over an agreed period. The key feature is that the profit margin is disclosed upfront and remains fixed throughout the payment period.',
      },
      {
        query: 'What is the difference between Musharakah and Mudharabah?',
        context:
          'Musharakah is a partnership where all partners contribute capital and share profits according to an agreed ratio. Losses are shared according to capital contribution. Mudharabah is a partnership where one party (Rabb-ul-Maal) provides capital and the other (Mudarib) provides expertise and management. Profits are shared per agreement, but losses are borne entirely by the capital provider.',
        answer:
          'Musharakah and Mudharabah are both partnership structures but differ in key ways. In Musharakah, all partners contribute capital and share profits according to an agreed ratio, while losses are distributed based on capital contribution. In Mudharabah, one party (Rabb-ul-Maal) provides all the capital while the other party (Mudarib) provides expertise and management. Profits are shared per agreement, but the capital provider bears all financial losses.',
      },
      {
        query: 'Is cryptocurrency halal?',
        context:
          'The document discusses traditional Islamic banking products such as Murabaha, Ijarah, and Sukuk. It explains the principles of avoiding riba and gharar in financial transactions.',
        answer:
          "I don't have enough information to answer that question accurately. The available context discusses traditional Islamic banking products but doesn't cover cryptocurrency or its Shariah compliance status.",
      },
      {
        query: 'How do I calculate Zakat?',
        context:
          'Ijarah is an Islamic leasing contract where the lessor retains ownership of the asset while the lessee pays rent for its use. At the end of the lease period, ownership may transfer to the lessee.',
        answer:
          "I don't have enough information to answer that question accurately. The available context focuses on Ijarah leasing contracts and doesn't contain information about Zakat calculation.",
      },
    ];

    return `EXAMPLES:\n${examples
      .map((ex) => `Query: "${ex.query}"\nContext: ${ex.context}\nAnswer: ${ex.answer}`)
      .join('\n\n')}`;
  }

  private buildQuerySection(input: KnowledgeInput): string {
    return `Now answer this query using the provided context:\nQuery: "${input.query}"\nContext: ${input.context}\nAnswer:`;
  }
}
