// src/components/WorkflowExecutionPanel.tsx
"use client";
import React, { useState } from 'react';
import { executeWorkflow } from '../lib/workflowExecutor';
import { useWorkflowStore } from '../store/workflowStore';
import { Play, Save, Settings, User } from 'lucide-react';
import { toast } from 'react-toastify';
import APIKeyManager from './others/APIKeyManager';

const WorkflowExecutionPanel: React.FC = () => {
  const { 
    nodes, 
    edges, 
    saveWorkflow, 
    workflowName, 
    setWorkflowName,
    setNodes,
    fetchWorkflowResults,
    apiKeys,
    user,
    logout
  } = useWorkflowStore();
  
  const [showSettings, setShowSettings] = useState(false);
  const [executing, setExecuting] = useState(false);

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
      toast.info('Starting workflow execution...');
      
      const results = await executeWorkflow(nodes, edges, { 
        openAIApiKey: apiKeys.openai, 
        userId: user?.id 
      });
      
      console.log('Workflow execution results:', results);
      
      if (Object.keys(results).length > 0) {
        const firstResultId = Object.values(results)[0]?.metadata?.executionId;
        if (firstResultId) {
          await fetchWorkflowResults(firstResultId);
        }
      }
    } catch (error) {
      console.error('Error executing workflow:', error);
      toast.error('Workflow execution failed');
    } finally {
      setExecuting(false);
    }
  };

  const handleSave = () => {
    saveWorkflow(workflowName);
    toast.success('Workflow saved successfully!');
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2">
      <div className="flex items-center justify-between max-w-[1200px] mx-auto">
        <div className="flex items-center space-x-4">
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Workflow Name"
          />
          <button
            onClick={handleSave}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm flex items-center"
          >
            <Save size={14} className="mr-1.5" />
            Save
          </button>
        </div>
        
        <div className="flex items-center space-x-3">
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