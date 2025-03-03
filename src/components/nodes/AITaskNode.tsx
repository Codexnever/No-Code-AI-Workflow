"use client";
import React, { useState, useRef, useEffect } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { useWorkflowStore } from "../../store/workflowStore";
import { X, Settings, Sliders, MessageSquare, Save } from "lucide-react"; 

const AITaskNode = ({ data, id }: NodeProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [nodeName, setNodeName] = useState(data.label || "AI Task");
  const [showDeleteButton, setShowDeleteButton] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  
  // State for AI task parameters
  const [prompt, setPrompt] = useState(data.parameters?.prompt || "");
  const [model, setModel] = useState(data.parameters?.model || "gpt-3.5-turbo");
  const [maxTokens, setMaxTokens] = useState(data.parameters?.maxTokens || 100);
  const [temperature, setTemperature] = useState(data.parameters?.temperature || 0.7);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const setNodes = useWorkflowStore((state) => state.setNodes);
  const deleteNode = useWorkflowStore((state) => state.deleteNode);
  const nodes = useWorkflowStore((state) => state.nodes);

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
    if (e.key === "Enter") {
      finishEditing();
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNode(id as string);
  };

  const toggleSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSettings(!showSettings);
    setShowConfig(false);
  };
  
  const toggleConfig = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfig(!showConfig);
    setShowSettings(false);
  };
  
  const saveConfig = () => {
    // Update the node in the global state with new parameters
    const updatedNodes = nodes.map((node) => {
      if (node.id === id) {
        return {
          ...node,
          data: {
            ...node.data,
            parameters: {
              prompt,
              model,
              maxTokens: Number(maxTokens),
              temperature: Number(temperature)
            }
          },
        };
      }
      return node;
    });

    setNodes(updatedNodes);
    setShowConfig(false);
  };

  const finishEditing = () => {
    setIsEditing(false);

    // Update the node in the global state
    const updatedNodes = nodes.map((node) => {
      if (node.id === id) {
        return {
          ...node,
          data: {
            ...node.data,
            label: nodeName.trim() || "AI Task",
          },
        };
      }
      return node;
    });

    setNodes(updatedNodes);
  };

  return (
    <div
      className="p-4 bg-white shadow-lg border border-gray-300 rounded-xl text-center w-48 relative transition-all duration-200 hover:shadow-xl"
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setShowDeleteButton(true)}
      onMouseLeave={() => setShowDeleteButton(false)}
    >
      {/* Buttons: Delete, Settings, and Configure */}
      {showDeleteButton && (
        <>
          <button
            className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-all shadow-md"
            onClick={handleDelete}
          >
            <X size={16} />
          </button>
          <button
            className="absolute -top-3 -left-3 bg-gray-600 text-white rounded-full p-1 hover:bg-gray-700 transition-all shadow-md"
            onClick={toggleSettings}
          >
            <Settings size={16} />
          </button>
          <button
            className="absolute top-3 -left-3 bg-blue-600 text-white rounded-full p-1 hover:bg-blue-700 transition-all shadow-md"
            onClick={toggleConfig}
            title="Configure AI Task"
          >
            <Sliders size={16} />
          </button>
        </>
      )}

      {/* Node Title */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={nodeName}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full text-sm font-semibold text-center border border-blue-400 rounded px-2 py-1 focus:ring-2 focus:ring-blue-300"
          autoFocus
        />
      ) : (
        <h3 className="text-base font-semibold text-gray-800">{nodeName}</h3>
      )}

      {/* Handles for Connections */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-500" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-gray-500" />
    </div>
  );
};

export default AITaskNode;
