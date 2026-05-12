import { ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { useState } from 'react';

interface Props {
  title: string;
  icon: React.ReactNode;
  color: string;
  ownerLabel: string;
  isAwaitingUpdate?: boolean;
  awaitingMessage?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function IncidentSection({ title, icon, color, ownerLabel, isAwaitingUpdate, awaitingMessage, children, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="card" style={{ padding: 0, border: `1px solid ${color}20`, overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.5rem', cursor: 'pointer', userSelect: 'none',
          background: `linear-gradient(135deg, ${color}08 0%, transparent 100%)`,
          borderBottom: open ? `1px solid ${color}15` : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: `${color}12`, color, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${color}25`
          }}>
            {icon}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--fg-base)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {title}
              {isAwaitingUpdate && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.6rem',
                  background: '#fef3c7', color: '#92400e', borderRadius: '20px',
                  border: '1px solid #fde68a'
                }}>
                  <Clock size={10} /> {awaitingMessage || 'Awaiting Update'}
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--fg-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {ownerLabel}
            </div>
          </div>
        </div>
        <div style={{ color: 'var(--fg-faint)' }}>
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </div>

      {open && (
        <div className="fade-in" style={{ padding: '1.5rem' }}>
          {isAwaitingUpdate ? (
            <div style={{
              padding: '2rem', textAlign: 'center', background: 'var(--bg-subtle)',
              borderRadius: '12px', border: '1px dashed var(--border-base)'
            }}>
              <Clock size={24} style={{ color: '#f59e0b', marginBottom: '0.75rem' }} />
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--fg-muted)', marginBottom: '0.25rem' }}>
                {awaitingMessage || 'Awaiting Department Update'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--fg-faint)' }}>
                This section is pending completion. Fields will populate once updated.
              </div>
            </div>
          ) : children}
        </div>
      )}
    </div>
  );
}
