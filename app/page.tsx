import MarvetoExperience from './MarvetoExperience';
import { siteConfig } from './site-data';

export default function Home() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: 'Marveto',
    description: siteConfig.description,
    email: siteConfig.contactEmail,
    areaServed: 'Worldwide',
    serviceType: ['Web strategy', 'Web design', 'Creative development', 'Digital identity'],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}
      />
      <MarvetoExperience />
    </>
  );
}
