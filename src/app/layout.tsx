import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { Providers } from '@/components/Providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'BinlinPad — Ton compagnon d\'études personnel',
    template: '%s · BinlinPad',
  },
  description: 'BinlinPad est un compagnon d\'études IA chaleureux pour les étudiants. Prends des notes, visualise tes connaissances et apprends avec ton tuteur IA personnel.',
  keywords: ['études', 'notes', 'tuteur IA', 'carte mentale', 'apprentissage', 'étudiants', 'Côte d\'Ivoire'],
  authors: [{ name: 'BinlinPad' }],
  manifest: '/site.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BinlinPad',
  },
  openGraph: {
    type: 'website',
    siteName: 'BinlinPad',
    title: 'BinlinPad — Ton compagnon d\'études personnel',
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
    <html lang="fr" className={inter.variable}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="BinlinPad" />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
