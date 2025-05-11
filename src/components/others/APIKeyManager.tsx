/**
 * @fileoverview API Key Management Component
 * This component provides a user interface for managing API keys used in the workflow.
 * It handles secure storage and display of API keys with features like show/hide functionality.
 * 
 * Key features:
 * - Secure API key input with show/hide toggle
 * - Persistence of API keys in user account
 * - Real-time validation and error handling
 * - User-friendly notifications
 * 
 * @module APIKeyManager
 * @requires workflowStore
 * @requires react-toastify
 * @requires lucide-react
 */

"use client";
import React, { useState, useEffect } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { Key, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';

const APIKeyManager: React.FC = () => {  const { 
    apiKeys, 
    updateAPIKey, 
    user,
    workflowName,
    setWorkflowName
  } = useWorkflowStore();
  const [openaiKey, setOpenaiKey] = useState('');
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);

  useEffect(() => {
    if (apiKeys) {
      setOpenaiKey(apiKeys.openai || '');
    }
  }, [apiKeys]);

  const handleSaveKeys = () => {
    if (!user) {
      toast.error('Please log in to save API keys');
      return;
    }

    updateAPIKey('openai', openaiKey);
    toast.success('API keys saved successfully');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-4 mb-4">
      <h3 className="text-lg font-semibold mb-3 flex items-center text-gray-800">
        <Key size={18} className="mr-2" />
        API Key Management
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            OpenAI API Key
          </label>
          <div className="relative">
            <input
              type={showOpenAIKey ? "text" : "password"}
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full text-sm border border-gray-300 rounded px-3 py-2 pr-10 text-black focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
            />
            <button 
              onClick={() => setShowOpenAIKey(!showOpenAIKey)}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
            >
              {showOpenAIKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Your API keys are securely stored in your account
          </p>
        </div>
          <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Workflow Name
          </label>
          <div className="relative">
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              placeholder="Enter workflow name..."
              className="w-full text-sm border border-gray-300 rounded px-3 py-2 text-black focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
            />
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Give your workflow a meaningful name
          </p>
        </div>
      </div>
      
      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSaveKeys}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center text-sm"
        >
          <Lock size={16} className="mr-2" />
          Save API Keys
        </button>
      </div>
    </div>
  );
};

export default APIKeyManager;