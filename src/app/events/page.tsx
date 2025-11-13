'use client';
import React, { useState, useEffect } from 'react';
import PageSection from '@/app/components/ui/PageSection';
import EventCard, { Event } from '@/app/components/EventCard';
import EventDetailModal from '@/app/components/EventDetailModal';
import Modal from '@/app/components/ui/Modal';
import Button from '@/app/components/ui/Button';
import Input from '@/app/components/ui/Input';
import Textarea from '@/app/components/ui/Textarea';
import FormField from '@/app/components/ui/FormField';
import { useOnlineStatus } from '@/app/lib/useOnlineStatus';
import { validateText } from '@/app/lib/profanityFilter';

// Avoid static prerender to prevent Suspense requirement for useSearchParams during build
export const dynamic = 'force-dynamic';

type EventTab = 'all' | 'my-events' | 'going' | 'not-going' | 'past';

export default function EventsPage() {
  const networkOnline = useOnlineStatus();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<EventTab>('all');

  // Check for eventId in URL params (from notification click)
  useEffect(() => {
    try {
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const eventIdParam = params ? params.get('eventId') : null;
      if (eventIdParam) {
        setSelectedEventId(eventIdParam);
      }
    } catch (e) {
      // ignore
    }
  }, []);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: '',
    time: '',
    duration: '',
    location: '',
    image: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState<string>('');
  const [showDescription, setShowDescription] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    // Update image preview
    if (field === 'image') {
      setImagePreview(value);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Event name is required';
    } else {
      // Check for profanity in event name
      const nameValidation = validateText(formData.name);
      if (nameValidation) {
        newErrors.name = nameValidation;
      }
    }

    // Check for profanity in description if provided
    if (formData.description.trim()) {
      const descValidation = validateText(formData.description);
      if (descValidation) {
        newErrors.description = descValidation;
      }
    }

    // Check for profanity in location if provided
    if (formData.location.trim()) {
      const locationValidation = validateText(formData.location);
      if (locationValidation) {
        newErrors.location = locationValidation;
      }
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    } else {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.date = 'Date cannot be in the past';
      }
    }

    if (!formData.time) {
      newErrors.time = 'Time is required';
    }

    if (!formData.duration.trim()) {
      newErrors.duration = 'Duration is required';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    // Validate image URL if provided
    if (formData.image && !isValidUrl(formData.image)) {
      newErrors.image = 'Please enter a valid image URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      // Format time from HH:MM to readable format for display
      const timeParts = formData.time.split(':');
      const hours = parseInt(timeParts[0]);
      const minutes = timeParts[1];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const displayTime = `${displayHours}:${minutes} ${ampm}`;

      const body = {
        name: formData.name,
        description: formData.description,
        date: formData.date,
        time: displayTime,
        duration: formData.duration,
        location: formData.location,
        image: formData.image || '',
      };

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        // Show specific message for profanity detection
        if (errorData.profanityDetected) {
          alert(`⚠️ ${errorData.message || errorData.error}\n\nPlease use appropriate language when creating events.`);
          setLoading(false);
          return;
        }
        throw new Error(errorData.error || 'Failed to create event');
      }

      const newEvent = await res.json();

      // Transform API response to match EventCard format
      const formattedDate = new Date(newEvent.date).toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });

      const transformedEvent: Event = {
        _id: newEvent._id,
        id: newEvent._id,
        name: newEvent.name,
        title: newEvent.name,
        date: formattedDate,
        time: newEvent.time,
        location: newEvent.location,
        attending: 0,
        image: newEvent.image || '',
      };

      // Add to events list
      setEvents((prev) => [transformedEvent, ...prev]);

      // Reset form
      setFormData({
        name: '',
        description: '',
        date: '',
        time: '',
        duration: '',
        location: '',
        image: '',
      });
      setImagePreview('');
      setErrors({});
      setShowDescription(false);
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Failed to create event', err);
      setErrors({ submit: err.message || 'Failed to create event' });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setErrors({});
    setShowDescription(false);
  };

  // Calculate end time based on duration
  const getEventEndTime = () => {
    if (!formData.date || !formData.time || !formData.duration) return null;
    
    try {
      const startDateTime = new Date(`${formData.date}T${formData.time}`);
      const durationMatch = formData.duration.match(/(\d+(?:\.\d+)?)\s*(?:hours?|h|hrs?)/i);
      if (durationMatch) {
        const hours = parseFloat(durationMatch[1]);
        const endDateTime = new Date(startDateTime.getTime() + hours * 60 * 60 * 1000);
        return endDateTime;
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  const endTime = getEventEndTime();
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const parseDuration = (duration: string): number => {
    if (!duration) return 0;
    const match = duration.match(/(\d+(?:\.\d+)?)\s*(?:hours?|h|hrs?)/i);
    if (match) {
      return parseFloat(match[1]);
    }
    // Try to parse as just a number
    const numMatch = duration.match(/(\d+(?:\.\d+)?)/);
    if (numMatch) {
      return parseFloat(numMatch[1]);
    }
    return 0;
  };

  const formatDuration = (hours: number): string => {
    if (hours === 0) return '';
    if (hours === 1) return '1 hour';
    if (hours % 1 === 0) return `${hours} hours`;
    return `${hours} hours`;
  };

  const handleDurationIncrement = () => {
    const currentHours = parseDuration(formData.duration);
    const newHours = currentHours + 0.5;
    handleInputChange('duration', formatDuration(newHours));
  };

  const handleDurationDecrement = () => {
    const currentHours = parseDuration(formData.duration);
    if (currentHours > 0) {
      const newHours = Math.max(0, currentHours - 0.5);
      handleInputChange('duration', formatDuration(newHours));
    }
  };

  const handleGenerateDescription = async () => {
    if (!formData.name.trim()) {
      setErrors((prev) => ({ ...prev, name: 'Please enter event name first' }));
      return;
    }

    // Use the text in the description box as keywords
    const keywords = formData.description.trim() || formData.name;
    
    if (!keywords.trim()) {
      alert('Please enter some keywords in the description field first, or enter an event name.');
      return;
    }

    try {
      setGeneratingDescription(true);
      
      const res = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords }),
      });

      if (res.ok) {
        const data = await res.json();
        setFormData((prev) => ({ ...prev, description: data.description }));
        // Clear any description errors
        if (errors.description) {
          setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors.description;
            return newErrors;
          });
        }
      } else {
        const errorData = await res.json();
        // Show specific message for profanity detection
        if (errorData.profanityDetected) {
          alert(`⚠️ ${errorData.message || errorData.error}\n\nPlease use appropriate language when creating events.`);
        } else {
          alert(errorData.error || 'Failed to generate description');
        }
      }
    } catch (err) {
      console.error('Failed to generate description', err);
      alert('Failed to generate description. Please try again.');
    } finally {
      setGeneratingDescription(false);
    }
  };

  // Fetch events from API
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/events', { credentials: 'include' });
      
      if (!res.ok) {
        throw new Error('Failed to fetch events');
      }
      
      const json = await res.json();
      
      setCurrentUserId(json.currentUserId || undefined);
      // Transform API data to match EventCard format
      const transformedEvents = (json.events || []).map((event: any) => {
        // Format date for display
        const eventDate = new Date(event.date);
        const formattedDate = eventDate.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        });
        
            // Get ownerId - could be ObjectId or populated object
            const ownerId = event.ownerId 
              ? (typeof event.ownerId === 'string' 
                  ? event.ownerId
                  : (event.ownerId as any)._id?.toString() || (event.ownerId as any).toString())
              : null;

            return {
              _id: event._id,
              id: event._id,
              name: event.name,
              title: event.name, // For backward compatibility
              date: formattedDate, // Display date
              originalDate: event.date, // Store original date for filtering
              time: event.time,
              location: event.location,
              attending: Array.isArray(event.attending) ? event.attending.length : (event.attending || 0),
              attendingArray: Array.isArray(event.attending) ? event.attending.map((id: any) => id.toString()) : [],
              notGoingArray: Array.isArray(event.notGoing) ? event.notGoing.map((id: any) => id.toString()) : [],
              image: event.image || '',
              currentUserId: json.currentUserId || undefined,
              status: event.status || 'upcoming',
              cancellationReason: event.cancellationReason || undefined,
              ownerId: ownerId, // Store ownerId for filtering
            };
      });
      setEvents(transformedEvents);
    } catch (err) {
      console.error('Failed to fetch events', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [networkOnline]);

  // Filter events based on active tab
  const getFilteredEvents = (): Event[] => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    switch (activeTab) {
      case 'my-events':
        return events.filter((event) => {
          return event.ownerId === currentUserId;
        });
      
      case 'going':
        return events.filter((event) => {
          if (!currentUserId) return false;
          return event.attendingArray?.includes(currentUserId) || false;
        });
      
      case 'not-going':
        return events.filter((event) => {
          if (!currentUserId) return false;
          return event.notGoingArray?.includes(currentUserId) || false;
        });
      
      case 'past':
        return events.filter((event) => {
          // Use originalDate if available, otherwise try to parse the formatted date
          const eventDate = event.originalDate
            ? (typeof event.originalDate === 'string' ? new Date(event.originalDate) : event.originalDate)
            : (typeof event.date === 'string' ? new Date(event.date) : event.date instanceof Date ? event.date : new Date());
          eventDate.setHours(0, 0, 0, 0);
          return eventDate < now;
        });
      
      case 'all':
      default:
        return events;
    }
  };

  const filteredEvents = getFilteredEvents();

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 16, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <PageSection
        title="📅 Events"
        description="Discover and join events"
        actions={<Button onClick={() => setIsModalOpen(true)} variant="success">+ Create Event</Button>}
        style={{ marginBottom: 24 }}
      >
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e0e0e0', marginBottom: 24, flexWrap: 'wrap' }}>
          <Button
            variant={activeTab === 'all' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('all')}
            style={{ borderRadius: '8px 8px 0 0' }}
          >
            All ({events.length})
          </Button>
          {currentUserId && (
            <>
              <Button
                variant={activeTab === 'my-events' ? 'primary' : 'ghost'}
                onClick={() => setActiveTab('my-events')}
                style={{ borderRadius: '8px 8px 0 0' }}
              >
                My Events ({events.filter((e) => e.ownerId === currentUserId).length})
              </Button>
              <Button
                variant={activeTab === 'going' ? 'primary' : 'ghost'}
                onClick={() => setActiveTab('going')}
                style={{ borderRadius: '8px 8px 0 0' }}
              >
                Going ({events.filter((e) => e.attendingArray?.includes(currentUserId) || false).length})
              </Button>
              <Button
                variant={activeTab === 'not-going' ? 'primary' : 'ghost'}
                onClick={() => setActiveTab('not-going')}
                style={{ borderRadius: '8px 8px 0 0' }}
              >
                Not Going ({events.filter((e) => e.notGoingArray?.includes(currentUserId) || false).length})
              </Button>
            </>
          )}
          <Button
            variant={activeTab === 'past' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('past')}
            style={{ borderRadius: '8px 8px 0 0' }}
          >
            Past Events ({events.filter((e) => {
              const now = new Date();
              now.setHours(0, 0, 0, 0);
              const eventDate = e.originalDate
                ? (typeof e.originalDate === 'string' ? new Date(e.originalDate) : e.originalDate)
                : (typeof e.date === 'string' ? new Date(e.date) : e.date instanceof Date ? e.date : new Date());
              eventDate.setHours(0, 0, 0, 0);
              return eventDate < now;
            }).length})
          </Button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, fontSize: '1.2rem', color: '#666' }}>
            Loading events...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>📅</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>
              {activeTab === 'all' && 'No events yet'}
              {activeTab === 'my-events' && 'You haven\'t created any events yet'}
              {activeTab === 'going' && 'You\'re not attending any events yet'}
              {activeTab === 'not-going' && 'You haven\'t marked any events as not going'}
              {activeTab === 'past' && 'No past events found'}
            </h3>
            <p style={{ margin: 0, color: '#666' }}>
              {activeTab === 'all' && 'Be the first to create an event!'}
              {activeTab === 'my-events' && 'Create your first event to get started!'}
              {activeTab === 'going' && 'Browse events and mark yourself as going!'}
              {activeTab === 'not-going' && 'Browse events and mark yourself as not going if needed.'}
              {activeTab === 'past' && 'Past events will appear here once they\'re over.'}
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 20,
              justifyContent: 'flex-start',
            }}
          >
            {filteredEvents.map((event) => (
              <div
                key={event.id || event._id}
                style={{
                  flex: '1 1 300px',
                  minWidth: '280px',
                  maxWidth: '100%',
                }}
              >
                <EventCard 
                event={event} 
                onAttendanceUpdate={(eventId, attendingCount, attendingArray, notGoingArray) => {
                  // Update the event in the list with new attendance arrays
                  setEvents((prev) =>
                    prev.map((e) =>
                      (e.id === eventId || e._id === eventId)
                        ? { ...e, attending: attendingCount, attendingArray: attendingArray || [], notGoingArray: notGoingArray || [] }
                        : e
                    )
                  );
                }}
                onCardClick={(eventId) => {
                  setSelectedEventId(eventId);
                }}
              />
              </div>
            ))}
          </div>
        )}
      </PageSection>

      {/* Create Event Modal */}
      <Modal
        open={isModalOpen}
        onClose={handleCloseModal}
        title="Create Event"
        width={600}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <Button 
              variant="outline" 
              onClick={handleCloseModal}
              style={{ 
                backgroundColor: '#f5f5f5', 
                color: '#333',
                borderColor: '#d0d7de'
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleSubmit}
              style={{ backgroundColor: '#1e90ff' }}
            >
              Create Event
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} style={{ paddingTop: 8 }}>
          {errors.submit && (
            <div style={{ 
              marginBottom: 16, 
              padding: '12px 16px', 
              backgroundColor: '#ffebee', 
              border: '1px solid #f44336', 
              borderRadius: 8,
              color: '#c62828',
              fontSize: '0.9rem'
            }}>
              {errors.submit}
            </div>
          )}
          {/* Event Name with Add Description Button */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label htmlFor="event-name" style={{ display: 'block', fontWeight: 600, fontSize: '0.95rem', color: '#333' }}>
                Event name <span style={{ color: '#f44336' }}>*</span>
              </label>
              {!showDescription && (
                <button
                  type="button"
                  onClick={() => {
                    setShowDescription(true);
                    setTimeout(() => {
                      const descField = document.getElementById('description');
                      if (descField) descField.focus();
                    }, 0);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1e90ff',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    padding: 0,
                  }}
                >
                  Add description
                </button>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <Input
                id="event-name"
                type="text"
                placeholder="Enter event name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                style={{
                  borderColor: errors.name ? '#f44336' : '#d0d7de',
                }}
              />
            </div>
            {errors.name && (
              <div style={{ color: '#f44336', fontSize: '0.85rem', marginTop: 6 }}>
                {errors.name}
              </div>
            )}
          </div>

          {/* Description (shown when added) */}
          {showDescription && (
            <FormField label="Description" htmlFor="description" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Textarea
                  id="description"
                  placeholder="Enter event description (optional)"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  style={{ flex: 1 }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateDescription}
                  disabled={generatingDescription || !formData.name.trim()}
                  style={{
                    minWidth: 'auto',
                    padding: '8px 12px',
                    whiteSpace: 'nowrap',
                    height: 'fit-content',
                  }}
                  title={!formData.name.trim() ? 'Enter event name first' : 'Generate description from keywords in the description box'}
                >
                  {generatingDescription ? (
                    <span>✨ Generating...</span>
                  ) : (
                    <span>✨ AI Generate</span>
                  )}
                </Button>
              </div>
            </FormField>
          )}

          {/* Date and Time */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
            <FormField label="Date" htmlFor="date" required style={{ flex: 1, marginBottom: 0 }}>
              <div style={{ position: 'relative' }}>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={{
                    borderColor: errors.date ? '#f44336' : '#d0d7de',
                    paddingRight: '40px',
                  }}
                />
                <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
              </div>
              {errors.date && (
                <div style={{ color: '#f44336', fontSize: '0.85rem', marginTop: 6 }}>
                  {errors.date}
                </div>
              )}
            </FormField>

            <FormField label="Time" htmlFor="time" required style={{ flex: 1, marginBottom: 0 }}>
              <div style={{ position: 'relative' }}>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleInputChange('time', e.target.value)}
                  style={{
                    borderColor: errors.time ? '#f44336' : '#d0d7de',
                    paddingRight: '40px',
                  }}
                />
                <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
              </div>
              {errors.time && (
                <div style={{ color: '#f44336', fontSize: '0.85rem', marginTop: 6 }}>
                  {errors.time}
                </div>
              )}
            </FormField>
          </div>

          {/* Duration with spinner icons */}
          <FormField label="Duration" htmlFor="duration" required style={{ marginBottom: 20 }}>
            <div style={{ position: 'relative' }}>
              <Input
                id="duration"
                type="text"
                placeholder="e.g., 2 hours, 3.5 hours"
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', e.target.value)}
                style={{
                  borderColor: errors.duration ? '#f44336' : '#d0d7de',
                  paddingRight: '40px',
                }}
              />
              <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button
                  type="button"
                  onClick={handleDurationIncrement}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 4,
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f0f0f0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  title="Increase duration"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={handleDurationDecrement}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 4,
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f0f0f0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  title="Decrease duration"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </div>
            </div>
            {errors.duration && (
              <div style={{ color: '#f44336', fontSize: '0.85rem', marginTop: 6 }}>
                {errors.duration}
              </div>
            )}
          </FormField>

          {/* Event Duration Description */}
          {formData.date && formData.time && formData.duration && endTime && (
            <div style={{ 
              marginBottom: 20, 
              padding: '12px 16px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: 8,
              fontSize: '0.9rem',
              color: '#666',
              lineHeight: 1.5,
            }}>
              This event will take place on {formatDate(new Date(formData.date + 'T00:00:00'))} from {formatTime(new Date(`${formData.date}T${formData.time}`))} until {formatTime(endTime)}.
            </div>
          )}

          {/* Location */}
          <FormField label="Location" htmlFor="location" required style={{ marginBottom: 20 }}>
            <Input
              id="location"
              type="text"
              placeholder="Enter event location"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              style={{
                borderColor: errors.location ? '#f44336' : '#d0d7de',
              }}
            />
            {errors.location && (
              <div style={{ color: '#f44336', fontSize: '0.85rem', marginTop: 6 }}>
                {errors.location}
              </div>
            )}
          </FormField>

          {/* Event Image URL */}
          <FormField label="Event Image URL" htmlFor="image" style={{ marginBottom: 0 }}>
            <Input
              id="image"
              type="url"
              placeholder="Enter image URL (optional)"
              value={formData.image}
              onChange={(e) => handleInputChange('image', e.target.value)}
              style={{
                borderColor: errors.image ? '#f44336' : '#d0d7de',
              }}
            />
            {errors.image && (
              <div style={{ color: '#f44336', fontSize: '0.85rem', marginTop: 6 }}>
                {errors.image}
              </div>
            )}
            {imagePreview && (
              <div style={{ marginTop: 12 }}>
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{
                    width: '100%',
                    maxHeight: '200px',
                    objectFit: 'cover',
                    borderRadius: 8,
                    border: '1px solid #e0e0e0',
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            {!formData.image && (
              <div style={{ marginTop: 12, padding: 16, backgroundColor: '#f8f9fa', borderRadius: 8, textAlign: 'center', color: '#666' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📷</div>
                <div style={{ fontSize: '0.9rem' }}>A placeholder image will be used if no image URL is provided</div>
              </div>
            )}
          </FormField>
        </form>
      </Modal>

      {/* Event Detail Modal */}
      <EventDetailModal
        eventId={selectedEventId}
        isOpen={selectedEventId !== null}
        onClose={() => setSelectedEventId(null)}
        currentUserId={currentUserId}
        onEventUpdated={() => {
          // Refresh events list
          fetchEvents();
        }}
      />
    </div>
  );
}

