"use client";

import { motion } from "framer-motion";
import { Send, Mail, Phone, MapPin } from "lucide-react";
import { useState } from "react";

export function Contact() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section id="contact" className="relative py-28 lg:py-36">
      {/* Background effects */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent/[0.03] rounded-full blur-[150px]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent-secondary/[0.03] rounded-full blur-[120px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-5 gap-16 items-start">
          {/* Left - Info (2 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-2"
          >
            <p className="section-label mb-4">Get In Touch</p>
            <h2 className="font-display text-4xl lg:text-5xl font-extrabold mb-6">
              Connect{" "}
              <span className="gradient-text-static">With Us</span>
            </h2>
            <p className="text-muted text-base leading-relaxed mb-10">
              Ready to transform your business? Let&apos;s start with a
              conversation. Book a free AI discovery session and find out
              what&apos;s possible.
            </p>

            <div className="space-y-5">
              {[
                {
                  icon: Mail,
                  label: "Email",
                  value: "contact@velosecurity-ai.io",
                },
                {
                  icon: Phone,
                  label: "Phone",
                  value: "Available upon request",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-4 group"
                >
                  <div className="w-11 h-11 rounded-xl bg-accent/[0.08] border border-accent/10 flex items-center justify-center group-hover:border-accent/25 transition-colors">
                    <item.icon className="w-4.5 h-4.5 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-muted uppercase tracking-wider font-semibold">
                      {item.label}
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {item.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right - Form (3 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="lg:col-span-3"
          >
            {submitted ? (
              <div className="p-10 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
                  <Send className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className="font-display text-2xl font-bold mb-2">
                  Message Sent!
                </h3>
                <p className="text-muted">
                  Thank you for reaching out. We&apos;ll get back to you within
                  24 hours.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="card-glow p-8 lg:p-10 rounded-2xl space-y-5"
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      className="input-field w-full px-4 py-3 rounded-xl text-sm"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      className="input-field w-full px-4 py-3 rounded-xl text-sm"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      className="input-field w-full px-4 py-3 rounded-xl text-sm"
                      placeholder="john@company.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      className="input-field w-full px-4 py-3 rounded-xl text-sm"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      className="input-field w-full px-4 py-3 rounded-xl text-sm"
                      placeholder="Acme Corp"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                      Job Title
                    </label>
                    <input
                      type="text"
                      className="input-field w-full px-4 py-3 rounded-xl text-sm"
                      placeholder="CTO"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    required
                    className="input-field w-full px-4 py-3 rounded-xl text-sm resize-none"
                    placeholder="Tell us about your project or challenge..."
                  />
                </div>

                <button
                  type="submit"
                  className="group relative w-full flex items-center justify-center gap-2 px-6 py-4 overflow-hidden rounded-xl font-display font-bold text-sm uppercase tracking-wider"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-accent to-accent-secondary" />
                  <span className="relative text-background">
                    Send Message
                  </span>
                  <Send className="relative w-4 h-4 text-background group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
