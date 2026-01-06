export const ERROR_MESSAGES: Record<string, string> = {
  // Backend error codes
  EMPTY_QUERY: 'Please enter a question',
  SESSION_NOT_FOUND: 'Session expired. Please refresh the page',
  ROUTING_FAILED: 'Failed to process your question. Please try again',
  KNOWLEDGE_FAILED: 'Failed to search knowledge base. Please try again',
  CALCULATION_FAILED: 'Failed to perform calculation. Please check your input',
  COMPLIANCE_FAILED: 'Failed to validate response. Please try again',
  UNKNOWN_ERROR: 'Something went wrong. Please try again',

  // Validation errors
  VALIDATION_ERROR: 'Invalid input. Please check your question',

  // Connection errors
  CONNECTION_ERROR: 'Connection lost. Please check your internet',
  TIMEOUT_ERROR: 'Request timed out. Please try again',

  // Fallback
  DEFAULT: 'An error occurred. Please try again',
};

export function mapErrorToMessage(code: string): string {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.DEFAULT;
}
