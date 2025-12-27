import { z } from 'zod';

// Query categories
export const QueryCategory = z.enum([
  'principles',
  'products',
  'compliance',
  'comparison',
  'calculation',
  'general',
]);

export type QueryCategory = z.infer<typeof QueryCategory>;

// Agent message types
export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Routing Agent response
export interface RoutingResult {
  category: QueryCategory;
  confidence: number;
  explanation: string;
}

// Knowledge Agent response
export interface KnowledgeResult {
  answer: string;
  sources: Array<{
    documentId: string;
    content: string;
    relevance: number;
  }>;
}

// Calculation Agent response
export interface CalculationResult {
  result: string;
  calculation: {
    type: 'musharakah' | 'mudharabah';
    inputs: Record<string, number>;
    outputs: Record<string, number>;
    steps: string[];
  };
}

// Compliance Agent response
export interface ComplianceResult {
  approved: boolean;
  issues: string[];
  suggestions: string[];
}

// Orchestrator response
export interface OrchestratorResponse {
  answer: string;
  category: QueryCategory;
  sources?: Array<{ documentId: string; relevance: number }>;
  metadata: {
    routingConfidence: number;
    processingTime: number;
  };
}
