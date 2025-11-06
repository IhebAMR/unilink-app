'use client';
import 'leaflet/dist/leaflet.css';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

type Point = [number, number]; // [lng, lat]

interface MapEditorProps {
  initialCoords?: Point[]; // LineString coordinates: [[lng,lat], ...]
  onChange?: (coords: Point[]) => void;
  height?: number;
}

interface MapEditorContentProps {
  initialCoords?: Point[];
  onChange?: (coords: Point[]) => void;
  height?: number;
}

// Dynamically import map editor content with no SSR
const MapEditorContent = dynamic(
  () => import('./MapEditorContent').then(mod => mod.default),
  { 
    ssr: false,
    loading: () => (
      <div style={{ 
        height: '300px', 
        width: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: '8px'
      }}>
        <p style={{ color: '#6b7280' }}>Loading map editor...</p>
      </div>
    )
  }
);

export default function MapEditor({ initialCoords = [], onChange, height = 300 }: MapEditorProps) {
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
          <p style={{ color: '#6b7280' }}>Loading map editor...</p>
        </div>
      </div>
    );
  }

  return <MapEditorContent initialCoords={initialCoords} onChange={onChange} height={height} />;
}