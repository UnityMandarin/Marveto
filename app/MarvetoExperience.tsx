'use client';

import { FormEvent, MouseEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { assetPath, sitePath } from './asset-path';
import HomeWorld from './HomeWorld';
import { homeChapters, homeUltimateHref, mapHomeScrollProgress, sampleHomeJourney } from './home-journey';
import { buildMailto, formatInquiry, Inquiry, InquiryErrors, validateInquiry } from './inquiry';
import { process, projects, services, siteConfig } from './site-data';

const emptyInquiry: Inquiry = { name: '', email: '', company: '', budget: '', brief: '' };

function FallbackPicture({ name, eager = false }: { name: string; eager?: boolean }) {
  return (
    <picture>
      <source srcSet={assetPath(`/images/${name}.avif`)} type="image/avif" />
      <source srcSet={assetPath(`/images/${name}.webp`)} type="image/webp" />
      <img src={assetPath(`/images/${name}.webp`)} alt="" loading={eager ? 'eager' : 'lazy'}
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
      root.current.dataset.chapter = homeChapters[physicalChapter]?.id ?? sampleHomeJourney(progress).chapter.id;
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

  useLayoutEffect(() => {
    if (!root.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      gsap.fromTo('[data-hero-word]', { yPercent: 115 }, {
        yPercent: 0, duration: 1.25, delay: 0.75, stagger: 0.09, ease: 'power4.out',
      });
      gsap.fromTo('.hero-detail', { opacity: 0, y: 20 }, {
        opacity: 1, y: 0, duration: 1, delay: 1.25, stagger: 0.08, ease: 'power3.out',
      });
      gsap.utils.toArray<HTMLElement>('[data-chapter-copy]').forEach((copy) => {
        const section = copy.closest<HTMLElement>('[data-home-chapter]');
        if (!section || section.dataset.homeChapter === 'surface') return;
        gsap.timeline({ scrollTrigger: { trigger: section, start: 'top 88%', end: 'bottom 12%', scrub: 1.15 } })
          .fromTo(copy, { y: 95, opacity: 0, filter: 'blur(10px)' }, {
            y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.4, ease: 'power3.out',
          })
          .to(copy, { y: -70, opacity: 0.18, filter: 'blur(3px)', duration: 0.6, ease: 'power2.in' });
      });
      gsap.utils.toArray<HTMLElement>('.project-depth-word').forEach((word) => {
        const section = word.closest<HTMLElement>('.project-chapter');
        if (!section) return;
        gsap.fromTo(word, { xPercent: -12, opacity: 0 }, {
          xPercent: 10, opacity: 0.2, ease: 'none',
          scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: 1 },
        });
      });
      gsap.utils.toArray<HTMLElement>('.threshold').forEach((threshold) => {
        gsap.fromTo(threshold, { '--gate-open': 0 } as gsap.TweenVars, {
          '--gate-open': 1, ease: 'none',
          scrollTrigger: { trigger: threshold, start: 'top 82%', end: 'center 38%', scrub: 0.9 },
        } as gsap.TweenVars);
      });
    }, root);
    return () => context.revert();
  }, []);

  const enterProject = (event: MouseEvent<HTMLAnchorElement>, slug: string) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    event.preventDefault();
    if (transitioning) return;
    setTransitioning(slug);
    window.setTimeout(() => { window.location.href = sitePath(homeUltimateHref(slug)); }, 720);
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
          <div className="fallback-plate plate-surface"><FallbackPicture name="hero-ultimate" eager /></div>
          <div className="fallback-plate plate-signal"><FallbackPicture name="home-signal" /></div>
          <div className="fallback-plate plate-axiom"><FallbackPicture name="axiom" /></div>
          <div className="fallback-plate plate-serein"><FallbackPicture name="forma" /></div>
          <div className="fallback-plate plate-forma"><FallbackPicture name="serein" /></div>
          <div className="fallback-plate plate-horizon"><FallbackPicture name="home-horizon" /></div>
        </div>
        <HomeWorld />
        <div className="world-light" />
        <div className="world-grain" />
      </div>

      <div className="route-iris" aria-hidden="true"><span>{transitioning ? `Entering ${transitioning}` : ''}</span></div>

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

        <section id="services" className="journey-chapter services-chapter tone-light" data-home-chapter="services" aria-labelledby="services-title">
          <div className="chapter-copy services-copy" data-chapter-copy>
            <p className="chapter-kicker">05 · The studio system</p><h2 id="services-title">One idea.<br /><em>Three strata.</em></h2>
            <div className="service-strata">{services.map((service) => <article key={service.index}><span>{service.index}</span><div><h3>{service.title}</h3><p>{service.description}</p></div><ul>{service.outputs.map((output) => <li key={output}>{output}</li>)}</ul></article>)}</div>
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
