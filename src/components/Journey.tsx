"use client";

import { motion } from "framer-motion";
import {
  Search,
  Target,
  FlaskConical,
  Rocket,
  TrendingUp,
} from "lucide-react";

const steps = [
  {
    number: "01",
    title: "AI Discovery Session",
    description:
      "We assess your current infrastructure, identify pain points, and uncover AI opportunities tailored to your business.",
    icon: Search,
  },
  {
    number: "02",
    title: "AI Strategy & Scoping",
    description:
      "We define a clear roadmap with measurable objectives, timelines, and resource requirements for your AI transformation.",
    icon: Target,
  },
  {
    number: "03",
    title: "Proof of Concept",
    description:
      "Rapid prototyping to validate the approach, demonstrate value, and de-risk the investment before scaling.",
    icon: FlaskConical,
  },
  {
    number: "04",
    title: "MVP",
    description:
      "We build and deploy a minimum viable product — production-ready, integrated, and delivering real business value.",
    icon: Rocket,
  },
  {
    number: "05",
    title: "Optimization",
    description:
      "Continuous monitoring, fine-tuning, and scaling to maximize performance and ROI over time.",
    icon: TrendingUp,
  },
];

export function Journey() {
  return (
    <section className="relative py-28 lg:py-36 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface/50 to-transparent" />
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-accent-secondary/[0.03] rounded-full blur-[150px] -translate-y-1/2" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <p className="section-label mb-4">Why Choose Us</p>
          <h2 className="font-display text-4xl lg:text-6xl font-extrabold mb-5">
            From <span className="gradient-text-static">Legacy</span> to{" "}
            <span className="gradient-text-static">Leading Edge</span>
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto leading-relaxed">
            Our proven 5-step methodology takes you from where you are to where
            you need to be.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line (desktop) */}
          <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px">
            <div className="h-full bg-gradient-to-b from-transparent via-accent/30 to-transparent" />
          </div>

          <div className="space-y-6 lg:space-y-0">
            {steps.map((step, i) => {
              const isLeft = i % 2 === 0;
              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, x: isLeft ? -40 : 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{
                    duration: 0.6,
                    delay: i * 0.1,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className={`relative lg:flex items-center ${
                    isLeft ? "lg:flex-row" : "lg:flex-row-reverse"
                  }`}
                >
                  {/* Content Card */}
                  <div
                    className={`lg:w-1/2 ${
                      isLeft ? "lg:pr-16 lg:text-right" : "lg:pl-16"
                    }`}
                  >
                    <div className="card-glow group p-7 rounded-2xl">
                      <div
                        className={`flex items-center gap-4 mb-4 ${
                          isLeft ? "lg:flex-row-reverse" : ""
                        }`}
                      >
                        <div className="w-12 h-12 rounded-xl bg-accent/[0.08] border border-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/15 transition-colors">
                          <step.icon className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                          <span className="tag text-accent block mb-0.5">
                            Step {step.number}
                          </span>
                          <h3 className="font-display text-lg font-bold">
                            {step.title}
                          </h3>
                        </div>
                      </div>
                      <p className="text-sm text-muted leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Center Node */}
                  <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 z-10">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-background border-2 border-accent/40 flex items-center justify-center group-hover:border-accent transition-colors">
                        <span className="font-display text-xs font-bold text-accent">
                          {step.number}
                        </span>
                      </div>
                      {/* Pulse ring */}
                      <div className="absolute inset-0 rounded-full border border-accent/20 animate-ping" style={{ animationDuration: "3s" }} />
                    </div>
                  </div>

                  {/* Spacer */}
                  <div className="hidden lg:block lg:w-1/2" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
