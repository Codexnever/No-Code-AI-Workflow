"use client";
import React, { useState } from "react";
import { useWorkflowStore } from "../store/workflowStore";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useWorkflowStore((state) => state.login);
  const logout = useWorkflowStore((state) => state.logout);
  const loadWorkflows = useWorkflowStore((state) => state.loadWorkflows);
  const user = useWorkflowStore((state) => state.user);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    await login(email, password);
    await loadWorkflows();
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-40">
        {user ? (
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Welcome, {user.name || user.email}!</h2>
            <p className="text-gray-500 mb-4">You are logged in.</p>
            <button
              onClick={logout}
              className="w-full bg-red-500 text-white p-2 rounded hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin}>
            <h2 className="text-xl font-semibold mb-4 text-center">Login</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-800 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border rounded focus:ring focus:ring-blue-300 text-black"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border rounded focus:ring focus:ring-blue-300 text-black"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
