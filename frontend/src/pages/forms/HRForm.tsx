import { useState, useEffect } from 'react';
import { Users, X, Save, Send } from 'lucide-react';
import { BUSINESS_UNITS, BRANCH_MAPPING } from '../../constants/branches';

function today() { return new Date().toLocaleDateString('en-AU'); }

const HR_TYPES = ['Misconduct','Bullying & Harassment','Discrimination','Grievance','Performance Issue',
  'Attendance & Leave Abuse','Workplace Conflict','Fraud / Theft','Policy Breach','Other'];

interface Props { onSubmit?: (d: any, isDraft?: boolean)=>void; onCancel?: ()=>void; loading?: boolean; initialData?: any; readOnly?: boolean; incident_id?: string; }

const Field = ({label,req,children}:{label:string;req?:boolean;children:React.ReactNode}) => (
  <div><label className="overline">{label}{req&&<span style={{color:'#ef4444',marginLeft:3}}>*</span>}</label>{children}</div>
);

export default function HRForm({ onSubmit, onCancel, loading, initialData, readOnly, incident_id }: Props) {
  const [f, setF] = useState<any>(() => {
    const stableId = initialData?.incident_number_str || initialData?.incident_id || incident_id || 'HR-PENDING';
    
    if (initialData) {
      return {
        ...initialData,
        incident_ref: stableId,
        incident_id: stableId,
        ncr_ref: stableId,
        date_of_incident: initialData.date_of_incident || initialData.date || '',
        date_reported: initialData.date_reported || initialData.date_logged || initialData.date || today(),
        date_logged: initialData.date_logged || initialData.date || today(),
        reported_by: initialData.reported_by || initialData.logged_by || initialData.creator_id || 'System User',
        logged_by: initialData.logged_by || initialData.reported_by || initialData.creator_id || 'System User',
        employee_name: initialData.employee_name || initialData.employee_involved || initialData.customer_name || '',
        business_unit: initialData.business_unit || '',
        branch_department: initialData.branch_department || '',
        incident_type: initialData.incident_type || initialData.type || '',
        description: initialData.description || initialData.short_description || initialData.incident_summary || '',
        short_description: initialData.short_description || initialData.description || initialData.incident_summary || '',
        witnesses: initialData.witnesses || '',
        immediate_action: initialData.immediate_action || '',
        investigation_required: initialData.investigation_required || 'Yes',
        incident_summary: initialData.incident_summary || initialData.description || '',
      };
    }
    return {
      incident_ref: stableId, date_of_incident:'', date_reported: today(),
      reported_by: localStorage.getItem('email') || localStorage.getItem('role') || 'Current User',
      employee_name:'', business_unit:'', branch_department:'',
      incident_type:'', description:'', witnesses:'', immediate_action:'', investigation_required:'Yes', files: [] as File[]
    };
  });

  useEffect(() => {
    const isPending = !f.incident_ref || f.incident_ref.includes('PENDING');
    if (incident_id && !initialData && isPending && f.incident_ref !== incident_id) {
      upd('incident_ref', incident_id);
      upd('incident_id', incident_id);
    }
  }, [incident_id, initialData, f.incident_ref]);
  const upd = (k:string,v:any) => setF((p:any)=>({...p,[k]:v}));

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) onSubmit(f);
  };

  const handleDraft = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onSubmit) onSubmit({ ...f, status: 'Draft' }, true);
  };

  return (
    <form onSubmit={submitForm} style={{display:'flex',flexDirection:'column',gap:'2rem', pointerEvents: readOnly ? 'none' : 'auto', opacity: readOnly ? 0.95 : 1}}>
      <fieldset disabled={readOnly} style={{ border: 'none', padding: 0, margin: 0 }}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1rem',background:'var(--bg-subtle)',borderRadius:12,padding:'1.25rem'}}>
        <div><span className="overline">Reference No.</span><div style={{fontWeight:700,fontFamily:'monospace',color:'var(--accent-fg)'}}>{f.incident_ref}</div></div>
        <div><span className="overline">Date Reported</span><div style={{fontWeight:600}}>{f.date_reported}</div></div>
        <div><span className="overline">Reported By</span><div style={{fontWeight:600}}>{f.reported_by}</div></div>
      </div>

      <div className="card">
        <h3 className="overline" style={{marginBottom:'1.25rem',display:'flex',alignItems:'center',gap:6}}><Users size={14}/> HR Incident Log</h3>
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          <Field label="Date of Incident" req>
            <input type="date" className="input-field" value={f.date_of_incident} onChange={e=>upd('date_of_incident',e.target.value)} required/>
          </Field>
          <Field label="Employee Name" req>
            <input className="input-field" placeholder="Full name of employee involved" value={f.employee_name} onChange={e=>upd('employee_name',e.target.value)} required/>
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
          <Field label="Incident Type" req>
            <select className="input-field" value={f.incident_type} onChange={e=>upd('incident_type',e.target.value)} required>
              <option value="">— Select type —</option>
              {f.incident_type && !HR_TYPES.includes(f.incident_type) && <option value={f.incident_type}>{f.incident_type}</option>}
              {HR_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Description of Incident (factual only)" req>
            <textarea className="input-field" style={{minHeight:110}} placeholder="Factual account only — no assumptions..." value={f.description} onChange={e=>upd('description',e.target.value)} required/>
          </Field>
          <Field label="Witnesses (if any)">
            <textarea className="input-field" style={{minHeight:70}} placeholder="Names and contact details of witnesses..." value={f.witnesses} onChange={e=>upd('witnesses',e.target.value)}/>
          </Field>
          <Field label="Immediate Action Taken" req>
            <textarea className="input-field" style={{minHeight:90}} placeholder="Actions taken immediately following the incident..." value={f.immediate_action} onChange={e=>upd('immediate_action',e.target.value)} required/>
          </Field>
          <Field label="Investigation Required" req>
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
