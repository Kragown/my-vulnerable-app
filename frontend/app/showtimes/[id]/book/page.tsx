'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api, getToken } from '@/lib/api';

interface Seat {
  id: number;
  row_label: string;
  seat_number: number;
  occupied: number;
}

interface Showtime {
  id: number;
  movie_title: string;
  room_name: string;
  starts_at: string;
  rows: number;
  cols: number;
}

type TicketType = 'enfant' | 'etudiant' | 'adulte';

const TICKET_LABELS: Record<TicketType, string> = {
  enfant: 'Enfant (6 €)',
  etudiant: 'Étudiant (8 €)',
  adulte: 'Adulte (12 €)',
};

const TICKET_PRICES: Record<TicketType, number> = {
  enfant: 6,
  etudiant: 8,
  adulte: 12,
};

export default function BookPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [showtime, setShowtime] = useState<Showtime | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selected, setSelected] = useState<Map<number, TicketType>>(new Map());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    api<Showtime>(`/api/showtimes/${id}`).then(setShowtime);
    api<{ seats: Seat[] }>(`/api/showtimes/${id}/seats`).then((d) => setSeats(d.seats));
  }, [id, router]);

  function toggleSeat(seat: Seat) {
    if (seat.occupied) return;
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(seat.id)) {
        next.delete(seat.id);
      } else {
        next.set(seat.id, 'adulte');
      }
      return next;
    });
  }

  function setTicketType(seatId: number, type: TicketType) {
    setSelected((prev) => {
      const next = new Map(prev);
      next.set(seatId, type);
      return next;
    });
  }

  const total = Array.from(selected.entries()).reduce(
    (sum, [, type]) => sum + TICKET_PRICES[type],
    0
  );

  async function handleBook() {
    if (selected.size === 0) {
      setError('Sélectionnez au moins une place.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const seatPayload = Array.from(selected.entries()).map(([seat_id, ticket_type]) => ({
        seat_id,
        ticket_type,
      }));
      const data = await api('/api/reservations', {
        method: 'POST',
        body: JSON.stringify({ showtime_id: Number(id), seats: seatPayload }),
      });
      router.push(`/reservations/${(data as { id: number }).id}`);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!showtime) return <p>Chargement...</p>;

  const rows = [...new Set(seats.map((s) => s.row_label))].sort();

  return (
    <div>
      <Link href={`/movies`} style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>← Retour</Link>
      <h1 style={{ margin: '1rem 0' }}>Réserver — {showtime.movie_title}</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
        {new Date(showtime.starts_at).toLocaleString('fr-FR')} — {showtime.room_name}
      </p>

      <div className="screen">ÉCRAN</div>

      <div className="seat-grid">
        {rows.map((row) => (
          <div key={row} className="seat-row">
            <span className="seat-row-label">{row}</span>
            {seats
              .filter((s) => s.row_label === row)
              .map((seat) => (
                <button
                  key={seat.id}
                  type="button"
                  className={`seat ${seat.occupied ? 'occupied' : ''} ${selected.has(seat.id) ? 'selected' : ''}`}
                  onClick={() => toggleSeat(seat)}
                  disabled={!!seat.occupied}
                  title={`${row}${seat.seat_number}`}
                >
                  {seat.seat_number}
                </button>
              ))}
          </div>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.75rem' }}>Places sélectionnées</h3>
          {Array.from(selected.entries()).map(([seatId, type]) => {
            const seat = seats.find((s) => s.id === seatId)!;
            return (
              <div key={seatId} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <span>Place {seat.row_label}{seat.seat_number}</span>
                <div className="ticket-selector">
                  {(Object.keys(TICKET_LABELS) as TicketType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`ticket-btn ${type === t ? 'active' : ''}`}
                      onClick={() => setTicketType(seatId, t)}
                    >
                      {TICKET_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          <p style={{ marginTop: '1rem', fontWeight: 600 }}>Total : {total} €</p>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      <button className="btn" onClick={handleBook} disabled={loading || selected.size === 0}>
        {loading ? 'Réservation...' : `Confirmer (${total} €)`}
      </button>
    </div>
  );
}
