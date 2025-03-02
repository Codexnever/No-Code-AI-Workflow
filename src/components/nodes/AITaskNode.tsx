"use client";
import React, { useState, useRef, useEffect } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { useWorkflowStore } from "../../store/workflowStore";
import { X } from "lucide-react"; // Using Lucide icons

const AITaskNode = ({ data, id }: NodeProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [nodeName, setNodeName] = useState(data.label || "AI Task");
  const [showDeleteButton, setShowDeleteButton] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const setNodes = useWorkflowStore(state => state.setNodes);
  const deleteNode = useWorkflowStore(state => state.deleteNode);
  const nodes = useWorkflowStore(state => state.nodes);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNodeName(e.target.value);
  };

  const handleBlur = () => {
    finishEditing();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      finishEditing();
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNode(id as string);
  };

  const finishEditing = () => {
    setIsEditing(false);
    
    // Update the node in the global state
    const updatedNodes = nodes.map(node => {
      if (node.id === id) {
        return {
          ...node,
          data: {
            ...node.data,
            label: nodeName.trim() || "AI Task"
          }
        };
      }
      return node;
    });
    
    setNodes(updatedNodes);
  };

  return (
    <div 
      className="p-4 bg-white shadow-md border rounded-lg text-center w-40 relative"
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setShowDeleteButton(true)}
      onMouseLeave={() => setShowDeleteButton(false)}
    >
      {showDeleteButton && (
        <button
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
          onClick={handleDelete}
        >
          <X size={14} />
        </button>
      )}
      
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={nodeName}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full text-sm font-semibold text-center border border-blue-300 rounded px-1"
          autoFocus
        />
      ) : (
        <h3 className="text-sm font-semibold">{nodeName}</h3>
      )}
      <div className="mt-2 text-xs text-gray-500">Double-click to rename</div>
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-blue-500" />
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-blue-500" />
    </div>
  );
};

export default AITaskNode;