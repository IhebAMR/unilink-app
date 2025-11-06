"use client";
import React from "react";
import Button from "./Button";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number | string;
}

export default function Modal({ open, onClose, title, children, footer, width = 520 }: ModalProps) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: 20,
        zIndex: 11000,
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          background: "#fff",
          width: typeof width === "number" ? `${width}px` : width,
          maxWidth: "95vw",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
        }}
      >
        {title && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>{title}</h3>
            <Button variant="ghost" aria-label="Close" onClick={onClose}>
              ✕
            </Button>
          </div>
        )}
        <div>{children}</div>
        {footer && <div style={{ marginTop: 16 }}>{footer}</div>}
      </div>
    </div>
  );
}
