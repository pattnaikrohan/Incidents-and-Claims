import { useState } from 'react';
import { DollarSign } from 'lucide-react';
import { CurrencyInput } from '../../components/CurrencyInput';

function generateId() { return `FIN-${Date.now().toString(36).toUpperCase()}`; }
function today() { return new Date().toLocaleDateString('en-AU'); }

import { BUSINESS_UNITS, BRANCH_MAPPING } from '../../constants/branches';

interface Props { onSubmit: (d:any)=>void; onCancel: ()=>void; loading: boolean; }

const Field = ({label,req,children}:{label:string;req?:boolean;children:React.ReactNode}) => (
  <div><label className="overline">{label}{req&&<span style={{color:'#ef4444',marginLeft:3}}>*</span>}</label>{children}</div>
);

export default function FinanceForm({ onSubmit, onCancel, loading }: Props) {
  const [f, setF] = useState({
    incident_id: generateId(), date_of_incident:'', date_reported: today(),
    reported_by: localStorage.getItem('role')||'Current User',
    business_unit:'', branch_department:'',
    incident_type:'Travel Disruption', description:'',
    financial_value:'', actual_financial_loss:'', recovery_possible:'', recovery_amount:'',
    cfo_notified:'', cro_notified:'', police_reported:'', insurer_notified:'',
    root_cause:'', corrective_action:'', write_off_required:'', files: [] as File[]
  });
  const upd = (k:string,v:any) => setF(p=>({...p,[k]:v}));

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const enrichedDescription = `
${f.description}

--- FINANCE DETAILS ---
Financial Value Involved (AUD): ${f.financial_value || 'N/A'}
Actual Financial Loss (AUD): ${f.actual_financial_loss || 'N/A'}
Recovery Possible: ${f.recovery_possible || 'N/A'}
Recovery Amount (AUD): ${f.recovery_amount || 'N/A'}
Write-Off Required: ${f.write_off_required || 'N/A'}

--- NOTIFICATIONS ---
CFO Notified: ${f.cfo_notified || 'N/A'}
CRO Notified: ${f.cro_notified || 'N/A'}
Police Reported: ${f.police_reported || 'N/A'}
Insurer Notified: ${f.insurer_notified || 'N/A'}

--- INVESTIGATION ---
Root Cause: ${f.root_cause || 'N/A'}
Corrective Action: ${f.corrective_action || 'N/A'}
    `.trim();

    onSubmit({ ...f, description: enrichedDescription });
  };

  return (
    <form onSubmit={submitForm} style={{display:'flex',flexDirection:'column',gap:'2rem'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'1rem',background:'var(--bg-subtle)',borderRadius:12,padding:'1.25rem'}}>
        <div><span className="overline">Incident ID</span><div style={{fontWeight:700,fontFamily:'monospace',color:'#3b82f6'}}>{f.incident_id}</div></div>
        <div><span className="overline">Date Reported</span><div style={{fontWeight:600}}>{f.date_reported}</div></div>
        <div><span className="overline">Reported By</span><div style={{fontWeight:600}}>{f.reported_by}</div></div>
      </div>

      <div className="card">
        <h3 className="overline" style={{marginBottom:'1.25rem',display:'flex',alignItems:'center',gap:6,color:'#3b82f6'}}><DollarSign size={14}/> Finance Incident Log</h3>
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
            <div style={{padding:'0.75rem 1rem',background:'rgba(59,130,246,0.08)',borderRadius:8,border:'1px solid rgba(59,130,246,0.25)'}}>
              <span style={{fontWeight:600,color:'var(--accent-fg)'}}>Travel Disruption</span>
              <p style={{fontSize:'0.75rem',marginTop:2}}>Finance incidents are currently scoped to Travel Disruption events.</p>
            </div>
          </Field>
          <Field label="Description of Incident (factual only) *" req>
            <textarea className="input-field" style={{minHeight:130}} placeholder="Describe the financial incident, travel disruption, or related financial impact in factual terms..." value={f.description} onChange={e=>upd('description',e.target.value)} required/>
          </Field>
          
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
            <CurrencyInput 
              label="Financial Value Involved" 
              value={f.financial_value} 
              onChange={v => upd('financial_value', v)} 
            />
            <CurrencyInput 
              label="Actual Financial Loss" 
              value={f.actual_financial_loss} 
              onChange={v => upd('actual_financial_loss', v)} 
            />
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'1rem'}}>
            <Field label="Recovery Possible">
              <select className="input-field" value={f.recovery_possible} onChange={e=>upd('recovery_possible',e.target.value)}>
                <option value="">— Select —</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </Field>
            <CurrencyInput 
              label="Recovery Amount" 
              value={f.recovery_amount} 
              onChange={v => upd('recovery_amount', v)} 
            />
            <Field label="Write-Off Required">
              <select className="input-field" value={f.write_off_required} onChange={e=>upd('write_off_required',e.target.value)}>
                <option value="">— Select —</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </Field>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
            <Field label="CFO Notified">
              <select className="input-field" value={f.cfo_notified} onChange={e=>upd('cfo_notified',e.target.value)}>
                <option value="">— Select —</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </Field>
            <Field label="CRO Notified">
              <select className="input-field" value={f.cro_notified} onChange={e=>upd('cro_notified',e.target.value)}>
                <option value="">— Select —</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </Field>
            <Field label="Police Reported">
              <select className="input-field" value={f.police_reported} onChange={e=>upd('police_reported',e.target.value)}>
                <option value="">— Select —</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </Field>
            <Field label="Insurer Notified">
              <select className="input-field" value={f.insurer_notified} onChange={e=>upd('insurer_notified',e.target.value)}>
                <option value="">— Select —</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </Field>
          </div>

          <Field label="Root Cause">
            <input type="text" className="input-field" value={f.root_cause} onChange={e=>upd('root_cause',e.target.value)} />
          </Field>
          <Field label="Corrective Action">
            <input type="text" className="input-field" value={f.corrective_action} onChange={e=>upd('corrective_action',e.target.value)} />
          </Field>

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
