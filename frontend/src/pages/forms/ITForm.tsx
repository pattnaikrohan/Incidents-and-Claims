import { useState } from 'react';
import { Lock } from 'lucide-react';

function generateId() { return `ITS-${Date.now().toString(36).toUpperCase()}`; }
function today() { return new Date().toLocaleDateString('en-AU'); }

const IT_TYPES = ['Data Breach','Ransomware / Malware','Phishing Attack','Unauthorised Access',
  'System Outage','Software Failure','Hardware Failure','Social Engineering','Insider Threat','Other'];
import { BUSINESS_UNITS, BRANCH_MAPPING } from '../../constants/branches';

interface Props { onSubmit: (d:any)=>void; onCancel: ()=>void; loading: boolean; }

const Field = ({label,req,children}:{label:string;req?:boolean;children:React.ReactNode}) => (
  <div><label className="overline">{label}{req&&<span style={{color:'#ef4444',marginLeft:3}}>*</span>}</label>{children}</div>
);

export default function ITForm({ onSubmit, onCancel, loading }: Props) {
  const [f, setF] = useState({
    incident_id: generateId(), date_of_incident:'', date_reported: today(),
    reported_by: localStorage.getItem('role')||'Current User',
    business_unit:'', branch_department:'', incident_type:'',
    systems_data_affected:'', description:'',
    containment_actions:'', personal_data_involved:'', number_of_records:'',
    notifiable_privacy_breach:'', date_notified_oaic:'', cio_notified:'', cro_notified:'',
    cyber_specialist_engaged:'', insurer_notified:'', root_cause:'', corrective_action:'', files: [] as File[]
  });
  const upd = (k:string,v:any) => setF(p=>({...p,[k]:v}));

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const enrichedDescription = `
${f.description}

--- SYSTEMS & CONTAINMENT ---
Systems / Data Affected: ${f.systems_data_affected || 'N/A'}
Containment Actions Taken: ${f.containment_actions || 'N/A'}

--- PRIVACY IMPACT ---
Personal Data Involved: ${f.personal_data_involved || 'N/A'}
Number of Records Affected: ${f.number_of_records || 'N/A'}
Notifiable Privacy Breach: ${f.notifiable_privacy_breach || 'N/A'}
Date Notified to OAIC: ${f.date_notified_oaic || 'N/A'}

--- NOTIFICATIONS & ESCALATION ---
CIO Notified: ${f.cio_notified || 'N/A'}
CRO Notified: ${f.cro_notified || 'N/A'}
External Cyber Specialist Engaged: ${f.cyber_specialist_engaged || 'N/A'}
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
        <div><span className="overline">Incident ID</span><div style={{fontWeight:700,fontFamily:'monospace',color:'#06b6d4'}}>{f.incident_id}</div></div>
        <div><span className="overline">Date Reported</span><div style={{fontWeight:600}}>{f.date_reported}</div></div>
        <div><span className="overline">Reported By</span><div style={{fontWeight:600}}>{f.reported_by}</div></div>
      </div>

      <div className="card">
        <h3 className="overline" style={{marginBottom:'1.25rem',display:'flex',alignItems:'center',gap:6,color:'#06b6d4'}}><Lock size={14}/> IT &amp; Security Incident Log</h3>
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
              {IT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Systems / Data Affected *" req>
            <textarea className="input-field" style={{minHeight:90}} placeholder="List all systems, databases, or data categories affected..." value={f.systems_data_affected} onChange={e=>upd('systems_data_affected',e.target.value)} required/>
          </Field>
          <Field label="Description of Incident (factual only) *" req>
            <textarea className="input-field" style={{minHeight:110}} placeholder="Objective account of the security or IT incident..." value={f.description} onChange={e=>upd('description',e.target.value)} required/>
          </Field>
          <Field label="Containment Actions Taken">
            <textarea className="input-field" style={{minHeight:80}} placeholder="Describe immediate steps taken to contain the incident..." value={f.containment_actions} onChange={e=>upd('containment_actions',e.target.value)} />
          </Field>
          
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
            <Field label="Personal Data Involved">
              <select className="input-field" value={f.personal_data_involved} onChange={e=>upd('personal_data_involved',e.target.value)}>
                <option value="">— Select —</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </Field>
            <Field label="Number of Records Affected">
              <input type="number" className="input-field" value={f.number_of_records} onChange={e=>upd('number_of_records',e.target.value)} />
            </Field>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
            <Field label="Notifiable Privacy Breach">
              <select className="input-field" value={f.notifiable_privacy_breach} onChange={e=>upd('notifiable_privacy_breach',e.target.value)}>
                <option value="">— Select —</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </Field>
            <Field label="Date Notified to OAIC">
              <input type="date" className="input-field" value={f.date_notified_oaic} onChange={e=>upd('date_notified_oaic',e.target.value)} />
            </Field>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
            <Field label="CIO Notified">
              <select className="input-field" value={f.cio_notified} onChange={e=>upd('cio_notified',e.target.value)}>
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
            <Field label="External Cyber Specialist Engaged">
              <select className="input-field" value={f.cyber_specialist_engaged} onChange={e=>upd('cyber_specialist_engaged',e.target.value)}>
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
