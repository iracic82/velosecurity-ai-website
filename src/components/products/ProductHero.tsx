"use client";

import { motion } from "framer-motion";
import { ArrowRight, Radar } from "lucide-react";
import Link from "next/link";

export function ProductHero() {
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.04]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(var(--accent) 1px, transparent 1px), linear-gradient(90deg, var(--accent) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
      </div>

      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/[0.03] rounded-full blur-[120px]" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-32 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/[0.05] mb-8">
            <Radar className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs font-semibold uppercase tracking-wider text-accent">
              AI Fabric
            </span>
          </div>

          <h1 className="font-display text-5xl lg:text-7xl font-extrabold leading-[1.05] mb-6">
            Your agents.{" "}
            <span className="gradient-text-static">Your network.</span>
            <br />
            Your control.
          </h1>

          <p className="text-muted text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
            Discover, connect, and enforce policy across AI agents — on
            infrastructure you own. No middleman. No third-party traffic
            steering. Standards-based.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="#contact"
              className="group relative inline-flex items-center gap-2 px-8 py-3 font-display text-sm font-bold uppercase tracking-wider overflow-hidden rounded-lg"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-accent to-accent-secondary" />
              <span className="relative text-background">Get Started</span>
              <ArrowRight className="relative w-4 h-4 text-background group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="#architecture"
              className="inline-flex items-center gap-2 px-8 py-3 font-display text-sm font-bold uppercase tracking-wider border border-border hover:border-accent/40 rounded-lg text-muted hover:text-foreground transition-colors"
            >
              See How It Works
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
