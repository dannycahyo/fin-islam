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

export interface KnowledgeInput {
  query: string;
  context: string;
}

export interface KnowledgeResult {
  answer: string;
  sources: Array<{
    documentId: string;
    content: string;
    relevance: number;
  }>;
  confidence: number;
  category: QueryCategory;
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

export type CalculationType = {
  type: 'musharakah' | 'mudharabah';
  inputs: Record<string, number>;
  outputs: Record<string, number>;
  steps: string[];
};

export const ComplianceStatus = z.enum(['COMPLIANT', 'FLAGGED']);
export type ComplianceStatus = z.infer<typeof ComplianceStatus>;

export interface ComplianceResult {
  status: ComplianceStatus;
  confidence: number;
  reasoning: string;
  violations?: string[];
  suggestions?: string[];
}

export interface ComplianceAgentConfig {
  baseUrl?: string;
  model?: string;
  maxRetries?: number;
  temperature?: number;
  confidenceThreshold?: number;
}
