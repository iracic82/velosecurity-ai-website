import { getAllPosts } from "@/lib/blog";
import Link from "next/link";
import { ArrowRight, Calendar, User } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog | VeloSecurity AI",
  description:
    "Insights on AI agent security, DNS-AID, zero trust architecture, and the future of agentic AI governance.",
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <section className="relative min-h-screen pt-32 pb-24">
      {/* Background grid */}
      <div className="absolute inset-0 grid-bg opacity-30" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-16">
          <p className="section-label mb-4">Insights</p>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            <span className="gradient-text-static">Blog</span>
          </h1>
          <p className="text-muted text-lg max-w-2xl">
            Technical deep dives on agent security, DNS-based discovery, policy
            enforcement, and the architecture of trust.
          </p>
        </div>

        {/* Posts */}
        <div className="space-y-6">
          {posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`}>
              <article className="card-glow rounded-2xl p-8 group cursor-pointer">
                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="tag px-2.5 py-1 rounded-md bg-accent/[0.08] text-accent/80 border border-accent/10"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Title */}
                <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground group-hover:text-accent transition-colors mb-3">
                  {post.title}
                </h2>

                {/* Description */}
                <p className="text-muted text-sm leading-relaxed mb-5">
                  {post.description}
                </p>

                {/* Meta */}
                <div className="flex items-center gap-6 text-xs text-muted/60">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3 h-3" />
                    {post.author}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    {new Date(post.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                  <span className="ml-auto flex items-center gap-1 text-accent/60 group-hover:text-accent transition-colors">
                    Read
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
