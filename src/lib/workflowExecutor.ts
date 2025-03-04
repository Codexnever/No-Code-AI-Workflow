// src/lib/workflowExecutor.ts

import { Node, Edge } from 'reactflow';
import { toast } from 'react-toastify';
import OpenAI from 'openai';
import { databases, ID, Permission, Role } from './appwrite';

// OpenAI configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Only for client-side demo, use backend in production
});

export type EdgeCondition = 'success' | 'error' | 'always';

export interface TaskConfig {
  type: string;
  parameters: Record<string, any>;
}

export interface TaskResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    nodeId: string;
    timestamp: string;
    workflowId?: string;
  };
}

export interface TaskHandler {
  execute: (config: TaskConfig, previousResults?: Record<string, TaskResult>) => Promise<TaskResult>;
}

const taskHandlers: Record<string, TaskHandler> = {};

export function registerTaskHandler(type: string, handler: TaskHandler): void {
  taskHandlers[type] = handler;
}

export class AITaskHandler implements TaskHandler {
  async execute(config: TaskConfig, previousResults?: Record<string, TaskResult>): Promise<TaskResult> {
    try {
      const { prompt, model, maxTokens, temperature } = config.parameters;

      const enhancedPrompt = previousResults 
        ? this.enhancePromptWithContext(prompt, previousResults)
        : prompt;

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
        },
        metadata: {
          nodeId: config.type,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('AI Task execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in AI task execution',
        metadata: {
          nodeId: config.type,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  private enhancePromptWithContext(originalPrompt: string, previousResults: Record<string, TaskResult>): string {
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

function findNextNodes(nodeId: string, edges: Edge[], nodes: Node[], condition: EdgeCondition): Node[] {
  const outgoingEdges = edges.filter(edge => edge.source === nodeId);
  const validEdges = outgoingEdges.filter(edge => {
    const edgeCondition = edge.data?.condition as EdgeCondition || 'always';
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

async function executeTask(node: Node, previousResults: Record<string, TaskResult>): Promise<TaskResult> {
  const nodeType = node.type || 'aiTask';
  const taskConfig: TaskConfig = { type: nodeType, parameters: node.data?.parameters || {} };
  const handler = taskHandlers[nodeType];
  if (!handler) return { success: false, error: `No handler for task type: ${nodeType}` };
  toast.info(`Executing node: ${node.data?.label || node.id}`);
  return await handler.execute(taskConfig, previousResults);
}

export async function executeWorkflow(nodes: Node[], edges: Edge[]): Promise<Record<string, TaskResult>> {
  const results: Record<string, TaskResult> = {};
  const startNode = findStartNode(nodes, edges);
  if (!startNode) {
    toast.error('No starting node found in the workflow');
    return results;
  }
  const workflowExecutionId = ID.unique();
  const queue: { node: Node, dependencies: string[] }[] = [{ node: startNode, dependencies: [] }];
  const enqueued = new Set<string>([startNode.id]);
  const executed = new Set<string>();
  while (queue.length > 0) {
    const { node, dependencies } = queue.shift()!;
    if (!dependencies.every(depId => executed.has(depId))) {
      queue.push({ node, dependencies });
      continue;
    }
    const result = await executeTask(node, results);
    result.metadata = { ...result.metadata, workflowId: workflowExecutionId };
    await storeWorkflowResult(workflowExecutionId, node.id, result);
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
  executed.size < nodes.length
    ? toast.warning(`Only ${executed.size}/${nodes.length} nodes executed.`)
    : toast.success('Workflow executed successfully!');
  return results;
}

async function storeWorkflowResult(workflowExecutionId: string, nodeId: string, result: TaskResult) {
  try {
    await databases.createDocument("67b4eba50033539bd242", "workflow_results", ID.unique(), {
      workflowExecutionId, nodeId, result: JSON.stringify(result), timestamp: new Date().toISOString()
    }, [Permission.read(Role.any()), Permission.update(Role.any()), Permission.delete(Role.any())]);
  } catch (error) {
    console.error('Error storing workflow result:', error);
    toast.error('Failed to store workflow result');
  }
}

registerTaskHandler('aiTask', new AITaskHandler());
