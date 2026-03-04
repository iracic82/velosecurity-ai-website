"use client";

import { motion } from "framer-motion";
import { Brain, Cloud, Database, Network, Shield, Cog } from "lucide-react";

const categories = [
  {
    name: "AI/ML",
    icon: Brain,
    description:
      "Machine learning models and intelligent automation transforming enterprise operations.",
    color: "#00d4ff",
  },
  {
    name: "Cloud",
    icon: Cloud,
    description:
      "Cloud-native migrations and multi-cloud architectures for scalable infrastructure.",
    color: "#3b82f6",
  },
  {
    name: "Data",
    icon: Database,
    description:
      "Data pipeline engineering, governance frameworks, and analytics platforms.",
    color: "#00ff88",
  },
  {
    name: "Networking",
    icon: Network,
    description:
      "Enterprise network design, optimization, and intelligent traffic management.",
    color: "#f59e0b",
  },
  {
    name: "Security",
    icon: Shield,
    description:
      "Threat detection, zero-trust architectures, and compliance-driven security programs.",
    color: "#ef4444",
  },
  {
    name: "Robotics",
    icon: Cog,
    description:
      "AI-powered robotics solutions for inspection, automation, and industrial applications.",
    color: "#7c3aed",
  },
];

export function CaseStudies() {
  return (
    <section id="case-studies" className="relative py-28 lg:py-36">
      <div className="absolute inset-0 grid-bg opacity-30" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <p className="section-label mb-4">Proven Results</p>
          <h2 className="font-display text-4xl lg:text-6xl font-extrabold mb-5">
            Case <span className="gradient-text-static">Studies</span>
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto leading-relaxed">
            Real-world results across industries and domains.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: i * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="card-glow group p-7 rounded-2xl cursor-pointer"
            >
              {/* Icon with colored glow */}
              <div className="relative mb-5">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300"
                  style={{ backgroundColor: `${cat.color}10` }}
                >
                  <cat.icon
                    className="w-5 h-5 transition-colors duration-300"
                    style={{ color: cat.color }}
                  />
                </div>
                <div
                  className="absolute inset-0 rounded-xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500"
                  style={{ backgroundColor: cat.color }}
                />
              </div>

              <h3 className="font-display text-lg font-bold mb-2 group-hover:text-accent transition-colors duration-300">
                {cat.name}
              </h3>
              <p className="text-sm text-muted leading-relaxed">
                {cat.description}
              </p>

              <div className="mt-5 pt-4 border-t border-border/50">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted group-hover:text-accent transition-colors duration-300">
                  Coming soon &rarr;
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
