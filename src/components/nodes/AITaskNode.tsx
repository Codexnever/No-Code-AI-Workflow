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
  const [model, setModel] = useState(data.parameters?.model || "gpt-4o-mini");
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

      {/* AI Model Type Indicator */}
      <div className="mt-2 text-xs text-gray-500 flex items-center justify-center">
        <MessageSquare size={12} className="mr-1" />
        {model}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg p-3 z-10"
        >
          <h4 className="text-sm font-semibold mb-2 text-gray-700">Node Settings</h4>
          <div className="text-xs text-left">
            <p className="mb-1">
              <span className="font-medium text-black">ID:</span> {id}
            </p>
            <p className="mb-1">
              <span className="font-medium text-black">Type:</span> AI Task
            </p>
            <div className="mt-3">
              <h5 className="font-medium mb-1 text-black">Connection Points:</h5>
              <ul className="list-disc pl-5 text-black">
                <li>Top: Input connection</li>
                <li>Bottom: Output connection</li>
              </ul>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-gray-200">
            <button
              onClick={() => setShowSettings(false)}
              className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Configuration Panel */}
      {showConfig && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-md shadow-lg p-3 z-10"
        >
          <h4 className="text-sm font-semibold mb-3 text-gray-700">
            AI Task Configuration
          </h4>
          
          <div className="space-y-3">
            {/* Model Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                AI Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full text-black text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
              >
                <option value="gpt-4o-mini">gpt-4o-mini</option>
                <option value="gpt-4">GPT-4</option>
                <option value="claude-3">Claude 3</option>
                <option value="llama-2">Llama 2</option>
              </select>
            </div>
            
            {/* Prompt */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 h-20 focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
                placeholder="Enter your prompt here..."
              />
            </div>
            
            {/* Max Tokens */}
            <div>
              <label className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                <span>Max Tokens</span>
                <span className="text-gray-500">{maxTokens}</span>
              </label>
              <input
                type="range"
                min="10"
                max="4000"
                step="10"
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
                className="w-full"
              />
            </div>
            
            {/* Temperature */}
            <div>
              <label className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                <span>Temperature</span>
                <span className="text-gray-500">{temperature.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
          
          {/* Buttons */}
          <div className="mt-4 flex justify-end space-x-2">
            <button
              onClick={() => setShowConfig(false)}
              className="text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded"
            >
              Cancel
            </button>
            <button
              onClick={saveConfig}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded flex items-center"
            >
              <Save size={12} className="mr-1" />
              Save
            </button>
          </div>
        </div>
      )}

      {/* Handles for Connections */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-500" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-gray-500" />
    </div>
  );
};

export default AITaskNode;