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
  Panel 
} from "reactflow";
import "reactflow/dist/style.css";
import AITaskNode from "../components/nodes/AITaskNode";
import AiNode from "./AiNode";
import { useWorkflowStore } from "../store/workflowStore";
import { Undo2, Redo2, Save } from "lucide-react";

const nodeTypes = { aiTask: AITaskNode };

const WorkflowBuilder = () => {
  // Get Zustand state 
  const { 
    nodes, 
    edges, 
    setNodes, 
    setEdges, 
    loadWorkflows, 
    user,
    undo,
    redo,
    saveWorkflow,
    workflowName
  } = useWorkflowStore();
  
  const flowWrapperRef = useRef<HTMLDivElement>(null);

  // Workflows are loaded after login the user
  useEffect(() => {
    if (user) {
      console.log("User logged in, loading workflows...");
      loadWorkflows();
    }
  }, [user, loadWorkflows]);

  // Add keyboard event listeners for undo/redo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!user) return;
      
      // Check for Ctrl+Z (Undo)
      if (event.ctrlKey && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      }
      
      // Check for Ctrl+Shift+Z or Ctrl+Y (Redo)
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

  const onConnect = useCallback((connection: Connection) => {
    setEdges(addEdge(connection, edges));
  }, [setEdges, edges]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes(applyNodeChanges(changes, nodes));
    },
    [setNodes, nodes]
  );
  
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const nodeType = event.dataTransfer.getData("application/reactflow");
    if (!nodeType) return;

    // Calculate position relative to the flow container
    const reactFlowBounds = flowWrapperRef.current?.getBoundingClientRect();
    const position = reactFlowBounds 
      ? { 
          x: event.clientX - reactFlowBounds.left - 75, // Adjust for node width
          y: event.clientY - reactFlowBounds.top - 20   // Adjust for node height
        }
      : { x: event.clientX - 200, y: event.clientY - 50 };

    const newNode: Node = {
      id: `node-${Date.now()}`, // Use timestamp for unique IDs
      type: nodeType,
      position,
      data: { label: "AI Task Node" },
      draggable: true,
    };

    console.log("New Node:", newNode);
    setNodes([...nodes, newNode]);
  };

  const handleManualSave = () => {
    saveWorkflow(workflowName);
  };

  return (
    <div className="flex w-full h-screen">
      <AiNode />
      <div
        ref={flowWrapperRef}
        className="flex-grow w-full h-screen bg-gray-200 relative"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <ReactFlow 
          nodes={Array.isArray(nodes) ? nodes : []} 
          edges={edges} 
          onNodesChange={onNodesChange} 
          onConnect={onConnect} 
          fitView 
          nodeTypes={nodeTypes}
        >
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
              title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
            >
              <Redo2 size={18} />
            </button>
            <button
              onClick={handleManualSave}
              className="p-2 bg-blue-100 hover:bg-blue-200 rounded-md text-blue-700 transition-colors"
              title="Save Workflow"
            >
              <Save size={18} />
            </button>
          </Panel>
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
};

export default WorkflowBuilder;