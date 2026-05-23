"use client";

import { motion } from "framer-motion";
import {
  Github,
  Linkedin,
  Mail,
  Twitter,
  ArrowRight,
  Briefcase,
  PenLine,
  MapPin,
  Radio,
  Lightbulb,
} from "lucide-react";
import Link from "next/link";

type RecentPost = {
  slug: string;
  title: string;
  date: string;
};

// Edit this file to update founder content. Single source of truth.

const credentialChips = [
  "20 years across networking, security & cloud",
  "Patent filed · DNS-AID",
  "Ex-Prosimo (acq. Palo Alto), AWS, VMware, Aruba",
];

const flagshipLinks = [
  { label: "dns-aid.org", href: "https://dns-aid.org" },
  {
    label: "github.com/infobloxopen/dns-aid-core",
    href: "https://github.com/infobloxopen/dns-aid-core",
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
    href: "https://www.linkedin.com/in/iracic",
    icon: Linkedin,
    handle: "in/iracic",
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

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* HERO */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-20"
        >
          <p className="section-label mb-4">Founder</p>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
            Hi, I&apos;m <span className="gradient-text-static">Igor</span>.
          </h1>

          <p className="text-foreground text-xl sm:text-2xl leading-relaxed mb-4">
            I&apos;m building{" "}
            <Link
              href="/"
              className="text-accent hover:text-accent/80 transition-colors"
            >
              VeloSecurity AI
            </Link>{" "}
            — deterministic security infrastructure for AI agents.
          </p>

          <p className="flex items-center gap-2 text-sm text-muted/70 mb-7">
            <MapPin className="w-3.5 h-3.5" />
            Oslo · working across EMEA &amp; AMER
          </p>

          <div className="flex flex-wrap gap-2">
            {credentialChips.map((c) => (
              <span
                key={c}
                className="tag px-3 py-1.5 rounded-md bg-accent/[0.08] text-accent/80 border border-accent/10"
              >
                {c}
              </span>
            ))}
          </div>
        </motion.section>

        {/* WHY */}
        <Section label="Why I'm building this" icon={Lightbulb} title="Agents need infrastructure, not better prompts">
          <p className="text-muted text-lg leading-relaxed mb-5">
            Every wave of cloud, mobile and IoT, I&apos;ve watched the same
            pattern: a powerful new compute model ships first, and the security
            and governance infrastructure shows up years later — at much higher
            cost.
          </p>
          <p className="text-muted text-lg leading-relaxed mb-5">
            AI agents are the next wave, and we&apos;re repeating the mistake.
            Most &quot;agent security&quot; today is a prompt asking an LLM to
            behave. That&apos;s not a control plane — it&apos;s a wish.
          </p>
          <p className="text-muted text-lg leading-relaxed">
            VeloSecurity AI exists to put deterministic policy enforcement —
            DNS-native identity, CEL evaluators, control-plane / data-plane
            separation — between agents and the systems they touch.{" "}
            <strong className="text-foreground">
              The architecture has to be infrastructure. The infrastructure has
              to be deterministic.
            </strong>
          </p>
        </Section>

        {/* FLAGSHIP */}
        <Section label="What I'm shipping" icon={Radio} title="DNS-AID">
          <div className="card-glow rounded-2xl p-7 sm:p-8">
            <p className="text-sm text-muted/80 mb-4">
              Infoblox · Patent filed · IETF draft contributor
            </p>
            <p className="text-muted leading-relaxed mb-4">
              At Infoblox I lead{" "}
              <a
                href="https://dns-aid.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:text-accent/80 transition-colors"
              >
                DNS-AID
              </a>{" "}
              — an IETF-based standard for DNS-native agent identification and
              discovery. Built the full reference platform end-to-end: Python
              core library, CLI, MCP server, FastAPI directory, Next.js
              frontend, AWS serverless. Governance via DNSSEC, DANE/TLSA, JWS
              and CEL policy.
            </p>
            <p className="text-muted leading-relaxed mb-6">
              VeloSecurity AI builds on this foundation — taking the same
              deterministic primitives and making them deployable for any
              enterprise running agents in production.
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {flagshipLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-accent/80 hover:text-accent transition-colors"
                >
                  {l.label}
                  <ArrowRight className="w-3 h-3" />
                </a>
              ))}
            </div>
          </div>
        </Section>

        {/* BACKGROUND — narrative, not a CV */}
        <Section label="Background" icon={Briefcase} title="How I got here">
          <div className="space-y-4 text-muted leading-relaxed text-lg">
            <p>
              I started in service provider networks — IP/MPLS cores, microwave
              backhaul, the unsexy plumbing that everything else runs on top of.
              Then a decade of multi-cloud and SD-WAN at{" "}
              <span className="text-foreground/90">
                Airbus, VMware, AWS, Aruba and Prosimo
              </span>{" "}
              (which Palo Alto acquired in 2025) — building the architectures
              that connect AWS, Azure and GCP for enterprises that can&apos;t
              afford to get it wrong.
            </p>
            <p>
              Along the way I&apos;ve influenced over{" "}
              <strong className="text-foreground">€150M</strong> in deal value,
              presented at VMworld, built and led pre-sales teams across EMEA,
              and earned the rare distinction of CCDE alongside AWS Professional
              and Azure Expert. None of that matters on its own. What it adds up
              to is a pattern:{" "}
              <strong className="text-foreground">
                I keep ending up where networking, security and emerging compute
                models meet.
              </strong>
            </p>
            <p>
              AI agents are where they meet next. Hence DNS-AID. Hence
              VeloSecurity AI.
            </p>
          </div>
        </Section>

        {/* WRITING */}
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
        <Section label="Connect" icon={Mail} title="Talk to me">
          <p className="text-muted leading-relaxed mb-8">
            If you&apos;re running agents in production, evaluating governance,
            or just want to argue about whether DNS belongs in the AI stack —
            I&apos;d like to hear from you.
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
      className="mb-20"
    >
      <div className="flex items-center gap-3 mb-3">
        <Icon className="w-3.5 h-3.5 text-accent" />
        <p className="section-label">{label}</p>
      </div>
      <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mb-8">
        <span className="gradient-text-static">{title}</span>
      </h2>
      {children}
    </motion.section>
  );
}
