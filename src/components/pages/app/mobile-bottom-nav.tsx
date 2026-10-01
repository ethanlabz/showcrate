import * as React from "react";
import { User, Folder, Plus } from "lucide-react";

interface Props {
  username: string;
}

export function MobileBottomNav({ username }: Props) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-background/90 backdrop-blur-md px-6 pb-safe">
      <a href={`/${username}`} className="flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors">
        <User className="h-5 w-5" />
        <span className="text-[10px] font-medium leading-none">Profile</span>
      </a>
      
      <a href="/new" className="flex flex-col items-center justify-center -mt-6 group">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform group-hover:scale-105">
          <Plus className="h-6 w-6" />
        </div>
        <span className="sr-only">New Project</span>
      </a>
      
      <a href="/projects" className="flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors">
        <Folder className="h-5 w-5" />
        <span className="text-[10px] font-medium leading-none">Projects</span>
      </a>
    </nav>
  );
}
