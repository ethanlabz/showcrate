import React, { useState } from "react";
import { Folder, FileText, Code2, ChevronDown, ChevronRight, FileJson, Image } from "lucide-react";

interface FileTreeProps {
  onFileSelect?: (filename: string) => void;
  activeFile?: string;
}

export function FileTree({ onFileSelect, activeFile = "README.md" }: FileTreeProps) {
  const [componentsOpen, setComponentsOpen] = useState(true);
  const [publicOpen, setPublicOpen] = useState(false);

  const FileItem = ({ icon: Icon, name, iconColor }: { icon: any, name: string, iconColor?: string }) => {
    const isActive = activeFile === name;
    return (
      <div 
        onClick={() => onFileSelect && onFileSelect(name)}
        className={`flex cursor-pointer items-center gap-2 rounded-none px-2 py-1.5 text-sm font-mono border-l-2 transition-colors ${
          isActive 
            ? "bg-primary/10 text-primary border-primary" 
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border-transparent hover:border-border"
        }`}
      >
        <Icon className={`h-4 w-4 ${iconColor || ""}`} />
        <span className={`truncate ${isActive ? "font-bold" : ""}`}>{name}</span>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto p-2">
      <div className="mb-2 px-2 py-1 text-xs font-bold uppercase tracking-widest text-muted-foreground border-b-2 border-border/50">
        Explorer
      </div>
      
      <div className="flex flex-col space-y-0.5">
        
        {/* Components Folder */}
        <div className="flex flex-col">
          <div 
            onClick={() => setComponentsOpen(!componentsOpen)}
            className="flex cursor-pointer items-center gap-1.5 rounded-none px-2 py-1.5 text-sm font-mono text-foreground hover:bg-muted/50 border border-transparent hover:border-border transition-colors select-none"
          >
            {componentsOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <Folder className="h-4 w-4 text-blue-400" />
            <span className="truncate">components</span>
          </div>
          
          {componentsOpen && (
            <div className="flex flex-col pl-6 space-y-0.5 mt-0.5">
              <FileItem icon={Code2} name="Button.tsx" iconColor="text-[#61DAFB]" />
              <FileItem icon={Code2} name="Card.tsx" iconColor="text-[#61DAFB]" />
            </div>
          )}
        </div>

        {/* Public Folder */}
        <div className="flex flex-col mt-1">
          <div 
            onClick={() => setPublicOpen(!publicOpen)}
            className="flex cursor-pointer items-center gap-1.5 rounded-none px-2 py-1.5 text-sm font-mono text-foreground hover:bg-muted/50 border border-transparent hover:border-border transition-colors select-none"
          >
            {publicOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <Folder className="h-4 w-4 text-blue-400" />
            <span className="truncate">public</span>
          </div>
          
          {publicOpen && (
            <div className="flex flex-col pl-6 space-y-0.5 mt-0.5">
              <FileItem icon={Image} name="favicon.svg" iconColor="text-orange-400" />
            </div>
          )}
        </div>

        {/* Files */}
        <div className="mt-2 flex flex-col space-y-0.5">
          <FileItem icon={FileText} name="README.md" />
          <FileItem icon={FileJson} name="package.json" iconColor="text-yellow-400" />
        </div>
        
      </div>
    </div>
  );
}
