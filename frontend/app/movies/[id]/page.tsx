'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, getToken } from '@/lib/api';

interface Movie {
  id: number;
  title: string;
  synopsis: string;
  duration: number;
}

interface Showtime {
  id: number;
  movie_id: number;
  starts_at: string;
  room_name: string;
}

interface Review {
  id: number;
  content: string;
  author_email: string;
  created_at: string;
}

export default function MovieDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [movie, setMovie] = useState<Movie | null>(null);
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewText, setReviewText] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    api<Movie>(`/api/movies/${id}`).then(setMovie);
    api<Showtime[]>('/api/showtimes').then((all) =>
      setShowtimes(all.filter((s) => s.movie_id === Number(id)))
    );
    loadReviews();
  }, [id]);

  function loadReviews() {
    api<Review[]>(`/api/reviews?movieId=${id}`).then(setReviews).catch(() => setReviews([]));
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!getToken()) {
      setMessage('Connectez-vous pour laisser un avis.');
      return;
    }
    try {
      await api('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({ movie_id: Number(id), content: reviewText }),
      });
      setReviewText('');
      setMessage('Avis publié !');
      loadReviews();
    } catch (err: unknown) {
      setMessage((err as Error).message);
    }
  }

  if (!movie) return <p>Chargement...</p>;

  return (
    <div>
      <Link href="/movies" style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>← Retour</Link>
      <h1 style={{ margin: '1rem 0' }}>{movie.title}</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>{movie.duration} min</p>
      <p style={{ marginBottom: '2rem', maxWidth: 700 }}>{movie.synopsis}</p>

      <h2 style={{ marginBottom: '1rem' }}>Séances disponibles</h2>
      {showtimes.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>Aucune séance pour ce film.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
          {showtimes.map((s) => (
            <div key={s.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{new Date(s.starts_at).toLocaleString('fr-FR')}</strong>
                <span style={{ color: 'var(--muted)', marginLeft: '1rem' }}>{s.room_name}</span>
              </div>
              <Link href={`/showtimes/${s.id}/book`} className="btn" style={{ padding: '0.4rem 1rem' }}>
                Réserver
              </Link>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ marginBottom: '1rem' }}>Avis</h2>
      {reviews.map((r) => (
        <div key={r.id} className="card" style={{ marginBottom: '0.75rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
            {r.author_email} — {new Date(r.created_at).toLocaleDateString('fr-FR')}
          </p>
          <div>{r.content}</div>
        </div>
      ))}

      <form onSubmit={submitReview} style={{ marginTop: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.75rem' }}>Laisser un avis</h3>
        {message && <div className="success">{message}</div>}
        <div className="form-group">
          <textarea
            rows={3}
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Votre avis sur le film..."
          />
        </div>
        <button type="submit" className="btn">Publier</button>
      </form>
    </div>
  );
}
