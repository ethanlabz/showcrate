import { LayoutGrid, FileCode2, LogIn, UserPlus, FolderKanban } from "lucide-react";

interface NavLink {
  href: string;
  label: string;
}

interface Props {
  navLinks: NavLink[];
  currentPath: string;
}

export default function MobileNav({ currentPath }: Props) {
  return (
    <div className="sm:hidden w-screen fixed bottom-0 left-0 right-0 z-50">
      <nav className="bg-background/95 backdrop-blur-xl border-t border-border/50 px-3 py-2 flex items-center justify-around shadow-2xl">
        <a
          href="/showcase"
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-lg text-[10px] font-medium transition-colors ${
            currentPath === '/showcase' ? 'text-[#C9A96A]' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
          <span>Showcase</span>
        </a>

        <a
          href="/templates"
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-lg text-[10px] font-medium transition-colors ${
            currentPath === '/templates' ? 'text-[#C9A96A]' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileCode2 className="h-4 w-4" />
          <span>Templates</span>
        </a>

        {/* Central Dashboard CTA */}
        <a
          href="/dashboard"
          className="flex flex-col items-center justify-center -mt-5 group"
          aria-label="Dashboard"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#C9A96A] text-[#14161B] shadow-lg transition-transform group-hover:scale-105 border border-[#C9A96A]/30">
            <FolderKanban className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-semibold text-[#C9A96A] mt-0.5">Dashboard</span>
        </a>

        <a
          href="/auth/login"
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-lg text-[10px] font-medium transition-colors ${
            currentPath === '/auth/login' ? 'text-[#C9A96A]' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <LogIn className="h-4 w-4" />
          <span>Log in</span>
        </a>

        <a
          href="/auth/signup"
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-lg text-[10px] font-medium transition-colors ${
            currentPath === '/auth/signup' ? 'text-[#C9A96A]' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <UserPlus className="h-4 w-4" />
          <span>Sign up</span>
        </a>
      </nav>
    </div>
  );
}
