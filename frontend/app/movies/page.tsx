'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Movie {
  id: number;
  title: string;
  synopsis: string;
  duration: number;
}

export default function MoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api<Movie[]>('/api/movies').then(setMovies).catch((e) => setError(e.message));
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const data = await api<{ query: string; movies: Movie[] }>(
        `/api/movies/search?q=${encodeURIComponent(search)}`
      );
      setSearchResults(data.movies);
      setSearchQuery(data.query);
    } catch (err: unknown) {
      const e = err as Error & { data?: { error?: string } };
      setError(e.data?.error || e.message);
      setSearchResults(null);
    }
  }

  const displayMovies = searchResults ?? movies;

  return (
    <div>
      <h1 style={{ marginBottom: '1rem' }}>Films à l&apos;affiche</h1>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Rechercher un film..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: '0.6rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }}
        />
        <button type="submit" className="btn">Rechercher</button>
        {searchResults && (
          <button type="button" className="btn btn-secondary" onClick={() => { setSearchResults(null); setSearch(''); }}>
            Réinitialiser
          </button>
        )}
      </form>
      {searchQuery && (
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Requête SQL : <code>{searchQuery}</code>
        </p>
      )}
      {error && <div className="error">{error}</div>}
      <div className="grid-movies">
        {displayMovies.map((movie) => (
          <Link key={movie.id} href={`/movies/${movie.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="movie-poster">🎬</div>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{movie.title}</h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              {movie.duration} min
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              {movie.synopsis?.slice(0, 100)}...
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
