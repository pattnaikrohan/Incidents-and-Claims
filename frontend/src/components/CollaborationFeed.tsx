import React, { useState, useEffect, useRef } from 'react';
import { Send, Shield, Clock, MessageSquare, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { playNotificationSound } from '../utils/notificationSound';
import { useNotifications } from '../context/NotificationContext';

interface Note {
  id: number | string;
  message: string;
  timestamp: string;
  note_type: 'user' | 'system';
  author_name: string;
}

interface CollaborationFeedProps {
  incidentId: string | number;
}

function formatLocalTime(rawTimestamp: string): string {
  if (!rawTimestamp) return '';
  try {
    let dateStr = String(rawTimestamp).trim();
    // If ISO timestamp has no timezone offset or Z, treat as UTC from server
    if (dateStr.includes('T') && !dateStr.endsWith('Z') && !dateStr.includes('+') && !/-\d\d:\d\d$/.test(dateStr)) {
      dateStr += 'Z';
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function CollaborationFeed({ incidentId }: CollaborationFeedProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isSending, setIsSending] = useState(false);

  const { addNotification } = useNotifications();
  const knownNoteIdsRef = useRef<Set<string | number>>(new Set());
  const isInitialLoadRef = useRef(true);

  const currentUserName = localStorage.getItem('displayName') || localStorage.getItem('email') || '';

  const fetchNotes = async () => {
    try {
      const response = await api.get(`/incidents/${incidentId}/notes`);
      if (Array.isArray(response.data)) {
        const incomingNotes: Note[] = response.data;
        
        // Detect newly arrived notes from other team members (not during first load)
        if (!isInitialLoadRef.current && incomingNotes.length > 0) {
          const freshIncoming = incomingNotes.filter(
            (n) => !knownNoteIdsRef.current.has(n.id) &&
                   n.author_name !== currentUserName &&
                   n.author_name !== 'You'
          );

          if (freshIncoming.length > 0) {
            const latest = freshIncoming[freshIncoming.length - 1];
            // Register in global notification context (plays chime + shows top banner + adds to Bell menu)
            addNotification({
              title: 'Incident Collaboration',
              message: latest.message,
              author: latest.author_name,
              incidentId: String(incidentId),
              link: `/incidents/${incidentId}`,
              type: 'collaboration'
            });
          }
        }

        // Update known IDs
        if (incomingNotes.length === 0) {
          knownNoteIdsRef.current.clear();
        } else {
          incomingNotes.forEach((n) => knownNoteIdsRef.current.add(n.id));
        }
        isInitialLoadRef.current = false;
        setNotes(incomingNotes);
      }
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    isInitialLoadRef.current = true;
    knownNoteIdsRef.current.clear();
    fetchNotes();
    // Poll every 3 seconds for real-time updates across users
    const interval = setInterval(fetchNotes, 3000);
    return () => {
      clearInterval(interval);
    };
  }, [incidentId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [notes]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const msgToSend = newMessage.trim();
    if (!msgToSend || isSending) return;

    const authorName = localStorage.getItem('displayName') || localStorage.getItem('email') || 'You';

    // Play subtle confirmation sound on send
    playNotificationSound('sent');

    // Optimistic message update for instant UI feedback
    const tempId = Date.now();
    const optimisticNote: Note = {
      id: tempId,
      message: msgToSend,
      timestamp: new Date().toISOString(),
      note_type: 'user',
      author_name: authorName
    };
    knownNoteIdsRef.current.add(tempId);
    setNotes((prev) => [...prev, optimisticNote]);
    setNewMessage('');
    setIsSending(true);

    try {
      await api.post(`/incidents/${incidentId}/notes`, { message: msgToSend });
      await fetchNotes();
    } catch (error) {
      console.error('Failed to send message:', error);
      fetchNotes();
    } finally {
      setIsSending(false);
    }
  };

  const handleClearMessages = async () => {
    if (!window.confirm('Are you sure you want to clear all messages in this thread? This cannot be undone.')) return;
    try {
      await api.delete(`/incidents/${incidentId}/notes`);
      knownNoteIdsRef.current.clear();
      setNotes([]);
    } catch (error) {
      console.error('Failed to clear messages:', error);
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--fg-muted)' }}>Loading conversation...</div>;

  return (
    <div className="card" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '500px', 
      padding: 0,
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-base)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '1.25rem 1.5rem', 
        borderBottom: '1px solid var(--border-base)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        background: 'linear-gradient(to right, rgba(59, 130, 246, 0.05), transparent)'
      }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          borderRadius: '12px', 
          background: 'var(--accent-light)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'var(--accent-fg)',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)'
        }}>
          <Shield size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0, color: 'var(--fg-base)' }}>Incident Collaboration</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', fontWeight: 500 }}>Real-time coordination thread</span>
        </div>
        {notes.length > 0 && (
          <button
            onClick={handleClearMessages}
            title="Clear all messages"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-base)',
              borderRadius: '8px',
              padding: '0.4rem 0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
              color: 'var(--fg-muted)',
              fontSize: '0.75rem',
              fontWeight: 500,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.borderColor = '#fca5a5';
              e.currentTarget.style.background = '#fef2f2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--fg-muted)';
              e.currentTarget.style.borderColor = 'var(--border-base)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Trash2 size={13} />
            Clear
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}
      >
        {notes.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.7, minHeight: '200px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--fg-muted)' }}>
              <MessageSquare size={28} />
            </div>
            <div style={{ textAlign: 'center', color: 'var(--fg-muted)', fontSize: '0.95rem', fontWeight: 500, maxWidth: '200px' }}>
              No messages yet. Start the conversation.
            </div>
          </div>
        )}

        {notes.map((note) => (
          <div key={note.id} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: note.note_type === 'system' ? 'center' : 'flex-start',
            width: '100%'
          }}>
            {note.note_type === 'system' ? (
              <div style={{ 
                margin: '1rem 0',
                padding: '0.4rem 1rem',
                background: 'var(--bg-subtle)',
                borderRadius: '2rem',
                fontSize: '0.75rem',
                color: 'var(--fg-muted)',
                border: '1px solid var(--border-base)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Clock size={12} />
                {note.message}
              </div>
            ) : (
              <div style={{ maxWidth: '85%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--fg-base)' }}>{note.author_name}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--fg-faint)' }}>
                    {formatLocalTime(note.timestamp)}
                  </span>
                </div>
                <div style={{ 
                  padding: '0.875rem 1.125rem',
                  background: 'var(--bg-subtle)',
                  borderRadius: '0 1rem 1rem 1rem',
                  fontSize: '0.875rem',
                  lineHeight: 1.5,
                  color: 'var(--fg-base)',
                  border: '1px solid var(--border-base)',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  {note.message}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input Area */}
      <form 
        onSubmit={handleSendMessage}
        style={{ 
          padding: '1.25rem', 
          borderTop: '1px solid var(--border-base)',
          background: 'var(--bg-subtle)',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'center'
        }}
      >
        <div style={{ position: 'relative', flex: 1 }}>
          <input 
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message or instruction..."
            style={{ 
              width: '100%',
              background: 'var(--bg-base)',
              border: '1px solid var(--border-base)',
              borderRadius: '2rem',
              padding: '0.875rem 1.25rem',
              color: 'var(--fg-base)',
              fontSize: '0.9rem',
              outline: 'none',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#3b82f6';
              e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border-base)';
              e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)';
            }}
          />
        </div>
        <button 
          type="submit"
          className="btn btn-primary"
          style={{ 
            width: '46px', 
            height: '46px', 
            borderRadius: '50%', 
            padding: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            opacity: newMessage.trim() ? 1 : 0.6,
            transition: 'all 0.2s ease',
            transform: newMessage.trim() ? 'scale(1.05)' : 'scale(1)',
            boxShadow: newMessage.trim() ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
          }}
          disabled={!newMessage.trim()}
        >
          <Send size={18} style={{ transform: 'translateX(-1px) translateY(1px)' }} />
        </button>
      </form>
    </div>
  );
}
