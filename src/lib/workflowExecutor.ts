/**
 * @fileoverview Workflow Execution Engine
 * This module provides the core functionality for executing AI workflow tasks.
 * It handles task scheduling, execution, result management, and persistence.
 * 
 * Key features:
 * - Workflow execution with dependency management
 * - Task result persistence using Appwrite
 * - Support for conditional flow based on task results
 * - OpenAI integration for AI tasks
 * 
 * @module workflowExecutor
 * @requires reactflow
 * @requires openai
 * @requires appwrite
 */

import { Node, Edge } from 'reactflow';
import { toast } from 'react-toastify';
import { databases, ID, Permission, Role, Query, DATABASE_ID } from './appwrite';
import { AITaskHandler } from './aiTaskHandler';

// Constants for environment variables
if (!process.env.NEXT_PUBLIC_WORKFLOW_EXECUTION_COLLECTION_ID) {
  throw new Error('Workflow execution collection ID is not configured');
}
const WORKFLOW_EXECUTION_COLLECTION = process.env.NEXT_PUBLIC_WORKFLOW_EXECUTION_COLLECTION_ID;


/**
 * Configuration interface for AI models
 * @interface AIModelConfig
 * @property {string} [apiKey] - Optional API key for the model
 * @property {string} model - The model identifier
 * @property {number} [maxTokens] - Maximum tokens for model output
 * @property {number} [temperature] - Temperature parameter for response randomness
 */
interface AIModelConfig {
  apiKey?: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

// Task handler configuration and types
/**
 * Configuration for a task in the workflow
 * @interface TaskConfig
 * @property {string} type - The type of task (e.g., 'aiTask')
 * @property {string} nodeId - Unique identifier for the node
 * @property {Object} parameters - Task-specific parameters
 * @property {string} parameters.prompt - Input prompt for the AI model
 * @property {string} parameters.model - Selected AI model
 * @property {number} [parameters.maxTokens] - Maximum tokens for response
 * @property {number} [parameters.temperature] - Temperature for response randomness
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
 * @interface TaskResult
 * @property {boolean} success - Whether the task executed successfully
 * @property {Object} [data] - Result data for successful executions
 * @property {string} data.text - Generated text response
 * @property {number} data.tokens - Number of tokens used
 * @property {string} data.model - Model used for generation
 * @property {string} [error] - Error message if task failed
 * @property {Object} metadata - Execution metadata
 * @property {string} metadata.nodeId - ID of the executed node
 * @property {string} metadata.executionId - Unique execution identifier
 * @property {string} metadata.timestamp - Execution timestamp
 * @property {string} [metadata.taskType] - Type of task executed
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
 * @interface TaskHandler
 * @property {Function} execute - Function to execute the task
 * @param {TaskConfig} config - Configuration for the task
 * @param {Record<string, TaskResult>} [previousResults] - Results from previous tasks
 * @returns {Promise<TaskResult>} Result of task execution
 */
export interface TaskHandler {
  execute: (config: TaskConfig, previousResults?: Record<string, TaskResult>) => Promise<TaskResult>;
  options?: {
    apiKey?: string;
  };
}

// AI Task Handler implementation moved to aiTaskHandler.ts

// Workflow Execution Utilities
/**
 * Finds the next nodes to execute based on current node and execution condition
 * @function findNextNodes
 * @param {string} nodeId - ID of the current node
 * @param {Edge[]} edges - All edges in the workflow
 * @param {Node[]} nodes - All nodes in the workflow
 * @param {'success' | 'error' | 'always'} condition - Execution condition
 * @returns {Node[]} Array of nodes that should be executed next
 */
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

/**
 * Finds the starting node of the workflow (node with no incoming edges)
 * @function findStartNode
 * @param {Node[]} nodes - All nodes in the workflow
 * @param {Edge[]} edges - All edges in the workflow
 * @returns {Node | null} Starting node or null if none found
 */
function findStartNode(nodes: Node[], edges: Edge[]): Node | null {
  const nodesWithIncomingEdges = new Set(edges.map(edge => edge.target));
  const startNodes = nodes.filter(node => !nodesWithIncomingEdges.has(node.id));
  return startNodes.length > 0 ? startNodes[0] : null;
}

// Core Workflow Execution
/**
 * Executes the entire workflow, managing node execution order and dependencies
 * @async
 * @function executeWorkflow
 * @param {Node[]} nodes - All nodes in the workflow
 * @param {Edge[]} edges - All edges connecting the nodes
 * @param {Object} [options] - Execution options
 * @param {string} [options.openAIApiKey] - OpenAI API key for AI tasks
 * @param {string} [options.userId] - ID of user executing the workflow
 * @returns {Promise<Record<string, TaskResult>>} Results of all executed tasks
 * @throws {Error} If workflow execution fails
 */
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
  // If OpenAI API key is provided, update the AI task handler
  if (options?.openAIApiKey) {
    updateAITaskHandlerOptions({ apiKey: options.openAIApiKey });
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

    // Update all nodes with this execution ID
    nodes.forEach(node => {
      node.data = {
        ...node.data,
        lastExecutionId: executionId
      };
    });

    while (queue.length > 0) {
      const { node, dependencies } = queue.shift()!;

      if (!dependencies.every(depId => executed.has(depId))) {
        queue.push({ node, dependencies });
        continue;
      }

      // Execute the task
      const result = await executeTask(node, results);
      result.metadata.executionId = executionId;
      result.metadata.nodeId = node.id; 

      // Store result in Appwrite
      await storeWorkflowResult(node, result, executionId, options.userId, workflowId);

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

/**
 * Stores the result of a workflow node execution in the database
 * @async
 * @function storeWorkflowResult
 * @param {Node} node - Node whose result is being stored
 * @param {TaskResult} result - Result of the node execution
 * @param {string} executionId - Unique identifier for this execution
 * @param {string} userId - ID of user who executed the workflow
 * @param {string} workflowId - ID of the workflow being executed
 * @throws {Error} If storing the result fails
 */
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
/**
 * Retrieves the results of a workflow execution from the database
 * @async
 * @function fetchWorkflowResults
 * @param {string} executionId - ID of the workflow execution to fetch
 * @returns {Promise<Record<string, TaskResult>>} Map of node IDs to their execution results
 * @throws {Error} If fetching results fails
 */
export async function fetchWorkflowResults(
  executionId: string
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
/**
 * Registers a task handler for a specific task type
 * @function registerTaskHandler
 * @param {string} type - Type of task this handler can execute
 * @param {TaskHandler} handler - Handler implementation
 */
export function registerTaskHandler(type: string, handler: TaskHandler): void {
  taskHandlers[type] = handler;
}

/**
 * Processes a prompt template by replacing variables with previous node results
 * @function processPromptTemplate
 * @param {string} prompt - The prompt template
 * @param {Record<string, TaskResult>} previousResults - Results from previous nodes
 * @returns {string} The processed prompt with variables replaced
 */
function processPromptTemplate(prompt: string, previousResults: Record<string, TaskResult>): string {
  return prompt.replace(/\{\{(\w+)\}\}/g, (match, nodeId) => {
    if (previousResults[nodeId] && previousResults[nodeId].data) {
      return previousResults[nodeId].data?.text || '';
    }
    return match; // Keep the original template if no result found
  });
}

/**
 * Executes a single task within the workflow
 * @async
 * @function executeTask
 * @param {Node} node - Node to execute
 * @param {Record<string, TaskResult>} previousResults - Results from previous task executions
 * @returns {Promise<TaskResult>} Result of the task execution
 */
async function executeTask(
  node: Node, 
  previousResults: Record<string, TaskResult>
): Promise<TaskResult> {
  const nodeType = node.type || 'aiTask';
  
  // Process the prompt template if it exists
  let parameters = { ...node.data?.parameters };
  if (parameters.prompt) {
    parameters.prompt = processPromptTemplate(parameters.prompt, previousResults);
    
    // Add context about previous nodes
    const incomingEdges = node.data?.targetHandle ? [] : Object.entries(previousResults)
      .filter(([prevNodeId]) => 
        node.id !== prevNodeId && // Don't include self
        previousResults[prevNodeId].data?.text // Only include successful results
      );
    
    if (incomingEdges.length > 0) {
      const context = incomingEdges
        .map(([nodeId, result]) => `Previous result:\n${result.data?.text}`)
        .join('\n\n');
      
      parameters.prompt = `${context}\n\nBased on the above context:\n${parameters.prompt}`;
    }
  }
  
  const taskConfig: TaskConfig = { 
    type: nodeType, 
    nodeId: node.id,
    parameters
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
const aiTaskHandler = new AITaskHandler();

// Update the options when registering
export function updateAITaskHandlerOptions(options: { apiKey?: string }) {
  aiTaskHandler.options = options;
}

registerTaskHandler('aiTask', aiTaskHandler);