'use client';
import 'leaflet/dist/leaflet.css';
import React from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';

type Point = [number, number]; // [lng, lat]

interface MapPreviewProps {
  coords?: Point[]; // LineString coordinates
  height?: number;
  zoom?: number;
}

export default function MapPreview({ coords = [], height = 160, zoom = 12 }: MapPreviewProps) {
  const center: [number, number] = coords.length ? [coords[0][1], coords[0][0]] : [36.8065, 10.1815];

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
    <div style={{ height }}>
      <MapContainer center={center as any} zoom={zoom} style={{ height: '100%', width: '100%' }} dragging={false} touchZoom={false} scrollWheelZoom={false} doubleClickZoom={false} zoomControl={false}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {coords.length >= 1 && <Marker position={[coords[0][1], coords[0][0]] as any} />}
        {coords.length >= 2 && <Marker position={[coords[coords.length - 1][1], coords[coords.length - 1][0]] as any} />}
        {coords.length >= 2 && <Polyline positions={coords.map(c => [c[1], c[0]] as any)} color="blue" />}
      </MapContainer>
    </div>
  );
}