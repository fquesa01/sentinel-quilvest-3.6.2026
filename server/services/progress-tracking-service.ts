import { EventEmitter } from 'events';

export interface ProgressEvent {
  operationId: string;
  stage: string;
  current: number;
  total: number;
  message: string;
  percentage: number;
}

export interface ProgressOptions {
  operationId: string;
  totalStages?: number;
}

/**
 * Progress tracking service for long-running operations
 */
export class ProgressTracker extends EventEmitter {
  private operations: Map<string, ProgressEvent> = new Map();
  
  /**
   * Start tracking a new operation
   */
  startOperation(operationId: string, totalStages: number = 1): void {
    this.operations.set(operationId, {
      operationId,
      stage: 'initializing',
      current: 0,
      total: totalStages,
      message: 'Starting operation...',
      percentage: 0,
    });
  }
  
  /**
   * Update progress for an operation
   */
  updateProgress(
    operationId: string,
    current: number,
    total: number,
    message: string,
    stage?: string
  ): void {
    const operation = this.operations.get(operationId);
    if (!operation) return;
    
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    
    const update: ProgressEvent = {
      ...operation,
      current,
      total,
      message,
      percentage,
      ...(stage && { stage }),
    };
    
    this.operations.set(operationId, update);
    this.emit('progress', update);
  }
  
  /**
   * Complete an operation
   */
  completeOperation(operationId: string, message: string = 'Operation completed'): void {
    const operation = this.operations.get(operationId);
    if (!operation) return;
    
    const update: ProgressEvent = {
      ...operation,
      stage: 'completed',
      current: operation.total,
      message,
      percentage: 100,
    };
    
    this.emit('complete', update);
    this.operations.delete(operationId);
  }
  
  /**
   * Mark an operation as failed
   */
  failOperation(operationId: string, error: string): void {
    const operation = this.operations.get(operationId);
    if (!operation) return;
    
    const update: ProgressEvent = {
      ...operation,
      stage: 'failed',
      message: error,
    };
    
    this.emit('error', update);
    this.operations.delete(operationId);
  }
  
  /**
   * Get current progress for an operation
   */
  getProgress(operationId: string): ProgressEvent | undefined {
    return this.operations.get(operationId);
  }
  
  /**
   * Get all active operations
   */
  getActiveOperations(): ProgressEvent[] {
    return Array.from(this.operations.values());
  }
}

// Singleton instance
export const progressTracker = new ProgressTracker();

// Helper class for scoped progress tracking
export class ProgressScope {
  constructor(
    private tracker: ProgressTracker,
    private operationId: string,
    private totalSteps: number
  ) {
    this.tracker.startOperation(operationId, totalSteps);
  }
  
  update(current: number, message: string, stage?: string): void {
    this.tracker.updateProgress(
      this.operationId,
      current,
      this.totalSteps,
      message,
      stage
    );
  }
  
  updateStage(stage: string, message: string): void {
    const current = this.tracker.getProgress(this.operationId)?.current || 0;
    this.tracker.updateProgress(
      this.operationId,
      current,
      this.totalSteps,
      message,
      stage
    );
  }
  
  complete(message?: string): void {
    this.tracker.completeOperation(this.operationId, message);
  }
  
  fail(error: string): void {
    this.tracker.failOperation(this.operationId, error);
  }
}

// Helper function to create a progress scope
export function createProgressScope(
  operationId: string,
  totalSteps: number
): ProgressScope {
  return new ProgressScope(progressTracker, operationId, totalSteps);
}