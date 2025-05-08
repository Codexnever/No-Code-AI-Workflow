// src/lib/workflowExecutor.ts

import { Node, Edge } from 'reactflow';
import { toast } from 'react-toastify';
import OpenAI from 'openai';
import { databases, ID, Permission, Role, Query } from './appwrite';

// Constants for environment variables with fallbacks
const DATABASE_ID = process.env.DATABASE_ID || '67b4eba50033539bd242';
const WORKFLOW_EXECUTION_COLLECTION = process.env.COLLECTION_WORKFLOW_EXECUTION || '67c5eb7d001f3c955715';

// OpenAI configuration with typed configuration
interface AIModelConfig {
  apiKey?: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

const openaiModels: Record<string, AIModelConfig> = {
  'gpt-4o-mini': {
    model: 'gpt-4o-mini',
    maxTokens: 100,
    temperature: 0.7
  }
};

// Enhanced type definitions
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
    executionId: string;  // Changed from workflowExecutionId
    timestamp: string;
    taskType?: string;
  };
}

export interface TaskHandler {
  execute: (config: TaskConfig, previousResults?: Record<string, TaskResult>) => Promise<TaskResult>;
}

// Enhanced AI Task Handler
export class AITaskHandler implements TaskHandler {
  async execute(
    config: TaskConfig, 
    previousResults: Record<string, TaskResult> = {}
  ): Promise<TaskResult> {
    try {
      const { prompt, model, maxTokens, temperature } = config.parameters;
      const modelConfig = openaiModels[model] || openaiModels['gpt-4o-mini'];

      const openai = new OpenAI({
        apiKey: modelConfig.apiKey,
        dangerouslyAllowBrowser: true // Use backend in production
      });

      // Enhance prompt with context from previous nodes
      const enhancedPrompt = this.buildContextualPrompt(prompt, previousResults);

      const response = await openai.chat.completions.create({
        model: modelConfig.model,
        messages: [{ role: 'user', content: enhancedPrompt }],
        max_tokens: maxTokens || modelConfig.maxTokens,
        temperature: temperature || modelConfig.temperature
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
          nodeId: config.type,
          executionId: '', // Will be set during workflow execution
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('AI Task execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown AI task error',
        metadata: {
          nodeId: config.type,
          executionId: '', // Will be set during workflow execution
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  private buildContextualPrompt(
    originalPrompt: string, 
    previousResults: Record<string, TaskResult>
  ): string {
    const contextParts = Object.entries(previousResults)
      .filter(([_, result]) => result.success)
      .map(([nodeId, result]) => 
        `Context from node ${nodeId}: ${result.data?.text || 'No detailed context'}`
      );

    return [
      ...contextParts,
      'Current task prompt:',
      originalPrompt
    ].join('\n\n');
  }
}

// Workflow Execution Utilities
function findNextNodes(
  nodeId: string, 
  edges: Edge[], 
  nodes: Node[], 
  condition: 'success' | 'error' | 'always'
): Node[] {
  const outgoingEdges = edges.filter(edge => edge.source === nodeId);
  const validEdges = outgoingEdges.filter(edge => {
    const edgeCondition = edge.data?.condition || 'always';
    return edgeCondition === 'always' || edgeCondition === condition;
  });
  
  const nextNodeIds = validEdges.map(edge => edge.target);
  return nodes.filter(node => nextNodeIds.includes(node.id));
}

function findStartNode(nodes: Node[], edges: Edge[]): Node | null {
  const nodesWithIncomingEdges = new Set(edges.map(edge => edge.target));
  const startNodes = nodes.filter(node => !nodesWithIncomingEdges.has(node.id));
  return startNodes.length > 0 ? startNodes[0] : null;
}

// Core Workflow Execution
export async function executeWorkflow(
  nodes: Node[], 
  edges: Edge[],
  options?: { openAIApiKey?: string, userId?: string }
): Promise<Record<string, TaskResult>> {
  const executionId = ID.unique();
  const workflowId = ID.unique();
  const results: Record<string, TaskResult> = {};
  const startNode = findStartNode(nodes, edges);

  if (!startNode) {
    toast.error('No starting node found in the workflow');
    return results;
  }

  if (!options?.userId) {
    toast.error('User must be logged in to execute workflows');
    return results;
  }

  // If OpenAI API key is provided, override in openaiModels
  if (options?.openAIApiKey) {
    for (const modelKey in openaiModels) {
      openaiModels[modelKey].apiKey = options.openAIApiKey;
    }
  }

  const queue: { node: Node, dependencies: string[] }[] = [
    { node: startNode, dependencies: [] }
  ];
  const enqueued = new Set<string>([startNode.id]);
  const executed = new Set<string>();

  try {
    // Create initial workflow execution record
    await databases.createDocument(
      DATABASE_ID,
      WORKFLOW_EXECUTION_COLLECTION,
      executionId,
      {
        workflowId,
        executionId,
        userId: options.userId,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        status: 'running',
        results: JSON.stringify({}),
        summary: [],
        totalNodes: nodes.length,
        nodesExecuted: 0,
        successCount: 0,
        errorCount: 0,
        error: '',
        name: `Workflow Execution ${executionId}`
      }
    );

    while (queue.length > 0) {
      const { node, dependencies } = queue.shift()!;

      // Wait for dependencies to complete
      if (!dependencies.every(depId => executed.has(depId))) {
        queue.push({ node, dependencies });
        continue;
      }

      // Execute the task
      const result = await executeTask(node, results);
      result.metadata.executionId = executionId;

      // Store result in Appwrite
      await storeWorkflowResult(node, result, executionId, options.userId, workflowId);

      // Track results and executed nodes
      results[node.id] = result;
      executed.add(node.id);

      // Determine next nodes based on execution result
      const condition = result.success ? 'success' : 'error';
      const nextNodes = findNextNodes(node.id, edges, nodes, condition);

      // Queue next nodes
      for (const nextNode of nextNodes) {
        if (!enqueued.has(nextNode.id)) {
          queue.push({ node: nextNode, dependencies: [node.id] });
          enqueued.add(nextNode.id);
        }
      }
    }

    // Update final workflow execution status
    const successCount = Object.values(results).filter(r => r.success).length;
    const errorCount = Object.values(results).filter(r => !r.success).length;
    
    await databases.updateDocument(
      DATABASE_ID,
      WORKFLOW_EXECUTION_COLLECTION,
      executionId,
      {
        endTime: new Date().toISOString(),
        status: errorCount === 0 ? 'completed' : 'completed_with_errors',
        results: JSON.stringify(results),
        summary: Object.values(results).map(r => r.data?.text || r.error || ''),
        nodesExecuted: executed.size,
        successCount,
        errorCount,
        error: errorCount > 0 ? 'Some nodes failed to execute' : ''
      }
    );

  } catch (error) {
    console.error('Error in workflow execution:', error);
    toast.error('Workflow execution failed');
    
    try {
      // Update workflow status to failed
      await databases.updateDocument(
        DATABASE_ID,
        WORKFLOW_EXECUTION_COLLECTION,
        executionId,
        {
          endTime: new Date().toISOString(),
          status: 'failed',
          results: JSON.stringify(results),
          summary: ['Workflow execution failed'],
          nodesExecuted: executed.size,
          successCount: Object.values(results).filter(r => r.success).length,
          errorCount: Object.values(results).filter(r => !r.success).length + 1,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      );
    } catch (updateError) {
      console.error('Failed to update workflow status:', updateError);
    }
  }

  return results;
}

async function storeWorkflowResult(
  node: Node,
  result: TaskResult,
  executionId: string,
  userId: string,
  workflowId: string
) {
  try {
    const nodeResultId = ID.unique();
    await databases.createDocument(
      DATABASE_ID,
      WORKFLOW_EXECUTION_COLLECTION,
      nodeResultId,
      {
        executionId,
        workflowId,
        userId,
        nodeId: node.id,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        status: result.success ? 'success' : 'error',
        results: JSON.stringify(result),
        summary: [result.data?.text || result.error || ''],
        totalNodes: 1,
        nodesExecuted: 1,
        successCount: result.success ? 1 : 0,
        errorCount: result.success ? 0 : 1,
        error: result.error || '',
        name: `Node ${node.id} Execution`
      }
    );
  } catch (error) {
    console.error('Error storing workflow result:', error);
    throw error;
  }
}

// Retrieve Workflow Results
export async function fetchWorkflowResults(
  executionId: string  // Changed from workflowExecutionId
): Promise<Record<string, TaskResult>> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      WORKFLOW_EXECUTION_COLLECTION,
      [Query.equal("executionId", executionId)]  // Changed from workflowExecutionId
    );

    return response.documents.reduce((acc, doc) => {
      const result = JSON.parse(doc.results);  // Changed from result to results to match schema
      acc[doc.nodeId] = result;
      return acc;
    }, {} as Record<string, TaskResult>);
  } catch (error) {
    console.error('Error fetching workflow results:', error);
    toast.error('Failed to retrieve workflow results');
    return {};
  }
}

// Register AI Task Handler
const taskHandlers: Record<string, TaskHandler> = {};
export function registerTaskHandler(type: string, handler: TaskHandler): void {
  taskHandlers[type] = handler;
}

async function executeTask(
  node: Node, 
  previousResults: Record<string, TaskResult>
): Promise<TaskResult> {
  const nodeType = node.type || 'aiTask';
  const taskConfig: TaskConfig = { 
    type: nodeType, 
    nodeId: node.id,
    parameters: node.data?.parameters || {} 
  };
  
  const handler = taskHandlers[nodeType];
  if (!handler) {
    return { 
      success: false, 
      error: `No handler for task type: ${nodeType}`,
      metadata: {
        nodeId: node.id,
        executionId: '',
        timestamp: new Date().toISOString()
      }
    };
  }

  toast.info(`Executing node: ${node.data?.label || node.id}`);
  return await handler.execute(taskConfig, previousResults);
}

// Default AI Task Handler Registration
registerTaskHandler('aiTask', new AITaskHandler());