import Sidebar from "@/components/Sidebar";  // Import Sidebar
import "./globals.css"; // Import global styles

export const metadata = {
  title: "No-Code AI Workflow Builder",
  description: "Create AI workflows with a drag-and-drop interface",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex">
        <Sidebar /> 
        <main className="flex-grow">{children}</main>
      </body>
    </html>
  );
}
