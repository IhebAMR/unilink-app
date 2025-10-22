'use client';
import 'leaflet/dist/leaflet.css';
import React from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

type Point = [number, number]; // [lng, lat]

interface MapEditorProps {
  initialCoords?: Point[]; // LineString coordinates: [[lng,lat], ...]
  onChange?: (coords: Point[]) => void;
  height?: number;
}

function ClickHandler({ onAdd }: { onAdd: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      onAdd(e.latlng);
    },
  });
  return null;
}

export default function MapEditor({ initialCoords = [], onChange, height = 300 }: MapEditorProps) {
  const [coords, setCoords] = React.useState<Point[]>(initialCoords);

  React.useEffect(() => {
    onChange?.(coords);
  }, [coords, onChange]);

  const addPoint = (latlng: L.LatLng) => {
    // Clamp coordinates to valid ranges
    // Longitude: -180 to 180
    let lng = latlng.lng;
    while (lng > 180) lng -= 360;
    while (lng < -180) lng += 360;
    
    // Latitude: -90 to 90 (should already be valid from Leaflet, but clamp just in case)
    const lat = Math.max(-90, Math.min(90, latlng.lat));
    
    // convert to [lng, lat]
    setCoords(prev => [...prev, [lng, lat]]);
  };

  const undo = () => setCoords(prev => prev.slice(0, -1));
  const clear = () => setCoords([]);

  const center: [number, number] = coords.length ? [coords[0][1], coords[0][0]] : [36.8065, 10.1815]; // [lat, lng] default (Tunis example)

  // Leaflet Marker icon fix (default icon paths)
  const DefaultIcon = L.icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });
  // @ts-ignore
  L.Marker.prototype.options.icon = DefaultIcon;

  return (
    <div>
      <div style={{ height }}>
        <MapContainer center={center as any} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onAdd={addPoint} />
          {coords.map((p, i) => (
            <Marker key={`${p[0]}-${p[1]}-${i}`} position={[p[1], p[0]] as any} />
          ))}
          {coords.length >= 2 && (
            <Polyline positions={coords.map(c => [c[1], c[0]] as any)} color="blue" />
          )}
        </MapContainer>
      </div>

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