'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './register.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

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

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.fullName,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Une erreur est survenue');
      }

      // Registration successful
      router.push('/login?registered=true');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.registerContainer}>
      <div className={styles.registerBox}>
        <h1>Inscription</h1>
        {error && <div className={styles.error}>{error}</div>}
        <form className={styles.registerForm} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="fullName">Nom complet</label>
            <input 
              type="text" 
              id="fullName" 
              name="fullName" 
              value={formData.fullName}
              onChange={handleChange}
              required 
              placeholder="Votre nom complet"
              disabled={loading}
            />
          </div>
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
              placeholder="Créer un mot de passe"
              disabled={loading}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
            <input 
              type="password" 
              id="confirmPassword" 
              name="confirmPassword" 
              value={formData.confirmPassword}
              onChange={handleChange}
              required 
              placeholder="Confirmer votre mot de passe"
              disabled={loading}
            />
          </div>
          <button 
            type="submit" 
            className={styles.registerButton}
            disabled={loading}
          >
            {loading ? 'Inscription en cours...' : "S'inscrire"}
          </button>
        </form>
        <p className={styles.loginLink}>
          Déjà inscrit ? <a href="/login">Se connecter</a>
        </p>
      </div>
    </div>
  );
}
