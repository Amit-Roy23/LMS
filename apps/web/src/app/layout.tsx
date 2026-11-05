import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ToastProvider } from '../providers/toast-provider';
import { QueryProvider } from '../providers/query-provider';
import { AuthProvider } from '../providers/auth-provider';
import { AnalyticsScripts } from '../components/common/analytics-scripts';
import { SITE_URL } from '../lib/site';

const DESCRIPTION =
  'ADSIGN Skill Academy: job-ready online courses in design, development, marketing and AI with live classes, mentor-reviewed projects and verifiable certificates.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'ADSIGN Skill Academy | Creative & IT courses with certificates', template: '%s | ADSIGN Skill Academy' },
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
            <AnalyticsScripts />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
