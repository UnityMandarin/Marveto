export interface SiteConfig {
  brand: string;
  title: string;
  description: string;
  contactEmail: string;
  navigation: Array<{ label: string; href: string }>;
}

export interface Project {
  slug: string;
  index: string;
  title: string;
  sector: string;
  statement: string;
  summary: string;
  deliverables: string[];
  image: string;
  alt: string;
  accent: string;
  surface: string;
}

export interface Service {
  index: string;
  title: string;
  description: string;
  outputs: string[];
}

export const siteConfig: SiteConfig = {
  brand: 'marveto°',
  title: 'Marveto — Websites people remember',
  description:
    'Marveto is an independent digital studio creating cinematic websites for ambitious brands.',
  contactEmail: 'info@unitymandarin.org',
  navigation: [
    { label: 'Work', href: '#work' },
    { label: 'Services', href: '#services' },
    { label: 'Process', href: '#process' },
    { label: 'Contact', href: '#contact' },
  ],
};

export const projects: Project[] = [
  {
    slug: 'axiom',
    index: '01',
    title: 'Axiom',
    sector: 'Technology · Studio concept',
    statement: 'Infrastructure, made visible.',
    summary:
      'A cinematic product story that turns a complex AI infrastructure platform into an intuitive universe of connected systems.',
    deliverables: ['Narrative strategy', 'Digital identity', 'Product storytelling', 'Creative development'],
    image: '/images/axiom',
    alt: 'A dark cobalt gallery filled with suspended glass nodes and an illuminated portal.',
    accent: '#395cff',
    surface: '#071536',
  },
  {
    slug: 'serein',
    index: '02',
    title: 'Serein',
    sector: 'Hospitality · Studio concept',
    statement: 'A booking journey you can feel.',
    summary:
      'A sensorial hospitality experience that sells atmosphere before rooms—warm, editorial, and effortless to navigate.',
    deliverables: ['Experience strategy', 'Art direction', 'Booking UX', 'Motion system'],
    image: '/images/serein',
    alt: 'A warm sculptural lounge with reflective water and a glowing amber curtain.',
    accent: '#ff6b42',
    surface: '#522417',
  },
  {
    slug: 'forma',
    index: '03',
    title: 'Forma',
    sector: 'Architecture · Studio concept',
    statement: 'Space, translated for screens.',
    summary:
      'An image-first portfolio system with editorial pacing, decisive typography, and quiet interactions that give every project room to breathe.',
    deliverables: ['Content architecture', 'Editorial design', 'Portfolio system', 'Front-end development'],
    image: '/images/forma',
    alt: 'A sculptural concrete coastal structure with a cobalt glass doorway reflected in water.',
    accent: '#b7a7ff',
    surface: '#252632',
  },
];

export const services: Service[] = [
  {
    index: '01',
    title: 'Strategy & narrative',
    description: 'We find the sharpest version of your story, then design every decision around it.',
    outputs: ['Positioning', 'Digital strategy', 'Content architecture', 'Creative direction'],
  },
  {
    index: '02',
    title: 'Design & identity',
    description: 'A visual language built for the screen—distinctive, coherent, and impossible to mistake.',
    outputs: ['Art direction', 'UI/UX design', 'Design systems', 'Motion language'],
  },
  {
    index: '03',
    title: 'Development & motion',
    description: 'Production-grade code with the craft, movement, and restraint that make a site feel alive.',
    outputs: ['Creative development', 'WebGL', 'CMS integration', 'Performance & accessibility'],
  },
];

export const process = [
  { index: '01', title: 'Align', copy: 'Goals, audience, offer, and the one feeling the experience must leave behind.' },
  { index: '02', title: 'Design', copy: 'We establish the world, system, and key moments before expanding the full experience.' },
  { index: '03', title: 'Engineer', copy: 'Design and development move together so the final build keeps its original ambition.' },
  { index: '04', title: 'Launch', copy: 'We test, tune, publish, and give your team a system designed to keep evolving.' },
];
