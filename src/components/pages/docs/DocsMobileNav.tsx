import * as React from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/Sheet";

interface DocsMobileNavProps {
  currentPath: string;
}

export function DocsMobileNav({ currentPath }: DocsMobileNavProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={
        <Button variant="ghost" size="icon" className="md:hidden mr-2 -ml-2 h-9 w-9">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle documentation menu</span>
        </Button>
      } />
      <SheetContent side="left" className="pr-0">
        <SheetTitle className="sr-only">Documentation Menu</SheetTitle>
        <SheetDescription className="sr-only">Access documentation pages</SheetDescription>
        <a href="/" className="flex items-center space-x-2 pb-4 mb-4 border-b mr-6">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="h-6 w-6">
            <rect width="256" height="256" fill="none"></rect>
            <line x1="208" y1="128" x2="128" y2="208" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"></line>
            <line x1="192" y1="40" x2="40" y2="192" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"></line>
          </svg>
          <span className="font-bold tracking-tight text-lg">Showcrate Docs</span>
        </a>
        
        <div className="h-[calc(100vh-8rem)] overflow-y-auto pr-6">
          <div className="pb-4">
            <h4 className="mb-1 rounded-md px-2 py-1 text-sm font-semibold">Getting Started</h4>
            <div className="grid grid-flow-row auto-rows-max text-sm">
              <a href="/docs/introduction" onClick={() => setOpen(false)} className={`group flex w-full items-center rounded-md border border-transparent px-2 py-1 hover:underline ${currentPath === '/docs/introduction' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Introduction</a>
              <a href="/docs/quickstart" onClick={() => setOpen(false)} className={`group flex w-full items-center rounded-md border border-transparent px-2 py-1 hover:underline ${currentPath === '/docs/quickstart' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Quickstart</a>
            </div>
          </div>
          
          <div className="pb-4">
            <h4 className="mb-1 rounded-md px-2 py-1 text-sm font-semibold">Features</h4>
            <div className="grid grid-flow-row auto-rows-max text-sm">
              <a href="/docs/editor" onClick={() => setOpen(false)} className={`group flex w-full items-center rounded-md border border-transparent px-2 py-1 hover:underline ${currentPath === '/docs/editor' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Code Editor</a>
              <a href="/docs/deployments" onClick={() => setOpen(false)} className={`group flex w-full items-center rounded-md border border-transparent px-2 py-1 hover:underline ${currentPath === '/docs/deployments' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Deployments</a>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
