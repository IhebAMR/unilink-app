"use client";
import React from "react";

export interface InputProps extends Readonly<React.InputHTMLAttributes<HTMLInputElement>> {
  full?: boolean;
}

export default function Input({ full = true, style, ...rest }: InputProps) {
  return (
    <input
      {...rest}
      style={{
        width: full ? '100%' : undefined,
        padding: '10px 12px',
        borderRadius: 8,
        border: '1px solid #d0d7de',
        fontSize: '.95rem',
        lineHeight: 1.3,
        outline: 'none',
        background: '#fff',
        transition: 'border-color .15s, box-shadow .15s',
        ...style,
      }}
      onFocus={(e) => (e.currentTarget.style.borderColor = '#1e90ff')}
      onBlur={(e) => (e.currentTarget.style.borderColor = '#d0d7de')}
    />
  );
}
