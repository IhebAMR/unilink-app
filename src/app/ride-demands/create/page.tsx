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

const MapEditor = dynamic(() => import('@/app/components/MapEditor').then(mod => mod.default), { ssr: false });

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
      <BackButton label="Back to Requests" href="/ride-demands" />

      <PageSection
        title="Request a Ride"
        description="Looking for a ride? Fill out this form and drivers will see your request."
        actions={<Button variant="neutral" href="/ride-demands">Cancel</Button>}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FormField label="Title (Optional)" htmlFor="rd-title">
            <Input id="rd-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Daily commute to campus" />
          </FormField>

          <FormField label="From (Origin) *" htmlFor="rd-origin" required description="Starting point address">
            <Input id="rd-origin" value={originAddress} onChange={(e) => setOriginAddress(e.target.value)} required />
          </FormField>

          <FormField label="To (Destination) *" htmlFor="rd-dest" required description="Destination address">
            <Input id="rd-dest" value={destAddress} onChange={(e) => setDestAddress(e.target.value)} required />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <FormField label="Date & Time *" htmlFor="rd-datetime" required>
              <Input id="rd-datetime" type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} required />
            </FormField>
            <FormField label="Seats Needed" htmlFor="rd-seats" description="How many seats you need">
              <Input id="rd-seats" type="number" value={seatsNeeded} onChange={(e) => setSeatsNeeded(Number(e.target.value))} min={1} max={8} />
            </FormField>
            <FormField label="Maximum Price (Optional)" htmlFor="rd-maxprice">
              <Input id="rd-maxprice" type="number" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} min={0} step={0.01} placeholder="0.00" />
            </FormField>
          </div>

          <FormField label="Additional Notes" htmlFor="rd-notes">
            <Textarea id="rd-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special requirements or details..." rows={4} />
          </FormField>

          <FormField label="Location (Optional)" description="Click on the map to set origin and destination points">
            <MapEditor
              onChange={(coords: [number, number][]) => {
                if (coords.length >= 2) {
                  setOriginCoords(coords[0]);
                  setDestCoords(coords.at(-1) || null);
                }
              }}
            />
          </FormField>

          <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Ride Request'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push('/ride-demands')}>Cancel</Button>
          </div>
        </form>
      </PageSection>
    </div>
  );
}
