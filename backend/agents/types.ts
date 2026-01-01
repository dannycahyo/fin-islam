import { z } from 'zod';

export const QueryCategory = z.enum([
  'principles',
  'products',
  'compliance',
  'comparison',
  'calculation',
  'general',
]);

export type QueryCategory = z.infer<typeof QueryCategory>;

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface RoutingResult {
  category: QueryCategory;
  confidence: number;
  explanation: string;
}

export interface KnowledgeResult {
  answer: string;
  sources: Array<{
    documentId: string;
    content: string;
    relevance: number;
  }>;
}

export interface CalculationResult {
  result: string;
  calculation: {
    type: 'musharakah' | 'mudharabah';
    inputs: Record<string, number>;
    outputs: Record<string, number>;
    steps: string[];
  };
}

export interface ComplianceResult {
  approved: boolean;
  issues: string[];
  suggestions: string[];
}

export interface OrchestratorResponse {
  answer: string;
  category: QueryCategory;
  sources?: Array<{ documentId: string; relevance: number }>;
  metadata: {
    routingConfidence: number;
    processingTime: number;
  };
}
