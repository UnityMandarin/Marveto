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

export interface Benefit {
  index: string;
  title: string;
  description: string;
  source: string;
  sourceUrl: string;
}

export interface MarvetoReason {
  index: string;
  title: string;
  description: string;
}

export type PricingTierId = 'essential' | 'premium' | 'ultimate';

export interface PricingTier {
  id: PricingTierId;
  index: string;
  name: string;
  price: number;
  displayPrice: string;
  badge?: 'Recommended' | 'Max result';
  positioning: string;
  features: string[];
  turnaround: string;
  includedRevisions: number;
  additionalRevisionPrice: number;
  cta: string;
}

export interface PricingTerm {
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
    { label: 'Why it matters', href: '#why' },
    { label: 'Pricing', href: '#pricing' },
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

export const benefits: Benefit[] = [
  {
    index: '01',
    title: 'Start before the first call',
    description: 'BrightLocal found 84% of consumers had searched online for a local business in the previous three months, and 28% made a choice in under five minutes. Your site handles the first round of selling while you are busy working. If it cannot quickly show who you help, what you offer, and why you are credible, the shortlist may close without you.',
    source: 'BrightLocal Consumer Search Behavior, 2026',
    sourceUrl: 'https://www.brightlocal.com/research/consumer-search-behavior-channels/',
  },
  {
    index: '02',
    title: 'Look established, not improvised',
    description: 'Clutch’s 2026 survey of 612 frequent web users found 83% consider an attractive, up-to-date website useful, while 94% value easy navigation. People read design and structure as signs of how a company operates. A dated, confusing, or missing site can create doubt before your price, experience, or service quality gets considered.',
    source: 'Clutch Website Features Survey, 2026',
    sourceUrl: 'https://clutch.co/resources/top-6-website-features-people-value',
  },
  {
    index: '03',
    title: 'Answer it once',
    description: 'Duda’s 2024 survey found 37% of small-business owners rank providing information among the top ways their website contributes to the business. Clear service pages, pricing context, proof, and FAQs let qualified buyers answer basic questions themselves. That means fewer repetitive explanations for your team and fewer prospects leaving because the offer felt hard to understand.',
    source: 'Duda SMB Website Survey, 2024',
    sourceUrl: 'https://blog.duda.co/more-visibility-in-search-survey',
  },
  {
    index: '04',
    title: 'Get found when intent is high',
    description: 'BrightLocal’s 2026 research found 52% of consumers started their most recent local-business search on Google, and 71% used Google somewhere in the journey. A search-friendly site gives Google useful pages to index for each service, problem, and location. Without them, competitors have more opportunities to appear when someone is actively looking to buy.',
    source: 'BrightLocal Consumer Search Behavior, 2026',
    sourceUrl: 'https://www.brightlocal.com/research/consumer-search-behavior-channels/',
  },
  {
    index: '05',
    title: 'Turn interest into action',
    description: 'Baymard’s 2024 checkout research found 17% of shoppers abandoned an order because the process was too long or complicated. The same friction costs service businesses inquiries and bookings. A focused page should make one next step obvious, explain what happens after the click, and ask only for the information needed to move the conversation forward.',
    source: 'Baymard Checkout Usability Research, 2024',
    sourceUrl: 'https://baymard.com/blog/checkout-flow-average-form-fields',
  },
  {
    index: '06',
    title: 'Own the place people land',
    description: 'Clutch reported in 2025 that 17% of small businesses still had no website, and more than a third of that group relied on social media or marketplaces instead. Those platforms can change formats, distribution, or account access without your approval. Your domain keeps your message, customer path, analytics, and contact options under your control.',
    source: 'Clutch Small Business Website Survey, 2025',
    sourceUrl: 'https://clutch.co/press-releases/smb-websites-2025',
  },
  {
    index: '07',
    title: 'Add without starting over',
    description: 'Duda’s 2024 SMB survey found 43% ranked easy updates and maintenance as the top factor when choosing how to build their site; nearly 64% had already connected it to core business software. A well-structured site should accommodate new services, locations, proof, and tools without a rebuild. Growth should add pages and capability, not restart the project.',
    source: 'Duda SMB Website Survey, 2024',
    sourceUrl: 'https://blog.duda.co/more-visibility-in-search-survey',
  },
];

export const marvetoReasons: MarvetoReason[] = [
  {
    index: '01',
    title: 'Ten days, with a defined finish',
    description: 'Every Marveto tier is scheduled for delivery within 10 days or less. The scope is agreed before work starts, so you know the target, the delivery window, and which level of design and interaction you are purchasing.',
  },
  {
    index: '02',
    title: 'Half now. Half when delivered.',
    description: 'You pay 50% to begin and the remaining 50% when the website is delivered. If the completed site is non-functional, materially broken, causes technical problems, or clearly follows the wrong subject despite the instructions you provided, you receive a full refund.',
  },
  {
    index: '03',
    title: 'Revision costs stay visible',
    description: 'Essential includes three revisions, Premium includes four, and Ultimate includes five. Additional revisions cost $29, $59, or $149 respectively and remain within the selected design level. You see the included allowance and additional cost before paying a deposit.',
  },
  {
    index: '04',
    title: 'Custom code, shaped around you',
    description: 'Every Marveto website is custom-coded for the agreed business and design level. During a booked session, we collect your information, priorities, and visual direction. That brief guides the content structure, interface, imagery, and interactions we create.',
  },
  {
    index: '05',
    title: 'Support remains available',
    description: 'Launch is not the last time you can reach Marveto. You can book free Zoom sessions for questions, technical support, or guidance. If your request changes the website, it counts as a revision and its price is confirmed before work begins.',
  },
  {
    index: '06',
    title: 'We handle the launch mechanics',
    description: 'We help you obtain a domain, publish the website, connect the domain, and hand the completed site to you. The process covers the technical steps that often leave business owners with finished files but no properly launched website.',
  },
];

export const pricingTiers: PricingTier[] = [
  {
    id: 'essential',
    index: '01',
    name: 'Essential',
    price: 599,
    displayPrice: '$599',
    positioning: 'For businesses that need a credible, custom-coded website with the essential structure handled correctly.',
    features: [
      'Custom-coded responsive website',
      'Clear business content structure',
      'Accessible core interactions',
      'Search-ready page foundations',
      'Domain connection and launch',
      'Three revisions included',
    ],
    turnaround: '10 days or less',
    includedRevisions: 3,
    additionalRevisionPrice: 29,
    cta: 'Choose Essential',
  },
  {
    id: 'premium',
    index: '02',
    name: 'Premium',
    price: 999,
    displayPrice: '$999',
    badge: 'Recommended',
    positioning: 'For businesses that need the Essential foundation with stronger visual direction, controlled motion, and more developed interactions.',
    features: [
      'Everything included in Essential',
      'Art-directed motion system',
      'Immersive section transitions',
      'Advanced interaction design',
      'Domain connection and launch',
      'Four revisions included',
    ],
    turnaround: '10 days or less',
    includedRevisions: 4,
    additionalRevisionPrice: 59,
    cta: 'Choose Premium',
  },
  {
    id: 'ultimate',
    index: '03',
    name: 'Ultimate',
    price: 1799,
    displayPrice: '$1,799',
    badge: 'Max result',
    positioning: 'For businesses that need a high-detail visual environment with scroll-controlled depth and adaptive cinematic rendering.',
    features: [
      'Everything included in Premium',
      'Authored layered visual environment',
      'Scroll-controlled spatial depth',
      'Adaptive cinematic rendering',
      'Domain connection and launch',
      'Five revisions included',
    ],
    turnaround: '10 days or less',
    includedRevisions: 5,
    additionalRevisionPrice: 149,
    cta: 'Choose Ultimate',
  },
];

export const pricingTerms: PricingTerm[] = [
  { title: 'Payment', description: '50% deposit and 50% on delivery.' },
  { title: 'Support', description: 'Free booked Zoom support sessions.' },
  { title: 'Launch', description: 'Domain acquisition, connection, launch, and handover assistance. Third-party domain and hosting charges are not included.' },
  { title: 'Changes', description: 'Additional changes use the selected tier’s revision rate.' },
  { title: 'Refund', description: 'If the completed site is non-functional, materially broken, causes technical problems, or clearly follows the wrong subject despite the instructions you provided, you receive a full refund.' },
];

export function pricingTierById(id: string | null | undefined): PricingTier | undefined {
  return pricingTiers.find((tier) => tier.id === id);
}

export function packageOptionValue(tier: PricingTier): string {
  return `${tier.name} — ${tier.displayPrice}`;
}

export const process = [
  { index: '01', title: 'Distill', copy: 'Find the essential audience, tension, message, and action before the work expands into pages.' },
  { index: '02', title: 'Direct', copy: 'Establish the content rhythm, visual world, and motion language through the moments that matter most.' },
  { index: '03', title: 'Construct', copy: 'Build a responsive, accessible, performance-minded experience and refine it at clear checkpoints.' },
  { index: '04', title: 'Release', copy: 'Complete the final checks, publish with care, and leave your team with a system it can confidently use.' },
];
