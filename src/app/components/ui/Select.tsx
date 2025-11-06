"use client";
import React from "react";

export interface SelectProps extends Readonly<React.SelectHTMLAttributes<HTMLSelectElement>> {
  full?: boolean;
}

export default function Select(props: Readonly<SelectProps>) {
  const { full = true, style, children, ...rest } = props;
  return (
    <select
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
        cursor: 'pointer',
        transition: 'border-color .15s, box-shadow .15s',
        appearance: 'none',
        backgroundImage: 'linear-gradient(45deg, transparent 50%, #666 50%), linear-gradient(135deg, #666 50%, transparent 50%)',
        backgroundPosition: 'calc(100% - 20px) 50%, calc(100% - 15px) 50%',
        backgroundSize: '5px 5px, 5px 5px',
        backgroundRepeat: 'no-repeat',
        ...style,
      }}
      onFocus={(e) => (e.currentTarget.style.borderColor = '#1e90ff')}
      onBlur={(e) => (e.currentTarget.style.borderColor = '#d0d7de')}
    >
      {children}
    </select>
  );
}
