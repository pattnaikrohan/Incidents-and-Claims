import React, { useState, useEffect, useRef } from 'react';
import { Send, Shield, Clock } from 'lucide-react';
import { api } from '../services/api';

interface Note {
  id: number;
  message: string;
  timestamp: string;
  note_type: 'user' | 'system';
  author_name: string;
}

interface CollaborationFeedProps {
  incidentId: string | number;
}

export default function CollaborationFeed({ incidentId }: CollaborationFeedProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchNotes = async () => {
    try {
      const response = await api.get(`/incidents/${incidentId}/notes`);
      setNotes(response.data);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
    // In a real app, we would use WebSockets here for instant updates.
    // Setting up a basic poll for demonstration.
    const interval = setInterval(fetchNotes, 5000);
    return () => clearInterval(interval);
  }, [incidentId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [notes]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await api.post(`/incidents/${incidentId}/notes`, { message: newMessage });
      setNewMessage('');
      fetchNotes();
    } catch (error) {
      console.error('Failed to send message:', error);
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
        padding: '1rem 1.5rem', 
        borderBottom: '1px solid var(--border-base)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        background: 'rgba(255, 255, 255, 0.02)'
      }}>
        <div style={{ 
          width: '32px', 
          height: '32px', 
          borderRadius: '50%', 
          background: 'var(--accent-light)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'var(--accent-fg)'
        }}>
          <Shield size={16} />
        </div>
        <div>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>Incident Collaboration</h3>
          <span style={{ fontSize: '0.7rem', color: 'var(--fg-muted)' }}>Real-time coordination thread</span>
        </div>
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
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--fg-faint)', fontSize: '0.85rem' }}>
            No messages yet. Start the conversation.
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
                    {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
          background: 'rgba(255, 255, 255, 0.02)',
          display: 'flex',
          gap: '0.75rem'
        }}
      >
        <input 
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message or instruction..."
          style={{ 
            flex: 1,
            background: 'var(--bg-base)',
            border: '1px solid var(--border-base)',
            borderRadius: '0.5rem',
            padding: '0.75rem 1rem',
            color: 'var(--fg-base)',
            fontSize: '0.875rem',
            outline: 'none'
          }}
        />
        <button 
          type="submit"
          className="btn btn-primary"
          style={{ padding: '0.75rem', borderRadius: '0.5rem' }}
          disabled={!newMessage.trim()}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
