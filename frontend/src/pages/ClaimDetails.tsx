import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Clock, MapPin, Briefcase, ChevronDown, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { useIncidents } from '../hooks/useIncidents';
import { getIncidentCategory, CATEGORY_META } from '../utils/incidentRoles';

export default function ClaimDetails() {
  const { id } = useParams();
  const { role } = useAuth();
  const { incidents } = useIncidents(0);
  const [incident, setIncident] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [claim, setClaim] = useState({
    claim_reference: '', claim_date: '', claimant: '', claim_time_bar: '',
    claim_type: 'Cargo Damage', claim_direction: 'Inbound (Against Us)',
    claim_amount: '', paid_amount: '', insurance_paid: '', deductible: '',
    recovery_amount: '', outstanding_balance: '',
    writeoff_required: 'No', writeoff_amount: '', writeoff_approved_by: '', writeoff_date: '',
    claim_state: '', claim_status: 'Open',
  });

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Hydrate from cached incidents
  useEffect(() => {
    if (incidents.length > 0 && id) {
      const cached = incidents.find((i: any) =>
        i.id?.toString() === id || i.incident_number_str === id
      );
      if (cached) {
        setIncident(cached);
        setClaim(prev => ({
          claim_reference: cached.claim_reference || prev.claim_reference,
          claim_date: cached.claim_date || prev.claim_date,
          claimant: cached.claimant || prev.claimant,
          claim_time_bar: cached.claim_time_bar || prev.claim_time_bar,
          claim_type: cached.claim_type || prev.claim_type,
          claim_direction: cached.claim_direction || prev.claim_direction,
          claim_amount: cached.claim_amount || prev.claim_amount,
          paid_amount: cached.paid_amount || prev.paid_amount,
          insurance_paid: cached.insurance_paid || prev.insurance_paid,
          deductible: cached.deductible || prev.deductible,
          recovery_amount: cached.recovery_amount || prev.recovery_amount,
          outstanding_balance: cached.outstanding_balance || prev.outstanding_balance,
          writeoff_required: cached.writeoff_required || prev.writeoff_required,
          writeoff_amount: cached.writeoff_amount || prev.writeoff_amount,
          writeoff_approved_by: cached.writeoff_approved_by || prev.writeoff_approved_by,
          writeoff_date: cached.writeoff_date || prev.writeoff_date,
          claim_state: cached.claim_state || prev.claim_state,
          claim_status: cached.claim_status || prev.claim_status,
        }));
        setLoading(false);
      }
    }
  }, [incidents, id]);

  const PA_CLAIMS_SAVE_URL = 'https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/3bc5af8e02904409b61b7b389f73a591/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=Z0sD7CY2GhZLzteUBjeoiHFQiJYFb0PWbA4W6OkDXBU';

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        incident_id: incident.id,
        incident_number: incident.incident_number_str || `INC-${incident.id}`,
        ...claim,
      };
      const resp = await fetch(PA_CLAIMS_SAVE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error(`Flow responded with ${resp.status}`);
      showNotification('Claim details saved successfully.');
    } catch (err) {
      console.error('Claims save failed:', err);
      const all = JSON.parse(localStorage.getItem('pa_incidents_cache') || '[]');
      const idx = all.findIndex((i: any) => i.id?.toString() === id || i.incident_number_str === id);
      if (idx !== -1) { all[idx] = { ...all[idx], ...claim }; localStorage.setItem('pa_incidents_cache', JSON.stringify(all)); }
      showNotification('Claim details saved locally (flow sync pending).');
    } finally { setIsSaving(false); }
  };

  // Compute outstanding balance dynamically
  const computedBalance = (parseFloat(claim.claim_amount || '0') - parseFloat(claim.paid_amount || '0') - parseFloat(claim.insurance_paid || '0') - parseFloat(claim.recovery_amount || '0') + parseFloat(claim.deductible || '0')).toFixed(2);

  if (loading || !incident) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--fg-muted)' }}>Loading Claim Record...</div>;

  const category = getIncidentCategory(incident);
  const meta = CATEGORY_META[category];
  const inp = (key: string, label: string, type = 'text', placeholder = '') => (
    <div><label className="overline">{label}</label>
      <input type={type} className="input-field" placeholder={placeholder}
        value={(claim as any)[key]} onChange={e => setClaim({ ...claim, [key]: e.target.value })} />
    </div>
  );

  return (
    <div className="fade-in">
      {successMessage && (
        <div style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999, background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', padding: '1rem 1.5rem', borderRadius: '12px', boxShadow: '0 10px 30px rgba(16,185,129,0.3)', fontWeight: 600, fontSize: '0.875rem', animation: 'fadeIn 0.3s ease' }}>
          ✓ {successMessage}
        </div>
      )}

      <Link to="/claims" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#3b82f6', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        <ArrowLeft size={16} /> Back to Claims Register
      </Link>

      {/* Hero Header */}
      <div className="card" style={{ position: 'relative', overflow: 'hidden', padding: '2.5rem', marginBottom: '2rem', background: 'linear-gradient(145deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)', border: '1px solid var(--border-base)', boxShadow: '0 20px 40px -20px rgba(0,0,0,0.15)' }}>
        <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '50%', height: '200%', background: 'radial-gradient(ellipse at center, rgba(239,68,68,0.12) 0%, transparent 70%)', transform: 'rotate(-25deg)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '2rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <div style={{ padding: '0.5rem', background: 'rgba(239,68,68,0.1)', borderRadius: '10px', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}><DollarSign size={22} /></div>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>{incident.incident_number_str || `INC-${incident.id}`}</h2>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '20px', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Claims Log</span>
            </div>
            <p style={{ fontSize: '0.95rem', color: 'var(--fg-muted)', maxWidth: '700px', lineHeight: 1.6, margin: 0 }}>{incident.description || 'No description provided'}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-end', minWidth: '280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--fg-faint)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Incident Status</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: (incident.status || '').includes('Closed') ? '#10b981' : '#3b82f6' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{incident.status || 'Open'}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.04)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#ef4444', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Claim Status</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: claim.claim_status === 'Closed' ? '#10b981' : '#ef4444' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{claim.claim_status}</span>
              </div>
            </div>
            {['full_access', 'risk_compliance'].includes(role || '') && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <select className="input-field" value={claim.claim_status} onChange={e => setClaim({ ...claim, claim_status: e.target.value })}
                    style={{ fontSize: '0.8rem', padding: '0.5rem 2rem 0.5rem 1rem', height: 36, minWidth: 160, appearance: 'none', borderRadius: 8, cursor: 'pointer', border: '1px solid rgba(239,68,68,0.3)' }}>
                    <option value="Open">Open</option><option value="In Progress">In Progress</option><option value="Closed">Closed</option>
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#ef4444', pointerEvents: 'none' }} />
                </div>
                <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}
                  style={{ fontSize: '0.8rem', padding: '0 1rem', height: 36, borderRadius: 8, fontWeight: 600, background: 'linear-gradient(135deg,#ef4444,#dc2626)', border: 'none', color: '#fff' }}>
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bento-grid">
        <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Incident Summary */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', fontWeight: 700 }}>Linked Incident Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {[
                { icon: <Clock size={14} />, bg: 'var(--bg-subtle)', label: 'Date of Incident', value: incident.date ? new Date(incident.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A' },
                { icon: <Briefcase size={14} />, bg: 'var(--accent-light)', label: 'Classification', value: incident.type || meta.label, color: 'var(--accent-fg)' },
                { icon: <MapPin size={14} />, bg: 'var(--bg-subtle)', label: 'Branch / Location', value: incident.branch_department || incident.location || 'N/A' },
                { icon: <FileText size={14} />, bg: `${meta.color}15`, label: 'Category', value: meta.label, color: meta.color },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ padding: '0.4rem', background: item.bg, borderRadius: 6, height: 'fit-content' }}>{item.icon}</div>
                  <div><label className="overline" style={{ fontSize: '0.65rem' }}>{item.label}</label><div style={{ fontSize: '0.85rem', fontWeight: 500, color: item.color || 'var(--fg-base)' }}>{item.value}</div></div>
                </div>
              ))}
            </div>
          </div>

          {/* Claims Form */}
          <div className="card" style={{ padding: '2rem', border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
              <div style={{ padding: '0.5rem', background: 'rgba(239,68,68,0.1)', borderRadius: 8, color: '#ef4444' }}><DollarSign size={20} /></div>
              <h3 style={{ fontSize: '1.25rem', color: '#ef4444', margin: 0, fontWeight: 800 }}>Claims Log Details</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {inp('claim_reference', 'Claim Reference Number', 'text', 'e.g. CLM-2024-001')}
              {inp('claim_date', 'Date of Claim', 'date')}
              {inp('claimant', 'Claimant', 'text', 'Search claimant...')}
              {inp('claim_time_bar', 'Time Bar', 'date')}
              <div><label className="overline">Claim Type</label>
                <select className="input-field" value={claim.claim_type} onChange={e => setClaim({ ...claim, claim_type: e.target.value })}>
                  <option>Cargo Damage</option><option>Theft</option><option>Other</option>
                </select>
              </div>
              <div><label className="overline">Claim Direction</label>
                <select className="input-field" value={claim.claim_direction} onChange={e => setClaim({ ...claim, claim_direction: e.target.value })}>
                  <option>Inbound (Against Us)</option><option>Outbound (By Us)</option>
                </select>
              </div>
              {inp('claim_amount', 'Claim Amount (AUD)', 'number')}
              {inp('paid_amount', 'Paid Amount (AUD)', 'number')}
              {inp('insurance_paid', 'Insurance Paid Amount (AUD)', 'number')}
              {inp('deductible', 'Deductible (AUD)', 'number')}
              {inp('recovery_amount', 'Recovery Amount (AUD)', 'number')}
              <div><label className="overline">Outstanding Balance (AUD)</label>
                <input type="number" className="input-field" disabled value={computedBalance} style={{ opacity: 0.7 }} />
              </div>
              <div><label className="overline">Write-Off Required</label>
                <select className="input-field" value={claim.writeoff_required} onChange={e => setClaim({ ...claim, writeoff_required: e.target.value })}>
                  <option>No</option><option>Yes</option>
                </select>
              </div>
              {inp('writeoff_amount', 'Write-Off Amount (AUD)', 'number')}
              {inp('writeoff_approved_by', 'Write-Off Approved By', 'text', 'User / Role')}
              {inp('writeoff_date', 'Write-Off Date', 'date')}
              {inp('claim_state', 'Claim State', 'text', 'Outcome or decision')}
              <div><label className="overline">Claim Status</label>
                <select className="input-field" value={claim.claim_status} onChange={e => setClaim({ ...claim, claim_status: e.target.value })}>
                  <option>Open</option><option>In Progress</option><option>Closed</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}
                style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', border: 'none', padding: '0.75rem 2rem', fontSize: '0.875rem', fontWeight: 700, borderRadius: 10, boxShadow: '0 4px 14px rgba(239,68,68,0.35)' }}>
                {isSaving ? 'Saving...' : 'Save Claim Details'}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem', border: '1px solid rgba(239,68,68,0.2)' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><DollarSign size={16} color="#ef4444" /> Claim Summary</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { label: 'Claim Amount', value: claim.claim_amount ? `AUD $${parseFloat(claim.claim_amount).toLocaleString()}` : 'Not set', color: '#ef4444' },
                { label: 'Paid Amount', value: claim.paid_amount ? `AUD $${parseFloat(claim.paid_amount).toLocaleString()}` : '$0' },
                { label: 'Outstanding', value: `AUD $${parseFloat(computedBalance).toLocaleString()}`, color: parseFloat(computedBalance) > 0 ? '#ef4444' : '#10b981' },
              ].map((item, i) => (
                <div key={i}><label className="overline" style={{ fontSize: '0.6rem' }}>{item.label}</label>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: item.color || 'var(--fg-base)' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={16} color="var(--accent-fg)" /> Linked Incident</h4>
            <Link to={`/incidents/${incident.id}`} state={{ source: 'incidents' }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: 10, background: 'var(--bg-subtle)', border: '1px solid var(--border-base)', textDecoration: 'none' }}>
              <div style={{ padding: '0.4rem', background: `${meta.color}15`, borderRadius: 8, color: meta.color }}><FileText size={16} /></div>
              <div><div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--fg-base)' }}>{incident.incident_number_str || `INC-${incident.id}`}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--fg-muted)' }}>View full incident record →</div></div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
