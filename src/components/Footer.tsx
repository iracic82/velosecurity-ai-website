"use client";

import Link from "next/link";
import { Shield } from "lucide-react";

const footerLinks = {
  Services: [
    { name: "AI Consulting", href: "#services" },
    { name: "AI Strategy", href: "#services" },
    { name: "Agentic AI", href: "#services" },
    { name: "Network Security", href: "#services" },
    { name: "Cloud Consulting", href: "#services" },
  ],
  Company: [
    { name: "About", href: "/founder" },
    { name: "Case Studies", href: "#case-studies" },
    { name: "Blog", href: "/blog" },
    { name: "Careers", href: "#" },
  ],
  Resources: [
    { name: "Demos", href: "#demos" },
    { name: "Community", href: "#community" },
    { name: "Documentation", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="relative border-t border-border/50 bg-[#030306]">
      {/* Subtle gradient at top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-5">
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 bg-accent/10 rounded-lg rotate-45" />
                <Shield
                  className="w-8 h-8 text-accent relative z-10 p-1.5"
                  strokeWidth={1.5}
                />
              </div>
              <span className="font-display text-xl font-bold tracking-tight">
                <span className="text-foreground">Velo</span>
                <span className="text-accent">Security AI</span>
              </span>
            </Link>
            <p className="text-sm text-muted leading-relaxed max-w-sm">
              AI-powered cybersecurity and consulting. Transforming enterprises
              from legacy to leading edge.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-5">
                {title}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted hover:text-accent transition-colors duration-300"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-14 pt-8 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted/60">
            &copy; {new Date().getFullYear()} VeloSecurity AI. All rights
            reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="#"
              className="text-xs text-muted/60 hover:text-muted transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="#"
              className="text-xs text-muted/60 hover:text-muted transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
