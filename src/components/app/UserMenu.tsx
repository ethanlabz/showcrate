import * as React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface User {
  username?: string | null;
  email: string;
  avatarUrl?: string | null;
}

interface UserMenuProps {
  user: User;
}

export function UserMenu({ user }: UserMenuProps) {
  const displayName = user.username || user.email;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <Button variant="ghost" className="relative h-8 w-8 rounded-full border border-border p-0">
          <Avatar className="h-7 w-7">
            <AvatarImage 
              src={user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`} 
              alt={displayName} 
            />
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
        </Button>
      } />
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.username}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<a href="/settings" className="w-full cursor-pointer">Settings</a>} />
        <DropdownMenuSeparator />
        <DropdownMenuItem className="p-0">
          <form action="/auth/signout" method="POST" className="w-full">
            <button type="submit" className="w-full text-left cursor-pointer px-2 py-1.5 rounded-sm">
              Log out
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
