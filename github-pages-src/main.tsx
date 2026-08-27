import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import MarvetoExperience from '../app/MarvetoExperience';
import '../app/globals.css';
import './fonts.css';

document.documentElement.style.setProperty(
  '--noise-image',
  `url('${import.meta.env.BASE_URL}images/noise.png')`,
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MarvetoExperience />
  </StrictMode>,
);
