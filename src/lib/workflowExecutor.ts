// src/lib/workflowExecutor.ts

import { Node, Edge } from 'reactflow';
import { toast } from 'react-toastify';

// Define the possible conditions on edges
export type EdgeCondition = 'success' | 'error' | 'always';

// Define the structure of a node's task configuration
export interface TaskConfig {
  type: string;
  parameters: Record<string, any>;
  // Additional task-specific configuration
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

// Find the next nodes to execute based on the current node and condition
function findNextNodes(
  nodeId: string,
  edges: Edge[],
  nodes: Node[],
  condition: 'success' | 'error' | null
): Node[] {
  // Get all edges originating from the current node
  const outgoingEdges = edges.filter(edge => edge.source === nodeId);
  
  // Filter edges based on the condition (success, error, or always)
  const validEdges = outgoingEdges.filter(edge => {
    const edgeCondition = edge.data?.condition as EdgeCondition || 'always';
    return (
      edgeCondition === 'always' || 
      (condition === 'success' && edgeCondition === 'success') ||
      (condition === 'error' && edgeCondition === 'error')
    );
  });
  
  // Get the target nodes for the valid edges
  const nextNodeIds = validEdges.map(edge => edge.target);
  
  // Find the actual node objects
  return nodes.filter(node => nextNodeIds.includes(node.id));
}

// Get the node with no incoming edges (the starting node)
function findStartNode(nodes: Node[], edges: Edge[]): Node | null {
  const nodesWithIncomingEdges = new Set(edges.map(edge => edge.target));
  const startNodes = nodes.filter(node => !nodesWithIncomingEdges.has(node.id));
  
  if (startNodes.length === 0) {
    return null;
  }
  
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
    
    // Get the appropriate task handler
    const handler = taskHandlers[nodeType];
    if (!handler) {
      return {
        success: false,
        error: `No handler registered for task type: ${nodeType}`
      };
    }
    
    toast.info(`Executing node: ${node.data?.label || node.id}`);
    
    // Execute the task
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
  // Set of nodes already added to the queue
  const enqueued = new Set<string>([startNode.id]);
  // Set of executed nodes
  const executed = new Set<string>();
  
  while (queue.length > 0) {
    const { node, dependencies } = queue.shift()!;
    
    // Check if all dependencies have been executed
    const allDependenciesExecuted = dependencies.every(depId => executed.has(depId));
    if (!allDependenciesExecuted) {
      // Put back in the queue if dependencies aren't met
      queue.push({ node, dependencies });
      continue;
    }
    
    // Execute the node
    const result = await executeTask(node, results);
    results[node.id] = result;
    executed.add(node.id);
    
    // Determine condition for finding next nodes
    const condition = result.success ? 'success' : 'error';
    
    // Find next nodes to execute
    const nextNodes = findNextNodes(node.id, edges, nodes, condition);
    
    // Add next nodes to the queue if not already added
    for (const nextNode of nextNodes) {
      if (!enqueued.has(nextNode.id)) {
        // Add the current node as a dependency for the next node
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