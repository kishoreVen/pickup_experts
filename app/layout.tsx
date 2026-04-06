import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Pickup Experts — Soccer Tactics Board',
  description: 'AI-powered animated soccer strategy builder. Describe a play, watch it come to life.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.variable} font-sans h-full overflow-hidden`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
