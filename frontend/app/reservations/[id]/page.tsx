'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api, getToken } from '@/lib/api';

interface ReservationDetail {
  id: number;
  user_id: number;
  user_email: string;
  movie_title: string;
  room_name: string;
  starts_at: string;
  total_price: number;
  status: string;
  seats: { row_label: string; seat_number: number; ticket_type: string; price: number }[];
}

export default function ReservationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    api<ReservationDetail>(`/api/reservations/${id}`)
      .then(setReservation)
      .catch((e) => setError(e.message));
  }, [id, router]);

  if (error) return <div className="error">{error}</div>;
  if (!reservation) return <p>Chargement...</p>;

  return (
    <div>
      <Link href="/reservations" style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>← Mes réservations</Link>
      <h1 style={{ margin: '1rem 0' }}>Réservation #{reservation.id}</h1>
      <div className="card">
        <p><strong>Film :</strong> {reservation.movie_title}</p>
        <p><strong>Salle :</strong> {reservation.room_name}</p>
        <p><strong>Date :</strong> {new Date(reservation.starts_at).toLocaleString('fr-FR')}</p>
        <p><strong>Client :</strong> {reservation.user_email} (ID: {reservation.user_id})</p>
        <p><strong>Statut :</strong> {reservation.status}</p>
        <p><strong>Total :</strong> {reservation.total_price} €</p>
        <h3 style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>Places</h3>
        <ul>
          {reservation.seats.map((s, i) => (
            <li key={i}>
              {s.row_label}{s.seat_number} — {s.ticket_type} ({s.price} €)
            </li>
          ))}
        </ul>
      </div>
      <p style={{ marginTop: '1rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
        Astuce : changez l&apos;ID dans l&apos;URL pour voir les réservations d&apos;autres utilisateurs.
      </p>
    </div>
  );
}
