import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 0' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
        Réservez vos places de cinéma
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '1.1rem', marginBottom: '2rem', maxWidth: 500, margin: '0 auto 2rem' }}>
        Choisissez un film, sélectionnez vos places et profitez des tarifs réduits enfant et étudiant.
      </p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <Link href="/movies" className="btn">Voir les films</Link>
        <Link href="/login" className="btn btn-secondary">Se connecter</Link>
      </div>
    </div>
  );
}
