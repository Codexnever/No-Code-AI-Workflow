"use client";
import React, { useState } from "react";
import { useWorkflowStore } from "@/store/workflowStore"; // Import your store correctly
import { toast } from 'react-toastify';


const AiNode = () => {
  const { user } = useWorkflowStore();
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
//   console.log("Dragging started:", nodeType);
if (!user) return toast.error("Login First");
  event.dataTransfer.setData("application/reactflow", nodeType);
  event.dataTransfer.effectAllowed = "move";
  };

// This component creates a draggable AI Task Node
  return (
    <aside className="w-60 h-screen bg-gray-900 text-white p-4 flex flex-col">
      <h2 className="text-lg font-semibold mb-4">Nodes</h2>
      {/* Draggable AI Task Node */}
      <div
         draggable={!!user}
         onDragStart={(event) => user && onDragStart(event, "aiTask")}
         className={`p-3 rounded-md cursor-pointer shadow-md text-center mb-2 ${
           user ? "bg-red-700" : "bg-gray-600 cursor-not-allowed"
         }`}
         className="p-3 bg-red-700 rounded-md cursor-pointer shadow-md text-center mb-2"
      >
        AI Task Node
      </div>
    </aside>
  );
};

export default AiNode;
