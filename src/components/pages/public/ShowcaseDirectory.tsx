import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, LayoutGrid, List, ArrowRight, ExternalLink, ChevronDown, Star } from "lucide-react";

// Expanded Mock Data
const projects = [
  {
    id: "vite",
    title: "Vite",
    description: "The next generation frontend tooling. Built their interactive component playground with Showcrate.",
    image: "bg-gradient-to-br from-[#646cff]/20 to-[#bd34fe]/20",
    border: "border-[#646cff]/30",
    hover: "hover:border-[#646cff] hover:shadow-[0_0_40px_rgba(100,108,255,0.3)]",
    logo: "bg-[#646cff]",
    tags: ["Frontend Tooling", "Interactive"],
    addedDate: "2026-08-15",
    featured: true,
  },
  {
    id: "tailwindcss",
    title: "Tailwind CSS",
    description: "A utility-first CSS framework. Utilizing Showcrate to demonstrate complex CSS animations live.",
    image: "bg-gradient-to-br from-[#38bdf8]/20 to-[#0ea5e9]/20",
    border: "border-[#38bdf8]/30",
    hover: "hover:border-[#38bdf8] hover:shadow-[0_0_40px_rgba(56,189,248,0.3)]",
    logo: "bg-[#38bdf8]",
    tags: ["CSS Framework", "Live Preview"],
    addedDate: "2026-07-20",
    featured: true,
  },
  {
    id: "react-query",
    title: "React Query",
    description: "Powerful asynchronous state management. Interactive examples powered by Showcrate WebContainers.",
    image: "bg-gradient-to-br from-[#ff4154]/20 to-[#ff4154]/5",
    border: "border-[#ff4154]/30",
    hover: "hover:border-[#ff4154] hover:shadow-[0_0_40px_rgba(255,65,84,0.3)]",
    logo: "bg-[#ff4154]",
    tags: ["Data Fetching", "WebContainers"],
    addedDate: "2026-08-01",
    featured: false,
  },
  {
    id: "framer-motion",
    title: "Framer Motion",
    description: "Production-ready animation library for React. Interactive animation builder made with Showcrate.",
    image: "bg-gradient-to-br from-[#ff008c]/20 to-[#d309e1]/20",
    border: "border-[#ff008c]/30",
    hover: "hover:border-[#ff008c] hover:shadow-[0_0_40px_rgba(255,0,140,0.3)]",
    logo: "bg-[#ff008c]",
    tags: ["Animation", "React"],
    addedDate: "2026-09-01",
    featured: true,
  },
  {
    id: "astro",
    title: "Astro",
    description: "The web framework for content-driven websites. Interactive island architecture demonstrations.",
    image: "bg-gradient-to-br from-[#ff5d01]/20 to-[#ff5d01]/5",
    border: "border-[#ff5d01]/30",
    hover: "hover:border-[#ff5d01] hover:shadow-[0_0_40px_rgba(255,93,1,0.3)]",
    logo: "bg-[#ff5d01]",
    tags: ["Frontend Tooling", "Framework"],
    addedDate: "2026-08-25",
    featured: false,
  },
  {
    id: "prisma",
    title: "Prisma",
    description: "Next-generation Node.js and TypeScript ORM. Live database schema visualizer in docs.",
    image: "bg-gradient-to-br from-[#0c344b]/40 to-[#0c344b]/10",
    border: "border-[#0c344b]/50",
    hover: "hover:border-[#0c344b] hover:shadow-[0_0_40px_rgba(12,52,75,0.4)]",
    logo: "bg-[#0c344b]",
    tags: ["Database", "TypeScript"],
    addedDate: "2026-06-10",
    featured: false,
  },
  {
    id: "trpc",
    title: "tRPC",
    description: "End-to-end typesafe APIs made easy. Interactive client-server type inference playgrounds.",
    image: "bg-gradient-to-br from-[#398ccb]/20 to-[#398ccb]/5",
    border: "border-[#398ccb]/30",
    hover: "hover:border-[#398ccb] hover:shadow-[0_0_40px_rgba(57,140,203,0.3)]",
    logo: "bg-[#398ccb]",
    tags: ["Data Fetching", "TypeScript"],
    addedDate: "2026-05-15",
    featured: false,
  }
];

// Extract unique tags
const allTags = Array.from(new Set(projects.flatMap(p => p.tags))).sort();

type SortOption = "featured" | "newest" | "az";

export function ShowcaseDirectory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>("featured");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isSortOpen, setIsSortOpen] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Ctrl+K Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleTag = (tag: string) => {
    setActiveTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Filter and Sort Logic
  const filteredAndSortedProjects = useMemo(() => {
    let result = projects.filter(project => {
      const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            project.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTags = activeTags.length === 0 || activeTags.every(tag => project.tags.includes(tag));
      return matchesSearch && matchesTags;
    });

    result.sort((a, b) => {
      if (sortOption === "featured") {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return 0; // fallback to original order
      } else if (sortOption === "newest") {
        return new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime();
      } else if (sortOption === "az") {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    return result;
  }, [searchQuery, activeTags, sortOption]);

  return (
    <div className="w-full">
      {/* Hero Section with Search */}
      <div className="text-center max-w-4xl 2xl:max-w-6xl mx-auto mb-16 pt-32 lg:pt-40">
        
        {/* Centered Search Bar */}
        <div className="relative w-full max-w-lg mx-auto mb-8 z-20">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-12 pr-16 py-3 bg-card/80 backdrop-blur-xl border border-border/50 rounded-full text-base focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all shadow-xl placeholder:text-muted-foreground/60"
          />
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded border border-border bg-muted/80 text-[10px] font-mono text-muted-foreground shadow-sm">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl 2xl:text-8xl font-extrabold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50">
          Built with Showcrate
        </h1>
        <p className="text-xl sm:text-2xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          Discover how the best teams in the world are transforming their static docs into interactive learning experiences.
        </p>
      </div>

      {/* Toolbar */}
      <div className="bg-card/80 backdrop-blur-xl border-b border-border/50 pb-6 pt-4 mb-12 shadow-sm">
        <div className="flex flex-col gap-4">
          
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
            {/* Left side empty or could have total count */}
            <div className="text-sm text-muted-foreground font-medium hidden sm:block">
              {filteredAndSortedProjects.length} projects found
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
              
              {/* Sort Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setIsSortOpen(!isSortOpen)}
                  onBlur={() => setTimeout(() => setIsSortOpen(false), 200)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-card/50 border border-border/50 rounded-full text-sm font-medium hover:bg-muted transition-colors whitespace-nowrap"
                >
                  Sort: {sortOption === 'featured' ? 'Featured' : sortOption === 'newest' ? 'Newest' : 'A-Z'}
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
                <AnimatePresence>
                  {isSortOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-40 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
                    >
                      <div className="flex flex-col p-1">
                        <button onClick={() => { setSortOption('featured'); setIsSortOpen(false); }} className={`px-3 py-2 text-left text-sm rounded-lg hover:bg-muted ${sortOption === 'featured' ? 'bg-primary/10 text-primary font-medium' : ''}`}>Featured</button>
                        <button onClick={() => { setSortOption('newest'); setIsSortOpen(false); }} className={`px-3 py-2 text-left text-sm rounded-lg hover:bg-muted ${sortOption === 'newest' ? 'bg-primary/10 text-primary font-medium' : ''}`}>Newest</button>
                        <button onClick={() => { setSortOption('az'); setIsSortOpen(false); }} className={`px-3 py-2 text-left text-sm rounded-lg hover:bg-muted ${sortOption === 'az' ? 'bg-primary/10 text-primary font-medium' : ''}`}>Alphabetical</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* View Toggle */}
              <div className="flex items-center bg-card/50 border border-border/50 rounded-full p-1 shrink-0">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-full transition-all ${viewMode === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-full transition-all ${viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>

          {/* Tags */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-2 shrink-0">Filter:</span>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  activeTags.includes(tag) 
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                    : 'bg-card/50 text-muted-foreground border-border/50 hover:bg-muted'
                }`}
              >
                {tag}
              </button>
            ))}
            {activeTags.length > 0 && (
              <button 
                onClick={() => setActiveTags([])}
                className="shrink-0 px-2 py-1 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 ml-2"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results Grid/List */}
      <motion.div layout className={`w-full ${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 lg:gap-8 2xl:gap-10' : 'flex flex-col gap-4'}`}>
        <AnimatePresence mode="popLayout">
          {filteredAndSortedProjects.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="col-span-full py-20 text-center"
            >
              <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-bold mb-2">No projects found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters to find what you're looking for.</p>
              <button 
                onClick={() => { setSearchQuery(""); setActiveTags([]); }}
                className="mt-6 text-primary hover:underline font-medium"
              >
                Clear all filters
              </button>
            </motion.div>
          ) : (
            filteredAndSortedProjects.map((project) => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.3 }}
                key={project.id}
                className={`group relative rounded-3xl border bg-card/40 backdrop-blur-sm overflow-hidden transition-colors duration-500 ${project.border} ${project.hover} ${viewMode === 'list' ? 'flex flex-row p-6' : 'flex flex-col'}`}
              >
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ${project.image}`}></div>
                
                {/* Logo & Header */}
                <div className={`${viewMode === 'list' ? 'mr-6 shrink-0' : 'p-6 lg:p-8 pb-0'} relative z-10 flex flex-col`}>
                  <div className={`flex items-start ${viewMode === 'list' ? 'flex-col gap-4' : 'justify-between mb-8'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl shadow-lg flex items-center justify-center ${project.logo}`}>
                        <div className="w-6 h-6 bg-white/20 rounded-sm"></div>
                      </div>
                      <div className={viewMode === 'list' ? 'hidden' : 'block'}>
                        <h3 className="text-2xl font-bold text-foreground">{project.title}</h3>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {project.tags.map(tag => (
                            <span key={tag} className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-sm">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    {viewMode === 'grid' && (
                      <button className="rounded-full w-10 h-10 flex items-center justify-center hover:bg-background/50 group-hover:text-primary transition-colors text-muted-foreground shrink-0">
                        <ExternalLink className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Content */}
                <div className={`${viewMode === 'list' ? 'flex-1 flex flex-col justify-center' : 'px-6 lg:px-8 pb-6 lg:pb-8 flex-1'} relative z-10`}>
                  {viewMode === 'list' && (
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-bold text-foreground">{project.title}</h3>
                      <div className="flex gap-2">
                        {project.tags.map(tag => (
                          <span key={tag} className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-sm">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    {project.description}
                  </p>
                </div>
                

                
                {/* List View Arrow */}
                {viewMode === 'list' && (
                  <div className="flex items-center justify-center pr-6 text-muted-foreground/30 group-hover:text-primary transition-colors group-hover:translate-x-1 duration-300 relative z-10">
                    <ExternalLink className="w-5 h-5" />
                  </div>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
