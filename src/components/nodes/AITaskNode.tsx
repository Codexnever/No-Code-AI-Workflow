/**
 * @fileoverview AI Task Node Component
 * This component represents an AI task node in the workflow builder.
 * It provides a rich interface for configuring and managing AI model parameters.
 * 
 * Key features:
 * - AI model selection and configuration
 * - Parameter adjustment (tokens, temperature)
 * - Real-time result preview
 * - Visual execution status
 * - Interactive configuration panels
 * 
 * @module AITaskNode
 * @requires ReactFlow
 * @requires workflowStore
 * @requires aiModels
 */

"use client";
import React, { useState, useRef, useEffect } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { useWorkflowStore } from "../../store/workflowStore";
import { X, Settings, Sliders, MessageSquare, Save, ChevronDown, ChevronUp } from "lucide-react"; 
import { AI_MODELS, DEFAULT_MODEL } from "../../config/aiModels";

/**
 * Represents the data returned from an AI task execution
 * @interface NodeResultData
 * @property {string} [text] - Generated text response
 * @property {string} [model] - AI model used
 * @property {number} [tokens] - Number of tokens used
 */
interface NodeResultData {
  text?: string;
  model?: string;
  tokens?: number;
}

/**
 * Metadata for node execution results
 * @interface NodeResultMetadata
 * @property {string} [nodeId] - ID of the executed node
 * @property {string} [timestamp] - Execution timestamp
 */
interface NodeResultMetadata {
  nodeId?: string;
  timestamp?: string;
}

/**
 * Complete result of a node execution
 * @interface NodeResult
 * @property {boolean} success - Execution success status
 * @property {NodeResultData} [data] - Result data if successful
 * @property {string} [error] - Error message if failed
 * @property {NodeResultMetadata} metadata - Execution metadata
 */
interface NodeResult {
  success: boolean;
  data?: NodeResultData;
  error?: string;
  metadata?: NodeResultMetadata;
}

/**
 * AI Task Node Component
 * Renders an interactive node for configuring and executing AI tasks
 * 
 * @component
 * @param {Object} props - Component properties
 * @param {Object} props.data - Node data including parameters and label
 * @param {string} props.id - Unique node identifier
 */
const AITaskNode = ({ data, id }: NodeProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [nodeName, setNodeName] = useState(data.label || "AI Task");
  const [showDeleteButton, setShowDeleteButton] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  // State for AI task parameters
  const [prompt, setPrompt] = useState(data.parameters?.prompt || "");
  const [model, setModel] = useState(data.parameters?.model || DEFAULT_MODEL);
  const [maxTokens, setMaxTokens] = useState(data.parameters?.maxTokens || 100);
  const [temperature, setTemperature] = useState(data.parameters?.temperature || 0.7);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const setNodes = useWorkflowStore((state) => state.setNodes);
  const deleteNode = useWorkflowStore((state) => state.deleteNode);
  const nodes = useWorkflowStore((state) => state.nodes);
  
  // Get workflow results from store
  const workflowResults = useWorkflowStore((state) => state.workflowResults);
  const currentExecutionId = data.lastExecutionId;
  
  // Extract node result if available
  const nodeResult = currentExecutionId && workflowResults[currentExecutionId] 
    ? workflowResults[currentExecutionId][id]
    : null;

  // Update state when data changes
  useEffect(() => {
    setNodeName(data.label || "AI Task");
    setPrompt(data.parameters?.prompt || "");
    setModel(data.parameters?.model || "gpt-3.5-turbo");
    setMaxTokens(data.parameters?.maxTokens || 100);
    setTemperature(data.parameters?.temperature || 0.7);
  }, [data]);

  // Automatically show results when they become available
  useEffect(() => {
    if (nodeResult && !showResults) {
      setShowResults(true);
    }
  }, [nodeResult]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  /**
   * Handles double click event to start editing node name
   * @method handleDoubleClick
   */
  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  /**
   * Handles node name input changes
   * @method handleChange
   * @param {React.ChangeEvent<HTMLInputElement>} e - Input change event
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNodeName(e.target.value);
  };

  /**
   * Handles input blur event to finish editing
   * @method handleBlur
   */
  const handleBlur = () => {
    finishEditing();
  };

  /**
   * Handles keyboard events during node name editing
   * @method handleKeyDown
   * @param {React.KeyboardEvent} e - Keyboard event
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      finishEditing();
    }
  };

  /**
   * Handles node deletion
   * @method handleDelete
   * @param {React.MouseEvent} e - Click event object
   */
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNode(id as string);
  };

  /**
   * Handles toggling the settings panel visibility
   * @method toggleSettings
   * @param {React.MouseEvent} e - Click event object
   */
  const toggleSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSettings(!showSettings);
    setShowConfig(false);
    setShowResults(false);
  };
  
  /**
   * Handles toggling the configuration panel visibility
   * @method toggleConfig
   * @param {React.MouseEvent} e - Click event object
   */
  const toggleConfig = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfig(!showConfig);
    setShowSettings(false);
    setShowResults(false);
  };
  
  /**
   * Handles toggling the results panel visibility
   * @method toggleResults
   * @param {React.MouseEvent} e - Click event object
   */
  const toggleResults = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowResults(!showResults);
    setShowSettings(false);
    setShowConfig(false);
  };
  
  /**
   * Saves the current AI task configuration
   * Updates the node data in the global workflow state
   * @method saveConfig
   */
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

  /**
   * Completes the node name editing process
   * Updates the node label in the global workflow state
   * @method finishEditing
   */
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

  /**
   * Determines the background color based on execution status
   * @method getBgColor
   * @returns {string} CSS class for background color
   */
  const getBgColor = () => {
    if (!nodeResult) return "bg-white";
    if (nodeResult.success) return "bg-white border-green-300";
    return "bg-white border-red-300";
  };

  /**
   * Generates the status indicator element based on execution result
   * @method getStatusIndicator
   * @returns {JSX.Element|null} Status indicator component or null
   */
  const getStatusIndicator = () => {
    if (!nodeResult) return null;
    if (nodeResult.success) {
      return <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-green-500 h-2 w-2 rounded-full"></div>;
    }
    return <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-red-500 h-2 w-2 rounded-full"></div>;
  };

  return (
    <div
      className={`p-4 shadow-lg border border-gray-300 rounded-xl text-center w-60 relative transition-all duration-200 hover:shadow-xl ${getBgColor()}`}
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

      {/* Node Title with black text */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={nodeName}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full text-sm font-semibold text-center border border-blue-400 rounded px-2 py-1 focus:ring-2 focus:ring-blue-300 text-black"
          autoFocus
        />
      ) : (
        <h3 className="text-base font-semibold text-gray-800">{nodeName}</h3>
      )}

      {/* AI Model Type Indicator */}
      <div className="mt-2 text-xs text-gray-600 flex items-center justify-center">
        <MessageSquare size={12} className="mr-1" />
        {model}
      </div>

      {/* Execution Status Indicator with Result Preview */}
      {getStatusIndicator()}
      {nodeResult && nodeResult.success && (
        <div className="mt-2 text-xs">
          <div className="text-gray-600 font-medium">Last Result:</div>
          <div className="text-black max-h-20 overflow-auto p-1 bg-gray-50 rounded mt-1 text-left">
            {nodeResult.data?.text?.substring(0, 100)}
            {nodeResult.data?.text && nodeResult.data.text.length > 100 ? "..." : ""}
          </div>
          <div className="mt-1 text-gray-600">
            {nodeResult.data?.tokens} tokens used
          </div>
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
            <p className="mb-1 text-black">
              <span className="font-medium text-black">ID:</span> {id}
            </p>
            <p className="mb-1 text-black">
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

      {/* Configuration Panel with black text */}
      {showConfig && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-md shadow-lg p-3 z-10"
        >
          <h4 className="text-sm font-semibold mb-3 text-gray-800">
            AI Task Configuration
          </h4>
          
          <div className="space-y-3">
            {/* Model Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                AI Model
              </label>              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full text-black text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-300"
              >
                {Object.entries(AI_MODELS).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label} - {config.description}
                  </option>
                ))}
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
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 h-20 focus:ring-2 focus:ring-blue-300 text-black"
                placeholder="Enter your prompt here..."
              />
            </div>
              {/* Max Tokens */}
            <div>
              <label className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                <span>Max Tokens</span>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="10"
                    max={AI_MODELS[model as keyof typeof AI_MODELS]?.maxTokens || 4000}
                    value={maxTokens}
                    onChange={(e) => {
                      const value = Math.min(
                        Math.max(10, Number(e.target.value)),
                        AI_MODELS[model as keyof typeof AI_MODELS]?.maxTokens || 4000
                      );
                      setMaxTokens(value);
                    }}
                    className="w-16 text-xs p-1 border rounded"
                  />
                  <span className="text-gray-600">/ {AI_MODELS[model as keyof typeof AI_MODELS]?.maxTokens || 4000}</span>
                </div>
              </label>
              <input
                type="range"
                min="10"
                max={AI_MODELS[model as keyof typeof AI_MODELS]?.maxTokens || 4000}
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
                <span className="text-gray-600">{temperature.toFixed(1)}</span>
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
              className="text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded text-gray-700"
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
          className="absolute top-full left-0 mt-2 w-[450px] bg-white border border-gray-200 rounded-md shadow-lg p-4 z-10"
        >
          {/* Header with status */}
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-semibold text-gray-800">Execution Results</h4>
            <span 
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                nodeResult.success 
                  ? "bg-green-100 text-green-700" 
                  : "bg-red-100 text-red-700"
              }`}
            >
              {nodeResult.success ? "Success" : "Failed"}
            </span>
          </div>
          
          {nodeResult.success ? (
            <div className="space-y-3">
              {/* Output Section */}
              <div className="space-y-1">
                <div className="text-xs font-medium text-gray-700">Output:</div>
                <div className="text-xs overflow-auto max-h-48 bg-gray-50 p-3 rounded border border-gray-200 whitespace-pre-wrap text-black font-mono">
                  {nodeResult.data?.text || "No output text"}
                </div>
              </div>
              
              {/* Execution Details */}
              <div className="bg-blue-50 p-3 rounded-md space-y-2">
                <div className="flex justify-between items-center text-xs text-blue-700">
                  <span className="font-medium">Model:</span>
                  <span>{nodeResult.data?.model || "Unknown"}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-blue-700">
                  <span className="font-medium">Tokens Used:</span>
                  <span>{nodeResult.data?.tokens || 0}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-blue-700">
                  <span className="font-medium">Execution Time:</span>
                  <span>{new Date(nodeResult.metadata?.timestamp || "").toLocaleString()}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                <div className="font-medium mb-1">Error Message:</div>
                {nodeResult.error || "Unknown error occurred"}
              </div>
              <div className="text-xs text-gray-600">
                Failed at: {new Date(nodeResult.metadata?.timestamp || "").toLocaleString()}
              </div>
            </div>
          )}
          
          {/* Close Button */}
          <div className="mt-4">
            <button
              onClick={() => setShowResults(false)}
              className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md w-full text-gray-700 transition-colors"
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