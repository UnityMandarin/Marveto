import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Instrument_Sans } from 'next/font/google';
import { siteConfig } from './site-data';
import './globals.css';

const instrument = Instrument_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  variable: '--font-editorial',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  applicationName: 'Marveto',
  keywords: ['web design studio', 'creative development', 'digital identity', 'WebGL', 'website design'],
  authors: [{ name: 'Marveto' }],
  creator: 'Marveto',
  publisher: 'Marveto',
  alternates: { canonical: '/' },
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    type: 'website',
    siteName: 'Marveto',
    images: [{ url: '/og.png', width: 1672, height: 941, alt: 'Marveto — Websites people remember.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.title,
    description: siteConfig.description,
    images: ['/og.png'],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#111111',
  colorScheme: 'light dark',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${instrument.variable} ${cormorant.variable}`}>{children}</body>
    </html>
  );
}
