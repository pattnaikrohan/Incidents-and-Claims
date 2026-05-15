import { useState, useEffect } from 'react';
import { HeartPulse, X, Save, Send } from 'lucide-react';
import { BUSINESS_UNITS, BRANCH_MAPPING } from '../../constants/branches';

function today() { return new Date().toLocaleDateString('en-AU'); }

const WHS_TYPES = ['Near Miss','First Aid Injury','Medical Treatment Injury','Lost Time Injury',
  'Dangerous Occurrence','Hazard Identification','Property Damage','Environmental Incident','Other'];

interface Props { onSubmit?: (d: any, isDraft?: boolean)=>void; onCancel?: ()=>void; loading?: boolean; initialData?: any; readOnly?: boolean; incident_id?: string; }

const Field = ({label,req,children}:{label:string;req?:boolean;children:React.ReactNode}) => (
  <div><label className="overline">{label}{req&&<span style={{color:'#ef4444',marginLeft:3}}>*</span>}</label>{children}</div>
);

export default function WHSForm({ onSubmit, onCancel, loading, initialData, readOnly, incident_id }: Props) {
  const [f, setF] = useState<any>(() => {
    const stableId = initialData?.incident_number_str || initialData?.incident_id || incident_id || 'WHS-PENDING';
    
    if (initialData) {
      return {
        ...initialData,
        incident_ref: stableId,
        incident_id: stableId,
        ncr_ref: stableId,
        date_of_incident: initialData.date_of_incident || initialData.date || '',
        date_reported: initialData.date_reported || initialData.date || today(),
        date_logged: initialData.date_logged || initialData.date || today(),
        reported_by: initialData.reported_by || initialData.logged_by || initialData.creator_id || 'System User',
        logged_by: initialData.logged_by || initialData.reported_by || initialData.creator_id || 'System User',
        employee_name: initialData.employee_name || initialData.customer_name || '',
        business_unit: initialData.business_unit || '',
        branch_department: initialData.branch_department || '',
        incident_type: initialData.incident_type || initialData.type || '',
        description: initialData.description || initialData.short_description || '',
        short_description: initialData.short_description || initialData.description || '',
        location_of_incident: initialData.location_of_incident || initialData.location || '',
        system_job_number: initialData.system_job_number || initialData.job_number || '',
      };
    }
    return {
      incident_id: stableId, date_of_incident:'', date_reported: today(),
      reported_by: localStorage.getItem('role')||'Current User',
      business_unit:'', branch_department:'', persons_involved:'', location:'',
      incident_type:'', description:'', injury_details:'',
      medical_treatment_required:'', lost_time_injury:'', notifiable_safework:'',
      date_notified_regulator:'', root_cause:'', corrective_action:'',
      corrective_action_owner: localStorage.getItem('role')||'Current User',
      corrective_action_due_date:'', chro_cro_notified:'', workers_comp_claim:'', files: [] as File[]
    };
  });

  useEffect(() => {
    if (incident_id && !initialData && f.incident_id !== incident_id) {
      upd('incident_id', incident_id);
    }
  }, [incident_id, initialData, f.incident_id]);
  const upd = (k:string,v:any) => setF((p:any)=>({...p,[k]:v}));

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const enrichedDescription = `
${f.description}

--- INJURY & INCIDENT DETAILS ---
Injury Details: ${f.injury_details || 'N/A'}
Medical Treatment Required: ${f.medical_treatment_required || 'N/A'}
Lost Time Injury: ${f.lost_time_injury || 'N/A'}

--- REGULATORY & ESCALATION ---
Notifiable to SafeWork / WorkSafe: ${f.notifiable_safework || 'N/A'}
Date Notified to Regulator: ${f.date_notified_regulator || 'N/A'}
CHRO / CRO Notified: ${f.chro_cro_notified || 'N/A'}
Workers Compensation Claim Lodged: ${f.workers_comp_claim || 'N/A'}

--- INVESTIGATION & CORRECTIVE ACTION ---
Root Cause: ${f.root_cause || 'N/A'}
Corrective Action: ${f.corrective_action || 'N/A'}
Corrective Action Owner: ${f.corrective_action_owner || 'N/A'}
Corrective Action Due Date: ${f.corrective_action_due_date || 'N/A'}
    `.trim();

    if (onSubmit) onSubmit({ ...f, description: enrichedDescription });
  };

  const handleDraft = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onSubmit) onSubmit({ ...f, status: 'Draft' }, true);
  };

  return (
    <form onSubmit={submitForm} style={{display:'flex',flexDirection:'column',gap:'2rem', pointerEvents: readOnly ? 'none' : 'auto', opacity: readOnly ? 0.95 : 1}}>
      <fieldset disabled={readOnly} style={{ border: 'none', padding: 0, margin: 0 }}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'1rem',background:'var(--bg-subtle)',borderRadius:12,padding:'1.25rem'}}>
        <div><span className="overline">Incident ID</span><div style={{fontWeight:700,fontFamily:'monospace',color:'#ef4444'}}>{f.incident_id}</div></div>
        <div><span className="overline">Date Reported</span><div style={{fontWeight:600}}>{f.date_reported}</div></div>
        <div><span className="overline">Reported By</span><div style={{fontWeight:600}}>{f.reported_by}</div></div>
      </div>

      <div className="card">
        <h3 className="overline" style={{marginBottom:'1.25rem',display:'flex',alignItems:'center',gap:6,color:'#ef4444'}}><HeartPulse size={14}/> WH&amp;S Incident Log</h3>
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          <Field label="Date of Incident" req>
            <input type="date" className="input-field" value={f.date_of_incident} onChange={e=>upd('date_of_incident',e.target.value)} required/>
          </Field>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
            <Field label="Business Unit" req>
              <select className="input-field" value={f.business_unit} onChange={e=>{ upd('business_unit', e.target.value); upd('branch_department', ''); }} required>
                <option value="">— Select —</option>
                {f.business_unit && !BUSINESS_UNITS.includes(f.business_unit) && <option value={f.business_unit}>{f.business_unit}</option>}
                {BUSINESS_UNITS.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Branch / Department" req>
              <select className="input-field" value={f.branch_department} onChange={e=>upd('branch_department',e.target.value)} required disabled={!f.business_unit && !f.branch_department}>
                <option value="">— Select —</option>
                {f.branch_department && !(BRANCH_MAPPING[f.business_unit] || []).includes(f.branch_department) && <option value={f.branch_department}>{f.branch_department}</option>}
                {(BRANCH_MAPPING[f.business_unit] || []).map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Person(s) Involved" req>
            <input className="input-field" placeholder="Full names of persons involved" value={f.persons_involved} onChange={e=>upd('persons_involved',e.target.value)} required/>
          </Field>
          <Field label="Location (site, suburb, state)" req>
            <input className="input-field" placeholder="e.g. 45 Smith St, Yennora, NSW" value={f.location} onChange={e=>upd('location',e.target.value)} required/>
          </Field>
          <Field label="Incident Type" req>
            <select className="input-field" value={f.incident_type} onChange={e=>upd('incident_type',e.target.value)} required>
              <option value="">— Select type —</option>
              {f.incident_type && !WHS_TYPES.includes(f.incident_type) && <option value={f.incident_type}>{f.incident_type}</option>}
              {WHS_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Description of Incident (factual only)" req>
            <textarea className="input-field" style={{minHeight:110}} placeholder="Objective description of what occurred..." value={f.description} onChange={e=>upd('description',e.target.value)} required/>
          </Field>
          <Field label="Injury Details (nature and body part if applicable)" req>
            <textarea className="input-field" style={{minHeight:90}} placeholder="e.g. Laceration to left forearm, bruising to lower back..." value={f.injury_details} onChange={e=>upd('injury_details',e.target.value)} required/>
          </Field>
          
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
            <Field label="Medical Treatment Required">
              <select className="input-field" value={f.medical_treatment_required} onChange={e=>upd('medical_treatment_required',e.target.value)}>
                <option value="">— Select —</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </Field>
            <Field label="Lost Time Injury">
              <select className="input-field" value={f.lost_time_injury} onChange={e=>upd('lost_time_injury',e.target.value)}>
                <option value="">— Select —</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </Field>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
            <Field label="Notifiable to SafeWork / WorkSafe">
              <select className="input-field" value={f.notifiable_safework} onChange={e=>upd('notifiable_safework',e.target.value)}>
                <option value="">— Select —</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </Field>
            <Field label="Date Notified to Regulator">
              <input type="date" className="input-field" value={f.date_notified_regulator} onChange={e=>upd('date_notified_regulator',e.target.value)} />
            </Field>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
            <Field label="CHRO / CRO Notified">
              <select className="input-field" value={f.chro_cro_notified} onChange={e=>upd('chro_cro_notified',e.target.value)}>
                <option value="">— Select —</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </Field>
            <Field label="Workers Compensation Claim Lodged">
              <select className="input-field" value={f.workers_comp_claim} onChange={e=>upd('workers_comp_claim',e.target.value)}>
                <option value="">— Select —</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </Field>
          </div>

          <Field label="Root Cause">
            <input type="text" className="input-field" value={f.root_cause} onChange={e=>upd('root_cause',e.target.value)} />
          </Field>
          
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'1rem'}}>
            <Field label="Corrective Action">
              <input type="text" className="input-field" value={f.corrective_action} onChange={e=>upd('corrective_action',e.target.value)} />
            </Field>
            <Field label="Corrective Action Owner">
              <input type="text" className="input-field" value={f.corrective_action_owner} disabled style={{opacity:0.7,cursor:'not-allowed'}} />
            </Field>
            <Field label="Corrective Action Due Date">
              <input type="date" className="input-field" value={f.corrective_action_due_date} onChange={e=>upd('corrective_action_due_date',e.target.value)} />
            </Field>
          </div>

          <Field label="Supporting Evidence (Attachments)">
            <input type="file" multiple className="input-field" style={{padding:'0.5rem'}} onChange={e=>{
              if(e.target.files) upd('files', Array.from(e.target.files));
            }} />
          </Field>
          
          {/* Existing Attachments from Draft */}
          {initialData?.attachments && Array.isArray(initialData.attachments) && initialData.attachments.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--fg-faint)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Existing Draft Attachments</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {initialData.attachments.map((at: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: 8, border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--fg-base)' }}>{at.name || at.filename || `Attachment ${i+1}`}</span>
                    <span style={{ fontSize: '0.6rem', color: '#3b82f6', fontWeight: 700 }}>UPLOADED</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
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
            <Save size={16} />
            Save as Draft
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Send size={16} />
            {loading ? 'Submitting...' : 'Submit Incident'}
          </button>
        </div>
      )}
      </fieldset>
    </form>
  );
}
