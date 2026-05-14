import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Clock, MapPin, Briefcase, ChevronDown, Shield, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useState, useEffect } from 'react';
import { useIncidents } from '../hooks/useIncidents';
import { getIncidentCategory, CATEGORY_META } from '../utils/incidentRoles';

export default function CoRDetails() {
  const { id } = useParams();
  const { role } = useAuth();
  const { incidents } = useIncidents(0);
  const [incident, setIncident] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [cor, setCor] = useState({
    cor_type: '',
    company_role: '',
    cor_risk_level: 'Low',
    cor_status: 'Open',
    cor_assessment: '',
    cor_corrective_action: '',
    cor_action_implemented: 'No',
  });



  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const fetchIncident = async () => {
    setLoading(true);
    try {
      // Try API first
      const resp = await api.get(`/incidents/${id}`);
      if (resp.data) {
        setIncident(resp.data);
        setCor({
          cor_type: resp.data.cor_type || '',
          company_role: resp.data.company_role || '',
          cor_risk_level: resp.data.cor_risk_level || 'Low',
          cor_status: resp.data.cor_status || 'Open',
          cor_assessment: resp.data.cor_assessment || '',
          cor_corrective_action: resp.data.cor_corrective_action || '',
          cor_action_implemented: resp.data.cor_action_implemented || 'No',
        });
      }
    } catch {
      // Fallback to local cache
      const cached = incidents.find((i: any) =>
        i.id?.toString() === id ||
        i.incident_number_str === id ||
        i.incident_number_str === `CEI-${id}`
      );
      if (cached) {
        setIncident(cached);
        setCor({
          cor_type: cached.cor_type || '',
          company_role: cached.company_role || '',
          cor_risk_level: cached.cor_risk_level || 'Low',
          cor_status: cached.cor_status || 'Open',
          cor_assessment: cached.cor_assessment || '',
          cor_corrective_action: cached.cor_corrective_action || '',
          cor_action_implemented: cached.cor_action_implemented || 'No',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchIncident();
  }, [id]);

  useEffect(() => {
    if (!incident && incidents.length > 0 && id) {
      const cached = incidents.find((i: any) =>
        i.id?.toString() === id ||
        i.incident_number_str === id ||
        i.incident_number_str === `CEI-${id}`
      );
      if (cached) {
        setIncident(cached);
        setCor(prev => ({
          ...prev,
          cor_type: cached.cor_type || prev.cor_type,
          company_role: cached.company_role || prev.company_role,
          cor_risk_level: cached.cor_risk_level || prev.cor_risk_level,
          cor_status: cached.cor_status || prev.cor_status,
          cor_assessment: cached.cor_assessment || prev.cor_assessment,
          cor_corrective_action: cached.cor_corrective_action || prev.cor_corrective_action,
          cor_action_implemented: cached.cor_action_implemented || prev.cor_action_implemented,
        }));
        setLoading(false);
      }
    }
  }, [incidents, id]);

  const PA_COR_FLOW_URL = 'https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/1cb43ed7dac84fcca1fe51f0c9b654cb/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=FW9jJLWiwW1fymo7QX7kw3XyqZicA95uwH3Adu4eNGg';

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        incident_id: incident.id,
        incident_number: incident.incident_number_str || `INC-${incident.id}`,
        branch_department: incident.branch_department || '',
        business_unit: incident.business_unit || '',
        ...cor,
      };

      const resp = await fetch(PA_COR_FLOW_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) throw new Error(`Flow responded with ${resp.status}`);

      // Also update local cache
      const allIncidents = JSON.parse(localStorage.getItem('pa_incidents_cache') || '[]');
      const idx = allIncidents.findIndex((i: any) => i.id?.toString() === id || i.incident_number_str === id);
      if (idx !== -1) {
        allIncidents[idx] = { ...allIncidents[idx], ...cor };
        localStorage.setItem('pa_incidents_cache', JSON.stringify(allIncidents));
      }

      showNotification('CoR details saved successfully.');
    } catch (err) {
      console.error('CoR save failed:', err);
      // Save to local cache as fallback
      const allIncidents = JSON.parse(localStorage.getItem('pa_incidents_cache') || '[]');
      const idx = allIncidents.findIndex((i: any) => i.id?.toString() === id || i.incident_number_str === id);
      if (idx !== -1) {
        allIncidents[idx] = { ...allIncidents[idx], ...cor };
        localStorage.setItem('pa_incidents_cache', JSON.stringify(allIncidents));
      }
      showNotification('CoR details saved locally (flow sync pending).');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !incident) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--fg-muted)' }}>Loading CoR Record...</div>;
  }

  const category = getIncidentCategory(incident);
  const meta = CATEGORY_META[category];

  return (
    <div className="fade-in">
      {/* Success Toast */}
      {successMessage && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
          background: 'linear-gradient(135deg, #10b981, #059669)',
          color: '#fff', padding: '1rem 1.5rem', borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(16, 185, 129, 0.3)',
          fontWeight: 600, fontSize: '0.875rem',
          animation: 'fadeIn 0.3s ease'
        }}>
          ✓ {successMessage}
        </div>
      )}

      {/* Back Link */}
      <Link to="/cors" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#3b82f6', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        <ArrowLeft size={16} /> Back to CoR Compliance
      </Link>

      {/* Hero Header */}
      <div className="card" style={{
        position: 'relative', overflow: 'hidden', padding: '2.5rem', marginBottom: '2rem',
        background: 'linear-gradient(145deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)',
        border: '1px solid var(--border-base)',
        boxShadow: '0 20px 40px -20px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}>
        {/* Amber glow */}
        <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '50%', height: '200%', background: 'radial-gradient(ellipse at center, rgba(245, 158, 11, 0.15) 0%, transparent 70%)', transform: 'rotate(-25deg)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '2rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <div style={{ padding: '0.5rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '10px', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <AlertTriangle size={22} />
              </div>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', margin: 0, color: 'var(--fg-base)' }}>
                {incident.incident_number_str || `INC-${incident.id}`}
              </h2>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '20px', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                CoR Compliance
              </span>
            </div>
            <p style={{ fontSize: '0.95rem', color: 'var(--fg-muted)', maxWidth: '700px', lineHeight: 1.6, margin: 0 }}>
              {incident.description || 'No description provided'}
            </p>
          </div>

          {/* Status Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-end', minWidth: '300px' }}>
            {/* Incident Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-subtle)', backdropFilter: 'blur(10px)' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--fg-faint)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Incident Status</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: (incident.status || '').includes('Closed') ? '#10b981' : '#3b82f6', boxShadow: `0 0 10px ${(incident.status || '').includes('Closed') ? '#10b981' : '#3b82f6'}` }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--fg-base)' }}>{incident.status || 'Open - Incident Logged'}</span>
              </div>
            </div>

            {/* CoR Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(245, 158, 11, 0.04)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#f59e0b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>CoR Status</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cor.cor_status === 'Closed' ? '#10b981' : '#f59e0b', boxShadow: `0 0 10px ${cor.cor_status === 'Closed' ? '#10b981' : '#f59e0b'}` }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--fg-base)' }}>{cor.cor_status}</span>
              </div>
            </div>

            {/* CoR Status Dropdown */}
            {['full_access', 'risk_compliance'].includes(role || '') && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <select
                    className="input-field"
                    value={cor.cor_status}
                    onChange={(e) => setCor({ ...cor, cor_status: e.target.value })}
                    style={{ fontSize: '0.8rem', padding: '0.5rem 2rem 0.5rem 1rem', height: '36px', minWidth: '180px', appearance: 'none', background: 'var(--bg-surface)', borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(245, 158, 11, 0.3)', boxShadow: 'var(--shadow-sm)' }}
                  >
                    <option value="Open">Open</option>
                    <option value="Under Investigation">Under Investigation</option>
                    <option value="Corrective Action Pending">Corrective Action Pending</option>
                    <option value="Closed">Closed</option>
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#f59e0b', pointerEvents: 'none' }} />
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={isSaving}
                  style={{ fontSize: '0.8rem', padding: '0 1rem', height: '36px', borderRadius: '8px', fontWeight: 600, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)', border: 'none', color: '#fff' }}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="bento-grid">
        {/* Left Column — Incident Summary + CoR Form */}
        <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Quick Incident Summary */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', fontWeight: 700, color: 'var(--fg-base)' }}>Linked Incident Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={{ padding: '0.4rem', background: 'var(--bg-subtle)', borderRadius: '6px', height: 'fit-content' }}>
                  <Clock size={14} style={{ color: 'var(--fg-muted)' }} />
                </div>
                <div>
                  <label className="overline" style={{ fontSize: '0.65rem' }}>Date of Incident</label>
                  <div style={{ fontSize: '0.85rem', color: 'var(--fg-base)', fontWeight: 500 }}>
                    {incident.date ? new Date(incident.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={{ padding: '0.4rem', background: 'var(--accent-light)', borderRadius: '6px', height: 'fit-content' }}>
                  <Briefcase size={14} style={{ color: 'var(--accent-fg)' }} />
                </div>
                <div>
                  <label className="overline" style={{ fontSize: '0.65rem' }}>Classification</label>
                  <div style={{ fontSize: '0.85rem', color: 'var(--accent-fg)', fontWeight: 500 }}>{incident.type || meta.label}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={{ padding: '0.4rem', background: 'var(--bg-subtle)', borderRadius: '6px', height: 'fit-content' }}>
                  <MapPin size={14} style={{ color: 'var(--fg-muted)' }} />
                </div>
                <div>
                  <label className="overline" style={{ fontSize: '0.65rem' }}>Branch / Location</label>
                  <div style={{ fontSize: '0.85rem', color: 'var(--fg-base)', fontWeight: 500 }}>{incident.branch_department || incident.location || 'N/A'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={{ padding: '0.4rem', background: `${meta.color}15`, borderRadius: '6px', height: 'fit-content' }}>
                  <FileText size={14} style={{ color: meta.color }} />
                </div>
                <div>
                  <label className="overline" style={{ fontSize: '0.65rem' }}>Category</label>
                  <div style={{ fontSize: '0.85rem', color: meta.color, fontWeight: 500 }}>{meta.label}</div>
                </div>
              </div>
            </div>
          </div>

          {/* CoR Form */}
          <div className="card" style={{ padding: '2rem', border: '1px solid rgba(245, 158, 11, 0.25)', background: 'rgba(245, 158, 11, 0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
              <div style={{ padding: '0.5rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', color: '#f59e0b' }}><AlertTriangle size={20} /></div>
              <h3 style={{ fontSize: '1.25rem', color: '#f59e0b', margin: 0, fontWeight: 800 }}>Chain of Responsibility (CoR) Log</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label className="overline">CoR Type</label>
                <input type="text" className="input-field" placeholder="e.g. Mass, Dimension, Load Restraint"
                  value={cor.cor_type} onChange={(e) => setCor({ ...cor, cor_type: e.target.value })} />
              </div>
              <div>
                <label className="overline">Company's Role</label>
                <input type="text" className="input-field" placeholder="e.g. Consignor, Packer, Loader"
                  value={cor.company_role} onChange={(e) => setCor({ ...cor, company_role: e.target.value })} />
              </div>
              <div>
                <label className="overline">CoR Risk Level</label>
                <select className="input-field" value={cor.cor_risk_level} onChange={(e) => setCor({ ...cor, cor_risk_level: e.target.value })}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Severe">Severe</option>
                </select>
              </div>
              <div>
                <label className="overline">CoR Incident Status</label>
                <select className="input-field" value={cor.cor_status} onChange={(e) => setCor({ ...cor, cor_status: e.target.value })}>
                  <option value="Open">Open</option>
                  <option value="Under Investigation">Under Investigation</option>
                  <option value="Corrective Action Pending">Corrective Action Pending</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="overline">CoR Assessment</label>
                <textarea className="input-field" style={{ minHeight: '100px' }} placeholder="Detailed assessment of CoR breach..."
                  value={cor.cor_assessment} onChange={(e) => setCor({ ...cor, cor_assessment: e.target.value })} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="overline">CoR Corrective Action</label>
                <textarea className="input-field" style={{ minHeight: '100px' }} placeholder="Actions taken to rectify the CoR breach..."
                  value={cor.cor_corrective_action} onChange={(e) => setCor({ ...cor, cor_corrective_action: e.target.value })} />
              </div>
              <div>
                <label className="overline">CoR Corrective Action Implemented?</label>
                <select className="input-field" value={cor.cor_action_implemented} onChange={(e) => setCor({ ...cor, cor_action_implemented: e.target.value })}>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', border: 'none', padding: '0.75rem 2rem', fontSize: '0.875rem', fontWeight: 700, borderRadius: '10px', boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)' }}
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save CoR Details'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar — Quick Info */}
        <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* CoR Risk Assessment Card */}
          <div className="card" style={{ padding: '1.5rem', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--fg-base)' }}>
              <Shield size={16} color="#f59e0b" /> CoR Risk Assessment
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="overline" style={{ fontSize: '0.6rem' }}>Risk Level</label>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.3rem 0.75rem', borderRadius: '20px',
                  fontSize: '0.8rem', fontWeight: 700,
                  background: cor.cor_risk_level === 'Severe' ? 'rgba(239,68,68,0.1)' :
                    cor.cor_risk_level === 'High' ? 'rgba(245,158,11,0.1)' :
                    cor.cor_risk_level === 'Medium' ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)',
                  color: cor.cor_risk_level === 'Severe' ? '#ef4444' :
                    cor.cor_risk_level === 'High' ? '#f59e0b' :
                    cor.cor_risk_level === 'Medium' ? '#3b82f6' : '#10b981',
                  border: `1px solid ${cor.cor_risk_level === 'Severe' ? 'rgba(239,68,68,0.3)' :
                    cor.cor_risk_level === 'High' ? 'rgba(245,158,11,0.3)' :
                    cor.cor_risk_level === 'Medium' ? 'rgba(59,130,246,0.3)' : 'rgba(16,185,129,0.3)'}`,
                }}>
                  <div style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: cor.cor_risk_level === 'Severe' ? '#ef4444' :
                      cor.cor_risk_level === 'High' ? '#f59e0b' :
                      cor.cor_risk_level === 'Medium' ? '#3b82f6' : '#10b981',
                  }} />
                  {cor.cor_risk_level}
                </div>
              </div>
              <div>
                <label className="overline" style={{ fontSize: '0.6rem' }}>CoR Type</label>
                <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--fg-base)' }}>{cor.cor_type || 'Not specified'}</div>
              </div>
              <div>
                <label className="overline" style={{ fontSize: '0.6rem' }}>Company's Role</label>
                <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--fg-base)' }}>{cor.company_role || 'Not specified'}</div>
              </div>
              <div>
                <label className="overline" style={{ fontSize: '0.6rem' }}>Corrective Action Implemented</label>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                  background: cor.cor_action_implemented === 'Yes' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  color: cor.cor_action_implemented === 'Yes' ? '#10b981' : '#ef4444',
                  border: `1px solid ${cor.cor_action_implemented === 'Yes' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                }}>
                  {cor.cor_action_implemented === 'Yes' ? '✓ Yes' : '✗ No'}
                </div>
              </div>
            </div>
          </div>

          {/* Linked Incident Card */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--fg-base)' }}>
              <FileText size={16} color="var(--accent-fg)" /> Linked Incident
            </h4>
            <Link
              to={`/incidents/${incident.id}`}
              state={{ source: 'incidents' }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem', borderRadius: '10px',
                background: 'var(--bg-subtle)', border: '1px solid var(--border-base)',
                textDecoration: 'none', transition: 'all 0.2s ease',
              }}
            >
              <div style={{ padding: '0.4rem', background: `${meta.color}15`, borderRadius: '8px', color: meta.color }}>
                <FileText size={16} />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--fg-base)' }}>{incident.incident_number_str || `INC-${incident.id}`}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--fg-muted)' }}>View full incident record →</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
