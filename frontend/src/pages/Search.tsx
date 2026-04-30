import { useState } from 'react';
import { Search as SearchIcon, FileText, ShieldAlert } from 'lucide-react';

export default function Search() {
  const [query, setQuery] = useState('');

  return (
    <div className="fade-in">
      <h2 className="page-title" style={{ marginBottom: '2rem' }}>Global Search</h2>
      
      <div className="card" style={{ marginBottom: '2rem', padding: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <SearchIcon size={20} style={{ position: 'absolute', left: '1rem', top: '1rem', color: 'var(--fg-faint)' }} />
            <input 
              type="text" 
              className="input-field" 
              placeholder="Query records, OCR text, or communications..." 
              style={{ fontSize: '1rem', padding: '1rem 1rem 1rem 3rem' }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" style={{ padding: '0 2rem' }}>Search</button>
        </div>
        
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem', paddingLeft: '0.5rem' }}>
          {['All Results', 'Documents', 'Incidents', 'Emails'].map(filter => (
            <label key={filter} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--fg-muted)', cursor: 'pointer', fontWeight: 500 }}>
              <input type="radio" name="filter" defaultChecked={filter === 'All Results'} style={{ cursor: 'pointer' }} />
              {filter}
            </label>
          ))}
        </div>
      </div>

      {query && (
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '2rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--fg-base)' }}>
            Results <span className="badge badge-open">2 Found</span>
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '1.5rem', border: '1px solid var(--border-base)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'border-color 0.2s ease' }} className="hover-lift">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <ShieldAlert size={16} color="var(--danger-fg)" />
                <span style={{ fontWeight: 600, color: 'var(--fg-base)', fontSize: '1rem' }}>INC-0042</span>
                <span style={{ color: 'var(--fg-faint)', fontSize: '0.875rem' }}>— Cargo Damage Incident</span>
              </div>
              <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--fg-muted)' }}>
                ...the survey report indicated that the <mark style={{ background: 'var(--warning-bg)', color: 'var(--warning-fg)', padding: '0 0.25rem', borderRadius: '2px' }}>{query}</mark> was heavily affected by water ingress during transit...
              </p>
            </div>
            
            <div style={{ padding: '1.5rem', border: '1px solid var(--border-base)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'border-color 0.2s ease' }} className="hover-lift">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <FileText size={16} color="var(--accent-fg)" />
                <span style={{ fontWeight: 600, color: 'var(--fg-base)', fontSize: '1rem' }}>Customs_Declaration.pdf</span>
                <span style={{ color: 'var(--fg-faint)', fontSize: '0.875rem' }}>— Attached to INC-0015</span>
              </div>
              <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--fg-muted)' }}>
                ...declared value of <mark style={{ background: 'var(--warning-bg)', color: 'var(--warning-fg)', padding: '0 0.25rem', borderRadius: '2px' }}>{query}</mark> exceeds the threshold specified in clause 4...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
