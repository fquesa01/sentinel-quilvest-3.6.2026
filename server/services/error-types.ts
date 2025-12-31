/**
 * Custom error types for bulk tagging operations with recovery suggestions
 */

export enum ErrorCode {
  // Database errors
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  DATABASE_QUERY_ERROR = 'DATABASE_QUERY_ERROR',
  DATABASE_TRANSACTION_ERROR = 'DATABASE_TRANSACTION_ERROR',
  
  // Validation errors
  INVALID_TAG_ID = 'INVALID_TAG_ID',
  INVALID_DOCUMENT_IDS = 'INVALID_DOCUMENT_IDS',
  INVALID_SEARCH_SNAPSHOT = 'INVALID_SEARCH_SNAPSHOT',
  INVALID_SCOPE = 'INVALID_SCOPE',
  
  // Operation errors
  LARGE_OPERATION_REQUIRES_CONFIRMATION = 'LARGE_OPERATION_REQUIRES_CONFIRMATION',
  OPERATION_TIMEOUT = 'OPERATION_TIMEOUT',
  DUPLICATE_TAG_OPERATION = 'DUPLICATE_TAG_OPERATION',
  
  // Limit errors
  BATCH_SIZE_EXCEEDED = 'BATCH_SIZE_EXCEEDED',
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',
  
  // Duplicate detection errors
  DUPLICATE_DETECTION_FAILED = 'DUPLICATE_DETECTION_FAILED',
  SIMILARITY_CALCULATION_ERROR = 'SIMILARITY_CALCULATION_ERROR',
  
  // Authorization errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
}

export interface RecoverySuggestion {
  action: string;
  description: string;
}

export class BulkTaggingError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: any;
  public readonly suggestions: RecoverySuggestion[];
  public readonly recoverable: boolean;
  
  constructor(
    code: ErrorCode,
    message: string,
    details?: any,
    suggestions: RecoverySuggestion[] = [],
    recoverable = false
  ) {
    super(message);
    this.name = 'BulkTaggingError';
    this.code = code;
    this.details = details;
    this.suggestions = suggestions || getDefaultSuggestions(code);
    this.recoverable = recoverable;
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BulkTaggingError);
    }
  }
  
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      suggestions: this.suggestions,
      recoverable: this.recoverable,
    };
  }
}

/**
 * Get default recovery suggestions based on error code
 */
function getDefaultSuggestions(code: ErrorCode): RecoverySuggestion[] {
  const suggestions: Record<ErrorCode, RecoverySuggestion[]> = {
    [ErrorCode.DATABASE_CONNECTION_ERROR]: [
      { action: 'retry', description: 'Retry the operation in a few seconds' },
      { action: 'check_connection', description: 'Check database connection settings' },
    ],
    
    [ErrorCode.DATABASE_QUERY_ERROR]: [
      { action: 'retry', description: 'Retry the operation' },
      { action: 'reduce_batch_size', description: 'Try with fewer documents selected' },
    ],
    
    [ErrorCode.DATABASE_TRANSACTION_ERROR]: [
      { action: 'retry', description: 'Retry the operation' },
      { action: 'contact_support', description: 'Contact support if the issue persists' },
    ],
    
    [ErrorCode.INVALID_TAG_ID]: [
      { action: 'select_tag', description: 'Select a valid tag from the list' },
      { action: 'create_tag', description: 'Create a new tag if the desired one doesn\'t exist' },
    ],
    
    [ErrorCode.INVALID_DOCUMENT_IDS]: [
      { action: 'refresh', description: 'Refresh the document list and try again' },
      { action: 'select_documents', description: 'Select valid documents from the current view' },
    ],
    
    [ErrorCode.INVALID_SEARCH_SNAPSHOT]: [
      { action: 'refresh_search', description: 'Perform a new search and try again' },
      { action: 'clear_filters', description: 'Clear filters and try with broader selection' },
    ],
    
    [ErrorCode.INVALID_SCOPE]: [
      { action: 'select_scope', description: 'Choose between "Selected" or "All Results"' },
    ],
    
    [ErrorCode.LARGE_OPERATION_REQUIRES_CONFIRMATION]: [
      { action: 'review', description: 'Review the operation impact carefully' },
      { action: 'confirm', description: 'Check the confirmation box to proceed' },
      { action: 'reduce_selection', description: 'Consider selecting fewer documents' },
    ],
    
    [ErrorCode.OPERATION_TIMEOUT]: [
      { action: 'retry', description: 'Retry the operation' },
      { action: 'reduce_selection', description: 'Try with fewer documents' },
      { action: 'wait', description: 'Wait for the current operation to complete' },
    ],
    
    [ErrorCode.DUPLICATE_TAG_OPERATION]: [
      { action: 'wait', description: 'Wait for the current tagging operation to complete' },
      { action: 'refresh', description: 'Refresh the page to see updated tags' },
    ],
    
    [ErrorCode.BATCH_SIZE_EXCEEDED]: [
      { action: 'reduce_selection', description: 'Select fewer documents' },
      { action: 'use_filters', description: 'Use filters to narrow down the selection' },
    ],
    
    [ErrorCode.MEMORY_LIMIT_EXCEEDED]: [
      { action: 'reduce_selection', description: 'Select significantly fewer documents' },
      { action: 'batch_operation', description: 'Process documents in smaller batches' },
    ],
    
    [ErrorCode.DUPLICATE_DETECTION_FAILED]: [
      { action: 'retry', description: 'Retry the duplicate detection' },
      { action: 'skip', description: 'Continue without duplicate detection' },
    ],
    
    [ErrorCode.SIMILARITY_CALCULATION_ERROR]: [
      { action: 'disable_near_duplicates', description: 'Disable near-duplicate detection' },
      { action: 'use_exact_only', description: 'Use exact duplicate detection only' },
    ],
    
    [ErrorCode.UNAUTHORIZED]: [
      { action: 'login', description: 'Log in with appropriate credentials' },
      { action: 'refresh_session', description: 'Refresh your session' },
    ],
    
    [ErrorCode.INSUFFICIENT_PERMISSIONS]: [
      { action: 'contact_admin', description: 'Contact your administrator for access' },
      { action: 'request_permission', description: 'Request necessary permissions' },
    ],
  };
  
  return suggestions[code] || [];
}

/**
 * Error factory functions for common scenarios
 */
export class BulkTaggingErrorFactory {
  static databaseConnection(details?: any): BulkTaggingError {
    return new BulkTaggingError(
      ErrorCode.DATABASE_CONNECTION_ERROR,
      'Failed to connect to the database',
      details,
      undefined,
      true
    );
  }
  
  static invalidTag(tagId: string): BulkTaggingError {
    return new BulkTaggingError(
      ErrorCode.INVALID_TAG_ID,
      `Tag with ID "${tagId}" not found`,
      { tagId },
      undefined,
      false
    );
  }
  
  static largeOperationRequiresConfirmation(documentCount: number): BulkTaggingError {
    return new BulkTaggingError(
      ErrorCode.LARGE_OPERATION_REQUIRES_CONFIRMATION,
      `This operation will affect ${documentCount.toLocaleString()} documents and requires confirmation`,
      { documentCount },
      undefined,
      false
    );
  }
  
  static operationTimeout(operationId: string, elapsed: number): BulkTaggingError {
    return new BulkTaggingError(
      ErrorCode.OPERATION_TIMEOUT,
      `Operation timed out after ${elapsed}ms`,
      { operationId, elapsed },
      undefined,
      true
    );
  }
  
  static duplicateDetectionFailed(reason: string): BulkTaggingError {
    return new BulkTaggingError(
      ErrorCode.DUPLICATE_DETECTION_FAILED,
      `Duplicate detection failed: ${reason}`,
      { reason },
      undefined,
      true
    );
  }
  
  static unauthorized(): BulkTaggingError {
    return new BulkTaggingError(
      ErrorCode.UNAUTHORIZED,
      'You are not authorized to perform this operation',
      undefined,
      undefined,
      false
    );
  }
  
  static insufficientPermissions(requiredPermission: string): BulkTaggingError {
    return new BulkTaggingError(
      ErrorCode.INSUFFICIENT_PERMISSIONS,
      `Insufficient permissions. Required: ${requiredPermission}`,
      { requiredPermission },
      undefined,
      false
    );
  }
}