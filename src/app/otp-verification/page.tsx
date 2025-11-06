'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './otpVerification.module.css';

// Avoid static prerender to prevent Suspense requirement for useSearchParams during build
export const dynamic = 'force-dynamic';

function OtpVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams?.get('email');
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Handle input change for OTP digits
  const handleChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    if (!/^\d*$/.test(value)) return; // Only allow digits

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Veuillez entrer le code complet');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          otp: otpCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Une erreur est survenue');
      }

      setSuccess('Code vérifié avec succès!');
      
      // Redirect to reset password page
      setTimeout(() => {
        router.push(`/reset-password?token=${data.resetToken}`);
      }, 1500);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return (
      <div className={styles.container}>
        <div className={styles.formBox}>
          <div className={styles.error}>
            Email manquant. Veuillez recommencer le processus de réinitialisation.
          </div>
          <a href="/forgot-password" className={styles.backLink}>
            Retour
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.formBox}>
        <h1>Vérification du code</h1>
        <p className={styles.description}>
          Nous avons envoyé un code à 6 chiffres à <strong>{email}</strong>
        </p>

        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.otpContainer}>
            {otp.map((digit, index) => (
              <input
                key={index}
                type="text"
                id={`otp-${index}`}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                maxLength={1}
                className={styles.otpInput}
                disabled={loading}
                autoFocus={index === 0}
              />
            ))}
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Vérification...' : 'Vérifier'}
          </button>
        </form>

        <div className={styles.footer}>
          <p>Vous n'avez pas reçu le code ?</p>
          <button 
            onClick={() => router.refresh()} 
            className={styles.resendButton}
            disabled={loading}
          >
            Renvoyer le code
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OtpVerificationPage() {
  return (
    <Suspense fallback={<div />}> 
      <OtpVerifyContent />
    </Suspense>
  );
}
