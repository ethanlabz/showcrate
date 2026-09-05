import React, { useState } from "react";
import { GlassCard } from "./GlassCard";
import { Check, X } from "lucide-react";
import { motion } from "framer-motion";

const plans = [
  {
    name: "Hobby",
    description: "Perfect for individuals and small projects.",
    price: { monthly: "$0", yearly: "$0" },
    features: [
      "Up to 3 environments",
      "Basic analytics",
      "Community support",
      "Standard compute",
    ],
    notIncluded: ["Custom domains", "Team collaboration", "Priority support"],
    buttonText: "Start for free",
    popular: false,
  },
  {
    name: "Pro",
    description: "For professionals and growing teams.",
    price: { monthly: "$19", yearly: "$15" },
    features: [
      "Unlimited environments",
      "Advanced analytics",
      "Custom domains",
      "Fast compute instances",
      "Team collaboration (up to 5)",
    ],
    notIncluded: ["SSO & SAML", "Dedicated account manager"],
    buttonText: "Upgrade to Pro",
    popular: true,
  },
  {
    name: "Enterprise",
    description: "For large organizations with custom needs.",
    price: { monthly: "Custom", yearly: "Custom" },
    features: [
      "Everything in Pro",
      "SSO & SAML",
      "Dedicated account manager",
      "Custom compute scaling",
      "99.9% Uptime SLA",
      "On-premise deployment options",
    ],
    notIncluded: [],
    buttonText: "Contact Sales",
    popular: false,
  }
];

export function PricingTable() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");

  return (
    <div className="flex flex-col items-center w-full max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-12 p-1.5 bg-muted/50 rounded-full border border-border/50 backdrop-blur-sm">
        <button
          onClick={() => setBilling("monthly")}
          className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${billing === "monthly" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBilling("yearly")}
          className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${billing === "yearly" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Yearly <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Save 20%</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
        {plans.map((plan, i) => (
          <GlassCard 
            key={plan.name} 
            className={`p-8 flex flex-col h-full relative ${plan.popular ? 'border-primary/50 shadow-primary/10' : ''}`}
            hoverEffect={false}
          >
            {plan.popular && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-xs font-bold uppercase tracking-wider py-1 px-4 rounded-full shadow-lg">
                Most Popular
              </div>
            )}
            
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <p className="text-muted-foreground text-sm h-10">{plan.description}</p>
            </div>
            
            <div className="mb-8">
              <span className="text-5xl font-extrabold tracking-tight">
                {plan.price[billing]}
              </span>
              {plan.price[billing] !== "Custom" && (
                <span className="text-muted-foreground">/mo</span>
              )}
            </div>
            
            <button className={`w-full py-3 rounded-lg font-medium mb-8 transition-colors ${plan.popular ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
              {plan.buttonText}
            </button>
            
            <div className="flex-1 flex flex-col gap-4">
              <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-1">What's included</p>
              {plan.features.map(f => (
                <div key={f} className="flex items-start gap-3">
                  <div className="mt-0.5 bg-primary/20 p-0.5 rounded-full text-primary shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm text-foreground/90">{f}</span>
                </div>
              ))}
              
              {plan.notIncluded.map(f => (
                <div key={f} className="flex items-start gap-3 opacity-50">
                  <div className="mt-0.5 p-0.5 rounded-full shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm">{f}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
