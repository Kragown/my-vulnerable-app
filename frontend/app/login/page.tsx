'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, setToken, setUser } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorHtml, setErrorHtml] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorHtml('');
    try {
      const data = await api<{ token: string; user: object }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(data.token);
      setUser(data.user);
      router.push('/movies');
    } catch (err: unknown) {
      const e = err as Error & { data?: { error?: string; reflected?: string } };
      const msg = e.data?.error || e.message;
      setErrorHtml(msg);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Connexion</h1>
      {errorHtml && (
        <div
          className="error"
          dangerouslySetInnerHTML={{ __html: errorHtml }}
        />
      )}
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
          />
        </div>
        <button type="submit" className="btn" style={{ width: '100%' }}>
          Se connecter
        </button>
      </form>
      <p style={{ marginTop: '1rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
        Pas de compte ? <Link href="/register">S&apos;inscrire</Link>
      </p>
      <p style={{ marginTop: '0.5rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
        Démo : user@demo.local / password
      </p>
    </div>
  );
}
