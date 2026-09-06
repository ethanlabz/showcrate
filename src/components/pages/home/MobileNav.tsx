// src/components/ui/MobileNav.tsx
import { useState, useEffect, useRef } from "react";
import { Home, LayoutGrid, FileCode2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface NavLink {
  href: string;
  label: string;
}

interface Props {
  navLinks: NavLink[];
  currentPath: string;
}

export default function MobileNav({ navLinks, currentPath }: Props) {

  const NavIcons: { [key: string]: React.ReactNode } = {
    "/": <Home className="h-4 w-4" />,
    "/showcase": <LayoutGrid className="h-4 w-4" />,
    "/templates": <FileCode2 className="h-4 w-4" />,
    "/about": <HelpCircle className="h-4 w-4" />,
  };

  return (
    <div className="sm:hidden w-screen fixed bottom-0 z-9999">
      <div className="bg-background/85 backdrop-blur-xl border border-border/50 shadow-lg rounded-tl-4xl rounded-tr-4xl flex items-center justify-evenly">
        <ul className="flex justify-evenly items-center text-muted-foreground">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="py-4 px-5 flex items-center flex-col w-auto"
                aria-current={currentPath === link.href ? "page" : undefined}
              >
                {NavIcons[link.href]}
                <span className="text-sm transition-colors hover:text-primary">{link.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}