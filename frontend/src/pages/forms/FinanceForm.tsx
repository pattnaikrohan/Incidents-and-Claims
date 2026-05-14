import { useState } from 'react';
import { DollarSign } from 'lucide-react';
import { CurrencyInput } from '../../components/CurrencyInput';

function generateId() { return `FIN-${Date.now().toString(36).toUpperCase()}`; }
function today() { return new Date().toLocaleDateString('en-AU'); }

import { BUSINESS_UNITS, BRANCH_MAPPING } from '../../constants/branches';

interface Props { onSubmit?: (d: any)=>void; onCancel?: ()=>void; loading?: boolean; initialData?: any; readOnly?: boolean; }

const Field = ({label,req,children}:{label:string;req?:boolean;children:React.ReactNode}) => (
  <div><label className="overline">{label}{req&&<span style={{color:'#ef4444',marginLeft:3}}>*</span>}</label>{children}</div>
);

const FINANCE_INCIDENT_TYPES = [
  "Invoice Fraud", "BEC", "Payment Error", "Duplicate Payment", 
  "Overcharge", "Undercharge", "FX Error", "Unauthorised Transaction", 
  "Write-Off Required", "Travel Disruption", "Other"
];

export default function FinanceForm({ onSubmit, onCancel, loading, initialData, readOnly }: Props) {
  const [f, setF] = useState<any>(() => {
    if (initialData) {
      return {
        ...initialData,
        incident_id: initialData.incident_number_str || initialData.incident_id || `FIN-${initialData.id}`,
        date_of_incident: initialData.date_of_incident || initialData.date || '',
        date_reported: initialData.date_reported || initialData.date || today(),
        reported_by: initialData.reported_by || initialData.logged_by || 'System User',
        business_unit: initialData.business_unit || '',
        branch_department: initialData.branch_department || '',
        incident_type: initialData.incident_type || initialData.type || '',
        description: initialData.description || '',
      };
    }
    return {
    incident_id: generateId(), date_of_incident:'', date_reported: today(),
    reported_by: localStorage.getItem('email')||'Current User',
    business_unit:'', branch_department:'',
    incident_type:'', description:'',
    financial_value:'', actual_financial_loss:'', recovery_possible:'', recovery_amount:'',
    cfo_notified:'', cro_notified:'', police_reported:'', insurer_notified:'',
    root_cause:'', corrective_action:'', write_off_required:'', files: [] as File[]
  };
  });
  const upd = (k:string,v:any) => setF((p:any)=>({...p,[k]:v}));

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) onSubmit(f);
  };

  const isCreateMode = !initialData;

  return (
    <form onSubmit={submitForm} style={{display:'flex',flexDirection:'column',gap:'2rem', pointerEvents: readOnly ? 'none' : 'auto', opacity: readOnly ? 0.95 : 1}}>
      <fieldset disabled={readOnly} style={{ border: 'none', padding: 0, margin: 0 }}>
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
                {f.business_unit && !BUSINESS_UNITS.includes(f.business_unit) && <option value={f.business_unit}>{f.business_unit}</option>}
                {BUSINESS_UNITS.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Branch / Department *" req>
              <select className="input-field" value={f.branch_department} onChange={e=>upd('branch_department',e.target.value)} required disabled={!f.business_unit && !f.branch_department}>
                <option value="">— Select —</option>
                {f.branch_department && !(BRANCH_MAPPING[f.business_unit] || []).includes(f.branch_department) && <option value={f.branch_department}>{f.branch_department}</option>}
                {(BRANCH_MAPPING[f.business_unit] || []).map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Incident Type *" req>
            <select className="input-field" value={f.incident_type} onChange={e=>upd('incident_type',e.target.value)} required>
              <option value="">— Select —</option>
              {f.incident_type && !FINANCE_INCIDENT_TYPES.includes(f.incident_type) && <option value={f.incident_type}>{f.incident_type}</option>}
              {FINANCE_INCIDENT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Description of Incident (factual only) *" req>
            <textarea className="input-field" style={{minHeight:130}} placeholder="Describe the financial incident in factual terms..." value={f.description} onChange={e=>upd('description',e.target.value)} required/>
          </Field>
          
          {/* Only show these fields in detail view (if initialData exists) */}
          {!isCreateMode && (
            <>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
                <CurrencyInput 
                  label="Financial Value Involved" 
                  value={f.financial_value} 
                  onChange={v => upd('financial_value', v)} 
                />
                <CurrencyInput 
                  label="Actual Financial Loss" 
                  value={f.actual_loss} 
                  onChange={v => upd('actual_loss', v)} 
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
            </>
          )}

          <Field label="Supporting Evidence (Attachments)">
            <input type="file" multiple className="input-field" style={{padding:'0.5rem'}} onChange={e=>{
              if(e.target.files) upd('files', Array.from(e.target.files));
            }} />
          </Field>
        </div>
      </div>

      {!readOnly && (
      <div style={{display:'flex',justifyContent:'flex-end',gap:'1rem'}}>
        <button type="button" onClick={onCancel} className="btn btn-secondary" style={{padding:'0.75rem 2rem'}}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{padding:'0.75rem 2.5rem'}}>
          {loading?'Submitting...':'Submit Incident'}
        </button>
      </div>
      )}
      </fieldset>
    </form>
  );
}
