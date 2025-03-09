// src/components/APIKeyManager.tsx

"use client";
import React, { useState, useEffect } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { Key, Lock, Save, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';

const APIKeyManager: React.FC = () => {
  const { 
    apiKeys, 
    updateAPIKey, 
    user 
  } = useWorkflowStore();
  
  const [openaiKey, setOpenaiKey] = useState('');
  const [claudeKey, setClaudeKey] = useState('');
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [showClaudeKey, setShowClaudeKey] = useState(false);

  useEffect(() => {
    if (apiKeys) {
      setOpenaiKey(apiKeys.openai || '');
      setClaudeKey(apiKeys.claude || '');
    }
  }, [apiKeys]);

  const handleSaveKeys = () => {
    if (!user) {
      toast.error('Please log in to save API keys');
      return;
    }

    updateAPIKey('openai', openaiKey);
    updateAPIKey('claude', claudeKey);
    toast.success('API keys saved successfully');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-4 mb-4">
      <h3 className="text-lg font-semibold mb-3 flex items-center">
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
              className="w-full text-sm border border-gray-300 rounded px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
            />
            <button 
              onClick={() => setShowOpenAIKey(!showOpenAIKey)}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
            >
              {showOpenAIKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Your API keys are securely stored in your account
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Claude API Key
          </label>
          <div className="relative">
            <input
              type={showClaudeKey ? "text" : "password"}
              value={claudeKey}
              onChange={(e) => setClaudeKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full text-sm border border-gray-300 rounded px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
            />
            <button 
              onClick={() => setShowClaudeKey(!showClaudeKey)}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
            >
              {showClaudeKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
      </div>
      
      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSaveKeys}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center"
        >
          <Lock size={16} className="mr-2" />
          Save API Keys
        </button>
      </div>
    </div>
  );
};

export default APIKeyManager;