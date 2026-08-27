'use client';

import { FormEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { assetPath } from './asset-path';
import HeroCanvas from './HeroCanvas';
import { buildMailto, formatInquiry, Inquiry, InquiryErrors, validateInquiry } from './inquiry';
import { benefits, process, Project, projects, services, siteConfig } from './site-data';

const emptyInquiry: Inquiry = { name: '', email: '', company: '', budget: '', brief: '' };

function ProjectPicture({ project }: { project: Project }) {
  return (
    <picture>
      <source srcSet={assetPath(`${project.image}.avif`)} type="image/avif" />
      <source srcSet={assetPath(`${project.image}.webp`)} type="image/webp" />
      <img src={assetPath(`${project.image}.webp`)} alt={project.alt} loading="lazy" decoding="async" />
    </picture>
  );
}

export default function MarvetoExperience() {
  const root = useRef<HTMLDivElement>(null);
  const dialogClose = useRef<HTMLButtonElement>(null);
  const [loading, setLoading] = useState(true);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [inquiry, setInquiry] = useState<Inquiry>(emptyInquiry);
  const [errors, setErrors] = useState<InquiryErrors>({});
  const [status, setStatus] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 1250);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const progress = document.querySelector<HTMLElement>('.scroll-progress span');
    const cursor = document.querySelector<HTMLElement>('.cursor');
    const updateScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progress) progress.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    };
    const updateCursor = (event: PointerEvent) => {
      if (cursor) cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
    };
    updateScroll();
    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('pointermove', updateCursor, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateScroll);
      window.removeEventListener('pointermove', updateCursor);
    };
  }, []);

  useEffect(() => {
    if (!activeProject) return;
    const previous = document.activeElement as HTMLElement | null;
    document.body.classList.add('no-scroll');
    dialogClose.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveProject(null);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('no-scroll');
      window.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [activeProject]);

  useLayoutEffect(() => {
    if (!root.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((element) => {
        gsap.fromTo(
          element,
          { y: 64, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1.05,
            ease: 'power3.out',
            scrollTrigger: { trigger: element, start: 'top 88%', once: true },
          },
        );
      });
      gsap.to('.manifesto-orb', {
        yPercent: -22,
        rotate: 18,
        ease: 'none',
        scrollTrigger: { trigger: '.manifesto', start: 'top bottom', end: 'bottom top', scrub: 1 },
      });
    }, root);
    return () => context.revert();
  }, []);

  const submitInquiry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateInquiry(inquiry);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setStatus('A few details still need your attention.');
      return;
    }
    setStatus('Opening your email app with the brief ready to send.');
    window.location.href = buildMailto(siteConfig.contactEmail, inquiry);
  };

  const copyBrief = async () => {
    const nextErrors = validateInquiry(inquiry);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setStatus('Complete the highlighted fields before copying the brief.');
      return;
    }
    try {
      await navigator.clipboard.writeText(formatInquiry(inquiry));
      setStatus('Project brief copied. Paste it wherever you like.');
    } catch {
      setStatus('Copy was blocked by the browser. Select the text and try again.');
    }
  };

  const field = (key: keyof Inquiry, value: string) => {
    setInquiry((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  return (
    <div ref={root}>
      <a className="skip-link" href="#work">Skip to selected work</a>
      <div className="scroll-progress" aria-hidden="true"><span /></div>
      <div className="cursor" aria-hidden="true"><span>View</span></div>

      <div className={`loader ${loading ? 'is-visible' : ''}`} aria-hidden={!loading}>
        <div className="loader-mark">marveto<span>°</span></div>
        <p>Clear sites. Sensible process.</p>
        <div className="loader-line"><span /></div>
        <button type="button" onClick={() => setLoading(false)}>Skip intro</button>
      </div>

      <header className="site-header">
        <a className="wordmark" href="#index" aria-label="Marveto home">
          marveto<span>°</span>
        </a>
        <nav aria-label="Primary navigation">
          {siteConfig.navigation.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
        </nav>
        <a className="header-cta" href="#contact">Start a project ↘</a>
        <button
          className="menu-button"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? 'Close' : 'Menu'}
        </button>
      </header>

      <div id="mobile-menu" className={`mobile-menu ${menuOpen ? 'is-open' : ''}`}>
        {siteConfig.navigation.map((item, index) => (
          <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
            <small>0{index + 1}</small>{item.label}
          </a>
        ))}
      </div>

      <main id="index">
        <section className="hero" aria-labelledby="hero-title">
          <picture className="hero-image">
            <source srcSet={assetPath('/images/hero.avif')} type="image/avif" />
            <source srcSet={assetPath('/images/hero.webp')} type="image/webp" />
            <img src={assetPath('/images/hero.webp')} alt="" fetchPriority="high" />
          </picture>
          <HeroCanvas />
          <div className="hero-vignette" aria-hidden="true" />
          <div className="hero-grain" aria-hidden="true" />
          <div className="hero-copy">
            <p className="eyebrow">Websites for companies — strategy, design, development</p>
            <h1 id="hero-title"><em>We make websites</em><span>for companies.</span></h1>
            <p className="hero-summary">
              Clear, credible websites that help companies explain their value, look established, and give interested people a useful next step—without oversized agency costs or unnecessary complexity.
            </p>
            <div className="hero-actions">
              <a className="pill pill-dark magnetic" href="#contact">Plan my website ↘</a>
              <a className="pill pill-light magnetic" href="#work">See the examples ↓</a>
            </div>
          </div>
          <div className="hero-meta" aria-hidden="true">
            <span>Scroll to see why</span><span>Practical pricing · Efficient delivery</span><span>©2026</span>
          </div>
        </section>

        <div className="marquee" aria-label="Capabilities">
          <div>
            <span>Credibility</span><i>✦</i><span>Clear offers</span><i>✦</i><span>Web design</span><i>✦</i>
            <span>Fast-moving process</span><i>✦</i><span>Search foundations</span><i>✦</i><span>Easy next steps</span><i>✦</i>
            <span aria-hidden="true">Credibility</span><i aria-hidden="true">✦</i><span aria-hidden="true">Clear offers</span><i aria-hidden="true">✦</i>
          </div>
        </div>

        <section id="work" className="work-section section-pad" aria-labelledby="work-title">
          <div className="section-intro" data-reveal>
            <p className="section-kicker">Company website concepts · 2026</p>
            <h2 id="work-title">Different businesses.<br /><em>Clearer websites.</em></h2>
            <p className="section-note">Three self-initiated examples showing how we adapt the message, structure, and experience to the company. They demonstrate our approach and are not presented as commissioned client work.</p>
          </div>

          <div className="project-grid">
            {projects.map((project, index) => (
              <article className={`project-card project-${project.slug}`} key={project.slug} data-reveal>
                <button type="button" onClick={() => setActiveProject(project)} aria-label={`View ${project.title} concept`}>
                  <div className="project-image"><ProjectPicture project={project} /><span className="project-lens">Open<br />concept</span></div>
                  <div className="project-caption">
                    <div><span>{project.index}</span><p>{project.sector}</p></div>
                    <h3>{project.title}</h3>
                    <p>{project.statement}</p>
                    <span className="project-arrow">↗</span>
                  </div>
                </button>
                {index === 0 && <p className="project-aside">Business first. Built with craft.</p>}
              </article>
            ))}
          </div>
        </section>

        <section id="services" className="services-section section-pad" aria-labelledby="services-title">
          <div className="services-heading" data-reveal>
            <p className="section-kicker">What you get</p>
            <h2 id="services-title">What you need.<br />Nothing you do not.</h2>
            <p>A compact team keeps decisions moving and overhead sensible. The scope is shaped around the job your website needs to do.</p>
          </div>
          <div className="services-list">
            {services.map((service) => (
              <article key={service.index} data-reveal>
                <span>{service.index}</span>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <ul>{service.outputs.map((output) => <li key={output}>{output}</li>)}</ul>
              </article>
            ))}
          </div>
        </section>

        <section className="manifesto section-pad" aria-labelledby="manifesto-title">
          <div className="manifesto-orb" aria-hidden="true"><span /></div>
          <p className="section-kicker">Why a website still matters</p>
          <h2 id="manifesto-title" data-reveal>
            Your website can work<br /><em>before you speak.</em>
          </h2>
          <div className="manifesto-copy" data-reveal>
            <p>People will look for your company somewhere. Give them a clear place you control.</p>
            <p>A website will not solve every business problem. It can make it easier for the right people to understand you, trust what they see, and decide what to do next.</p>
          </div>
          <div className="benefit-grid">
            {benefits.map((benefit) => (
              <article key={benefit.index} data-reveal>
                <span>{benefit.index}</span>
                <h3>{benefit.title}</h3>
                <p>{benefit.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="process" className="process-section section-pad" aria-labelledby="process-title">
          <div className="process-heading" data-reveal>
            <div>
              <p className="section-kicker">How it happens</p>
              <p className="process-note">Focused projects can move quickly when decisions and content are ready. We set a realistic schedule after the scope is clear.</p>
            </div>
            <h2 id="process-title">Efficient by design.<br /><em>Clear at every step.</em></h2>
          </div>
          <ol>
            {process.map((step) => (
              <li key={step.index} data-reveal>
                <span>{step.index}</span><h3>{step.title}</h3><p>{step.copy}</p><i>↘</i>
              </li>
            ))}
          </ol>
        </section>

        <section id="contact" className="contact-section section-pad" aria-labelledby="contact-title">
          <div className="contact-heading" data-reveal>
            <p className="section-kicker">Talk to us</p>
            <h2 id="contact-title">Need a better company website?<br /><em>Let’s make the right one.</em></h2>
            <p>You do not need a perfect brief. Tell us what the company does, what the current website is missing, and the budget you are comfortable with. We will recommend a practical scope.</p>
          </div>
          <form onSubmit={submitInquiry} noValidate data-reveal>
            <label>
              <span>Your name *</span>
              <input value={inquiry.name} onChange={(e) => field('name', e.target.value)} aria-invalid={!!errors.name} aria-describedby="name-error" placeholder="Jane Smith" />
              <small id="name-error">{errors.name}</small>
            </label>
            <label>
              <span>Email *</span>
              <input type="email" value={inquiry.email} onChange={(e) => field('email', e.target.value)} aria-invalid={!!errors.email} aria-describedby="email-error" placeholder="jane@company.com" />
              <small id="email-error">{errors.email}</small>
            </label>
            <label>
              <span>Company</span>
              <input value={inquiry.company} onChange={(e) => field('company', e.target.value)} placeholder="Your company" />
            </label>
            <label>
              <span>Working budget *</span>
              <select value={inquiry.budget} onChange={(e) => field('budget', e.target.value)} aria-invalid={!!errors.budget} aria-describedby="budget-error">
                <option value="">Choose a range</option>
                <option>Under $5k</option><option>$5k–$10k</option><option>$10k–$25k</option><option>$25k+</option><option>Not sure yet</option>
              </select>
              <small id="budget-error">{errors.budget}</small>
            </label>
            <label className="form-wide">
              <span>What should the website help your company do? *</span>
              <textarea value={inquiry.brief} onChange={(e) => field('brief', e.target.value)} aria-invalid={!!errors.brief} aria-describedby="brief-error" rows={4} placeholder="Explain the business, build trust, generate inquiries, support a launch…" />
              <small id="brief-error">{errors.brief}</small>
            </label>
            <div className="form-actions form-wide">
              <button type="submit" className="pill pill-light">Open in email ↗</button>
              <button type="button" className="text-button" onClick={copyBrief}>Copy project brief</button>
              <p role="status" aria-live="polite">{status}</p>
            </div>
          </form>
          <footer>
            <a className="footer-wordmark" href="#index">marveto<span>°</span></a>
            <p>Company websites · Strategy · Design · Development</p>
            <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>
            <p>©2026 Marveto. Original work only.</p>
          </footer>
        </section>
      </main>

      {activeProject && (
        <div className="project-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
          <button ref={dialogClose} className="dialog-close" type="button" onClick={() => setActiveProject(null)}>Close ×</button>
          <div className="dialog-image"><ProjectPicture project={activeProject} /></div>
          <div className="dialog-copy" style={{ '--project-accent': activeProject.accent, '--project-surface': activeProject.surface } as React.CSSProperties}>
            <p>{activeProject.sector}</p>
            <h2 id="dialog-title">{activeProject.title}</h2>
            <h3>{activeProject.statement}</h3>
            <p>{activeProject.summary}</p>
            <ul>{activeProject.deliverables.map((item) => <li key={item}>{item}</li>)}</ul>
            <a href="#contact" onClick={() => setActiveProject(null)}>Discuss a website like this ↘</a>
          </div>
        </div>
      )}
    </div>
  );
}
