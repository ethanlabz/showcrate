import React, { useState } from "react";

import { FileTree } from "./FileTree";
import { LiveCodeEditor } from "./LiveCodeEditor";
import { LivePreview } from "./LivePreview";
import { Menu, X } from "lucide-react";

export function EditorWorkspace() {
  const DEMO_FILES: Record<string, string> = {
    "README.md": "# Welcome to Showcrate\n\nStart typing **Markdown** or code here to see it render live on the right.\n\n*Try switching files in the Explorer to see this content change!*",
    "Button.tsx": "export function Button() {\n  return <button className=\"px-4 py-2 bg-primary border-2 border-foreground font-mono font-bold uppercase rounded-none text-primary-foreground\">Interact</button>;\n}",
    "Card.tsx": "export function Card({ children }) {\n  return <div className=\"p-4 border-2 border-foreground bg-card shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]\">{children}</div>;\n}",
    "package.json": "{\n  \"name\": \"showcrate-demo\",\n  \"version\": \"1.0.0\",\n  \"dependencies\": {\n    \"react\": \"^18.2.0\",\n    \"lucide-react\": \"^0.263.1\"\n  }\n}",
    "favicon.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\">\n  <rect width=\"100\" height=\"100\" fill=\"#000\" />\n  <rect x=\"10\" y=\"10\" width=\"80\" height=\"80\" fill=\"#fff\" stroke=\"#000\" stroke-width=\"4\" />\n</svg>"
  };

  const [activeMobileTab, setActiveMobileTab] = useState<"editor" | "preview">("editor");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeFile, setActiveFile] = useState<string>("README.md");
  const [documentContent, setDocumentContent] = useState<string>(DEMO_FILES["README.md"]);

  const handleFileSelect = (filename: string) => {
    setActiveFile(filename);
    setDocumentContent(DEMO_FILES[filename] || "");
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false); // Auto close sidebar on mobile when selecting a file
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-background relative">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar (File Explorer) */}
      <aside 
        className={`
          absolute md:static top-0 bottom-0 left-0 z-50 
          w-64 border-r-2 border-border bg-card
          transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className="flex h-10 items-center justify-between px-4 border-b-2 border-border md:hidden">
          <span className="font-bold text-sm uppercase tracking-wider">Explorer</span>
          <button onClick={() => setIsSidebarOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <FileTree activeFile={activeFile} onFileSelect={handleFileSelect} />
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden relative min-w-0">
        
        {/* Unified macOS-style Window Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b-2 border-border bg-muted/20 shrink-0">
          {/* Left: Window Controls */}
          <div className="flex items-center gap-4">
            <div className="flex gap-1.5 sm:gap-2">
              <div className="h-3 w-3 bg-[#FF5F56] border-2 border-border"></div>
              <div className="h-3 w-3 bg-[#FFBD2E] border-2 border-border"></div>
              <div className="h-3 w-3 bg-[#27C93F] border-2 border-border"></div>
            </div>
            {/* File Path / Breadcrumb */}
            <div className="hidden sm:flex items-center text-[11px] text-muted-foreground font-mono bg-background px-2 py-1 border-2 border-border select-none">
              <svg className="w-3 h-3 mr-1.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
              showcrate<span className="mx-1.5 text-border">/</span><span className="text-foreground">{activeFile}</span>
            </div>
          </div>
          {/* Right: Status / Actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold tracking-wide uppercase text-success bg-success/10 border-2 border-success/50 px-2.5 py-1 select-none">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full bg-success opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 bg-success"></span>
              </span>
              Live
            </div>
            <div className="hidden md:flex h-6 w-6 items-center justify-center border-2 border-border hover:bg-muted cursor-pointer transition-colors">
              <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
            </div>
          </div>
        </div>

        {/* Mobile Tabs & Sidebar Toggle */}
        <div className="flex md:hidden h-10 items-center border-b-2 border-border bg-card px-2 shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 mr-2 border-2 border-transparent hover:border-border text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-4 w-4" />
          </button>
          
          <div className="flex flex-1 border-2 border-border bg-background p-1">
            <button 
              className={`flex-1 px-3 py-1 text-xs font-bold uppercase tracking-wider transition-all border-2 ${
                activeMobileTab === "editor" 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveMobileTab("editor")}
            >
              Editor
            </button>
            <button 
              className={`flex-1 px-3 py-1 text-xs font-bold uppercase tracking-wider transition-all border-2 ${
                activeMobileTab === "preview" 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveMobileTab("preview")}
            >
              Preview
            </button>
          </div>
        </div>

        {/* Desktop Split View / Mobile Tab View */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Code Editor */}
          <div 
            className={`
              flex-1 flex-col border-r-2 border-border min-w-0 min-h-0
              ${activeMobileTab === "editor" ? "flex" : "hidden"} md:flex
            `}
          >
            <LiveCodeEditor 
              value={documentContent} 
              onChange={(val) => setDocumentContent(val || "")} 
            />
          </div>

          {/* Live Preview */}
          <div 
            className={`
              flex-1 flex-col bg-background min-w-0 min-h-0
              ${activeMobileTab === "preview" ? "flex" : "hidden"} md:flex
            `}
          >
            <LivePreview content={documentContent} />
          </div>
        </div>
        
      </div>
    </div>
  );
}
