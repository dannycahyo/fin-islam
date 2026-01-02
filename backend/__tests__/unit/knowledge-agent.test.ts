import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KnowledgeAgent, KnowledgeAgentError } from '@/agents/knowledge-agent.js';
import type { ChunkRepository, SearchResult } from '@/repositories/chunk.repository';
import type { EmbeddingService } from '@/services/embedding-service';

// Mock dependencies
const mockChunkRepo = {
  vectorSearch: vi.fn(),
} as unknown as ChunkRepository;

const mockEmbedder = {
  embedSingle: vi.fn(),
} as unknown as EmbeddingService;

vi.mock('@langchain/ollama', () => {
  return {
    ChatOllama: class MockChatOllama {
      invoke = vi.fn();
      stream = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
      constructor(_config: any) {}
    },
  };
});

describe('KnowledgeAgent', () => {
  let agent: KnowledgeAgent;
  let mockInvoke: ReturnType<typeof vi.fn>;
  let mockStream: ReturnType<typeof vi.fn>;

  const createMockChunks = (count: number, baseSimilarity: number): SearchResult[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `chunk-${i + 1}`,
      content: `Islamic finance content ${i + 1}. This discusses important concepts related to Shariah compliance and financial principles.`,
      documentId: `doc-${i + 1}`,
      similarity: baseSimilarity - i * 0.05,
      metadata: {
        category: 'principles',
        chunkIndex: i,
      },
    }));
  };

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new KnowledgeAgent(mockChunkRepo, mockEmbedder);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockInvoke = (agent as any).client.invoke;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockStream = (agent as any).client.stream;

    // Default mock implementations
    (mockEmbedder.embedSingle as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Array(768).fill(0.1)
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const defaultAgent = new KnowledgeAgent(mockChunkRepo, mockEmbedder);
      expect(defaultAgent).toBeInstanceOf(KnowledgeAgent);
    });

    it('should initialize with custom config', () => {
      const customAgent = new KnowledgeAgent(mockChunkRepo, mockEmbedder, {
        baseUrl: 'http://custom:11434',
        model: 'custom-model',
        maxRetries: 5,
        temperature: 0.5,
        retrievalLimit: 10,
        rerankedLimit: 5,
        confidenceThreshold: 0.6,
      });
      expect(customAgent).toBeInstanceOf(KnowledgeAgent);
    });

    it('should use environment variables when available', () => {
      process.env.KNOWLEDGE_AGENT_MODEL = 'env-model';
      process.env.KNOWLEDGE_AGENT_TEMPERATURE = '0.8';
      process.env.KNOWLEDGE_RETRIEVAL_LIMIT = '7';
      process.env.KNOWLEDGE_RERANKED_LIMIT = '4';
      process.env.KNOWLEDGE_CONFIDENCE_THRESHOLD = '0.55';

      const envAgent = new KnowledgeAgent(mockChunkRepo, mockEmbedder);
      expect(envAgent).toBeInstanceOf(KnowledgeAgent);

      delete process.env.KNOWLEDGE_AGENT_MODEL;
      delete process.env.KNOWLEDGE_AGENT_TEMPERATURE;
      delete process.env.KNOWLEDGE_RETRIEVAL_LIMIT;
      delete process.env.KNOWLEDGE_RERANKED_LIMIT;
      delete process.env.KNOWLEDGE_CONFIDENCE_THRESHOLD;
    });
  });

  describe('process - validation', () => {
    it('should throw error for empty query', async () => {
      await expect(agent.process('', 'principles')).rejects.toThrow(KnowledgeAgentError);
      await expect(agent.process('', 'principles')).rejects.toMatchObject({
        code: 'EMPTY_QUERY',
      });
    });

    it('should throw error for whitespace-only query', async () => {
      await expect(agent.process('   \n   ', 'principles')).rejects.toThrow(KnowledgeAgentError);
      await expect(agent.process('   \n   ', 'principles')).rejects.toMatchObject({
        code: 'EMPTY_QUERY',
      });
    });

    it('should throw error when no results found', async () => {
      (mockChunkRepo.vectorSearch as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await expect(agent.process('What is Riba?', 'principles')).rejects.toThrow(
        KnowledgeAgentError
      );
      await expect(agent.process('What is Riba?', 'principles')).rejects.toMatchObject({
        code: 'NO_RESULTS',
      });
    });
  });

  describe('RAG pipeline - 10+ Islamic finance questions', () => {
    it('should answer: What is Riba?', async () => {
      const mockChunks = createMockChunks(5, 0.92);
      mockChunks[0].content =
        'Riba is an Arabic term meaning "increase" or "excess". In Islamic finance, it refers to charging or paying interest on loans, which is strictly prohibited in Islam.';

      (mockChunkRepo.vectorSearch as ReturnType<typeof vi.fn>).mockResolvedValue(mockChunks);
      mockInvoke.mockResolvedValue({
        content:
          'Riba is an Arabic term meaning "increase" or "excess." In Islamic finance, it refers to charging interest on loans, which is prohibited in Islam based on Quranic verses.',
      });

      const result = await agent.process('What is Riba?', 'principles');

      expect(result.category).toBe('principles');
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.answer).toContain('Riba');
      expect(result.sources).toHaveLength(3); // Re-ranked to top 3
      expect(mockEmbedder.embedSingle).toHaveBeenCalledWith('What is Riba?');
    });

    it('should answer: How does Murabaha work?', async () => {
      const mockChunks = createMockChunks(5, 0.89);
      mockChunks[0].content =
        'Murabaha is a cost-plus-profit financing structure where an Islamic bank purchases an asset and sells it to the customer at a marked-up price.';

      (mockChunkRepo.vectorSearch as ReturnType<typeof vi.fn>).mockResolvedValue(mockChunks);
      mockInvoke.mockResolvedValue({
        content:
          'Murabaha is a cost-plus-profit financing structure used in Islamic banking. The bank purchases an asset on behalf of the customer and sells it at a marked-up price.',
      });

      const result = await agent.process('How does Murabaha work?', 'products');

      expect(result.category).toBe('products');
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.answer).toContain('Murabaha');
      expect(result.sources).toHaveLength(3);
    });

    it('should answer: What is the difference between Musharakah and Mudharabah?', async () => {
      const mockChunks = createMockChunks(5, 0.91);
      mockChunks[0].content =
        'Musharakah is a partnership where all partners contribute capital. Mudharabah is where one party provides capital and the other provides expertise.';

      (mockChunkRepo.vectorSearch as ReturnType<typeof vi.fn>).mockResolvedValue(mockChunks);
      mockInvoke.mockResolvedValue({
        content:
          'Musharakah and Mudharabah are both partnership structures but differ in capital contribution. In Musharakah, all partners contribute capital, while in Mudharabah, only one party provides capital.',
      });

      const result = await agent.process(
        'What is the difference between Musharakah and Mudharabah?',
        'comparison'
      );

      expect(result.category).toBe('comparison');
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.answer.toLowerCase()).toMatch(/musharakah|mudharabah/);
      expect(result.sources).toHaveLength(3);
    });

    it('should answer: Is interest-based savings halal?', async () => {
      const mockChunks = createMockChunks(5, 0.88);
      mockChunks[0].content =
        'Interest (riba) is prohibited in Islam. Savings accounts that earn interest are not Shariah-compliant.';

      (mockChunkRepo.vectorSearch as ReturnType<typeof vi.fn>).mockResolvedValue(mockChunks);
      mockInvoke.mockResolvedValue({
        content:
          'Interest-based savings are not halal. Interest (riba) is strictly prohibited in Islam, so savings accounts that earn interest are not Shariah-compliant.',
      });

      const result = await agent.process('Is interest-based savings halal?', 'compliance');

      expect(result.category).toBe('compliance');
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.answer.toLowerCase()).toMatch(/not halal|prohibited|not shariah/);
      expect(result.sources).toHaveLength(3);
    });

    it('should answer: What is Gharar?', async () => {
      const mockChunks = createMockChunks(5, 0.9);
      mockChunks[0].content =
        'Gharar refers to uncertainty, risk, or ambiguity in a contract. It is prohibited in Islamic finance as it can lead to disputes.';

      (mockChunkRepo.vectorSearch as ReturnType<typeof vi.fn>).mockResolvedValue(mockChunks);
      mockInvoke.mockResolvedValue({
        content:
          'Gharar refers to uncertainty or ambiguity in a contract. It is prohibited in Islamic finance to prevent disputes and ensure fairness.',
      });

      const result = await agent.process('What is Gharar?', 'principles');

      expect(result.category).toBe('principles');
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.answer).toContain('Gharar');
      expect(result.sources).toHaveLength(3);
    });

    it('should answer: How does Ijarah work?', async () => {
      const mockChunks = createMockChunks(5, 0.87);
      mockChunks[0].content =
        'Ijarah is an Islamic leasing contract. The lessor retains ownership while the lessee pays rent for using the asset.';

      (mockChunkRepo.vectorSearch as ReturnType<typeof vi.fn>).mockResolvedValue(mockChunks);
      mockInvoke.mockResolvedValue({
        content:
          'Ijarah is an Islamic leasing contract where the owner leases an asset to a lessee for a specified rent and period, retaining ownership.',
      });

      const result = await agent.process('How does Ijarah work?', 'products');

      expect(result.category).toBe('products');
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.answer).toContain('Ijarah');
      expect(result.sources).toHaveLength(3);
    });

    it('should answer: What is Sukuk?', async () => {
      const mockChunks = createMockChunks(5, 0.86);
      mockChunks[0].content =
        'Sukuk are Islamic bonds that represent ownership in underlying assets rather than debt obligations.';

      (mockChunkRepo.vectorSearch as ReturnType<typeof vi.fn>).mockResolvedValue(mockChunks);
      mockInvoke.mockResolvedValue({
        content:
          'Sukuk are Islamic bonds that comply with Shariah law. Unlike conventional bonds, they represent ownership in underlying assets.',
      });

      const result = await agent.process('What is Sukuk?', 'products');

      expect(result.category).toBe('products');
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.answer).toContain('Sukuk');
      expect(result.sources).toHaveLength(3);
    });

    it('should answer: What is Takaful?', async () => {
      const mockChunks = createMockChunks(5, 0.85);
      mockChunks[0].content =
        'Takaful is Islamic insurance based on mutual cooperation and shared responsibility. Participants contribute to a fund to help each other.';

      (mockChunkRepo.vectorSearch as ReturnType<typeof vi.fn>).mockResolvedValue(mockChunks);
      mockInvoke.mockResolvedValue({
        content:
          'Takaful is Islamic insurance based on cooperation and mutual assistance. Participants pool their contributions to support each other in times of need.',
      });

      const result = await agent.process('What is Takaful?', 'products');

      expect(result.category).toBe('products');
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.answer).toContain('Takaful');
      expect(result.sources).toHaveLength(3);
    });

    it('should answer: Compare Islamic vs conventional banking', async () => {
      const mockChunks = createMockChunks(5, 0.84);
      mockChunks[0].content =
        'Islamic banking prohibits interest and follows Shariah principles. Conventional banking uses interest-based lending and borrowing.';

      (mockChunkRepo.vectorSearch as ReturnType<typeof vi.fn>).mockResolvedValue(mockChunks);
      mockInvoke.mockResolvedValue({
        content:
          'Islamic banking differs from conventional banking primarily in its prohibition of interest (riba). Islamic banks operate based on Shariah principles while conventional banks use interest-based systems.',
      });

      const result = await agent.process('Compare Islamic vs conventional banking', 'comparison');

      expect(result.category).toBe('comparison');
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.answer.toLowerCase()).toMatch(/islamic|conventional/);
      expect(result.sources).toHaveLength(3);
    });

    it('should answer: What is Maysir?', async () => {
      const mockChunks = createMockChunks(5, 0.83);
      mockChunks[0].content =
        'Maysir refers to gambling or games of chance. It is prohibited in Islam as it involves unearned wealth and speculation.';

      (mockChunkRepo.vectorSearch as ReturnType<typeof vi.fn>).mockResolvedValue(mockChunks);
      mockInvoke.mockResolvedValue({
        content:
          'Maysir is gambling or speculation, which is prohibited in Islamic finance. It involves games of chance where wealth is transferred without productive effort.',
      });

      const result = await agent.process('What is Maysir?', 'principles');

      expect(result.category).toBe('principles');
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.answer).toContain('Maysir');
      expect(result.sources).toHaveLength(3);
    });

    it('should answer: How is profit calculated in Musharakah?', async () => {
      const mockChunks = createMockChunks(5, 0.82);
      mockChunks[0].content =
        'In Musharakah, profits are shared according to a pre-agreed ratio. Losses are shared according to capital contribution.';

      (mockChunkRepo.vectorSearch as ReturnType<typeof vi.fn>).mockResolvedValue(mockChunks);
      mockInvoke.mockResolvedValue({
        content:
          'In Musharakah partnerships, profit is distributed according to a pre-agreed ratio among partners, while losses are shared proportionally to each partners capital contribution.',
      });

      const result = await agent.process('How is profit calculated in Musharakah?', 'calculation');

      expect(result.category).toBe('calculation');
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.answer.toLowerCase()).toMatch(/profit|musharakah/);
      expect(result.sources).toHaveLength(3);
    });

    it('should answer: What is Wakalah?', async () => {
      const mockChunks = createMockChunks(5, 0.81);
      mockChunks[0].content =
        'Wakalah is an agency contract where one party authorizes another to act on their behalf. The agent (wakil) performs tasks for a fee.';

      (mockChunkRepo.vectorSearch as ReturnType<typeof vi.fn>).mockResolvedValue(mockChunks);
      mockInvoke.mockResolvedValue({
        content:
          'Wakalah is an Islamic agency contract. One party (principal) authorizes another (agent/wakil) to perform specific tasks on their behalf, typically for a fee.',
      });

      const result = await agent.process('What is Wakalah?', 'products');

      expect(result.category).toBe('products');
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.answer).toContain('Wakalah');
      expect(result.sources).toHaveLength(3);
    });
  });

  describe('RAG pipeline - retrieval and re-ranking', () => {
    it('should retrieve top 5 chunks', async () => {
      const mockChunks = createMockChunks(5, 0.85);
      (mockChunkRepo.vectorSearch as ReturnType<typeof vi.fn>).mockResolvedValue(mockChunks);
      mockInvoke.mockResolvedValue({ content: 'Sample answer' });

      await agent.process('What is Riba?', 'principles');

      expect(mockChunkRepo.vectorSearch).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          limit: 5,
          threshold: 0.5,
          filters: { category: 'principles' },
        })
      );
    });

    it('should re-rank to top 3 chunks', async () => {
      const mockChunks = createMockChunks(5, 0.9);
      (mockChunkRepo.vectorSearch as ReturnType<typeof vi.fn>).mockResolvedValue(mockChunks);
      mockInvoke.mockResolvedValue({ content: 'Sample answer' });

      const result = await agent.process('What is Riba?', 'principles');

      expect(result.sources).toHaveLength(3);
      // Top 3 should have highest similarity
      expect(result.sources[0].relevance).toBeGreaterThanOrEqual(result.sources[1].relevance);
      expect(result.sources[1].relevance).toBeGreaterThanOrEqual(result.sources[2].relevance);
    });

    it('should calculate confidence as average similarity', async () => {
      const mockChunks = [
        { ...createMockChunks(1, 0.9)[0], similarity: 0.8 },
        { ...createMockChunks(1, 0.9)[0], similarity: 0.7 },
        { ...createMockChunks(1, 0.9)[0], similarity: 0.6 },
      ];
      (mockChunkRepo.vectorSearch as ReturnType<typeof vi.fn>).mockResolvedValue(mockChunks);
      mockInvoke.mockResolvedValue({ content: 'Sample answer' });

      const result = await agent.process('What is Riba?', 'principles');

      const expectedConfidence = (0.8 + 0.7 + 0.6) / 3;
      expect(result.confidence).toBeCloseTo(expectedConfidence, 2);
    });
  });

  describe('confidence threshold handling', () => {
    it('should return insufficient information when confidence < 0.5', async () => {
      const lowConfidenceChunks = createMockChunks(3, 0.4);
      (mockChunkRepo.vectorSearch as ReturnType<typeof vi.fn>).mockResolvedValue(
        lowConfidenceChunks
      );

      const result = await agent.process('Obscure question', 'general');

      expect(result.answer).toContain("don't have enough information");
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.sources).toHaveLength(3);
      expect(mockInvoke).not.toHaveBeenCalled(); // Should not call LLM
    });

    it('should generate answer when confidence >= 0.5', async () => {
      const goodChunks = createMockChunks(5, 0.75);
      (mockChunkRepo.vectorSearch as ReturnType<typeof vi.fn>).mockResolvedValue(goodChunks);
      mockInvoke.mockResolvedValue({ content: 'Detailed answer' });

      const result = await agent.process('What is Riba?', 'principles');

      expect(result.answer).not.toContain("don't have enough information");
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(mockInvoke).toHaveBeenCalled();
    });
  });

  describe('context assembly', () => {
    it('should assemble context from chunks with source labels', async () => {
      const mockChunks = createMockChunks(5, 0.85);
      (mockChunkRepo.vectorSearch as ReturnType<typeof vi.fn>).mockResolvedValue(mockChunks);
      mockInvoke.mockResolvedValue({ content: 'Answer' });

      await agent.process('Test query', 'principles');

      const callArgs = mockInvoke.mock.calls[0][0];
      expect(callArgs).toContain('[Source 1]');
      expect(callArgs).toContain('[Source 2]');
      expect(callArgs).toContain('[Source 3]');
    });
  });

  describe('streaming', () => {
    it('should stream answer tokens', async () => {
      const mockChunks = createMockChunks(5, 0.85);
      (mockChunkRepo.vectorSearch as ReturnType<typeof vi.fn>).mockResolvedValue(mockChunks);

      const tokens = ['Hello', ' world', ' from', ' Islamic', ' finance'];
      const asyncGenerator = async function* () {
        for (const token of tokens) {
          yield { content: token };
        }
      };
      mockStream.mockReturnValue(asyncGenerator());

      const streamedChunks: string[] = [];
      const result = await agent.processStreaming(
        'What is Riba?',
        'principles',
        (chunk: string) => {
          streamedChunks.push(chunk);
        }
      );

      expect(streamedChunks).toEqual(tokens);
      expect(result.answer.trim()).toBe('Hello world from Islamic finance');
    });

    it('should stream insufficient information message when low confidence', async () => {
      const lowConfidenceChunks = createMockChunks(3, 0.4);
      (mockChunkRepo.vectorSearch as ReturnType<typeof vi.fn>).mockResolvedValue(
        lowConfidenceChunks
      );

      const streamedChunks: string[] = [];
      const result = await agent.processStreaming('Obscure', 'general', (chunk: string) => {
        streamedChunks.push(chunk);
      });

      expect(streamedChunks.length).toBeGreaterThan(0);
      expect(result.answer).toContain("don't have enough information");
    });
  });

  describe('error handling and retry', () => {
    it('should retry on connection errors', async () => {
      const mockChunks = createMockChunks(5, 0.85);
      (mockChunkRepo.vectorSearch as ReturnType<typeof vi.fn>).mockResolvedValue(mockChunks);

      mockInvoke
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockResolvedValueOnce({ content: 'Success after retries' });

      const result = await agent.process('What is Riba?', 'principles');

      expect(result.answer).toBe('Success after retries');
      expect(mockInvoke).toHaveBeenCalledTimes(3);
    });

    it('should not retry on validation errors', async () => {
      await expect(agent.process('', 'principles')).rejects.toThrow();
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('should fail after max retries', async () => {
      const mockChunks = createMockChunks(5, 0.85);
      (mockChunkRepo.vectorSearch as ReturnType<typeof vi.fn>).mockResolvedValue(mockChunks);

      mockInvoke.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(agent.process('What is Riba?', 'principles')).rejects.toThrow(
        KnowledgeAgentError
      );
      expect(mockInvoke).toHaveBeenCalledTimes(3); // Default max retries
    });
  });
});
