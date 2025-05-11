"use client";
import { useState } from "react";
import { LayoutDashboard, Settings, Box, LogOut } from "lucide-react";
import AiNode from "./nodes/AiNode";
import { useWorkflowStore } from "../store/workflowStore";

const Sidebar = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { user, logout } = useWorkflowStore();

  if (!user) return null;

  return (
    <div className="fixed left-0 top-0 h-screen w-60 bg-gray-900 text-white flex flex-col p-4 z-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">AI Workflow</h1>
        <button
          onClick={logout}
          className="p-2 hover:bg-gray-800 rounded-lg"
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>

      <nav className="flex flex-col space-y-4">
        <button
          className={`flex items-center space-x-2 p-2 rounded-lg ${
            activeTab === "dashboard" ? "bg-gray-700" : "hover:bg-gray-800"
          }`}
          onClick={() => setActiveTab("dashboard")}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Main Workflow</span>
        </button>

        <button
          className={`flex items-center space-x-2 p-2 rounded-lg ${
            activeTab === "aiNodes" ? "bg-gray-700" : "hover:bg-gray-800"
          }`}
          onClick={() => setActiveTab("aiNodes")}
        >
          <Box className="w-5 h-5" />
          <span>AI Nodes</span>
        </button>

        <button
          className={`flex items-center space-x-2 p-2 rounded-lg ${
            activeTab === "settings" ? "bg-gray-700" : "hover:bg-gray-800"
          }`}
          onClick={() => setActiveTab("settings")}
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </button>
      </nav>

      {activeTab === "aiNodes" && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold mb-3 text-gray-400">Available Nodes</h2>
          <div className="space-y-2">
            <AiNode />
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
