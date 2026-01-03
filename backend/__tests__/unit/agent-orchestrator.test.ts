import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentOrchestrator, AgentOrchestratorError } from '@/agents/agent-orchestrator';
import type { RoutingAgent } from '@/agents/routing-agent';
import type { KnowledgeAgent } from '@/agents/knowledge-agent';
import type { CalculationAgent } from '@/agents/calculation-agent';
import type { ComplianceAgent } from '@/agents/compliance-agent';
import type { SessionStore, Session } from '@/services/session-store';
import type { StreamEvent } from '@/types/orchestrator.types';

describe('AgentOrchestrator', () => {
  let orchestrator: AgentOrchestrator;
  let mockRoutingAgent: RoutingAgent;
  let mockKnowledgeAgent: KnowledgeAgent;
  let mockCalculationAgent: CalculationAgent;
  let mockComplianceAgent: ComplianceAgent;
  let mockSessionStore: SessionStore;
  let streamCallback: (event: StreamEvent) => void;
  let capturedEvents: StreamEvent[];

  beforeEach(() => {
    capturedEvents = [];
    streamCallback = vi.fn((event: StreamEvent) => {
      capturedEvents.push(event);
    });

    // Mock RoutingAgent
    mockRoutingAgent = {
      process: vi.fn(),
    } as unknown as RoutingAgent;

    // Mock KnowledgeAgent
    mockKnowledgeAgent = {
      processStreaming: vi.fn(),
    } as unknown as KnowledgeAgent;

    // Mock CalculationAgent
    mockCalculationAgent = {
      process: vi.fn(),
    } as unknown as CalculationAgent;

    // Mock ComplianceAgent
    mockComplianceAgent = {
      validate: vi.fn(),
    } as unknown as ComplianceAgent;

    // Mock SessionStore
    mockSessionStore = {
      getSession: vi.fn(),
      updateSession: vi.fn(),
      getLastNMessages: vi.fn().mockReturnValue([]),
    } as unknown as SessionStore;

    orchestrator = new AgentOrchestrator(
      mockRoutingAgent,
      mockKnowledgeAgent,
      mockCalculationAgent,
      mockComplianceAgent,
      mockSessionStore
    );
  });

  describe('processQuery - Validation', () => {
    it('should throw error for empty query', async () => {
      await expect(orchestrator.processQuery('', 'session-123', streamCallback)).rejects.toThrow(
        AgentOrchestratorError
      );

      await expect(orchestrator.processQuery('   ', 'session-123', streamCallback)).rejects.toThrow(
        'Query is empty'
      );
    });

    it('should throw error for non-existent session', async () => {
      vi.mocked(mockSessionStore.getSession).mockReturnValue(null);

      await expect(
        orchestrator.processQuery('What is Riba?', 'invalid-session', streamCallback)
      ).rejects.toThrow('Session not found or expired');
    });
  });

  describe('processQuery - Knowledge Path', () => {
    beforeEach(() => {
      // Setup valid session
      vi.mocked(mockSessionStore.getSession).mockReturnValue({
        sessionId: 'session-123',
        conversationHistory: [],
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        metadata: { totalQueries: 0, flaggedQueries: 0 },
      } as Session);

      // Setup routing for principles category
      vi.mocked(mockRoutingAgent.process).mockResolvedValue({
        category: 'principles',
        confidence: 0.95,
        explanation: 'Query about Islamic finance principles',
      });

      // Setup compliant response
      vi.mocked(mockComplianceAgent.validate).mockResolvedValue({
        status: 'COMPLIANT',
        confidence: 0.98,
        reasoning: 'Response aligns with Islamic finance principles',
      });
    });

    it('should process query through knowledge agent successfully', async () => {
      vi.mocked(mockKnowledgeAgent.processStreaming).mockImplementation(
        async (_query, _category, callback) => {
          callback('Riba');
          callback(' refers');
          callback(' to interest');
          return {
            answer: 'Riba refers to interest',
            sources: [{ documentId: 'doc-1', content: 'chunk1', relevance: 0.95 }],
            confidence: 0.98,
            category: 'principles',
          };
        }
      );

      const result = await orchestrator.processQuery(
        'What is Riba?',
        'session-123',
        streamCallback
      );

      expect(result).toMatchObject({
        answer: 'Riba refers to interest',
        category: 'principles',
        sources: [{ documentId: 'doc-1', relevance: 0.95 }],
        metadata: {
          complianceStatus: 'COMPLIANT',
          sessionId: 'session-123',
        },
      });

      expect(mockRoutingAgent.process).toHaveBeenCalledWith('What is Riba?');
      expect(mockKnowledgeAgent.processStreaming).toHaveBeenCalledWith(
        'What is Riba?',
        'principles',
        expect.any(Function)
      );
      expect(mockComplianceAgent.validate).toHaveBeenCalledWith('Riba refers to interest');
    });

    it('should stream events in correct order', async () => {
      vi.mocked(mockKnowledgeAgent.processStreaming).mockResolvedValue({
        answer: 'Test answer',
        sources: [],
        confidence: 0.9,
        category: 'principles',
      });

      await orchestrator.processQuery('What is Riba?', 'session-123', streamCallback);

      const eventTypes = capturedEvents.map((e) => e.type);
      expect(eventTypes).toEqual([
        'status', // "Analyzing query..."
        'routing',
        'status', // "Searching knowledge base..."
        'status', // "Validating compliance..."
        'compliance',
      ]);
    });

    it('should stream content chunks during knowledge processing', async () => {
      vi.mocked(mockKnowledgeAgent.processStreaming).mockImplementation(
        async (_query, _category, callback) => {
          callback('Chunk 1');
          callback('Chunk 2');
          callback('Chunk 3');
          return {
            answer: 'Complete answer',
            sources: [],
            confidence: 0.9,
            category: 'principles',
          };
        }
      );

      await orchestrator.processQuery('What is Riba?', 'session-123', streamCallback);

      const contentEvents = capturedEvents.filter((e) => e.type === 'content');
      expect(contentEvents).toHaveLength(3);
      expect(contentEvents[0].data).toBe('Chunk 1');
      expect(contentEvents[1].data).toBe('Chunk 2');
      expect(contentEvents[2].data).toBe('Chunk 3');
    });

    it('should update session with successful exchange', async () => {
      vi.mocked(mockKnowledgeAgent.processStreaming).mockResolvedValue({
        answer: 'Test answer',
        sources: [],
        confidence: 0.9,
        category: 'principles',
      });

      await orchestrator.processQuery('What is Riba?', 'session-123', streamCallback);

      expect(mockSessionStore.updateSession).toHaveBeenCalledTimes(2);
      expect(mockSessionStore.updateSession).toHaveBeenNthCalledWith(
        1,
        'session-123',
        expect.objectContaining({
          role: 'user',
          content: 'What is Riba?',
          category: 'principles',
        })
      );
      expect(mockSessionStore.updateSession).toHaveBeenNthCalledWith(
        2,
        'session-123',
        expect.objectContaining({
          role: 'assistant',
          content: 'Test answer',
          compliance: 'COMPLIANT',
        })
      );
    });

    it('should include conversation context from last 3 messages', async () => {
      vi.mocked(mockSessionStore.getLastNMessages).mockReturnValue([
        {
          role: 'user',
          content: 'Question 1',
          timestamp: new Date(),
        },
        {
          role: 'user',
          content: 'Question 2',
          timestamp: new Date(),
        },
        {
          role: 'user',
          content: 'Question 3',
          timestamp: new Date(),
        },
      ]);

      vi.mocked(mockKnowledgeAgent.processStreaming).mockResolvedValue({
        answer: 'Test answer',
        sources: [],
        confidence: 0.9,
        category: 'principles',
      });

      await orchestrator.processQuery('Current question', 'session-123', streamCallback);

      expect(mockKnowledgeAgent.processStreaming).toHaveBeenCalledWith(
        expect.stringContaining('Previous questions:'),
        'principles',
        expect.any(Function)
      );

      const enrichedQuery = vi.mocked(mockKnowledgeAgent.processStreaming).mock.calls[0][0];
      expect(enrichedQuery).toContain('1. Question 1');
      expect(enrichedQuery).toContain('2. Question 2');
      expect(enrichedQuery).toContain('3. Question 3');
      expect(enrichedQuery).toContain('Current query: Current question');
    });

    it('should not add context if no previous messages', async () => {
      vi.mocked(mockSessionStore.getLastNMessages).mockReturnValue([]);

      vi.mocked(mockKnowledgeAgent.processStreaming).mockResolvedValue({
        answer: 'Test answer',
        sources: [],
        confidence: 0.9,
        category: 'principles',
      });

      await orchestrator.processQuery('First question', 'session-123', streamCallback);

      expect(mockKnowledgeAgent.processStreaming).toHaveBeenCalledWith(
        'First question',
        'principles',
        expect.any(Function)
      );
    });
  });

  describe('processQuery - Calculation Path', () => {
    beforeEach(() => {
      vi.mocked(mockSessionStore.getSession).mockReturnValue({
        sessionId: 'session-123',
        conversationHistory: [],
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        metadata: { totalQueries: 0, flaggedQueries: 0 },
      } as Session);

      vi.mocked(mockRoutingAgent.process).mockResolvedValue({
        category: 'calculation',
        confidence: 0.92,
        explanation: 'Query about profit sharing calculation',
      });

      vi.mocked(mockComplianceAgent.validate).mockResolvedValue({
        status: 'COMPLIANT',
        confidence: 0.95,
        reasoning: 'Calculation follows Islamic principles',
      });
    });

    it('should process query through calculation agent', async () => {
      vi.mocked(mockCalculationAgent.process).mockResolvedValue({
        result: 'Partner A receives $3000, Partner B receives $2000',
        calculation: {
          type: 'musharakah',
          inputs: { totalProfit: 5000, shareA: 0.6, shareB: 0.4 },
          outputs: { profitA: 3000, profitB: 2000 },
          steps: ['Calculate A share: 5000 * 0.6 = 3000', 'Calculate B share: 5000 * 0.4 = 2000'],
        },
      });

      const result = await orchestrator.processQuery(
        'Calculate Musharakah profit for $5000',
        'session-123',
        streamCallback
      );

      expect(result).toMatchObject({
        answer: 'Partner A receives $3000, Partner B receives $2000',
        category: 'calculation',
        calculation: {
          type: 'musharakah',
          inputs: { totalProfit: 5000, shareA: 0.6, shareB: 0.4 },
          outputs: { profitA: 3000, profitB: 2000 },
        },
      });

      expect(mockCalculationAgent.process).toHaveBeenCalledWith(
        'Calculate Musharakah profit for $5000'
      );
      expect(mockKnowledgeAgent.processStreaming).not.toHaveBeenCalled();
    });

    it('should not stream content for calculation path', async () => {
      vi.mocked(mockCalculationAgent.process).mockResolvedValue({
        result: 'Calculation result',
        calculation: {
          type: 'mudharabah',
          inputs: { profit: 1000 },
          outputs: { investor: 700, entrepreneur: 300 },
          steps: [],
        },
      });

      await orchestrator.processQuery('Calculate Mudharabah', 'session-123', streamCallback);

      const contentEvents = capturedEvents.filter((e) => e.type === 'content');
      expect(contentEvents).toHaveLength(0);
    });
  });

  describe('processQuery - Flagged Responses', () => {
    beforeEach(() => {
      vi.mocked(mockSessionStore.getSession).mockReturnValue({
        sessionId: 'session-123',
        conversationHistory: [],
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        metadata: { totalQueries: 0, flaggedQueries: 0 },
      } as Session);

      vi.mocked(mockRoutingAgent.process).mockResolvedValue({
        category: 'general',
        confidence: 0.8,
        explanation: 'General query',
      });
    });

    it('should return safe message for flagged content', async () => {
      vi.mocked(mockKnowledgeAgent.processStreaming).mockResolvedValue({
        answer: 'Response with riba-based investment',
        sources: [],
        confidence: 0.9,
        category: 'general',
      });

      vi.mocked(mockComplianceAgent.validate).mockResolvedValue({
        status: 'FLAGGED',
        confidence: 0.95,
        reasoning: 'Response suggests interest-based investments',
        violations: ['Mentions conventional interest'],
        suggestions: ['Consider Shariah-compliant alternatives'],
      });

      const result = await orchestrator.processQuery(
        'Best investment options?',
        'session-123',
        streamCallback
      );

      expect(result.answer).toContain(
        'I cannot provide this information as it may not align with Islamic finance principles'
      );
      expect(result.answer).toContain('Response suggests interest-based investments');
      expect(result.answer).toContain('Consider Shariah-compliant alternatives');
      expect(result.metadata.complianceStatus).toBe('FLAGGED');
    });

    it('should not include sources for flagged responses', async () => {
      vi.mocked(mockKnowledgeAgent.processStreaming).mockResolvedValue({
        answer: 'Flagged response',
        sources: [{ documentId: 'doc-1', content: 'chunk', relevance: 0.9 }],
        confidence: 0.9,
        category: 'general',
      });

      vi.mocked(mockComplianceAgent.validate).mockResolvedValue({
        status: 'FLAGGED',
        confidence: 0.95,
        reasoning: 'Non-compliant content',
      });

      const result = await orchestrator.processQuery('Query', 'session-123', streamCallback);

      expect(result.sources).toEqual([]);
      expect(result.calculation).toBeUndefined();
    });

    it('should update session with flagged status', async () => {
      vi.mocked(mockKnowledgeAgent.processStreaming).mockResolvedValue({
        answer: 'Flagged response',
        sources: [],
        confidence: 0.9,
        category: 'general',
      });

      vi.mocked(mockComplianceAgent.validate).mockResolvedValue({
        status: 'FLAGGED',
        confidence: 0.95,
        reasoning: 'Non-compliant content',
      });

      await orchestrator.processQuery('Query', 'session-123', streamCallback);

      expect(mockSessionStore.updateSession).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({
          role: 'assistant',
          compliance: 'FLAGGED',
        })
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(mockSessionStore.getSession).mockReturnValue({
        sessionId: 'session-123',
        conversationHistory: [],
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        metadata: { totalQueries: 0, flaggedQueries: 0 },
      } as Session);
    });

    it('should wrap routing agent errors', async () => {
      const routingError = new Error('LLM connection failed');
      routingError.name = 'RoutingAgentError';
      vi.mocked(mockRoutingAgent.process).mockRejectedValue(routingError);

      await expect(
        orchestrator.processQuery('Query', 'session-123', streamCallback)
      ).rejects.toMatchObject({
        name: 'AgentOrchestratorError',
        code: 'ROUTING_FAILED',
        step: 'routing',
      });
    });

    it('should wrap knowledge agent errors', async () => {
      vi.mocked(mockRoutingAgent.process).mockResolvedValue({
        category: 'principles',
        confidence: 0.9,
        explanation: 'Test',
      });

      const knowledgeError = new Error('Vector search failed');
      knowledgeError.name = 'KnowledgeAgentError';
      vi.mocked(mockKnowledgeAgent.processStreaming).mockRejectedValue(knowledgeError);

      await expect(
        orchestrator.processQuery('Query', 'session-123', streamCallback)
      ).rejects.toMatchObject({
        name: 'AgentOrchestratorError',
        code: 'KNOWLEDGE_FAILED',
        step: 'knowledge',
      });
    });

    it('should wrap calculation agent errors', async () => {
      vi.mocked(mockRoutingAgent.process).mockResolvedValue({
        category: 'calculation',
        confidence: 0.9,
        explanation: 'Test',
      });

      const calculationError = new Error('MCP server unavailable');
      calculationError.name = 'CalculationAgentError';
      vi.mocked(mockCalculationAgent.process).mockRejectedValue(calculationError);

      await expect(
        orchestrator.processQuery('Query', 'session-123', streamCallback)
      ).rejects.toMatchObject({
        name: 'AgentOrchestratorError',
        code: 'CALCULATION_FAILED',
        step: 'calculation',
      });
    });

    it('should wrap compliance agent errors', async () => {
      vi.mocked(mockRoutingAgent.process).mockResolvedValue({
        category: 'principles',
        confidence: 0.9,
        explanation: 'Test',
      });

      vi.mocked(mockKnowledgeAgent.processStreaming).mockResolvedValue({
        answer: 'Test answer',
        sources: [],
        confidence: 0.9,
        category: 'principles',
      });

      const complianceError = new Error('Compliance check failed');
      complianceError.name = 'ComplianceAgentError';
      vi.mocked(mockComplianceAgent.validate).mockRejectedValue(complianceError);

      await expect(
        orchestrator.processQuery('Query', 'session-123', streamCallback)
      ).rejects.toMatchObject({
        name: 'AgentOrchestratorError',
        code: 'COMPLIANCE_FAILED',
        step: 'compliance',
      });
    });

    it('should handle unknown errors', async () => {
      vi.mocked(mockRoutingAgent.process).mockRejectedValue('Unknown error string');

      await expect(
        orchestrator.processQuery('Query', 'session-123', streamCallback)
      ).rejects.toMatchObject({
        name: 'AgentOrchestratorError',
        code: 'UNKNOWN_ERROR',
      });
    });

    it('should preserve original error in wrapped error', async () => {
      const originalError = new Error('Original error');
      originalError.name = 'RoutingAgentError';
      vi.mocked(mockRoutingAgent.process).mockRejectedValue(originalError);

      try {
        await orchestrator.processQuery('Query', 'session-123', streamCallback);
      } catch (error) {
        expect((error as AgentOrchestratorError).originalError).toBe(originalError);
      }
    });
  });

  describe('Metadata', () => {
    beforeEach(() => {
      vi.mocked(mockSessionStore.getSession).mockReturnValue({
        sessionId: 'session-123',
        conversationHistory: [],
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        metadata: { totalQueries: 0, flaggedQueries: 0 },
      } as Session);

      vi.mocked(mockRoutingAgent.process).mockResolvedValue({
        category: 'principles',
        confidence: 0.95,
        explanation: 'Test',
      });

      vi.mocked(mockKnowledgeAgent.processStreaming).mockResolvedValue({
        answer: 'Test answer',
        sources: [],
        confidence: 0.9,
        category: 'principles',
      });

      vi.mocked(mockComplianceAgent.validate).mockResolvedValue({
        status: 'COMPLIANT',
        confidence: 0.98,
        reasoning: 'Compliant',
      });
    });

    it('should include routing confidence in metadata', async () => {
      const result = await orchestrator.processQuery('Query', 'session-123', streamCallback);

      expect(result.metadata.routingConfidence).toBe(0.95);
    });

    it('should include processing time in metadata', async () => {
      const result = await orchestrator.processQuery('Query', 'session-123', streamCallback);

      expect(result.metadata.processingTime).toBeGreaterThanOrEqual(0);
      expect(typeof result.metadata.processingTime).toBe('number');
    });

    it('should include sessionId in metadata', async () => {
      const result = await orchestrator.processQuery('Query', 'session-123', streamCallback);

      expect(result.metadata.sessionId).toBe('session-123');
    });

    it('should include compliance status in metadata', async () => {
      const result = await orchestrator.processQuery('Query', 'session-123', streamCallback);

      expect(result.metadata.complianceStatus).toBe('COMPLIANT');
    });
  });
});
