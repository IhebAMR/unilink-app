'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import MapEditor from '@/app/components/MapEditor';

type Point = [number, number];

export default function CreateRidePage() {
  const router = useRouter();
  const [title, setTitle] = React.useState('');
  const [originAddress, setOriginAddress] = React.useState('');
  const [destAddress, setDestAddress] = React.useState('');
  const [dateTime, setDateTime] = React.useState('');
  const [seatsTotal, setSeatsTotal] = React.useState(1);
  const [price, setPrice] = React.useState(0);
  const [notes, setNotes] = React.useState('');
  const [coords, setCoords] = React.useState<Point[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!originAddress || !destAddress) {
      setError('Please enter origin and destination addresses.');
      return;
    }

    if (coords.length < 2) {
      setError('Please draw a route with at least origin and destination on the map.');
      return;
    }
    if (!dateTime) {
      setError('Please select a date and time.');
      return;
    }

    const body = {
      title,
      origin: { 
        address: originAddress, 
        location: { type: 'Point', coordinates: coords[0] } 
      },
      destination: { 
        address: destAddress, 
        location: { type: 'Point', coordinates: coords.at(-1) || coords[0] } 
      },
      route: { type: 'LineString', coordinates: coords },
      dateTime,
      seatsTotal,
      price,
      notes,
    };

    try {
      setLoading(true);
      const res = await fetch('/api/carpools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // send auth cookie
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Failed to create ride');
      }
      const json = await res.json();
      // redirect to listing or detail
      router.push('/carpools');
    } catch (err: any) {
      setError(err.message || 'Error creating ride');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
      <h1>Create Ride</h1>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Title (optional)</label>
          <input value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%' }} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Origin Address *</label>
          <input 
            value={originAddress} 
            onChange={e => setOriginAddress(e.target.value)} 
            placeholder="Starting point address"
            required
            style={{ width: '100%' }} 
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Destination Address *</label>
          <input 
            value={destAddress} 
            onChange={e => setDestAddress(e.target.value)} 
            placeholder="Ending point address"
            required
            style={{ width: '100%' }} 
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Date & time</label>
          <input type="datetime-local" value={dateTime} onChange={e => setDateTime(e.target.value)} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Seats</label>
          <input type="number" min={1} value={seatsTotal} onChange={e => setSeatsTotal(Number(e.target.value))} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Price (per passenger)</label>
          <input type="number" min={0} value={price} onChange={e => setPrice(Number(e.target.value))} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ width: '100%' }} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Draw route on map (click to add waypoints)</label>
          <MapEditor initialCoords={[]} onChange={(c) => setCoords(c)} height={360} />
        </div>

        {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Ride'}</button>
          <button type="button" onClick={() => router.push('/carpools')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}