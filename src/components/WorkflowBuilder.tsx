"use client";
import React, { useEffect, useCallback } from "react";
import ReactFlow, { addEdge, Background, Controls, MiniMap, Connection, Node, applyNodeChanges } from "reactflow";
import "reactflow/dist/style.css";
import AITaskNode from "../components/nodes/AITaskNode";
import AiNode from "./AiNode";
import { useWorkflowStore } from "../store/workflowStore";

const nodeTypes = { aiTask: AITaskNode };

const WorkflowBuilder = () => {
  //  Get Zustand state 
  const { nodes, edges, setNodes, setEdges, loadWorkflows, user } = useWorkflowStore();

  //  workflows are loaded after login the user
  useEffect(() => {
    if (user) {
      console.log("User logged in, loading workflows...");
      loadWorkflows();
    }
  }, [user, loadWorkflows]);

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

    const position = { x: event.clientX - 200, y: event.clientY - 50 };
    const newNode: Node = {
      id: `node-${nodes.length + 1}`,
      type: nodeType,
      position,
      data: { label: "AI Task Node" },
      draggable: true,
    };

    console.log("New Node:", newNode);
    setNodes([...nodes, newNode]); // Zustand store updates ReactFlow now
  };

  return (
    <div className="flex w-full h-screen">
      <AiNode />
      <div
        className="flex-grow w-full h-screen bg-gray-200"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <ReactFlow  nodes={Array.isArray(nodes) ? nodes : []} edges={edges} onNodesChange={onNodesChange} onConnect={onConnect} fitView nodeTypes={nodeTypes}>
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
};
//  onNodesChange={onNodesChange} 
export default WorkflowBuilder;
