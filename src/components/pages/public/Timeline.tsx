import React from "react";
import { GlassCard } from "./GlassCard";
import { motion } from "framer-motion";

const events = [
  {
    version: "v2.0.0",
    date: "September 1, 2026",
    title: "The Performance Update",
    description: "A complete rewrite of our core rendering engine, resulting in 10x faster environment startups and significantly reduced memory usage in the browser.",
    features: [
      "New WebAssembly based engine",
      "Real-time multiplayer cursor synchronization",
      "Custom domain support for Pro users",
      "Dark mode improvements"
    ]
  },
  {
    version: "v1.5.0",
    date: "August 15, 2026",
    title: "Integrations Galore",
    description: "Connect Showcrate with your favorite tools. We've added official integrations for GitHub, GitLab, and Bitbucket.",
    features: [
      "One-click repository import",
      "Automatic PR preview environments",
      "Environment variable management UI"
    ]
  },
  {
    version: "v1.4.2",
    date: "July 28, 2026",
    title: "Bug Fixes & Polish",
    description: "A minor release focused on squashing bugs reported by the community.",
    features: [
      "Fixed an issue with terminal line wrapping",
      "Improved performance of the file tree explorer",
      "Added support for hidden files"
    ]
  }
];

export function Timeline() {
  return (
    <div className="max-w-4xl mx-auto relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary before:via-primary/50 before:to-transparent">
      {events.map((event, index) => (
        <motion.div 
          key={event.version} 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ margin: "-100px" }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-12"
        >
          {/* Timeline Node */}
          <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-primary shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ml-0 z-10">
            <div className="w-2 h-2 rounded-full bg-background" />
          </div>
          
          {/* Content Card */}
          <GlassCard className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-6 md:p-8" hoverEffect={false}>
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex items-center gap-3">
                <span className="bg-primary/20 text-primary font-mono text-xs font-bold px-2 py-1 rounded">
                  {event.version}
                </span>
                <span className="text-sm text-muted-foreground">{event.date}</span>
              </div>
              <h3 className="text-xl font-bold text-foreground font-sans">{event.title}</h3>
            </div>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              {event.description}
            </p>
            <ul className="space-y-2">
              {event.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-1">•</span>
                  <span className="text-foreground/80">{f}</span>
                </li>
              ))}
            </ul>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );
}
