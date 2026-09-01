'use client';

import { FormEvent, MouseEvent, useEffect, useRef, useState } from 'react';
import { assetPath, sitePath } from './asset-path';
import HomeWorld from './HomeWorld';
import { homeChapters, homeUltimateHref, mapHomeScrollProgress, sampleHomeJourney, sampleJourneyFrame } from './home-journey';
import { buildMailto, formatInquiry, Inquiry, InquiryErrors, validateInquiry } from './inquiry';
import { authoredSceneOrder, authoredScenes, AuthoredSceneId } from './scene-registry';
import { benefits, process, projects, siteConfig } from './site-data';

const emptyInquiry: Inquiry = { name: '', email: '', company: '', budget: '', brief: '' };

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
    const tier = params.get('tier');
    if (!concept || !tier) return;
    const project = projects.find((item) => item.slug === concept);
    if (!project) return;
    const frame = window.requestAnimationFrame(() => setInquiry((current) => current.brief ? current : {
      ...current,
      brief: `We would like to discuss the ${project.title} ${project.sector.split(' · ')[0].toLowerCase()} concept at the ${tier} level.`,
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
        if (item.id === 'process') section.dataset.activeItem = String(Math.min(3, Math.floor(stickyLocal * 4)));
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
      </div>

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
              <span className="masked-line"><span data-hero-word>Websites for companies.</span></span>
              <span className="masked-line"><em data-hero-word>Built to be felt.</em></span>
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

        <section id="process" className="journey-chapter process-chapter tone-light" data-home-chapter="process" aria-labelledby="process-title">
          <div className="chapter-copy process-copy" data-chapter-copy>
            <p className="chapter-kicker">06 · A deliberate passage</p><h2 id="process-title">Four thresholds.<br /><em>One clear direction.</em></h2>
            <ol className="thresholds">{process.map((step) => <li key={step.index} className="threshold"><span>{step.index}</span><h3>{step.title}</h3><p>{step.copy}</p><i>↘</i></li>)}</ol>
          </div>
        </section>

        <section id="contact" className="journey-chapter contact-chapter tone-light" data-home-chapter="contact" aria-labelledby="contact-title">
          <div className="chapter-copy contact-copy" data-chapter-copy>
            <div className="contact-heading"><p className="chapter-kicker">07 · Convergence</p><h2 id="contact-title">Bring the ambition.<br /><em>We’ll shape the signal.</em></h2><p>You do not need a polished brief. Tell us what the company is becoming and what the current experience cannot yet hold.</p></div>
            <form onSubmit={submitInquiry} noValidate>
              <label><span>Your name *</span><input value={inquiry.name} onChange={(event) => field('name', event.target.value)} aria-invalid={!!errors.name} aria-describedby="name-error" placeholder="Jane Smith" /><small id="name-error">{errors.name}</small></label>
              <label><span>Email *</span><input type="email" value={inquiry.email} onChange={(event) => field('email', event.target.value)} aria-invalid={!!errors.email} aria-describedby="email-error" placeholder="jane@company.com" /><small id="email-error">{errors.email}</small></label>
              <label><span>Company</span><input value={inquiry.company} onChange={(event) => field('company', event.target.value)} placeholder="Your company" /></label>
              <label><span>Working budget *</span><select value={inquiry.budget} onChange={(event) => field('budget', event.target.value)} aria-invalid={!!errors.budget} aria-describedby="budget-error"><option value="">Choose a range</option><option>Under $5k</option><option>$5k–$10k</option><option>$10k–$25k</option><option>$25k+</option><option>Not sure yet</option></select><small id="budget-error">{errors.budget}</small></label>
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
