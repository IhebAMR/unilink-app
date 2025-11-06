'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import styles from './login.module.css';

// Avoid static prerender to prevent Suspense requirement for useSearchParams during build
export const dynamic = 'force-dynamic';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  useEffect(() => {
    if (searchParams?.get('registered') === 'true') {
      setSuccess('Inscription réussie! Veuillez vous connecter.');
    }
    if (searchParams?.get('error') === 'OAuthAccountNotLinked') {
      setError('Ce compte Google est déjà associé à un autre compte. Essayez de vous connecter avec votre email et mot de passe.');
    }
  }, [searchParams]);

  // Redirect if already authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/');
    }
  }, [status, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Une erreur est survenue');
      }

      // Save user data in localStorage
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Dispatch custom event to notify Header component
      window.dispatchEvent(new Event('userLogin'));
      
      // Show success message
      setSuccess('Connexion réussie!');
      
      // Redirect immediately without delay
      router.push('/');
      router.refresh(); // Force refresh to update the Header
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginBox}>
        <h1>Connexion</h1>
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}
        <form className={styles.loginForm} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="email">Email</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              value={formData.email}
              onChange={handleChange}
              required 
              placeholder="Votre email"
              disabled={loading}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="password">Mot de passe</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              value={formData.password}
              onChange={handleChange}
              required 
              placeholder="Votre mot de passe"
              disabled={loading}
            />
          </div>
          <button 
            type="submit" 
            className={styles.loginButton}
            disabled={loading}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
          <a href="/forgot-password" className={styles.forgotPassword}>
            Mot de passe oublié ?
          </a>
        </form>

        <div className={styles.divider}>ou</div>

        <button
          type="button"
          className={styles.googleButton}
          onClick={() => signIn('google', { callbackUrl: '/' })}
          disabled={loading}
        >
          <img src="/google-icon.svg" alt="Google" className={styles.googleIcon} />
          Se connecter avec Google
        </button>

        <p className={styles.registerLink}>
          Pas encore de compte ? <a href="/register">S'inscrire</a>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div />}> 
      <LoginContent />
    </Suspense>
  );
}
