import { useState } from 'react';
import { Users } from 'lucide-react';

function generateId() { return `HRI-${Date.now().toString(36).toUpperCase()}`; }
function today() { return new Date().toLocaleDateString('en-AU'); }

const HR_TYPES = ['Misconduct','Bullying & Harassment','Discrimination','Grievance','Performance Issue',
  'Attendance & Leave Abuse','Workplace Conflict','Fraud / Theft','Policy Breach','Other'];

import { BUSINESS_UNITS, BRANCH_MAPPING } from '../../constants/branches';

interface Props { onSubmit: (d: any)=>void; onCancel: ()=>void; loading: boolean; }

const Field = ({label,req,children}:{label:string;req?:boolean;children:React.ReactNode}) => (
  <div><label className="overline">{label}{req&&<span style={{color:'#ef4444',marginLeft:3}}>*</span>}</label>{children}</div>
);

export default function HRForm({ onSubmit, onCancel, loading }: Props) {
  const [f, setF] = useState({
    incident_ref: generateId(), date_of_incident:'', date_reported: today(),
    reported_by: localStorage.getItem('role')||'Current User',
    employee_name:'', business_unit:'', branch_department:'',
    incident_type:'', description:'', witnesses:'', immediate_action:'', investigation_required:'Yes',
    investigation_outcome:'', corrective_action:'', legal_counsel_engaged:'',
    close_out_date:'', notes:'', files: [] as File[]
  });
  const upd = (k:string,v:any) => setF(p=>({...p,[k]:v}));

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const enrichedDescription = `
${f.description}

--- INCIDENT DETAILS & WITNESSES ---
Witnesses (if any): ${f.witnesses || 'N/A'}
Immediate Action Taken: ${f.immediate_action || 'N/A'}

--- INVESTIGATION & LEGAL ---
Investigation Required: ${f.investigation_required || 'N/A'}
Investigation Outcome: ${f.investigation_outcome || 'N/A'}
Corrective / Disciplinary Action: ${f.corrective_action || 'N/A'}
Legal Counsel Engaged: ${f.legal_counsel_engaged || 'N/A'}

--- ADMINISTRATION ---
Close Out Date: ${f.close_out_date || 'N/A'}
HR Confidential Notes: ${f.notes || 'N/A'}
    `.trim();

    onSubmit({ ...f, description: enrichedDescription });
  };

  return (
    <form onSubmit={submitForm} style={{display:'flex',flexDirection:'column',gap:'2rem'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1rem',background:'var(--bg-subtle)',borderRadius:12,padding:'1.25rem'}}>
        <div><span className="overline">Reference No.</span><div style={{fontWeight:700,fontFamily:'monospace',color:'var(--accent-fg)'}}>{f.incident_ref}</div></div>
        <div><span className="overline">Date Reported</span><div style={{fontWeight:600}}>{f.date_reported}</div></div>
        <div><span className="overline">Reported By</span><div style={{fontWeight:600}}>{f.reported_by}</div></div>
      </div>

      <div className="card">
        <h3 className="overline" style={{marginBottom:'1.25rem',display:'flex',alignItems:'center',gap:6}}><Users size={14}/> HR Incident Log</h3>
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          <Field label="Date of Incident *" req>
            <input type="date" className="input-field" value={f.date_of_incident} onChange={e=>upd('date_of_incident',e.target.value)} required/>
          </Field>
          <Field label="Employee Name *" req>
            <input className="input-field" placeholder="Full name of employee involved" value={f.employee_name} onChange={e=>upd('employee_name',e.target.value)} required/>
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
              {HR_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Description of Incident (factual only) *" req>
            <textarea className="input-field" style={{minHeight:110}} placeholder="Factual account only — no assumptions..." value={f.description} onChange={e=>upd('description',e.target.value)} required/>
          </Field>
          <Field label="Witnesses (if any)">
            <textarea className="input-field" style={{minHeight:70}} placeholder="Names and contact details of witnesses..." value={f.witnesses} onChange={e=>upd('witnesses',e.target.value)}/>
          </Field>
          <Field label="Immediate Action Taken *" req>
            <textarea className="input-field" style={{minHeight:90}} placeholder="Actions taken immediately following the incident..." value={f.immediate_action} onChange={e=>upd('immediate_action',e.target.value)} required/>
          </Field>
          <Field label="Investigation Required *" req>
            <div style={{display:'flex',gap:'1rem',marginTop:4}}>
              {['Yes','No'].map(v=>(
                <label key={v} style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',padding:'0.6rem 1.25rem',borderRadius:8,
                  background:f.investigation_required===v?'rgba(59,130,246,0.12)':'var(--bg-subtle)',
                  border:`1px solid ${f.investigation_required===v?'rgba(59,130,246,0.4)':'var(--border-base)'}`,transition:'all 0.15s'}}>
                  <input type="radio" name="inv_req" value={v} checked={f.investigation_required===v} onChange={()=>upd('investigation_required',v)} style={{display:'none'}}/>
                  <div style={{width:16,height:16,borderRadius:'50%',border:`2px solid ${f.investigation_required===v?'#3b82f6':'var(--border-hover)'}`,
                    background:f.investigation_required===v?'#3b82f6':'transparent',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {f.investigation_required===v&&<div style={{width:6,height:6,borderRadius:'50%',background:'#fff'}}/>}
                  </div>
                  <span style={{fontSize:'0.875rem',fontWeight:600}}>{v}</span>
                </label>
              ))}
            </div>
          </Field>
          
          <Field label="Investigation Outcome">
            <textarea className="input-field" style={{minHeight:90}} placeholder="Outcome of the investigation..." value={f.investigation_outcome} onChange={e=>upd('investigation_outcome',e.target.value)} />
          </Field>
          
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
            <Field label="Corrective / Disciplinary Action">
              <input type="text" className="input-field" value={f.corrective_action} onChange={e=>upd('corrective_action',e.target.value)} />
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
            <Field label="Close Out Date">
              <input type="date" className="input-field" value={f.close_out_date} onChange={e=>upd('close_out_date',e.target.value)} />
            </Field>
          </div>

          <Field label="Notes (confidential - HR eyes only)">
            <textarea className="input-field" style={{minHeight:90}} placeholder="Confidential notes for HR purposes..." value={f.notes} onChange={e=>upd('notes',e.target.value)} />
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
