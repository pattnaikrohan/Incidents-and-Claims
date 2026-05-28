import { useState, useEffect } from 'react';
import { Shield, X, Save, Send } from 'lucide-react';
import { BUSINESS_UNITS, BRANCH_MAPPING } from '../../constants/branches';

function today() { return new Date().toLocaleDateString('en-AU'); }

const RISK_TYPES = ['Regulatory Breach','Policy Non-Compliance','AML/CTF Breach','Sanctions Violation',
  'Data Privacy Breach','Conflict of Interest','Anti-Bribery Breach','Reporting Failure','Licensing Breach','Other'];

interface Props { onSubmit?: (d: any, isDraft?: boolean)=>void; onCancel?: ()=>void; loading?: boolean; initialData?: any; readOnly?: boolean; incident_id?: string; }

const Field = ({label,req,children}:{label:string;req?:boolean;children:React.ReactNode}) => (
  <div><label className="overline">{label}{req&&<span style={{color:'#ef4444',marginLeft:3}}>*</span>}</label>{children}</div>
);

export default function RiskForm({ onSubmit, onCancel, loading, initialData, readOnly, incident_id }: Props) {
  const [f, setF] = useState<any>(() => {
    const stableId = initialData?.incident_number_str || initialData?.incident_id || incident_id || 'RCI-PENDING';
    
    if (initialData) {
      return {
        ...initialData,
        incident_ref: stableId,
        incident_id: stableId,
        ncr_ref: stableId,
        date_of_incident: initialData.date_of_incident || initialData.date || '',
        date_reported: initialData.date_reported || initialData.date_logged || initialData.date || today(),
        date_logged: initialData.date_logged || initialData.date || today(),
        reported_by: initialData.reported_by || initialData.logged_by || initialData.creator_id || (localStorage.getItem('email') || 'System User'),
        logged_by: initialData.logged_by || initialData.reported_by || initialData.creator_id || (localStorage.getItem('email') || 'System User'),
        employee_name: initialData.employee_name || initialData.customer_name || '',
        business_unit: initialData.business_unit || '',
        branch_department: initialData.branch_department || '',
        incident_type: initialData.incident_type || initialData.type || '',
        description: initialData.description || initialData.short_description || initialData.incident_summary || '',
        short_description: initialData.short_description || initialData.description || initialData.incident_summary || '',
        regulation_policy_breached: initialData.regulation_policy_breached || initialData.legislation_policy_breached || '',
        incident_summary: initialData.incident_summary || initialData.description || '',
      };
    }
    return {
      incident_id: stableId, date_of_incident:'', date_reported: today(),
      reported_by: (localStorage.getItem('email') || 'System User'),
      business_unit:'', branch_department:'', incident_type:'',
      regulation_policy_breached:'', description:'', files: [] as File[]
    };
  });

  useEffect(() => {
    const isPending = !f.incident_id || f.incident_id.includes('PENDING');
    if (incident_id && !initialData && isPending && f.incident_id !== incident_id) {
      upd('incident_id', incident_id);
    }
  }, [incident_id, initialData, f.incident_id]);
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
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'1rem',background:'var(--bg-subtle)',borderRadius:12,padding:'1.25rem'}}>
        <div><span className="overline">Incident ID</span><div style={{fontWeight:700,fontFamily:'monospace',color:'#10b981'}}>{f.incident_id}</div></div>
        <div><span className="overline">Date Reported</span><div style={{fontWeight:600}}>{f.date_reported}</div></div>
        <div><span className="overline">Reported By</span><div style={{fontWeight:600}}>{f.reported_by}</div></div>
      </div>

      <div className="card">
        <h3 className="overline" style={{marginBottom:'1.25rem',display:'flex',alignItems:'center',gap:6,color:'#10b981'}}><Shield size={14}/> Risk &amp; Compliance Incident Log</h3>
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
          <Field label="Incident Type" req>
            <select className="input-field" value={f.incident_type} onChange={e=>upd('incident_type',e.target.value)} required>
              <option value="">— Select type —</option>
              {f.incident_type && !RISK_TYPES.includes(f.incident_type) && <option value={f.incident_type}>{f.incident_type}</option>}
              {RISK_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Regulation / Policy Breached" req>
            <textarea className="input-field" style={{minHeight:90}} placeholder="e.g. Customs Act 1901 s.64, Anti-Money Laundering and Counter-Terrorism Financing Act 2006..." value={f.regulation_policy_breached} onChange={e=>upd('regulation_policy_breached',e.target.value)} required/>
          </Field>
          <Field label="Description of Incident (factual only)" req>
            <textarea className="input-field" style={{minHeight:110}} placeholder="Objective account of the compliance or risk incident..." value={f.description} onChange={e=>upd('description',e.target.value)} required/>
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
