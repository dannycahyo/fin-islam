import { ChatOllama } from '@langchain/ollama';
import { CalculationPromptBuilder } from './builders/calculation-prompt-builder';
import { MCPClient, MCPClientError, MCPToolResult } from '@/lib/mcp-client';
import { CalculationResult } from './types';

export class CalculationAgentError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'CalculationAgentError';
  }
}

export interface CalculationAgentConfig {
  baseUrl?: string;
  model?: string;
  maxRetries?: number;
  temperature?: number;
}

// Parameter types for extraction
interface MusharakahPartner {
  name: string;
  investment: number;
}

interface MusharakahParameters {
  partners: MusharakahPartner[];
  totalProfit: number;
  profitRatio?: number[];
}

interface MudharabahParameters {
  capitalAmount: number;
  profit: number;
  capitalProviderRatio: number;
  entrepreneurRatio: number;
}

// Discriminated union for extraction results
type ExtractionResult =
  | {
      type: 'musharakah';
      parameters: MusharakahParameters;
    }
  | {
      type: 'mudharabah';
      parameters: MudharabahParameters;
    };

// MCP Response types
interface MusharakahDistribution {
  partner: string;
  share: string;
  capitalRatio: string;
}

interface MudharabahDistribution {
  capital_provider_rabb_al_mal: {
    share: string;
    ratio: string;
  };
  entrepreneur_mudarib: {
    share: string;
    ratio: string;
  };
}

interface MusharakahMCPResponse {
  summary: string;
  contract_type: string;
  total_investment: number;
  total_profit_loss: number;
  is_loss: boolean;
  distribution: MusharakahDistribution[];
  shariah_explanation: string;
  calculation_steps: string[];
}

interface MudharabahMCPResponse {
  summary: string;
  contract_type: string;
  capital_amount: number;
  profit_loss: number;
  is_loss: boolean;
  distribution: MudharabahDistribution;
  shariah_explanation: string;
  calculation_steps: string[];
}

type MCPResponse = MusharakahMCPResponse | MudharabahMCPResponse;

export class CalculationAgent {
  private llmClient: ChatOllama;
  private mcpClient: MCPClient;
  private maxRetries: number;
  private promptBuilder: CalculationPromptBuilder;

  constructor(config: CalculationAgentConfig = {}) {
    const {
      baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model = process.env.OLLAMA_MODEL || 'llama3.1:8b',
      maxRetries = 3,
      temperature = 0.1,
    } = config;

    this.llmClient = new ChatOllama({
      baseUrl,
      model,
      temperature,
    });
    this.mcpClient = MCPClient.getInstance();
    this.maxRetries = maxRetries;
    this.promptBuilder = new CalculationPromptBuilder();
  }

  async process(query: string): Promise<CalculationResult> {
    if (!query?.trim()) {
      throw new CalculationAgentError('Query cannot be empty', 'EMPTY_QUERY');
    }

    return this.executeWithRetry(async () => {
      // Step 1: Extract parameters using LLM
      const extractionResult = await this.extractParameters(query);

      // Step 2: Call MCP tool based on type
      const mcpResult = await this.callMCPTool(extractionResult);

      // Step 3: Format result with explanation
      return this.formatResult(mcpResult, extractionResult);
    });
  }

  private async extractParameters(query: string): Promise<ExtractionResult> {
    const prompt = this.promptBuilder.buildPrompt(query);
    const response = await this.llmClient.invoke(prompt);

    const content =
      typeof response.content === 'string' ? response.content : String(response.content);

    return this.parseExtractionResponse(content);
  }

  private parseExtractionResponse(response: string): ExtractionResult {
    try {
      // Clean JSON from potential markdown code blocks
      const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();

      const parsed = JSON.parse(cleaned);

      // Validate structure
      if (!parsed.type || !parsed.parameters) {
        throw new Error('Missing type or parameters in response');
      }

      if (!['musharakah', 'mudharabah'].includes(parsed.type)) {
        throw new Error(`Invalid calculation type: ${parsed.type}`);
      }

      return parsed as ExtractionResult;
    } catch (error) {
      throw new CalculationAgentError(
        'Failed to parse extraction response. Please rephrase your query with clear investment amounts and profit/loss values.',
        'EXTRACTION_PARSE_ERROR',
        error
      );
    }
  }

  private async callMCPTool(extraction: ExtractionResult): Promise<MCPResponse> {
    const toolName =
      extraction.type === 'musharakah' ? 'calculate_musharakah' : 'calculate_mudharabah';

    try {
      await this.mcpClient.connect();
      const result: MCPToolResult = await this.mcpClient.callTool(
        toolName,
        extraction.parameters as unknown as Record<string, unknown>
      );

      // MCP returns { content: [{ type: 'text', text: string }], isError?: boolean }
      if (result.isError) {
        const errorText = result.content[0]?.text || 'MCP tool returned error';
        throw new Error(errorText);
      }

      const mcpOutput: MCPResponse = JSON.parse(result.content[0].text);
      return mcpOutput;
    } catch (error) {
      if (error instanceof MCPClientError) {
        throw new CalculationAgentError(
          `MCP connection failed: ${error.message}`,
          error.code,
          error
        );
      }

      // Check if it's a validation error from MCP
      const errorMessage = this.getErrorMessage(error);
      if (errorMessage.includes('Validation Error')) {
        throw new CalculationAgentError(errorMessage, 'VALIDATION_ERROR', error);
      }

      throw new CalculationAgentError(
        `Calculation tool failed: ${errorMessage}`,
        'MCP_TOOL_ERROR',
        error
      );
    }
  }

  private formatResult(mcpResult: MCPResponse, extraction: ExtractionResult): CalculationResult {
    const explanation = this.buildExplanation(mcpResult);

    return {
      result: explanation,
      calculation: {
        type: extraction.type,
        inputs: this.extractInputs(mcpResult, extraction),
        outputs: this.extractOutputs(mcpResult),
        steps: mcpResult.calculation_steps || [],
      },
    };
  }

  private buildExplanation(mcpResult: MCPResponse): string {
    const lines: string[] = [
      `## ${mcpResult.summary}`,
      '',
      `**Contract Type**: ${mcpResult.contract_type}`,
      '',
    ];

    // Add investment/capital details
    if ('total_investment' in mcpResult) {
      lines.push(`**Total Investment**: ${this.formatCurrency(mcpResult.total_investment)}`);
    }
    if ('capital_amount' in mcpResult) {
      lines.push(`**Capital Amount**: ${this.formatCurrency(mcpResult.capital_amount)}`);
    }

    const profitLossLabel = mcpResult.is_loss ? 'Loss' : 'Profit';
    const profitLossAmount =
      'total_profit_loss' in mcpResult ? mcpResult.total_profit_loss : mcpResult.profit_loss;

    lines.push(`**${profitLossLabel}**: ${this.formatCurrency(Math.abs(profitLossAmount))}`);
    lines.push('');

    // Distribution section
    lines.push('### Distribution:');
    lines.push(...this.formatDistribution(mcpResult));
    lines.push('');

    // Shariah compliance
    lines.push('### Shariah Compliance:');
    lines.push(mcpResult.shariah_explanation);
    lines.push('');

    // Calculation steps
    if (mcpResult.calculation_steps && mcpResult.calculation_steps.length > 0) {
      lines.push('### Calculation Steps:');
      mcpResult.calculation_steps.forEach((step: string, i: number) => {
        lines.push(`${i + 1}. ${step}`);
      });
    }

    return lines.join('\n');
  }

  private formatDistribution(mcpResult: MCPResponse): string[] {
    const lines: string[] = [];

    // Musharakah format (array)
    if (Array.isArray(mcpResult.distribution)) {
      mcpResult.distribution.forEach((d: MusharakahDistribution) => {
        const capitalRatio = this.formatPercentage(parseFloat(d.capitalRatio));
        lines.push(
          `- **${d.partner}**: ${this.formatCurrency(parseFloat(d.share))} (${capitalRatio} capital)`
        );
      });
    }
    // Mudharabah format (object)
    else {
      const cpShare = mcpResult.distribution.capital_provider_rabb_al_mal;
      const entShare = mcpResult.distribution.entrepreneur_mudarib;

      lines.push(
        `- **Capital Provider (Rabb al-Mal)**: ${this.formatCurrency(parseFloat(cpShare.share))} (${this.formatPercentage(parseFloat(cpShare.ratio))})`
      );
      lines.push(
        `- **Entrepreneur (Mudarib)**: ${this.formatCurrency(parseFloat(entShare.share))} (${this.formatPercentage(parseFloat(entShare.ratio))})`
      );
    }

    return lines;
  }

  private extractInputs(
    mcpResult: MCPResponse,
    extraction: ExtractionResult
  ): Record<string, number> {
    const inputs: Record<string, number> = {};

    if (extraction.type === 'musharakah') {
      extraction.parameters.partners.forEach((p: MusharakahPartner) => {
        inputs[`${p.name}_investment`] = p.investment;
      });
      inputs.total_profit = extraction.parameters.totalProfit;
    } else if (extraction.type === 'mudharabah') {
      inputs.capital_amount = extraction.parameters.capitalAmount;
      inputs.profit = extraction.parameters.profit;
      inputs.capital_provider_ratio = extraction.parameters.capitalProviderRatio;
      inputs.entrepreneur_ratio = extraction.parameters.entrepreneurRatio;
    }

    return inputs;
  }

  private extractOutputs(mcpResult: MCPResponse): Record<string, number> {
    const outputs: Record<string, number> = {};

    if (Array.isArray(mcpResult.distribution)) {
      // Musharakah
      mcpResult.distribution.forEach((d: MusharakahDistribution) => {
        outputs[d.partner] = parseFloat(d.share);
      });
    } else {
      // Mudharabah
      outputs.capital_provider = parseFloat(
        mcpResult.distribution.capital_provider_rabb_al_mal.share
      );
      outputs.entrepreneur = parseFloat(mcpResult.distribution.entrepreneur_mudarib.share);
    }

    return outputs;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  private formatPercentage(value: number): string {
    // Convert decimal to percentage (0.625 -> 62.50%)
    return `${(value * 100).toFixed(2)}%`;
  }

  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry validation/parsing errors - user needs to rephrase
        if (
          error instanceof CalculationAgentError &&
          ['EMPTY_QUERY', 'EXTRACTION_PARSE_ERROR', 'VALIDATION_ERROR'].includes(error.code)
        ) {
          throw error;
        }

        const isRetryable = this.isRetryableError(error);
        const isLastAttempt = attempt === this.maxRetries;

        if (!isRetryable || isLastAttempt) {
          throw new CalculationAgentError(
            `Calculation failed after ${attempt} attempt(s): ${this.getErrorMessage(error)}`,
            this.getErrorCode(error),
            error
          );
        }

        // Exponential backoff with max 5s
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await this.sleep(delayMs);
      }
    }

    throw new CalculationAgentError(
      'Maximum retry attempts exceeded',
      'MAX_RETRIES_EXCEEDED',
      lastError
    );
  }

  private isRetryableError(error: unknown): boolean {
    const msg = this.getErrorMessage(error).toLowerCase();
    return (
      msg.includes('connection') ||
      msg.includes('timeout') ||
      msg.includes('econnrefused') ||
      msg.includes('enotfound') ||
      msg.includes('rate limit') ||
      msg.includes('429') ||
      msg.includes('503')
    );
  }

  private getErrorCode(error: unknown): string {
    if (error instanceof CalculationAgentError) {
      return error.code;
    }
    if (error instanceof MCPClientError) {
      return error.code;
    }

    const msg = this.getErrorMessage(error).toLowerCase();
    if (msg.includes('connection')) return 'CONNECTION_FAILED';
    if (msg.includes('timeout')) return 'TIMEOUT';
    if (msg.includes('validation')) return 'VALIDATION_ERROR';

    return 'UNKNOWN_ERROR';
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
