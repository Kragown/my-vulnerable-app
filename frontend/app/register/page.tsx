'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, setToken, setUser } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const data = await api<{ token: string; user: object }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(data.token);
      setUser(data.user);
      router.push('/movies');
    } catch (err: unknown) {
      const e = err as Error & { data?: { error?: string } };
      setError(e.data?.error || e.message);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Inscription</h1>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>
          Minimum 8 caractères
        </p>
        <button type="submit" className="btn" style={{ width: '100%' }}>
          Créer un compte
        </button>
      </form>
      <p style={{ marginTop: '1rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
        Déjà inscrit ? <Link href="/login">Se connecter</Link>
      </p>
    </div>
  );
}
