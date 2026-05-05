import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, Package, Users, HeartPulse, Lock, Shield, DollarSign } from 'lucide-react';
import { api } from '../services/api';

import CargoForm from './forms/CargoForm';
import HRForm from './forms/HRForm';
import WHSForm from './forms/WHSForm';
import ITForm from './forms/ITForm';
import RiskForm from './forms/RiskForm';
import FinanceForm from './forms/FinanceForm';

const FORM_META: Record<string, { label: string; icon: any; color: string; desc: string }> = {
  cargo: { label: 'Cargo & Equipment Incident', icon: Package, color: '#f59e0b', desc: 'Log cargo damage, theft, equipment failure and related events.' },
  hr: { label: 'Human Resources Incident', icon: Users, color: '#8b5cf6', desc: 'Report HR matters including misconduct, grievances, and policy breaches.' },
  whs: { label: 'WH&S Incident', icon: HeartPulse, color: '#ef4444', desc: 'Report workplace health, safety incidents, near misses, and injuries.' },
  it: { label: 'IT & Security Incident', icon: Lock, color: '#06b6d4', desc: 'Report cyber incidents, data breaches, outages, and unauthorised access.' },
  risk: { label: 'Risk & Compliance Incident', icon: Shield, color: '#10b981', desc: 'Report regulatory breaches, policy non-compliance, and sanctions violations.' },
  finance: { label: 'Finance Incident', icon: DollarSign, color: '#3b82f6', desc: 'Report financial incidents and travel disruption events.' },
};

export default function NewIncident() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const type = params.get('type') || '';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Incident submitted successfully. Redirecting…');

  const meta = FORM_META[type];

  const handleSubmit = async (data: any) => {
    setLoading(true);
    setError('');
    try {
      const files: File[] = data.files || [];
      const payload = {
        ...data,
        category: type,
        type: meta.label,
        location: data.location || data.location_of_incident || data.branch_department || 'N/A',
        description: data.description || data.incident_summary || 'N/A',
        job_number: data.system_job_number || data.job_number || '',
        // Ensure arrays are converted to strings for the backend schema
        corrective_actions: Array.isArray(data.corrective_actions) ? data.corrective_actions.join(', ') : data.corrective_actions,
        incident_types: Array.isArray(data.incident_types) ? data.incident_types.join(', ') : data.incident_types,
        claim_types: Array.isArray(data.claim_types) ? data.claim_types.join(', ') : data.claim_types,
      };
      delete payload.files;
      const response = await api.post('/incidents', payload);
      const incidentId = response.data.incident_id;
      if (files.length > 0) {
        for (const file of files) {
          const fd = new FormData();
          fd.append('file', file);
          await api.post(`/documents/incident/${incidentId}/upload`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
      }
      if (type === 'cargo') {
        try {
          console.log('Sending payload to Power Automate:', payload);
          const flowRes = await fetch('https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/465821937cf347c9b5eec4737d068fdd/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=ZUR4iYLZmuytbGXp0uaTvqXkvT927AsbYf9_RtJF2lE', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!flowRes.ok) {
            const errorText = await flowRes.text();
            console.error('Power Automate rejected the request:', flowRes.status, errorText);
            throw new Error(`Flow rejected with status ${flowRes.status}`);
          }

          console.log('Power Automate flow triggered successfully!');
          setSuccessMessage('Cargo & Equipment Incident registered successfully.');
        } catch (flowErr: any) {
          console.error('Power Automate Flow error:', flowErr);
          // Still show success for the incident creation, but alert about the flow failure in the console
          setSuccessMessage('Cargo & Equipment Incident registered successfully, but Flow trigger failed.');
        }
      } else {
        setSuccessMessage('Incident submitted successfully. Redirecting…');
      }

      setSuccess(true);
      setTimeout(() => navigate('/incidents'), 1800);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map((e: any) => `${e.loc[e.loc.length - 1].replace(/_/g, ' ')}: ${e.msg}`).join(' | '));
      } else {
        setError(detail || 'Failed to submit incident record. Please check all mandatory fields.');
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
          {Object.entries(FORM_META).map(([key, m]) => (
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

  /* ── Render selected form ─────────────────────────────────── */
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
      {type === 'cargo' && <CargoForm onSubmit={handleSubmit} onCancel={() => navigate('/incidents')} loading={loading} />}
      {type === 'hr' && <HRForm onSubmit={handleSubmit} onCancel={() => navigate('/incidents')} loading={loading} />}
      {type === 'whs' && <WHSForm onSubmit={handleSubmit} onCancel={() => navigate('/incidents')} loading={loading} />}
      {type === 'it' && <ITForm onSubmit={handleSubmit} onCancel={() => navigate('/incidents')} loading={loading} />}
      {type === 'risk' && <RiskForm onSubmit={handleSubmit} onCancel={() => navigate('/incidents')} loading={loading} />}
      {type === 'finance' && <FinanceForm onSubmit={handleSubmit} onCancel={() => navigate('/incidents')} loading={loading} />}
    </div>
  );
}
