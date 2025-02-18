"use client";
import React from "react";
import { Handle, Position, NodeProps } from "reactflow";

const AITaskNode = ({ data }: NodeProps) => {
  return (
    // This comp. define the appearance and structure of the AI Task Node when dropped onto the canvas.
    <div className="p-4 bg-white shadow-md border rounded-lg text-center w-40">
      <h3 className="text-sm font-semibold">{data.label || "AI Task"}</h3>
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-blue-500" />
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-blue-500" />
    </div>
  );
};

export default AITaskNode;