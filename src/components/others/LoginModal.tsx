"use client";
import React, { useState } from "react";
import { useWorkflowStore } from "../../store/workflowStore";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const login = useWorkflowStore((state) => state.login);
  const register = useWorkflowStore((state) => state.register);
  const loadWorkflows = useWorkflowStore((state) => state.loadWorkflows);
  const user = useWorkflowStore((state) => state.user);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
        await loadWorkflows();
        onClose();
      } else {
        await register(email, password, name);
       
        setIsLogin(true);
        setPassword("");
        setEmail("");
        setError("Registration successful! Please login.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : isLogin ? "Login failed" : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError("");
    setEmail("");
    setPassword("");
    setName("");
  };

  // Only allow clicking outside to close if user is logged in
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (user) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-white p-8 rounded-2xl shadow-xl w-[440px] relative"
            onClick={(e) => e.stopPropagation()}
          >
            {user && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            )}

            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {isLogin ? "Welcome Back" : "Create Account"}
              </h2>
              <p className="text-gray-600 mt-2">
                {isLogin 
                  ? "Sign in to access your workflows"
                  : "Join us to start creating workflows"
                }
              </p>
            </div>

            {error && (
              <div className={`mb-6 p-3 rounded-lg text-sm ${
                error.includes("successful") 
                  ? "bg-green-50 border-l-4 border-green-500 text-green-700"
                  : "bg-red-50 border-l-4 border-red-500 text-red-700"
              }`}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={isLogin ? "login" : "register"}
                  initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {!isLogin && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-800"
                        required
                        placeholder="Enter your name..."
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-800"
                      required
                      placeholder="Enter your email"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-800"
                      required
                      placeholder="••••••••"
                    />
                    {!isLogin && (
                      <p className="mt-1 text-sm text-gray-500">
                        Password must contain at least one uppercase letter and only letters/numbers
                      </p>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium mt-6"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isLogin ? "Signing in..." : "Creating account..."}
                  </span>
                ) : (
                  isLogin ? "Sign In" : "Create Account"
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={switchMode}
                className="text-blue-600 hover:text-blue-800 font-medium focus:outline-none focus:underline transition-colors"
              >
                {isLogin ? "Create one now" : "Sign in instead"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoginModal;