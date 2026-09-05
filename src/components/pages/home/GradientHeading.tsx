import React from "react";
import { cn } from "@/lib/utils";

interface GradientHeadingProps {
  title: string;
  subtitle?: string;
  className?: string;
  align?: "left" | "center" | "right";
}

export function GradientHeading({ title, subtitle, className, align = "center" }: GradientHeadingProps) {
  return (
    <div className={cn("flex flex-col gap-4 mb-12", {
      "items-start text-left": align === "left",
      "items-center text-center": align === "center",
      "items-end text-right": align === "right",
    }, className)}>
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-foreground via-foreground/90 to-primary/80 pb-2">
        {title}
      </h1>
      {subtitle && (
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
          {subtitle}
        </p>
      )}
    </div>
  );
}
