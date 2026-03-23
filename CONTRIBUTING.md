# Contributing to VeloSecurity AI Website

Welcome Rishabh! This guide will get you set up and contributing to the site.

## Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/iracic82/velosecurity-ai-website.git
cd velosecurity-ai-website
```

### 2. Install dependencies

Make sure you have Node.js 22+ installed, then:

```bash
npm install
```

### 3. Start the dev server

```bash
npm run dev -- -p 7001
```

Open http://localhost:7001 in your browser.

## Git Workflow

We use a `dev` → `main` branching model:

```
feature-branch → dev (preview) → PR → main (production)
```

| Branch | Purpose | Deploys to |
|--------|---------|------------|
| `main` | Production (protected) | velosecurity-ai.io |
| `dev` | Development / staging | Vercel preview URL |
| `feature/*` | Your working branches | Nothing (local only until pushed) |

### Making Changes

```bash
# 1. Make sure you're on dev and up to date
git checkout dev
git pull

# 2. Create a feature branch
git checkout -b feature/your-feature-name

# 3. Make your changes, then commit
git add .
git commit -m "feat: description of what you changed"

# 4. Push your branch
git push -u origin feature/your-feature-name

# 5. Open a PR to dev on GitHub
gh pr create --base dev --title "Your change title"
```

### Deploying to Production

1. Once changes are tested on `dev`, open a PR from `dev` → `main`
2. CI must pass (lint + build)
3. Requires 1 approval
4. Merge → auto-deploys to https://velosecurity-ai.io

## Project Structure

```
src/
├── app/
│   ├── globals.css      # Global styles, CSS variables, utilities
│   ├── layout.tsx        # Root layout (fonts, Navbar, Footer)
│   └── page.tsx          # Homepage (assembles all sections)
├── components/
│   ├── Navbar.tsx         # Navigation with mega-menu dropdowns
│   ├── Hero.tsx           # Hero section - tagline + CTAs
│   ├── Services.tsx       # All 12 services in 3 groups
│   ├── Journey.tsx        # "Why Choose Us" 5-step timeline
│   ├── CaseStudies.tsx    # 6 case study categories
│   ├── Demos.tsx          # DNS-AID + IPAM for Agents
│   ├── Contact.tsx        # Contact form
│   └── Footer.tsx         # Footer with links
```

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Fonts**: Syne (headings) + Geist (body)
- **Hosting**: Vercel
- **Domain**: velosecurity-ai.io (DNS on Cloudflare)

## Content Editing Guide

### Updating text content

Most content is defined as arrays/objects at the top of each component file. For example, to edit services, open `src/components/Services.tsx` and modify the `serviceGroups` array.

### Adding a new section

1. Create `src/components/YourSection.tsx`
2. Import and add it to `src/app/page.tsx`

### Styling conventions

- Color variables are in `src/app/globals.css` (`:root` block)
- Use `font-display` class for headings (Syne font)
- Use `gradient-text` or `gradient-text-static` for accent text
- Use `card-glow` class for interactive cards
- Use `section-label` class for section subtitles
- Use `input-field` class for form inputs

### Key colors

| Variable | Color | Usage |
|----------|-------|-------|
| `--accent` | `#00d4ff` (cyan) | Primary accent, CTAs, links |
| `--accent-secondary` | `#7c3aed` (purple) | Gradients, secondary elements |
| `--accent-tertiary` | `#00ff88` (green) | Cloud/Data section accent |
| `--surface` | `#0a0a12` | Card backgrounds |
| `--muted` | `#6b6b80` | Secondary text |

## Commit Message Convention

```
feat: new feature
fix: bug fix
content: text/copy changes
style: visual/CSS changes
ci: workflow changes
```

## Need Help?

- **Local preview not working?** Try `rm -rf .next && npm run dev`
- **Build failing?** Run `npm run build` locally to see errors before pushing
- **Merge conflicts?** Pull latest `dev` first: `git pull origin dev`
