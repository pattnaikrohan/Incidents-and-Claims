import React from 'react';

interface StructuredDescriptionProps {
  description: string;
}

export const StructuredDescription: React.FC<StructuredDescriptionProps> = ({ description }) => {
  if (!description) return <div style={{ color: 'var(--fg-muted)', fontSize: '0.9rem' }}>No description provided.</div>;

  if (!description.includes('---')) {
    return <div style={{ whiteSpace: 'pre-wrap', color: 'var(--fg-base)', lineHeight: 1.6, fontSize: '0.95rem' }}>{description}</div>;
  }

  const parts = description.split('---');
  const mainDesc = parts[0].trim();
  
  const sections: { title: string; pairs: { key: string; value: string }[] }[] = [];
  
  for (let i = 1; i < parts.length; i += 2) {
    const title = parts[i].trim();
    const content = (parts[i + 1] || '').trim();
    
    // Split by literal newlines
    const lines = content.split('\n').map(l => l.trim()).filter(l => l);
    
    // Sometimes newlines might be stripped by browsers or UI. If it's a single line and contains multiple colons, we might fallback to spaces? 
    // Usually it has \n. We'll rely on \n.
    const pairs = lines.map(line => {
      const colonIdx = line.indexOf(':');
      if (colonIdx > -1) {
        return { key: line.substring(0, colonIdx).trim(), value: line.substring(colonIdx + 1).trim() };
      }
      return { key: '', value: line };
    });

    sections.push({ title, pairs });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {sections.length === 0 && mainDesc && (
        <div style={{ whiteSpace: 'pre-wrap', color: 'var(--fg-base)', lineHeight: 1.5, fontSize: '0.85rem' }}>{mainDesc}</div>
      )}

      {sections.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sections.map((sec, idx) => (
            <div key={idx} className="card" style={{ background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-subtle)', overflow: 'hidden', padding: 0 }}>
              <div style={{ padding: '0.75rem 1.25rem', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-subtle)', fontWeight: 800, fontSize: '0.7rem', color: 'var(--fg-base)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {sec.title}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1px', background: 'var(--border-subtle)' }}>
                {sec.pairs.map((pair, pIdx) => (
                  <div key={pIdx} style={{ background: 'var(--bg-surface)', padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {pair.key ? (
                      <>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{pair.key}</span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--fg-base)', fontWeight: 600 }}>{pair.value || '—'}</span>
                      </>
                    ) : (
                      <span style={{ fontSize: '0.875rem', color: 'var(--fg-base)', fontWeight: 500 }}>{pair.value}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
