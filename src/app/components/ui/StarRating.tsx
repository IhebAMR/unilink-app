"use client";
import React, { useState, useEffect } from 'react';

interface StarRatingProps {
  value: number;               // current selected rating
  onChange: (value: number) => void; // callback when user selects a rating
  size?: number;               // pixel size of each star
  disabled?: boolean;          // prevent interaction
  allowClear?: boolean;        // clicking the same star clears selection
  readOnly?: boolean;          // purely display, no interaction
  ariaLabel?: string;          // accessible label
}

// Accessible, keyboard & touch friendly star rating component (1-5)
export default function StarRating({
  value,
  onChange,
  size = 28,
  disabled = false,
  allowClear = true,
  readOnly = false,
  ariaLabel = 'Rating'
}: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null);

  const effective = hover !== null ? hover : value;

  // Keyboard navigation support: ArrowLeft/ArrowRight, Home/End
  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (readOnly || disabled) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.min(5, (value || 0) + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.max(1, (value || 1) - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(1);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(5);
    } else if (e.key === '0') {
      e.preventDefault();
      if (allowClear) onChange(0);
    } else if (/^[1-5]$/.test(e.key)) {
      e.preventDefault();
      onChange(Number(e.key));
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={handleKey}
      style={{ display: 'flex', gap: 4, outline: 'none' }}
    >
      {Array.from({ length: 5 }, (_, i) => i + 1).map(star => {
        const filled = star <= effective;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`}
            disabled={disabled || readOnly}
            onMouseEnter={() => !readOnly && !disabled && setHover(star)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => !readOnly && !disabled && setHover(star)}
            onBlur={() => setHover(null)}
            onClick={() => {
              if (readOnly || disabled) return;
              if (allowClear && value === star) onChange(0); else onChange(star);
            }}
            style={{
              cursor: disabled || readOnly ? 'default' : 'pointer',
              background: 'none',
              border: 'none',
              padding: 4,
              lineHeight: 0,
              display: 'inline-flex',
              transition: 'transform .15s',
              transform: hover === star ? 'scale(1.15)' : 'scale(1)',
            }}
          >
            <svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill={filled ? '#facc15' : 'none'}
              stroke={filled ? '#facc15' : '#d1d5db'}
              strokeWidth={2}
              style={{ filter: filled ? 'drop-shadow(0 0 2px rgba(250, 204, 21, .5))' : 'none' }}
            >
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
