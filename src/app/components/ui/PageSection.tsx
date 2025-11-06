"use client";
import React from "react";

export interface PageSectionProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export default function PageSection({ title, description, actions, children, style }: PageSectionProps) {
  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        padding: 20,
        ...style,
      }}
    >
      {(title || description || actions) && (
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            {title && <h2 style={{ margin: 0 }}>{title}</h2>}
            {description && <p style={{ margin: "6px 0 0", color: "#666" }}>{description}</p>}
          </div>
          {actions && <div style={{ marginLeft: 12 }}>{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
