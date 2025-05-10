/**
 * @fileoverview Shared type definitions for workflow execution
 * Contains interfaces used across the workflow execution system
 */

/**
 * Configuration for a task in the workflow
 */
export interface TaskConfig {
  type: string;
  nodeId: string;
  parameters: {
    prompt: string;
    model: string;
    maxTokens?: number;
    temperature?: number;
  };
}

/**
 * Result of a task execution
 */
export interface TaskResult {
  success: boolean;
  data?: {
    text: string;
    tokens: number;
    model: string;
  };
  error?: string;
  metadata: {
    nodeId: string;
    executionId: string;
    timestamp: string;
    taskType?: string;
  };
}

/**
 * Interface for task handlers that can execute workflow tasks
 */
export interface TaskHandler {
  execute: (config: TaskConfig, previousResults?: Record<string, TaskResult>) => Promise<TaskResult>;
  options?: {
    apiKey?: string;
  };
}
