"use client"
import { useState } from "react";
import { LayoutDashboard, Settings, Box } from "lucide-react"; // Correct icons

const Sidebar = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="h-screen w-60 bg-gray-900 text-white flex flex-col p-4">
      <h1 className="text-xl font-bold mb-6">AI Workflow</h1>
      <nav className="flex flex-col space-y-4">
        <button
          className={`flex items-center space-x-2 p-2 rounded-lg ${
            activeTab === "dashboard" ? "bg-gray-700" : "hover:bg-gray-800"
          }`}
          onClick={() => setActiveTab("dashboard")}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Dashboard</span>
        </button>

        <button
          className={`flex items-center space-x-2 p-2 rounded-lg ${
            activeTab === "components" ? "bg-gray-700" : "hover:bg-gray-800"
          }`}
          onClick={() => setActiveTab("components")}
        >
          <Box className="w-5 h-5" />
          <span>Components</span>
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
    </div>
  );
};

export default Sidebar;
