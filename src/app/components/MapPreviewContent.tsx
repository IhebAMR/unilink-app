'use client';
import React, { useEffect, useRef, useState } from 'react';

type Point = [number, number]; // [lng, lat]

interface MapPreviewContentProps {
  coords?: Point[];
  zoom?: number;
}

export default function MapPreviewContent({ coords = [], zoom = 12 }: MapPreviewContentProps) {
  const [isClient, setIsClient] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    if (!isClient || !mapRef.current || leafletMapRef.current) return;

    const init = async () => {
      const L = (await import('leaflet')).default;

      // Fix default icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const first = coords[0];
      const center: [number, number] = first ? [first[1], first[0]] : [36.8065, 10.1815]; // Tunis fallback

      const mapEl = mapRef.current!;
      mapEl.innerHTML = '';

      const map = L.map(mapEl, { center, zoom });
      leafletMapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      // Draw initial features
      drawFeatures();
    };

    init();

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient]);

  const drawFeatures = async () => {
    if (!leafletMapRef.current) return;
    const L = (await import('leaflet')).default;
    const map = leafletMapRef.current;

    // Clear existing
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    if (polylineRef.current) { polylineRef.current.remove(); polylineRef.current = null; }

    if (!coords.length) return;

    // Markers for endpoints
    const start = coords[0];
    const end = coords[coords.length - 1];
    const startMarker = L.marker([start[1], start[0]]).addTo(map);
    markersRef.current.push(startMarker);
    if (end && (end[0] !== start[0] || end[1] !== start[1])) {
      const endMarker = L.marker([end[1], end[0]]).addTo(map);
      markersRef.current.push(endMarker);
    }

    // Polyline
    if (coords.length >= 2) {
      const latlngs: [number, number][] = coords.map(c => [c[1], c[0]]);
      polylineRef.current = L.polyline(latlngs, { color: 'blue' }).addTo(map);
      // Fit bounds
      const bounds = L.latLngBounds(latlngs.map(([lat, lng]) => [lat, lng] as [number, number]));
      map.fitBounds(bounds, { padding: [24, 24] });
    }
  };

  useEffect(() => {
    // Update features when coords change
    drawFeatures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords.map(c => c.join(',')) .join('|')]);

  if (!isClient) {
    return (
      <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', borderRadius: 8 }}>
        <p style={{ color: '#6b7280' }}>Loading map...</p>
      </div>
    );
  }

  return <div ref={mapRef} style={{ height: '100%', width: '100%', borderRadius: 8, overflow: 'hidden' }} />;
}
