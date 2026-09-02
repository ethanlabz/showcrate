import * as React from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./UserMenu";
import { ThemeToggle } from "@/components/ThemeToggle";

interface User {
  username?: string | null;
  email: string;
  avatarUrl?: string | null;
}

interface AppHeaderProps {
  user: User | null;
}

export function AppHeader({ user }: AppHeaderProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sm:static sm:h-16 sm:border-0 sm:bg-transparent sm:px-6">
      <div className="flex items-center gap-4">
        <a href="/" className="flex items-center gap-2 font-semibold">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="h-6 w-6 md:h-5 md:w-5">
            <rect width="256" height="256" fill="none"></rect>
            <line x1="208" y1="128" x2="128" y2="208" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"></line>
            <line x1="192" y1="40" x2="40" y2="192" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"></line>
          </svg>
          <span className="sr-only">Showcrate</span>
        </a>
        
        <nav className="hidden md:flex flex-1 items-center gap-6 text-sm font-medium">
          <a href="/dashboard" className="text-muted-foreground transition-colors hover:text-foreground">Dashboard</a>
          <a href="/projects" className="text-muted-foreground transition-colors hover:text-foreground">Projects</a>
        </nav>
      </div>

      <div className="flex items-center justify-end gap-2 sm:gap-4 md:flex-none">
        <a href="/new" className="hidden md:block">
          <Button size="sm">New Project</Button>
        </a>
        <ThemeToggle />
        <a href="/notifications" className="text-muted-foreground hover:text-foreground flex items-center justify-center h-8 w-8 rounded-full hover:bg-accent transition-colors">
          <Bell className="h-4 w-4" />
          <span className="sr-only">Notifications</span>
        </a>
        
        {user ? (
          <UserMenu user={user} />
        ) : (
          <a href="/auth/login" className="text-sm font-medium">Log in</a>
        )}
      </div>
    </header>
  );
}
