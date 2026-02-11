'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Le password non corrispondono');
      return;
    }

    if (username.length < 3) {
      setError('Lo username deve essere lungo almeno 3 caratteri');
      return;
    }

    if (password.length < 6) {
      setError('La password deve essere lunga almeno 6 caratteri');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registrazione fallita');
        setLoading(false);
        return;
      }

      // Redirect to home
      router.push('/');
      router.refresh();
    } catch (err) {
      setError('Si è verificato un errore. Riprova.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <img src="/logo.svg" alt="Logo" width="40" height="40" style={{ flexShrink: 0, imageRendering: 'auto', WebkitFontSmoothing: 'antialiased' }} />
            Lazy Cook
          </h1>
          <p>Crea il tuo account</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div className="auth-error">
              <i className="bi bi-exclamation-circle"></i>
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              required
              placeholder="Almeno 3 caratteri"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="Almeno 6 caratteri"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password">Conferma Password</label>
            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              required
              placeholder="Ripeti la password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-auth"
            disabled={loading}
          >
            {loading ? 'Creazione account...' : 'Crea account'}
          </button>

          <div className="auth-footer">
            <p>
              Hai già un account?{' '}
              <Link href="/auth/login">Accedi qui</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
