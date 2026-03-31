"use client";

import { motion } from "framer-motion";
import {
  UserX,
  SearchX,
  ShieldOff,
  Route,
  Crown,
} from "lucide-react";

const problems = [
  {
    icon: UserX,
    title: "No Agent Identity",
    description:
      "Agents have no standard identity. They're URLs, IP addresses, or API keys. No way to verify who you're talking to.",
  },
  {
    icon: SearchX,
    title: "No Discovery",
    description:
      "Nobody knows how many agents exist. Shadow agents across teams. No central inventory. No standard way to find them.",
  },
  {
    icon: ShieldOff,
    title: "No Policy Enforcement",
    description:
      "Who can call whom? Nobody knows. Every agent is reachable if you know the URL. Zero access control between agents.",
  },
  {
    icon: Route,
    title: "Traffic Through Middlemen",
    description:
      "Cloud proxies, SaaS relays, third-party gateways. Your agent traffic routes through infrastructure you don't own or control.",
  },
  {
    icon: Crown,
    title: "No Sovereignty",
    description:
      "Your agent namespace lives in someone else's registry. They control discovery. They can de-list you. App Store model for AI agents.",
  },
];

export function ProblemStatement() {
  return (
    <section className="relative py-28 lg:py-36 bg-surface/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <p className="section-label mb-4">The Problem</p>
          <h2 className="font-display text-4xl lg:text-5xl font-extrabold mb-5">
            AI agents are the new{" "}
            <span className="gradient-text-static">shadow IT</span>
          </h2>
          <p className="text-muted text-lg max-w-2xl leading-relaxed">
            Dozens of agents across teams. No inventory. No identity. No
            control. Your CISO can't see what's talking to what.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {problems.map((problem, i) => (
            <motion.div
              key={problem.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="card-glow p-6 rounded-2xl"
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 bg-red-500/10">
                <problem.icon className="w-5 h-5 text-red-400" />
              </div>
              <h4 className="font-display font-bold text-base mb-2">
                {problem.title}
              </h4>
              <p className="text-sm text-muted leading-relaxed">
                {problem.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
