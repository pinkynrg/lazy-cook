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
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
