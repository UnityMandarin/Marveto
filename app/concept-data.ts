export type ExperienceTier = 'essential' | 'premium' | 'ultimate';

export type AtmosphereKind = 'network' | 'architecture' | 'biomorphic';
export type UltimateWorldType = 'network' | 'structure' | 'biomorphic';
export type SceneChapterId = 'hero' | 'viewpoint' | 'capabilities' | 'process' | 'package';

export interface AtmospherePreset {
  kind: AtmosphereKind;
  particleCount: number;
  speed: number;
  refraction: number;
}

export interface CameraKeyframe {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  roll?: number;
}

export interface SceneChapter {
  id: SceneChapterId;
  label: string;
  room: string;
  camera: CameraKeyframe;
  light: number;
}

export interface UltimateJourneyDefinition {
  world: UltimateWorldType;
  fog: string;
  density: number;
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
  premiumAtmosphere: AtmospherePreset;
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
    shortLabel: 'Interactive world',
    description: 'A flagship digital experience with a bespoke real-time 3D scene, shaders, and deeper interactive storytelling.',
    capabilities: ['Everything in Premium', 'Bespoke OGL 3D scene', 'Real-time shader effects', 'Advanced pointer choreography'],
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
    premiumAtmosphere: { kind: 'network', particleCount: 72, speed: 0.86, refraction: 0.92 },
    ultimateJourney: {
      world: 'network',
      fog: '#040817',
      density: 1,
      chapters: [
        { id: 'hero', label: 'Network vestibule', room: 'signal field', camera: { position: [0, 0.2, 8], target: [0, 0, 0], fov: 39 }, light: 0.78 },
        { id: 'viewpoint', label: 'Illuminated portal corridor', room: 'portal corridor', camera: { position: [1.15, -0.1, -7], target: [0, 0.2, -16], fov: 43, roll: -0.025 }, light: 0.92 },
        { id: 'capabilities', label: 'Data-node chamber', room: 'node chamber', camera: { position: [-1.3, 0.5, -23], target: [0.4, 0, -32], fov: 46, roll: 0.035 }, light: 1 },
        { id: 'process', label: 'Decision core', room: 'decision core', camera: { position: [0.8, -0.35, -39], target: [-0.2, 0.15, -48], fov: 42, roll: -0.018 }, light: 1.08 },
        { id: 'package', label: 'Luminous exit', room: 'light aperture', camera: { position: [0, 0.15, -55], target: [0, 0, -65], fov: 38 }, light: 1.2 },
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
    premiumAtmosphere: { kind: 'architecture', particleCount: 58, speed: 0.68, refraction: 0.48 },
    ultimateJourney: {
      world: 'structure',
      fog: '#17100c',
      density: 0.88,
      chapters: [
        { id: 'hero', label: 'Survey-grid entrance', room: 'survey field', camera: { position: [0, 1.25, 8.5], target: [0, 0.4, 0], fov: 42 }, light: 0.84 },
        { id: 'viewpoint', label: 'Structural frame corridor', room: 'frame corridor', camera: { position: [-1.1, 0.75, -7], target: [0.5, 0.25, -16], fov: 47, roll: 0.018 }, light: 0.94 },
        { id: 'capabilities', label: 'Exploded floor-plate atrium', room: 'plate atrium', camera: { position: [1.45, 1.4, -23], target: [0, 0.2, -32], fov: 50, roll: -0.028 }, light: 1.06 },
        { id: 'process', label: 'Delivery gallery', room: 'delivery hall', camera: { position: [-0.9, 0.4, -39], target: [0.3, 0.1, -48], fov: 45, roll: 0.02 }, light: 1 },
        { id: 'package', label: 'Handover aperture', room: 'handover light', camera: { position: [0, 0.8, -55], target: [0, 0.35, -65], fov: 40 }, light: 1.18 },
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
    premiumAtmosphere: { kind: 'biomorphic', particleCount: 64, speed: 0.52, refraction: 0.72 },
    ultimateJourney: {
      world: 'biomorphic',
      fog: '#09171d',
      density: 0.82,
      chapters: [
        { id: 'hero', label: 'Luminous care entrance', room: 'care vestibule', camera: { position: [0, 0.15, 8], target: [0, 0, 0], fov: 40 }, light: 0.82 },
        { id: 'viewpoint', label: 'Translucent biomorphic passage', room: 'membrane passage', camera: { position: [1.1, 0.45, -7], target: [-0.4, 0, -16], fov: 44, roll: -0.022 }, light: 0.94 },
        { id: 'capabilities', label: 'Orbiting pathway chamber', room: 'pathway chamber', camera: { position: [-1.3, -0.2, -23], target: [0.2, 0.3, -32], fov: 47, roll: 0.03 }, light: 1.02 },
        { id: 'process', label: 'Consultation horizon', room: 'consultation room', camera: { position: [0.75, 0.25, -39], target: [0, -0.05, -48], fov: 43, roll: -0.014 }, light: 0.96 },
        { id: 'package', label: 'Calm exit', room: 'quiet horizon', camera: { position: [0, 0.05, -55], target: [0, 0, -65], fov: 39 }, light: 1.12 },
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
