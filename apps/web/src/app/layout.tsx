import './globals.css';
import type { Metadata } from 'next';
import { ToastProvider } from '../providers/toast-provider';
import { QueryProvider } from '../providers/query-provider';
import { AuthProvider } from '../providers/auth-provider';

export const metadata: Metadata = {
  title: 'Online Creative & IT Academy | Modern LMS & Certification',
  description:
    'Master modern software engineering, AI engineering, and full-stack development with industry-recognized verifiable certificates.',
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
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-cream text-ink antialiased selection:bg-coral-500 selection:text-white">
        <QueryProvider>
          <AuthProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
