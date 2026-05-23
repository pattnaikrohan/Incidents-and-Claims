import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Clock, MapPin, Briefcase, ChevronDown, Shield, AlertTriangle, Paperclip, UploadCloud, RefreshCw, Trash2, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { useIncidents } from '../hooks/useIncidents';
import { getIncidentCategory, CATEGORY_META } from '../utils/incidentRoles';
import { api } from '../services/api';
import { StructuredDescription } from '../components/StructuredDescription';

export default function CoRDetails() {
  const { id } = useParams();
  const { role } = useAuth();
  const { incidents } = useIncidents(0);
  const [incident, setIncident] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Attachment states
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (incidents.length > 0 && id) {
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
      } else {
        // If not in cache, we might still be loading
        setLoading(false);
      }
    }
  }, [incidents, id]);

  // Azure Document folder mapping and upload/delete handlers
  const getAzureFolderType = (inc: any): string => {
    if (!inc?.category) return 'General Incident';
    const map: Record<string, string> = {
      cargo: 'Cargo & Equipment Incident',
      hr: 'Human Resources Incident',
      whs: 'WH&S Incident',
      it: 'IT & Security Incident',
      risk: 'Risk & Compliance Incident',
      finance: 'Finance Incident',
      ncr: 'Non-Conformance Report (NCR)',
    };
    return map[inc.category] || 'General Incident';
  };

  const fetchAttachments = async () => {
    if (!incident) return;
    setIsRefreshing(true);
    try {
      const searchId = incident.incident_number_str || id;
      const folderType = getAzureFolderType(incident);
      const typeQuery = `?incident_type=${encodeURIComponent(folderType)}`;
      const response = await api.get(`/documents/incident/${searchId}/list${typeQuery}`);
      setAttachments(response.data.documents || response.data || []);
    } catch (err) {
      console.warn('Failed to refresh attachments:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleDeleteAttachment = async (filename: string) => {
    if (!incident) return;
    if (!window.confirm(`Are you sure you want to delete ${filename}?`)) return;
    setIsDeleting(filename);
    try {
      const searchId = incident.incident_number_str || id;
      const folderType = getAzureFolderType(incident);
      await api.delete(`/documents/incident/${searchId}/document?filename=${encodeURIComponent(filename)}&incident_type=${encodeURIComponent(folderType)}`);
      await fetchAttachments();
      showNotification('Attachment deleted successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to delete attachment.');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!incident) return;
    if (!event.target.files || event.target.files.length === 0) return;
    
    setIsUploading(true);
    const files = Array.from(event.target.files);
    
    try {
      const searchId = incident.incident_number_str || id;
      const folderType = getAzureFolderType(incident);
      const typeQuery = `?incident_type=${encodeURIComponent(folderType)}`;
      
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        await api.post(`/documents/incident/${searchId}/upload${typeQuery}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      
      await fetchAttachments();
      showNotification('Attachments uploaded successfully.');
    } catch (err) {
      console.error('Failed to upload files:', err);
      alert('Failed to upload files.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Fetch attachments once incident is resolved
  useEffect(() => {
    if (incident) {
      fetchAttachments();
    }
  }, [incident]);


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
      showNotification('✓ CoR details saved! Your updates are safely queued for background synchronization.');
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
      <div className="card fade-in" style={{
        position: 'relative', overflow: 'hidden', padding: '1.25rem 2rem', marginBottom: '2rem',
        background: 'linear-gradient(145deg, rgba(239, 68, 68, 0.1) 0%, var(--bg-surface) 100%)',
        border: '1px solid var(--border-base)',
        borderLeft: '4px solid #ef4444',
        boxShadow: '0 10px 30px -10px rgba(239, 68, 68, 0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2rem'
      }}>
        {/* Glow effect */}
        <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '50%', height: '200%', background: 'radial-gradient(ellipse at center, rgba(239, 68, 68, 0.25) 0%, transparent 70%)', transform: 'rotate(-25deg)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ padding: '0.6rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}><AlertTriangle size={24} /></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ width: 'fit-content', fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.6rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '20px', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CoR Compliance</span>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: 'var(--fg-base)', whiteSpace: 'nowrap' }}>{incident.incident_number_str || `INC-${incident.id}`}</h2>
            </div>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border-subtle)', backdropFilter: 'blur(10px)' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--fg-faint)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Incident Status</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: (incident?.status || '').includes('Closed') ? '#10b981' : '#3b82f6', boxShadow: `0 0 8px ${(incident?.status || '').includes('Closed') ? '#10b981' : '#3b82f6'}` }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--fg-base)' }}>{String(incident?.status || '')}</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0.75rem', background: 'rgba(239, 68, 68, 0.04)', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#ef4444', letterSpacing: '0.05em', textTransform: 'uppercase' }}>CoR Status</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cor.cor_status === 'Closed' ? '#10b981' : '#ef4444', boxShadow: `0 0 8px ${cor.cor_status === 'Closed' ? '#10b981' : '#ef4444'}` }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--fg-base)' }}>{cor.cor_status}</span>
            </div>
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

            {/* Description Narrative */}
            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 700, color: 'var(--fg-base)' }}>Incident Narrative</h3>
              <StructuredDescription description={incident.description} />
            </div>
          </div>

          {/* CoR Form */}
          <div className="card" style={{ padding: '2rem', border: '1px solid rgba(239, 68, 68, 0.25)', background: 'rgba(239, 68, 68, 0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
              <div style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', color: '#ef4444' }}><AlertTriangle size={20} /></div>
              <h3 style={{ fontSize: '1.25rem', color: '#ef4444', margin: 0, fontWeight: 800 }}>CoR Compliance Data</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label className="overline">CoR Type</label>
                <select className="input-field" value={cor.cor_type} onChange={(e) => setCor({ ...cor, cor_type: e.target.value })}>
                  <option value="">— Select —</option>
                  <option value="Fatigue Management">Fatigue Management</option>
                  <option value="Speed">Speed</option>
                  <option value="Mass">Mass</option>
                  <option value="Dimension">Dimension</option>
                  <option value="Load Restraint">Load Restraint</option>
                  <option value="Vehicle Standards">Vehicle Standards</option>
                  <option value="Driver Licensing">Driver Licensing</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="overline">Company's Role</label>
                <select className="input-field" value={cor.company_role} onChange={(e) => setCor({ ...cor, company_role: e.target.value })}>
                  <option value="">— Select —</option>
                  <option value="Consignor">Consignor</option>
                  <option value="Consignee">Consignee</option>
                  <option value="Prime Contractor">Prime Contractor</option>
                </select>
              </div>
              <div>
                <label className="overline">CoR Risk Level</label>
                <select className="input-field" value={cor.cor_risk_level} onChange={(e) => setCor({ ...cor, cor_risk_level: e.target.value })}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="overline">CoR Incident Status</label>
                <select className="input-field" value={cor.cor_status || ''} onChange={(e) => setCor({ ...cor, cor_status: e.target.value })}>
                  {cor.cor_status && ![
                    'Open',
                    'Under Investigation',
                    'Corrective Action Pending',
                    'Closed'
                  ].includes(cor.cor_status) && (
                    <option value={cor.cor_status}>{cor.cor_status}</option>
                  )}
                  <option value="">— Select Status —</option>
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
                  <option value="In Progress">In Progress</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', border: 'none', padding: '0.75rem 2rem', fontSize: '0.875rem', fontWeight: 700, borderRadius: '10px', boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)' }}
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar — Quick Info */}
        <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* CoR Risk Assessment Card */}
          <div className="card" style={{ padding: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--fg-base)' }}>
              <Shield size={16} color="#ef4444" /> CoR Risk Assessment
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

          {/* Supporting Evidence Vault */}
          <div className="card" style={{ padding: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-base)', paddingBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: 'var(--fg-base)' }}>
                <Paperclip size={16} color="#ef4444" /> Supporting Evidence
              </h4>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={fetchAttachments}
                  disabled={isRefreshing}
                  title="Refresh Attachments"
                  style={{ padding: '0.4rem', height: 'auto', background: 'var(--bg-subtle)', border: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <RefreshCw size={14} color={isRefreshing ? "#ef4444" : "var(--fg-muted)"} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', height: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'linear-gradient(135deg,#ef4444,#dc2626)', border: 'none', color: '#fff' }}
                >
                  <UploadCloud size={14} /> {isUploading ? '...' : 'Add'}
                </button>
              </div>
            </div>
            
            <input 
              type="file" 
              multiple 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileUpload} 
            />

            {attachments.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', textAlign: 'center', padding: '1rem 0' }}>
                No attachments uploaded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                {attachments.map((file: any, index: number) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border-base)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', maxWidth: '75%' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--fg-base)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.filename || file.name}>
                        {file.filename || file.name}
                      </span>
                      {file.size && (
                        <span style={{ fontSize: '0.65rem', color: 'var(--fg-muted)' }}>
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <a href={file.url} target="_blank" rel="noopener noreferrer" style={{ padding: '0.25rem', borderRadius: '4px', background: 'var(--bg-elevated)', color: 'var(--fg-muted)', border: '1px solid var(--border-base)', display: 'inline-flex', alignItems: 'center' }}>
                        <ExternalLink size={12} />
                      </a>
                      {['full_access', 'risk_compliance'].includes(role || '') && (
                        <button 
                          onClick={() => handleDeleteAttachment(file.filename || file.name)}
                          disabled={isDeleting === (file.filename || file.name)}
                          style={{ padding: '0.25rem', borderRadius: '4px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
