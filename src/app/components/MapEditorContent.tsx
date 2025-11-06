'use client';
import React, { useEffect, useRef, useState } from 'react';

type Point = [number, number]; // [lng, lat]

interface MapEditorContentProps {
  initialCoords?: Point[];
  onChange?: (coords: Point[]) => void;
  height?: number;
}

export default function MapEditorContent({ 
  initialCoords = [], 
  onChange, 
  height = 300 
}: MapEditorContentProps) {
  const [isClient, setIsClient] = useState(false);
  const [coords, setCoords] = useState<Point[]>(initialCoords);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    onChange?.(coords);
  }, [coords, onChange]);

  useEffect(() => {
    if (!isClient || !mapRef.current || leafletMapRef.current) return;

    const initMap = async () => {
      const L = (await import('leaflet')).default;
      
      // Fix default icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const center: [number, number] = 
        coords.length ? [coords[0][1], coords[0][0]] : [36.8065, 10.1815];

      if (mapRef.current) {
        mapRef.current.innerHTML = '';
      }

      const mapElement = mapRef.current;
      if (!mapElement) return;
      
      const leafletMap = L.map(mapElement, {
        center: center,
        zoom: 13,
      });

      leafletMapRef.current = leafletMap;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(leafletMap);

      // Handle map clicks
      leafletMap.on('click', (e: any) => {
        const latlng = e.latlng;
        let lng = latlng.lng;
        while (lng > 180) lng -= 360;
        while (lng < -180) lng += 360;
        const lat = Math.max(-90, Math.min(90, latlng.lat));
        
        setCoords(prev => [...prev, [lng, lat]]);
      });
    };

    initMap();

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [isClient]);

  // Update markers and polyline when coords change
  useEffect(() => {
    if (!leafletMapRef.current || !isClient) return;

    const updateMapFeatures = async () => {
      const L = (await import('leaflet')).default;
      const map = leafletMapRef.current;

      // Clear existing markers and polyline
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }

      // Add new markers
      coords.forEach(([lng, lat]) => {
        const marker = L.marker([lat, lng]).addTo(map);
        markersRef.current.push(marker);
      });

      // Add polyline if 2+ points
      if (coords.length >= 2) {
        const latLngs: [number, number][] = coords.map(c => [c[1], c[0]]);
        const polyline = L.polyline(latLngs, { color: 'blue' }).addTo(map);
        polylineRef.current = polyline;
      }
    };

    updateMapFeatures();
  }, [coords, isClient]);

  const undo = () => setCoords(prev => prev.slice(0, -1));
  const clear = () => setCoords([]);

  if (!isClient) {
    return (
      <div>
        <div style={{ 
          height, 
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
    <div>
      <div 
        ref={mapRef} 
        style={{ 
          height, 
          width: '100%',
          borderRadius: '8px',
          overflow: 'hidden'
        }} 
      />

      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <button type="button" onClick={undo} disabled={!coords.length}>
          Undo
        </button>
        <button type="button" onClick={clear} disabled={!coords.length}>
          Clear
        </button>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#666' }}>
          Click map to add waypoints. First point = origin, last point = destination.
        </div>
      </div>
    </div>
  );
}
