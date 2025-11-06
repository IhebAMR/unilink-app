"use client";
import React from "react";

export interface TextareaProps extends Readonly<React.TextareaHTMLAttributes<HTMLTextAreaElement>> {
  full?: boolean;
}

export default function Textarea({ full = true, style, rows = 4, ...rest }: Readonly<TextareaProps>) {
  return (
    <textarea
      rows={rows}
      {...rest}
      style={{
        width: full ? '100%' : undefined,
        padding: '10px 12px',
        borderRadius: 8,
        border: '1px solid #d0d7de',
        fontSize: '.95rem',
        lineHeight: 1.4,
        outline: 'none',
        background: '#fff',
        resize: 'vertical',
        transition: 'border-color .15s, box-shadow .15s',
        ...style,
      }}
      onFocus={(e) => (e.currentTarget.style.borderColor = '#1e90ff')}
      onBlur={(e) => (e.currentTarget.style.borderColor = '#d0d7de')}
    />
  );
}
