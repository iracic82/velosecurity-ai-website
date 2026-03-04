"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Menu,
  X,
  Shield,
  Brain,
  Cloud,
  Network,
  Lock,
  Database,
  Bot,
  Cpu,
  FlaskConical,
  Lightbulb,
  Server,
  Globe,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

const services = [
  {
    category: "AI Services",
    items: [
      { name: "AI Consulting", icon: Brain, href: "#services" },
      { name: "AI Strategy", icon: Lightbulb, href: "#services" },
      { name: "AI PoC", icon: FlaskConical, href: "#services" },
      { name: "Agentic AI", icon: Bot, href: "#services" },
      { name: "Custom AI Solutions", icon: Cpu, href: "#services" },
    ],
  },
  {
    category: "Security & Network",
    items: [
      { name: "Network Security Consulting", icon: Network, href: "#services" },
      { name: "Network Security Strategy", icon: Shield, href: "#services" },
      { name: "Cyber Security Consulting", icon: Lock, href: "#services" },
      { name: "Cyber Security Strategy", icon: Shield, href: "#services" },
    ],
  },
  {
    category: "Cloud & Data",
    items: [
      { name: "Cloud Consulting", icon: Cloud, href: "#services" },
      { name: "Data Migration", icon: Database, href: "#services" },
      { name: "Data Governance", icon: Server, href: "#services" },
    ],
  },
];

const caseStudies = [
  { name: "AI/ML", href: "#case-studies" },
  { name: "Cloud", href: "#case-studies" },
  { name: "Data", href: "#case-studies" },
  { name: "Networking", href: "#case-studies" },
  { name: "Security", href: "#case-studies" },
  { name: "Robotics", href: "#case-studies" },
];

const navLinks = [
  { name: "Services", href: "#services", hasDropdown: true },
  { name: "Case Studies", href: "#case-studies", hasDropdown: true },
  { name: "Demos", href: "#demos", hasDropdown: false },
  { name: "Blog", href: "#blog", hasDropdown: false },
  { name: "Community", href: "#community", hasDropdown: false },
  { name: "About Us", href: "#about", hasDropdown: false },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "nav-blur bg-background/70 border-b border-border/50"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative w-9 h-9">
              <div className="absolute inset-0 bg-accent/10 rounded-lg rotate-45 group-hover:rotate-[225deg] transition-transform duration-500" />
              <Shield className="w-9 h-9 text-accent relative z-10 p-1.5" strokeWidth={1.5} />
            </div>
            <span className="font-display text-xl font-bold tracking-tight">
              <span className="text-foreground">Velo</span>
              <span className="text-accent">Security</span>
              <span className="text-accent"> AI</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-0.5">
            {navLinks.map((link) => (
              <div
                key={link.name}
                className="relative"
                onMouseEnter={() =>
                  link.hasDropdown && setActiveDropdown(link.name)
                }
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <Link
                  href={link.href}
                  className="group flex items-center gap-1 px-4 py-2 text-sm text-muted hover:text-foreground transition-colors rounded-lg"
                >
                  {link.name}
                  {link.hasDropdown && (
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-200 ${
                        activeDropdown === link.name ? "rotate-180 text-accent" : ""
                      }`}
                    />
                  )}
                  <span className="absolute bottom-0 left-4 right-4 h-px bg-accent scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                </Link>

                {/* Services Mega Menu */}
                <AnimatePresence>
                  {link.name === "Services" &&
                    activeDropdown === "Services" && (
                      <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute top-full left-1/2 -translate-x-1/2 pt-3 w-[720px]"
                      >
                        <div className="nav-blur bg-surface/90 border border-border/60 rounded-2xl p-6 shadow-2xl shadow-black/40">
                          <div className="grid grid-cols-3 gap-8">
                            {services.map((group) => (
                              <div key={group.category}>
                                <p className="section-label mb-4">
                                  {group.category}
                                </p>
                                <div className="space-y-0.5">
                                  {group.items.map((item) => (
                                    <Link
                                      key={item.name}
                                      href={item.href}
                                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-muted hover:text-foreground hover:bg-white/[0.03] transition-all group/item"
                                    >
                                      <div className="w-7 h-7 rounded-md bg-accent/[0.08] flex items-center justify-center group-hover/item:bg-accent/15 transition-colors">
                                        <item.icon className="w-3.5 h-3.5 text-accent/70 group-hover/item:text-accent transition-colors" />
                                      </div>
                                      <span>{item.name}</span>
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                  {/* Case Studies Dropdown */}
                  {link.name === "Case Studies" &&
                    activeDropdown === "Case Studies" && (
                      <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute top-full left-1/2 -translate-x-1/2 pt-3 w-[240px]"
                      >
                        <div className="nav-blur bg-surface/90 border border-border/60 rounded-xl p-2 shadow-2xl shadow-black/40">
                          {caseStudies.map((item) => (
                            <Link
                              key={item.name}
                              href={item.href}
                              className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm text-muted hover:text-foreground hover:bg-white/[0.03] transition-all"
                            >
                              <Globe className="w-3.5 h-3.5 text-accent/50" />
                              {item.name}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              href="#contact"
              className="group relative inline-flex items-center gap-2 px-6 py-2.5 font-display text-xs font-bold uppercase tracking-wider overflow-hidden rounded-lg"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-accent to-accent-secondary opacity-100" />
              <span className="relative text-background">Get Started</span>
              <ArrowRight className="relative w-3.5 h-3.5 text-background group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button
            className="lg:hidden p-2 text-muted hover:text-foreground transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden border-t border-border/50 nav-blur bg-background/95"
          >
            <div className="px-4 py-6 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="block px-4 py-3 text-sm text-muted hover:text-foreground hover:bg-surface-light rounded-lg transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <div className="pt-4">
                <Link
                  href="#contact"
                  className="block px-4 py-3 text-center text-sm font-display font-bold uppercase tracking-wider bg-gradient-to-r from-accent to-accent-secondary text-background rounded-lg"
                  onClick={() => setMobileOpen(false)}
                >
                  Get Started
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
