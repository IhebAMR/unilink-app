"use client";
import React from "react";

interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  description?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export default function FormField({ label, htmlFor, required, description, children, style }: FormFieldProps) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      {label && (
        <label htmlFor={htmlFor} style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
          {label} {required && <span style={{ color: "#f44336" }}>*</span>}
        </label>
      )}
      {children}
      {description && (
        <div style={{ fontSize: ".85rem", color: "#666", marginTop: 6 }}>{description}</div>
      )}
    </div>
  );
}
