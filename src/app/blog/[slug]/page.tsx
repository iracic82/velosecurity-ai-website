import { getPostBySlug, getAllPostSlugs } from "@/lib/blog";
import { ArrowLeft, Calendar, User, Tag } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export async function generateStaticParams() {
  const slugs = getAllPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  return {
    title: `${post.title} | VeloSecurity AI`,
    description: post.description,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  return (
    <section className="relative min-h-screen pt-32 pb-24">
      {/* Background */}
      <div className="absolute inset-0 grid-bg opacity-20" />

      <article className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-accent transition-colors mb-10"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Blog
        </Link>

        {/* Header */}
        <header className="mb-12">
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-5">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="tag px-2.5 py-1 rounded-md bg-accent/[0.08] text-accent/80 border border-accent/10"
              >
                <Tag className="w-2.5 h-2.5 inline mr-1" />
                {tag}
              </span>
            ))}
          </div>

          {/* Title */}
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight mb-6">
            <span className="gradient-text-static">{post.title}</span>
          </h1>

          {/* Description */}
          <p className="text-muted text-lg leading-relaxed mb-6">
            {post.description}
          </p>

          {/* Meta */}
          <div className="flex items-center gap-6 text-sm text-muted/60 pb-8 border-b border-border/50">
            <span className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {post.author}
            </span>
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {new Date(post.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </header>

        {/* Content — rendered from our own markdown files at build time (SSG), not user input */}
        <div
          className="prose-velosecurity"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>
    </section>
  );
}
