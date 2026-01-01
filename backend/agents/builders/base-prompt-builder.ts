/**
 * Abstract base class for building prompts for different agent types.
 * Subclasses should implement specific prompt building logic.
 */
export abstract class BasePromptBuilder<TInput = string> {
  /**
   * Build the complete prompt for the given input.
   * This is the main method that combines all prompt components.
   */
  abstract buildPrompt(input: TInput): string;

  /**
   * Build the system instruction that defines the agent's role and behavior.
   */
  protected abstract buildSystemPrompt(): string;

  /**
   * Build few-shot examples to guide the model's responses.
   */
  protected abstract buildExamples(): string;

  /**
   * Build the output format specification.
   */
  protected abstract buildOutputFormat(): string;

  /**
   * Format a single example for the prompt.
   * @param input - The example input
   * @param output - The expected output
   * @param description - Optional description of why this output is correct
   */
  protected formatExample(input: string, output: string, description?: string): string {
    const lines = [`Query: "${input}"`, `Output: ${output}`];
    if (description) {
      lines.push(`// ${description}`);
    }
    return lines.join('\n');
  }

  /**
   * Format multiple examples with consistent spacing.
   */
  protected formatExamples(
    examples: Array<{ input: string; output: string; description?: string }>
  ): string {
    return examples
      .map((ex) => this.formatExample(ex.input, ex.output, ex.description))
      .join('\n\n');
  }
}
