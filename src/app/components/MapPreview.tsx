'use client';
import 'leaflet/dist/leaflet.css';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

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
const MapContent = dynamic(
  () => import('./MapPreviewContent').then(mod => mod.default),
  { 
    ssr: false,
    loading: () => (
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
    )
  }
);

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
      <MapContent coords={coords} zoom={zoom} />
    </div>
  );
}