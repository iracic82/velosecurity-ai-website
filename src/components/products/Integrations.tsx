"use client";

import { motion } from "framer-motion";

const integrations = [
  {
    category: "DNS Infrastructure",
    items: ["Infoblox UDDI", "Infoblox Threat Defense", "NS1 (IBM)", "AWS Route 53", "Cloudflare", "BIND / PowerDNS"],
  },
  {
    category: "Agent Protocols",
    items: ["MCP (Model Context Protocol)", "A2A (Agent-to-Agent)", "HTTPS / REST"],
  },
  {
    category: "Open Source",
    items: ["Apache-2.0 discovery engine", "IETF draft standard", "Linux Foundation track", "PyPI package"],
  },
];

export function Integrations() {
  return (
    <section className="relative py-28 lg:py-36 bg-surface/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <p className="section-label mb-4">Ecosystem</p>
          <h2 className="font-display text-4xl lg:text-5xl font-extrabold mb-5">
            Works with{" "}
            <span className="gradient-text-static">what you have</span>
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto leading-relaxed">
            No rip-and-replace. AI Fabric plugs into DNS infrastructure
            you already run and protocols your agents already speak.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-6">
          {integrations.map((group, idx) => (
            <motion.div
              key={group.category}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className="card-glow rounded-2xl p-6"
            >
              <p className="font-display font-bold text-sm mb-4 text-accent">
                {group.category}
              </p>
              <ul className="space-y-2.5">
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2.5 text-sm text-foreground/80"
                  >
                    <span className="w-1 h-1 rounded-full bg-accent shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
