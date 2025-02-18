import { create } from "zustand";
import { databases } from "../lib/appwrite";

interface WorkflowState {
  nodes: any[];
  edges: any[];
  setNodes: (nodes: any[]) => void;
  setEdges: (edges: any[]) => void;
  saveWorkflow: (name: string) => Promise<void>;
  loadWorkflows: () => Promise<void>;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  saveWorkflow: async (name) => {
    const { nodes, edges } = get();
    await databases.createDocument(
      "67b4eba50033539bd242",
      "67b4ebad0007bf1d3f85",
      "unique()",
      { name, nodes, edges }
    );
    alert("Workflow saved!");
  },

  loadWorkflows: async () => {
    const response = await databases.listDocuments("DATABASE_ID", "COLLECTION_ID");
    console.log("Loaded Workflows:", response.documents);
  },
}));
