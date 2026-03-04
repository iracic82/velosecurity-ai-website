"use client";

import { motion } from "framer-motion";
import { ExternalLink, Globe, Server } from "lucide-react";
import Link from "next/link";

const demos = [
  {
    name: "DNS-AID",
    description:
      "AI-powered DNS intelligence and analytics platform. Real-time threat detection, anomaly identification, and automated DNS security management.",
    icon: Globe,
    status: "Live Demo",
    tags: ["DNS Security", "AI/ML", "Threat Detection"],
    gradient: "from-cyan-500/10 via-blue-500/5 to-transparent",
  },
  {
    name: "IPAM for Agents",
    description:
      "Intelligent IP Address Management designed for agentic AI workflows. Automated allocation, conflict detection, and network-aware agent orchestration.",
    icon: Server,
    status: "Coming Soon",
    tags: ["IPAM", "Agentic AI", "Network Automation"],
    gradient: "from-violet-500/10 via-purple-500/5 to-transparent",
  },
];

export function Demos() {
  return (
    <section id="demos" className="relative py-28 lg:py-36">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface/30 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <p className="section-label mb-4">See It In Action</p>
          <h2 className="font-display text-4xl lg:text-6xl font-extrabold mb-5">
            Product <span className="gradient-text-static">Demos</span>
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto leading-relaxed">
            Experience our AI-powered tools firsthand.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {demos.map((demo, i) => (
            <motion.div
              key={demo.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
            >
              <div className="card-glow group relative h-full p-8 rounded-2xl overflow-hidden">
                {/* Background gradient */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${demo.gradient} opacity-50`}
                />

                <div className="relative">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-accent/[0.08] border border-accent/10 flex items-center justify-center group-hover:border-accent/25 transition-colors duration-300">
                      <demo.icon className="w-6 h-6 text-accent" />
                    </div>
                    <span
                      className={`tag px-3 py-1.5 rounded-full ${
                        demo.status === "Live Demo"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {demo.status}
                    </span>
                  </div>

                  <h3 className="font-display text-2xl font-bold mb-3 group-hover:text-accent transition-colors duration-300">
                    {demo.name}
                  </h3>
                  <p className="text-muted text-sm leading-relaxed mb-6">
                    {demo.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-8">
                    {demo.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.03] border border-border text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <Link
                    href="#contact"
                    className="inline-flex items-center gap-2 text-sm font-display font-bold uppercase tracking-wider text-accent hover:text-accent/80 transition-colors"
                  >
                    {demo.status === "Live Demo"
                      ? "Try Demo"
                      : "Request Access"}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
