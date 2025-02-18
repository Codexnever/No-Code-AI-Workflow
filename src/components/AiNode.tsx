"use client";
import React from "react";
import SaveBtn from "./SaveBtn";
const AiNode = () => {
const onDragStart = (event: React.DragEvent, nodeType: string) => {
//   console.log("Dragging started:", nodeType);
  event.dataTransfer.setData("application/reactflow", nodeType);
  event.dataTransfer.effectAllowed = "move";
  };
// This component creates a draggable AI Task Node in the sidebar.
  return (
    <aside className="w-60 h-screen bg-gray-900 text-white p-4 flex flex-col">
      <h2 className="text-lg font-semibold mb-4">Nodes</h2>
      {/* Draggable AI Task Node */}
      <div
        draggable
        onDragStart={(event) => onDragStart(event, "aiTask")}
        className="p-3 bg-red-700 rounded-md cursor-pointer shadow-md text-center mb-2"
      >
        AI Task Node
      </div>
<SaveBtn/>
    </aside>
  );
};

export default AiNode;
