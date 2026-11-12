import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ToastProvider } from '../providers/toast-provider';
import { QueryProvider } from '../providers/query-provider';
import { AuthProvider } from '../providers/auth-provider';
import { AnalyticsScripts } from '../components/common/analytics-scripts';
import { SITE_URL } from '../lib/site';
import { getSiteConfig } from '../lib/site-server';

const DESCRIPTION =
  'ADSIGN Skill Academy: job-ready online courses in design, development, marketing and AI with live classes, mentor-reviewed projects and verifiable certificates.';

const DEFAULT_TITLE = 'ADSIGN Skill Academy | Creative & IT courses with certificates';

/** Site-wide defaults; the SEO team can change the default title/description and Search Console code in the console. */
export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getSiteConfig();
  const title = settings['seo.defaultTitle'] || DEFAULT_TITLE;
  const description = settings['seo.defaultDescription'] || DESCRIPTION;
  const verification = settings['seo.searchConsole'];
  return {
    ...metadata,
    title: { default: title, template: '%s | ADSIGN Skill Academy' },
    description,
    openGraph: { ...metadata.openGraph, description },
    twitter: { ...metadata.twitter, description },
    ...(verification ? { verification: { google: verification } } : {}),
  };
}

const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: DEFAULT_TITLE, template: '%s | ADSIGN Skill Academy' },
  description: DESCRIPTION,
  applicationName: 'ADSIGN Skill Academy',
  keywords: ['online courses', 'graphic design course', 'UI UX course', 'web development course', 'digital marketing course', 'India', 'certificate'],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'ADSIGN Skill Academy',
    title: 'ADSIGN Skill Academy',
    description: DESCRIPTION,
    url: '/',
    images: [{ url: '/brand/og.png', width: 1200, height: 630, alt: 'ADSIGN Skill Academy' }],
    locale: 'en_IN',
  },
  twitter: { card: 'summary_large_image', title: 'ADSIGN Skill Academy', description: DESCRIPTION, images: ['/brand/og.png'] },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#171C24',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { settings } = await getSiteConfig();
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-cream text-ink antialiased selection:bg-indigo-500 selection:text-white">
        <QueryProvider>
          <AuthProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
            <AnalyticsScripts ids={{ gaId: settings['analytics.gaId'], adsId: settings['analytics.adsId'], pixelId: settings['analytics.pixelId'] }} />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
