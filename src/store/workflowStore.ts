/**
 * @fileoverview Workflow State Management Store
 * This module provides centralized state management for the workflow builder application.
 * It handles workflow data, user authentication, API keys, and execution results.
 * 
 * Key features:
 * - Workflow state management (nodes, edges)
 * - User authentication
 * - API key management
 * - Workflow execution history
 * - Undo/redo functionality
 * - Auto-save capabilities
 * 
 * @module workflowStore
 * @requires zustand
 * @requires appwrite
 */

import { create } from "zustand";
import { client, databases, Role, Permission, Account, ID, Query, DATABASE_ID,account } from "../lib/appwrite";
import { debounce } from "lodash";
import { toast } from 'react-toastify';
import { Node, Edge } from 'reactflow';

// Constants for environment variables
if (!process.env.NEXT_PUBLIC_MAIN_WORKFLOW_COLLECTION_ID || 
    !process.env.NEXT_PUBLIC_API_KEYS_COLLECTION_ID || 
    !process.env.NEXT_PUBLIC_WORKFLOW_EXECUTION_COLLECTION_ID) {
  throw new Error('Collection environment variables are not properly configured');
}

const MAIN_WORKFLOW_COLLECTION = process.env.NEXT_PUBLIC_MAIN_WORKFLOW_COLLECTION_ID;
const API_KEYS_COLLECTION = process.env.NEXT_PUBLIC_API_KEYS_COLLECTION_ID;
const WORKFLOW_EXECUTION_COLLECTION = process.env.NEXT_PUBLIC_WORKFLOW_EXECUTION_COLLECTION_ID;

/**
 * Debounced save function to prevent excessive database writes
 * @function debouncedSave
 */
const debouncedSave = debounce(() => {
  const { currentWorkflowId, workflowName } = useWorkflowStore.getState();
  useWorkflowStore.getState().saveWorkflow(workflowName);
}, 2000);

/**
 * Interface defining the workflow state and available actions
 * @interface WorkflowState
 * @property {Object|null} user - Current authenticated user
 * @property {Node[]} nodes - Workflow nodes
 * @property {Edge[]} edges - Workflow edges
 * @property {string|null} currentWorkflowId - ID of current workflow
 * @property {string} workflowName - Name of current workflow
 * @property {Array} history - History stack for undo/redo
 * @property {number} historyIndex - Current position in history stack
 * @property {Object} workflowResults - Execution results by ID
 * @property {Object} apiKeys - API keys for different services
 */
interface WorkflowState {
  user: any | null;
  nodes: Node<any>[];
  edges: Edge<any>[];
  currentWorkflowId: string | null;
  workflowName: string;
  history: { nodes: Node<any>[], edges: Edge<any>[] }[];
  historyIndex: number;
  workflowResults: Record<string, any>;
  loadAPIKeys: () => Promise<void>;
  apiKeys: {
    openai: string | null;
  };
  setNodes: (nodes: Node<any>[] | ((prev: Node<any>[]) => Node<any>[])) => void;
  setEdges: (edges: Edge<any>[] | ((prev: Edge<any>[]) => Edge<any>[])) => void;
  deleteNode: (nodeId: string) => void;
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
  updateEdge: (edgeId: string, newData: any) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  saveWorkflow: (name: string) => Promise<void>;
  loadWorkflows: () => Promise<void>;
  fetchWorkflowResults: (executionId: string) => Promise<void>;
  updateAPIKey: (provider: string, key: string) => Promise<void>;
  setWorkflowName: (name: string) => void;
  checkSession: () => Promise<boolean>;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  user: null,
  nodes: [],
  edges: [],
  currentWorkflowId: null,
  workflowName: "My Workflow",
  history: [],
  historyIndex: -1,
  workflowResults: {},
  apiKeys: {
    openai: null
    },

  /**
   * Updates the workflow name
   * @method setWorkflowName
   * @param {string} name - New workflow name
   */
  setWorkflowName: (name) => {
    set({ workflowName: name });
  },

  /**
   * Saves current state to history stack for undo/redo
   * Creates a deep copy of nodes and edges
   * @method saveToHistory
   */
  saveToHistory: () => {
    const { nodes, edges, history, historyIndex } = get();
    const currentState = { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(currentState);
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  /**
   * Fetches execution results for a specific workflow run
   * @method fetchWorkflowResults
   * @async
   * @param {string} executionId - ID of the workflow execution
   */  fetchWorkflowResults: async (executionId: string) => {
    const { user } = get();
    if (!user || !user.id) return;
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        WORKFLOW_EXECUTION_COLLECTION,
        [
          Query.equal("executionId", executionId),
          Query.equal("userId", user.id)
        ]
      );

      if (response.documents.length > 0) {
        const results = response.documents.reduce((acc, doc) => {
          if (doc.results) {
            try {
              const resultData = JSON.parse(doc.results);
              if (doc.nodeId && resultData) {
                acc[doc.nodeId] = resultData;
              }
            } catch (e) {
              console.error('Error parsing results:', e);
            }
          }
          return acc;
        }, {} as Record<string, any>);

        set((state) => ({
          workflowResults: {
            ...state.workflowResults,
            [executionId]: results,
          },
        }));
      }
    } catch (error) {
      console.error("Error fetching workflow results:", error);
      toast.error("Failed to load workflow results");
    }
  },
  
  /**
   * Updates workflow nodes
   * @method setNodes
   * @param {Node[]|Function} newNodes - New nodes array or update function
   */
  setNodes: (newNodes) => {
    if (typeof newNodes === 'function') {
      set((state) => ({ nodes: newNodes(state.nodes) }));
    } else {
      set({ nodes: newNodes });
    }
    debouncedSave();
  },

  /**
   * Updates workflow edges
   * @method setEdges
   * @param {Edge[]|Function} newEdges - New edges array or update function
   */
  setEdges: (newEdges) => {
    if (typeof newEdges === 'function') {
      set((state) => ({ edges: newEdges(state.edges) }));
    } else {
      set({ edges: newEdges });
    }
    debouncedSave();
  },

  /**
   * Updates data for a specific edge
   * @method updateEdge
   * @param {string} edgeId - ID of the edge to update
   * @param {any} newData - New edge data
   */
  updateEdge: (edgeId, newData) => {
    const { edges } = get();
    get().saveToHistory();
    const updatedEdges = edges.map(edge => edge.id === edgeId ? { ...edge, data: { ...edge.data, ...newData } } : edge);
    set({ edges: updatedEdges });
    debouncedSave();
  },

  /**
   * Deletes a node and its connected edges
   * @method deleteNode
   * @param {string} nodeId - ID of the node to delete
   */
  deleteNode: (nodeId) => {
    const { nodes, edges } = get();
    get().saveToHistory();
    set({
      nodes: nodes.filter(node => node.id !== nodeId),
      edges: edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId)
    });
    debouncedSave();
  },

  /**
   * Undoes the last action using history stack
   * @method undo
   */
  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      set({ ...history[newIndex], historyIndex: newIndex });
      debouncedSave();
    }
  },

  /**
   * Redoes the last undone action using history stack
   * @method redo
   */
  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      set({ ...history[newIndex], historyIndex: newIndex });
      debouncedSave();
    }
  },

  /**
   * Checks for an existing user session
   * @method checkSession
   * @async
   * @returns {Promise<boolean>} Whether a valid session exists
   */  checkSession: async () => {
    try {
      const user = await account.get();
      if (user) {
        set({ user: { id: user.$id, email: user.email } });
        await get().loadWorkflows();
        await get().loadAPIKeys();
        
        // Only fetch workflow results if we have a loaded workflow
        const state = get();
        if (state.currentWorkflowId) {
          await get().fetchWorkflowResults(state.currentWorkflowId);
        }
        return true;
      }
    } catch (error) {
      console.error("Session check error:", error);}
    return false;
  },

  /**
   * Authenticates user with email and password
   * @method login
   * @async
   * @param {string} email - User's email
   * @param {string} password - User's password
   */  login: async (email, password) => {
    try {      await account.createEmailPasswordSession(email, password);
      const user = await account.get();
      set({ user: { id: user.$id, email: user.email }, history: [], historyIndex: -1 });
      await get().loadWorkflows();
      await get().loadAPIKeys();
      
      // Load workflow results if we have a workflow loaded
      const { currentWorkflowId } = get();
      if (currentWorkflowId) {
        await get().fetchWorkflowResults(currentWorkflowId);
      }
      toast.success("Successfully logged in!");
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Login failed. Please check your credentials.");
    }
  },

  /**
   * Registers a new user
   * @method register
   * @async
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @param {string} [name] - User's name (optional)
   */ 
   register: async (email: string, password: string, name?: string) => {
  try {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      toast.error("Invalid email format");
    }

    if (!password || password.length < 6) {
    toast.error("Password must be at least 6 characters");
    }

    try {
      await account.deleteSession('current');
    } catch (error) {
      console.error("Session Deleting error:", error);
    }

    const userId = ID.unique();
    await account.create(
      userId,
      email,
      password,
      name || email.split('@')[0]
    );

    await account.createEmailPasswordSession(email, password);
    const user = await account.get();

    set({ 
      user: { 
        id: user.$id, 
        email: user.email 
      },
      history: [],
      historyIndex: -1
    });

    await get().loadWorkflows();
    await get().loadAPIKeys();

    toast.success("Registration successful!");
  } catch (error: any) {
    console.error("Registration error:", error);

    if (error?.code === 409) {
      toast.error("Email already registered");
    } else {
      throw new Error(error?.message || "Registration failed");
    }
  }
}


  /**
   * Logs out current user and clears state
   * @method logout
   * @async
   */  logout: async () => {
    try {
      await account.deleteSession("current");
      set({ 
        user: null, 
        nodes: [], 
        edges: [], 
        currentWorkflowId: null, 
        workflowName: "My Workflow", 
        history: [], 
        historyIndex: -1,
        apiKeys: { openai: null}
      });
      toast.success("Logged out successfully!");
    } catch (error) {
      console.error("Logout error:", error);
    }
  },

  /**
   * Updates API key for a specific provider
   * @method updateAPIKey
   * @async
   * @param {string} provider - API provider name
   * @param {string} key - New API key
   */  updateAPIKey: async (provider: string, key: string) => {
    const { user, apiKeys } = get();
    
    try {
      // Check if user exists and has valid ID
      if (!user?.id) {
        const currentUser = await account.get();
        if (currentUser?.$id) {
          // Update user state if needed
          set({ user: { id: currentUser.$id, email: currentUser.email } });
        } else {
          toast.error("Please log in to save API keys");
          return;
        }
      }

      // Get latest user state after potential update
      const currentState = get();
      if (!currentState.user?.id) {
        toast.error("Please log in to save API keys");
        return;
      }

      // Update state optimistically
      const newApiKeys = { ...apiKeys, [provider]: key };
      set({ apiKeys: newApiKeys });

      // Update in database
      const response = await databases.listDocuments(
        DATABASE_ID,
        API_KEYS_COLLECTION,
        [Query.equal("userId", currentState.user.id)]
      );

      if (response.documents.length > 0) {
        await databases.updateDocument(
          DATABASE_ID,
          API_KEYS_COLLECTION,
          response.documents[0].$id,
          { 
            userId: currentState.user.id,
            [provider]: key, 
            lastUpdated: new Date().toISOString() 
          }
        );
      } else {
        await databases.createDocument(
          DATABASE_ID,
          API_KEYS_COLLECTION,
          ID.unique(),
          {
            userId: currentState.user.id,
            [provider]: key,
            created: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          }
        );
      }
      
      toast.success(`${provider.toUpperCase()} API key saved successfully!`);
    } catch (error) {
      console.error(`Error updating ${provider} API key:`, error);
      set({ apiKeys: { ...apiKeys } }); // Revert to previous state
      toast.error(`Failed to save ${provider} API key. Please try again.`);
    }
  },

  /**
   * Loads stored API keys for current user
   * @method loadAPIKeys
   * @async
   */  loadAPIKeys: async () => {
    const { user } = get();
    if (!user || !user.id) return;

    try {      const response = await databases.listDocuments(
        DATABASE_ID,
        API_KEYS_COLLECTION,
        [Query.equal("userId", user.id)]
      );

      if (response.documents.length > 0) {
        const keyData = response.documents[0];
        set({
          apiKeys: {
            openai: keyData.openai || null
          }
        });
      }
    } catch (error) {
      console.error("Error loading API keys:", error);
      toast.error("Failed to load API keys. Please try refreshing the page.");
    }
  },

  /**
   * Saves current workflow to database
   * Creates new workflow if none exists, updates existing one otherwise
   * @method saveWorkflow
   * @async
   * @param {string} name - Name of the workflow
   */
  saveWorkflow: async (name) => {
    const { nodes, edges, user, currentWorkflowId, workflowName } = get();
    if (!user) return alert("Please log in to save workflows.");
    if (!nodes.length && !edges.length) return;
    try {
      const serializedNodes = JSON.stringify(nodes);
      const serializedEdges = JSON.stringify(edges);
      const saveName = name || workflowName;      if (currentWorkflowId && typeof currentWorkflowId === "string") {
        await databases.updateDocument(
          DATABASE_ID,
          MAIN_WORKFLOW_COLLECTION,
          currentWorkflowId,
          { name: saveName, nodes: serializedNodes, edges: serializedEdges, lastUpdated: new Date().toISOString() }
        );
      } else {
        const response = await databases.createDocument(
          DATABASE_ID,
          MAIN_WORKFLOW_COLLECTION,
          ID.unique(),
          { userId: user.id, name: saveName, nodes: serializedNodes, edges: serializedEdges, created: new Date().toISOString(), lastUpdated: new Date().toISOString() },
          [
            Permission.read(Role.any()),
            Permission.update(Role.any()),
            Permission.delete(Role.any()),
          ]
        );
        set({ currentWorkflowId: response.$id, workflowName: saveName });
      }
    } catch (error) {
      console.error("Error saving workflow:", error);
    }
  },

  /**
   * Loads workflows for current user
   * Sets the most recently updated workflow as active
   * @method loadWorkflows
   * @async
   */
  loadWorkflows: async () => {
    const { user } = get();
    if (!user) return;    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        MAIN_WORKFLOW_COLLECTION,
        [Query.equal("userId", String(user.id)), Query.orderDesc("lastUpdated")]
      );
      if (response.documents.length > 0) {
        const latestWorkflow = response.documents[0];
        set({
          nodes: JSON.parse(latestWorkflow.nodes || '[]'),
          edges: JSON.parse(latestWorkflow.edges || '[]'),
          currentWorkflowId: latestWorkflow.$id,
          workflowName: latestWorkflow.name || "My Workflow",
          history: [{ nodes: JSON.parse(latestWorkflow.nodes || '[]'), edges: JSON.parse(latestWorkflow.edges || '[]') }],
          historyIndex: 0
        });
      }
    } catch (error) {
      console.error("Error loading workflows:", error);
      toast.error("Failed to load workflows. Please try refreshing the page.");
    }
  }
}));
