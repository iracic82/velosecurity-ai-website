import { Founder } from "@/components/Founder";
import { getAllPosts } from "@/lib/blog";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Igor Racic — Founder, VeloSecurity AI",
  description:
    "Founder of VeloSecurity AI. Multi-cloud networking, agent security, and the architecture of trust. Writing, work, and what I'm building.",
  openGraph: {
    title: "Igor Racic — Founder, VeloSecurity AI",
    description:
      "Founder of VeloSecurity AI. Multi-cloud networking, agent security, and the architecture of trust.",
    type: "profile",
  },
};

export default function FounderPage() {
  const recent = getAllPosts().slice(0, 4);
  return <Founder recent={recent} />;
}
