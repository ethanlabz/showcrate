import React from "react";
import { GlassCard } from "./GlassCard";
import { Mail, MessageSquare, Phone } from "lucide-react";

export function ContactForm() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 max-w-6xl mx-auto">
      {/* Left Info Column */}
      <div className="flex flex-col gap-8">
        <div>
          <h2 className="text-3xl font-bold mb-4">Get in touch</h2>
          <p className="text-muted-foreground leading-relaxed">
            Have a question about pricing, need a custom plan, or want to report an issue? Our team is ready to help. Fill out the form or reach out directly.
          </p>
        </div>
        
        <div className="flex flex-col gap-6 mt-4">
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 p-3 rounded-xl text-primary">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Chat with sales</h4>
              <p className="text-sm text-muted-foreground">Speak to our friendly team.</p>
              <a href="mailto:sales@showcrate.com" className="text-sm font-medium text-primary hover:underline mt-1 inline-block">sales@showcrate.com</a>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 p-3 rounded-xl text-primary">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Chat to support</h4>
              <p className="text-sm text-muted-foreground">We're here to help.</p>
              <a href="mailto:support@showcrate.com" className="text-sm font-medium text-primary hover:underline mt-1 inline-block">support@showcrate.com</a>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 p-3 rounded-xl text-primary">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Call us</h4>
              <p className="text-sm text-muted-foreground">Mon-Fri from 8am to 5pm.</p>
              <a href="tel:+1(555)000-0000" className="text-sm font-medium text-primary hover:underline mt-1 inline-block">+1 (555) 000-0000</a>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Form Column */}
      <GlassCard className="p-8" hoverEffect={false}>
        <form className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="firstName" className="text-sm font-medium">First name</label>
              <input type="text" id="firstName" className="bg-background/50 border border-border/50 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" placeholder="First name" />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="lastName" className="text-sm font-medium">Last name</label>
              <input type="text" id="lastName" className="bg-background/50 border border-border/50 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" placeholder="Last name" />
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input type="email" id="email" className="bg-background/50 border border-border/50 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" placeholder="you@company.com" />
          </div>
          
          <div className="flex flex-col gap-2">
            <label htmlFor="message" className="text-sm font-medium">Message</label>
            <textarea id="message" rows={4} className="bg-background/50 border border-border/50 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none" placeholder="Leave us a message..."></textarea>
          </div>
          
          <button type="button" className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-lg hover:bg-primary/90 transition-colors mt-2 shadow-md">
            Send message
          </button>
        </form>
      </GlassCard>
    </div>
  );
}
