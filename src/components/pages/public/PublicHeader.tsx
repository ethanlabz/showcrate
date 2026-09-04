import * as React from "react";
import { Home, LayoutGrid, FileCode2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function PublicHeader() {
  return (
    <>
      {/* Universal Top Header (Visible everywhere) */}
      <div className="sticky top-0 z-50 w-full xl:pt-6 xl:px-6 pointer-events-none transition-all duration-500">
        <header className="pointer-events-auto mx-auto w-full max-w-7xl border-b xl:border border-border/40 bg-background/95 xl:bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 xl:rounded-full xl:shadow-2xl transition-all duration-500">
          <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 flex h-16 xl:h-20 items-center justify-between">
          <div className="flex items-center gap-6">
            <a className="flex items-center space-x-2" href="/">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="h-6 w-6 text-primary">
                <rect width="256" height="256" fill="none"></rect>
                <line x1="208" y1="128" x2="128" y2="208" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"></line>
                <line x1="192" y1="40" x2="40" y2="192" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"></line>
              </svg>
              <span className="font-extrabold tracking-tight text-lg">Showcrate</span>
            </a>
            
            {/* Desktop Navigation Links (hidden on mobile and tablet) */}
            <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
              <a className="transition-colors hover:text-primary text-muted-foreground" href="/showcase">Showcase</a>
              <a className="transition-colors hover:text-primary text-muted-foreground" href="/templates">Templates</a>
              <a className="transition-colors hover:text-primary text-muted-foreground" href="/about">About</a>
            </nav>
          </div>
          
          {/* Universal Global Actions */}
          <div className="flex items-center justify-end space-x-2 sm:space-x-4">
            <ThemeToggle />
            <a href="/auth/login" className="text-sm font-medium transition-colors hover:text-primary hidden sm:inline-block">
              Log in
            </a>
            <a href="/auth/signup">
              <Button size="sm" className="rounded-full shadow-md shadow-primary/20 sm:px-6 sm:h-9 h-8 text-xs sm:text-sm">Sign up</Button>
            </a>
          </div>
          </div>
        </header>
      </div>

      {/* Tablet Floating Left Island (hidden on mobile and desktop) */}
      <div className="hidden md:flex lg:hidden fixed left-4 top-1/2 -translate-y-1/2 z-50 animate-in slide-in-from-left-8 duration-500">
        <div className="bg-background/80 backdrop-blur-xl border border-border/50 shadow-2xl shadow-primary/10 rounded-full flex flex-col items-center justify-center gap-6 px-3 py-6">
          <a href="/showcase" className="text-muted-foreground hover:text-primary transition-colors flex flex-col items-center gap-1" title="Showcase">
            <LayoutGrid className="h-5 w-5" />
            <span className="text-[9px] font-medium uppercase tracking-wider">Showcase</span>
          </a>
          <a href="/templates" className="text-muted-foreground hover:text-primary transition-colors flex flex-col items-center gap-1" title="Templates">
            <FileCode2 className="h-5 w-5" />
            <span className="text-[9px] font-medium uppercase tracking-wider">Templates</span>
          </a>
          <a href="/about" className="text-muted-foreground hover:text-primary transition-colors flex flex-col items-center gap-1" title="About">
            <HelpCircle className="h-5 w-5" />
            <span className="text-[9px] font-medium uppercase tracking-wider">About</span>
          </a>
        </div>
      </div>

      {/* Mobile Floating Bottom Dock (hidden on tablet and desktop) */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-8 duration-500">
        <div className="bg-background/85 backdrop-blur-xl border border-border/50 shadow-lg rounded-full flex items-center justify-between px-5 py-2.5">
          <a href="/" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
            <Home className="h-4 w-4" />
            <span className="text-[9px] font-medium">Home</span>
          </a>
          <a href="/showcase" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
            <LayoutGrid className="h-4 w-4" />
            <span className="text-[9px] font-medium">Showcase</span>
          </a>
          <a href="/templates" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
            <FileCode2 className="h-4 w-4" />
            <span className="text-[9px] font-medium">Templates</span>
          </a>
          <a href="/about" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
            <HelpCircle className="h-4 w-4" />
            <span className="text-[9px] font-medium">About</span>
          </a>
        </div>
      </div>
    </>
  );
}
