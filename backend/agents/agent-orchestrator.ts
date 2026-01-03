import type { RoutingAgent } from './routing-agent';
import type { KnowledgeAgent } from './knowledge-agent';
import type { CalculationAgent } from './calculation-agent';
import type { ComplianceAgent } from './compliance-agent';
import type { SessionStore, Session } from '@/services/session-store';
import type { StreamEvent, OrchestratorResult } from '@/types/orchestrator.types';
import type { CalculationType, ComplianceResult } from './types';

/**
 * Custom error for orchestrator failures
 */
export class AgentOrchestratorError extends Error {
  constructor(
    message: string,
    public code: string,
    public step?: 'routing' | 'knowledge' | 'calculation' | 'compliance',
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'AgentOrchestratorError';
  }
}

/**
 * Orchestrates all agents to handle user queries with streaming
 */
export class AgentOrchestrator {
  constructor(
    private routingAgent: RoutingAgent,
    private knowledgeAgent: KnowledgeAgent,
    private calculationAgent: CalculationAgent,
    private complianceAgent: ComplianceAgent,
    private sessionStore: SessionStore
  ) {}

  /**
   * Process query with full orchestration and streaming
   */
  async processQuery(
    query: string,
    sessionId: string,
    streamCallback: (event: StreamEvent) => void
  ): Promise<OrchestratorResult> {
    const startTime = Date.now();

    try {
      // Step 1: Validate input
      if (!query?.trim()) {
        throw new AgentOrchestratorError('Query is empty', 'EMPTY_QUERY');
      }

      const session = this.sessionStore.getSession(sessionId);
      if (!session) {
        throw new AgentOrchestratorError('Session not found or expired', 'SESSION_NOT_FOUND');
      }

      // Step 2: Route query
      streamCallback({ type: 'status', data: 'Analyzing query...' });
      const routing = await this.routingAgent.process(query);
      streamCallback({ type: 'routing', data: routing });

      // Step 3: Route to specialized agent
      let agentResponse: string;
      let sources: Array<{ documentId: string; relevance: number }> = [];
      let calculation: CalculationType | undefined;

      if (routing.category === 'calculation') {
        // Calculation agent (no streaming)
        streamCallback({ type: 'status', data: 'Performing calculation...' });
        const calcResult = await this.calculationAgent.process(query);
        agentResponse = calcResult.result;
        calculation = calcResult.calculation;
      } else {
        // Knowledge agent (with streaming)
        streamCallback({
          type: 'status',
          data: 'Searching knowledge base...',
        });

        const context = this.buildConversationContext(session);
        const enrichedQuery = context ? `${context}\n\nCurrent query: ${query}` : query;

        const knowledgeResult = await this.knowledgeAgent.processStreaming(
          enrichedQuery,
          routing.category,
          (chunk) => streamCallback({ type: 'content', data: chunk })
        );

        agentResponse = knowledgeResult.answer;
        sources = knowledgeResult.sources.map((s) => ({
          documentId: s.documentId,
          relevance: s.relevance,
        }));
      }

      // Step 4: Compliance validation
      streamCallback({ type: 'status', data: 'Validating compliance...' });
      const compliance = await this.complianceAgent.validate(agentResponse);
      streamCallback({ type: 'compliance', data: compliance });

      // Step 5: Handle flagged responses
      if (compliance.status === 'FLAGGED') {
        this.logComplianceViolation(sessionId, query, compliance);

        const safeMessage = this.buildSafeMessage(compliance);

        // Update session with flagged query
        this.sessionStore.updateSession(sessionId, {
          role: 'user',
          content: query,
          timestamp: new Date(),
          category: routing.category,
        });
        this.sessionStore.updateSession(sessionId, {
          role: 'assistant',
          content: safeMessage,
          timestamp: new Date(),
          compliance: 'FLAGGED',
        });

        return {
          answer: safeMessage,
          category: routing.category,
          sources: [],
          calculation: undefined,
          metadata: {
            routingConfidence: routing.confidence,
            processingTime: Date.now() - startTime,
            complianceStatus: 'FLAGGED',
            sessionId,
          },
        };
      }

      // Step 6: Update session with successful exchange
      this.sessionStore.updateSession(sessionId, {
        role: 'user',
        content: query,
        timestamp: new Date(),
        category: routing.category,
      });
      this.sessionStore.updateSession(sessionId, {
        role: 'assistant',
        content: agentResponse,
        timestamp: new Date(),
        compliance: 'COMPLIANT',
      });

      // Step 7: Return final result
      return {
        answer: agentResponse,
        category: routing.category,
        sources: sources.length > 0 ? sources : undefined,
        calculation,
        metadata: {
          routingConfidence: routing.confidence,
          processingTime: Date.now() - startTime,
          complianceStatus: 'COMPLIANT',
          sessionId,
        },
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Build conversation context from last 3 user messages
   */
  private buildConversationContext(session: Session): string {
    const lastMessages = this.sessionStore.getLastNMessages(session.sessionId, 3);
    const userMessages = lastMessages.filter((m) => m.role === 'user');

    if (userMessages.length === 0) {
      return '';
    }

    return `Previous questions:\n${userMessages.map((m, i) => `${i + 1}. ${m.content}`).join('\n')}`;
  }

  /**
   * Build safe message for flagged responses
   */
  private buildSafeMessage(compliance: ComplianceResult): string {
    let message = `I cannot provide this information as it may not align with Islamic finance principles.\n\nReason: ${compliance.reasoning}`;

    if (compliance.suggestions && compliance.suggestions.length > 0) {
      message += `\n\nSuggestions:\n${compliance.suggestions.map((s) => `- ${s}`).join('\n')}`;
    }

    return message;
  }

  /**
   * Log compliance violations for monitoring
   */
  private logComplianceViolation(
    sessionId: string,
    query: string,
    compliance: ComplianceResult
  ): void {
    console.warn('[COMPLIANCE VIOLATION]', {
      sessionId,
      timestamp: new Date().toISOString(),
      query: query.substring(0, 100),
      violations: compliance.violations,
      reasoning: compliance.reasoning,
      confidence: compliance.confidence,
    });
  }

  /**
   * Handle and wrap errors with context
   */
  private handleError(error: unknown): AgentOrchestratorError {
    if (error instanceof AgentOrchestratorError) {
      return error;
    }

    if (error instanceof Error) {
      // Map agent errors to orchestrator errors
      if (error.name === 'RoutingAgentError') {
        return new AgentOrchestratorError(error.message, 'ROUTING_FAILED', 'routing', error);
      }

      if (error.name === 'KnowledgeAgentError') {
        return new AgentOrchestratorError(error.message, 'KNOWLEDGE_FAILED', 'knowledge', error);
      }

      if (error.name === 'CalculationAgentError') {
        return new AgentOrchestratorError(
          error.message,
          'CALCULATION_FAILED',
          'calculation',
          error
        );
      }

      if (error.name === 'ComplianceAgentError') {
        // Compliance errors should be treated as flagged
        return new AgentOrchestratorError(
          'Compliance validation failed',
          'COMPLIANCE_FAILED',
          'compliance',
          error
        );
      }

      return new AgentOrchestratorError(error.message, 'UNKNOWN_ERROR', undefined, error);
    }

    return new AgentOrchestratorError(
      'An unexpected error occurred',
      'UNKNOWN_ERROR',
      undefined,
      error
    );
  }
}
