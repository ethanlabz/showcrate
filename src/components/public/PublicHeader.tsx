"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const NAV_LINKS = [
  { href: "/showcase", label: "Showcase" },
  { href: "/docs", label: "Docs" },
  { href: "/pricing", label: "Pricing" },
];

export function PublicHeader() {
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-[var(--background)]/90 border-b border-[var(--border)] backdrop-blur-md"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 group">
            <span className="text-[var(--accent)] text-lg">♠</span>
            <span
              className="font-heading font-semibold text-base tracking-tight text-[var(--text)] group-hover:text-[var(--accent)] transition-colors duration-200"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Showcrate
            </span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors duration-150"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            <a
              href="/auth/login"
              className="text-sm px-3 py-1.5 text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
            >
              Sign in
            </a>
            <a
              href="/auth/signup"
              className="text-sm px-4 py-1.5 rounded-[var(--radius-md)] bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] transition-colors duration-150 font-medium"
            >
              Get started
            </a>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text)]"
              aria-label="Toggle menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {mobileOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <path d="M3 12h18M3 6h18M3 18h18" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--background)] px-4 py-4 space-y-3">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="block text-sm text-[var(--text-secondary)] hover:text-[var(--text)] py-1"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            <a
              href="/auth/login"
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text)] py-1"
            >
              Sign in
            </a>
            <a
              href="/auth/signup"
              className="text-sm text-center px-4 py-2 rounded-[var(--radius-md)] bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] font-medium"
            >
              Get started
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
