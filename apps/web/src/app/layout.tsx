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
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
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
