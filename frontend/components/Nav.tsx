'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { clearToken, getUser } from '@/lib/api';

export default function Nav() {
  const [user, setUser] = useState<{ email: string; role: string } | null>(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  function logout() {
    clearToken();
    setUser(null);
    window.location.href = '/login';
  }

  return (
    <header style={{ borderBottom: '1px solid var(--border)', padding: '1rem 0' }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', textDecoration: 'none' }}>
          Cinéma<span style={{ color: 'var(--accent)' }}>Book</span>
        </Link>
        <nav style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
          <Link href="/movies">Films</Link>
          {user ? (
            <>
              <Link href="/reservations">Mes réservations</Link>
              {user.role === 'admin' && <Link href="/admin">Admin</Link>}
              <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{user.email}</span>
              <button className="btn btn-secondary" onClick={logout} style={{ padding: '0.4rem 0.8rem' }}>
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link href="/login">Connexion</Link>
              <Link href="/register" className="btn" style={{ padding: '0.4rem 0.8rem' }}>
                Inscription
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
