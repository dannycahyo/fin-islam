import type {
  QueryCategory,
  RoutingResult,
  ComplianceResult,
  ComplianceStatus,
} from '@/agents/types';

/**
 * Stream event types for SSE communication
 */
export type StreamEvent =
  | { type: 'connected'; data: { sessionId: string } }
  | { type: 'status'; data: string }
  | { type: 'routing'; data: RoutingResult }
  | { type: 'content'; data: string }
  | { type: 'compliance'; data: ComplianceResult }
  | { type: 'done'; data: OrchestratorResult }
  | {
      type: 'error';
      data: { step?: string; message: string; code: string };
    };

/**
 * Final orchestrator result returned to client
 */
export interface OrchestratorResult {
  answer: string;
  category: QueryCategory;
  sources?: Array<{
    documentId: string;
    relevance: number;
  }>;
  calculation?: {
    type: 'musharakah' | 'mudharabah';
    inputs: Record<string, number>;
    outputs: Record<string, number>;
    steps: string[];
  };
  metadata: {
    routingConfidence: number;
    processingTime: number;
    complianceStatus: ComplianceStatus;
    sessionId: string;
  };
}
