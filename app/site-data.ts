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
  title: 'Marveto — Websites for companies',
  description:
    'Marveto designs and builds clear, credible company websites with practical pricing, an efficient process, and the right level of craft for the job.',
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
    statement: 'Make a complex offer easy to understand.',
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
    sector: 'Hospitality · Studio concept',
    statement: 'Build trust before the first booking.',
    summary:
      'A hospitality website concept that balances atmosphere with useful information, making it easier to explore the stay and move confidently toward booking.',
    deliverables: ['Offer structure', 'Responsive design', 'Booking pathway', 'Content system'],
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
    statement: 'Turn good work into a reason to call.',
    summary:
      'An architecture website concept that makes a body of work easy to browse, communicates the practice clearly, and gives prospective clients a direct next step.',
    deliverables: ['Service positioning', 'Project library', 'Mobile experience', 'Contact pathway'],
    image: '/images/forma',
    alt: 'A sculptural concrete coastal structure with a cobalt glass doorway reflected in water.',
    accent: '#b7a7ff',
    surface: '#252632',
  },
];

export const services: Service[] = [
  {
    index: '01',
    title: 'Plan the right website',
    description: 'We clarify who it is for, what it needs to say, and what visitors should do next—so time and budget go toward pages that matter.',
    outputs: ['Website scope', 'Message hierarchy', 'Sitemap', 'Content direction'],
  },
  {
    index: '02',
    title: 'Design for trust',
    description: 'Responsive design that helps your company look established, makes information easier to scan, and gives every page a clear purpose.',
    outputs: ['Custom UI', 'Mobile layouts', 'Conversion paths', 'Design system'],
  },
  {
    index: '03',
    title: 'Build it lean',
    description: 'Clean, performance-minded development with useful SEO foundations and an easy handoff. No unnecessary layers that add cost without helping customers.',
    outputs: ['Front-end development', 'SEO foundations', 'Performance & accessibility', 'Launch support'],
  },
];

export const benefits: Benefit[] = [
  {
    index: '01',
    title: 'Be taken seriously',
    description: 'People often look a company up before making contact. A clear website gives them a credible place to verify who you are and what you do.',
  },
  {
    index: '02',
    title: 'Explain it once',
    description: 'The right structure answers common questions, shows the value of your offer, and saves your team from repeating the same introduction.',
  },
  {
    index: '03',
    title: 'Be easier to find',
    description: 'Search-friendly pages create another route to your business. Rankings depend on many factors, but a solid website gives discovery somewhere to start.',
  },
  {
    index: '04',
    title: 'Guide the next step',
    description: 'A useful site turns interest into a clear action—an inquiry, call, booking, visit, application, or purchase—without forcing people to guess.',
  },
  {
    index: '05',
    title: 'Own your presence',
    description: 'Social profiles are useful, but platforms change. Your website gives you more control over your message, presentation, and customer journey.',
  },
  {
    index: '06',
    title: 'Grow without restarting',
    description: 'A thoughtful system can make room for new services, projects, locations, or content as the company changes.',
  },
];

export const process = [
  { index: '01', title: 'Scope', copy: 'Agree on the audience, essential pages, core message, and useful next action before the work expands.' },
  { index: '02', title: 'Shape', copy: 'Create the content direction and visual route, then confirm the key screens before building the full site.' },
  { index: '03', title: 'Build', copy: 'Develop a responsive, accessible, performance-minded experience and review it together at clear checkpoints.' },
  { index: '04', title: 'Launch', copy: 'Complete final checks, publish, and hand over a website your team understands how to use.' },
];
