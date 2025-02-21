import { create } from "zustand";
import { client, databases, Role, Permission, Account, ID, Query } from "../lib/appwrite";
import { debounce } from "lodash";

interface WorkflowState {
  user: any | null;
  nodes: any[];
  edges: any[];
  setNodes: (nodes: any[]) => void;
  setEdges: (edges: any[]) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  saveWorkflow: (name: string) => Promise<void>;
  loadWorkflows: () => Promise<void>;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  user: null,
  nodes: [],
  edges: [],

  setNodes: (newNodes) => {
    set((state) => ({ nodes: newNodes }));
    debouncedSave("Auto-Save Workflow");
  },

  setEdges: (newEdges) => {
    set((state) => ({ edges: newEdges }));
    debouncedSave("Auto-Save Workflow");
  },

  login: async (email, password) => {
    try {
      console.log("Logging in with email:", email);
      const account = new Account(client);
      await account.createEmailPasswordSession(email, password);
     console.log('Movin towards setting user');
      
      const user = await account.get();
      console.log("Here in:", user);
      set(() => ({ user: { id: user.$id, email: user.email } }));

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
      set({ user: null, nodes: [], edges: [] });
      alert("Logged out successfully!");
    } catch (error) {
      console.error("Logout error:", error);
    }
  },

  saveWorkflow: async (name) => { // Save workflow to Appwrite
    const { nodes, edges, user } = get();
    if (!user) {
      alert("Please log in to save workflows.");
      return;
    }
    if (nodes.length === 0 && edges.length === 0) {
      alert("No workflow data to save.");
      return;
    }
    try {
      const serializedNodes = JSON.stringify(nodes);
      const serializedEdges = JSON.stringify(edges);
      console.log("Saving Workflow:", serializedNodes, serializedEdges);

      await databases.createDocument(
        "67b4eba50033539bd242",
        "67b4ebad0007bf1d3f85",
        ID.unique(),
        { userId: user.id, name, nodes: serializedNodes, edges: serializedEdges },
        [
          Permission.read(Role.user(user.id)),
          Permission.update(Role.user(user.id)),
          Permission.delete(Role.user(user.id)),
        ]
      );
      console.log("Workflow saved!");
    } catch (error) {
      console.error("Error saving workflow:", error);
    }
  },

  loadWorkflows: async () => {
    const { user } = get();
    if (!user) {
      alert("Please log in");
      return;
    }

    try {
      console.log("Loading workflows...");
      const response = await databases.listDocuments(
        "67b4eba50033539bd242",
        "67b4ebad0007bf1d3f85",
        [Query.equal("userId", user.id)]
      );

      console.log("Response:", response);

      if (response.documents.length > 0) {

        let allNodes: Array<{ id: string; type: string; position: { x: number; y: number }; data: any }> = [];
        let allEdges: Array<{ source: string; target: string; id: string }> = [];

        response.documents.forEach((workflow) => {
          try {
            const nodes = workflow.nodes ? JSON.parse(workflow.nodes) : [];
            const edges = workflow.edges ? JSON.parse(workflow.edges) : [];

            if (Array.isArray(nodes)) allNodes.push(...nodes);
            if (Array.isArray(edges)) allEdges.push(...edges);
          } catch (error) {
            console.error("JSON Parse Error:", error);
          }
        });

        set((state) => ({
          nodes: allNodes,
          edges: allEdges
        }));

        console.log("✅ Zustand Store Updated:", get().nodes, get().edges);
      }
    } catch (error) {
      console.error("Error loading workflows:", error);
    }

  }

}));

const debouncedSave = debounce(async (name) => {
  await useWorkflowStore.getState().saveWorkflow(name);
}, 2000);
