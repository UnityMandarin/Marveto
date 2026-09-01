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
  motionLevel: 'light' | 'cinematic' | 'immersive-3d';
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
  industry: 'Technology' | 'Construction' | 'Medical';
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
    description: 'A flagship digital experience where the original artwork opens into a continuous, real-time spatial journey.',
    capabilities: ['Everything in Premium', 'Authored layered environment', 'Scroll-controlled spatial depth', 'Adaptive cinematic rendering'],
    motionLevel: 'immersive-3d',
  },
};

export const concepts: Concept[] = [
  {
    slug: 'axiom',
    name: 'Axiom',
    industry: 'Technology',
    descriptor: 'Systems intelligence for complex operations',
    headline: 'Infrastructure,',
    headlineAccent: 'made intelligible.',
    summary: 'A calm operating layer for teams that need to understand complex systems, connect their tools, and make the next decision with context.',
    primaryAction: 'Explore the system',
    secondaryAction: 'See the operating model',
    statement: 'Complexity belongs behind the interface—not in front of the people making decisions.',
    note: 'A self-initiated Marveto studio concept. Axiom is a fictional technology company created to demonstrate our approach.',
    image: '/images/axiom',
    imageAlt: 'A dark cobalt gallery filled with suspended glass nodes and an illuminated portal.',
    accent: '#5472ff',
    glow: '#cbd6ff',
    ink: '#050a1e',
    paper: '#e9edff',
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
        title: 'See the whole system.',
        description: 'Bring the important signals into one composed view so teams can understand what changed and where attention is needed.',
        details: ['System overview', 'Connected signals', 'Role-aware views'],
      },
      {
        index: '02',
        eyebrow: 'Connect',
        title: 'Work with the tools already in place.',
        description: 'A clear integration story makes the product easier to evaluate without burying visitors in technical language.',
        details: ['Integration map', 'Data pathways', 'Implementation guidance'],
      },
      {
        index: '03',
        eyebrow: 'Act',
        title: 'Move from signal to decision.',
        description: 'Structured context gives operators a useful next step while keeping the website careful about claims it cannot prove.',
        details: ['Decision context', 'Team workflows', 'Conversation pathway'],
      },
    ],
    process: [
      { index: '01', title: 'Connect', description: 'Map the systems and information that matter.' },
      { index: '02', title: 'Model', description: 'Organize the operating picture around real decisions.' },
      { index: '03', title: 'Observe', description: 'Surface changes without unnecessary visual noise.' },
      { index: '04', title: 'Act', description: 'Give every signal a clear and responsible next step.' },
    ],
  },
  {
    slug: 'serein',
    name: 'Serein',
    industry: 'Construction',
    descriptor: 'Planning, delivery, and handover in one clear story',
    headline: 'Built for the',
    headlineAccent: 'work ahead.',
    summary: 'A construction partner presented with the same care it brings to the work: clear capabilities, visible process, and an easier route from first conversation to project handover.',
    primaryAction: 'Explore capabilities',
    secondaryAction: 'See the build process',
    statement: 'Confidence starts before the site opens—with a clear plan, visible responsibilities, and fewer unanswered questions.',
    note: 'A self-initiated Marveto studio concept. Serein is a fictional construction company created to demonstrate our approach.',
    image: '/images/forma',
    imageAlt: 'A sculptural concrete structure with a cobalt glass doorway reflected in water.',
    accent: '#ff714d',
    glow: '#ffcf9f',
    ink: '#1d1713',
    paper: '#eee6da',
    ultimateJourney: {
      mode: 'monolith',
      fog: '#17100c',
      focalPoint: [0.79, 0.29],
      exposure: 0.96,
      depth: 0.9,
      chapters: [
        { id: 'hero', label: 'Surface', travel: 0, atmosphere: 0 },
        { id: 'viewpoint', label: 'Threshold', travel: 0.18, atmosphere: 0.18 },
        { id: 'capabilities', label: 'Structure', travel: 0.48, atmosphere: 0.55 },
        { id: 'process', label: 'Passage', travel: 0.76, atmosphere: 0.86 },
        { id: 'package', label: 'Horizon', travel: 1, atmosphere: 1 },
      ],
    },
    modules: [
      {
        index: '01',
        eyebrow: 'Plan',
        title: 'Start with fewer unknowns.',
        description: 'Present pre-construction thinking, project fit, and the information needed for a useful first discussion.',
        details: ['Early planning', 'Project fit', 'Scope alignment'],
      },
      {
        index: '02',
        eyebrow: 'Deliver',
        title: 'Make the process visible.',
        description: 'Explain how coordination, field delivery, and communication work without turning the website into a wall of promises.',
        details: ['Project coordination', 'Field delivery', 'Progress communication'],
      },
      {
        index: '03',
        eyebrow: 'Hand over',
        title: 'Finish with clarity.',
        description: 'Show how closeout and handover are considered from the beginning, with a clear path to discuss the actual job.',
        details: ['Closeout planning', 'Handover pathway', 'Project inquiry'],
      },
    ],
    process: [
      { index: '01', title: 'Plan', description: 'Understand the site, priorities, and practical constraints.' },
      { index: '02', title: 'Coordinate', description: 'Align the people, information, and sequence of work.' },
      { index: '03', title: 'Build', description: 'Deliver with a clear rhythm of communication.' },
      { index: '04', title: 'Hand over', description: 'Close the work carefully and make the next steps clear.' },
    ],
  },
  {
    slug: 'forma',
    name: 'Forma',
    industry: 'Medical',
    descriptor: 'A clearer digital path into care',
    headline: 'Care, made',
    headlineAccent: 'clearer.',
    summary: 'A calm medical website concept that helps people understand available services, prepare for a visit, and find the right next step without confusion or exaggerated outcomes.',
    primaryAction: 'Explore care options',
    secondaryAction: 'Follow the patient journey',
    statement: 'A healthcare website should reduce uncertainty, respect attention, and help people move forward with the right information.',
    note: 'A self-initiated Marveto studio concept. Forma is a fictional medical organization and does not provide medical advice.',
    image: '/images/serein',
    imageAlt: 'A warm, calm interior with soft light, reflective water, and an amber privacy screen.',
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
        title: 'Find the right starting point.',
        description: 'Group services around understandable needs and give every page a calm, accessible hierarchy.',
        details: ['Service navigation', 'Plain-language content', 'Accessible structure'],
      },
      {
        index: '02',
        eyebrow: 'Prepare',
        title: 'Know what comes next.',
        description: 'A visible visit pathway can answer practical questions while keeping individual medical guidance with a qualified professional.',
        details: ['Visit expectations', 'Preparation guidance', 'Responsible boundaries'],
      },
      {
        index: '03',
        eyebrow: 'Continue',
        title: 'Keep the next step close.',
        description: 'Make contact, follow-up information, and accessibility options easy to locate across every screen size.',
        details: ['Appointment pathway', 'Follow-up access', 'Inclusive interaction'],
      },
    ],
    process: [
      { index: '01', title: 'Find care', description: 'Start with a clear view of services and fit.' },
      { index: '02', title: 'Prepare', description: 'Review practical information before the visit.' },
      { index: '03', title: 'Meet', description: 'Keep clinical decisions with qualified professionals.' },
      { index: '04', title: 'Follow up', description: 'Make continuing information and contact easy to find.' },
    ],
  },
];

export function getConcept(slug: string): Concept | undefined {
  return concepts.find((concept) => concept.slug === slug);
}
