import { useState, useEffect } from 'react';
import { Package, UploadCloud, X, FileText } from 'lucide-react';
import { CurrencyInput } from '../../components/CurrencyInput';
import { BUSINESS_UNITS, BRANCH_MAPPING } from '../../constants/branches';

function today() {
  return new Date().toLocaleDateString('en-AU');
}

const INCIDENT_TYPES = [
  'Abandoned Cargo', 'Cargo Damage', 'Cargo Theft', 'Container Seal Breach',
  'Dangerous Goods Breach', 'Equipment Damage', 'Equipment Failure',
  'Lost or Missing Cargo', 'Lost or Missing Equipment', 'Mislabelling or Misrouting',
  'Temperature Excursion', 'Vessel Damage'
];
const CORRECTIVE_ACTIONS = [
  'Cargo placed on hold / quarantine', 'Movement stopped pending assessment',
  'Reefer settings corrected', 'Alternate storage arranged', 'Damaged packaging secured',
  'Emergency response initiated', 'Carrier / depot notified', 'Customer notified',
  'Surveyor appointed', 'Temporary repair completed', 'Evidence preserved (photos, logs, seals)',
  'Cargo segregated', 'Safety controls implemented'
];
const CLAIM_TYPES = [
  'Customer intent to claim against company (Supporting Evidence required)',
  'Company intent to claim against supplier (Supporting Evidence required)',
  'Company intent to claim against customer (Supporting Evidence required)'
];

interface Props { onSubmit?: (data: any, isDraft?: boolean) => void; onCancel?: () => void; loading?: boolean; initialData?: any; readOnly?: boolean; incident_id?: string; }

const Field = ({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) => (
  <div>
    <label className="overline">{label}{req && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}</label>
    {children}
  </div>
);

export default function CargoForm({ onSubmit, onCancel, loading, initialData, readOnly, incident_id }: Props) {
  const [f, setF] = useState<any>(() => {
    const stableId = initialData?.incident_id || initialData?.incident_number_str || incident_id || 'CEI-PENDING';

    if (initialData) {
      return {
        ...initialData,
        incident_id: stableId,
        short_description: initialData.short_description || initialData.description || initialData.incident_summary || '',
        description: initialData.description || initialData.short_description || initialData.incident_summary || '',
        date_of_incident: initialData.date_of_incident || initialData.date || '',
        system_job_number: initialData.system_job_number || initialData.job_number || '',
        cargo_value: initialData.cargo_value || initialData.value || '',
        location_of_incident: initialData.location_of_incident || initialData.location || '',
        customer: initialData.customer || initialData.customer_name || '',
        date_logged: initialData.date_logged || initialData.date || today(),
        date_reported: initialData.date_reported || initialData.date_logged || initialData.date || today(),
        logged_by: initialData.logged_by || 'System User',
        scope_of_work: initialData.scope_of_work || '',
        scope_of_work_other: '',
        role_performed: initialData.role_performed || '',
        root_cause: initialData.root_cause || '',
        claim_estimate: initialData.claim_estimate || initialData.value || '',
        business_unit: initialData.business_unit || '',
        branch_department: initialData.branch_department || '',
        mode: initialData.mode || '',
        cargo_description: initialData.cargo_description || '',
        container_numbers: initialData.container_numbers || '',
        origin: initialData.origin || '',
        destination: initialData.destination || '',
        origin_agent: initialData.origin_agent || '',
        destination_agent: initialData.destination_agent || '',
        carrier: initialData.carrier || '',
        coloader: initialData.coloader || '',
        transport_company: initialData.transport_company || '',
        incident_summary: initialData.incident_summary || initialData.description || '',
        mbl_mawb_issued: initialData.mbl_mawb_issued || 'N/A',
        mbl_mawb_number: initialData.mbl_mawb_number || '',
        hbl_hawb_issued: initialData.hbl_hawb_issued || 'N/A',
        hbl_hawb_number: initialData.hbl_hawb_number || '',
      };
    }
    return {
      incident_id: stableId,
      short_description: '', date_of_incident: '', date_logged: today(),
      logged_by: localStorage.getItem('role') || 'Current User',
      business_unit: '', branch_department: '', system_job_number: '',
      mbl_mawb_issued: 'Yes', hbl_hawb_issued: 'Yes',
      mbl_mawb_number: '', hbl_hawb_number: '',
      customer: '', container_numbers: '', origin: '', destination: '',
      mode: 'Sea', cargo_description: '', cargo_value: '',
      location_of_incident: '', origin_agent: '', destination_agent: '',
      carrier: '', coloader: '', transport_company: '',
      scope_of_work: '', scope_of_work_other: '', role_performed: '',
      incident_summary: '', root_cause: '', claim_estimate: '',
    };
  });

  // Keep ID in sync if it arrives late from parent (only if we don't have a real one yet)
  useEffect(() => {
    const isPending = !f.incident_id || f.incident_id.includes('PENDING');
    if (incident_id && !initialData && isPending && f.incident_id !== incident_id) {
      upd('incident_id', incident_id);
    }
  }, [incident_id, initialData, f.incident_id]);
  const parseMultiSelect = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      // Dataverse multi-select uses '; ' separator, but frontend uses ', '
      return val.split(/[;,]\s*/).map((s: string) => s.trim()).filter(Boolean);
    }
    return [];
  };

  const [incidentTypes, setIncidentTypes] = useState<string[]>(
    parseMultiSelect(initialData?.incident_types)
  );
  const [correctiveActions, setCorrectiveActions] = useState<string[]>(
    parseMultiSelect(initialData?.corrective_actions)
  );
  const [claimTypes, setClaimTypes] = useState<string[]>(
    parseMultiSelect(initialData?.claim_types)
  );
  const [files, setFiles] = useState<File[]>([]);

  const upd = (k: string, v: string) => setF((p: any) => ({ ...p, [k]: v }));
  const toggle = (arr: string[], setArr: (a: string[]) => void, val: string) =>
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  const inp = (key: string, placeholder = '', type = 'text', req = false) => (
    <Field label={key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} req={req}>
      <input type={type} className="input-field" placeholder={placeholder}
        value={(f as any)[key]} onChange={e => upd(key, e.target.value)} required={req} />
    </Field>
  );

  const sel = (key: string, options: string[], req = false) => {
    const val = (f as any)[key];
    const needsCustomOption = val && !options.includes(val);
    return (
      <Field label={key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} req={req}>
        <select className="input-field" value={val} onChange={e => upd(key, e.target.value)} required={req}>
          <option value="">— Select —</option>
          {needsCustomOption && <option value={val}>{val}</option>}
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </Field>
    );
  };

  const handleDraft = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onSubmit) onSubmit({ ...f, status: 'Draft', incident_types: incidentTypes, corrective_actions: correctiveActions, claim_types: claimTypes, files }, true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const enrichedSummary = `
${f.incident_summary}

--- CARGO & TRANSPORT DETAILS ---
Short Description: ${f.short_description || 'N/A'}
System Job Number: ${f.system_job_number || 'N/A'}
MBL/MAWB Issued: ${f.mbl_mawb_issued} (Number: ${f.mbl_mawb_number || 'N/A'})
HBL/HAWB Issued: ${f.hbl_hawb_issued} (Number: ${f.hbl_hawb_number || 'N/A'})
Customer: ${f.customer || 'N/A'}
Container Number/s: ${f.container_numbers || 'N/A'}
Routing: ${f.origin || 'N/A'} to ${f.destination || 'N/A'} (Mode: ${f.mode || 'N/A'})
Cargo: ${f.cargo_description || 'N/A'} (Value: ${f.cargo_value || 'N/A'})

--- LOCATION & PARTIES ---
Location of Incident: ${f.location_of_incident || 'N/A'}
Origin Agent: ${f.origin_agent || 'N/A'}
Destination Agent: ${f.destination_agent || 'N/A'}
Carrier: ${f.carrier || 'N/A'}
Coloader: ${f.coloader || 'N/A'}
Transport Company: ${f.transport_company || 'N/A'}
Scope of Work: ${f.scope_of_work === 'Other' ? f.scope_of_work_other : f.scope_of_work || 'N/A'}
Role Performed: ${f.role_performed || 'N/A'}

--- CLAIMS & ESTIMATES ---
Claim Estimate: ${f.claim_estimate || 'N/A'}
    `.trim();

    if (onSubmit) {
      onSubmit({
        ...f,
        incident_summary: enrichedSummary,
        scope_of_work: f.scope_of_work === 'Other' ? f.scope_of_work_other : f.scope_of_work,
        incident_types: incidentTypes,
        corrective_actions: correctiveActions,
        claim_types: claimTypes,
        files
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem', pointerEvents: readOnly ? 'none' : 'auto', opacity: readOnly ? 0.95 : 1 }}>
      <fieldset disabled={readOnly} style={{ border: 'none', padding: 0, margin: 0 }}>

        {/* Auto-generated header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', background: 'var(--bg-subtle)', borderRadius: 12, padding: '1.25rem' }}>
          <div><span className="overline">Incident ID</span><div style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-fg)' }}>{f.incident_id}</div></div>
          <div><span className="overline">Date Logged</span><div style={{ fontWeight: 600 }}>{f.date_logged}</div></div>
          <div><span className="overline">Logged By</span><div style={{ fontWeight: 600 }}>{f.logged_by}</div></div>
        </div>

        {/* Section 1 */}
        <div className="card">
          <h3 className="overline" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 6 }}><Package size={14} /> Incident Log</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {inp('short_description', 'Brief description of the incident', 'text', true)}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Field label="Date of Incident" req>
                <input type="date" className="input-field" value={f.date_of_incident} onChange={e => upd('date_of_incident', e.target.value)} required />
              </Field>
              {sel('mode', ['Sea', 'Air', 'Rail', 'Road'], true)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Field label="Business Unit" req>
                <select className="input-field" value={f.business_unit} onChange={e => { upd('business_unit', e.target.value); upd('branch_department', ''); }} required>
                  <option value="">— Select —</option>
                  {f.business_unit && !BUSINESS_UNITS.includes(f.business_unit) && <option value={f.business_unit}>{f.business_unit}</option>}
                  {BUSINESS_UNITS.map(bu => <option key={bu} value={bu}>{bu}</option>)}
                </select>
              </Field>
              <Field label="Branch / Department" req>
                <select className="input-field" value={f.branch_department} onChange={e => upd('branch_department', e.target.value)} required disabled={!f.business_unit && !f.branch_department}>
                  <option value="">— Select —</option>
                  {f.branch_department && !(BRANCH_MAPPING[f.business_unit] || []).includes(f.branch_department) && <option value={f.branch_department}>{f.branch_department}</option>}
                  {(BRANCH_MAPPING[f.business_unit] || []).map(br => <option key={br} value={br}>{br}</option>)}
                </select>
              </Field>
            </div>
            {inp('system_job_number', 'CargoWise Job Reference', 'text', true)}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              {sel('mbl_mawb_issued', ['Yes', 'No', 'N/A'], true)}
              {sel('hbl_hawb_issued', ['Yes', 'No', 'N/A'], true)}
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 10 }}>
                {(f.mbl_mawb_issued === 'Yes' || f.hbl_hawb_issued === 'Yes') && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-fg)', fontWeight: 700, background: 'rgba(59,130,246,0.1)', padding: '4px 8px', borderRadius: 4 }}>
                    ℹ️ Please attach copy below
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {inp('mbl_mawb_number', 'MBL or MAWB number', 'text', true)}
              {inp('hbl_hawb_number', 'HBL or HAWB number', 'text', true)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {inp('customer', 'Customer name', 'text', true)}
              {inp('container_numbers', 'Container numbers (if applicable)')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {inp('origin', 'Port / City of origin', 'text', true)}
              {inp('destination', 'Port / City of destination', 'text', true)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {inp('cargo_description', 'Nature of cargo', 'text', true)}
              <CurrencyInput
                label="Cargo Value"
                value={f.cargo_value}
                onChange={v => upd('cargo_value', v)}
                req
              />
            </div>
            {inp('location_of_incident', 'Specific location of incident', 'text', true)}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {inp('origin_agent', 'Origin agent (if applicable)')}
              {inp('destination_agent', 'Destination agent (if applicable)')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {inp('carrier', 'Carrier (if applicable)')}
              {inp('coloader', 'Coloader (if applicable)')}
            </div>
            {inp('transport_company', 'Transport company (if applicable)')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {sel('scope_of_work', ['Door to Door', 'Door to Port', 'Port to Port', 'Port to Door', 'Transport only', 'Clearance & delivery', 'Other'], true)}
                {f.scope_of_work === 'Other' && inp('scope_of_work_other', 'Please specify other scope of work', 'text', true)}
              </div>
              {sel('role_performed', ['Principal', 'Agent'], true)}
            </div>
          </div>
        </div>

        {/* Incident Type multi-select */}
        <div className="card">
          <h3 className="overline" style={{ marginBottom: '1rem' }}>Incident Type <span style={{ textTransform: 'none', fontWeight: 'normal', color: 'var(--fg-muted)' }}>(tick all applicable)</span> <span style={{ color: '#ef4444' }}>*</span></h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '0.5rem' }}>
            {INCIDENT_TYPES.map(t => (
              <label key={t} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '0.6rem 0.875rem', borderRadius: 8, cursor: 'pointer',
                background: incidentTypes.includes(t) ? 'rgba(59,130,246,0.12)' : 'var(--bg-subtle)',
                border: `1px solid ${incidentTypes.includes(t) ? 'rgba(59,130,246,0.4)' : 'var(--border-base)'}`,
                transition: 'all 0.15s'
              }}>
                <input type="checkbox" checked={incidentTypes.includes(t)} onChange={() => toggle(incidentTypes, setIncidentTypes, t)} style={{ display: 'none' }} />
                <div style={{
                  width: 16, height: 16, borderRadius: 4, border: `2px solid ${incidentTypes.includes(t) ? '#3b82f6' : 'var(--border-hover)'}`,
                  background: incidentTypes.includes(t) ? '#3b82f6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  {incidentTypes.includes(t) && <span style={{ color: '#fff', fontSize: 10, fontWeight: 900 }}>✓</span>}
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 500, color: incidentTypes.includes(t) ? 'var(--accent-fg)' : 'var(--fg-muted)' }}>{t}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Summary & Root Cause */}
        <div className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Field label="Incident Summary" req>
              <textarea className="input-field" style={{ minHeight: 90 }} placeholder="Factual summary of what occurred..." value={f.incident_summary} onChange={e => upd('incident_summary', e.target.value)} required />
            </Field>
            <Field label="Root Cause" req>
              <textarea className="input-field" style={{ minHeight: 90 }} placeholder="Identified root cause..." value={f.root_cause} onChange={e => upd('root_cause', e.target.value)} required />
            </Field>
          </div>
        </div>

        {/* Corrective Actions */}
        <div className="card">
          <h3 className="overline" style={{ marginBottom: '1rem' }}>Immediate Corrective Action <span style={{ textTransform: 'none', fontWeight: 'normal', color: 'var(--fg-muted)' }}>(tick all applicable)</span></h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '0.5rem' }}>
            {CORRECTIVE_ACTIONS.map(t => (
              <label key={t} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '0.6rem 0.875rem', borderRadius: 8, cursor: 'pointer',
                background: correctiveActions.includes(t) ? 'rgba(16,185,129,0.1)' : 'var(--bg-subtle)',
                border: `1px solid ${correctiveActions.includes(t) ? 'rgba(16,185,129,0.3)' : 'var(--border-base)'}`,
                transition: 'all 0.15s'
              }}>
                <input type="checkbox" checked={correctiveActions.includes(t)} onChange={() => toggle(correctiveActions, setCorrectiveActions, t)} style={{ display: 'none' }} />
                <div style={{
                  width: 16, height: 16, borderRadius: 4, border: `2px solid ${correctiveActions.includes(t) ? '#10b981' : 'var(--border-hover)'}`,
                  background: correctiveActions.includes(t) ? '#10b981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  {correctiveActions.includes(t) && <span style={{ color: '#fff', fontSize: 10, fontWeight: 900 }}>✓</span>}
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 500, color: correctiveActions.includes(t) ? 'var(--success-fg)' : 'var(--fg-muted)' }}>{t}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Claims */}
        <div className="card">
          <h3 className="overline" style={{ marginBottom: '1rem' }}>Intent to Claim <span style={{ textTransform: 'none', fontWeight: 'normal', color: 'var(--fg-muted)' }}>(tick all applicable)</span></h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {CLAIM_TYPES.map(t => (
              <label key={t} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '0.75rem 1rem', borderRadius: 8, cursor: 'pointer',
                background: claimTypes.includes(t) ? 'rgba(239,68,68,0.08)' : 'var(--bg-subtle)',
                border: `1px solid ${claimTypes.includes(t) ? 'rgba(239,68,68,0.3)' : 'var(--border-base)'}`,
                transition: 'all 0.15s'
              }}>
                <input type="checkbox" checked={claimTypes.includes(t)} onChange={() => toggle(claimTypes, setClaimTypes, t)} style={{ display: 'none' }} />
                <div style={{
                  width: 16, height: 16, borderRadius: 4, border: `2px solid ${claimTypes.includes(t) ? '#ef4444' : 'var(--border-hover)'}`,
                  background: claimTypes.includes(t) ? '#ef4444' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  {claimTypes.includes(t) && <span style={{ color: '#fff', fontSize: 10, fontWeight: 900 }}>✓</span>}
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 500, color: claimTypes.includes(t) ? 'var(--danger-fg)' : 'var(--fg-muted)' }}>{t}</span>
              </label>
            ))}
          </div>
          <CurrencyInput
            label="Incident Claim Estimate"
            value={f.claim_estimate}
            onChange={v => upd('claim_estimate', v)}
          />
        </div>

        {/* Supporting Evidence */}
        <div className="card">
          <h3 className="overline" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}><UploadCloud size={14} /> Supporting Evidence</h3>
          <div onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (e.dataTransfer.files) setFiles(p => [...p, ...Array.from(e.dataTransfer.files)]) }}
            onClick={() => document.getElementById('cargo-file-upload')?.click()}
            style={{ border: '2px dashed var(--border-hover)', borderRadius: 10, padding: '2rem', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-subtle)' }}>
            <UploadCloud size={24} style={{ color: 'var(--accent-fg)', margin: '0 auto 0.5rem' }} />
            <p style={{ fontWeight: 700, marginBottom: 4 }}>Click or drag files to upload</p>
            <p style={{ fontSize: '0.8rem' }}>PDF, MSG, EML, JPG, XLSX (Max 50MB)</p>
            <input id="cargo-file-upload" type="file" multiple style={{ display: 'none' }} onChange={e => { if (e.target.files) setFiles(p => [...p, ...Array.from(e.target.files as FileList)]) }} />
          </div>
          {files.length > 0 && <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {files.map((f, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.875rem', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-base)' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={13} color="var(--accent-fg)" />{f.name}</span>
                <button type="button" onClick={() => setFiles(p => p.filter((_, j) => j !== i))} style={{ background: 'transparent', border: 'none', color: 'var(--danger-fg)', cursor: 'pointer' }}><X size={13} /></button>
              </div>
            ))}
          </div>}

          {/* Existing Attachments from Draft */}
          {initialData?.attachments && Array.isArray(initialData.attachments) && initialData.attachments.length > 0 && (
            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-base)', paddingTop: '1rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--fg-faint)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Existing Draft Attachments</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {initialData.attachments.map((at: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.875rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: 8, border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FileText size={13} color="#3b82f6" />
                      {at.name || at.filename || `Attachment ${i + 1}`}
                    </span>
                    <div style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 700 }}>PREVIOUSLY UPLOADED</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {!readOnly && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            marginTop: '1.5rem',
            padding: '1rem',
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(12px)',
            borderRadius: '12px',
            border: '1px solid var(--border-base)',
          }}>
            <button type="button" onClick={onCancel} className="btn btn-danger">
              <X size={16} />
              Cancel
            </button>
            <button type="button" onClick={handleDraft} className="btn btn-warning" disabled={loading}>
              <UploadCloud size={16} />
              Save as Draft
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <FileText size={16} />
              {loading ? 'Submitting...' : 'Submit Incident'}
            </button>
          </div>
        )}
      </fieldset>
    </form>
  );
}
