"use client";

import { motion } from "framer-motion";
import { Radar, Lock, ShieldCheck } from "lucide-react";

const pillars = [
  {
    icon: Radar,
    title: "Discover",
    color: "#00d4ff",
    subtitle: "Find every agent. Including the ones nobody registered.",
    points: [
      "Every agent gets a cryptographically verifiable identity published to DNS you control",
      "Not a registry. Not an app store. YOUR DNS, YOUR namespace",
      "The VeloSecurity engine scans, indexes, and inventories every agent across your organization",
      "Shadow agents detected automatically — no opt-in required",
      "IETF standard (RFC 9460) — works with any DNS provider you already use",
    ],
  },
  {
    icon: Lock,
    title: "Connect",
    color: "#7c3aed",
    subtitle: "Zero-trust. No middleman. No network changes.",
    points: [
      "Direct agent-to-agent connectivity through encrypted overlay",
      "No third-party proxy routing your traffic. No cloud provider in the middle",
      "No open ports, no VPN, no firewall changes required",
      "Cryptographic identity per agent, verified at every connection",
      "Works across clouds, on-prem, and edge — all under your administrative control",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Enforce",
    color: "#00ff88",
    subtitle: "One policy. Four enforcement layers. All under your control.",
    points: [
      "Block unauthorized callers at DNS — before TCP even reaches the agent",
      "Inspect actual traffic at the proxy with verified context — mandatory, not opt-in",
      "CEL custom rules — from domain blocking to tool-level restrictions",
      "Same policy document enforced at DNS, caller SDK, target middleware, and proxy",
      "Audit trail for every policy decision — who called what, when, and what happened",
    ],
  },
];

export function FabricPillars() {
  return (
    <section className="relative py-28 lg:py-36">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-20"
        >
          <p className="section-label mb-4">AI Fabric</p>
          <h2 className="font-display text-4xl lg:text-5xl font-extrabold mb-5">
            <span className="gradient-text-static">Discover. Connect. Enforce.</span>
          </h2>
          <p className="text-muted text-lg max-w-2xl leading-relaxed">
            Three capabilities, one fabric. All running on infrastructure
            you own and control.
          </p>
        </motion.div>

        <div className="space-y-8">
          {pillars.map((pillar, idx) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="card-glow rounded-2xl p-8 lg:p-10"
            >
              <div className="flex flex-col lg:flex-row lg:items-start gap-8">
                {/* Left: icon + title */}
                <div className="lg:w-1/3">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                    style={{ backgroundColor: `${pillar.color}10` }}
                  >
                    <pillar.icon
                      className="w-7 h-7"
                      style={{ color: pillar.color }}
                    />
                  </div>
                  <h3 className="font-display text-3xl font-bold mb-2">
                    {pillar.title}
                  </h3>
                  <p className="text-muted text-base leading-relaxed">
                    {pillar.subtitle}
                  </p>
                </div>

                {/* Right: points */}
                <div className="lg:w-2/3">
                  <ul className="space-y-4">
                    {pillar.points.map((point, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div
                          className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                          style={{ backgroundColor: pillar.color }}
                        />
                        <span className="text-foreground/90 text-sm leading-relaxed">
                          {point}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
