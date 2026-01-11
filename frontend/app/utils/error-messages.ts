export const ERROR_MESSAGES: Record<string, string> = {
  // Backend error codes
  EMPTY_QUERY: 'Please enter a question to continue',
  SESSION_NOT_FOUND: 'Your session has expired. Please refresh the page to start a new session',
  ROUTING_FAILED: 'Unable to process your question. Try rephrasing or ask a different question',
  KNOWLEDGE_FAILED: 'Unable to search the knowledge base. Please try again in a moment',
  CALCULATION_FAILED: 'Unable to perform the calculation. Please verify your input and try again',
  COMPLIANCE_FAILED: 'Unable to validate the response. Please try asking your question differently',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please refresh and try again',

  // Validation errors
  VALIDATION_ERROR: 'Your question contains invalid characters. Please check and try again',

  // Connection errors
  CONNECTION_ERROR: 'Connection lost. Please check your internet connection and try again',
  TIMEOUT_ERROR: 'The request took too long. Please try again with a simpler question',

  // Fallback
  DEFAULT: 'Something went wrong. Please refresh the page and try again',
};

export function mapErrorToMessage(code: string): string {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.DEFAULT;
}
