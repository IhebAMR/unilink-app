'use client';
import React, { useEffect, useState, useRef } from 'react';

type Point = [number, number]; // [lng, lat]

interface MapPreviewContentProps {
  coords: Point[];
  zoom: number;
}

export default function MapPreviewContent({ coords, zoom }: Readonly<MapPreviewContentProps>) {
  const [isClient, setIsClient] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !mapRef.current) return;

    // Dynamically import Leaflet and initialize the map
    const initMap = async () => {
      const L = (await import('leaflet')).default;
      
      // Fix default icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const center: [number, number] = coords.length ? [coords[0][1], coords[0][0]] : [36.8065, 10.1815];

      // Clear any existing map
      if (mapRef.current) {
        mapRef.current.innerHTML = '';
      }

      // Create map
      const mapElement = mapRef.current;
      if (!mapElement) return;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const leafletMap = L.map(mapElement as HTMLElement, {
        center: center,
        zoom: zoom,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        zoomControl: false,
      });

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(leafletMap);

      // Add markers
      if (coords.length >= 1) {
        L.marker([coords[0][1], coords[0][0]]).addTo(leafletMap);
      }
      const lastCoord = coords.at(-1);
      if (coords.length >= 2 && lastCoord) {
        L.marker([lastCoord[1], lastCoord[0]]).addTo(leafletMap);
      }

      // Add polyline
      if (coords.length >= 2) {
        const latLngs: [number, number][] = coords.map(c => [c[1], c[0]]);
        L.polyline(latLngs, { color: 'blue' }).addTo(leafletMap);
      }
    };

    initMap();
  }, [isClient, coords, zoom]);

  if (!isClient) {
    return (
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
    );
  }

  return (
    <div 
      ref={mapRef} 
      style={{ 
        height: '100%', 
        width: '100%',
        borderRadius: '8px',
        overflow: 'hidden'
      }} 
    />
  );
}
