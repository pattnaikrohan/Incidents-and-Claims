import { useState, useEffect } from 'react';
import { FileText, Filter, FileWarning, RefreshCw, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function NCRs() {
  const navigate = useNavigate();
  const [ncrs, setNcrs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { role, branchName, businessUnit } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchNCRs = async () => {
    try {
      let allIncidents: any[] = [];
      try {
        const res = await api.get('/incidents');
        allIncidents = res.data || [];
      } catch (e) {
        console.warn('Backend unavailable, using local cache');
      }

      const localStr = localStorage.getItem('incidents_cache');
      if (localStr) {
        const localData = JSON.parse(localStr);
        const existingIds = new Set(allIncidents.map((i: any) => i.id));
        localData.forEach((i: any) => {
          if (!existingIds.has(i.id)) allIncidents.push(i);
        });
      }

      // Filter NCRs only
      let ncrData = allIncidents.filter((i: any) => {
        const t = (i.type || '').toLowerCase();
        const cat = i.category || '';
        const ref = (i.incident_number_str || '').toUpperCase();
        return cat === 'ncr' || t.includes('non-conformance') || t.includes('ncr') || ref.startsWith('NCR-');
      });

      // RBAC
      if (role !== 'full_access' && role !== 'risk_compliance') {
        if (role === 'bu_access' && businessUnit) {
          ncrData = ncrData.filter((i: any) => i.business_unit === businessUnit || i.branch_department === businessUnit);
        } else if (branchName) {
          ncrData = ncrData.filter((i: any) => i.branch_department === branchName);
        }
      }

      setNcrs(ncrData);
    } catch (err) {
      console.error('Failed to load NCRs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNCRs(); }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchNCRs();
    setIsRefreshing(false);
  };

  // Apply filters
  const filteredNCRs = ncrs
    .filter(n => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!JSON.stringify(n).toLowerCase().includes(q)) return false;
      }
      if (statusFilter.length > 0 && !statusFilter.includes(n.status)) return false;
      return true;
    })
    .sort((a, b) => {
      return sortDir === 'desc'
        ? new Date(b.date || b.created_at || 0).getTime() - new Date(a.date || a.created_at || 0).getTime()
        : new Date(a.date || a.created_at || 0).getTime() - new Date(b.date || b.created_at || 0).getTime();
    });

  const openCount = ncrs.filter(n => n.status?.toLowerCase().includes('open')).length;
  const closedCount = ncrs.filter(n => n.status?.toLowerCase().includes('closed')).length;

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center' }}>Loading NCR Register...</div>;

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eab30815', border: '1px solid #eab30830', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#eab308' }}>
              <FileWarning size={20} />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Non-Conformance Reports
            </h2>
          </div>
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.875rem' }}>
            Process failures, defects, and quality non-conformances
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ textAlign: 'center', padding: '0.5rem 1.25rem', background: 'rgba(239,68,68,0.05)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.15)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>{openCount}</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase' }}>Open</div>
          </div>
          <div style={{ textAlign: 'center', padding: '0.5rem 1.25rem', background: 'rgba(16,185,129,0.05)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.15)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>{closedCount}</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase' }}>Closed</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button className="btn btn-secondary" onClick={handleRefresh} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
          <RefreshCw size={14} className={isRefreshing ? 'spin-animation' : ''} /> Refresh
        </button>
        <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
          <Filter size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-faint)' }} />
          <input
            type="text" className="input-field" placeholder="Search NCRs..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2rem', fontSize: '0.8rem' }}
          />
        </div>
        <div style={{ position: 'relative' }}>
          <button
            className={`btn ${statusFilter.length > 0 ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
          >
            <Filter size={14} /> Filter {statusFilter.length > 0 && `(${statusFilter.length})`}
          </button>
          {showFilterMenu && (
            <div onClick={e => e.stopPropagation()} style={{
              position: 'absolute', top: '110%', right: 0, zIndex: 100,
              background: 'var(--bg-elevated)', border: '1px solid var(--border-base)',
              borderRadius: '8px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
              width: '200px', padding: '1rem'
            }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--fg-faint)', marginBottom: '0.5rem' }}>Status</div>
              {['Open', 'Closed', 'Under Review', 'In Progress'].map(s => (
                <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', cursor: 'pointer', padding: '3px 0' }}>
                  <input type="checkbox" checked={statusFilter.includes(s)}
                    onChange={() => setStatusFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])} />
                  {s}
                </label>
              ))}
              <button className="btn btn-secondary" style={{ width: '100%', fontSize: '0.65rem', padding: '4px', marginTop: '0.5rem' }}
                onClick={() => setStatusFilter([])}>Clear</button>
            </div>
          )}
        </div>
        <button className="btn btn-secondary" onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
          <AlertTriangle size={14} style={{ transform: sortDir === 'asc' ? 'rotate(180deg)' : 'none' }} />
          {sortDir === 'asc' ? 'Oldest' : 'Newest'}
        </button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: '800px', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)' }}>
                <th style={{ paddingLeft: '1.5rem' }}>Reference</th>
                <th>Description</th>
                <th>Branch / Dept</th>
                <th>Lodged Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredNCRs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', opacity: 0.4 }}>
                      <FileText size={32} strokeWidth={1.5} />
                      <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                        {searchQuery || statusFilter.length > 0 ? 'No NCRs match your filters.' : 'No NCRs found.'}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredNCRs.map((ncr, i) => (
                  <tr key={i} onClick={() => navigate(`/incidents/${ncr.id}`)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 600, color: 'var(--fg-base)', paddingLeft: '1.5rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#eab308' }} />
                        {ncr.incident_number_str || `NCR-${ncr.id}`}
                      </div>
                    </td>
                    <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ncr.description || ncr.type || 'N/A'}
                    </td>
                    <td>{ncr.branch_department || ncr.location || 'N/A'}</td>
                    <td className="monospaced" style={{ color: 'var(--fg-muted)' }}>{ncr.date}</td>
                    <td>
                      <span className={`badge badge-${ncr.status?.includes('Closed') ? 'closed' : ncr.status?.includes('Open') ? 'open' : 'review'}`}>
                        {ncr.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
