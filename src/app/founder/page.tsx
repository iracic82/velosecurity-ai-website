import { Founder } from "@/components/Founder";
import { getAllPosts } from "@/lib/blog";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Founder — VeloSecurity AI",
  description:
    "The founder of VeloSecurity AI. Multi-cloud networking, agent security, and the architecture of trust. Writing, work, and what we're building.",
  openGraph: {
    title: "Founder — VeloSecurity AI",
    description:
      "The founder of VeloSecurity AI. Multi-cloud networking, agent security, and the architecture of trust.",
    type: "profile",
  },
};

export default function FounderPage() {
  const recent = getAllPosts().slice(0, 4);
  return <Founder recent={recent} />;
}
