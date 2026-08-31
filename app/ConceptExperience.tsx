'use client';

import { KeyboardEvent, lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { assetPath, sitePath } from './asset-path';
import { Concept, ExperienceTier, tierDefinitions, tierOrder } from './concept-data';
import { parseExperienceTier, shouldLoadPremiumAtmosphere, shouldLoadUltimateJourney, withExperienceTier } from './concept-tier';

const UltimateScene = lazy(() => import('./UltimateScene'));
const PremiumAtmosphere = lazy(() => import('./PremiumAtmosphere'));

function webglAvailable(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function ConceptPicture({ concept, eager = false }: { concept: Concept; eager?: boolean }) {
  return (
    <picture>
      <source srcSet={assetPath(`${concept.image}.avif`)} type="image/avif" />
      <source srcSet={assetPath(`${concept.image}.webp`)} type="image/webp" />
      <img src={assetPath(`${concept.image}.webp`)} alt={concept.imageAlt} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} />
    </picture>
  );
}

export default function ConceptExperience({ concept }: { concept: Concept }) {
  const root = useRef<HTMLDivElement>(null);
  const preservedScroll = useRef<number | null>(null);
  const [tier, setTier] = useState<ExperienceTier>('premium');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [finePointer, setFinePointer] = useState(false);
  const [wideViewport, setWideViewport] = useState(false);
  const [hasWebgl, setHasWebgl] = useState(false);
  const selectedTier = tierDefinitions[tier];
  const showUltimate = shouldLoadUltimateJourney(tier, reducedMotion, finePointer, wideViewport, hasWebgl);
  const showAtmosphere = shouldLoadPremiumAtmosphere(tier, reducedMotion) || (
    tier === 'ultimate' && !showUltimate && !reducedMotion
  );

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = window.matchMedia('(pointer: fine)');
    const viewport = window.matchMedia('(min-width: 981px)');
    const onReduced = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    const onPointer = (event: MediaQueryListEvent) => setFinePointer(event.matches);
    const onViewport = (event: MediaQueryListEvent) => setWideViewport(event.matches);
    const onHistory = () => setTier(parseExperienceTier(window.location.search));
    const syncFrame = window.requestAnimationFrame(() => {
      setTier(parseExperienceTier(window.location.search));
      setReducedMotion(reduced.matches);
      setFinePointer(pointer.matches);
      setWideViewport(viewport.matches);
      setHasWebgl(webglAvailable());
    });
    reduced.addEventListener('change', onReduced);
    pointer.addEventListener('change', onPointer);
    viewport.addEventListener('change', onViewport);
    window.addEventListener('popstate', onHistory);
    return () => {
      window.cancelAnimationFrame(syncFrame);
      reduced.removeEventListener('change', onReduced);
      pointer.removeEventListener('change', onPointer);
      viewport.removeEventListener('change', onViewport);
      window.removeEventListener('popstate', onHistory);
    };
  }, []);

  useEffect(() => {
    const progress = root.current?.querySelector<HTMLElement>('.concept-progress span');
    const cursor = root.current?.querySelector<HTMLElement>('.concept-cursor');
    const updateScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progress) progress.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    };
    const updatePointer = (event: PointerEvent) => {
      root.current?.style.setProperty('--pointer-x', `${event.clientX}px`);
      root.current?.style.setProperty('--pointer-y', `${event.clientY}px`);
      if (cursor) cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
    };
    updateScroll();
    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('pointermove', updatePointer, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateScroll);
      window.removeEventListener('pointermove', updatePointer);
    };
  }, []);

  useLayoutEffect(() => {
    if (!root.current || reducedMotion || tier === 'essential') return;
    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-concept-reveal]').forEach((element) => {
        gsap.fromTo(element, { y: 72, opacity: 0 }, {
          y: 0,
          opacity: 1,
          duration: tier === 'ultimate' ? 1.2 : 0.95,
          ease: 'power3.out',
          scrollTrigger: { trigger: element, start: 'top 88%', once: true },
        });
      });
      gsap.to('.concept-hero__media picture', {
        yPercent: tier === 'ultimate' ? 14 : 8,
        scale: tier === 'ultimate' ? 1.1 : 1.06,
        ease: 'none',
        scrollTrigger: { trigger: '.concept-hero', start: 'top top', end: 'bottom top', scrub: 1 },
      });
      gsap.to('.concept-orbit', {
        rotate: tier === 'ultimate' ? 110 : 42,
        ease: 'none',
        scrollTrigger: { trigger: '.concept-statement', start: 'top bottom', end: 'bottom top', scrub: 1 },
      });
      if (tier === 'ultimate') {
        gsap.utils.toArray<HTMLElement>('[data-journey-chapter]').forEach((section) => {
          const foreground = Array.from(section.children).filter((element) => (
            !element.classList.contains('concept-hero__media')
          ));
          gsap.to(foreground, {
            yPercent: -5,
            ease: 'none',
            scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: 1.25 },
          });
        });
      }
    }, root);
    return () => context.revert();
  }, [tier, reducedMotion]);

  useLayoutEffect(() => {
    if (preservedScroll.current === null) return;
    window.scrollTo({ top: preservedScroll.current, behavior: 'auto' });
    preservedScroll.current = null;
  }, [tier]);

  const chooseTier = (nextTier: ExperienceTier) => {
    if (nextTier === tier) return;
    if (typeof window !== 'undefined') preservedScroll.current = window.scrollY;
    setTier(nextTier);
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', withExperienceTier(window.location.href, nextTier));
    }
  };

  const onTierKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentTier: ExperienceTier) => {
    const index = tierOrder.indexOf(currentTier);
    let nextIndex = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % tierOrder.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + tierOrder.length) % tierOrder.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tierOrder.length - 1;
    else return;
    event.preventDefault();
    const nextTier = tierOrder[nextIndex];
    chooseTier(nextTier);
    root.current?.querySelector<HTMLButtonElement>(`[data-tier-button="${nextTier}"]`)?.focus();
  };

  const inquiryHref = sitePath(`/?concept=${concept.slug}&tier=${tier}#contact`);

  return (
    <div
      ref={root}
      className={`concept-shell concept-${concept.slug}`}
      data-tier={tier}
      style={{
        '--concept-accent': concept.accent,
        '--concept-glow': concept.glow,
        '--concept-ink': concept.ink,
        '--concept-paper': concept.paper,
        '--atmosphere-refraction': concept.premiumAtmosphere.refraction,
        '--concept-image': `url("${assetPath(`${concept.image}.webp`)}")`,
      } as React.CSSProperties}
    >
      <a className="concept-skip" href="#concept-main">Skip to content</a>
      <div className="concept-progress" aria-hidden="true"><span /></div>
      <div className="concept-cursor" aria-hidden="true"><span>{tier === 'ultimate' ? 'Explore' : 'View'}</span></div>
      <div className="concept-world" aria-hidden="true">
        {showAtmosphere && (
          <Suspense fallback={null}>
            <PremiumAtmosphere preset={concept.premiumAtmosphere} accent={concept.accent} glow={concept.glow} />
          </Suspense>
        )}
        {showUltimate && (
          <Suspense fallback={null}>
            <UltimateScene
              journey={concept.ultimateJourney}
              image={assetPath(`${concept.image}.webp`)}
              accent={concept.accent}
              glow={concept.glow}
            />
          </Suspense>
        )}
        <div className="concept-world__light" />
        <div className="concept-world__grain" />
      </div>
      {showUltimate && (
        <div className="journey-depth" aria-hidden="true">
          <span>Surface</span><i><b /></i><span>Horizon</span>
        </div>
      )}

      <header className="concept-header">
        <a className="concept-header__back" href={sitePath('/#work')} aria-label="Back to Marveto examples">marveto<span>°</span></a>
        <div className="concept-header__identity"><strong>{concept.name}</strong><span>{concept.industry}</span></div>
        <a className="concept-header__cta" href={inquiryHref}>Build with Marveto ↗</a>
      </header>

      <main id="concept-main">
        <section className="concept-hero" aria-labelledby="concept-title" data-journey-chapter="hero">
          <div className="concept-hero__media" aria-hidden="true">
            <ConceptPicture concept={concept} eager />
            <div className="concept-hero__wash" />
            <div className="concept-hero__grid" />
          </div>
          <div className="concept-hero__copy">
            <p className="concept-eyebrow">{concept.industry} · Studio concept · {selectedTier.label} view</p>
            <h1 id="concept-title"><span>{concept.headline}</span><em>{concept.headlineAccent}</em></h1>
            <p className="concept-hero__summary">{concept.summary}</p>
            <div className="concept-actions">
              <a className="concept-pill concept-pill--solid" href="#capabilities">{concept.primaryAction} ↓</a>
              <a className="concept-pill" href="#process">{concept.secondaryAction} ↘</a>
            </div>
          </div>
          <div className="concept-hero__meta" aria-hidden="true">
            <span>{concept.name} / {concept.industry}</span>
            <span>{selectedTier.shortLabel}</span>
            <span>Concept 2026</span>
          </div>
        </section>

        <section className="tier-dock" aria-label="Experience level">
          <div className="tier-dock__intro">
            <span>Choose the build level</span>
            <p>{selectedTier.description}</p>
          </div>
          <div className="tier-tabs" role="tablist" aria-label="Preview quality level">
            {tierOrder.map((tierId) => (
              <button
                key={tierId}
                type="button"
                role="tab"
                data-tier-button={tierId}
                aria-selected={tier === tierId}
                tabIndex={tier === tierId ? 0 : -1}
                onClick={() => chooseTier(tierId)}
                onKeyDown={(event) => onTierKeyDown(event, tierId)}
              >
                <span>0{tierOrder.indexOf(tierId) + 1}</span>
                {tierDefinitions[tierId].label}
              </button>
            ))}
          </div>
          {tier === 'ultimate' && !showUltimate && (
            <p className="tier-fallback" role="status">Ultimate is using its polished static fallback on this device.</p>
          )}
        </section>

        <section className="concept-statement concept-section" aria-labelledby="statement-title" data-journey-chapter="viewpoint">
          <div className="concept-orbit" aria-hidden="true"><span /><i /></div>
          <p className="concept-kicker">Point of view</p>
          <h2 id="statement-title" data-concept-reveal>{concept.statement}</h2>
          <div className="concept-statement__foot" data-concept-reveal>
            <p>{concept.descriptor}</p>
            <p>{concept.note}</p>
          </div>
        </section>

        <section id="capabilities" className="concept-capabilities concept-section" aria-labelledby="capabilities-title" data-journey-chapter="capabilities">
          <div className="concept-section__heading" data-concept-reveal>
            <p className="concept-kicker">The experience</p>
            <h2 id="capabilities-title">Clear by design.<br /><em>Built around the decision.</em></h2>
          </div>
          <div className="concept-module-grid">
            {concept.modules.map((module) => (
              <article key={module.index} data-concept-reveal>
                <div className="concept-module__top"><span>{module.index}</span><p>{module.eyebrow}</p></div>
                <h3>{module.title}</h3>
                <p>{module.description}</p>
                <ul>{module.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
              </article>
            ))}
          </div>
        </section>

        <section className="concept-visual-break" aria-label={`${concept.name} visual direction`}>
          <div className="concept-visual-break__image"><ConceptPicture concept={concept} /></div>
          <div className="concept-visual-break__copy" data-concept-reveal>
            <p className="concept-kicker">Digital direction</p>
            <h2>{concept.headline}<br /><em>{concept.headlineAccent}</em></h2>
            <div><span>{selectedTier.label}</span><p>{selectedTier.description}</p></div>
          </div>
        </section>

        <section id="process" className="concept-process concept-section" aria-labelledby="process-title" data-journey-chapter="process">
          <div className="concept-section__heading" data-concept-reveal>
            <p className="concept-kicker">How it moves</p>
            <h2 id="process-title">One clear path.<br /><em>No missing steps.</em></h2>
          </div>
          <ol>
            {concept.process.map((step) => (
              <li key={step.index} data-concept-reveal>
                <span>{step.index}</span><h3>{step.title}</h3><p>{step.description}</p><i>↘</i>
              </li>
            ))}
          </ol>
        </section>

        <section className="concept-packages concept-section" aria-labelledby="packages-title" data-journey-chapter="package">
          <div className="concept-section__heading" data-concept-reveal>
            <p className="concept-kicker">Three levels of craft</p>
            <h2 id="packages-title">The right level.<br /><em>The same clear thinking.</em></h2>
          </div>
          <div className="package-grid">
            {tierOrder.map((tierId, index) => {
              const definition = tierDefinitions[tierId];
              return (
                <article key={tierId} className={tier === tierId ? 'is-selected' : ''} data-concept-reveal>
                  <button type="button" onClick={() => chooseTier(tierId)} aria-label={`Preview ${definition.label}`}>
                    <span>0{index + 1}</span><small>{definition.motionLevel}</small>
                    <h3>{definition.label}</h3>
                    <p>{definition.description}</p>
                    <ul>{definition.capabilities.map((capability) => <li key={capability}>{capability}</li>)}</ul>
                    <strong>{tier === tierId ? 'Currently viewing' : 'Preview this level'} ↗</strong>
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="concept-final" aria-labelledby="final-title">
          <div className="concept-final__glow" aria-hidden="true" />
          <p className="concept-kicker">Marveto for {concept.industry.toLowerCase()}</p>
          <h2 id="final-title" data-concept-reveal>Want this level of clarity<br /><em>for your company?</em></h2>
          <p data-concept-reveal>Use this concept as a starting point—not a template. We shape the scope, content, and experience around what your company actually needs.</p>
          <a className="concept-pill concept-pill--light" href={inquiryHref}>Discuss the {selectedTier.label} level ↗</a>
          <footer>
            <a href={sitePath('/#index')}>marveto<span>°</span></a>
            <p>{concept.name} · {concept.industry} · Studio concept</p>
            <a href={sitePath('/#work')}>View all examples</a>
            <p>©2026 Marveto</p>
          </footer>
        </section>
      </main>
    </div>
  );
}
