import { useState, useEffect } from 'react';
import { FileText, Filter, FileWarning, RefreshCw, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { useIncidents } from '../hooks/useIncidents';

export default function NCRs() {
  const navigate = useNavigate();
  const { role, branchName, businessUnit } = useAuth();
  const { incidents, loading, isRefreshing, handleManualRefresh } = useIncidents(2000);
  const [ncrs, setNcrs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchNCRs = async () => {
    try {
      // Filter NCRs from live incidents
      let ncrData = incidents.filter((i: any) => {
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
      console.error('Failed to process NCRs:', err);
    }
  };

  useEffect(() => {
    fetchNCRs();
  }, [incidents]);



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
      {/* Hero Header */}
      <div className="card fade-in" style={{
        position: 'relative', overflow: 'hidden', padding: '1.5rem 2.5rem', marginBottom: '2rem',
        background: 'linear-gradient(145deg, rgba(245, 158, 11, 0.08) 0%, var(--bg-surface) 100%)',
        border: '1px solid var(--border-base)',
        borderLeft: '4px solid #f59e0b',
        boxShadow: '0 10px 30px -10px rgba(245, 158, 11, 0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2rem'
      }}>
        {/* Glow effect */}
        <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '50%', height: '200%', background: 'radial-gradient(ellipse at center, rgba(245, 158, 11, 0.15) 0%, transparent 70%)', transform: 'rotate(-25deg)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(245, 158, 11, 0.15)', borderRadius: '12px', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)' }}>
              <FileWarning size={28} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: 'var(--fg-base)' }}>
                Non-Conformance Reports
              </h2>
              <p style={{ color: 'var(--fg-muted)', fontSize: '0.95rem', margin: 0, fontWeight: 500 }}>
                Process failures, defects, and quality non-conformances
              </p>
            </div>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '1.25rem' }}>
          <div style={{ textAlign: 'center', padding: '0.75rem 1.75rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>{openCount}</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', marginTop: '0.25rem', letterSpacing: '0.05em' }}>Open</div>
          </div>
          <div style={{ textAlign: 'center', padding: '0.75rem 1.75rem', background: 'rgba(16,185,129,0.05)', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.2)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', lineHeight: 1 }}>{closedCount}</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', marginTop: '0.25rem', letterSpacing: '0.05em' }}>Closed</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button className="btn btn-secondary" onClick={handleManualRefresh} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
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
                <th style={{ paddingLeft: '1.5rem', whiteSpace: 'nowrap' }}>Reference</th>
                <th style={{ whiteSpace: 'nowrap' }}>Entity</th>
                <th style={{ whiteSpace: 'nowrap' }}>Business Unit</th>
                <th style={{ whiteSpace: 'nowrap' }}>Branch</th>
                <th style={{ whiteSpace: 'nowrap' }}>Level of NC</th>
                <th style={{ whiteSpace: 'nowrap' }}>Identification</th>
                <th style={{ whiteSpace: 'nowrap' }}>Identified By</th>
                <th style={{ whiteSpace: 'nowrap' }}>At Fault Party</th>
                <th style={{ whiteSpace: 'nowrap' }}>Related Record</th>
                <th style={{ whiteSpace: 'nowrap' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredNCRs.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '4rem 2rem' }}>
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
                  <tr key={i} onClick={() => navigate(`/incidents/${ncr.id}`, { state: { source: 'ncrs' } })} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 600, color: 'var(--fg-base)', paddingLeft: '1.5rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#eab308' }} />
                        {ncr.incident_number_str || `NCR-${ncr.id}`}
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{ncr.entity || ncr.ncr_entity || ncr.cr991_entity || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{ncr.business_unit || ncr.cr991_businessunitbu || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{ncr.branch_department || ncr.cr991_branch || ncr.location || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {ncr.level_of_nonconformity || ncr.ncr_level ? (
                        <span style={{ 
                          padding: '0.15rem 0.5rem', 
                          borderRadius: '4px', 
                          fontSize: '0.7rem', 
                          fontWeight: 600,
                          background: (ncr.level_of_nonconformity || ncr.ncr_level) === 'Critical' ? 'rgba(239,68,68,0.1)' : 
                                      (ncr.level_of_nonconformity || ncr.ncr_level) === 'Major' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)',
                          color: (ncr.level_of_nonconformity || ncr.ncr_level) === 'Critical' ? '#ef4444' : 
                                 (ncr.level_of_nonconformity || ncr.ncr_level) === 'Major' ? '#f59e0b' : '#3b82f6'
                        }}>
                          {ncr.level_of_nonconformity || ncr.ncr_level}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{ncr.identification || ncr.ncr_identification || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{ncr.identified_by || ncr.ncr_identified_by || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{ncr.at_fault_party || ncr.ncr_at_fault_party || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ncr.related_record || ncr.ncr_reference || '—'}</td>
                    <td>
                      <span className={`badge badge-${(ncr.status || '').includes('Closed') ? 'closed' : (ncr.status || '').includes('Open') ? 'open' : 'review'}`}>
                        {String(ncr.status || '')}
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
