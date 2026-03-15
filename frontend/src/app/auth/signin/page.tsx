'use client';

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

function SignInForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/conversations';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        email: email.trim(),
        redirect: false,
        callbackUrl,
      });
      if (result?.error) {
        setError('Invalid email or user not found. Ensure the user exists in the database.');
        setLoading(false);
        return;
      }
      if (result?.url) {
        window.location.href = result.url;
        return;
      }
      setError('Sign-in failed. Try again.');
    } catch {
      setError('Something went wrong. Try again.');
    }
    setLoading(false);
  };

  return (
    <>
      <h1 style={{ marginTop: 0 }}>Sign in</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>
        Enter your email. You must have an account in the database (e.g. from seed).
      </p>
      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoComplete="email"
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #ccc',
            fontSize: 16,
            marginBottom: 16,
          }}
        />
        {error && <p style={{ color: '#c62828', fontSize: 14, marginBottom: 16 }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: 8,
            border: 'none',
            background: '#1976d2',
            color: '#fff',
            fontSize: 16,
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p style={{ marginTop: 24, fontSize: 14, color: '#666' }}>
        <a href="/">Back to home</a>
      </p>
    </>
  );
}

export default function SignInPage() {
  return (
    <main style={{ maxWidth: 400, margin: '60px auto', padding: 24 }}>
      <Suspense fallback={<p>Loading…</p>}>
        <SignInForm />
      </Suspense>
    </main>
  );
}
