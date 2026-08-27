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
    serviceType: ['Company websites', 'Web strategy', 'Web design', 'Website development'],
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
