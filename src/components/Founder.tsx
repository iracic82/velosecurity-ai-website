"use client";

import { motion } from "framer-motion";
import {
  Github,
  Linkedin,
  Mail,
  Twitter,
  ArrowRight,
  Shield,
  Network,
  Brain,
  Code2,
  Cloud,
  Lock,
  Briefcase,
  PenLine,
} from "lucide-react";
import Link from "next/link";

type RecentPost = {
  slug: string;
  title: string;
  date: string;
};

// Edit this file to update the founder bio, journey, expertise, and links.
// Content is intentionally co-located with markup so a single edit covers both.

const journey = [
  {
    period: "2025 — Now",
    role: "Founder",
    org: "VeloSecurity AI",
    detail:
      "Building deterministic security infrastructure for AI agents. Policy enforcement outside the model's reasoning loop — DNS, identity, and CEL-based control planes that don't depend on prompt-time inference.",
  },
  {
    period: "Previously",
    role: "Multi-Cloud Networking & Security",
    org: "Enterprise Practitioner",
    detail:
      "Years of hands-on work across multi-cloud networking, zero trust access, and the operational reality of running secure infrastructure at scale. Published technical writing on MCN, NaaS trade-offs, DPI vs. reverse proxy, and the limits of Layer 3 in cloud.",
  },
  {
    period: "Always",
    role: "Writer & Engineer",
    org: "highvelocitynetworking.com",
    detail:
      "Long-form technical writing on networking, security architecture, and the patterns that survive contact with production. Python tooling for network operations problems that don't have an off-the-shelf answer.",
  },
];

const expertise = [
  {
    icon: Shield,
    title: "Agent Security",
    blurb:
      "Deterministic policy enforcement for AI agents. DNS-AID, CEL evaluators, control-plane / data-plane separation.",
  },
  {
    icon: Network,
    title: "Multi-Cloud Networking",
    blurb:
      "Transit architectures, ZTNA, SD-WAN, application-aware routing across AWS / Azure / GCP.",
  },
  {
    icon: Lock,
    title: "Zero Trust",
    blurb:
      "Identity-first access, short-lived credentials, OAuth 2.0 token exchange, the confused deputy problem.",
  },
  {
    icon: Cloud,
    title: "Cloud Architecture",
    blurb:
      "Production-grade cloud designs that hold up to security review and a 3am page.",
  },
  {
    icon: Brain,
    title: "AI / Agentic Systems",
    blurb:
      "Where LLMs belong in the stack — and where they absolutely do not. Tooling, evals, and guardrails.",
  },
  {
    icon: Code2,
    title: "Python & Tooling",
    blurb:
      "Operational scripts, data analysis, and small composable tools for network and security teams.",
  },
];

const links = [
  {
    label: "Email",
    href: "mailto:contact@velosecurity-ai.io",
    icon: Mail,
    handle: "contact@velosecurity-ai.io",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/igorracic/",
    icon: Linkedin,
    handle: "in/igorracic",
  },
  {
    label: "GitHub",
    href: "https://github.com/iracic82",
    icon: Github,
    handle: "@iracic82",
  },
  {
    label: "X",
    href: "https://x.com/iracic82",
    icon: Twitter,
    handle: "@iracic82",
  },
];

export function Founder({ recent }: { recent: RecentPost[] }) {
  return (
    <main className="relative min-h-screen pt-32 pb-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="absolute top-1/4 -left-32 w-[420px] h-[420px] bg-accent/[0.06] rounded-full blur-[140px]" />
      <div className="absolute bottom-1/4 -right-32 w-[420px] h-[420px] bg-accent-secondary/[0.06] rounded-full blur-[140px]" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* HERO */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-24"
        >
          <p className="section-label mb-4">Founder</p>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
            Igor <span className="gradient-text-static">Racic</span>
          </h1>
          <p className="text-foreground text-xl sm:text-2xl leading-relaxed max-w-2xl mb-6">
            I&apos;m building{" "}
            <Link
              href="/"
              className="text-accent hover:text-accent/80 transition-colors"
            >
              VeloSecurity AI
            </Link>{" "}
            — deterministic security infrastructure for AI agents.
          </p>
          <p className="text-muted text-base sm:text-lg leading-relaxed max-w-2xl">
            Networking and security practitioner. I write about the architecture
            of trust, the limits of LLM-based controls, and the patterns that
            survive contact with production.
          </p>
        </motion.section>

        {/* JOURNEY / TIMELINE */}
        <Section label="Journey" icon={Briefcase} title="Work, in brief">
          <div className="relative pl-6 sm:pl-8">
            {/* vertical line */}
            <div className="absolute left-0 top-2 bottom-2 w-px bg-gradient-to-b from-accent/40 via-accent-secondary/30 to-transparent" />
            <div className="space-y-10">
              {journey.map((j, i) => (
                <motion.div
                  key={j.period}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{
                    duration: 0.5,
                    delay: i * 0.08,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="relative"
                >
                  {/* node */}
                  <div className="absolute -left-[28px] sm:-left-[36px] top-1.5 w-3 h-3 rounded-full bg-accent shadow-[0_0_18px_rgba(0,212,255,0.5)]" />
                  <p className="tag text-accent mb-2">{j.period}</p>
                  <h3 className="font-display text-xl sm:text-2xl font-bold mb-1">
                    {j.role}
                  </h3>
                  <p className="text-sm text-muted/80 mb-3">{j.org}</p>
                  <p className="text-muted leading-relaxed max-w-2xl">
                    {j.detail}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* EXPERTISE */}
        <Section label="Expertise" icon={Brain} title="What I work on">
          <div className="grid sm:grid-cols-2 gap-5">
            {expertise.map((e, i) => (
              <motion.div
                key={e.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.45,
                  delay: i * 0.05,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="card-glow rounded-2xl p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 shrink-0 rounded-lg bg-accent/[0.08] border border-accent/10 flex items-center justify-center">
                    <e.icon className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold mb-1.5">
                      {e.title}
                    </h3>
                    <p className="text-sm text-muted leading-relaxed">
                      {e.blurb}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* SELECTED WRITING */}
        <Section label="Writing" icon={PenLine} title="Selected posts">
          <div className="space-y-3">
            {recent.map((post, i) => (
              <motion.div
                key={post.slug}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.4,
                  delay: i * 0.05,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <Link
                  href={`/blog/${post.slug}`}
                  className="group flex items-baseline justify-between gap-6 py-4 border-b border-border/40 hover:border-accent/30 transition-colors"
                >
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-accent transition-colors truncate">
                      {post.title}
                    </h3>
                    <p className="text-xs text-muted/60 mt-1">
                      {new Date(post.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 shrink-0 text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
                </Link>
              </motion.div>
            ))}
          </div>
          <div className="mt-8">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm text-accent/80 hover:text-accent transition-colors"
            >
              All posts
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Section>

        {/* CONNECT */}
        <Section label="Connect" icon={Mail} title="Get in touch">
          <p className="text-muted leading-relaxed max-w-2xl mb-8">
            If you&apos;re working on agent security, multi-cloud networking, or
            anywhere the two intersect — I&apos;d like to hear from you.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target={l.href.startsWith("http") ? "_blank" : undefined}
                rel={
                  l.href.startsWith("http") ? "noopener noreferrer" : undefined
                }
                className="card-glow rounded-xl px-5 py-4 flex items-center gap-4 group"
              >
                <div className="w-9 h-9 rounded-lg bg-accent/[0.08] border border-accent/10 flex items-center justify-center shrink-0">
                  <l.icon className="w-4 h-4 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted/60 uppercase tracking-wider mb-0.5">
                    {l.label}
                  </p>
                  <p className="text-sm text-foreground group-hover:text-accent transition-colors truncate">
                    {l.handle}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </Section>
      </div>
    </main>
  );
}

function Section({
  label,
  icon: Icon,
  title,
  children,
}: {
  label: string;
  icon: typeof Briefcase;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="mb-24"
    >
      <div className="flex items-center gap-3 mb-3">
        <Icon className="w-3.5 h-3.5 text-accent" />
        <p className="section-label">{label}</p>
      </div>
      <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mb-10">
        <span className="gradient-text-static">{title}</span>
      </h2>
      {children}
    </motion.section>
  );
}
