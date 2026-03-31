"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function Architecture() {
  return (
    <section id="architecture" className="relative py-28 lg:py-36">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <p className="section-label mb-4">No Middleman</p>
          <h2 className="font-display text-4xl lg:text-5xl font-extrabold mb-5">
            All in{" "}
            <span className="gradient-text-static">your control</span>
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto leading-relaxed">
            No third-party in the data path. No cloud proxy reading your
            payloads. Every component runs on your infrastructure.
          </p>
        </motion.div>

        {/* Before / After comparison */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Before */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="card-glow rounded-2xl p-8"
          >
            <p className="font-mono text-xs text-red-400 uppercase tracking-wider mb-4">
              Without AI Fabric
            </p>
            <div className="space-y-4 font-mono text-sm">
              <div className="flex items-center gap-3">
                <span className="text-foreground bg-surface-light px-3 py-2 rounded-lg">
                  Agent A
                </span>
                <ArrowRight className="w-4 h-4 text-muted shrink-0" />
                <span className="text-red-400 bg-red-400/10 px-3 py-2 rounded-lg border border-red-400/20">
                  Cloud Proxy
                </span>
                <ArrowRight className="w-4 h-4 text-muted shrink-0" />
                <span className="text-foreground bg-surface-light px-3 py-2 rounded-lg">
                  Agent B
                </span>
              </div>
              <ul className="space-y-2 text-xs text-muted pl-1">
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">&#x2717;</span>
                  Third party sees your traffic
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">&#x2717;</span>
                  They control routing and uptime
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">&#x2717;</span>
                  They go down, you go down
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">&#x2717;</span>
                  Agent identity = API key from a provider
                </li>
              </ul>
            </div>
          </motion.div>

          {/* After */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="card-glow rounded-2xl p-8 border-accent/10"
          >
            <p className="font-mono text-xs text-accent uppercase tracking-wider mb-4">
              With AI Fabric
            </p>
            <div className="space-y-4 font-mono text-sm">
              <div className="flex items-center gap-3">
                <span className="text-foreground bg-surface-light px-3 py-2 rounded-lg">
                  Agent A
                </span>
                <ArrowRight className="w-4 h-4 text-accent shrink-0" />
                <span className="text-accent bg-accent/10 px-3 py-2 rounded-lg border border-accent/20">
                  Your Engine
                </span>
                <ArrowRight className="w-4 h-4 text-accent shrink-0" />
                <span className="text-foreground bg-surface-light px-3 py-2 rounded-lg">
                  Agent B
                </span>
              </div>
              <ul className="space-y-2 text-xs text-muted pl-1">
                <li className="flex items-start gap-2">
                  <span className="text-accent-tertiary mt-0.5">&#x2713;</span>
                  You see your traffic — nobody else
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-tertiary mt-0.5">&#x2713;</span>
                  You control routing, policy, and uptime
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-tertiary mt-0.5">&#x2713;</span>
                  No external dependency in the data path
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-tertiary mt-0.5">&#x2713;</span>
                  Agent identity = cryptographic, tied to your DNS
                </li>
              </ul>
            </div>
          </motion.div>
        </div>

        {/* Key points */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-10 grid sm:grid-cols-3 gap-4"
        >
          {[
            {
              label: "Sovereign",
              text: "Your DNS, your namespace, your agents. No gatekeeper can de-list you.",
            },
            {
              label: "Standards-Based",
              text: "IETF RFC 9460. Not a proprietary protocol. Not a vendor lock-in.",
            },
            {
              label: "Zero New Infra",
              text: "Works with DNS you already run. No new systems, no new vendors.",
            },
          ].map((item) => (
            <div key={item.label} className="card-glow rounded-xl p-5">
              <p className="font-display font-bold text-sm mb-1 text-accent">
                {item.label}
              </p>
              <p className="text-xs text-muted leading-relaxed">
                {item.text}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
