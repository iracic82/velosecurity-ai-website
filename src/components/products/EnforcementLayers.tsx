"use client";

import { motion } from "framer-motion";

const layers = [
  {
    layer: "Layer 0",
    name: "DNS",
    description: "Block before TCP connection",
    detail: "Unauthorized callers get NXDOMAIN. The agent is never even reachable.",
    color: "#00d4ff",
    status: "shipped",
  },
  {
    layer: "Layer 1",
    name: "Caller SDK",
    description: "Policy check before sending",
    detail: "Caller evaluates policy locally. Don't even try if you'll be denied.",
    color: "#7c3aed",
    status: "shipped",
  },
  {
    layer: "Layer 2",
    name: "Target Middleware",
    description: "Policy check on receiving",
    detail: "Target agent rejects unauthorized requests at the application layer.",
    color: "#00ff88",
    status: "shipped",
  },
  {
    layer: "Layer 3",
    name: "Proxy",
    description: "Inspect actual traffic — mandatory",
    detail:
      "All traffic passes through. Context verified from real request, not self-reported. Rogue agents can't bypass this.",
    color: "#f59e0b",
    status: "coming",
  },
];

export function EnforcementLayers() {
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
          <p className="section-label mb-4">Defense In Depth</p>
          <h2 className="font-display text-4xl lg:text-5xl font-extrabold mb-5">
            One policy.{" "}
            <span className="gradient-text-static">Four layers.</span>
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto leading-relaxed">
            Write your policy once. The VeloSecurity engine enforces it at every
            layer — from DNS resolution to traffic inspection.
          </p>
        </motion.div>

        {/* Layer stack */}
        <div className="space-y-3">
          {layers.map((layer, i) => (
            <motion.div
              key={layer.layer}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="card-glow rounded-xl p-6 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              {/* Layer badge */}
              <div className="flex items-center gap-3 sm:w-48 shrink-0">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: layer.color }}
                />
                <div>
                  <span
                    className="font-mono text-xs font-bold uppercase tracking-wider"
                    style={{ color: layer.color }}
                  >
                    {layer.layer}
                  </span>
                  <p className="font-display font-bold text-sm">
                    {layer.name}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="flex-1">
                <p className="text-foreground text-sm font-medium mb-1">
                  {layer.description}
                </p>
                <p className="text-muted text-xs leading-relaxed">
                  {layer.detail}
                </p>
              </div>

              {/* Status */}
              <div className="shrink-0">
                {layer.status === "shipped" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-tertiary/10 text-accent-tertiary text-xs font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-tertiary" />
                    Live
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Coming
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* CEL callout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-10 card-glow rounded-xl p-6 border-accent/20"
        >
          <p className="font-mono text-xs text-accent mb-3 uppercase tracking-wider">
            Policy Example (CEL)
          </p>
          <div className="bg-background/60 rounded-lg p-4 font-mono text-sm space-y-1">
            <p className="text-muted">
              <span className="text-accent-secondary">// Block sandbox agents from calling production</span>
            </p>
            <p>
              <span className="text-accent">!</span>
              <span className="text-foreground">request.caller_domain.</span>
              <span className="text-accent-tertiary">endsWith</span>
              <span className="text-foreground">(</span>
              <span className="text-amber-300">&quot;.sandbox.corp.com&quot;</span>
              <span className="text-foreground">)</span>
            </p>
            <p className="text-muted mt-3">
              <span className="text-accent-secondary">// Restrict PII tools to authorized callers only</span>
            </p>
            <p>
              <span className="text-accent">!</span>
              <span className="text-foreground">(request.tool_name </span>
              <span className="text-accent">in</span>
              <span className="text-foreground"> [</span>
              <span className="text-amber-300">&quot;export_pii&quot;</span>
              <span className="text-foreground">, </span>
              <span className="text-amber-300">&quot;bulk_extract&quot;</span>
              <span className="text-foreground">])</span>
            </p>
          </div>
          <p className="text-muted text-xs mt-3">
            Same expressions enforced at DNS, SDK, middleware, and proxy.
            Rust CEL engine — ~2&micro;s per evaluation.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
