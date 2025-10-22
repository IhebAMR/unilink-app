'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import MapEditor from '@/app/components/MapEditor';

export default function CreateRideDemandPage() {
  const router = useRouter();

  const [title, setTitle] = React.useState('');
  const [originAddress, setOriginAddress] = React.useState('');
  const [destAddress, setDestAddress] = React.useState('');
  const [dateTime, setDateTime] = React.useState('');
  const [seatsNeeded, setSeatsNeeded] = React.useState(1);
  const [maxPrice, setMaxPrice] = React.useState(0);
  const [notes, setNotes] = React.useState('');
  const [originCoords, setOriginCoords] = React.useState<[number, number] | null>(null);
  const [destCoords, setDestCoords] = React.useState<[number, number] | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!originAddress || !destAddress || !dateTime) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        title,
        origin: {
          address: originAddress,
          location: originCoords ? { type: 'Point', coordinates: originCoords } : undefined
        },
        destination: {
          address: destAddress,
          location: destCoords ? { type: 'Point', coordinates: destCoords } : undefined
        },
        dateTime,
        seatsNeeded,
        maxPrice,
        notes
      };

      const res = await fetch('/api/ride-demands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const json = await res.json();
        alert(json.error || 'Failed to create ride demand');
        return;
      }

      alert('Ride demand created successfully!');
      router.push('/ride-demands');
    } catch (err) {
      console.error('Failed to create ride demand', err);
      alert('Failed to create ride demand');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
      <h1>Request a Ride</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>
        Looking for a ride? Fill out this form and drivers will see your request.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>
            Title (Optional)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Daily commute to campus"
            style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>
            From (Origin) *
          </label>
          <input
            type="text"
            value={originAddress}
            onChange={(e) => setOriginAddress(e.target.value)}
            placeholder="Starting point address"
            required
            style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>
            To (Destination) *
          </label>
          <input
            type="text"
            value={destAddress}
            onChange={(e) => setDestAddress(e.target.value)}
            placeholder="Destination address"
            required
            style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>
              Date & Time *
            </label>
            <input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              required
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>
              Seats Needed
            </label>
            <input
              type="number"
              value={seatsNeeded}
              onChange={(e) => setSeatsNeeded(Number(e.target.value))}
              min="1"
              max="8"
              required
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>
            Maximum Price (Optional)
          </label>
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            min="0"
            step="0.01"
            placeholder="0.00"
            style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>
            Additional Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special requirements or details..."
            rows={4}
            style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <h3>Location (Optional)</h3>
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: 8 }}>
            Click on the map to set origin and destination points
          </p>
          <MapEditor
            onChange={(coords: [number, number][]) => {
              if (coords.length >= 2) {
                setOriginCoords(coords[0]);
                setDestCoords(coords.at(-1) || null);
              }
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              flex: 1,
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: 4,
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}
          >
            {submitting ? 'Creating...' : 'Create Ride Request'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/ride-demands')}
            style={{
              backgroundColor: '#999',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
