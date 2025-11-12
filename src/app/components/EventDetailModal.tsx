'use client';
import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import Textarea from './ui/Textarea';
import FormField from './ui/FormField';
import { validateText } from '@/app/lib/profanityFilter';

interface User {
  _id: string;
  name: string;
  avatarUrl?: string;
}

interface Reaction {
  emoji: string;
  count: number;
}

interface Reply {
  _id: string;
  userId: User;
  content: string;
  reactions: Record<string, number>;
  userReactions?: string[];
  createdAt: string;
}

interface Comment {
  _id: string;
  userId: User;
  content: string;
  reactions: Record<string, number>;
  userReactions?: string[];
  replies: Reply[];
  createdAt: string;
}

interface Event {
  _id: string;
  name: string;
  description?: string;
  date: string;
  time: string;
  duration: string;
  location: string;
  image?: string;
  attending: number;
  ownerId?: User | string;
  status?: string;
  cancellationReason?: string;
}

interface EventDetailModalProps {
  eventId: string | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  onEventUpdated?: () => void; // Callback to refresh events list
}

export default function EventDetailModal({ eventId, isOpen, onClose, currentUserId, onEventUpdated }: EventDetailModalProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    date: '',
    time: '',
    duration: '',
    location: '',
    image: '',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [generatingEditDescription, setGeneratingEditDescription] = useState(false);

  useEffect(() => {
    if (isOpen && eventId) {
      fetchEventDetails();
      fetchComments();
      setIsEditing(false);
      setShowCancelModal(false);
      setCancellationReason('');
    }
  }, [isOpen, eventId]);

  useEffect(() => {
    if (event && !isEditing) {
      // Initialize edit form when event is loaded
      const eventDate = typeof event.date === 'string' 
        ? new Date(event.date).toISOString().split('T')[0]
        : (event.date as any) instanceof Date
        ? (event.date as Date).toISOString().split('T')[0]
        : '';
      
      setEditFormData({
        name: event.name || '',
        description: event.description || '',
        date: eventDate,
        time: event.time || '',
        duration: event.duration || '',
        location: event.location || '',
        image: event.image || '',
      });
    }
  }, [event, isEditing]);

  const fetchEventDetails = async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/events/${eventId}`, { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setEvent(json.event);
      }
    } catch (err) {
      console.error('Failed to fetch event details', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    if (!eventId) return;
    try {
      const res = await fetch(`/api/events/${eventId}/comments`, { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setComments(json.comments || []);
      }
    } catch (err) {
      console.error('Failed to fetch comments', err);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId || !newComment.trim() || commentLoading) return;

    try {
      setCommentLoading(true);
      const res = await fetch(`/api/events/${eventId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (res.ok) {
        setNewComment('');
        await fetchComments();
      }
    } catch (err) {
      console.error('Failed to post comment', err);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleSubmitReply = async (commentId: string) => {
    if (!eventId || !replyContent[commentId]?.trim() || commentLoading) return;

    try {
      setCommentLoading(true);
      const res = await fetch(`/api/events/${eventId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: replyContent[commentId].trim(),
          parentCommentId: commentId,
        }),
      });

      if (res.ok) {
        setReplyContent((prev) => ({ ...prev, [commentId]: '' }));
        setReplyingTo(null);
        await fetchComments();
      }
    } catch (err) {
      console.error('Failed to post reply', err);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleReaction = async (commentId: string, emoji: string, replyId?: string) => {
    if (!eventId || !currentUserId) return;

    try {
      const res = await fetch(`/api/events/${eventId}/comments/${commentId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ emoji, replyId }),
      });

      if (res.ok) {
        await fetchComments();
      }
    } catch (err) {
      console.error('Failed to update reaction', err);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const getAvatarUrl = (user: User) => {
    if (user.avatarUrl) return user.avatarUrl;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=1e90ff&color=fff&size=40`;
  };

  const isOwner = event && currentUserId && (
    (typeof event.ownerId === 'string' && event.ownerId === currentUserId) ||
    (typeof event.ownerId === 'object' && event.ownerId._id === currentUserId)
  );

  const handleUpdateEvent = async () => {
    if (!eventId || !event) return;

    // Validate for profanity before submitting
    const nameValidation = validateText(editFormData.name);
    if (nameValidation) {
      alert(`⚠️ ${nameValidation}\n\nPlease use appropriate language when creating events.`);
      return;
    }

    if (editFormData.description && editFormData.description.trim()) {
      const descValidation = validateText(editFormData.description);
      if (descValidation) {
        alert(`⚠️ ${descValidation}\n\nPlease use appropriate language when creating events.`);
        return;
      }
    }

    if (editFormData.location && editFormData.location.trim()) {
      const locationValidation = validateText(editFormData.location);
      if (locationValidation) {
        alert(`⚠️ ${locationValidation}\n\nPlease use appropriate language when creating events.`);
        return;
      }
    }

    try {
      setEditLoading(true);
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editFormData),
      });

      if (res.ok) {
        await fetchEventDetails();
        setIsEditing(false);
        // Refresh events list
        if (onEventUpdated) {
          onEventUpdated();
        }
      } else {
        const errorData = await res.json();
        // Show specific message for profanity detection
        if (errorData.profanityDetected) {
          alert(`⚠️ ${errorData.message || errorData.error}\n\nPlease use appropriate language when creating events.`);
        } else {
          alert(errorData.error || 'Failed to update event');
        }
      }
    } catch (err) {
      console.error('Failed to update event', err);
      alert('Failed to update event');
    } finally {
      setEditLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!eventId || !inviteEmails.trim() || inviteLoading) return;

    try {
      setInviteLoading(true);
      setInviteError(null);
      setInviteSuccess(null);

      // Parse emails (comma or newline separated)
      const emails = inviteEmails
        .split(/[,\n]/)
        .map((email) => email.trim())
        .filter((email) => email.length > 0);

      if (emails.length === 0) {
        setInviteError('Please enter at least one email address');
        return;
      }

      const res = await fetch(`/api/events/${eventId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ emails }),
      });

      if (res.ok) {
        const json = await res.json();
        setInviteEmails('');
        if (json.notFoundEmails && json.notFoundEmails.length > 0) {
          setInviteSuccess(`${json.invited} invitation(s) sent. ${json.notFoundEmails.length} email(s) not found: ${json.notFoundEmails.join(', ')}`);
        } else {
          setInviteSuccess(`${json.invited} invitation(s) sent successfully!`);
        }
        setTimeout(() => {
          setInviteSuccess(null);
          setShowInviteModal(false);
        }, 3000);
      } else {
        const errorData = await res.json();
        setInviteError(errorData.error || 'Failed to send invitations');
      }
    } catch (err) {
      console.error('Failed to send invitations', err);
      setInviteError('Failed to send invitations');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleGenerateEditDescription = async () => {
    if (!editFormData.name.trim()) {
      return;
    }

    // Use the text in the description box as keywords
    const keywords = editFormData.description.trim() || editFormData.name;
    
    if (!keywords.trim()) {
      alert('Please enter some keywords in the description field first, or enter an event name.');
      return;
    }

    try {
      setGeneratingEditDescription(true);
      
      const res = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords }),
      });

      if (res.ok) {
        const data = await res.json();
        setEditFormData((prev) => ({ ...prev, description: data.description }));
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
      setGeneratingEditDescription(false);
    }
  };

  const handleCancelEvent = async () => {
    if (!eventId || !cancellationReason.trim()) return;

    try {
      setCancelLoading(true);
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cancellationReason: cancellationReason.trim() }),
      });

      if (res.ok) {
        const json = await res.json();
        // Update event immediately with the response data
        if (json.event) {
          setEvent(json.event);
        }
        setShowCancelModal(false);
        setCancellationReason('');
        // Also refetch to ensure we have the latest data
        await fetchEventDetails();
        // Refresh events list
        if (onEventUpdated) {
          onEventUpdated();
        }
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to cancel event');
      }
    } catch (err) {
      console.error('Failed to cancel event', err);
      alert('Failed to cancel event');
    } finally {
      setCancelLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={event?.name || 'Event Details'}
      width={800}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>Loading...</div>
      ) : event ? (
        <div style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          {/* Event Banner Image */}
          <div
            style={{
              width: '100%',
              height: '200px',
              marginBottom: 20,
              borderRadius: 8,
              overflow: 'hidden',
              backgroundColor: '#e0e0e0',
            }}
          >
            <img
              src={event.image || `https://picsum.photos/800/200?random=${event._id}`}
              alt={event.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              onError={(e) => {
                e.currentTarget.src = `https://picsum.photos/800/200?random=${event._id}`;
              }}
            />
          </div>

          {/* Owner Actions */}
          {isOwner && event.status !== 'cancelled' && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <Button
                variant="outline"
                onClick={() => setShowInviteModal(true)}
                style={{
                  backgroundColor: '#fff',
                  color: '#1e90ff',
                  borderColor: '#1e90ff',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, verticalAlign: 'middle' }}>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
                Invite People
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditing(!isEditing)}
                style={{
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  borderColor: '#d0d7de',
                }}
              >
                {isEditing ? 'Cancel Edit' : 'Update Event'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCancelModal(true)}
                style={{
                  backgroundColor: '#fff',
                  color: '#f44336',
                  borderColor: '#f44336',
                }}
              >
                Cancel Event
              </Button>
            </div>
          )}

          {/* Cancelled Status */}
          {event.status === 'cancelled' && (
            <div style={{
              marginBottom: 20,
              padding: 16,
              backgroundColor: '#ffebee',
              border: '1px solid #f44336',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f44336" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#c62828', marginBottom: 8, fontSize: '1rem' }}>Event Cancelled</div>
                {event.cancellationReason ? (
                  <div style={{ 
                    color: '#333', 
                    fontSize: '0.95rem', 
                    lineHeight: 1.5,
                    padding: '12px',
                    backgroundColor: 'rgba(255,255,255,0.6)',
                    borderRadius: 6,
                    border: '1px solid rgba(244, 67, 54, 0.2)',
                  }}>
                    <div style={{ fontWeight: 500, marginBottom: 4, color: '#666', fontSize: '0.85rem' }}>Cancellation Reason:</div>
                    <div>{event.cancellationReason}</div>
                  </div>
                ) : (
                  <div style={{ color: '#999', fontSize: '0.9rem', fontStyle: 'italic' }}>No cancellation reason provided.</div>
                )}
              </div>
            </div>
          )}

          {/* Event Creator */}
          {event.ownerId && (
            <div style={{ 
              marginBottom: 20, 
              padding: 12, 
              backgroundColor: '#f8f9fa', 
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundImage: typeof event.ownerId === 'object' && event.ownerId.avatarUrl
                  ? `url(${event.ownerId.avatarUrl})`
                  : `url(https://ui-avatars.com/api/?name=${encodeURIComponent(typeof event.ownerId === 'object' ? event.ownerId.name : 'User')}&background=1e90ff&color=fff&size=40)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                flexShrink: 0,
              }} />
              <div>
                <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: 2 }}>Event created by</div>
                <div style={{ fontWeight: 600, color: '#333' }}>
                  {typeof event.ownerId === 'object' ? event.ownerId.name : 'Unknown User'}
                </div>
              </div>
            </div>
          )}

          {/* Event Details */}
          <div style={{ marginBottom: 24 }}>
            {isEditing && isOwner ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <FormField label="Event Name" htmlFor="edit-name" required>
                  <Input
                    id="edit-name"
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </FormField>
                <FormField label="Description" htmlFor="edit-description">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <Textarea
                      id="edit-description"
                      value={editFormData.description}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      style={{ flex: 1 }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGenerateEditDescription}
                      disabled={generatingEditDescription || !editFormData.name.trim()}
                      style={{
                        minWidth: 'auto',
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        height: 'fit-content',
                      }}
                      title={!editFormData.name.trim() ? 'Enter event name first' : 'Generate description from keywords in the description box'}
                    >
                      {generatingEditDescription ? (
                        <span>✨ Generating...</span>
                      ) : (
                        <span>✨ AI Generate</span>
                      )}
                    </Button>
                  </div>
                </FormField>
                <div style={{ display: 'flex', gap: 16 }}>
                  <FormField label="Date" htmlFor="edit-date" required style={{ flex: 1, marginBottom: 0 }}>
                    <Input
                      id="edit-date"
                      type="date"
                      value={editFormData.date}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, date: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </FormField>
                  <FormField label="Time" htmlFor="edit-time" required style={{ flex: 1, marginBottom: 0 }}>
                    <Input
                      id="edit-time"
                      type="time"
                      value={editFormData.time}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, time: e.target.value }))}
                    />
                  </FormField>
                </div>
                <FormField label="Duration" htmlFor="edit-duration" required>
                  <Input
                    id="edit-duration"
                    type="text"
                    value={editFormData.duration}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, duration: e.target.value }))}
                    placeholder="e.g., 2 hours, 3.5 hours"
                  />
                </FormField>
                <FormField label="Location" htmlFor="edit-location" required>
                  <Input
                    id="edit-location"
                    type="text"
                    value={editFormData.location}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, location: e.target.value }))}
                  />
                </FormField>
                <FormField label="Event Image URL" htmlFor="edit-image">
                  <Input
                    id="edit-image"
                    type="url"
                    value={editFormData.image}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, image: e.target.value }))}
                    placeholder="Enter image URL (optional)"
                  />
                </FormField>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    disabled={editLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleUpdateEvent}
                    disabled={editLoading}
                  >
                    {editLoading ? 'Updating...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span style={{ color: '#666' }}>
                {typeof event.date === 'string' 
                  ? new Date(event.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : (event.date as any) instanceof Date
                  ? (event.date as Date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : String(event.date)}{' '}
                at {event.time}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span style={{ color: '#666' }}>Duration: {event.duration}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span style={{ color: '#666' }}>{event.location}</span>
            </div>
            {event.description && (
              <div style={{ marginTop: 16, padding: 16, backgroundColor: '#f8f9fa', borderRadius: 8 }}>
                <p style={{ margin: 0, color: '#333', lineHeight: 1.6 }}>{event.description}</p>
              </div>
            )}
            <div style={{ marginTop: 12, color: '#666', fontSize: '0.9rem' }}>
              {event.attending > 0 ? (
                <span>{event.attending} attending</span>
              ) : (
                <span style={{ fontStyle: 'italic', color: '#999' }}>
                  No one is attending yet. Be the first to join!
                </span>
              )}
            </div>
              </>
            )}
          </div>

          {/* Comments Section */}
          <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: 20 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 600 }}>Comments</h3>

            {/* Comment Input */}
            {currentUserId && (
              <form onSubmit={handleSubmitComment} style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    rows={3}
                    style={{ flex: 1 }}
                  />
                  <Button type="submit" variant="primary" disabled={commentLoading || !newComment.trim()}>
                    {commentLoading ? 'Posting...' : 'Post'}
                  </Button>
                </div>
              </form>
            )}

            {/* Comments List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {comments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: '#666' }}>
                  No comments yet. Be the first to comment!
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment._id} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 16 }}>
                    {/* Main Comment */}
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          backgroundImage: `url(${getAvatarUrl(comment.userId)})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <span style={{ fontWeight: 600, color: '#333' }}>{comment.userId.name}</span>
                          <span style={{ color: '#999', fontSize: '0.85rem' }}>
                            {formatTime(comment.createdAt)}
                          </span>
                        </div>
                        <p style={{ margin: '0 0 8px 0', color: '#333', lineHeight: 1.5 }}>
                          {comment.content}
                        </p>

                        {/* Reactions */}
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                          {Object.entries(comment.reactions || {}).map(([emoji, count]) => {
                            const isUserReaction = comment.userReactions?.includes(emoji);
                            return (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(comment._id, emoji)}
                                style={{
                                  background: 'none',
                                  border: isUserReaction ? '1px solid #1e90ff' : '1px solid transparent',
                                  cursor: currentUserId ? 'pointer' : 'default',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '4px 8px',
                                  borderRadius: 16,
                                  backgroundColor: isUserReaction ? '#e3f2fd' : '#f0f0f0',
                                  fontSize: '0.9rem',
                                  transition: 'background-color 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                  if (currentUserId) {
                                    e.currentTarget.style.backgroundColor = '#e0e0e0';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = isUserReaction ? '#e3f2fd' : '#f0f0f0';
                                }}
                              >
                                <span>{emoji}</span>
                                <span>{count}</span>
                              </button>
                            );
                          })}
                          {currentUserId && (
                            <button
                              onClick={() => handleReaction(comment._id, '🔥')}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px 8px',
                                borderRadius: 16,
                                fontSize: '0.9rem',
                                color: '#666',
                              }}
                            >
                              😊+
                            </button>
                          )}
                        </div>

                        {/* Reply Button */}
                        {currentUserId && (
                          <button
                            onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
                            style={{
                              background: 'none',
                              border: '1px solid #e0e0e0',
                              borderRadius: 6,
                              padding: '6px 12px',
                              cursor: 'pointer',
                              fontSize: '0.9rem',
                              color: '#666',
                              marginBottom: 12,
                            }}
                          >
                            Reply
                          </button>
                        )}

                        {/* Reply Input */}
                        {replyingTo === comment._id && currentUserId && (
                          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                            <Input
                              value={replyContent[comment._id] || ''}
                              onChange={(e) =>
                                setReplyContent((prev) => ({ ...prev, [comment._id]: e.target.value }))
                              }
                              placeholder="Write a reply..."
                              style={{ flex: 1 }}
                            />
                            <Button
                              onClick={() => handleSubmitReply(comment._id)}
                              variant="primary"
                              disabled={commentLoading || !replyContent[comment._id]?.trim()}
                            >
                              {commentLoading ? '...' : 'Reply'}
                            </Button>
                          </div>
                        )}

                        {/* Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div style={{ marginTop: 16, paddingLeft: 16, borderLeft: '2px solid #e0e0e0' }}>
                            {comment.replies.map((reply) => (
                              <div key={reply._id} style={{ marginBottom: 16 }}>
                                <div style={{ display: 'flex', gap: 12 }}>
                                  <div
                                    style={{
                                      width: 32,
                                      height: 32,
                                      borderRadius: '50%',
                                      backgroundImage: `url(${getAvatarUrl(reply.userId)})`,
                                      backgroundSize: 'cover',
                                      backgroundPosition: 'center',
                                      flexShrink: 0,
                                    }}
                                  />
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                      <span style={{ fontWeight: 600, color: '#333', fontSize: '0.9rem' }}>
                                        {reply.userId.name}
                                      </span>
                                      <span style={{ color: '#999', fontSize: '0.8rem' }}>
                                        {formatTime(reply.createdAt)}
                                      </span>
                                    </div>
                                    <p style={{ margin: '0 0 8px 0', color: '#333', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                      {reply.content}
                                    </p>
                                    {/* Reply Reactions */}
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                      {Object.entries(reply.reactions || {}).map(([emoji, count]) => {
                                        const isUserReaction = reply.userReactions?.includes(emoji);
                                        return (
                                          <button
                                            key={emoji}
                                            onClick={() => handleReaction(comment._id, emoji, reply._id)}
                                            style={{
                                              background: 'none',
                                              border: isUserReaction ? '1px solid #1e90ff' : '1px solid transparent',
                                              cursor: currentUserId ? 'pointer' : 'default',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 4,
                                              padding: '2px 6px',
                                              borderRadius: 12,
                                              backgroundColor: isUserReaction ? '#e3f2fd' : '#f0f0f0',
                                              fontSize: '0.85rem',
                                            }}
                                          >
                                            <span>{emoji}</span>
                                            <span>{count}</span>
                                          </button>
                                        );
                                      })}
                                      {currentUserId && (
                                        <button
                                          onClick={() => handleReaction(comment._id, '🔥', reply._id)}
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '2px 6px',
                                            fontSize: '0.85rem',
                                            color: '#666',
                                          }}
                                        >
                                          😊+
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 48 }}>Event not found</div>
      )}

      {/* Cancellation Modal */}
      <Modal
        open={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setCancellationReason('');
        }}
        title="Cancel Event"
        width={500}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ margin: 0, color: '#666' }}>
            Are you sure you want to cancel this event? Please provide a reason for cancellation.
          </p>
          <FormField label="Cancellation Reason" htmlFor="cancel-reason" required>
            <Textarea
              id="cancel-reason"
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="Enter reason for cancellation..."
              rows={4}
            />
          </FormField>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelModal(false);
                setCancellationReason('');
              }}
              disabled={cancelLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCancelEvent}
              disabled={cancelLoading || !cancellationReason.trim()}
              style={{ backgroundColor: '#f44336' }}
            >
              {cancelLoading ? 'Cancelling...' : 'Cancel Event'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Invite Modal */}
      <Modal
        open={showInviteModal}
        onClose={() => {
          setShowInviteModal(false);
          setInviteEmails('');
          setInviteError(null);
          setInviteSuccess(null);
        }}
        title="Invite People to Event"
        width={500}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ margin: 0, color: '#666' }}>
            Enter email addresses of people you want to invite. Separate multiple emails with commas or new lines.
          </p>
          
          {inviteError && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#ffebee',
              border: '1px solid #f44336',
              borderRadius: 8,
              color: '#c62828',
              fontSize: '0.9rem'
            }}>
              {inviteError}
            </div>
          )}

          {inviteSuccess && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#e8f5e9',
              border: '1px solid #4caf50',
              borderRadius: 8,
              color: '#2e7d32',
              fontSize: '0.9rem'
            }}>
              {inviteSuccess}
            </div>
          )}

          <FormField label="Email Addresses" htmlFor="invite-emails" required>
            <Textarea
              id="invite-emails"
              value={inviteEmails}
              onChange={(e) => {
                setInviteEmails(e.target.value);
                setInviteError(null);
              }}
              placeholder="user1@example.com, user2@example.com&#10;or one per line"
              rows={6}
            />
          </FormField>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button
              variant="outline"
              onClick={() => {
                setShowInviteModal(false);
                setInviteEmails('');
                setInviteError(null);
                setInviteSuccess(null);
              }}
              disabled={inviteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleInvite}
              disabled={inviteLoading || !inviteEmails.trim()}
            >
              {inviteLoading ? 'Sending...' : 'Send Invitations'}
            </Button>
          </div>
        </div>
      </Modal>
    </Modal>
  );
}

