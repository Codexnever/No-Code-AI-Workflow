// src/lib/workflowExecutor.ts

import { Node, Edge } from 'reactflow';
import { toast } from 'react-toastify';
import OpenAI from 'openai';

// OpenAI configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Only for client-side demo, use backend in production
});

// Define the possible conditions on edges
export type EdgeCondition = 'success' | 'error' | 'always';

// Define the structure of a node's task configuration
export interface TaskConfig {
  type: string;
  parameters: {
    prompt: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
}

// Define the structure of a task execution result
export interface TaskResult {
  success: boolean;
  data?: any;
  error?: string;
}

// Define the interface for task handlers
export interface TaskHandler {
  execute: (config: TaskConfig, previousResults?: Record<string, TaskResult>) => Promise<TaskResult>;
}

// Registry of available task handlers
const taskHandlers: Record<string, TaskHandler> = {};

// Register a task handler
export function registerTaskHandler(type: string, handler: TaskHandler): void {
  taskHandlers[type] = handler;
}

// AI Task Handler with OpenAI integration
export class AITaskHandler implements TaskHandler {
  async execute(
    config: TaskConfig,
    previousResults?: Record<string, TaskResult>
  ): Promise<TaskResult> {
    try {
      const { prompt, model, maxTokens, temperature } = config.parameters;

      // Enhance prompt with context from previous results if available
      const enhancedPrompt = previousResults 
        ? this.enhancePromptWithContext(prompt, previousResults)
        : prompt;

      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: model || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: enhancedPrompt }],
        max_tokens: maxTokens,
        temperature: temperature
      });

      const aiResponse = response.choices[0].message.content || '';

      return {
        success: true,
        data: {
          text: aiResponse,
          tokens: response.usage?.total_tokens || 0,
          model: model
        }
      };
    } catch (error) {
      console.error('AI Task execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in AI task execution'
      };
    }
  }

  // Helper method to enhance prompt with context from previous nodes
  private enhancePromptWithContext(
    originalPrompt: string, 
    previousResults: Record<string, TaskResult>
  ): string {
    const contextParts = Object.entries(previousResults)
      .filter(([_, result]) => result.success)
      .map(([nodeId, result]) => 
        `Previous node (${nodeId}) result: ${result.data?.text || JSON.stringify(result.data)}`
      );

    return [
      ...contextParts,
      'Original prompt:',
      originalPrompt
    ].join('\n\n');
  }
}

// Find the next nodes to execute based on the current node and condition
function findNextNodes(
  nodeId: string,
  edges: Edge[],
  nodes: Node[],
  condition: 'success' | 'error' | null
): Node[] {
  const outgoingEdges = edges.filter(edge => edge.source === nodeId);
  
  const validEdges = outgoingEdges.filter(edge => {
    const edgeCondition = edge.data?.condition as EdgeCondition || 'always';
    return (
      edgeCondition === 'always' || 
      (condition === 'success' && edgeCondition === 'success') ||
      (condition === 'error' && edgeCondition === 'error')
    );
  });
  
  const nextNodeIds = validEdges.map(edge => edge.target);
  return nodes.filter(node => nextNodeIds.includes(node.id));
}

// Find the starting node (no incoming edges)
function findStartNode(nodes: Node[], edges: Edge[]): Node | null {
  const nodesWithIncomingEdges = new Set(edges.map(edge => edge.target));
  const startNodes = nodes.filter(node => !nodesWithIncomingEdges.has(node.id));
  
  if (startNodes.length === 0) return null;
  if (startNodes.length > 1) {
    console.warn('Multiple start nodes found, using the first one');
  }
  
  return startNodes[0];
}

// Execute a single task
async function executeTask(
  node: Node,
  previousResults: Record<string, TaskResult>
): Promise<TaskResult> {
  try {
    const nodeType = node.type || 'aiTask';
    const taskConfig: TaskConfig = {
      type: nodeType,
      parameters: node.data?.parameters || {},
    };
    
    const handler = taskHandlers[nodeType];
    if (!handler) {
      return {
        success: false,
        error: `No handler registered for task type: ${nodeType}`
      };
    }
    
    toast.info(`Executing node: ${node.data?.label || node.id}`);
    
    return await handler.execute(taskConfig, previousResults);
  } catch (error) {
    console.error(`Error executing node ${node.id}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Execute the entire workflow
export async function executeWorkflow(
  nodes: Node[],
  edges: Edge[]
): Promise<Record<string, TaskResult>> {
  const results: Record<string, TaskResult> = {};
  const startNode = findStartNode(nodes, edges);
  
  if (!startNode) {
    toast.error('No starting node found in the workflow');
    return results;
  }
  
  // Queue for nodes to be executed (BFS approach)
  const queue: { node: Node, dependencies: string[] }[] = [{ node: startNode, dependencies: [] }];
  const enqueued = new Set<string>([startNode.id]);
  const executed = new Set<string>();
  
  while (queue.length > 0) {
    const { node, dependencies } = queue.shift()!;
    
    const allDependenciesExecuted = dependencies.every(depId => executed.has(depId));
    if (!allDependenciesExecuted) {
      queue.push({ node, dependencies });
      continue;
    }
    
    const result = await executeTask(node, results);
    results[node.id] = result;
    executed.add(node.id);
    
    const condition = result.success ? 'success' : 'error';
    const nextNodes = findNextNodes(node.id, edges, nodes, condition);
    
    for (const nextNode of nextNodes) {
      if (!enqueued.has(nextNode.id)) {
        queue.push({ node: nextNode, dependencies: [node.id] });
        enqueued.add(nextNode.id);
      }
    }
  }
  
  const executedCount = executed.size;
  const totalNodes = nodes.length;
  
  if (executedCount < totalNodes) {
    toast.warning(`Workflow completed but only ${executedCount}/${totalNodes} nodes were executed. Some nodes may be unreachable.`);
  } else {
    toast.success('Workflow executed successfully!');
  }
  
  return results;
}

// Register the AI task handler
registerTaskHandler('aiTask', new AITaskHandler());