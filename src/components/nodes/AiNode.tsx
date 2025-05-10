"use client";
import React, { useState } from "react";
import { useWorkflowStore } from "@/store/workflowStore"; // Import your store correctly
import { toast } from "react-toastify";

const AiNode = () => {
  const { user } = useWorkflowStore();
  
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    if (!user) return toast.error("Login First");
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="w-50 h-screen bg-gray-900 text-white p-4 flex flex-col">
      <h2 className="text-lg font-semibold mb-4">Nodes</h2>
      {/* Draggable AI Task Node */}
      <div
        draggable={!!user}
        onDragStart={(event) => user && onDragStart(event, "aiTask")}
        className={`p-3 rounded-md cursor-pointer shadow-md text-center mb-2 ${
          user ? "bg-red-700" : "bg-gray-600 cursor-not-allowed"
        }`}
      >
        AI Task Node
      </div>
    </aside>
  );
};

export default AiNode;
