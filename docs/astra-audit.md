# Marveto Astra upgrade

Baseline: `UnityMandarin/Marveto`, main commit `113e9b1`. GitHub Pages uses
`github-pages-src/main.tsx`, which imports `app/MarvetoExperience.tsx` and
`app/globals.css`. The primary application imports the same experience.

## Inspection before implementation

1. **Keep:** marveto° identity, Instrument Sans/Cormorant typography, original
   mineral/glass imagery, benefit-led business story, explicitly labeled studio
   concepts, package prices/terms, email/clipboard inquiry, concept tier URLs.
2. **Weak:** repeated fullscreen layouts and 7–10px functional text flatten the
   hierarchy. Pricing and form labels are especially difficult to read.
3. **Immersion:** desktop and mobile spend several screens on each section;
   important copy fades away, and cinematic phases disable navigation.
4. **Realism:** two independent homepage renderers compete with authored assets.
   The photographic materials are stronger than the synthetic scene machinery.
5. **Interaction:** evidence/reasons only advance with scrolling. Invisible
   articles remain in the document's focus order. Menu lacks modal focus handling.
   Delayed project navigation can interfere with modifier-click behavior.
6. **Untouched business logic:** company/industry mapping, all three concept
   routes and tier switching, commercial promises, inquiry destination, user
   brief preservation, field validation, no server transmission of inquiry data.

Live browser inspection was attempted but denied because the browser's enforced
policy could not be verified. Findings above come from the fresh repository
source and directly inspected original image assets, not a live screenshot.

## Ordered implementation

1. Retain artwork mapping: surface → hero, signal → introduction,
   axiom → technology, forma artwork → Serein construction, serein artwork →
   Forma medical, process → studio, contact → inquiry.
2. Replace homepage competing canvases with an event-driven 2.5D image composition.
   Scene transforms are pure functions of scroll position: forward, reverse,
   and stationary at rest. No new WebGL, dependencies, or autoplay.
3. Establish contrasting editorial sections, purposeful image framing, readable
   typography, a navigable concept sequence, and restrained glass materials.
4. Make all evidence and commitments directly accessible using disclosures.
   Improve navigation, keyboard focus, package feedback, and the inquiry form.
5. Preserve all concept functionality and refine its typography/responsiveness.
6. Validate types, existing tests, new reversible motion math, lint, and both
   deployment builds. Deliver changes on a reviewable GitHub branch/PR; do not
   silently deploy to the separate ChatGPT Site.

## Validation

- TypeScript and ESLint pass. A pre-existing `prefer-const` error in the retained
  legacy hero was fixed without changing its rendering behavior.
- All 38 tests in six suites pass, including inquiry validation, preservation of
  custom briefs across package changes, concept tiers, and reversible scene math.
- GitHub Pages and primary application production builds pass. All four Pages
  HTML entrypoints and bundled fonts/artwork are included.
- Local HTTP checks pass for the homepage, each of the three industry concepts,
  and a concept/tier inquiry URL. These verify rendering and expected content,
  not browser interaction or visual appearance.
- Live browser inspection was denied twice by an unavailable enforced policy
  check. No screenshot, viewport, keyboard, clipboard, or interactive browser QA
  is claimed. The local preview compiled and responded successfully; opening it
  in Codex was queued by the application.
- No prices, commercial terms, research source links, concept mappings, contact
  destinations, dependency versions, or deployment audience were changed.
- The existing optional concept shader remains; its frames now sample input
  directly, with no post-scroll animation loop.
