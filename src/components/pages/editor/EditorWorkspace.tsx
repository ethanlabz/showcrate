import React, { useState } from "react";

import { FileTree } from "./FileTree";
import { LiveCodeEditor } from "./LiveCodeEditor";
import { LivePreview } from "./LivePreview";
import { Menu, X } from "lucide-react";

export function EditorWorkspace() {
  const [activeMobileTab, setActiveMobileTab] = useState<"editor" | "preview">("editor");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [documentContent, setDocumentContent] = useState<string>("# Welcome to Showcrate\n\nStart typing **Markdown** or code here to see it render live on the right.");

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
          w-64 border-r border-border/40 bg-card/50 backdrop-blur-xl
          transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className="flex h-10 items-center justify-between px-4 border-b border-border/40 md:hidden">
          <span className="font-semibold text-sm">Explorer</span>
          <button onClick={() => setIsSidebarOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <FileTree />
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden relative min-w-0">
        
        {/* Unified macOS-style Window Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/80 bg-muted/20 backdrop-blur-md shrink-0">
          {/* Left: Window Controls */}
          <div className="flex items-center gap-4">
            <div className="flex gap-1.5 sm:gap-2">
              <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#FF5F56] border border-[#E0443E]"></div>
              <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]"></div>
              <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#27C93F] border border-[#1AAB29]"></div>
            </div>
            {/* File Path / Breadcrumb */}
            <div className="hidden sm:flex items-center text-[11px] text-muted-foreground font-mono bg-background/50 px-2 py-1 rounded-md border border-border/50 shadow-inner select-none">
              <svg className="w-3 h-3 mr-1.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
              showcrate<span className="mx-1.5 text-border">/</span><span className="text-foreground">README.md</span>
            </div>
          </div>
          {/* Right: Status / Actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold tracking-wide uppercase text-success bg-success/10 border border-success/20 px-2.5 py-1 rounded-full select-none">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success"></span>
              </span>
              Live
            </div>
            <div className="hidden md:flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted cursor-pointer transition-colors">
              <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
            </div>
          </div>
        </div>

        {/* Mobile Tabs & Sidebar Toggle */}
        <div className="flex md:hidden h-10 items-center border-b border-border/40 bg-card/30 px-2 shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 mr-2 text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-4 w-4" />
          </button>
          
          <div className="flex flex-1 rounded-md bg-muted/50 p-1">
            <button 
              className={`flex-1 rounded-sm px-3 py-1 text-xs font-medium transition-all ${
                activeMobileTab === "editor" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveMobileTab("editor")}
            >
              Editor
            </button>
            <button 
              className={`flex-1 rounded-sm px-3 py-1 text-xs font-medium transition-all ${
                activeMobileTab === "preview" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
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
              flex-1 flex-col border-r border-border/40 min-w-0 min-h-0
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
              flex-1 flex-col bg-background/50 min-w-0 min-h-0
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
