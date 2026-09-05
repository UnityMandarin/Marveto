'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { sitePath } from './asset-path';
import SpatialScene from './SpatialScene';
import { spatialFrame } from './spatial-motion';
import { homeUltimateHref } from './home-journey';
import { applyPackageSelection, buildMailto, formatInquiry, Inquiry, InquiryErrors, validateInquiry } from './inquiry';
import { benefits, marvetoReasons, packageOptionValue, pricingTerms, pricingTierById, pricingTiers, PricingTier, projects, siteConfig } from './site-data';

const emptyInquiry: Inquiry = { name: '', email: '', company: '', preferredPackage: '', brief: '' };
const chapterLinks = [{ label: 'Introduction', href: '#index' }, ...siteConfig.navigation];

export default function MarvetoExperience() {
  const root = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDialogElement>(null);
  const automaticBrief = useRef('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [inquiry, setInquiry] = useState<Inquiry>(emptyInquiry);
  const [errors, setErrors] = useState<InquiryErrors>({});
  const [status, setStatus] = useState('');

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setMotionEnabled(!preference.matches);
    const frame = requestAnimationFrame(sync);
    preference.addEventListener('change', sync);
    return () => { cancelAnimationFrame(frame); preference.removeEventListener('change', sync); };
  }, []);

  useEffect(() => {
    if (menuOpen) menu.current?.showModal();
    else menu.current?.close();
    document.body.classList.toggle('no-scroll', menuOpen);
    return () => document.body.classList.remove('no-scroll');
  }, [menuOpen]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const project = projects.find((item) => item.slug === params.get('concept'));
    const tier = pricingTierById(params.get('tier'));
    if (!project || !tier) return;
    const frame = requestAnimationFrame(() => setInquiry((current) => {
      const result = applyPackageSelection(current, packageOptionValue(tier),
        `We would like to discuss the ${project.title} ${project.sector.split(' · ')[0].toLowerCase()} concept with the ${tier.name} package.`, automaticBrief.current);
      automaticBrief.current = result.automaticBrief;
      return result.inquiry;
    }));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('marveto-motion-paused', !motionEnabled);
    return () => document.documentElement.classList.remove('marveto-motion-paused');
  }, [motionEnabled]);

  useEffect(() => {
    const shell = root.current;
    if (!shell) return;
    let frame = 0;
    let disposed = false;
    const scenes = Array.from(shell.querySelectorAll<HTMLElement>('[data-spatial-section]'));
    let geometry: { node: HTMLElement; top: number; height: number }[] = [];
    let stops: { href: string; top: number }[] = [];
    const progress = shell.querySelector<HTMLElement>('.scroll-progress span');
    const links = Array.from(shell.querySelectorAll<HTMLAnchorElement>('[data-chapter-link]'));
    const update = () => {
      frame = 0;
      const scroll = window.scrollY;
      const viewport = window.innerHeight;
      for (const { node, top, height } of geometry) {
        const value = spatialFrame(scroll, top, height, viewport, motionEnabled);
        // Set all properties on preference changes, including offscreen scenes.
        node.style.setProperty('--scene-scale', value.scale.toFixed(5));
        node.style.setProperty('--foreground-scale', value.foregroundScale.toFixed(5));
        node.style.setProperty('--scene-y', `${value.y.toFixed(3)}px`);
        node.style.setProperty('--foreground-y', `${value.foregroundY.toFixed(3)}px`);
        node.style.setProperty('--scene-progress', value.progress.toFixed(5));
      }
      const max = Math.max(1, document.documentElement.scrollHeight - viewport);
      if (progress) progress.style.transform = `scaleX(${Math.min(1, scroll / max)})`;
      shell.dataset.scrolled = String(scroll > 70);
      shell.dataset.atContact = String(scroll + viewport > (stops.find((s) => s.href === '#contact')?.top ?? Infinity));
      const active = stops.filter((s) => scroll + viewport * 0.36 >= s.top).at(-1)?.href ?? '#index';
      for (const link of links) {
        if (link.getAttribute('href') === active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
    };
    const schedule = () => { if (!frame && !disposed) frame = requestAnimationFrame(update); };
    const measure = () => {
      if (disposed) return;
      geometry = scenes.map((node) => ({ node, top: node.getBoundingClientRect().top + window.scrollY, height: node.offsetHeight }));
      stops = chapterLinks.map(({ href }) => ({ href, top: (shell.querySelector(href)?.getBoundingClientRect().top ?? 0) + window.scrollY }));
      schedule();
    };
    const resize = new ResizeObserver(measure);
    resize.observe(shell);
    measure();
    void document.fonts.ready.then(measure);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', measure);
    return () => { disposed = true; cancelAnimationFrame(frame); resize.disconnect(); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', measure); };
  }, [motionEnabled]);

  const submitInquiry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateInquiry(inquiry);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { setStatus('A few details still need your attention.'); requestAnimationFrame(() => root.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()); return; }
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
    } catch { setStatus('Copy was unavailable. Use Open in email, or copy your details from the fields.'); }
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
    window.requestAnimationFrame(() => {
      document.querySelector('#contact')?.scrollIntoView({ behavior: motionEnabled ? 'smooth' : 'auto', block: 'start' });
      root.current?.querySelector<HTMLInputElement>('[name="name"]')?.focus({ preventScroll: true });
    });
  };

  const field = (key: keyof Inquiry, value: string) => {
    setInquiry((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  return (
    <div ref={root} className="site-shell astra-shell" data-motion={motionEnabled ? 'on' : 'off'}>
      <a className="skip-link" href="#work">Skip to examples</a>
      <div className="scroll-progress" aria-hidden="true"><span /></div>
      <header className="site-header">
        <a className="wordmark" href="#index" aria-label="Marveto home">marveto<span>°</span></a>
        <nav aria-label="Primary navigation">{siteConfig.navigation.map((item) => <a key={item.href} href={item.href} data-chapter-link>{item.label}</a>)}</nav>
        <a className="header-cta" href="#contact">Let’s talk <span aria-hidden="true">↗</span></a>
        <button className="menu-button" type="button" aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => setMenuOpen(true)}>Menu <span aria-hidden="true">☰</span></button>
      </header>
      <dialog ref={menu} id="mobile-menu" className="mobile-menu" onCancel={() => setMenuOpen(false)} onClose={() => setMenuOpen(false)}>
        <div className="menu-top"><a className="wordmark" href="#index" onClick={() => setMenuOpen(false)}>marveto°</a><button type="button" onClick={() => setMenuOpen(false)} aria-label="Close navigation">Close ×</button></div>
        <nav aria-label="Mobile navigation">{siteConfig.navigation.map((item, index) => <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}><small>0{index + 1}</small>{item.label}<span aria-hidden="true">↗</span></a>)}</nav>
        <p>Independent digital studio<br />Strategy · Design · Development</p>
      </dialog>
      <div className="journey-dock">
        <nav aria-label="Page chapters">{chapterLinks.map((item, index) => <a key={item.href} href={item.href} data-chapter-link aria-label={item.label}><span className="dock-index">0{index + 1}</span><span className="dock-label">{item.label}</span></a>)}</nav>
        <button type="button" className="motion-control" aria-pressed={motionEnabled} onClick={() => setMotionEnabled((value) => !value)}><span className="motion-symbol" aria-hidden="true">{motionEnabled ? 'Ⅱ' : '▷'}</span>Motion {motionEnabled ? 'on' : 'off'}</button>
      </div>
      <main>
        <section id="index" className="hero-chapter" data-spatial-section aria-labelledby="hero-title">
          <div className="hero-sticky">
            <SpatialScene scene="surface" eager foreground />
            <div className="hero-copy">
              <p className="eyebrow"><span className="status-dot" /> Independent digital studio <span className="hero-location">SF / Worldwide</span></p>
              <h1 id="hero-title">Websites for<br />companies.<br /><em>Built to be felt.</em></h1>
              <p className="hero-summary">We turn the clearest truth in your company into a digital world people understand, remember, and act on.</p>
              <div className="hero-actions"><a className="pill pill-solid" href="#work">Explore the work <span aria-hidden="true">↘</span></a><a className="underlined-link" href="#contact">Begin a project <span aria-hidden="true">↗</span></a></div>
            </div>
            <div className="hero-foot"><span>Strategy. Design. Development.</span><a href="#signal">Scroll to discover <i aria-hidden="true">↓</i></a><span>Independent by design. / 2026</span></div>
            <div className="material-label" aria-hidden="true"><i /><span>Clarity takes form.</span></div>
          </div>
        </section>
        <section id="signal" className="signal-section section-pad" data-spatial-section aria-labelledby="signal-title">
          <SpatialScene scene="signal" />
          <div className="signal-top"><p className="eyebrow">01 / The first impression</p><span className="signal-coordinate" aria-hidden="true">Clarity → Character → Connection</span></div>
          <h2 id="signal-title">Before the meeting,<br /><em>there is a feeling.</em></h2>
          <div className="signal-bottom"><span className="signal-mark" aria-hidden="true">m°</span><div><p>Your website is the first room people enter. It can flatten a company into information—or give its ambition a physical presence.</p><p>Marveto finds the signal, gives it form, and builds the world around it. Calm type. Precise movement. No borrowed personality.</p></div></div>
        </section>
        <section id="work" className="work-section" aria-labelledby="work-title">
          <div className="work-heading section-pad"><div><p className="eyebrow">02 / Selected worlds</p><h2 id="work-title">A different company.<br /><em>A different feeling.</em></h2></div><p>Three original studio concepts.<br />Explore the experience, then imagine yours.</p></div>
          {projects.map((project) => (
            <section key={project.slug} id={`work-${project.slug}`} className={`project-chapter project-${project.slug}`} data-spatial-section aria-labelledby={`${project.slug}-title`}>
              <div className="project-sticky">
                <SpatialScene scene={project.slug as 'axiom' | 'serein' | 'forma'} />
                <div className="project-frame" aria-hidden="true"><span>MARVETO / {project.sector.split(' · ')[0].toUpperCase()}</span><span>STUDIO CONCEPT · {project.index} / 03</span><i /><i /></div>
                <div className="project-copy"><p className="eyebrow">{project.sector}</p><h3 id={`${project.slug}-title`}>{project.title}<span>°</span></h3><p className="project-statement">{project.statement}</p><a className="pill pill-glass" href={sitePath(homeUltimateHref(project.slug))}>Enter {project.title} <span aria-hidden="true">↗</span></a></div>
                <div className="project-bottom"><details className="project-detail"><summary>Inside the concept <span aria-hidden="true">+</span></summary><div><p>{project.summary}</p><ul>{project.deliverables.map((item) => <li key={item}>{item}</li>)}</ul></div></details><nav aria-label={`${project.title} sequence`}>{projects.map((item) => <a href={`#work-${item.slug}`} key={item.slug} aria-current={item.slug === project.slug ? 'true' : undefined}><span>{item.index}</span>{item.title}</a>)}</nav></div>
              </div>
            </section>
          ))}
        </section>
        <section id="why" className="evidence-section section-pad" aria-labelledby="why-title">
          <div className="section-aside"><p className="eyebrow">03 / Why it matters</p><h2 id="why-title">More than<br /><em>a first look.</em></h2><p>A good website earns its place in your business. Here’s what it can change.</p><a href="#pricing" className="underlined-link">Find your starting point <span aria-hidden="true">↗</span></a></div>
          <div className="evidence-list">{benefits.map((benefit, index) => <details key={benefit.index} open={index === 0} name="business-evidence"><summary><span className="item-index">{benefit.index}</span><h3>{benefit.title}</h3><span className="disclosure-icon" aria-hidden="true">+</span></summary><div className="disclosure-body"><p>{benefit.description}</p><a href={benefit.sourceUrl} target="_blank" rel="noreferrer">{benefit.source} <span aria-hidden="true">↗</span></a></div></details>)}</div>
        </section>
        <section id="why-marveto" className="studio-section section-pad" data-spatial-section aria-labelledby="studio-title">
          <SpatialScene scene="studio" />
          <div className="studio-heading"><p className="eyebrow">04 / The way we work</p><h2 id="studio-title">A small studio.<br /><em>A defined commitment.</em></h2></div>
          <div className="commitment-grid">{marvetoReasons.map((reason) => <details key={reason.index}><summary><span className="item-index">{reason.index}</span><h3>{reason.title}</h3><span className="disclosure-icon" aria-hidden="true">+</span></summary><p>{reason.description}</p></details>)}</div>
          <div className="studio-note"><span>Custom code. Clear terms. Human conversations.</span><a className="underlined-link" href="#contact">Meet your next website <span aria-hidden="true">↗</span></a></div>
        </section>
        <section id="pricing" className="pricing-section section-pad" aria-labelledby="pricing-title">
          <div className="pricing-heading"><div><p className="eyebrow">05 / A clear starting point</p><h2 id="pricing-title">Choose the level.<br /><em>Know the terms.</em></h2></div><p>Three levels of craft.<br />The same care, from brief to handover.</p></div>
          <div className="pricing-grid">{pricingTiers.map((tier) => <article key={tier.id} className={`pricing-card pricing-card--${tier.id}`} data-selected={inquiry.preferredPackage === packageOptionValue(tier)}>
            <div className="pricing-card__top"><span>0{pricingTiers.indexOf(tier) + 1} / {tier.name}</span>{tier.badge && <small>{tier.badge}</small>}</div>
            <h3>{tier.name}</h3><p className="pricing-card__price">{tier.displayPrice}<span>USD / project</span></p><p className="pricing-card__positioning">{tier.positioning}</p>
            <button type="button" onClick={() => choosePackage(tier)} aria-pressed={inquiry.preferredPackage === packageOptionValue(tier)}><span>{inquiry.preferredPackage === packageOptionValue(tier) ? `${tier.name} selected` : tier.cta}</span><span aria-hidden="true">↗</span></button>
            <ul>{tier.features.map((feature) => <li key={feature}>{feature}</li>)}</ul><dl><div><dt>Delivery</dt><dd>{tier.turnaround}</dd></div><div><dt>Additional revisions</dt><dd>${tier.additionalRevisionPrice} each</dd></div></dl>
          </article>)}</div>
          <aside className="pricing-terms" aria-label="Terms shared by all packages"><p><span aria-hidden="true">↳</span> Same transparent terms. Every tier.</p><div>{pricingTerms.map((term) => <details key={term.title}><summary>{term.title}<span aria-hidden="true">+</span></summary><p>{term.description}</p></details>)}</div></aside>
        </section>
        <section id="contact" className="contact-section section-pad" data-spatial-section aria-labelledby="contact-title">
          <SpatialScene scene="contact" />
          <div className="contact-layout"><div className="contact-heading"><p className="eyebrow">06 / Your next chapter</p><h2 id="contact-title">Bring the ambition.<br /><em>We’ll shape<br />the signal.</em></h2><p>You do not need a polished brief. Tell us what the company is becoming and what the current experience cannot yet hold.</p><a className="contact-email" href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail} <span aria-hidden="true">↗</span></a></div>
            <form onSubmit={submitInquiry} noValidate><div className="form-heading"><span>Start a conversation</span><span aria-hidden="true">↗</span></div><p className="form-note">Your brief stays here until you send it in your email app.</p>
              <label><span>Your name *</span><input name="name" autoComplete="name" required value={inquiry.name} onChange={(event) => field('name', event.target.value)} aria-invalid={!!errors.name} aria-describedby="name-error" placeholder="Jane Smith" /><small id="name-error">{errors.name}</small></label>
              <label><span>Email *</span><input name="email" autoComplete="email" required type="email" value={inquiry.email} onChange={(event) => field('email', event.target.value)} aria-invalid={!!errors.email} aria-describedby="email-error" placeholder="jane@company.com" /><small id="email-error">{errors.email}</small></label>
              <label><span>Company</span><input name="organization" autoComplete="organization" value={inquiry.company} onChange={(event) => field('company', event.target.value)} placeholder="Your company" /></label>
              <label><span>Preferred package *</span><select required value={inquiry.preferredPackage} onChange={(event) => field('preferredPackage', event.target.value)} aria-invalid={!!errors.preferredPackage} aria-describedby="package-error"><option value="">Choose a package</option>{pricingTiers.map((tier) => <option key={tier.id} value={packageOptionValue(tier)}>{packageOptionValue(tier)}</option>)}<option>Not sure yet</option></select><small id="package-error">{errors.preferredPackage}</small></label>
              <label className="form-wide"><span>What should the website make possible? *</span><textarea required value={inquiry.brief} onChange={(event) => field('brief', event.target.value)} aria-invalid={!!errors.brief} aria-describedby="brief-error" rows={4} placeholder="Clarify the offer, earn trust, open a market…" /><small id="brief-error">{errors.brief}</small></label>
              <div className="form-actions form-wide"><button type="submit" className="pill pill-light">Open in email <span aria-hidden="true">↗</span></button><button type="button" className="text-button" onClick={copyBrief}>Copy project brief</button></div><p className="form-status form-wide" role="status" aria-live="polite">{status}</p>
            </form>
          </div>
          <footer><div className="footer-top"><a className="wordmark" href="#index">marveto<span>°</span></a><p>Strategy · Design · Development<br />Independent digital studio</p><a href="#index">Back to the beginning <span aria-hidden="true">↑</span></a></div><div className="footer-bottom"><span>©2026 Marveto. Original work only.</span><span>Websites for companies. Built to be felt.</span></div></footer>
        </section>
      </main>
    </div>
  );
}
