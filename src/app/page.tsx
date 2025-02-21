import WorkflowBuilder from "@/components/WorkflowBuilder";
import Login from "@/components/Login";

export default function Home() {
  return (
    <div className="h-screen bg-gray-200 flex">
      <Login/>
      <WorkflowBuilder />
    </div>
  );
}
