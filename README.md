# Marveto

## [Visit the live website →](https://unitymandarin.github.io/Marveto/)

An original, immersive website for Marveto—a compact team that plans, designs, and builds clear company websites with practical scope and sensible overhead.

## Experience

- WebGL hero with a static reduced-motion fallback
- Three honestly labeled company website concepts
- Responsive editorial layouts and accessible industry concept pages
- Lightweight, industry-specific Premium atmospheres with animated light and depth
- Scroll-driven Ultimate worlds with five procedural 3D rooms per concept
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

The main branch deploys the static GitHub Pages build automatically. The Pages entrypoint reuses the same React experience, styles, imagery, fonts, GSAP motion, OGL canvas, and privacy-preserving inquiry flow as the primary application.

The three homepage examples open full industry concept pages for technology, construction, and medical organizations. Each route can be previewed at Essential, Premium, or Ultimate quality through a shareable `?tier=` parameter. Premium adds a lazy-loaded 2D atmosphere; Ultimate replaces it with a persistent OGL journey whose camera moves through five industry-specific rooms as the visitor scrolls.

## Content

Brand settings, navigation, projects, and services live in `app/site-data.ts`. The inquiry destination is configured once as `siteConfig.contactEmail`.

All concept names, copy, and visual artwork in this repository were created specifically for Marveto. No client relationships or awards are implied.
