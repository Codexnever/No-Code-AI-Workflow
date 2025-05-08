// src/store/workflowStore.ts

import { create } from "zustand";
import { client, databases, Role, Permission, Account, ID, Query } from "../lib/appwrite";
import { debounce } from "lodash";
import { toast } from 'react-toastify';
import { Node, Edge } from 'reactflow';

// Constants for environment variables with fallbacks
const DATABASE_ID = process.env.DATABASE_ID || '67b4eba50033539bd242';
const MAIN_WORKFLOW_ID = process.env.MAIN_WORKFLOW_ID || '67b4ebad0007bf1d3f85';
const API_KEYS_COLLECTION = process.env.API_KEYS || '67d9c7b7001a7a22639c';
const WORKFLOW_EXECUTION_COLLECTION = process.env.COLLECTION_WORKFLOW_EXECUTION || '67c5eb7d001f3c955715';

const debouncedSave = debounce(() => {
  const { currentWorkflowId, workflowName } = useWorkflowStore.getState();
  useWorkflowStore.getState().saveWorkflow(workflowName);
}, 2000);

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

  setWorkflowName: (name) => {
    set({ workflowName: name });
  },

  saveToHistory: () => {
    const { nodes, edges, history, historyIndex } = get();
    const currentState = { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(currentState);
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  fetchWorkflowResults: async (executionId: string) => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        WORKFLOW_EXECUTION_COLLECTION,
        [Query.equal("executionId", executionId)]
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
  
  setNodes: (newNodes) => {
    if (typeof newNodes === 'function') {
      set((state) => ({ nodes: newNodes(state.nodes) }));
    } else {
      set({ nodes: newNodes });
    }
    debouncedSave();
  },

  setEdges: (newEdges) => {
    if (typeof newEdges === 'function') {
      set((state) => ({ edges: newEdges(state.edges) }));
    } else {
      set({ edges: newEdges });
    }
    debouncedSave();
  },

  updateEdge: (edgeId, newData) => {
    const { edges } = get();
    get().saveToHistory();
    const updatedEdges = edges.map(edge => edge.id === edgeId ? { ...edge, data: { ...edge.data, ...newData } } : edge);
    set({ edges: updatedEdges });
    debouncedSave();
  },

  deleteNode: (nodeId) => {
    const { nodes, edges } = get();
    get().saveToHistory();
    set({
      nodes: nodes.filter(node => node.id !== nodeId),
      edges: edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId)
    });
    debouncedSave();
  },

  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      set({ ...history[newIndex], historyIndex: newIndex });
      debouncedSave();
    }
  },

  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      set({ ...history[newIndex], historyIndex: newIndex });
      debouncedSave();
    }
  },

  checkSession: async () => {
    try {
      const account = new Account(client);
      const user = await account.get();
      if (user) {
        set({ user: { id: user.$id, email: user.email } });
        await get().loadWorkflows();
        await get().loadAPIKeys();
        return true;
      }
    } catch (error) {
      console.log("No active session found");
    }
    return false;
  },

  login: async (email, password) => {
    try {
      const account = new Account(client);
      await account.createEmailPasswordSession(email, password);
      const user = await account.get();
      console.log("User logged in:", user);
      set({ user: { id: user.$id, email: user.email }, history: [], historyIndex: -1 });
      await get().loadWorkflows();
      await get().loadAPIKeys();
      toast.success("Successfully logged in!");
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Login failed. Please check your credentials.");
    }
  },

  logout: async () => {
    try {
      const account = new Account(client);
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

  updateAPIKey: async (provider, key) => {
    const { user, apiKeys } = get();
    if (!user) return;

    try {
      // First update state optimistically
      const newApiKeys = { ...apiKeys, [provider]: key };
      set({ apiKeys: newApiKeys });

      // Then update in database
      const response = await databases.listDocuments(
        DATABASE_ID,
        API_KEYS_COLLECTION,
        [Query.equal("userId", user.id)]
      );

      if (response.documents.length > 0) {
        await databases.updateDocument(
          DATABASE_ID,
          API_KEYS_COLLECTION,
          response.documents[0].$id,
          { [provider]: key, lastUpdated: new Date().toISOString() }
        );
      } else {
        await databases.createDocument(
          DATABASE_ID,
          API_KEYS_COLLECTION,
          ID.unique(),
          {
            userId: user.id,
            [provider]: key,
            created: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          }
        );
      }
    } catch (error) {
      // Revert optimistic update on error
      console.error(`Error updating ${provider} API key:`, error);
      set({ apiKeys: { ...apiKeys } }); // Revert to previous state
      toast.error(`Failed to save ${provider} API key. Please try again.`);
    }
  },

  loadAPIKeys: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const response = await databases.listDocuments(
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

  saveWorkflow: async (name) => {
    const { nodes, edges, user, currentWorkflowId, workflowName } = get();
    if (!user) return alert("Please log in to save workflows.");
    if (!nodes.length && !edges.length) return;
    try {
      const serializedNodes = JSON.stringify(nodes);
      const serializedEdges = JSON.stringify(edges);
      const saveName = name || workflowName;
      if (currentWorkflowId && typeof currentWorkflowId === "string") {
        await databases.updateDocument(
          DATABASE_ID,
          MAIN_WORKFLOW_ID,
          currentWorkflowId,
          { name: saveName, nodes: serializedNodes, edges: serializedEdges, lastUpdated: new Date().toISOString() }
        );
      } else {
        const response = await databases.createDocument(
          DATABASE_ID,
          MAIN_WORKFLOW_ID,
          ID.unique(),
          { userId: user.id, name: saveName, nodes: serializedNodes, edges: serializedEdges, created: new Date().toISOString(), lastUpdated: new Date().toISOString() },
          [
            Permission.read(Role.user(user.id)),
            Permission.update(Role.user(user.id)),
            Permission.delete(Role.user(user.id))
          ]
        );
        set({ currentWorkflowId: response.$id, workflowName: saveName });
      }
    } catch (error) {
      console.error("Error saving workflow:", error);
    }
  },

  loadWorkflows: async () => {
    const { user } = get();
    if (!user) return;
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        MAIN_WORKFLOW_ID,
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
    }
  }
}));