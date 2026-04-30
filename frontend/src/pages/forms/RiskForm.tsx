import { useState } from 'react';
import { Shield } from 'lucide-react';
import { CurrencyInput } from '../../components/CurrencyInput';

function generateId() { return `RCI-${Date.now().toString(36).toUpperCase()}`; }
function today() { return new Date().toLocaleDateString('en-AU'); }

const RISK_TYPES = ['Regulatory Breach','Policy Non-Compliance','AML/CTF Breach','Sanctions Violation',
  'Data Privacy Breach','Conflict of Interest','Anti-Bribery Breach','Reporting Failure','Licensing Breach','Other'];
import { BUSINESS_UNITS, BRANCH_MAPPING } from '../../constants/branches';

interface Props { onSubmit: (d:any)=>void; onCancel: ()=>void; loading: boolean; }

const Field = ({label,req,children}:{label:string;req?:boolean;children:React.ReactNode}) => (
  <div><label className="overline">{label}{req&&<span style={{color:'#ef4444',marginLeft:3}}>*</span>}</label>{children}</div>
);

export default function RiskForm({ onSubmit, onCancel, loading }: Props) {
  const [f, setF] = useState({
    incident_id: generateId(), date_of_incident:'', date_reported: today(),
    reported_by: localStorage.getItem('role')||'Current User',
    business_unit:'', branch_department:'', incident_type:'',
    regulation_policy_breached:'', description:'',
    regulator_authority_involved:'', notified_to_regulator:'', date_notified:'',
    cro_notified:'', legal_counsel_engaged:'', financial_penalty_imposed:'', penalty_amount:'',
    root_cause:'', corrective_action:'', corrective_action_owner: localStorage.getItem('role')||'Current User', files: [] as File[]
  });
  const upd = (k:string,v:any) => setF(p=>({...p,[k]:v}));

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const enrichedDescription = `
${f.description}

--- REGULATORY & LEGAL ---
Regulation / Policy Breached: ${f.regulation_policy_breached || 'N/A'}
Regulator / Authority Involved: ${f.regulator_authority_involved || 'N/A'}
Notified to Regulator: ${f.notified_to_regulator || 'N/A'}
Date Notified: ${f.date_notified || 'N/A'}
CRO Notified: ${f.cro_notified || 'N/A'}
Legal Counsel Engaged: ${f.legal_counsel_engaged || 'N/A'}

--- PENALTIES ---
Financial Penalty Imposed: ${f.financial_penalty_imposed || 'N/A'}
Penalty Amount (AUD): ${f.penalty_amount || 'N/A'}

--- INVESTIGATION & CORRECTIVE ACTION ---
Root Cause: ${f.root_cause || 'N/A'}
Corrective Action: ${f.corrective_action || 'N/A'}
Corrective Action Owner: ${f.corrective_action_owner || 'N/A'}
    `.trim();

    onSubmit({ ...f, description: enrichedDescription });
  };

  return (
    <form onSubmit={submitForm} style={{display:'flex',flexDirection:'column',gap:'2rem'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'1rem',background:'var(--bg-subtle)',borderRadius:12,padding:'1.25rem'}}>
        <div><span className="overline">Incident ID</span><div style={{fontWeight:700,fontFamily:'monospace',color:'#10b981'}}>{f.incident_id}</div></div>
        <div><span className="overline">Date Reported</span><div style={{fontWeight:600}}>{f.date_reported}</div></div>
        <div><span className="overline">Reported By</span><div style={{fontWeight:600}}>{f.reported_by}</div></div>
      </div>

      <div className="card">
        <h3 className="overline" style={{marginBottom:'1.25rem',display:'flex',alignItems:'center',gap:6,color:'#10b981'}}><Shield size={14}/> Risk &amp; Compliance Incident Log</h3>
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          <Field label="Date of Incident *" req>
            <input type="date" className="input-field" value={f.date_of_incident} onChange={e=>upd('date_of_incident',e.target.value)} required/>
          </Field>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
            <Field label="Business Unit *" req>
              <select className="input-field" value={f.business_unit} onChange={e=>{ upd('business_unit', e.target.value); upd('branch_department', ''); }} required>
                <option value="">— Select —</option>
                {BUSINESS_UNITS.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Branch / Department *" req>
              <select className="input-field" value={f.branch_department} onChange={e=>upd('branch_department',e.target.value)} required disabled={!f.business_unit}>
                <option value="">— Select —</option>
                {(BRANCH_MAPPING[f.business_unit] || []).map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Incident Type *" req>
            <select className="input-field" value={f.incident_type} onChange={e=>upd('incident_type',e.target.value)} required>
              <option value="">— Select type —</option>
              {RISK_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Regulation / Policy Breached *" req>
            <textarea className="input-field" style={{minHeight:90}} placeholder="e.g. Customs Act 1901 s.64, Anti-Money Laundering and Counter-Terrorism Financing Act 2006..." value={f.regulation_policy_breached} onChange={e=>upd('regulation_policy_breached',e.target.value)} required/>
          </Field>
          <Field label="Description of Incident (factual only) *" req>
            <textarea className="input-field" style={{minHeight:110}} placeholder="Objective account of the compliance or risk incident..." value={f.description} onChange={e=>upd('description',e.target.value)} required/>
          </Field>

          <Field label="Regulator / Authority Involved (if applicable)">
            <input type="text" className="input-field" value={f.regulator_authority_involved} onChange={e=>upd('regulator_authority_involved',e.target.value)} />
          </Field>
          
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
            <Field label="Notified to Regulator">
              <select className="input-field" value={f.notified_to_regulator} onChange={e=>upd('notified_to_regulator',e.target.value)}>
                <option value="">— Select —</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </Field>
            <Field label="Date Notified">
              <input type="date" className="input-field" value={f.date_notified} onChange={e=>upd('date_notified',e.target.value)} />
            </Field>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
            <Field label="CRO Notified">
              <select className="input-field" value={f.cro_notified} onChange={e=>upd('cro_notified',e.target.value)}>
                <option value="">— Select —</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </Field>
            <Field label="Legal Counsel Engaged">
              <select className="input-field" value={f.legal_counsel_engaged} onChange={e=>upd('legal_counsel_engaged',e.target.value)}>
                <option value="">— Select —</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </Field>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
            <Field label="Financial Penalty Imposed">
              <select className="input-field" value={f.financial_penalty_imposed} onChange={e=>upd('financial_penalty_imposed',e.target.value)}>
                <option value="">— Select —</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </Field>
            <CurrencyInput 
              label="Penalty Amount" 
              value={f.penalty_amount} 
              onChange={v => upd('penalty_amount', v)} 
            />
          </div>

          <Field label="Root Cause">
            <input type="text" className="input-field" value={f.root_cause} onChange={e=>upd('root_cause',e.target.value)} />
          </Field>
          
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
            <Field label="Corrective Action">
              <input type="text" className="input-field" value={f.corrective_action} onChange={e=>upd('corrective_action',e.target.value)} />
            </Field>
            <Field label="Corrective Action Owner">
              <input type="text" className="input-field" value={f.corrective_action_owner} onChange={e=>upd('corrective_action_owner',e.target.value)} disabled style={{opacity:0.7,cursor:'not-allowed'}} />
            </Field>
          </div>

          <Field label="Supporting Evidence (Attachments)">
            <input type="file" multiple className="input-field" style={{padding:'0.5rem'}} onChange={e=>{
              if(e.target.files) upd('files', Array.from(e.target.files));
            }} />
          </Field>
        </div>
      </div>

      <div style={{display:'flex',justifyContent:'flex-end',gap:'1rem'}}>
        <button type="button" onClick={onCancel} className="btn btn-secondary" style={{padding:'0.75rem 2rem'}}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{padding:'0.75rem 2.5rem'}}>
          {loading?'Submitting...':'Submit Incident'}
        </button>
      </div>
    </form>
  );
}
