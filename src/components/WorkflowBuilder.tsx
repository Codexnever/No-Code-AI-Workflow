/**
 * @fileoverview Main Workflow Builder Component
 * This component provides the core workflow building interface using React Flow.
 * It manages the visual workflow editor, node interactions, and state management.
 * 
 * Key features:
 * - Drag and drop node creation
 * - Visual workflow editing
 * - Node and edge management
 * - Undo/redo functionality
 * - Auto-save capabilities
 * - Keyboard shortcuts
 * 
 * @module WorkflowBuilder
 * @requires ReactFlow
 * @requires workflowStore
 * @requires AITaskNode
 */

"use client";
import React, { useEffect, useCallback, useRef } from "react";
import ReactFlow, { 
  addEdge, 
  Background, 
  Controls, 
  MiniMap, 
  Connection, 
  Node,
  applyNodeChanges,
  NodeChange,
  Panel,
  EdgeTypes,
  NodeTypes
} from "reactflow";
import "reactflow/dist/style.css";
import AITaskNode from "../components/nodes/AITaskNode";
import ConditionalEdge from "../components/ConditionalEdge";
import { useWorkflowStore } from "../store/workflowStore";
import { Undo2, Redo2 } from "lucide-react";
import { DEFAULT_MODEL, AI_MODELS } from "../config/aiModels";
import WorkflowExecutionPanel from "./WorkflowExecutionPanel";

const nodeTypes: NodeTypes = { aiTask: AITaskNode };
const edgeTypes: EdgeTypes = { conditional: ConditionalEdge };

const WorkflowBuilder: React.FC = () => {
  const { 
    nodes, 
    edges, 
    setNodes, 
    setEdges, 
    loadWorkflows, 
    user,
    undo,
    redo
  } = useWorkflowStore();
  
  const flowWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadWorkflows();
    }
  }, [user, loadWorkflows]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!user) return;
      
      if (event.ctrlKey && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      }
      
      if ((event.ctrlKey && event.shiftKey && event.key === 'z') || 
          (event.ctrlKey && event.key === 'y')) {
        event.preventDefault();
        redo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo, user]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const updatedNodes = applyNodeChanges(changes, nodes);
      setNodes(updatedNodes);
    },
    [nodes, setNodes]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = addEdge(params, edges);
      setEdges(newEdge);
    },
    [edges, setEdges]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData('application/reactflow');
      if (!nodeType) return;

      const position = flowWrapperRef.current?.getBoundingClientRect();
      if (!position) return;

      const newNode: Node = {
        id: `node-${Date.now()}`,
        type: nodeType,
        position: {
          x: event.clientX - position.left - 75,
          y: event.clientY - position.top
        },
        data: { 
          label: `AI Task`, 
          parameters: { 
            prompt: "", 
            model: DEFAULT_MODEL, 
            maxTokens: AI_MODELS[DEFAULT_MODEL].maxTokens,
            temperature: AI_MODELS[DEFAULT_MODEL].defaultTemperature 
          } 
        }
      };

      setNodes([...nodes, newNode]);
    },
    [nodes, setNodes]
  );

  if (!user) return null;

  return (
    <div className="h-screen flex flex-col">
      <WorkflowExecutionPanel />
      <div 
        ref={flowWrapperRef}
        className="flex-1 bg-gray-50"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ type: 'conditional' }}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
          <Panel position="top-right" className="bg-white shadow-md rounded-md p-2 flex gap-2">
            <button
              onClick={undo}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={18} />
            </button>
            <button
              onClick={redo}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 size={18} />
            </button>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
};

export default WorkflowBuilder;