import { useState, useEffect } from 'react';
import { FileText, Filter, Briefcase, AlertTriangle, Shield, Users } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function Incidents() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('active');
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const response = await api.get('/incidents');
        setIncidents(response.data);
      } catch (error) {
        console.error('Failed to fetch incidents:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchIncidents();
  }, []);

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center' }}>Synchronizing Digital Twin Register...</div>;

  let displayedIncidents = incidents;
  if (location.pathname === '/claims') {
    displayedIncidents = incidents.filter(i => i.formal_claim_issued === 'Yes');
  } else if (location.pathname === '/cors') {
    displayedIncidents = incidents.filter(i => i.cor_required === 'Yes');
  } else if (location.pathname === '/insurers') {
    displayedIncidents = incidents.filter(i => i.insurer_notified === 'Yes');
  } else if (location.pathname === '/escalations') {
    displayedIncidents = incidents.filter(i => i.management_escalation === 'Yes');
  }

  // Apply tab filter
  displayedIncidents = displayedIncidents.filter(i => {
    if (activeTab === 'active') return i.status !== 'Closed' && i.status !== 'Draft';
    if (activeTab === 'closed') return i.status === 'Closed';
    if (activeTab === 'drafts') return i.status === 'Draft';
    return true;
  });

  const isClaims = location.pathname === '/claims';
  const isCors = location.pathname === '/cors';
  const isInsurers = location.pathname === '/insurers';
  const isEscalations = location.pathname === '/escalations';
  
  const pageTitle = isClaims 
    ? 'Claims Register' 
    : isCors 
    ? 'CORs Register' 
    : isInsurers
    ? 'Insurer Notifications'
    : isEscalations
    ? 'Management Escalations'
    : 'Incident Register';
  const HeaderIcon = isClaims ? Briefcase : isCors ? AlertTriangle : isInsurers ? Shield : isEscalations ? Users : FileText;
  const headerColor = isClaims ? '#10b981' : isCors ? '#f97316' : isInsurers ? '#06b6d4' : isEscalations ? '#8b5cf6' : '#6366f1';

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ 
            width: '42px', 
            height: '42px', 
            borderRadius: '12px', 
            background: `${headerColor}15`, 
            color: headerColor, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            border: `1px solid ${headerColor}30`
          }}>
            <HeaderIcon size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--fg-base)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {pageTitle}
              <span style={{ 
                fontSize: '0.75rem', 
                fontWeight: 600, 
                padding: '0.2rem 0.6rem', 
                background: 'var(--bg-subtle)', 
                border: '1px solid var(--border-base)', 
                borderRadius: '20px', 
                color: 'var(--fg-muted)',
                verticalAlign: 'middle'
              }}>
                {displayedIncidents.length} Records
              </span>
            </h2>
            <div style={{ fontSize: '0.8125rem', color: 'var(--fg-muted)', marginTop: '0.125rem' }}>
              {isClaims ? 'Official insurance liability and claim tracking' : 
               isCors ? 'Compliance and Chain of Responsibility monitoring' : 
               isInsurers ? 'Third-party insurer notification management' :
               isEscalations ? 'High-priority management intervention tracking' :
               'Central repository for all logged operational incidents'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary">
            <Filter size={14} /> View Filters
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem 2rem', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-base)' }}>
          {['active', 'closed', 'drafts'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: '6px',
                background: activeTab === tab ? 'var(--bg-elevated)' : 'transparent',
                border: '1px solid ' + (activeTab === tab ? 'var(--border-base)' : 'transparent'),
                boxShadow: activeTab === tab ? 'var(--shadow-sm)' : 'none',
                color: activeTab === tab ? 'var(--fg-base)' : 'var(--fg-muted)',
                fontWeight: activeTab === tab ? 600 : 500,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ overflowX: 'auto', padding: '0' }}>
          <table style={{ minWidth: '800px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surfcae)' }}>
                <th style={{ paddingLeft: '2rem' }}>Reference</th>
                <th>Classification</th>
                <th>Jurisdiction</th>
                <th>Lodged Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right', paddingRight: '2rem' }}>Exposure</th>
              </tr>
            </thead>
            <tbody>
              {displayedIncidents.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '6rem 2rem', background: 'var(--bg-surface)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', opacity: 0.5 }}>
                      <FileText size={48} strokeWidth={1} />
                      <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                        No {isClaims ? 'claims' : isCors ? 'CORs' : isInsurers ? 'insurer notifications' : isEscalations ? 'escalations' : 'incidents'} found.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedIncidents.map((incident, i) => (
                  <tr key={i} onClick={() => navigate(`/incidents/${incident.id}`)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 600, color: 'var(--fg-base)', paddingLeft: '2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={16} style={{ color: 'var(--fg-muted)' }} />
                        {incident.incident_number_str || `INC-${incident.id}`}
                      </div>
                    </td>
                    <td>{incident.type}</td>
                    <td>{incident.location}</td>
                    <td className="monospaced" style={{ color: 'var(--fg-muted)' }}>{incident.date}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span className={`badge badge-${incident.status === 'Closed' ? 'closed' : incident.status === 'Open' ? 'open' : 'review'}`}>
                          {incident.status}
                        </span>
                        {incident.formal_claim_issued === 'Yes' && (
                          <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            Claim
                          </span>
                        )}
                        {incident.cor_required === 'Yes' && (
                          <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                            CoR
                          </span>
                        )}
                        {incident.management_escalation === 'Yes' && (
                          <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                            Escalated
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, paddingRight: '2rem', color: 'var(--fg-base)' }}>
                      {incident.value || 'Pending'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border-base)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-subtle)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>Showing {displayedIncidents.length} records</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" disabled style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}>Previous</button>
            <button className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
