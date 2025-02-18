import { useWorkflowStore } from "../store/workflowStore";

const SaveBtn = () => {
  const { saveWorkflow } = useWorkflowStore();

  return (
    <aside className="w-60 h-screen bg-gray-900 text-white p-4 flex flex-col">
      <h2 className="text-lg font-semibold mb-4">Nodes</h2>
      <button
        onClick={() => saveWorkflow("My Workflow")}
        className="p-3 bg-blue-600 rounded-md cursor-pointer shadow-md text-center mb-2"
      >
        Save Workflow
      </button>
    </aside>
  );
};

export default SaveBtn;
