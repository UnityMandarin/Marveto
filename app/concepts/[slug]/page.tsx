import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ConceptExperience from '../../ConceptExperience';
import { concepts, getConcept } from '../../concept-data';

const githubOrigin = 'https://unitymandarin.github.io/Marveto';

export function generateStaticParams() {
  return concepts.map((concept) => ({ slug: concept.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const concept = getConcept(slug);
  if (!concept) return {};
  const title = `${concept.name} — ${concept.industry} website concept by Marveto`;
  const description = `${concept.headline} ${concept.headlineAccent} Explore Essential, Premium, and Ultimate versions of this original ${concept.industry.toLowerCase()} website concept.`;
  const canonical = `${githubOrigin}/concepts/${concept.slug}/`;
  const image = `${githubOrigin}${concept.image}.webp`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'Marveto',
      url: canonical,
      images: [{ url: image, alt: concept.imageAlt }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function ConceptPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const concept = getConcept(slug);
  if (!concept) notFound();

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: `${concept.name} — ${concept.industry} website concept`,
    description: concept.summary,
    creator: { '@type': 'Organization', name: 'Marveto' },
    url: `${githubOrigin}/concepts/${concept.slug}/`,
    image: `${githubOrigin}${concept.image}.webp`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
      <ConceptExperience concept={concept} />
    </>
  );
}

