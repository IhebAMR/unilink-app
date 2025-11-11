"use client";
import React, { useState } from 'react';

export default function CreateEventPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, dateTime, location })
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed');
        return;
      }
      const ev = await res.json();
      window.location.href = '/apply/events';
    } catch (err) {
      setError('Failed to create event');
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Create Event</h1>
      <form onSubmit={handleSubmit} className="max-w-lg">
        <label className="block mb-2">Title</label>
        <input className="border p-2 w-full" value={title} onChange={e => setTitle(e.target.value)} required />

        <label className="block mt-2 mb-2">Description</label>
        <textarea className="border p-2 w-full" value={description} onChange={e => setDescription(e.target.value)} />

        <label className="block mt-2 mb-2">Date & Time</label>
        <input type="datetime-local" className="border p-2 w-full" value={dateTime} onChange={e => setDateTime(e.target.value)} required />

        <label className="block mt-2 mb-2">Location</label>
        <input className="border p-2 w-full" value={location} onChange={e => setLocation(e.target.value)} />

        {error && <p className="text-red-600">{error}</p>}
        <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded" type="submit">Create</button>
      </form>
    </div>
  );
}
