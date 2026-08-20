import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Cake — Your Personal Study Companion',
    template: '%s · Cake',
  },
  description: 'Cake est un compagnon d\'études IA chaleureux pour les étudiants. Prends des notes, visualise tes connaissances et apprends avec ton tuteur IA personnel.',
  keywords: ['études', 'notes', 'tuteur IA', 'carte mentale', 'apprentissage', 'étudiants'],
  authors: [{ name: 'Cake' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Cake',
  },
  openGraph: {
    type: 'website',
    siteName: 'Cake',
    title: 'Cake — Ton compagnon d\'études personnel',
    description: 'Notes intelligentes, carte des connaissances et tuteur IA personnel.',
  },
};

export const viewport: Viewport = {
  themeColor: '#F4A236',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
