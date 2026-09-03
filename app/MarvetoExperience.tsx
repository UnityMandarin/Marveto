'use client';

import { FormEvent, MouseEvent, useEffect, useRef, useState } from 'react';
import { assetPath, sitePath } from './asset-path';
import HeroThreeWorld from './HeroThreeWorld';
import HomeWorld from './HomeWorld';
import { homeChapters, homeUltimateHref, mapHomeScrollProgress, sampleHomeJourney, sampleJourneyFrame } from './home-journey';
import { applyPackageSelection, buildMailto, formatInquiry, Inquiry, InquiryErrors, validateInquiry } from './inquiry';
import { authoredSceneOrder, authoredScenes, AuthoredSceneId } from './scene-registry';
import { benefits, marvetoReasons, packageOptionValue, pricingTerms, pricingTierById, pricingTiers, PricingTier, projects, siteConfig } from './site-data';

const emptyInquiry: Inquiry = { name: '', email: '', company: '', preferredPackage: '', brief: '' };

function FallbackScene({ sceneId, eager = false }: { sceneId: AuthoredSceneId; eager?: boolean }) {
  const scene = authoredScenes[sceneId];
  return (
    <picture>
      <source media="(max-width: 819px)" srcSet={assetPath(scene.mobileAvif)} type="image/avif" />
      <source media="(max-width: 819px)" srcSet={assetPath(scene.mobileBase)} type="image/webp" />
      <source srcSet={assetPath(scene.desktopAvif)} type="image/avif" />
      <source srcSet={assetPath(scene.desktopBase)} type="image/webp" />
      <img src={assetPath(scene.desktopBase)} alt="" loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : 'auto'} decoding="async" />
    </picture>
  );
}

export default function MarvetoExperience() {
  const root = useRef<HTMLDivElement>(null);
  const automaticBrief = useRef('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [transitioning, setTransitioning] = useState<string | null>(null);
  const [inquiry, setInquiry] = useState<Inquiry>(emptyInquiry);
  const [errors, setErrors] = useState<InquiryErrors>({});
  const [status, setStatus] = useState('');

  useEffect(() => {
    document.body.classList.toggle('no-scroll', menuOpen);
    return () => document.body.classList.remove('no-scroll');
  }, [menuOpen]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const concept = params.get('concept');
    const tier = pricingTierById(params.get('tier'));
    if (!concept || !tier) return;
    const project = projects.find((item) => item.slug === concept);
    if (!project) return;
    const frame = window.requestAnimationFrame(() => setInquiry((current) => {
      const result = applyPackageSelection(
        current,
        packageOptionValue(tier),
        `We would like to discuss the ${project.title} ${project.sector.split(' · ')[0].toLowerCase()} concept with the ${tier.name} package.`,
        automaticBrief.current,
      );
      automaticBrief.current = result.automaticBrief;
      return result.inquiry;
    }));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const progressBar = root.current?.querySelector<HTMLElement>('.scroll-progress span');
    const cursor = root.current?.querySelector<HTMLElement>('.cursor');
    const cursorLabel = cursor?.querySelector<HTMLElement>('span');
    let sectionStops = homeChapters.map((_, index) => index / homeChapters.length);
    const measure = () => {
      const maximum = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      sectionStops = homeChapters.map((chapter, index) => {
        const section = root.current?.querySelector<HTMLElement>(`[data-home-chapter="${chapter.id}"]`);
        if (!section) return index / homeChapters.length;
        const raw = (section.getBoundingClientRect().top + window.scrollY) / maximum;
        return index === homeChapters.length - 1 ? Math.min(raw, 0.94) : Math.min(1, Math.max(0, raw));
      });
    };
    const updateScroll = () => {
      const maximum = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const pageProgress = Math.min(1, Math.max(0, window.scrollY / maximum));
      const progress = mapHomeScrollProgress(pageProgress, sectionStops);
      if (progressBar) progressBar.style.transform = `scaleX(${progress})`;
      if (!root.current) return;
      root.current.style.setProperty('--home-progress', progress.toFixed(4));
      let physicalChapter = 0;
      for (let index = 1; index < sectionStops.length; index += 1) {
        if (pageProgress + 0.0005 >= sectionStops[index]) physicalChapter = index;
      }
      const active = homeChapters[physicalChapter] ?? sampleHomeJourney(progress).chapter;
      root.current.dataset.chapter = active.id;
      homeChapters.forEach((item, index) => {
        const section = root.current?.querySelector<HTMLElement>(`[data-home-chapter="${item.id}"]`);
        if (!section) return;
        const physicalStart = sectionStops[index];
        const physicalEnd = index === sectionStops.length - 1 ? 1 : Math.max(sectionStops[index + 1], physicalStart + 0.0001);
        const local = Math.min(1, Math.max(0, (pageProgress - physicalStart) / Math.max(physicalEnd - physicalStart, 0.0001)));
        const frame = sampleJourneyFrame(item.start + local * (item.end - item.start));
        const sectionTop = section.getBoundingClientRect().top + window.scrollY;
        const stickyDistance = Math.max(section.offsetHeight - window.innerHeight, 1);
        const stickyLocal = Math.min(1, Math.max(0, (window.scrollY - sectionTop) / stickyDistance));
        section.style.setProperty('--section-progress', local.toFixed(4));
        section.style.setProperty('--section-copy-opacity', item.id === 'services' ? '1' : frame.copyOpacity.toFixed(4));
        section.dataset.copyPhase = frame.copyPhase;
        if (item.id === 'services') section.dataset.activeItem = String(Math.min(benefits.length - 1, Math.floor(stickyLocal * benefits.length)));
        if (item.id === 'studio') section.dataset.activeItem = String(Math.min(marvetoReasons.length - 1, Math.floor(stickyLocal * marvetoReasons.length)));
      });
    };
    const updateCursor = (event: PointerEvent) => {
      root.current?.style.setProperty('--pointer-x', `${event.clientX}px`);
      root.current?.style.setProperty('--pointer-y', `${event.clientY}px`);
      if (!cursor) return;
      cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      const interactive = (event.target as Element | null)?.closest<HTMLElement>('[data-cursor]');
      cursor.classList.toggle('is-active', Boolean(interactive));
      if (cursorLabel) cursorLabel.textContent = interactive?.dataset.cursor || '';
    };
    measure();
    updateScroll();
    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('resize', measure);
    window.addEventListener('pointermove', updateCursor, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateScroll);
      window.removeEventListener('resize', measure);
      window.removeEventListener('pointermove', updateCursor);
    };
  }, []);

  const enterProject = (event: MouseEvent<HTMLAnchorElement>, slug: string) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (transitioning) return;
    root.current?.setAttribute('data-transition-scene', slug);
    event.currentTarget.closest('.project-chapter')?.querySelector<HTMLElement>('h2')
      ?.style.setProperty('view-transition-name', 'marveto-project-title');
    if (CSS.supports('view-transition-name: marveto-world')) return;
    event.preventDefault();
    setTransitioning(slug);
    window.setTimeout(() => { window.location.href = sitePath(homeUltimateHref(slug)); }, 520);
  };

  const navigateMobile = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault();
    setMenuOpen(false);
    window.setTimeout(() => {
      window.history.pushState({}, '', href);
      document.querySelector(href)?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }, 80);
  };

  const submitInquiry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateInquiry(inquiry);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { setStatus('A few details still need your attention.'); return; }
    setStatus('Opening your email app with the brief ready to send.');
    window.location.href = buildMailto(siteConfig.contactEmail, inquiry);
  };

  const copyBrief = async () => {
    const nextErrors = validateInquiry(inquiry);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { setStatus('Complete the highlighted fields before copying the brief.'); return; }
    try {
      await navigator.clipboard.writeText(formatInquiry(inquiry));
      setStatus('Project brief copied. Paste it wherever you like.');
    } catch { setStatus('Copy was blocked by the browser. Select the text and try again.'); }
  };

  const choosePackage = (tier: PricingTier) => {
    setInquiry((current) => {
      const result = applyPackageSelection(
        current,
        packageOptionValue(tier),
        `I would like to discuss the ${tier.name} package for my website.`,
        automaticBrief.current,
      );
      automaticBrief.current = result.automaticBrief;
      return result.inquiry;
    });
    setErrors((current) => ({ ...current, preferredPackage: undefined }));
    setStatus(`${tier.name} selected. Continue with the project details below.`);
    window.requestAnimationFrame(() => document.querySelector('#contact')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    }));
  };

  const field = (key: keyof Inquiry, value: string) => {
    setInquiry((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  return (
    <div ref={root} className={`site-shell ${transitioning ? 'is-transitioning' : ''}`}>
      <a className="skip-link" href="#work">Skip to selected work</a>
      <div className="scroll-progress" aria-hidden="true"><span /></div>
      <div className="cursor" aria-hidden="true"><span /></div>

      <div className="home-stage" aria-hidden="true">
        <div className="home-fallback">
          {authoredSceneOrder.map((sceneId) => (
            <div key={sceneId} className={`fallback-plate plate-${sceneId}`} data-scene={sceneId}>
              <FallbackScene sceneId={sceneId} eager={sceneId === 'surface'} />
            </div>
          ))}
        </div>
        <HomeWorld />
        <HeroThreeWorld />
      </div>

      <div className="cinematic-narrative" aria-hidden="true">
        <p className="cinematic-narrative__kicker">01 · The signal</p>
        <p className="cinematic-narrative__lead">Before the meeting,<br /><em>there is a feeling.</em></p>
        <div className="cinematic-narrative__body">
          <p>Your website is the first room people enter. It can flatten a company into information—or give its ambition a physical presence.</p>
          <p>Marveto finds the signal, gives it form, and builds the world around it. Calm type. Precise movement. No borrowed personality.</p>
        </div>
      </div>
      <div className="cinematic-blackout" aria-hidden="true" />

      <div className="route-transition" aria-hidden="true">
        {transitioning && <FallbackScene sceneId={transitioning as 'axiom' | 'serein' | 'forma'} eager />}
        <span>{transitioning ? `Entering ${transitioning}` : ''}</span>
      </div>

      <header className="site-header">
        <a className="wordmark" href="#index" aria-label="Marveto home">marveto<span>°</span></a>
        <nav aria-label="Primary navigation">{siteConfig.navigation.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}</nav>
        <a className="header-cta" href="#contact">Start a project <span>↘</span></a>
        <button className="menu-button" type="button" aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? 'Close' : 'Menu'}</button>
      </header>
      <div id="mobile-menu" className={`mobile-menu ${menuOpen ? 'is-open' : ''}`} aria-hidden={!menuOpen}>
        {siteConfig.navigation.map((item, index) => <a key={item.href} href={item.href} onClick={(event) => navigateMobile(event, item.href)}><small>0{index + 1}</small>{item.label}</a>)}
        <p>Independent digital studio<br />Strategy · Design · Development</p>
      </div>

      <main id="index">
        <section className="journey-chapter hero-chapter tone-dark" data-home-chapter="surface" aria-labelledby="hero-title">
          <div className="chapter-copy hero-copy" data-chapter-copy>
            <p className="eyebrow hero-detail">Independent digital studio · SF / Worldwide</p>
            <h1 id="hero-title">
              <span className="hero-line"><span data-hero-word>Websites for companies.</span></span>
              <span className="hero-line"><em data-hero-word>Built to be felt.</em></span>
            </h1>
            <p className="hero-summary hero-detail">We turn the clearest truth in your company into a digital world people understand, remember, and act on.</p>
            <div className="hero-actions hero-detail"><a className="glass-pill glass-pill--dark" href="#work" data-cursor="Explore">Enter the work <span>↓</span></a><a className="text-link" href="#contact">Begin a project <span>↘</span></a></div>
          </div>
          <div className="chapter-index hero-detail" aria-hidden="true"><span>00—01</span><i /><span>Move to enter</span></div>
          <div className="chapter-meta hero-detail" aria-hidden="true"><span>Strategy · Design · Development</span><span>©2026</span></div>
        </section>

        <section className="journey-chapter signal-chapter tone-light" data-home-chapter="signal" aria-labelledby="signal-title">
          <div className="chapter-copy signal-copy" data-chapter-copy>
            <p className="chapter-kicker">01 · The signal</p>
            <h2 id="signal-title">Before the meeting,<br /><em>there is a feeling.</em></h2>
            <div className="split-copy"><p>Your website is the first room people enter. It can flatten a company into information—or give its ambition a physical presence.</p><p>Marveto finds the signal, gives it form, and builds the world around it. Calm type. Precise movement. No borrowed personality.</p></div>
          </div>
          <p className="depth-phrase" aria-hidden="true">CLARITY / CHARACTER / MOTION</p>
        </section>

        <div id="work" className="project-journey" aria-label="Selected concept worlds">
          {projects.map((project) => (
            <section key={project.slug} className={`journey-chapter project-chapter project-${project.slug} tone-light`} data-home-chapter={project.slug} aria-labelledby={`${project.slug}-title`}>
              <div className="project-depth-word" aria-hidden="true">{project.title}</div>
              <div className="chapter-copy project-copy" data-chapter-copy>
                <p className="chapter-kicker">0{Number(project.index) + 1} · {project.sector}</p>
                <h2 id={`${project.slug}-title`}>{project.title}</h2>
                <p className="project-statement">{project.statement}</p>
                <a href={sitePath(homeUltimateHref(project.slug))} onClick={(event) => enterProject(event, project.slug)} className="project-entry" aria-label={`Enter the ${project.title} Ultimate concept`} data-cursor="Enter"><span>Enter {project.title}</span><i>↗</i></a>
              </div>
              <div className="project-coordinate" aria-hidden="true"><span>Concept / 2026</span><span>{project.index} — 03</span></div>
            </section>
          ))}
        </div>

        <section id="why" className="journey-chapter services-chapter why-chapter tone-light" data-home-chapter="services" aria-labelledby="why-title">
          <div className="chapter-copy services-copy why-copy" data-chapter-copy>
            <p className="chapter-kicker">05 · Evidence, not assumptions</p><h2 id="why-title">Why a website matters.<br /><em>Seven business consequences.</em></h2>
            <div className="benefit-sequence">{benefits.map((benefit) => <article key={benefit.index}><span>{benefit.index}</span><div><h3>{benefit.title}</h3><p>{benefit.description}</p><a href={benefit.sourceUrl} target="_blank" rel="noreferrer">Source: {benefit.source} <i aria-hidden="true">↗</i></a></div></article>)}</div>
          </div>
        </section>

        <section id="why-marveto" className="journey-chapter studio-chapter tone-light" data-home-chapter="studio" aria-labelledby="why-marveto-title">
          <div className="chapter-copy studio-copy" data-chapter-copy>
            <p className="chapter-kicker">06 · Why Marveto</p>
            <h2 id="why-marveto-title">A small studio.<br /><em>A defined commitment.</em></h2>
            <div className="reason-sequence">
              {marvetoReasons.map((reason) => (
                <article key={reason.index}>
                  <span>{reason.index}</span>
                  <div><h3>{reason.title}</h3><p>{reason.description}</p></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="journey-chapter pricing-chapter tone-light" data-home-chapter="pricing" aria-labelledby="pricing-title">
          <div className="chapter-copy pricing-copy" data-chapter-copy>
            <div className="pricing-heading">
              <p className="chapter-kicker">07 · Pricing</p>
              <h2 id="pricing-title">Choose the level.<br /><em>Know the terms.</em></h2>
            </div>
            <div className="pricing-grid">
              {pricingTiers.map((tier) => (
                <article key={tier.id} className={`pricing-card pricing-card--${tier.id}`}>
                  <div className="pricing-card__top">
                    <span>{tier.index}</span>
                    {tier.badge && <small>{tier.badge}</small>}
                  </div>
                  <h3>{tier.name}</h3>
                  <p className="pricing-card__price">{tier.displayPrice}</p>
                  <p className="pricing-card__positioning">{tier.positioning}</p>
                  <ul>{tier.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
                  <dl>
                    <div><dt>Delivery</dt><dd>{tier.turnaround}</dd></div>
                    <div><dt>Additional revisions</dt><dd>${tier.additionalRevisionPrice} each</dd></div>
                  </dl>
                  <button
                    type="button"
                    onClick={() => choosePackage(tier)}
                    aria-pressed={inquiry.preferredPackage === packageOptionValue(tier)}
                    data-cursor="Choose"
                  >
                    <span>{tier.cta}</span><i aria-hidden="true">↘</i>
                  </button>
                </article>
              ))}
            </div>
            <aside className="pricing-terms" aria-label="Terms shared by all packages">
              {pricingTerms.map((term) => <div key={term.title}><strong>{term.title}</strong><p>{term.description}</p></div>)}
            </aside>
          </div>
        </section>

        <section id="contact" className="journey-chapter contact-chapter tone-light" data-home-chapter="contact" aria-labelledby="contact-title">
          <div className="chapter-copy contact-copy" data-chapter-copy>
            <div className="contact-heading"><p className="chapter-kicker">08 · Contact</p><h2 id="contact-title">Bring the ambition.<br /><em>We’ll shape the signal.</em></h2><p>You do not need a polished brief. Tell us what the company is becoming and what the current experience cannot yet hold.</p></div>
            <form onSubmit={submitInquiry} noValidate>
              <label><span>Your name *</span><input value={inquiry.name} onChange={(event) => field('name', event.target.value)} aria-invalid={!!errors.name} aria-describedby="name-error" placeholder="Jane Smith" /><small id="name-error">{errors.name}</small></label>
              <label><span>Email *</span><input type="email" value={inquiry.email} onChange={(event) => field('email', event.target.value)} aria-invalid={!!errors.email} aria-describedby="email-error" placeholder="jane@company.com" /><small id="email-error">{errors.email}</small></label>
              <label><span>Company</span><input value={inquiry.company} onChange={(event) => field('company', event.target.value)} placeholder="Your company" /></label>
              <label><span>Preferred package *</span><select value={inquiry.preferredPackage} onChange={(event) => field('preferredPackage', event.target.value)} aria-invalid={!!errors.preferredPackage} aria-describedby="package-error"><option value="">Choose a package</option>{pricingTiers.map((tier) => <option key={tier.id} value={packageOptionValue(tier)}>{packageOptionValue(tier)}</option>)}<option>Not sure yet</option></select><small id="package-error">{errors.preferredPackage}</small></label>
              <label className="form-wide"><span>What should the website make possible? *</span><textarea value={inquiry.brief} onChange={(event) => field('brief', event.target.value)} aria-invalid={!!errors.brief} aria-describedby="brief-error" rows={3} placeholder="Clarify the offer, earn trust, open a market, create qualified demand…" /><small id="brief-error">{errors.brief}</small></label>
              <div className="form-actions form-wide"><button type="submit" className="glass-pill glass-pill--light" data-cursor="Send">Open in email <span>↗</span></button><button type="button" className="text-button" onClick={copyBrief}>Copy project brief</button><p role="status" aria-live="polite">{status}</p></div>
            </form>
          </div>
          <footer><a className="footer-wordmark" href="#index">marveto<span>°</span></a><p>Independent digital studio<br />Strategy · Design · Development</p><a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a><p>©2026 Marveto.<br />Original work only.</p></footer>
        </section>
      </main>
    </div>
  );
}
