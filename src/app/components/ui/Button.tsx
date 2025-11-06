"use client";
import React from "react";
import Link from "next/link";

type Variant = "primary" | "success" | "danger" | "warning" | "neutral" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  href?: string;
}

const palette: Record<Exclude<Variant, "outline" | "ghost">, { bg: string; hover: string; text: string; border: string }> = {
  primary: { bg: "#1e90ff", hover: "#1976d2", text: "#fff", border: "#1e90ff" },
  success: { bg: "#4caf50", hover: "#388e3c", text: "#fff", border: "#4caf50" },
  danger: { bg: "#f44336", hover: "#d32f2f", text: "#fff", border: "#f44336" },
  warning: { bg: "#ff9800", hover: "#f57c00", text: "#fff", border: "#ff9800" },
  neutral: { bg: "#e0e0e0", hover: "#d5d5d5", text: "#333", border: "#c7c7c7" },
};

const paddings: Record<Size, string> = {
  sm: "6px 12px",
  md: "10px 16px",
  lg: "12px 20px",
};

export default function Button({ variant = "primary", size = "md", block, href, style, children, ...rest }: ButtonProps) {
  const baseStyle: React.CSSProperties = {
    display: block ? "block" : "inline-flex",
    width: block ? "100%" : undefined,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: size === "lg" ? "1rem" : size === "md" ? ".95rem" : ".9rem",
    padding: paddings[size],
    cursor: rest.disabled ? "not-allowed" : "pointer",
    transition: "filter .15s ease, opacity .15s ease",
    textDecoration: "none",
    border: "1px solid transparent",
    userSelect: "none",
    gap: 8,
  };

  let colors: React.CSSProperties = {};
  if (variant === "outline") {
    colors = { background: "#fff", color: "#1e90ff", borderColor: "#1e90ff" };
  } else if (variant === "ghost") {
    colors = { background: "transparent", color: "#1e90ff", borderColor: "transparent" };
  } else {
    const p = palette[variant];
    colors = { background: p.bg, color: p.text, borderColor: p.border };
  }

  const merged = { ...baseStyle, ...colors, ...style } as React.CSSProperties;

  const content = (
    <button
      {...rest}
      style={merged}
      onMouseEnter={(e) => {
        if (rest.disabled) return;
        if (variant === "outline") e.currentTarget.style.filter = "brightness(0.95)";
        else if (variant === "ghost") e.currentTarget.style.opacity = "0.85";
        else e.currentTarget.style.filter = "brightness(0.95)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.filter = "";
        e.currentTarget.style.opacity = "";
      }}
    >
      {children}
    </button>
  );

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: "none", width: block ? "100%" : undefined }}>
        {content}
      </Link>
    );
  }
  return content;
}
