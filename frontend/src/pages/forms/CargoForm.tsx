import { useState } from 'react';
import { Package, UploadCloud, X, FileText } from 'lucide-react';
import { CurrencyInput } from '../../components/CurrencyInput';

const INCIDENT_TYPES = [
  'Abandoned Cargo','Cargo Damage','Cargo Theft','Container Seal Breach',
  'Dangerous Goods Breach','Equipment Damage','Equipment Failure',
  'Lost or Missing Cargo','Lost or Missing Equipment','Mislabelling or Misrouting',
  'Temperature Excursion','Vessel Damage'
];
const CORRECTIVE_ACTIONS = [
  'Cargo placed on hold / quarantine','Movement stopped pending assessment',
  'Reefer settings corrected','Alternate storage arranged','Damaged packaging secured',
  'Emergency response initiated','Carrier / depot notified','Customer notified',
  'Surveyor appointed','Temporary repair completed','Evidence preserved (photos, logs, seals)',
  'Cargo segregated','Safety controls implemented'
];
const CLAIM_TYPES = [
  'Customer intent to claim against company (Supporting Evidence required)',
  'Company intent to claim against supplier (Supporting Evidence required)',
  'Company intent to claim against customer (Supporting Evidence required)'
];

import { BUSINESS_UNITS, BRANCH_MAPPING } from '../../constants/branches';

function generateId(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}
function today() {
  return new Date().toLocaleDateString('en-AU');
}

interface Props { onSubmit: (data: any) => void; onCancel: () => void; loading: boolean; }

const Field = ({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) => (
  <div>
    <label className="overline">{label}{req && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}</label>
    {children}
  </div>
);

export default function CargoForm({ onSubmit, onCancel, loading }: Props) {
  const [f, setF] = useState({
    incident_id: generateId('CEI'),
    short_description: '', date_of_incident: '', date_logged: today(),
    logged_by: localStorage.getItem('role') || 'Current User',
    business_unit: '', branch_department: '', system_job_number: '',
    mbl_mawb_issued: 'Yes', hbl_hawb_issued: 'Yes',
    mbl_mawb_number: '', hbl_hawb_number: '',
    customer: '', container_numbers: '', origin: '', destination: '',
    mode: 'Sea', cargo_description: '', cargo_value: '',
    location_of_incident: '', origin_agent: '', destination_agent: '',
    shipping_line: '', coloader: '', transport_company: '',
    scope_of_work: '', role_performed: '',
    incident_summary: '', root_cause: '', claim_estimate: '',
  });
  const [incidentTypes, setIncidentTypes] = useState<string[]>([]);
  const [correctiveActions, setCorrectiveActions] = useState<string[]>([]);
  const [claimTypes, setClaimTypes] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);

  const upd = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
  const toggle = (arr: string[], setArr: (a: string[]) => void, val: string) =>
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  const inp = (key: string, placeholder = '', type = 'text', req = false) => (
    <Field label={key.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())} req={req}>
      <input type={type} className="input-field" placeholder={placeholder}
        value={(f as any)[key]} onChange={e => upd(key, e.target.value)} required={req} />
    </Field>
  );

  const sel = (key: string, options: string[], req = false) => (
    <Field label={key.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())} req={req}>
      <select className="input-field" value={(f as any)[key]} onChange={e => upd(key, e.target.value)} required={req}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  );

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
Shipping Line / Airline: ${f.shipping_line || 'N/A'}
Coloader: ${f.coloader || 'N/A'}
Transport Company: ${f.transport_company || 'N/A'}
Scope of Work: ${f.scope_of_work || 'N/A'}
Role Performed: ${f.role_performed || 'N/A'}

--- CLAIMS & ESTIMATES ---
Claim Estimate: ${f.claim_estimate || 'N/A'}
    `.trim();

    onSubmit({ 
      ...f, 
      incident_summary: enrichedSummary,
      incident_types: incidentTypes, 
      corrective_actions: correctiveActions, 
      claim_types: claimTypes, 
      files 
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'2rem' }}>

      {/* Auto-generated header */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1rem', background:'var(--bg-subtle)', borderRadius:12, padding:'1.25rem' }}>
        <div><span className="overline">Incident ID</span><div style={{ fontWeight:700, fontFamily:'monospace', color:'var(--accent-fg)' }}>{f.incident_id}</div></div>
        <div><span className="overline">Date Logged</span><div style={{ fontWeight:600 }}>{f.date_logged}</div></div>
        <div><span className="overline">Logged By</span><div style={{ fontWeight:600 }}>{f.logged_by}</div></div>
      </div>

      {/* Section 1 */}
      <div className="card">
        <h3 className="overline" style={{ marginBottom:'1.25rem', display:'flex', alignItems:'center', gap:6 }}><Package size={14}/> Incident Log</h3>
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {inp('short_description','Brief description of the incident','text',true)}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
            <Field label="Date of Incident *" req>
              <input type="date" className="input-field" value={f.date_of_incident} onChange={e=>upd('date_of_incident',e.target.value)} required/>
            </Field>
            {sel('mode',['Sea','Air','Rail','Road'],true)}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
            <Field label="Business Unit *" req>
              <select className="input-field" value={f.business_unit} onChange={e=>{ upd('business_unit', e.target.value); upd('branch_department', ''); }} required>
                <option value="">— Select —</option>
                {BUSINESS_UNITS.map(bu => <option key={bu} value={bu}>{bu}</option>)}
              </select>
            </Field>
            <Field label="Branch / Department *" req>
              <select className="input-field" value={f.branch_department} onChange={e=>upd('branch_department',e.target.value)} required disabled={!f.business_unit}>
                <option value="">— Select —</option>
                {(BRANCH_MAPPING[f.business_unit] || []).map(br => <option key={br} value={br}>{br}</option>)}
              </select>
            </Field>
          </div>
          {inp('system_job_number','CargoWise Job Reference','text',true)}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'1rem' }}>
            {sel('mbl_mawb_issued',['Yes','No','N/A'],true)}
            {sel('hbl_hawb_issued',['Yes','No','N/A'],true)}
            <div style={{ display:'flex', alignItems:'flex-end', paddingBottom:10 }}>
              {(f.mbl_mawb_issued === 'Yes' || f.hbl_hawb_issued === 'Yes') && (
                <span style={{ fontSize:'0.7rem', color:'var(--accent-fg)', fontWeight:700, background:'rgba(59,130,246,0.1)', padding:'4px 8px', borderRadius:4 }}>
                  ℹ️ Pull copy required below
                </span>
              )}
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
            {inp('mbl_mawb_number','MBL or MAWB number','text',true)}
            {inp('hbl_hawb_number','HBL or HAWB number','text',true)}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
            {inp('customer','Customer name','text',true)}
            {inp('container_numbers','Container numbers (optional)')}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
            {inp('origin','Port / City of origin','text',true)}
            {inp('destination','Port / City of destination','text',true)}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
            {inp('cargo_description','Nature of cargo','text',true)}
            <CurrencyInput
              label="Cargo Value"
              value={f.cargo_value}
              onChange={v => upd('cargo_value', v)}
              req
            />
          </div>
          {inp('location_of_incident','Specific location of incident','text',true)}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
            {inp('origin_agent','Origin agent (optional)')}
            {inp('destination_agent','Destination agent (optional)')}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
            {inp('shipping_line','Shipping line / Airline (optional)')}
            {inp('coloader','Coloader (optional)')}
          </div>
          {inp('transport_company','Transport company (optional)')}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
            {inp('scope_of_work','Scope of work performed','text',true)}
            {inp('role_performed','Role performed','text',true)}
          </div>
        </div>
      </div>

      {/* Incident Type multi-select */}
      <div className="card">
        <h3 className="overline" style={{ marginBottom:'1rem' }}>Incident Type <span style={{ color:'#ef4444' }}>*</span></h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'0.5rem' }}>
          {INCIDENT_TYPES.map(t => (
            <label key={t} style={{ display:'flex', alignItems:'center', gap:10, padding:'0.6rem 0.875rem', borderRadius:8, cursor:'pointer',
              background: incidentTypes.includes(t) ? 'rgba(59,130,246,0.12)' : 'var(--bg-subtle)',
              border: `1px solid ${incidentTypes.includes(t) ? 'rgba(59,130,246,0.4)' : 'var(--border-base)'}`,
              transition:'all 0.15s' }}>
              <input type="checkbox" checked={incidentTypes.includes(t)} onChange={()=>toggle(incidentTypes,setIncidentTypes,t)} style={{ display:'none' }}/>
              <div style={{ width:16, height:16, borderRadius:4, border:`2px solid ${incidentTypes.includes(t)?'#3b82f6':'var(--border-hover)'}`,
                background: incidentTypes.includes(t)?'#3b82f6':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {incidentTypes.includes(t) && <span style={{ color:'#fff', fontSize:10, fontWeight:900 }}>✓</span>}
              </div>
              <span style={{ fontSize:'0.8rem', fontWeight:500, color: incidentTypes.includes(t)?'var(--accent-fg)':'var(--fg-muted)' }}>{t}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Summary & Root Cause */}
      <div className="card">
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          <Field label="Incident Summary *" req>
            <textarea className="input-field" style={{ minHeight:90 }} placeholder="Factual summary of what occurred..." value={f.incident_summary} onChange={e=>upd('incident_summary',e.target.value)} required/>
          </Field>
          <Field label="Root Cause *" req>
            <textarea className="input-field" style={{ minHeight:90 }} placeholder="Identified root cause..." value={f.root_cause} onChange={e=>upd('root_cause',e.target.value)} required/>
          </Field>
        </div>
      </div>

      {/* Corrective Actions */}
      <div className="card">
        <h3 className="overline" style={{ marginBottom:'1rem' }}>Immediate Corrective Action</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'0.5rem' }}>
          {CORRECTIVE_ACTIONS.map(t => (
            <label key={t} style={{ display:'flex', alignItems:'center', gap:10, padding:'0.6rem 0.875rem', borderRadius:8, cursor:'pointer',
              background: correctiveActions.includes(t)?'rgba(16,185,129,0.1)':'var(--bg-subtle)',
              border:`1px solid ${correctiveActions.includes(t)?'rgba(16,185,129,0.3)':'var(--border-base)'}`,
              transition:'all 0.15s' }}>
              <input type="checkbox" checked={correctiveActions.includes(t)} onChange={()=>toggle(correctiveActions,setCorrectiveActions,t)} style={{ display:'none' }}/>
              <div style={{ width:16, height:16, borderRadius:4, border:`2px solid ${correctiveActions.includes(t)?'#10b981':'var(--border-hover)'}`,
                background:correctiveActions.includes(t)?'#10b981':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {correctiveActions.includes(t)&&<span style={{ color:'#fff', fontSize:10, fontWeight:900 }}>✓</span>}
              </div>
              <span style={{ fontSize:'0.8rem', fontWeight:500, color:correctiveActions.includes(t)?'var(--success-fg)':'var(--fg-muted)' }}>{t}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Claims */}
      <div className="card">
        <h3 className="overline" style={{ marginBottom:'1rem' }}>Intent to Claim</h3>
        <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem', marginBottom:'1.25rem' }}>
          {CLAIM_TYPES.map(t => (
            <label key={t} style={{ display:'flex', alignItems:'center', gap:10, padding:'0.75rem 1rem', borderRadius:8, cursor:'pointer',
              background:claimTypes.includes(t)?'rgba(239,68,68,0.08)':'var(--bg-subtle)',
              border:`1px solid ${claimTypes.includes(t)?'rgba(239,68,68,0.3)':'var(--border-base)'}`,
              transition:'all 0.15s' }}>
              <input type="checkbox" checked={claimTypes.includes(t)} onChange={()=>toggle(claimTypes,setClaimTypes,t)} style={{ display:'none' }}/>
              <div style={{ width:16, height:16, borderRadius:4, border:`2px solid ${claimTypes.includes(t)?'#ef4444':'var(--border-hover)'}`,
                background:claimTypes.includes(t)?'#ef4444':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {claimTypes.includes(t)&&<span style={{ color:'#fff', fontSize:10, fontWeight:900 }}>✓</span>}
              </div>
              <span style={{ fontSize:'0.8rem', fontWeight:500, color:claimTypes.includes(t)?'var(--danger-fg)':'var(--fg-muted)' }}>{t}</span>
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
        <h3 className="overline" style={{ marginBottom:'1rem', display:'flex', alignItems:'center', gap:6 }}><UploadCloud size={14}/> Supporting Evidence</h3>
        <div onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(e.dataTransfer.files)setFiles(p=>[...p,...Array.from(e.dataTransfer.files)])}}
          onClick={()=>document.getElementById('cargo-file-upload')?.click()}
          style={{ border:'2px dashed var(--border-hover)', borderRadius:10, padding:'2rem', textAlign:'center', cursor:'pointer', background:'var(--bg-subtle)' }}>
          <UploadCloud size={24} style={{ color:'var(--accent-fg)', margin:'0 auto 0.5rem' }}/>
          <p style={{ fontWeight:700, marginBottom:4 }}>Click or drag files to upload</p>
          <p style={{ fontSize:'0.8rem' }}>PDF, MSG, EML, JPG, XLSX (Max 50MB)</p>
          <input id="cargo-file-upload" type="file" multiple style={{ display:'none' }} onChange={e=>{if(e.target.files)setFiles(p=>[...p,...Array.from(e.target.files as FileList)])}}/>
        </div>
        {files.length>0&&<div style={{ marginTop:'1rem', display:'flex', flexDirection:'column', gap:'0.4rem' }}>
          {files.map((f,i)=>(
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.6rem 0.875rem', background:'var(--bg-subtle)', borderRadius:8, border:'1px solid var(--border-base)' }}>
              <span style={{ fontSize:'0.8rem', fontWeight:600, display:'flex', alignItems:'center', gap:6 }}><FileText size={13} color="var(--accent-fg)"/>{f.name}</span>
              <button type="button" onClick={()=>setFiles(p=>p.filter((_,j)=>j!==i))} style={{ background:'transparent', border:'none', color:'var(--danger-fg)', cursor:'pointer' }}><X size={13}/></button>
            </div>
          ))}
        </div>}
      </div>

      {/* Actions */}
      <div style={{ display:'flex', justifyContent:'flex-end', gap:'1rem' }}>
        <button type="button" onClick={onCancel} className="btn btn-secondary" style={{ padding:'0.75rem 2rem' }}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding:'0.75rem 2.5rem' }}>
          {loading ? 'Submitting...' : 'Submit Incident'}
        </button>
      </div>
    </form>
  );
}
