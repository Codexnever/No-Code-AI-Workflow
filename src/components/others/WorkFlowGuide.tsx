"use client";
import React, { useState } from "react";
import { X, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const WorkflowGuide = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Help Button */}
      {!isOpen && (
        <motion.button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full p-3 shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <HelpCircle size={24} />
        </motion.button>
      )}

      {/* Guide Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 bg-white/90 backdrop-blur-md p-5 rounded-xl shadow-2xl w-80 z-20 border border-gray-200"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-lg text-black">Workflow Guide</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Guide Content */}
            <div className="text-sm text-gray-700 space-y-3">
              <p>
                <strong>Creating nodes:</strong> Drag & drop AI Task nodes from
                the sidebar.
              </p>
              <p>
                <strong>Connecting nodes:</strong> Click & drag from a handle to
                another node.
              </p>
              <p>
                <strong>Setting conditions:</strong> Click on any connection to
                set a condition type:
              </p>

              {/* Condition Types */}
              <div className="space-y-2 ml-3">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 bg-blue-500 rounded-full"></span>
                  <span>
                    <strong>Always:</strong> Executes always
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
                  <span>
                    <strong>Success:</strong> Only on success
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 bg-red-500 rounded-full"></span>
                  <span>
                    <strong>Error:</strong> Only on error
                  </span>
                </div>
              </div>

              <p>
                <strong>Tip:</strong> Use the settings button on each node to
                see available handles.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default WorkflowGuide;
