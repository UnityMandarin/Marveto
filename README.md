# Marveto

## [Visit the live website →](https://unitymandarin.github.io/Marveto/)

An original, immersive website for Marveto—a compact team that plans, designs, and builds clear company websites with practical scope and sensible overhead.

## Experience

- Scroll-linked, layered photographic hero with an explicit motion toggle and reduced-motion support
- Three honestly labeled company website concepts
- Responsive editorial layouts, directly accessible evidence/commitment disclosures, and accessible industry concept pages
- Lightweight, industry-specific Premium atmospheres with animated light and depth
- Scroll-driven Ultimate journeys where each concept artwork opens into a continuous shader environment
- Privacy-preserving project inquiry that composes an email locally
- Original art direction and optimized AVIF/WebP imagery
- A benefit-led sales story grounded in realistic claims

## Development

```bash
pnpm install
pnpm run dev
```

Quality checks:

```bash
pnpm run typecheck
pnpm run test
pnpm run lint
pnpm run build
pnpm run build:pages
```

The main branch deploys the static GitHub Pages build automatically. The Pages entrypoint reuses the same React experience, styles, imagery, fonts, scroll-linked image composition, and privacy-preserving inquiry flow as the primary application.

The three homepage examples open full industry concept pages for technology, construction, and medical organizations. Each route can be previewed at Essential, Premium, or Ultimate quality through a shareable `?tier=` parameter. Premium adds an image atmosphere; Ultimate retains its optional persistent OGL journey that carries the original background through a surface, threshold, immersion, and horizon as the visitor scrolls.

## Content

Brand settings, navigation, projects, and services live in `app/site-data.ts`. The inquiry destination is configured once as `siteConfig.contactEmail`.

All concept names, copy, and visual artwork in this repository were created specifically for Marveto. No client relationships or awards are implied.

## Astra upgrade

The homepage uses the existing art with deterministic CSS transforms driven by scroll position. It no longer mounts the legacy `HeroThreeWorld` and `HomeWorld` renderers. Those source files remain available; existing concept tiers retain their renderer, now sampled directly without motion continuing after input stops.

Original pricing, terms, evidence, concept identities, contact destination, and local email/clipboard inquiry behavior are preserved. See `docs/astra-audit.md` for the inspection, scope, and validation notes.
