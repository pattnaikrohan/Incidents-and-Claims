import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { DEFAULT_STATUSES } from '../utils/incidentConstants';
import { ArrowLeft, Package, Users, HeartPulse, Lock, Shield, DollarSign, FileWarning } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

import CargoForm from './forms/CargoForm';
import HRForm from './forms/HRForm';
import WHSForm from './forms/WHSForm';
import ITForm from './forms/ITForm';
import RiskForm from './forms/RiskForm';
import FinanceForm from './forms/FinanceForm';
import NCRForm from './forms/NCRForm';

import { useIncidents } from '../hooks/useIncidents';

const FORM_META: Record<string, { label: string; icon: any; color: string; desc: string; prefix: string }> = {
  cargo: { label: 'Cargo & Equipment Incident', icon: Package, color: '#f59e0b', desc: 'Log cargo damage, theft, equipment failure and related events.', prefix: 'INC' },
  hr: { label: 'Human Resources Incident', icon: Users, color: '#8b5cf6', desc: 'Report HR matters including misconduct, grievances, and policy breaches.', prefix: 'INC' },
  whs: { label: 'WH&S Incident', icon: HeartPulse, color: '#ef4444', desc: 'Report workplace health, safety incidents, near misses, and injuries.', prefix: 'INC' },
  it: { label: 'IT & Security Incident', icon: Lock, color: '#06b6d4', desc: 'Report cyber incidents, data breaches, outages, and unauthorised access.', prefix: 'INC' },
  risk: { label: 'Risk & Compliance Incident', icon: Shield, color: '#10b981', desc: 'Report regulatory breaches, policy non-compliance, and sanctions violations.', prefix: 'INC' },
  finance: { label: 'Finance Incident', icon: DollarSign, color: '#3b82f6', desc: 'Report financial incidents and travel disruption events.', prefix: 'INC' },
  ncr: { label: 'Non-Conformance Report (NCR)', icon: FileWarning, color: '#eab308', desc: 'Log non-conformance reports, process failures, and defects.', prefix: 'NCR' },
};

export default function NewIncident() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { incidents, loading: incidentsLoading } = useIncidents(0); // No polling needed here, just the list
  const [params] = useSearchParams();
  const type = params.get('type') || '';
  const draftId = params.get('draftId') || '';
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Incident submitted successfully. Redirecting…');

  const meta = FORM_META[type];
  
  // Load existing draft data if draftId is present
  const draftData = useMemo(() => {
    if (!draftId) return null;
    return incidents.find(i => i.id === draftId || i.incident_id === draftId || i.incident_number_str === draftId);
  }, [draftId, incidents]);

  // Generate a sticky ID so it doesn't change while the user is filling out the form
  const [stickyId, setStickyId] = useState('');

  const calculatedNextId = useMemo(() => {
    if (!meta) return '';
    const prefix = meta.prefix;
    const relatedIds = incidents
      .map(i => i.incident_number_str || '')
      .filter(id => id.startsWith(prefix + '-'))
      .map(id => {
        const parts = id.split('-');
        const seqStr = parts[1];
        const seq = parseInt(seqStr, 10);
        if (!isNaN(seq)) return seq;
        const b36 = parseInt(seqStr, 36);
        return isNaN(b36) ? 0 : b36;
      });
    
    const maxSeq = relatedIds.length > 0 ? Math.max(...relatedIds) : 0;
    return `${prefix}-${(maxSeq + 1).toString().padStart(6, '0')}`;
  }, [meta, incidents]);

  // Set stickyId once we have a calculated ID and haven't set it yet
  useEffect(() => {
    if (calculatedNextId && !stickyId) {
      setStickyId(calculatedNextId);
    }
  }, [calculatedNextId, stickyId]);

  // Reset stickyId if type changes
  useEffect(() => {
    setStickyId('');
  }, [type]);

  const handleSubmit = async (data: any, isDraft = false) => {
    setLoading(true);
    setError('');
    try {
      const files: File[] = data.files || [];
      // Helper to ensure dates are in ISO 8601 (YYYY-MM-DD) for Power Automate
      const formatToISO = (val: any) => {
        if (!val || typeof val !== 'string') return val;
        // Check if DD/MM/YYYY
        const parts = val.split('/');
        if (parts.length === 3 && parts[0].length <= 2) {
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        return val;
      };

      const currentIncidentId = (data.incident_id && !data.incident_id.includes('PENDING')) 
        ? data.incident_id 
        : (stickyId || calculatedNextId || `${meta.prefix}-${Date.now()}`);

      const basePayload = { ...data };
      const autoMappedPayload: any = {};
      Object.keys(basePayload).forEach(key => {
        if (!key.startsWith('cr991_')) {
          const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
          autoMappedPayload[`cr991_${cleanKey}`] = basePayload[key];
        }
      });

      const payload = {
        ...autoMappedPayload,
        ...data,
        incident_id: currentIncidentId,
        incident_ref: currentIncidentId,
        // Add explicit cr991 keys to help Power Automate mapping
        cr991_incidentid: currentIncidentId,
        cr991_incidentref: currentIncidentId,
        cr991_number: currentIncidentId,
        cr991_name: currentIncidentId,
        cr991_hrid: currentIncidentId,
        cr991_whsid: currentIncidentId,
        cr991_ncrref: currentIncidentId,
        // Explicit NCR OData Mapping
        ...(type === 'ncr' ? {
          cr991_entity: data.entity || '',
          cr991_businessunitbu: data.business_unit || '',
          cr991_branch: data.branch_department || '',
          cr991_levelofnonconformity: data.level_of_nonconformity || '',
          cr991_identificationofnc: data.identification || '',
          cr991_identifiedby: data.identified_by || '',
          cr991_atfaultparty: data.at_fault_party || '',
          cr991_notify: data.notify || '',
          cr991_descriptionofnc: data.description || '',
          cr991_immediatecontainmentaction: data.containment || '',
          cr991_relatedrecordreference: data.related_record || '',
        } : {}),
        category: type,
        type: meta.label,
        status: isDraft ? 'Draft' : (DEFAULT_STATUSES[type] || 'Open - New'),
        is_draft: isDraft, // Explicit flag for Power Automate
        location: data.location || data.location_of_incident || data.branch_department || 'N/A',
        description: data.description || data.incident_summary || 'N/A',
        job_number: data.system_job_number || data.job_number || '',
        // Format common date fields
        date_of_incident: formatToISO(data.date_of_incident),
        date_reported: formatToISO(data.date_reported),
        // Ensure arrays are converted to strings for the backend schema
        corrective_actions: Array.isArray(data.corrective_actions) ? data.corrective_actions.join('; ') : data.corrective_actions,
        incident_types: Array.isArray(data.incident_types) ? data.incident_types.join('; ') : (data.incident_types || data.incident_type),
        claim_types: Array.isArray(data.claim_types) ? data.claim_types.join('; ') : data.claim_types,
        // Explicit mappings for Power Automate logical names
        cr991_incidenttype: Array.isArray(data.incident_types) ? data.incident_types.join('; ') : (data.incident_types || data.incident_type),
        cr991_immediatecorrectiveaction: Array.isArray(data.corrective_actions) ? data.corrective_actions.join('; ') : data.corrective_actions,
        cr991_intenttoclaimissued: Array.isArray(data.claim_types) ? data.claim_types.join('; ') : data.claim_types,
        cr991_intenttoclaim: Array.isArray(data.claim_types) ? data.claim_types.join('; ') : data.claim_types,
        intent_to_claim: Array.isArray(data.claim_types) ? data.claim_types.join('; ') : data.claim_types,
        cr991_incidentsummary: data.incident_summary || data.description || 'N/A',
        cr991_shippinglineairline: data.carrier || '',
        cr991_branchdepartment: data.branch_department || '',
      };
      delete payload.files;
      
      // Still call our local API for DB storage, but Power Automate is the source of truth for the Digital Twin
      const response = await api.post('/incidents', payload);
      const incidentId = response.data.incident_id;
      
      if (files.length > 0) {
        // Map category to exact Azure Blob Storage folder name
        const FOLDER_MAP: Record<string, string> = {
          cargo: 'Cargo & Equipment Incident',
          hr: 'Human Resources Incident',
          whs: 'WH&S Incident',
          it: 'IT & Security Incident',
          risk: 'Risk & Compliance Incident',
          finance: 'Finance Incident',
          ncr: 'Non-Conformance Report (NCR)',
        };
        const folderType = FOLDER_MAP[type] || 'General Incident';
        const typeQuery = `?incident_type=${encodeURIComponent(folderType)}`;
        
        for (const file of files) {
          const fd = new FormData();
          fd.append('file', file);
          await api.post(`/documents/incident/${incidentId}/upload${typeQuery}`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
      }
      
      try {
        console.log(`Sending ${isDraft ? 'DRAFT' : 'FINAL'} payload to Power Automate:`, payload);
        const NCR_FLOW_URL = 'https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/6052791d58f14461b7056e1c63a0183f/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=cdTd3jGh8msQCVrZRvMYwQlmrH_nsY5i1gsBVoyk7UI';
        const DEFAULT_FLOW_URL = 'https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/465821937cf347c9b5eec4737d068fdd/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=ZUR4iYLZmuytbGXp0uaTvqXkvT927AsbYf9_RtJF2lE';
        
        const flowUrl = type === 'ncr' ? NCR_FLOW_URL : DEFAULT_FLOW_URL;

        const SECOND_FLOW_URLS: Record<string, string> = {
          cargo: "https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/0c5f5f199a074052a016140e9e59e340/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=FqRLriIAD6uEA992WLcvUWpgSfTZQN9FP73fh8VPZzA",
          hr: "https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/af85b57e12a647229b719170294ca651/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=Rd-ilbxg-nwxWtKNBn7tJsvG6I1dCYsrtpINMxPmPlg",
          it: "https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/21128bcf4700413a978abf59c3d9050e/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=Xg0Z43MxgeZVJ0yfn-ww6WST8E2j4cKEAZmbo520dvM",
          whs: "https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/165d300d1b8747c3b1c342fef18c95d1/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=R4T37PFyf2OBCC7I-gH0jfz_0or790d4MBhCnRp7J_A",
          risk: "https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/a79b0116d763426a9a187eed7ec49bed/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=wf8IFhj5cjvorr9kod89JtZy2qnD9rgACxl2Kkb2V4o",
          finance: "https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/9e46cb8be02e4e2e86395a60859b72a7/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=8AJzpSAb2mhwC3V9ZI3GRgD8rC_YgEI5J-ZkBp-2OGk"
        };
        const secondFlowUrl = SECOND_FLOW_URLS[type];

        const flowPromises = [
          fetch(flowUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
        ];

        if (secondFlowUrl) {
          flowPromises.push(
            fetch(secondFlowUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            })
          );
        }

        const responses = await Promise.all(flowPromises);
        const flowRes = responses[0];
        let secondFlowRes = responses.length > 1 ? responses[1] : null;

        if (!flowRes.ok) {
          if (flowRes.status === 502) {
             console.warn('Power Automate returned 502 NoResponse.');
             setSuccessMessage(`${meta.label} ${isDraft ? 'Draft' : ''} registered. (Note: Workflow triggered but returned no response).`);
          } else {
             const errorText = await flowRes.text();
             console.error('Power Automate rejected the request:', flowRes.status, errorText);
             throw new Error(`Flow rejected with status ${flowRes.status}`);
          }
        } else {
          console.log('Power Automate flow triggered successfully!');
          let extraMsg = '';
          
          if (secondFlowRes && secondFlowRes.ok) {
            try {
              // Parse response which should contain incident_id and status
              const responseData = await secondFlowRes.json();
              console.log("Second flow response:", responseData);
              if (responseData.incident_id || responseData.status) {
                  extraMsg = ` (Incident ID: ${responseData.incident_id || payload.incident_id}, Status: ${responseData.status || 'Received'})`;
              }
            } catch (err) {
              console.warn("Failed to parse second flow response as JSON", err);
            }
          }
          
          setSuccessMessage(`${meta.label} ${isDraft ? 'Draft' : ''} registered and workflow triggered successfully.${extraMsg}`);
        }
      } catch (flowErr: any) {
        console.error('Power Automate Flow error:', flowErr);
        setSuccessMessage(`${meta.label} ${isDraft ? 'Draft' : ''} registered successfully, but workflow trigger failed.`);
      }

      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => {
        const isManager = ['full_access', 'risk_compliance', 'bu_access', 'branch_access'].includes(role || '');
        if (isDraft || isManager) {
          if (isDraft) {
            // Add to local draft registry to force it into the Drafts tab even if backend returns 'Open'
            const draftRegistry = JSON.parse(localStorage.getItem('incident_draft_registry') || '[]');
            const currentId = data.incident_id || stickyId;
            if (currentId && !draftRegistry.includes(currentId)) {
              draftRegistry.push(currentId);
              localStorage.setItem('incident_draft_registry', JSON.stringify(draftRegistry));
            }
          } else {
            // Full submission - remove from draft registry if it exists
            const draftRegistry = JSON.parse(localStorage.getItem('incident_draft_registry') || '[]');
            const currentId = data.incident_id;
            if (currentId) {
              const filtered = draftRegistry.filter((id: string) => id !== currentId);
              localStorage.setItem('incident_draft_registry', JSON.stringify(filtered));
            }
          }
          navigate('/incidents');
        } else {
          navigate('/incidents/new');
          window.location.reload();
        }
      }, 1800);
    } catch (err: any) {
      if (isDraft) {
        setError('Failed to save draft. Even drafts require basic system connectivity.');
      } else {
        if (err.code === 'ERR_NETWORK' || !err.response) {
          setError('Network Error: Could not connect to the backend server. Please ensure the backend API is running.');
        } else {
          const detail = err.response?.data?.detail;
          if (Array.isArray(detail)) {
            setError(detail.map((e: any) => `${e.loc[e.loc.length - 1].replace(/_/g, ' ')}: ${e.msg}`).join(' | '));
          } else {
            setError(detail || 'Failed to submit incident record. Please check all mandatory fields.');
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };
  /* deploy
    /* ── Type selector (when no type chosen) ─────────────────── */
  if (!meta) {
    return (
      <div className="fade-in">
        <Link to="/incidents" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)', textDecoration: 'none', marginBottom: '2rem', fontSize: '0.875rem', fontWeight: 500 }}>
          <ArrowLeft size={16} /> Back to Incidents
        </Link>
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.12em', color: 'var(--accent-fg)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Select Category</div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>New Incident Report</h2>
          <p style={{ color: 'var(--fg-muted)' }}>Choose the type of incident to log the correct form.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.25rem' }}>
          {Object.entries(FORM_META)
            .filter(([key]) => key !== 'ncr' || ['branch_access', 'bu_access', 'risk_compliance', 'full_access'].includes(role || ''))
            .map(([key, m]) => (
            <Link
              key={key}
              to={`/incidents/new?type=${key}`}
              style={{ textDecoration: 'none', display: 'flex' }}
            >
              <div style={{
                padding: '1.75rem', borderRadius: 14, border: '1px solid var(--border-base)',
                background: 'var(--bg-elevated)', cursor: 'pointer', transition: 'all 0.2s ease',
                display: 'flex', flexDirection: 'column', gap: '1rem',
                boxShadow: 'var(--shadow-sm)', width: '100%', height: 'auto', minHeight: '100%'
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = m.color;
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 0 1px ${m.color}40, var(--shadow-md)`;
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-base)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)';
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${m.color}15`, border: `1px solid ${m.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.color }}>
                  <m.icon size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--fg-base)', marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--fg-muted)', lineHeight: 1.5 }}>{m.desc}</div>
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: m.color, marginTop: 'auto' }}>Open Form →</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // Wait for incidents to load to ensure ID generation is accurate and draft data is available
  if (incidentsLoading) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ marginBottom: '1rem' }}></div>
          <p style={{ color: 'var(--fg-faint)', fontWeight: 500 }}>
            {draftId ? 'Resuming your draft...' : 'Synchronizing registry...'}
          </p>
        </div>
      </div>
    );
  }

  const Icon = meta.icon;
  return (
    <div className="fade-in" style={{ paddingBottom: '4rem' }}>
      <Link to="/incidents/new" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)', textDecoration: 'none', marginBottom: '2rem', fontSize: '0.875rem', fontWeight: 500 }}>
        <ArrowLeft size={16} /> Back to Category Selection
      </Link>

      {/* Header */}
      <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-base)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '0.625rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `${meta.color}15`, border: `1px solid ${meta.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: meta.color }}>
            <Icon size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em', color: meta.color, textTransform: 'uppercase', marginBottom: 2 }}>New Incident Report</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>{meta.label}</h2>
          </div>
        </div>
        <p style={{ color: 'var(--fg-muted)', fontSize: '0.875rem' }}>{meta.desc}</p>
      </div>

      {/* Success */}
      {success && (
        <div style={{ padding: '1.25rem', background: 'var(--success-bg)', border: '1px solid var(--success)', borderRadius: 10, color: 'var(--success-fg)', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          ✓ {successMessage}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: '1.25rem', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 12, color: 'var(--danger-fg)', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 4px 12px rgba(239,68,68,0.1)'
        }} className="fade-in">
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--danger-fg)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, flexShrink: 0 }}>!</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2, opacity: 0.8 }}>Validation Error</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.4 }}>{error}</div>
          </div>
          <button onClick={() => setError('')} style={{ background: 'transparent', border: 'none', color: 'var(--danger-fg)', cursor: 'pointer', padding: 4, opacity: 0.6 }}>✕</button>
        </div>
      )}

      {/* Dynamic Form */}
      {type === 'cargo' && <CargoForm onSubmit={handleSubmit} onCancel={() => navigate('/incidents')} loading={loading} incident_id={stickyId || calculatedNextId} initialData={draftData} />}
      {type === 'hr' && <HRForm onSubmit={handleSubmit} onCancel={() => navigate('/incidents')} loading={loading} incident_id={stickyId || calculatedNextId} initialData={draftData} />}
      {type === 'whs' && <WHSForm onSubmit={handleSubmit} onCancel={() => navigate('/incidents')} loading={loading} incident_id={stickyId || calculatedNextId} initialData={draftData} />}
      {type === 'it' && <ITForm onSubmit={handleSubmit} onCancel={() => navigate('/incidents')} loading={loading} incident_id={stickyId || calculatedNextId} initialData={draftData} />}
      {type === 'risk' && <RiskForm onSubmit={handleSubmit} onCancel={() => navigate('/incidents')} loading={loading} incident_id={stickyId || calculatedNextId} initialData={draftData} />}
      {type === 'finance' && <FinanceForm onSubmit={handleSubmit} onCancel={() => navigate('/incidents')} loading={loading} incident_id={stickyId || calculatedNextId} initialData={draftData} />}
      {type === 'ncr' && <NCRForm onSubmit={handleSubmit} onCancel={() => navigate('/incidents')} loading={loading} incident_id={stickyId || calculatedNextId} initialData={draftData} />}
    </div>
  );
}
