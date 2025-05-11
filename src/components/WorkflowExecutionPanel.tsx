/**
 * @fileoverview Workflow Execution Control Panel
 * This component provides the main control interface for executing workflows.
 * It manages workflow execution state, settings display, and execution feedback.
 * 
 * Key features:
 * - Workflow execution control
 * - Settings panel toggle
 * - API key management integration
 * - Real-time execution feedback
 * - Error handling and user notifications
 * 
 * @module WorkflowExecutionPanel
 * @requires workflowExecutor
 * @requires workflowStore
 * @requires APIKeyManager
 */

"use client";
import React, { useState, useEffect } from 'react';
import { executeWorkflow } from '../lib/workflowExecutor';
import { useWorkflowStore } from '../store/workflowStore';
import { Play, Settings } from 'lucide-react';
import { toast } from 'react-toastify';
import APIKeyManager from './others/APIKeyManager';

const WorkflowExecutionPanel: React.FC = () => {
  const { 
    nodes, 
    edges, 
    setNodes,
    fetchWorkflowResults,
    apiKeys,
    user,
    workflowName,
    setWorkflowName,
    currentWorkflowId
  } = useWorkflowStore();
  
  const [showSettings, setShowSettings] = useState(false);
  const [executing, setExecuting] = useState(false);

  // Load workflow results when component mounts
  useEffect(() => {
    if (currentWorkflowId && user) {
      fetchWorkflowResults(currentWorkflowId);
    }
  }, [currentWorkflowId, user]);

  const handleExecute = async () => {
    if (nodes.length === 0) {
      toast.error('No nodes in workflow to execute');
      return;
    }

    if (!apiKeys.openai) {
      toast.error('Please set your OpenAI API key in the settings panel');
      setShowSettings(true);
      return;
    }
    
    try {
      setExecuting(true);
      
      const results = await executeWorkflow(nodes, edges, { 
        openAIApiKey: apiKeys.openai, 
        userId: user?.id 
      });
      
      // Update nodes with execution results and lastExecutionId
      const firstResultId = Object.values(results)[0]?.metadata?.executionId;
      if (firstResultId) {
        // First fetch the results
        await fetchWorkflowResults(firstResultId);
        
        // Then update the nodes with the execution ID
        const updatedNodes = nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            lastExecutionId: firstResultId
          }
        }));
        
        setNodes(updatedNodes);
        toast.success('Workflow execution completed');
      }
    } catch (error) {
      console.error('Error executing workflow:', error);
      toast.error('Workflow execution failed');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2">
      <div className="flex items-center justify-between max-w-[1200px] mx-auto">
        <div className="flex items-center space-x-4">
      <input
        type="text"
        value={workflowName}
        onChange={(e) => setWorkflowName(e.target.value)}
        placeholder="Enter workflow name..."
        className="text-lg font-semibold focus:ring-0 focus:outline-none bg-transparent text-gray-800 flex-1 border 2px gray"
      />
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 hover:bg-gray-100 rounded text-gray-600"
            title="Settings"
          >
            <Settings size={18} />
          </button>

          <button
            onClick={handleExecute}
            disabled={executing || nodes.length === 0}
            className={`px-3 py-1.5 rounded text-sm flex items-center ${
              executing || nodes.length === 0
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            <Play size={14} className="mr-1.5" />
            {executing ? 'Executing...' : 'Execute Workflow'}
          </button>
           <div className="flex items-center space-x-4 p-4 bg-white shadow-sm">
    </div>
        </div>
      </div>
      
      {showSettings && (
        <div className="mt-4 max-w-[1200px] mx-auto">
          <APIKeyManager />
        </div>
      )}
    </div>
  );
};

export default WorkflowExecutionPanel;