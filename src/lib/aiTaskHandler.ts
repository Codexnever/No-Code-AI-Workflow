/**
 * @fileoverview AI Task Handler Implementation
 * This module provides the implementation for handling AI-based tasks in the workflow.
 * It manages AI model selection, parameter validation, and result generation.
 * 
 * Key features:
 * - AI model configuration and validation
 * - Parameter management (tokens, temperature)
 * - Response simulation for development
 * - Error handling and result formatting
 */

import OpenAI from 'openai';
import { TaskHandler, TaskConfig, TaskResult } from './types';

const DEFAULT_MODEL = 'gpt-4o-mini';

/**
 * Implementation of the AI Task Handler
 * Manages the execution of AI-based tasks in the workflow using OpenAI's API
 * 
 * @class AITaskHandler
 * @implements {TaskHandler}
 */
export class AITaskHandler implements TaskHandler {
  options?: { apiKey?: string };

  /**
   * Executes an AI task with the given configuration
   * @async
   * @method execute
   * @param {TaskConfig} config - Task configuration including parameters
   * @param {Record<string, TaskResult>} [previousResults] - Results from previous tasks
   * @returns {Promise<TaskResult>} Result of the AI task execution
   * @throws {Error} When model validation fails or API key is missing
   */
  async execute(
    config: TaskConfig,
    previousResults?: Record<string, TaskResult>
  ): Promise<TaskResult> {
    if (!this.options?.apiKey) {
      return {
        success: false,
        error: 'OpenAI API key is not configured',
        metadata: {
          nodeId: config.nodeId,
          executionId: '',
          timestamp: new Date().toISOString(),
          taskType: 'aiTask'
        }
      };
    }

    try {
      const { prompt = '', model, maxTokens, temperature } = config.parameters;
      
      const openai = new OpenAI({
        apiKey: this.options.apiKey,
        dangerouslyAllowBrowser: true
      });
      
      // console.log(`Executing AI task with model: ${model}`);
      
      const response = await openai.chat.completions.create({
        model: model || DEFAULT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens || parseInt(process.env.MAX_TOKENS || '4000'),
        temperature: temperature || parseFloat(process.env.DEFAULT_TEMPERATURE || '0.7')
      });      
      
      const aiResponse = response.choices[0].message.content || '';

      return {
        success: true,
        data: {
          text: aiResponse,
          tokens: response.usage?.total_tokens || 0,
          model: model
        },
        metadata: {
          nodeId: config.nodeId,
          executionId: '',
          timestamp: new Date().toISOString(),
          taskType: 'aiTask'
        }
      };
    } catch (error) {
      console.error('AI Task execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in AI task execution',
        metadata: { 
          taskType: 'aiTask', 
          timestamp: new Date().toISOString(),
          nodeId: config.nodeId,
          executionId: '' // Will be set during workflow execution
        }
      };
    }
  }
}

// Export a singleton instance
export const aiTaskHandler = new AITaskHandler();

export function updateAITaskHandlerOptions(options: { apiKey?: string }) {
  aiTaskHandler.options = options;
}