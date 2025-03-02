import { create } from "zustand";
import { client, databases, Role, Permission, Account, ID, Query } from "../lib/appwrite";
import { debounce } from "lodash";

interface WorkflowState {
  user: any | null;
  nodes: any[];
  edges: any[];
  currentWorkflowId: string | null;
  workflowName: string;
  history: { nodes: any[], edges: any[] }[];
  historyIndex: number;
  setNodes: (nodes: any[]) => void;
  setEdges: (edges: any[]) => void;
  deleteNode: (nodeId: string) => void;
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  saveWorkflow: (name: string) => Promise<void>;
  loadWorkflows: () => Promise<void>;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  user: null,
  nodes: [],
  edges: [],
  currentWorkflowId: null,
  workflowName: "My Workflow",
  history: [],
  historyIndex: -1,

  saveToHistory: () => {
    const { nodes, edges, history, historyIndex } = get();
    
    // Create a deep copy of current state
    const currentState = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges))
    };
    
    // Trim history to remove any future states if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    
    // Add current state to history
    newHistory.push(currentState);
    
    // Update history and index
    set({ 
      history: newHistory,
      historyIndex: newHistory.length - 1
    });
    
    console.log(`Saved to history. New index: ${newHistory.length - 1}`);
  },

  setNodes: (newNodes) => {
    get().saveToHistory();
    set((state) => ({ nodes: newNodes }));
    debouncedSave();
  },

  setEdges: (newEdges) => {
    get().saveToHistory();
    set((state) => ({ edges: newEdges }));
    debouncedSave();
  },

  deleteNode: (nodeId) => {
    const { nodes, edges } = get();
    
    // Save current state to history before deleting
    get().saveToHistory();
    
    // Remove the node
    const updatedNodes = nodes.filter(node => node.id !== nodeId);
    
    // Remove any connected edges
    const updatedEdges = edges.filter(
      edge => edge.source !== nodeId && edge.target !== nodeId
    );
    
    set({ nodes: updatedNodes, edges: updatedEdges });
    debouncedSave();
  },

  undo: () => {
    const { historyIndex, history } = get();
    
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const previousState = history[newIndex];
      
      set({
        nodes: previousState.nodes,
        edges: previousState.edges,
        historyIndex: newIndex
      });
      
      // console.log(`Undo to index: ${newIndex}`);
      debouncedSave();
    } else {
      console.log("Nothing to undo");
    }
  },

  redo: () => {
    const { historyIndex, history } = get();
    
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const nextState = history[newIndex];
      
      set({
        nodes: nextState.nodes,
        edges: nextState.edges,
        historyIndex: newIndex
      });
      
      // console.log(`Redo to index: ${newIndex}`);
      debouncedSave();
    } else {
      console.log("Nothing to redo");
    }
  },

  login: async (email, password) => {
    try {
      console.log("Logging in with email:", email);
      const account = new Account(client);
      await account.createEmailPasswordSession(email, password);
      const user = await account.get();
      set((state) => ({ 
        user: { id: user.$id, email: user.email },
        history: [],
        historyIndex: -1
      }));

      console.log("Logged in:", user);
      await get().loadWorkflows();
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed. Please check your credentials.");
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
        historyIndex: -1
      });
      alert("Logged out successfully!");
    } catch (error) {
      console.error("Logout error:", error);
    }
  },

  saveWorkflow: async (name) => {
    const { nodes, edges, user, currentWorkflowId, workflowName } = get();
    if (!user) {
      alert("Please log in to save workflows.");
      return;
    }
    
    if (nodes.length === 0 && edges.length === 0) {
      console.log("No workflow data to save.");
      return;
    }
    
    try {
      const serializedNodes = JSON.stringify(nodes);
      const serializedEdges = JSON.stringify(edges);
      const saveName = name || workflowName;
      
      // If we have a currentWorkflowId, update the existing document
      if (currentWorkflowId) {
        console.log("Updating existing workflow:", currentWorkflowId);
        await databases.updateDocument(
          "67b4eba50033539bd242",
          "67b4ebad0007bf1d3f85",
          currentWorkflowId,
          { 
            name: saveName, 
            nodes: serializedNodes, 
            edges: serializedEdges,
            lastUpdated: new Date().toISOString()
          }
        );
        set({ workflowName: saveName });
        console.log("Workflow updated successfully!");
      } else {
        // Otherwise create a new workflow document
        console.log("Creating new workflow document");
        const response = await databases.createDocument(
          "67b4eba50033539bd242",
          "67b4ebad0007bf1d3f85",
          ID.unique(),
          { 
            userId: user.id, 
            name: saveName, 
            nodes: serializedNodes, 
            edges: serializedEdges,
            created: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          },
          [
            Permission.read(Role.user(user.id)),
            Permission.update(Role.user(user.id)),
            Permission.delete(Role.user(user.id)),
          ]
        );
        set({ 
          currentWorkflowId: response.$id,
          workflowName: saveName
        });
        console.log("New workflow created with ID:", response.$id);
      }
    } catch (error) {
      console.error("Error saving workflow:", error);
    }
  },

  loadWorkflows: async () => {
    const { user } = get();
    if (!user) {
      console.log("User not logged in, can't load workflows");
      return;
    }

    try {
      console.log("Loading workflows for user:", user.id);
      const response = await databases.listDocuments(
        "67b4eba50033539bd242",
        "67b4ebad0007bf1d3f85",
        [
          Query.equal("userId", user.id),
          Query.orderDesc("lastUpdated") // Get most recently updated workflow first
        ]
      );

      if (response.documents.length > 0) {
        const latestWorkflow = response.documents[0];
        console.log("Loading latest workflow:", latestWorkflow.$id);

        try {
          const nodes = latestWorkflow.nodes ? JSON.parse(latestWorkflow.nodes) : [];
          const edges = latestWorkflow.edges ? JSON.parse(latestWorkflow.edges) : [];

          set({
            nodes,
            edges,
            currentWorkflowId: latestWorkflow.$id,
            workflowName: latestWorkflow.name || "My Workflow",
            // Initialize history with current state
            history: [{ nodes, edges }],
            historyIndex: 0
          });

          console.log("✅ Loaded workflow:", latestWorkflow.$id);
        } catch (error) {
          console.error("Error parsing workflow data:", error);
        }
      } else {
        console.log("No workflows found for user");
        set({
          nodes: [],
          edges: [],
          currentWorkflowId: null,
          workflowName: "My Workflow",
          history: [],
          historyIndex: -1
        });
      }
    } catch (error) {
      console.error("Error loading workflows:", error);
    }
  }
}));

// Use the workflowStore directly in the debounced function to ensure we have the latest state
const debouncedSave = debounce(() => {
  const { currentWorkflowId, workflowName } = useWorkflowStore.getState();
  useWorkflowStore.getState().saveWorkflow(workflowName);
}, 2000);