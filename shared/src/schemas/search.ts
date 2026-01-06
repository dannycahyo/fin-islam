import { z } from 'zod';

// Session schemas
export const SessionResponseSchema = z.object({
  sessionId: z.string(),
  createdAt: z.string(),
});

export const QueryInputSchema = z.object({
  query: z.string().min(1),
  sessionId: z.string().optional(),
});

// Agent types
export const QueryCategorySchema = z.enum([
  'principles',
  'products',
  'compliance',
  'comparison',
  'calculation',
  'general',
]);

export const ComplianceStatusSchema = z.enum(['COMPLIANT', 'FLAGGED']);

export const RoutingResultSchema = z.object({
  category: QueryCategorySchema,
  confidence: z.number(),
  explanation: z.string(),
});

export const ComplianceResultSchema = z.object({
  status: ComplianceStatusSchema,
  confidence: z.number(),
  reasoning: z.string(),
  violations: z.array(z.string()).optional(),
  suggestions: z.array(z.string()).optional(),
});

export const CalculationSchema = z.object({
  type: z.enum(['musharakah', 'mudharabah']),
  inputs: z.record(z.number()),
  outputs: z.record(z.number()),
  steps: z.array(z.string()),
});

export const OrchestratorResultSchema = z.object({
  answer: z.string(),
  category: QueryCategorySchema,
  sources: z
    .array(
      z.object({
        documentId: z.string(),
        relevance: z.number(),
      })
    )
    .optional(),
  calculation: CalculationSchema.optional(),
  metadata: z.object({
    routingConfidence: z.number(),
    processingTime: z.number(),
    complianceStatus: ComplianceStatusSchema,
    sessionId: z.string(),
  }),
});

// SSE Event schemas
export const SSEConnectedEventSchema = z.object({
  sessionId: z.string(),
});

export const SSEErrorEventSchema = z.object({
  message: z.string(),
  code: z.string(),
  step: z.string().optional(),
  details: z
    .array(
      z.object({
        field: z.string(),
        message: z.string(),
      })
    )
    .optional(),
});

// Type exports
export type SessionResponse = z.infer<typeof SessionResponseSchema>;
export type QueryInput = z.infer<typeof QueryInputSchema>;
export type OrchestratorResult = z.infer<typeof OrchestratorResultSchema>;
export type RoutingResult = z.infer<typeof RoutingResultSchema>;
export type ComplianceResult = z.infer<typeof ComplianceResultSchema>;
export type SSEConnectedEvent = z.infer<typeof SSEConnectedEventSchema>;
export type SSEErrorEvent = z.infer<typeof SSEErrorEventSchema>;

// SSE Event types
export type SSEEvent =
  | { type: 'connected'; data: SSEConnectedEvent }
  | { type: 'status'; data: string }
  | { type: 'routing'; data: RoutingResult }
  | { type: 'content'; data: string }
  | { type: 'compliance'; data: ComplianceResult }
  | { type: 'done'; data: OrchestratorResult }
  | { type: 'error'; data: SSEErrorEvent };
