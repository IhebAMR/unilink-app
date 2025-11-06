'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import BackButton from '@/app/components/BackButton';
import PageSection from '@/app/components/ui/PageSection';
import FormField from '@/app/components/ui/FormField';
import Input from '@/app/components/ui/Input';
import Textarea from '@/app/components/ui/Textarea';
import Button from '@/app/components/ui/Button';
import Select from '@/app/components/ui/Select';

const MapEditor = dynamic(() => import('@/app/components/MapEditor').then(mod => mod.default), { ssr: false });

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
      <BackButton label="Back to Rides" href="/carpools" />
      <PageSection
        title="Create Ride"
        description="Offer a ride by specifying route, time, seats and optional notes."
        actions={<Button variant="neutral" href="/carpools">Cancel</Button>}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FormField label="Title" description="Optional short name for your ride" htmlFor="ride-title">
            <Input id="ride-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Morning Campus Shuttle" />
          </FormField>

          <FormField label="Origin Address *" description="Where passengers will be picked up" htmlFor="origin-address" required>
            <Input id="origin-address" value={originAddress} onChange={e => setOriginAddress(e.target.value)} placeholder="123 Main St" required />
          </FormField>

            <FormField label="Destination Address *" description="Where the ride ends" htmlFor="dest-address" required>
            <Input id="dest-address" value={destAddress} onChange={e => setDestAddress(e.target.value)} placeholder="University Campus" required />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <FormField label="Date & Time *" htmlFor="date-time" required>
              <Input id="date-time" type="datetime-local" value={dateTime} onChange={e => setDateTime(e.target.value)} required />
            </FormField>
            <FormField label="Seats" htmlFor="seats-total" description="Total seats available" required>
              <Input id="seats-total" type="number" min={1} value={seatsTotal} onChange={e => setSeatsTotal(Number(e.target.value))} />
            </FormField>
            <FormField label="Price per passenger" htmlFor="price" description="Set 0 for free ride">
              <Input id="price" type="number" min={0} value={price} onChange={e => setPrice(Number(e.target.value))} />
            </FormField>
          </div>

          <FormField label="Notes" htmlFor="notes" description="Anything riders should know (luggage space, music, etc.)">
            <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="I can take small luggage." />
          </FormField>

          <FormField label="Route" description="Click on the map to add waypoints from origin to destination">
            <MapEditor initialCoords={[]} onChange={(c) => setCoords(c)} height={360} />
          </FormField>

          {error && <div style={{ color: 'red', fontSize: '.9rem' }}>{error}</div>}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Button type="submit" variant="success" disabled={loading}>{loading ? 'Creating...' : 'Create Ride'}</Button>
            <Button type="button" variant="outline" onClick={() => router.push('/carpools')}>Cancel</Button>
          </div>
        </form>
      </PageSection>
    </div>
  );
}