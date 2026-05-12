import { useState, useEffect } from 'react';
import { Search as SearchIcon, FileText, ShieldAlert, Package, FileWarning, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function Search() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All Results');
  const [allIncidents, setAllIncidents] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      let data: any[] = [];
      try {
        const res = await api.get('/incidents');
        data = res.data || [];
      } catch (e) {}
      const localStr = localStorage.getItem('incidents_cache');
      if (localStr) {
        const localData = JSON.parse(localStr);
        const existingIds = new Set(data.map((i: any) => i.id));
        localData.forEach((i: any) => { if (!existingIds.has(i.id)) data.push(i); });
      }
      setAllIncidents(data);
    };
    load();
  }, []);

  const doSearch = () => {
    if (!query.trim()) { setResults([]); setSearched(false); return; }
    const q = query.toLowerCase();
    let filtered = allIncidents.filter(inc => {
      const str = JSON.stringify(inc).toLowerCase();
      return str.includes(q);
    });
    // Apply filter
    if (filter === 'Incidents') {
      filtered = filtered.filter(i => i.category !== 'ncr' && !(i.type || '').toLowerCase().includes('ncr'));
    } else if (filter === 'NCRs') {
      filtered = filtered.filter(i => i.category === 'ncr' || (i.type || '').toLowerCase().includes('ncr'));
    } else if (filter === 'Claims') {
      filtered = filtered.filter(i => i.formal_claim_issued === 'Yes');
    }
    setResults(filtered);
    setSearched(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') doSearch();
  };

  const getIcon = (inc: any) => {
    if (inc.category === 'ncr' || (inc.type || '').toLowerCase().includes('ncr')) return <FileWarning size={16} color="#eab308" />;
    if (inc.formal_claim_issued === 'Yes') return <AlertTriangle size={16} color="#ef4444" />;
    return <Package size={16} color="#6366f1" />;
  };

  const highlightMatch = (text: string) => {
    if (!text || !query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + query.length);
    const after = text.slice(idx + query.length);
    return <>{before}<mark style={{ background: 'var(--warning-bg)', color: 'var(--warning-fg)', padding: '0 0.25rem', borderRadius: '2px' }}>{match}</mark>{after}</>;
  };

  return (
    <div className="fade-in">
      <h2 className="page-title" style={{ marginBottom: '2rem' }}>Search</h2>
      
      <div className="card" style={{ marginBottom: '2rem', padding: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <SearchIcon size={20} style={{ position: 'absolute', left: '1rem', top: '1rem', color: 'var(--fg-faint)' }} />
            <input 
              type="text" 
              className="input-field" 
              placeholder="Search keywords, incident numbers, job references, descriptions..." 
              style={{ fontSize: '1rem', padding: '1rem 1rem 1rem 3rem' }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <button className="btn btn-primary" style={{ padding: '0 2rem' }} onClick={doSearch}>Search</button>
        </div>
        
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem', paddingLeft: '0.5rem' }}>
          {['All Results', 'Incidents', 'NCRs', 'Claims'].map(f => (
            <label key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: filter === f ? 'var(--accent-fg)' : 'var(--fg-muted)', cursor: 'pointer', fontWeight: filter === f ? 700 : 500 }}>
              <input type="radio" name="filter" checked={filter === f} onChange={() => setFilter(f)} style={{ cursor: 'pointer' }} />
              {f}
            </label>
          ))}
        </div>
      </div>

      {searched && (
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '2rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--fg-base)' }}>
            Results <span className="badge badge-open">{results.length} Found</span>
          </h3>
          
          {results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--fg-muted)' }}>
              <SearchIcon size={40} strokeWidth={1.5} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>No results found for "{query}"</div>
              <div style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Try different keywords or broaden your search.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {results.slice(0, 20).map((inc, i) => (
                <div 
                  key={i} 
                  onClick={() => navigate(`/incidents/${inc.id}`)}
                  style={{ padding: '1.5rem', border: '1px solid var(--border-base)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'border-color 0.2s ease' }} 
                  className="hover-lift"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    {getIcon(inc)}
                    <span style={{ fontWeight: 600, color: 'var(--fg-base)', fontSize: '1rem' }}>
                      {inc.incident_number_str || `INC-${inc.id}`}
                    </span>
                    <span style={{ color: 'var(--fg-faint)', fontSize: '0.875rem' }}>— {inc.type || 'Unknown'}</span>
                    <span className={`badge badge-${inc.status?.includes('Closed') ? 'closed' : inc.status?.includes('Open') ? 'open' : 'review'}`} style={{ marginLeft: 'auto' }}>
                      {inc.status}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--fg-muted)', margin: 0 }}>
                    {highlightMatch((inc.description || 'No description').substring(0, 200))}
                    {(inc.description || '').length > 200 ? '...' : ''}
                  </p>
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--fg-faint)' }}>
                    <span>📍 {inc.location || inc.branch_department || 'N/A'}</span>
                    <span>📅 {inc.date || 'N/A'}</span>
                    {inc.job_number && <span>📦 {inc.job_number}</span>}
                  </div>
                </div>
              ))}
              {results.length > 20 && (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--fg-muted)', fontSize: '0.875rem' }}>
                  Showing first 20 of {results.length} results. Refine your search for more specific results.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
