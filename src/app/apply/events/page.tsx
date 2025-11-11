import React, { useEffect, useState } from 'react';
import EventModal from './EventModal';

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then(data => {
        setEvents(data.events || []);
        setCurrentUserId(data.currentUserId || null);
      })
      .catch(console.error);
  }, []);

  const handleOpenModal = (ev: any) => {
    setSelectedEvent(ev);
  };

  const handleCloseModal = () => {
    setSelectedEvent(null);
  };

  const handleRespond = async (status: string) => {
    if (!selectedEvent) return;
    await fetch(`/api/events/${selectedEvent._id}/response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    // Refresh events list and modal data
    const res = await fetch('/api/events');
    const data = await res.json();
    setEvents(data.events || []);
    const updated = data.events.find((ev: any) => ev._id === selectedEvent._id);
    setSelectedEvent(updated);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Events</h1>
      {events.length === 0 && <p>No events found.</p>}
      <ul>
        {events.map(ev => (
          <li key={ev._id} className="border p-3 mb-3 rounded cursor-pointer" onClick={() => handleOpenModal(ev)}>
            <h2 className="text-lg font-semibold">{ev.title} {ev.status === 'canceled' && <span className="text-red-600">(Canceled)</span>}</h2>
            <p>{ev.description}</p>
            <p className="text-sm text-gray-600">{new Date(ev.dateTime).toLocaleString()}</p>
            <p className="text-sm">Location: {ev.location}</p>
            <p className="text-sm">Creator: {ev.createdBy?.name || 'Unknown'}</p>
            <div className="mt-2 text-sm">
              <span className="mr-2">Going: <b>{ev.goingCount}</b></span>
              <span className="mr-2">Not going: <b>{ev.notGoingCount}</b></span>
              <span>Not interested: <b>{ev.notInterestedCount}</b></span>
            </div>
          </li>
        ))}
      </ul>
      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={handleCloseModal}
          onRespond={handleRespond}
        />
      )}
    </div>
  );
}
