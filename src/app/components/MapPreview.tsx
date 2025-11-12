"use client";
import 'leaflet/dist/leaflet.css';
import React, { useEffect, useState } from 'react';
import ErrorBoundary from './ErrorBoundary';
import MapPreviewContent from './MapPreviewContent';

type Point = [number, number]; // [lng, lat]

interface MapPreviewProps {
  coords?: Point[]; // LineString coordinates
  height?: number;
  zoom?: number;
}

interface MapContentProps {
  coords: Point[];
  zoom: number;
}

// Dynamically import map components with no SSR
// We import MapPreviewContent statically and only render it on the client (after mount)
// to avoid dynamic chunk resolution issues in dev where the chunk URL may be miscomputed.

export default function MapPreview({ coords = [], height = 160, zoom = 12 }: Readonly<MapPreviewProps>) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div style={{ height }}>
        <div style={{ 
          height: '100%', 
          width: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px'
        }}>
          <p style={{ color: '#6b7280' }}>Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height }}>
      {/* Wrap in an ErrorBoundary so errors inside the map component don't crash the whole app */}
      <ErrorBoundary>
        <MapPreviewContent coords={coords} zoom={zoom} />
      </ErrorBoundary>
    </div>
  );
}