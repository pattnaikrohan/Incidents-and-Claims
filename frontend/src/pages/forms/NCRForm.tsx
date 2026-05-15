import { useState, useEffect } from 'react';
import { FileWarning, X, Save, Send } from 'lucide-react';
import { BUSINESS_UNITS, BRANCH_MAPPING } from '../../constants/branches';

function today() { return new Date().toLocaleDateString('en-AU'); }

interface Props { onSubmit?: (d: any, isDraft?: boolean)=>void; onCancel?: ()=>void; loading?: boolean; initialData?: any; readOnly?: boolean; incident_id?: string; }

const Field = ({label,req,children}:{label:string;req?:boolean;children:React.ReactNode}) => (
  <div><label className="overline">{label}{req&&<span style={{color:'#ef4444',marginLeft:3}}>*</span>}</label>{children}</div>
);

export default function NCRForm({ onSubmit, onCancel, loading, initialData, readOnly, incident_id }: Props) {
  const [f, setF] = useState<any>(() => {
    const stableId = initialData?.incident_number_str || initialData?.incident_id || incident_id || 'NCR-PENDING';
    
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
      incident_id: stableId, date_reported: today(),
      reported_by: localStorage.getItem('role')||'Current User',
      business_unit:'', branch_department:'',
      incident_type:'Non-Conformance Report', description:'',
      
      // NCR Specific Fields
      level_of_nonconformity: '', identification: '', identified_by: '',
      at_fault_party: '', notify: '', containment: '', related_record: '',
      files: [] as File[]
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

--- NCR DETAILS ---
Level of Nonconformity: ${f.level_of_nonconformity || 'N/A'}
Identification of Non-Conformance: ${f.identification || 'N/A'}
Identified By: ${f.identified_by || 'N/A'}
At Fault Party: ${f.at_fault_party || 'N/A'}
Notify: ${f.notify || 'N/A'}
Immediate Containment Action: ${f.containment || 'N/A'}
Related Record Reference: ${f.related_record || 'N/A'}
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
        <div><span className="overline">NCR ID</span><div style={{fontWeight:700,fontFamily:'monospace',color:'#8b5cf6'}}>{f.incident_id}</div></div>
        <div><span className="overline">Date Created</span><div style={{fontWeight:600}}>{f.date_reported}</div></div>
        <div><span className="overline">Created By</span><div style={{fontWeight:600}}>{f.reported_by}</div></div>
      </div>

      <div className="card">
        <h3 className="overline" style={{marginBottom:'1.25rem',display:'flex',alignItems:'center',gap:6,color:'#8b5cf6'}}><FileWarning size={14}/> RECORD IDENTIFICATION</h3>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
          <Field label="Business Unit (BU)" req>
            <select className="input-field" value={f.business_unit} onChange={e=>{ upd('business_unit', e.target.value); upd('branch_department', ''); }} required>
              <option value="">— Select —</option>
              {f.business_unit && !BUSINESS_UNITS.includes(f.business_unit) && <option value={f.business_unit}>{f.business_unit}</option>}
              {BUSINESS_UNITS.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Branch" req>
            <select className="input-field" value={f.branch_department} onChange={e=>upd('branch_department',e.target.value)} required disabled={!f.business_unit && !f.branch_department}>
              <option value="">— Select —</option>
              {f.branch_department && !(BRANCH_MAPPING[f.business_unit] || []).includes(f.branch_department) && <option value={f.branch_department}>{f.branch_department}</option>}
              {(BRANCH_MAPPING[f.business_unit] || []).map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </div>
      </div>

      <div className="card">
        <h3 className="overline" style={{marginBottom:'1.25rem',display:'flex',alignItems:'center',gap:6,color:'#8b5cf6'}}><FileWarning size={14}/> NON-CONFORMANCE DETAILS</h3>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
          <Field label="Level of Nonconformity" req>
            <select className="input-field" value={f.level_of_nonconformity} onChange={e=>upd('level_of_nonconformity',e.target.value)} required>
              <option value="">— Select —</option>
              {f.level_of_nonconformity && !['Minor', 'Major', 'Critical'].includes(f.level_of_nonconformity) && <option value={f.level_of_nonconformity}>{f.level_of_nonconformity}</option>}
              <option value="Minor">Minor</option>
              <option value="Major">Major</option>
              <option value="Critical">Critical</option>
            </select>
          </Field>
          <Field label="Identification of NC" req>
            <select className="input-field" value={f.identification} onChange={e=>upd('identification',e.target.value)} required>
              <option value="">— Select —</option>
              {f.identification && !['Process Failure', 'Product Defect', 'Service Failure', 'Audit Finding', 'Customer Complaint', 'Other'].includes(f.identification) && <option value={f.identification}>{f.identification}</option>}
              <option value="Process Failure">Process Failure</option>
              <option value="Product Defect">Product Defect</option>
              <option value="Service Failure">Service Failure</option>
              <option value="Audit Finding">Audit Finding</option>
              <option value="Customer Complaint">Customer Complaint</option>
              <option value="Other">Other</option>
            </select>
          </Field>
          <Field label="Identified By">
            <input type="text" className="input-field" value={f.identified_by} onChange={e=>upd('identified_by',e.target.value)} placeholder="e.g. Operations Supervisor" />
          </Field>
          <Field label="At Fault Party">
            <select className="input-field" value={f.at_fault_party} onChange={e=>upd('at_fault_party',e.target.value)}>
              <option value="">— Select —</option>
              {f.at_fault_party && !['AAW Group (Internal)', 'Supplier', 'Subcontractor', 'Customer', 'Other'].includes(f.at_fault_party) && <option value={f.at_fault_party}>{f.at_fault_party}</option>}
              <option value="AAW Group (Internal)">AAW Group (Internal)</option>
              <option value="Supplier">Supplier</option>
              <option value="Subcontractor">Subcontractor</option>
              <option value="Customer">Customer</option>
              <option value="Other">Other</option>
            </select>
          </Field>
          <Field label="Notify">
            <input type="text" className="input-field" value={f.notify} onChange={e=>upd('notify',e.target.value)} placeholder="Staff to notify" />
          </Field>
          <Field label="Related Record Reference">
            <input type="text" className="input-field" value={f.related_record} onChange={e=>upd('related_record',e.target.value)} placeholder="e.g. Incident Log: INC-2026-0042" />
          </Field>
        </div>
        
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          <Field label="Description of NC" req>
            <textarea className="input-field" style={{minHeight:100}} placeholder="Provide full factual details..." value={f.description} onChange={e=>upd('description',e.target.value)} required/>
          </Field>
          <Field label="Immediate Containment Action">
            <textarea className="input-field" style={{minHeight:60}} value={f.containment} onChange={e=>upd('containment',e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="card">
        <Field label="Supporting Evidence (Attachments)">
          <input type="file" multiple className="input-field" style={{padding:'0.5rem'}} onChange={e=>{
            if(e.target.files) upd('files', Array.from(e.target.files));
          }} />
        </Field>
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
            {loading ? 'Submitting...' : 'Submit NCR'}
          </button>
        </div>
      )}
      </fieldset>
    </form>
  );
}
