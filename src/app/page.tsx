"use client";
import WorkflowBuilder from "../components/WorkflowBuilder";
import WorkFlowGuide from "../components/others/WorkFlowGuide";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100">
      <WorkflowBuilder />
      <WorkFlowGuide />
    </main>
  );
}