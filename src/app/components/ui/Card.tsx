"use client";
import React from "react";

export interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  hoverable?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export default function Card({ children, style, hoverable, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        padding: 16,
        transition: "transform .12s ease, box-shadow .12s ease",
        ...(hoverable ? { cursor: "pointer" } : {}),
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!hoverable) return;
        e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.12)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        if (!hoverable) return;
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
        e.currentTarget.style.transform = "";
      }}
    >
      {children}
    </div>
  );
}
