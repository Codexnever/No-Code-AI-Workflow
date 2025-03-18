// src/components/WorkflowExecutionPanel.tsx

"use client";
import React, { useState } from 'react';
import { executeWorkflow } from '../lib/workflowExecutor';
import { useWorkflowStore } from '../store/workflowStore';
import { Play, Save, Settings } from 'lucide-react';
import { toast } from 'react-toastify';
import APIKeyManager from '../components/others/APIKeyManager';

const WorkflowExecutionPanel: React.FC = () => {
  const { 
    nodes, 
    edges, 
    saveWorkflow, 
    workflowName, 
    setWorkflowName,
    setNodes,
    fetchWorkflowResults
  } = useWorkflowStore();
  
  const [showSettings, setShowSettings] = useState(false);
  const [executing, setExecuting] = useState(false);

  const handleExecute = async () => {
    if (nodes.length === 0) {
      toast.error('No nodes in workflow to execute');
      return;
    }
    
    try {
      setExecuting(true);
      toast.info('Starting workflow execution...');
      
      const results = await executeWorkflow(nodes, edges);
      console.log('Workflow execution results:', results);
      
      // Get the execution ID from the first result
      const executionId = Object.values(results)[0]?.metadata?.workflowExecutionId;
      
      if (executionId) {
        // Update nodes with execution ID for result display
        const updatedNodes = nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            lastExecutionId: executionId
          }
        }));
        
        // Update the nodes to show the results
        setNodes(updatedNodes);
        
        // Load the execution results into the store
        await fetchWorkflowResults(executionId);
      }
      
      toast.success('Workflow execution completed!');
    } catch (error) {
      console.error('Workflow execution error:', error);
      toast.error('Error executing workflow');
    } finally {
      setExecuting(false);
    }
  };

  const handleSave = () => {
    saveWorkflow(workflowName);
    toast.success('Workflow saved successfully!');
  };

  return (
    <div className="bg-white border-b border-gray-300 px-4 py-3 flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="mr-2 px-3 py-2 border border-gray-300 rounded text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Workflow Name"
          />
          <button
            onClick={handleSave}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded mr-2 flex items-center"
          >
            <Save size={16} className="mr-2" />
            Save
          </button>
        </div>
        
        <div className="flex items-center">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded mr-2"
          >
            <Settings size={16} />
          </button>
          <button
            onClick={handleExecute}
            disabled={executing || nodes.length === 0}
            className={`px-4 py-2 rounded flex items-center ${
              executing || nodes.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            <Play size={16} className="mr-2" />
            {executing ? 'Executing...' : 'Execute Workflow'}
          </button>
        </div>
      </div>
      
      {showSettings && (
        <div className="mt-4">
          <APIKeyManager />
        </div>
      )}
    </div>
  );
};

export default WorkflowExecutionPanel;