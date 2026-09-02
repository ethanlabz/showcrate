import React from "react";
import { Folder, FileText, Code2, ChevronDown, ChevronRight, FileJson } from "lucide-react";

export function FileTree() {
  return (
    <div className="flex h-full flex-col overflow-y-auto p-2">
      <div className="mb-2 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Explorer
      </div>
      
      <div className="flex flex-col space-y-0.5">
        
        {/* Components Folder */}
        <div className="flex flex-col">
          <div className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-muted/50 transition-colors">
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            <Folder className="h-4 w-4 text-blue-400" />
            <span className="truncate">components</span>
          </div>
          
          <div className="flex flex-col pl-6 space-y-0.5">
            <div className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
              <Code2 className="h-4 w-4 text-react text-[#61DAFB]" />
              <span className="truncate">Button.tsx</span>
            </div>
            <div className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
              <Code2 className="h-4 w-4 text-react text-[#61DAFB]" />
              <span className="truncate">Card.tsx</span>
            </div>
          </div>
        </div>

        {/* Public Folder */}
        <div className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
          <ChevronRight className="h-3.5 w-3.5" />
          <Folder className="h-4 w-4 text-blue-400" />
          <span className="truncate">public</span>
        </div>

        {/* Files */}
        <div className="flex cursor-pointer items-center gap-2 rounded-md bg-primary/10 px-2 py-1.5 text-sm text-primary transition-colors mt-1">
          <FileText className="h-4 w-4" />
          <span className="truncate">README.md</span>
        </div>
        
        <div className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
          <FileJson className="h-4 w-4 text-yellow-400" />
          <span className="truncate">package.json</span>
        </div>
        
      </div>
    </div>
  );
}
