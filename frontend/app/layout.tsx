import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/Nav';

export const metadata: Metadata = {
  title: 'Cinéma Réservation',
  description: 'Plateforme de réservation de places de cinéma',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Nav />
        <main className="container" style={{ paddingTop: '1.5rem', paddingBottom: '3rem' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
