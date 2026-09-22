import type { PricingTierId } from './site-data';

export type ExperienceTier = PricingTierId;

export type UltimateEnvironmentMode = 'signal' | 'monolith' | 'membrane';
export type SceneChapterId = 'hero' | 'viewpoint' | 'capabilities' | 'process' | 'package';

export interface SceneChapter {
  id: SceneChapterId;
  label: string;
  travel: number;
  atmosphere: number;
}

export interface UltimateJourneyDefinition {
  mode: UltimateEnvironmentMode;
  fog: string;
  focalPoint: [number, number];
  exposure: number;
  depth: number;
  chapters: SceneChapter[];
}

export interface TierDefinition {
  id: ExperienceTier;
  label: string;
  shortLabel: string;
  description: string;
  capabilities: string[];
  motionLevel: 'light' | 'cinematic';
}

export interface ConceptModule {
  index: string;
  eyebrow: string;
  title: string;
  description: string;
  details: string[];
}

export interface ConceptStep {
  index: string;
  title: string;
  description: string;
}

export interface Concept {
  slug: 'axiom' | 'serein' | 'forma';
  name: string;
  industry: 'Motorsport' | 'Hospitality' | 'Construction';
  descriptor: string;
  headline: string;
  headlineAccent: string;
  summary: string;
  primaryAction: string;
  secondaryAction: string;
  statement: string;
  note: string;
  image: string;
  imageAlt: string;
  accent: string;
  glow: string;
  ink: string;
  paper: string;
  ultimateJourney: UltimateJourneyDefinition;
  modules: ConceptModule[];
  process: ConceptStep[];
}

export const tierOrder: ExperienceTier[] = ['essential', 'premium', 'ultimate'];

export const tierDefinitions: Record<ExperienceTier, TierDefinition> = {
  essential: {
    id: 'essential',
    label: 'Essential',
    shortLabel: 'Clear foundation',
    description: 'A polished, responsive company website with excellent structure and none of the heavier visual effects.',
    capabilities: ['Custom responsive design', 'Clear content structure', 'Accessible interactions', 'Search foundations'],
    motionLevel: 'light',
  },
  premium: {
    id: 'premium',
    label: 'Premium',
    shortLabel: 'Cinematic craft',
    description: 'The full Marveto experience: editorial layouts, cinematic imagery, depth, parallax, and refined motion.',
    capabilities: ['Everything in Essential', 'Art-directed motion', 'Immersive transitions', 'Advanced interaction design'],
    motionLevel: 'cinematic',
  },
  ultimate: {
    id: 'ultimate',
    label: 'Ultimate',
    shortLabel: 'Background journey',
    description: 'A flagship digital experience where cinematic footage becomes a continuous, scroll-controlled journey.',
    capabilities: ['Everything in Premium', 'Scroll-scrubbed film', 'Layered 2.5D depth', 'Adaptive cinematic pacing'],
    motionLevel: 'cinematic',
  },
};

export const concepts: Concept[] = [
  {
    slug: 'axiom',
    name: 'APEX',
    industry: 'Motorsport',
    descriptor: 'Competition engineering at full velocity',
    headline: 'Engineered to',
    headlineAccent: 'break away.',
    summary: 'A race program presented at racing speed: aerodynamic intent, telemetry, and raw performance shaped into one precise digital machine.',
    primaryAction: 'Enter the cockpit',
    secondaryAction: 'Read the telemetry',
    statement: 'Speed is not decoration. It is the result of every surface, system, and decision working as one.',
    note: 'A self-initiated Marveto studio concept. APEX is a fictional racing marque created to demonstrate our approach.',
    image: '/videos/race-car',
    imageAlt: 'A race car accelerating through a cinematic environment.',
    accent: '#ff3d18',
    glow: '#ffd2c7',
    ink: '#080808',
    paper: '#f2eee8',
    ultimateJourney: {
      mode: 'signal',
      fog: '#040817',
      focalPoint: [0.79, 0.49],
      exposure: 1.08,
      depth: 1,
      chapters: [
        { id: 'hero', label: 'Surface', travel: 0, atmosphere: 0 },
        { id: 'viewpoint', label: 'Threshold', travel: 0.18, atmosphere: 0.2 },
        { id: 'capabilities', label: 'Signal depth', travel: 0.48, atmosphere: 0.58 },
        { id: 'process', label: 'Current', travel: 0.76, atmosphere: 0.88 },
        { id: 'package', label: 'Horizon', travel: 1, atmosphere: 1 },
      ],
    },
    modules: [
      {
        index: '01',
        eyebrow: 'Observe',
        title: 'Read the car at a glance.',
        description: 'Shape live performance into a decisive visual hierarchy for drivers, engineers, and partners.',
        details: ['Lap delta', 'Aero balance', 'Tyre state'],
      },
      {
        index: '02',
        eyebrow: 'Connect',
        title: 'Make engineering visible.',
        description: 'Turn invisible aerodynamic and mechanical work into a story people can understand and remember.',
        details: ['Vehicle architecture', 'Aero surfaces', 'Power delivery'],
      },
      {
        index: '03',
        eyebrow: 'Act',
        title: 'Convert attention into momentum.',
        description: 'Guide fans, sponsors, and technical partners from first impact to a clear next move.',
        details: ['Race calendar', 'Partner stories', 'Team contact'],
      },
    ],
    process: [
      { index: '01', title: 'Brief', description: 'Define the racing identity and competitive edge.' },
      { index: '02', title: 'Engineer', description: 'Build the information system around speed and proof.' },
      { index: '03', title: 'Direct', description: 'Synchronize film, typography, and interaction.' },
      { index: '04', title: 'Launch', description: 'Put the marque on track for every screen.' },
    ],
  },
  {
    slug: 'serein',
    name: 'AURELIA',
    industry: 'Hospitality',
    descriptor: 'A cinematic passage from curiosity to check-in',
    headline: 'Stay somewhere',
    headlineAccent: 'unforgettable.',
    summary: 'A luxury hotel presented as an atmosphere, not a room list: immersive suites, considered rituals, and an effortless route from first impression to reservation.',
    primaryAction: 'Explore the suites',
    secondaryAction: 'Plan your stay',
    statement: 'The best hospitality begins before arrival—with a sense of place you can already feel.',
    note: 'A self-initiated Marveto studio concept. AURELIA is a fictional hotel created to demonstrate our approach.',
    image: '/videos/hotel-walkthrough.mp4',
    imageAlt: 'A cinematic walkthrough of a warm, refined hotel suite.',
    accent: '#d7b37a',
    glow: '#f1d6aa',
    ink: '#17120e',
    paper: '#eee7dc',
    ultimateJourney: {
      mode: 'monolith',
      fog: '#17100c',
      focalPoint: [0.79, 0.29],
      exposure: 0.96,
      depth: 0.9,
      chapters: [
        { id: 'hero', label: 'Arrival', travel: 0, atmosphere: 0 },
        { id: 'viewpoint', label: 'Threshold', travel: 0.18, atmosphere: 0.18 },
        { id: 'capabilities', label: 'Suites', travel: 0.48, atmosphere: 0.55 },
        { id: 'process', label: 'Rituals', travel: 0.76, atmosphere: 0.86 },
        { id: 'package', label: 'Reserve', travel: 1, atmosphere: 1 },
      ],
    },
    modules: [
      {
        index: '01',
        eyebrow: 'Arrive',
        title: 'Enter the atmosphere.',
        description: 'Let light, texture, and movement establish the feeling of AURELIA before a single amenity is listed.',
        details: ['Cinematic arrival', 'Sense of place', 'Signature atmosphere'],
      },
      {
        index: '02',
        eyebrow: 'Stay',
        title: 'Find your room naturally.',
        description: 'Move through suites and experiences with spatial clarity, tactile detail, and only the information that helps a guest choose.',
        details: ['Suite discovery', 'Private rituals', 'Curated amenities'],
      },
      {
        index: '03',
        eyebrow: 'Reserve',
        title: 'Book without breaking the spell.',
        description: 'Carry the same calm visual rhythm into availability, selection, and confirmation.',
        details: ['Live availability', 'Considered upgrades', 'Effortless booking'],
      },
    ],
    process: [
      { index: '01', title: 'Discover', description: 'Choose the mood, suite, and rhythm of your stay.' },
      { index: '02', title: 'Personalize', description: 'Shape the details that make the visit feel distinctly yours.' },
      { index: '03', title: 'Reserve', description: 'Confirm the stay through a clear, uninterrupted path.' },
      { index: '04', title: 'Arrive', description: 'Step into an experience that already feels familiar.' },
    ],
  },
  {
    slug: 'forma',
    name: 'Forma',
    industry: 'Construction',
    descriptor: 'From first vision to the final detail',
    headline: 'Built with',
    headlineAccent: 'conviction.',
    summary: 'A construction studio defined by material, precision, and ambition. Explore the work through a cinematic journey from first vision to finished space.',
    primaryAction: 'Explore our expertise',
    secondaryAction: 'See how we build',
    statement: 'Great spaces begin with clear intent. Every material, every connection, every detail carries it forward.',
    note: 'A self-initiated Marveto studio concept. Forma is a fictional construction company created to demonstrate our approach.',
    image: '/videos/construction-film.mp4',
    imageAlt: 'A cinematic construction film showing spaces taking shape.',
    accent: '#a99dff',
    glow: '#dff6f1',
    ink: '#12202a',
    paper: '#edf1ee',
    ultimateJourney: {
      mode: 'membrane',
      fog: '#09171d',
      focalPoint: [0.77, 0.52],
      exposure: 1,
      depth: 0.94,
      chapters: [
        { id: 'hero', label: 'Surface', travel: 0, atmosphere: 0 },
        { id: 'viewpoint', label: 'Threshold', travel: 0.18, atmosphere: 0.22 },
        { id: 'capabilities', label: 'Membrane', travel: 0.48, atmosphere: 0.6 },
        { id: 'process', label: 'Flow', travel: 0.76, atmosphere: 0.9 },
        { id: 'package', label: 'Horizon', travel: 1, atmosphere: 1 },
      ],
    },
    modules: [
      {
        index: '01',
        eyebrow: 'Understand',
        title: 'Give ambition a foundation.',
        description: 'Bring site, scope, materials, and priorities into one clear plan before the work begins.',
        details: ['Site planning', 'Material strategy', 'Scope definition'],
      },
      {
        index: '02',
        eyebrow: 'Prepare',
        title: 'Precision at every scale.',
        description: 'Show the craft behind the structure, from coordinated delivery to the details that make a space work.',
        details: ['Construction delivery', 'Project coordination', 'Quality control'],
      },
      {
        index: '03',
        eyebrow: 'Continue',
        title: 'Finish with confidence.',
        description: 'Carry a clear line of communication through completion, handover, and the life of the building.',
        details: ['Project handover', 'Finishing details', 'Aftercare'],
      },
    ],
    process: [
      { index: '01', title: 'Discover', description: 'Understand the site, ambition, and scope.' },
      { index: '02', title: 'Prepare', description: 'Align materials, schedule, and the delivery team.' },
      { index: '03', title: 'Build', description: 'Bring the plan to life with precision and care.' },
      { index: '04', title: 'Deliver', description: 'Complete the details and hand over with clarity.' },
    ],
  },
];

export function getConcept(slug: string): Concept | undefined {
  return concepts.find((concept) => concept.slug === slug);
}
