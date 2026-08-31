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

export interface Benefit {
  index: string;
  title: string;
  description: string;
}

export const siteConfig: SiteConfig = {
  brand: 'marveto°',
  title: 'Marveto — Websites for companies. Built to be felt.',
  description:
    'Marveto turns the clearest truth in a company into a digital world people understand, remember, and act on.',
  contactEmail: 'info@unitymandarin.org',
  navigation: [
    { label: 'Examples', href: '#work' },
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
    statement: 'A technical signal becomes a world people can enter.',
    summary:
      'A focused company website concept that explains a technical product in plain language, builds confidence, and guides qualified visitors toward a conversation.',
    deliverables: ['Message hierarchy', 'Product pages', 'Trust signals', 'Inquiry journey'],
    image: '/images/axiom',
    alt: 'A dark cobalt gallery filled with suspended glass nodes and an illuminated portal.',
    accent: '#395cff',
    surface: '#071536',
  },
  {
    slug: 'serein',
    index: '02',
    title: 'Serein',
    sector: 'Construction · Studio concept',
    statement: 'Material confidence, shaped before the first conversation.',
    summary:
      'A construction website concept that makes capabilities, project types, and the path from planning to handover easy to understand.',
    deliverables: ['Capability structure', 'Project storytelling', 'Responsive design', 'Estimate pathway'],
    image: '/images/forma',
    alt: 'A sculptural concrete structure with a cobalt glass doorway reflected in water.',
    accent: '#ff6b42',
    surface: '#2b241e',
  },
  {
    slug: 'forma',
    index: '03',
    title: 'Forma',
    sector: 'Medical · Studio concept',
    statement: 'A calmer, more human path through care.',
    summary:
      'A medical website concept that explains services in plain language, presents the visit journey clearly, and offers an accessible next step.',
    deliverables: ['Service navigation', 'Patient journey', 'Accessibility', 'Appointment pathway'],
    image: '/images/serein',
    alt: 'A warm, calm interior with soft light, reflective water, and an amber privacy screen.',
    accent: '#b7a7ff',
    surface: '#202938',
  },
];

export const services: Service[] = [
  {
    index: '01',
    title: 'Find the signal',
    description: 'We isolate the clearest truth in the business: who it is for, why it matters, and what people should understand in seconds.',
    outputs: ['Positioning', 'Message architecture', 'Experience strategy', 'Content direction'],
  },
  {
    index: '02',
    title: 'Give it form',
    description: 'We translate the strategy into an ownable visual language with enough restraint to feel credible and enough character to be remembered.',
    outputs: ['Art direction', 'Interface design', 'Motion language', 'Design system'],
  },
  {
    index: '03',
    title: 'Build the world',
    description: 'We develop the experience with performance, accessibility, and precision in the same system—so the idea survives contact with every screen.',
    outputs: ['Creative development', 'Responsive build', 'Performance & accessibility', 'Launch direction'],
  },
];

export const benefits: Benefit[] = [
  {
    index: '01',
    title: 'Be taken seriously',
    description: 'Turn the first search into a moment of confidence, with a presence that feels considered before anyone makes contact.',
  },
  {
    index: '02',
    title: 'Make complexity clear',
    description: 'Give a layered business an immediate hierarchy so people can understand the offer without working for it.',
  },
  {
    index: '03',
    title: 'Create memory',
    description: 'Build a visual language distinctive enough to stay with people after the tab closes and the meeting begins.',
  },
  {
    index: '04',
    title: 'Move people forward',
    description: 'Turn attention into a clear next step—an inquiry, booking, visit, application, or purchase—without making people guess.',
  },
  {
    index: '05',
    title: 'Own the atmosphere',
    description: 'Create a place where the message, pace, and customer journey belong to the company rather than to a platform.',
  },
  {
    index: '06',
    title: 'Leave room to evolve',
    description: 'Use a thoughtful system that can absorb new services, projects, locations, or stories without losing its identity.',
  },
];

export const process = [
  { index: '01', title: 'Distill', copy: 'Find the essential audience, tension, message, and action before the work expands into pages.' },
  { index: '02', title: 'Direct', copy: 'Establish the content rhythm, visual world, and motion language through the moments that matter most.' },
  { index: '03', title: 'Construct', copy: 'Build a responsive, accessible, performance-minded experience and refine it at clear checkpoints.' },
  { index: '04', title: 'Release', copy: 'Complete the final checks, publish with care, and leave your team with a system it can confidently use.' },
];
