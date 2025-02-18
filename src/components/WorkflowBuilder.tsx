"use client";
import React, { useCallback, useEffect } from "react";
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState,
  Connection,
  Node,
} from "reactflow";
import "reactflow/dist/style.css";
import AITaskNode from "../components/nodes/AITaskNode";
import AiNode from "./AiNode";

const nodeTypes = {
  aiTask: AITaskNode,
};

const WorkflowBuilder = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([
    {
      id: "1",
      type: "aiTask",
      position: { x: 250, y: 150 },
      data: { label: "AI Task Node" },
    },
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
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
    };

    setNodes((nds) => [...nds, newNode]);
  };

  useEffect(() => {
    console.log("React Flow Mounted");
  }, []);

  return (
    <div className="flex w-full h-screen">
      <AiNode />
      <div
        className="flex-grow w-full h-screen bg-gray-200"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          nodeTypes={nodeTypes}
        >
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
};

export default WorkflowBuilder;
