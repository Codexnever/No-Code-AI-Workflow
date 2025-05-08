import { TaskHandler, TaskConfig, TaskResult, registerTaskHandler, executeWorkflow } from './workflowExecutor';

interface AITaskParameters {
  prompt?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

// Implementation of AI task handler
export class AITaskHandler implements TaskHandler {
  async execute(
    config: TaskConfig,
    previousResults?: Record<string, TaskResult>
  ): Promise<TaskResult> {
    try {
      const params = config.parameters as AITaskParameters;
      
      // Extract prompt from parameters or use default
      const prompt = params.prompt || 'Default prompt';
      
      // Extract model configuration
      const model = params.model || 'gpt-4o-mini';
      const maxTokens = params.maxTokens || 100;
      const temperature = params.temperature || 0.7;
      
      console.log(`Executing AI task with model: ${model}`);
      console.log(`Prompt: ${prompt}`);
      console.log(`Parameters: maxTokens=${maxTokens}, temperature=${temperature}`);
      
      // Simulated API call
      return await simulateAIAPICall(prompt, model, maxTokens, temperature, config.nodeId);
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

// Simulate AI API call (replace with actual API call in production)
async function simulateAIAPICall(
  prompt: string,
  model: string,
  maxTokens: number,
  temperature: number,
  nodeId: string
): Promise<TaskResult> {
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing time
  
  const success = Math.random() < 0.9; // 90% success rate

  if (success) {
    return {
      success: true,
      data: {
        text: `AI response for prompt: "${prompt}" using model ${model}`,
        tokens: Math.floor(Math.random() * maxTokens),
        model: model
      },
      metadata: { 
        taskType: 'aiTask', 
        timestamp: new Date().toISOString(),
        nodeId: nodeId,
        executionId: '' // Will be set during workflow execution
      }
    };
  } else {
    return {
      success: false,
      error: 'AI service returned an error',
      metadata: { 
        taskType: 'aiTask', 
        timestamp: new Date().toISOString(),
        nodeId: nodeId,
        executionId: '' // Will be set during workflow execution
      }
    };
  }
}

// Register the AI task handler
registerTaskHandler('aiTask', new AITaskHandler());