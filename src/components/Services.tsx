"use client";

import { motion, useInView } from "framer-motion";
import {
  Brain,
  Lightbulb,
  FlaskConical,
  Bot,
  Cpu,
  Network,
  Shield,
  Lock,
  Cloud,
  Database,
  Server,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

const serviceGroups = [
  {
    title: "AI Services",
    description:
      "Transform your business with cutting-edge artificial intelligence",
    accentColor: "#00d4ff",
    items: [
      {
        name: "AI Consulting",
        description:
          "Expert guidance on integrating AI into your enterprise operations and workflows.",
        icon: Brain,
      },
      {
        name: "AI Strategy",
        description:
          "Roadmaps and frameworks to align AI initiatives with your business objectives.",
        icon: Lightbulb,
      },
      {
        name: "AI PoC",
        description:
          "Rapid proof-of-concept development to validate AI solutions before full investment.",
        icon: FlaskConical,
      },
      {
        name: "Agentic AI",
        description:
          "Autonomous AI agents that reason, plan, and execute complex tasks independently.",
        icon: Bot,
      },
      {
        name: "Custom AI Solutions",
        description:
          "Bespoke AI systems tailored to your unique industry challenges and requirements.",
        icon: Cpu,
      },
    ],
  },
  {
    title: "Security & Network",
    description:
      "Protect your infrastructure with enterprise-grade security",
    accentColor: "#7c3aed",
    items: [
      {
        name: "Network Security Consulting",
        description:
          "Comprehensive assessment and hardening of your network infrastructure.",
        icon: Network,
      },
      {
        name: "Network Security Strategy",
        description:
          "Long-term security architecture planning for evolving threat landscapes.",
        icon: Shield,
      },
      {
        name: "Cyber Security Consulting",
        description:
          "End-to-end cybersecurity advisory from threat modeling to incident response.",
        icon: Lock,
      },
      {
        name: "Cyber Security Strategy",
        description:
          "Strategic security frameworks aligned with compliance and business goals.",
        icon: Shield,
      },
    ],
  },
  {
    title: "Cloud & Data",
    description:
      "Modernize your infrastructure and unlock data-driven insights",
    accentColor: "#00ff88",
    items: [
      {
        name: "Cloud Consulting",
        description:
          "Architecture, migration, and optimization of cloud-native infrastructure.",
        icon: Cloud,
      },
      {
        name: "Data Migration",
        description:
          "Seamless, zero-downtime data migration across platforms and environments.",
        icon: Database,
      },
      {
        name: "Data Governance",
        description:
          "Policies, processes, and tools to ensure data quality, security, and compliance.",
        icon: Server,
      },
    ],
  },
];

export function Services() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="services" className="relative py-28 lg:py-36">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" ref={ref}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-20"
        >
          <p className="section-label mb-4">What We Do</p>
          <h2 className="font-display text-4xl lg:text-6xl font-extrabold mb-5">
            Our <span className="gradient-text-static">Services</span>
          </h2>
          <p className="text-muted text-lg max-w-2xl leading-relaxed">
            End-to-end AI and security solutions designed to accelerate your
            digital transformation.
          </p>
        </motion.div>

        {/* Service Groups */}
        <div className="space-y-24">
          {serviceGroups.map((group, groupIdx) => (
            <motion.div
              key={group.title}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              {/* Group Header */}
              <div className="flex items-center gap-4 mb-10">
                <div
                  className="w-1 h-10 rounded-full"
                  style={{ backgroundColor: group.accentColor }}
                />
                <div>
                  <h3 className="font-display text-2xl font-bold">
                    {group.title}
                  </h3>
                  <p className="text-sm text-muted">{group.description}</p>
                </div>
              </div>

              {/* Cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.items.map((item, i) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                  >
                    <Link
                      href="#contact"
                      className="card-glow group block p-6 rounded-2xl h-full"
                    >
                      {/* Icon */}
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-colors duration-300"
                        style={{
                          backgroundColor: `${group.accentColor}10`,
                        }}
                      >
                        <item.icon
                          className="w-5 h-5 transition-colors duration-300"
                          style={{ color: group.accentColor }}
                        />
                      </div>

                      <h4 className="font-display font-bold text-base mb-2 text-foreground group-hover:text-accent transition-colors duration-300">
                        {item.name}
                      </h4>
                      <p className="text-sm text-muted leading-relaxed mb-5">
                        {item.description}
                      </p>

                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                        Learn more
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
