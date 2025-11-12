"use client";
import React from "react";

type Variant = "success" | "warning" | "neutral" | "info" | "danger" | "primary";

export interface BadgeProps {
  variant?: Variant;
  children: React.ReactNode;
  pill?: boolean;
  style?: React.CSSProperties;
}

const colors: Record<Variant, { bg: string; text: string }> = {
  success: { bg: "#e8f5e9", text: "#2e7d32" },
  warning: { bg: "#fff8e1", text: "#ef6c00" },
  neutral: { bg: "#f0f0f0", text: "#555" },
  info: { bg: "#e3f2fd", text: "#1976d2" },
  danger: { bg: "#ffebee", text: "#c62828" },
  primary: { bg: "#e3f2fd", text: "#1976d2" },
};

export default function Badge({ variant = "neutral", pill = true, children, style }: BadgeProps) {
  const theme = colors[variant] || colors.neutral; // Fallback to neutral if variant is invalid
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: pill ? 999 : 6,
        fontSize: ".78rem",
        fontWeight: 700,
        background: theme.bg,
        color: theme.text,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
