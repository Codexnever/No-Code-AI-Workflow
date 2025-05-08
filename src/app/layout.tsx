"use client";
import Sidebar from "@/components/Sidebar";
import "./globals.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Inter } from "next/font/google";
import { useEffect, useState } from "react";
import { useWorkflowStore } from "../store/workflowStore";
import LoginModal from "../components/others/LoginModal";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const checkSession = useWorkflowStore((state) => state.checkSession);
  const user = useWorkflowStore((state) => state.user);

  useEffect(() => {
    const init = async () => {
      const hasSession = await checkSession();
      if (!hasSession) {
        setShowLoginModal(true);
      }
      setIsLoading(false);
    };

    init();
  }, [checkSession]);

  // Show login modal whenever user becomes null (logout)
  useEffect(() => {
    if (!user) {
      setShowLoginModal(true);
    }
  }, [user]);

  return (
    <html lang="en">
      <body className={inter.className}>
        {isLoading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="flex min-h-screen bg-gray-50">
            {user && <Sidebar />}
            <div className={`flex-1 ${user ? 'ml-60' : ''}`}>
              {user ? children : null}
            </div>
            <LoginModal isOpen={showLoginModal} onClose={() => user && setShowLoginModal(false)} />
            <ToastContainer position="bottom-right" />
          </div>
        )}
      </body>
    </html>
  );
}
