import type { Metadata } from 'next';
import { Big_Shoulders, Instrument_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import '@/lib/scene/person-tile.css';
import './globals.css';

/** Signage face for the login page and visitor pass. The optical size axis keeps big headings crisp. */
const display = Big_Shoulders({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-display',
});

const text = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-text',
});

export const metadata: Metadata = {
  title: 'Kasatria People Table',
  description: 'People from a Google Sheet, arranged as a 3D table, sphere, double helix and grid.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${text.variable}`}>
      <body>{children}</body>
    </html>
  );
}
