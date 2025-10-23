'use client';

import { useRouter } from 'next/navigation';

interface BackButtonProps {
  label?: string;
  href?: string;
}

export default function BackButton({ label = 'Back', href }: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (href) {
      router.push(href);
    } else {
      router.back();
    }
  };

  return (
    <button
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: '0.95rem',
        fontWeight: 500,
        color: '#666',
        transition: 'all 0.2s',
        marginBottom: 16
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f5f5f5';
        e.currentTarget.style.borderColor = '#999';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'white';
        e.currentTarget.style.borderColor = '#ddd';
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="19" y1="12" x2="5" y2="12"/>
        <polyline points="12 19 5 12 12 5"/>
      </svg>
      {label}
    </button>
  );
}
