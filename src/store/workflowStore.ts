import { create } from "zustand";
import { client, databases, Role, Permission, Account, ID, Query } from "../lib/appwrite";
import { debounce } from "lodash";
import { toast } from 'react-toastify';

const debouncedSave = debounce(() => {
  const { currentWorkflowId, workflowName } = useWorkflowStore.getState();
  useWorkflowStore.getState().saveWorkflow(workflowName);
}, 2000);

interface WorkflowState {
  user: any | null;
  nodes: any[];
  edges: any[];
  currentWorkflowId: string | null;
  workflowName: string;
  history: { nodes: any[], edges: any[] }[];
  historyIndex: number;
  workflowResults: Record<string, any>;
  setNodes: (nodes: any[]) => void;
  setEdges: (edges: any[]) => void;
  deleteNode: (nodeId: string) => void;
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
  updateEdge: (edgeId: string, newData: any) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  saveWorkflow: (name: string) => Promise<void>;
  loadWorkflows: () => Promise<void>;
  fetchWorkflowResults: (workflowExecutionId: string) => Promise<void>;
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

  saveToHistory: () => {
    const { nodes, edges, history, historyIndex } = get();
    const currentState = { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(currentState);
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  fetchWorkflowResults: async (workflowExecutionId: string) => {
    try {
      const response = await databases.getDocument(
        "67b4eba50033539bd242",
        "67b4ebad0007bf1d3f85",
        workflowExecutionId
      );
  
      if (response) {
        set((state) => ({
          workflowResults: {
            ...state.workflowResults,
            [workflowExecutionId]: response,
          },
        }));
      }
    } catch (error) {
      console.error("Error fetching workflow results:", error);
    }
  },
  
  setNodes: (newNodes) => {
    get().saveToHistory();
    set({ nodes: newNodes });
    debouncedSave();
  },

  setEdges: (newEdges) => {
    get().saveToHistory();
    set({ edges: newEdges });
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

  login: async (email, password) => {
    try {
      const account = new Account(client);
      await account.createEmailPasswordSession(email, password);
      const user = await account.get();
      set({ user: { id: user.$id, email: user.email }, history: [], historyIndex: -1 });
      await get().loadWorkflows();
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Login failed. Please check your credentials.");
    }
  },

  logout: async () => {
    try {
      const account = new Account(client);
      await account.deleteSession("current");
      set({ user: null, nodes: [], edges: [], currentWorkflowId: null, workflowName: "My Workflow", history: [], historyIndex: -1 });
      toast.success("Logged out successfully!");
    } catch (error) {
      console.error("Logout error:", error);
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
      if (currentWorkflowId) {
        await databases.updateDocument("67b4eba50033539bd242", "67b4ebad0007bf1d3f85", currentWorkflowId, { name: saveName, nodes: serializedNodes, edges: serializedEdges, lastUpdated: new Date().toISOString() });
      } else {
        const response = await databases.createDocument("67b4eba50033539bd242", "67b4ebad0007bf1d3f85", ID.unique(), { userId: user.id, name: saveName, nodes: serializedNodes, edges: serializedEdges, created: new Date().toISOString(), lastUpdated: new Date().toISOString() }
          , [Permission.read(Role.user(user.id)), Permission.update(Role.user(user.id)), Permission.delete(Role.user(user.id))]);
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
      const response = await databases.listDocuments("67b4eba50033539bd242", "67b4ebad0007bf1d3f85", [Query.equal("userId", user.id), Query.orderDesc("lastUpdated")]);
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
