'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken } from '@/lib/api';

interface Stats {
  users: number;
  movies: number;
  reservations: number;
  revenue: number;
  recent_reservations: {
    id: number;
    total_price: number;
    status: string;
    email: string;
    title: string;
  }[];
}

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    api<Stats>('/api/admin/stats')
      .then(setStats)
      .catch((e) => setError(e.message));
  }, [router]);

  if (error) return <div className="error">{error}</div>;
  if (!stats) return <p>Chargement...</p>;

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem' }}>Panneau d&apos;administration</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card"><strong>Utilisateurs</strong><p style={{ fontSize: '2rem' }}>{stats.users}</p></div>
        <div className="card"><strong>Films</strong><p style={{ fontSize: '2rem' }}>{stats.movies}</p></div>
        <div className="card"><strong>Réservations</strong><p style={{ fontSize: '2rem' }}>{stats.reservations}</p></div>
        <div className="card"><strong>Revenus</strong><p style={{ fontSize: '2rem' }}>{stats.revenue} €</p></div>
      </div>
      <h2 style={{ marginBottom: '1rem' }}>Réservations récentes</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
            <th style={{ padding: '0.5rem' }}>ID</th>
            <th style={{ padding: '0.5rem' }}>Film</th>
            <th style={{ padding: '0.5rem' }}>Client</th>
            <th style={{ padding: '0.5rem' }}>Montant</th>
            <th style={{ padding: '0.5rem' }}>Statut</th>
          </tr>
        </thead>
        <tbody>
          {stats.recent_reservations.map((r) => (
            <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '0.5rem' }}>{r.id}</td>
              <td style={{ padding: '0.5rem' }}>{r.title}</td>
              <td style={{ padding: '0.5rem' }}>{r.email}</td>
              <td style={{ padding: '0.5rem' }}>{r.total_price} €</td>
              <td style={{ padding: '0.5rem' }}>{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
