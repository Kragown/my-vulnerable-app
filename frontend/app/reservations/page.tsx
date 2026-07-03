'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getToken } from '@/lib/api';

interface Reservation {
  id: number;
  movie_title: string;
  starts_at: string;
  total_price: number;
  status: string;
  created_at: string;
}

export default function ReservationsPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    api<Reservation[]>('/api/reservations').then(setReservations);
  }, [router]);

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem' }}>Mes réservations</h1>
      {reservations.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>Aucune réservation.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {reservations.map((r) => (
            <Link key={r.id} href={`/reservations/${r.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <strong>{r.movie_title}</strong>
                  <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                    {new Date(r.starts_at).toLocaleString('fr-FR')}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong>{r.total_price} €</strong>
                  <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{r.status}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
