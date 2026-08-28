import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ConceptExperience from '../app/ConceptExperience';
import { getConcept } from '../app/concept-data';
import '../app/globals.css';
import '../app/concept.css';
import './fonts.css';

document.documentElement.style.setProperty(
  '--noise-image',
  `url('${import.meta.env.BASE_URL}images/noise.png')`,
);

const slug = document.documentElement.dataset.conceptSlug ?? '';
const concept = getConcept(slug);
const root = document.getElementById('root');

if (!concept || !root) {
  throw new Error(`Unknown Marveto concept: ${slug}`);
}

createRoot(root).render(
  <StrictMode>
    <ConceptExperience concept={concept} />
  </StrictMode>,
);

