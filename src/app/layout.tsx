import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lazy Cook - Weekly Recipes',
  description: 'Gestisci le tue ricette settimanali e la lista della spesa',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
