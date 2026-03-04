"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowRight, Shield } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

function CircuitBackground() {
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-[0.07]"
      viewBox="0 0 1200 800"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Circuit traces */}
      <path className="circuit-line" d="M0 400 H300 V200 H500 V400 H700" stroke="#00d4ff" strokeWidth="1" />
      <path className="circuit-line" d="M1200 300 H900 V500 H700 V300 H500" stroke="#00d4ff" strokeWidth="1" />
      <path className="circuit-line" d="M200 0 V200 H400 V400 H200 V600" stroke="#7c3aed" strokeWidth="1" />
      <path className="circuit-line" d="M800 800 V600 H1000 V400 H800 V200" stroke="#7c3aed" strokeWidth="1" />
      <path className="circuit-line" d="M600 0 V150 H800 V350 H600 V500" stroke="#00d4ff" strokeWidth="0.5" />
      <path className="circuit-line" d="M400 800 V650 H600 V450 H400 V300" stroke="#00ff88" strokeWidth="0.5" />

      {/* Nodes */}
      {[
        [300, 200], [500, 400], [700, 400], [500, 300],
        [400, 400], [200, 200], [800, 200], [600, 150],
        [200, 600], [800, 600], [1000, 400], [400, 650],
      ].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="3" fill="#00d4ff" opacity="0.6">
            <animate attributeName="opacity" values="0.2;0.8;0.2" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
          </circle>
          <circle cx={cx} cy={cy} r="8" fill="none" stroke="#00d4ff" strokeWidth="0.5" opacity="0.2">
            <animate attributeName="r" values="8;14;8" dur={`${3 + i * 0.2}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0;0.3" dur={`${3 + i * 0.2}s`} repeatCount="indefinite" />
          </circle>
        </g>
      ))}
    </svg>
  );
}

function FloatingShield() {
  return (
    <motion.div
      className="absolute right-[8%] top-1/2 -translate-y-1/2 hidden xl:block"
      animate={{ y: [0, -15, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className="relative w-[280px] h-[280px]">
        {/* Outer ring */}
        <motion.div
          className="absolute inset-0 rounded-full border border-accent/20"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-accent rounded-full" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 bg-accent-secondary rounded-full" />
        </motion.div>

        {/* Middle ring */}
        <motion.div
          className="absolute inset-6 rounded-full border border-accent-secondary/15"
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-accent rounded-full" />
        </motion.div>

        {/* Inner glow */}
        <div className="absolute inset-12 rounded-full bg-gradient-to-br from-accent/5 to-accent-secondary/5 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-accent/5 blur-xl" />
          <Shield className="w-16 h-16 text-accent/40" strokeWidth={1} />
        </div>

        {/* Orbiting dots */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-accent rounded-full"
            style={{ top: "50%", left: "50%" }}
            animate={{
              x: [0, Math.cos((i * 2.09)) * 120, 0],
              y: [0, Math.sin((i * 2.09)) * 120, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 1.3,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

const taglineWords = ["Automate.", "Optimize.", "Dominate."];

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden scanline">
      {/* Deep gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050510] via-[#050508] to-background" />

      {/* Grid */}
      <div className="absolute inset-0 grid-bg" />

      {/* Circuit animation */}
      <CircuitBackground />

      {/* Ambient light blobs */}
      <div className="absolute top-[10%] left-[15%] w-[500px] h-[500px] bg-accent/[0.03] rounded-full blur-[150px] pulse-glow" />
      <div className="absolute bottom-[10%] right-[20%] w-[600px] h-[600px] bg-accent-secondary/[0.04] rounded-full blur-[150px] pulse-glow" style={{ animationDelay: "2s" }} />
      <div className="absolute top-[50%] left-[50%] w-[300px] h-[300px] bg-accent-tertiary/[0.02] rounded-full blur-[120px] pulse-glow" style={{ animationDelay: "4s" }} />

      {/* Floating shield visualization */}
      <FloatingShield />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 w-full">
        <div className="max-w-3xl">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-accent/20 bg-accent/[0.05] mb-10"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            <span className="tag text-accent">
              AI-Powered Security & Consulting
            </span>
          </motion.div>

          {/* Tagline — staggered word reveal */}
          <div className="mb-8">
            {taglineWords.map((word, i) => (
              <motion.div
                key={word}
                initial={{ opacity: 0, y: 40, rotateX: -15 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{
                  duration: 0.7,
                  delay: 0.2 + i * 0.15,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <h1 className="font-display text-6xl sm:text-7xl lg:text-[6.5rem] font-extrabold tracking-tight leading-[0.95] glitch-hover">
                  <span className="gradient-text">{word}</span>
                </h1>
              </motion.div>
            ))}
          </div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="text-lg sm:text-xl text-muted max-w-xl leading-relaxed mb-10"
          >
            From legacy infrastructure to leading-edge AI — we transform
            enterprises with intelligent security, automation, and custom AI
            solutions.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="flex flex-col sm:flex-row items-start gap-4"
          >
            <Link
              href="#contact"
              className="group relative inline-flex items-center gap-2 px-8 py-4 font-display font-bold text-sm uppercase tracking-wider overflow-hidden rounded-xl"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-accent to-accent-secondary" />
              <span className="absolute inset-[1px] bg-background rounded-[11px] group-hover:bg-transparent transition-colors duration-300" />
              <span className="relative text-foreground group-hover:text-background transition-colors duration-300">
                Book a Discovery Session
              </span>
              <ArrowRight className="relative w-4 h-4 text-accent group-hover:text-background group-hover:translate-x-1 transition-all duration-300" />
            </Link>
            <Link
              href="#services"
              className="group inline-flex items-center gap-2 px-8 py-4 font-display font-bold text-sm uppercase tracking-wider text-muted hover:text-foreground border border-border hover:border-accent/30 rounded-xl transition-all duration-300"
            >
              Explore Services
              <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
            </Link>
          </motion.div>

          {/* Bottom stats bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="flex items-center gap-8 mt-20 pt-8 border-t border-border/50"
          >
            {[
              { value: "Enterprise", label: "Security First" },
              { value: "Agentic", label: "AI Powered" },
              { value: "Optimized", label: "Results Driven" },
            ].map((stat, i) => (
              <div key={stat.label} className="flex items-center gap-3">
                {i > 0 && <div className="w-px h-8 bg-border" />}
                <div className={i > 0 ? "pl-3" : ""}>
                  <p className="font-display font-bold text-sm text-foreground">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted">{stat.label}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
