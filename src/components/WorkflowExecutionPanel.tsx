// src/components/WorkflowExecutionPanel.tsx

"use client";
import React, { useState } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { executeWorkflow } from '../lib/workflowExecutor';
import { Play, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface ExecutionStatus {
  status: 'idle' | 'running' | 'completed' | 'error';
  message?: string;
  results?: Record<string, any>;
  startTime?: number;
  endTime?: number;
}

const WorkflowExecutionPanel: React.FC = () => {
  const { nodes, edges, workflowName } = useWorkflowStore();
  const [execution, setExecution] = useState<ExecutionStatus>({ status: 'idle' });
  
  const handleExecute = async () => {
    if (execution.status === 'running') return;
    
    if (nodes.length === 0) {
      setExecution({ 
        status: 'error', 
        message: 'No nodes in the workflow to execute'
      });
      return;
    }
    
    setExecution({ 
      status: 'running', 
      message: 'Workflow execution started...', 
      startTime: Date.now()
    });
    
    try {
      const results = await executeWorkflow(nodes, edges);
      
      setExecution({
        status: 'completed',
        results,
        message: 'Workflow execution completed',
        startTime: execution.startTime,
        endTime: Date.now()
      });
    } catch (error) {
      setExecution({
        status: 'error',
        message: error instanceof Error ? error.message : 'Workflow execution failed',
        startTime: execution.startTime,
        endTime: Date.now()
      });
    }
  };
  
  // Calculate execution time in seconds
  const executionTime = execution.endTime && execution.startTime 
    ? ((execution.endTime - execution.startTime) / 1000).toFixed(2)
    : null;
  
  // Count successful and failed nodes in results
  const getResultsSummary = () => {
    if (!execution.results) return { success: 0, failure: 0 };
    
    const success = Object.values(execution.results).filter(r => r.success).length;
    const failure = Object.values(execution.results).filter(r => !r.success).length;
    
    return { success, failure };
  };
  
  const { success, failure } = getResultsSummary();
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Execute Workflow</h3>
        <button
          onClick={handleExecute}
          disabled={execution.status === 'running'}
          className={`px-4 py-2 rounded-md flex items-center gap-2 ${
            execution.status === 'running'
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          <Play size={16} />
          {execution.status === 'running' ? 'Running...' : 'Execute'}
        </button>
      </div>
      
      {/* Status display */}
      {execution.status !== 'idle' && (
        <div className={`p-3 rounded-md mt-2 ${
          execution.status === 'running' ? 'bg-blue-50 border border-blue-200' :
          execution.status === 'completed' ? 'bg-green-50 border border-green-200' :
          'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            {execution.status === 'running' && <Clock className="text-blue-500" size={18} />}
            {execution.status === 'completed' && <CheckCircle className="text-green-500" size={18} />}
            {execution.status === 'error' && <AlertCircle className="text-red-500" size={18} />}
            
            <span className={`font-medium ${
              execution.status === 'running' ? 'text-blue-700' :
              execution.status === 'completed' ? 'text-green-700' :
              'text-red-700'
            }`}>
              {execution.status === 'running' ? 'Executing workflow...' :
               execution.status === 'completed' ? 'Execution completed' :
               'Execution failed'}
            </span>
          </div>
          
          {execution.message && (
            <p className="text-sm text-gray-600 ml-6">{execution.message}</p>
          )}
          
          {executionTime && (
            <p className="text-sm text-gray-600 ml-6 mt-1">
              Execution time: {executionTime} seconds
            </p>
          )}
          
          {execution.status === 'completed' && (
            <div className="flex gap-3 ml-6 mt-2">
              <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                {success} successful
              </span>
              {failure > 0 && (
                <span className="text-sm bg-red-100 text-red-800 px-2 py-1 rounded">
                  {failure} failed
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkflowExecutionPanel;