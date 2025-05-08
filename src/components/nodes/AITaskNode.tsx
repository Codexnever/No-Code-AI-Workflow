"use client";
import React, { useState, useRef, useEffect } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { useWorkflowStore } from "../../store/workflowStore";
import { X, Settings, Sliders, MessageSquare, Save, ChevronDown, ChevronUp } from "lucide-react"; 

// Define proper types for the workflow result
interface NodeResultData {
  text?: string;
  model?: string;
  tokens?: number;
}

interface NodeResultMetadata {
  nodeId?: string;
  timestamp?: string;
}

interface NodeResult {
  success: boolean;
  data?: NodeResultData;
  error?: string;
  metadata?: NodeResultMetadata;
}

const AITaskNode = ({ data, id }: NodeProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [nodeName, setNodeName] = useState(data.label || "AI Task");
  const [showDeleteButton, setShowDeleteButton] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  // State for AI task parameters
  const [prompt, setPrompt] = useState(data.parameters?.prompt || "");
  const [model, setModel] = useState(data.parameters?.model || "gpt-3.5-turbo");
  const [maxTokens, setMaxTokens] = useState(data.parameters?.maxTokens || 100);
  const [temperature, setTemperature] = useState(data.parameters?.temperature || 0.7);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const setNodes = useWorkflowStore((state) => state.setNodes);
  const deleteNode = useWorkflowStore((state) => state.deleteNode);
  const nodes = useWorkflowStore((state) => state.nodes);
  
  // Get workflow results from store
  const workflowResults = useWorkflowStore((state) => state.workflowResults);
  const currentExecutionId = data.lastExecutionId || null;
  
  // Extract node result if available
  const nodeResult = currentExecutionId && workflowResults[currentExecutionId] 
    ? Object.values(workflowResults[currentExecutionId])
      .find((result: any) => result.metadata?.nodeId === id) as NodeResult | null
    : null;

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
    setShowResults(false);
  };
  
  const toggleConfig = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfig(!showConfig);
    setShowSettings(false);
    setShowResults(false);
  };
  
  const toggleResults = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowResults(!showResults);
    setShowSettings(false);
    setShowConfig(false);
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

  // Define background color based on execution status
  const getBgColor = () => {
    if (!nodeResult) return "bg-white";
    if (nodeResult.success) return "bg-white border-green-300";
    return "bg-white border-red-300";
  };

  // Get status indicator
  const getStatusIndicator = () => {
    if (!nodeResult) return null;
    if (nodeResult.success) {
      return <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-green-500 h-2 w-2 rounded-full"></div>;
    }
    return <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-red-500 h-2 w-2 rounded-full"></div>;
  };

  return (
    <div
      className={`p-4 shadow-lg border border-gray-300 rounded-xl text-center w-48 relative transition-all duration-200 hover:shadow-xl ${getBgColor()}`}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setShowDeleteButton(true)}
      onMouseLeave={() => setShowDeleteButton(false)}
    >
      {/* Buttons: Delete, Settings, Configure, Results */}
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
          {nodeResult && (
            <button
              className="absolute top-10 -left-3 bg-purple-600 text-white rounded-full p-1 hover:bg-purple-700 transition-all shadow-md"
              onClick={toggleResults}
              title="View Results"
            >
              {showResults ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
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

      {/* Execution Status Indicator */}
      {getStatusIndicator()}
      
      {/* Token Count (if successful execution) */}
      {nodeResult && nodeResult.success && nodeResult.data?.tokens && (
        <div className="mt-1 text-xs text-gray-500">
          {nodeResult.data.tokens} tokens
        </div>
      )}

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
                <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-4o-mini">GPT-4o Mini</option>
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
      
      {/* Results Panel */}
      {showResults && nodeResult && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-full left-0 mt-2 w-96 bg-white border border-gray-200 rounded-md shadow-lg p-3 z-10"
        >
          <h4 className="text-sm font-semibold mb-2 text-gray-700 flex justify-between">
            <span>Execution Results</span>
            <span className={nodeResult.success ? "text-green-600" : "text-red-600"}>
              {nodeResult.success ? "Success" : "Failed"}
            </span>
          </h4>
          
          {nodeResult.success ? (
            <div className="space-y-2">
              <div className="text-xs overflow-auto max-h-48 bg-gray-50 p-2 rounded border border-gray-200 whitespace-pre-wrap">
                {nodeResult.data?.text || "No output text"}
              </div>
              
              <div className="flex justify-between text-xs text-gray-500">
                <span>Model: {nodeResult.data?.model || "Unknown"}</span>
                <span>Tokens: {nodeResult.data?.tokens || 0}</span>
              </div>
              
              <div className="text-xs text-gray-500">
                Executed: {new Date(nodeResult.metadata?.timestamp || "").toLocaleString()}
              </div>
            </div>
          ) : (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
              {nodeResult.error || "Unknown error occurred"}
            </div>
          )}
          
          <div className="mt-3 pt-2 border-t border-gray-200">
            <button
              onClick={() => setShowResults(false)}
              className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded w-full"
            >
              Close
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