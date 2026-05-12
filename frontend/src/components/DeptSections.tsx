import { Users, Lock as LockIcon } from 'lucide-react';

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><label className="overline">{label}</label>{children}</div>
);

const ReadOnlyField = ({ label, value }: { label: string; value: string }) => (
  <div>
    <label className="overline">{label}</label>
    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--fg-muted)', background: 'var(--bg-subtle)', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-base)' }}>
      {value || '—'}
    </div>
  </div>
);

interface Props { incident: any; editable: boolean; onChange?: (key: string, value: any) => void; }

export function HRDeptSection({ incident, editable, onChange }: Props) {
  const upd = (k: string, v: any) => onChange?.(k, v);
  if (!editable) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <ReadOnlyField label="Investigation Outcome" value={incident.investigation_outcome} />
        <ReadOnlyField label="Corrective / Disciplinary Action" value={incident.corrective_action} />
        <ReadOnlyField label="Legal Counsel Engaged" value={incident.legal_counsel_engaged} />
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Field label="Investigation Outcome">
        <textarea className="input-field" style={{ minHeight: 90 }} value={incident.investigation_outcome || ''} onChange={e => upd('investigation_outcome', e.target.value)} placeholder="Outcome of the investigation..." />
      </Field>
      <Field label="Corrective / Disciplinary Action">
        <textarea className="input-field" style={{ minHeight: 70 }} value={incident.corrective_action || ''} onChange={e => upd('corrective_action', e.target.value)} placeholder="Actions taken..." />
      </Field>
      <Field label="Legal Counsel Engaged">
        <select className="input-field" value={incident.legal_counsel_engaged || ''} onChange={e => upd('legal_counsel_engaged', e.target.value)}>
          <option value="">— Select —</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </Field>
    </div>
  );
}

export function HRConfidentialNotes({ incident, editable, onChange }: Props) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <LockIcon size={14} style={{ color: '#8b5cf6' }} />
        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Restricted — HR Eyes Only</span>
      </div>
      {editable ? (
        <textarea className="input-field" style={{ minHeight: 100, borderColor: '#8b5cf620' }} value={incident.notes || ''} onChange={e => onChange?.('notes', e.target.value)} placeholder="Confidential notes for HR purposes only..." />
      ) : (
        <ReadOnlyField label="" value={incident.notes} />
      )}
    </div>
  );
}

export function WHSDeptSection({ incident, editable, onChange }: Props) {
  const upd = (k: string, v: any) => onChange?.(k, v);
  if (!editable) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <ReadOnlyField label="Medical Treatment Required" value={incident.medical_treatment_required} />
        <ReadOnlyField label="Lost Time Injury" value={incident.lost_time_injury} />
        <ReadOnlyField label="Notifiable to SafeWork" value={incident.notifiable_safework} />
        <ReadOnlyField label="Date Notified to Regulator" value={incident.date_notified_regulator} />
        <ReadOnlyField label="Root Cause" value={incident.root_cause} />
        <ReadOnlyField label="Corrective Action" value={incident.corrective_action} />
        <ReadOnlyField label="Corrective Action Owner" value={incident.corrective_action_owner} />
        <ReadOnlyField label="Corrective Action Due Date" value={incident.corrective_action_due_date} />
        <ReadOnlyField label="CHRO / CRO Notified" value={incident.chro_cro_notified} />
        <ReadOnlyField label="Workers Comp Claim Lodged" value={incident.workers_comp_claim} />
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Field label="Medical Treatment Required"><select className="input-field" value={incident.medical_treatment_required || ''} onChange={e => upd('medical_treatment_required', e.target.value)}><option value="">— Select —</option><option value="Yes">Yes</option><option value="No">No</option></select></Field>
        <Field label="Lost Time Injury"><select className="input-field" value={incident.lost_time_injury || ''} onChange={e => upd('lost_time_injury', e.target.value)}><option value="">— Select —</option><option value="Yes">Yes</option><option value="No">No</option></select></Field>
        <Field label="Notifiable to SafeWork / WorkSafe"><select className="input-field" value={incident.notifiable_safework || ''} onChange={e => upd('notifiable_safework', e.target.value)}><option value="">— Select —</option><option value="Yes">Yes</option><option value="No">No</option></select></Field>
        <Field label="Date Notified to Regulator"><input type="date" className="input-field" value={incident.date_notified_regulator || ''} onChange={e => upd('date_notified_regulator', e.target.value)} /></Field>
      </div>
      <Field label="Root Cause"><textarea className="input-field" style={{ minHeight: 70 }} value={incident.root_cause || ''} onChange={e => upd('root_cause', e.target.value)} placeholder="Root cause analysis..." /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
        <Field label="Corrective Action"><input className="input-field" value={incident.corrective_action || ''} onChange={e => upd('corrective_action', e.target.value)} /></Field>
        <Field label="Corrective Action Owner"><input className="input-field" value={incident.corrective_action_owner || ''} onChange={e => upd('corrective_action_owner', e.target.value)} /></Field>
        <Field label="Corrective Action Due Date"><input type="date" className="input-field" value={incident.corrective_action_due_date || ''} onChange={e => upd('corrective_action_due_date', e.target.value)} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Field label="CHRO / CRO Notified"><select className="input-field" value={incident.chro_cro_notified || ''} onChange={e => upd('chro_cro_notified', e.target.value)}><option value="">— Select —</option><option value="Yes">Yes</option><option value="No">No</option></select></Field>
        <Field label="Workers Compensation Claim Lodged"><select className="input-field" value={incident.workers_comp_claim || ''} onChange={e => upd('workers_comp_claim', e.target.value)}><option value="">— Select —</option><option value="Yes">Yes</option><option value="No">No</option></select></Field>
      </div>
    </div>
  );
}

export function ITDeptSection({ incident, editable, onChange }: Props) {
  const upd = (k: string, v: any) => onChange?.(k, v);
  if (!editable) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <ReadOnlyField label="Containment Actions Taken" value={incident.containment_actions} />
        <ReadOnlyField label="Personal Data Involved" value={incident.personal_data_involved} />
        <ReadOnlyField label="Number of Records Affected" value={incident.records_affected} />
        <ReadOnlyField label="Notifiable Privacy Breach" value={incident.notifiable_privacy_breach} />
        <ReadOnlyField label="Date Notified to OAIC" value={incident.date_notified_oaic} />
        <ReadOnlyField label="CIO Notified" value={incident.cio_notified} />
        <ReadOnlyField label="CRO Notified" value={incident.cro_notified} />
        <ReadOnlyField label="External Cyber Specialist Engaged" value={incident.cyber_specialist_engaged} />
        <ReadOnlyField label="Insurer Notified" value={incident.insurer_notified_dept} />
        <ReadOnlyField label="Root Cause" value={incident.root_cause} />
        <div style={{ gridColumn: 'span 2' }}><ReadOnlyField label="Corrective Action" value={incident.corrective_action} /></div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Field label="Containment Actions Taken"><textarea className="input-field" style={{ minHeight: 70 }} value={incident.containment_actions || ''} onChange={e => upd('containment_actions', e.target.value)} placeholder="Actions taken to contain the breach..." /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Field label="Personal Data Involved"><select className="input-field" value={incident.personal_data_involved || ''} onChange={e => upd('personal_data_involved', e.target.value)}><option value="">— Select —</option><option value="Yes">Yes</option><option value="No">No</option></select></Field>
        <Field label="Number of Records Affected"><input type="number" className="input-field" value={incident.records_affected || ''} onChange={e => upd('records_affected', e.target.value)} /></Field>
        <Field label="Notifiable Privacy Breach"><select className="input-field" value={incident.notifiable_privacy_breach || ''} onChange={e => upd('notifiable_privacy_breach', e.target.value)}><option value="">— Select —</option><option value="Yes">Yes</option><option value="No">No</option></select></Field>
        <Field label="Date Notified to OAIC"><input type="date" className="input-field" value={incident.date_notified_oaic || ''} onChange={e => upd('date_notified_oaic', e.target.value)} /></Field>
        <Field label="CIO Notified"><select className="input-field" value={incident.cio_notified || ''} onChange={e => upd('cio_notified', e.target.value)}><option value="">— Select —</option><option value="Yes">Yes</option><option value="No">No</option></select></Field>
        <Field label="CRO Notified"><select className="input-field" value={incident.cro_notified || ''} onChange={e => upd('cro_notified', e.target.value)}><option value="">— Select —</option><option value="Yes">Yes</option><option value="No">No</option></select></Field>
        <Field label="External Cyber Specialist Engaged"><select className="input-field" value={incident.cyber_specialist_engaged || ''} onChange={e => upd('cyber_specialist_engaged', e.target.value)}><option value="">— Select —</option><option value="Yes">Yes</option><option value="No">No</option></select></Field>
        <Field label="Insurer Notified"><select className="input-field" value={incident.insurer_notified_dept || ''} onChange={e => upd('insurer_notified_dept', e.target.value)}><option value="">— Select —</option><option value="Yes">Yes</option><option value="No">No</option></select></Field>
      </div>
      <Field label="Root Cause"><textarea className="input-field" style={{ minHeight: 70 }} value={incident.root_cause || ''} onChange={e => upd('root_cause', e.target.value)} placeholder="Root cause analysis..." /></Field>
      <Field label="Corrective Action"><textarea className="input-field" style={{ minHeight: 70 }} value={incident.corrective_action || ''} onChange={e => upd('corrective_action', e.target.value)} placeholder="Corrective actions..." /></Field>
    </div>
  );
}

export function RiskDeptSection({ incident, editable, onChange }: Props) {
  const upd = (k: string, v: any) => onChange?.(k, v);
  if (!editable) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <ReadOnlyField label="Regulator / Authority Involved" value={incident.regulator_involved} />
        <ReadOnlyField label="Notified to Regulator" value={incident.notified_regulator} />
        <ReadOnlyField label="Date Notified" value={incident.date_notified} />
        <ReadOnlyField label="CRO Notified" value={incident.cro_notified} />
        <ReadOnlyField label="Legal Counsel Engaged" value={incident.legal_counsel_engaged} />
        <ReadOnlyField label="Financial Penalty Imposed" value={incident.penalty_imposed} />
        <ReadOnlyField label="Penalty Amount" value={incident.penalty_amount} />
        <ReadOnlyField label="Root Cause" value={incident.root_cause} />
        <ReadOnlyField label="Corrective Action" value={incident.corrective_action} />
        <ReadOnlyField label="Corrective Action Owner" value={incident.corrective_action_owner} />
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Field label="Regulator / Authority Involved"><input className="input-field" value={incident.regulator_involved || ''} onChange={e => upd('regulator_involved', e.target.value)} placeholder="e.g. ASIC, ACMA..." /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Field label="Notified to Regulator"><select className="input-field" value={incident.notified_regulator || ''} onChange={e => upd('notified_regulator', e.target.value)}><option value="">— Select —</option><option value="Yes">Yes</option><option value="No">No</option></select></Field>
        <Field label="Date Notified"><input type="date" className="input-field" value={incident.date_notified || ''} onChange={e => upd('date_notified', e.target.value)} /></Field>
        <Field label="CRO Notified"><select className="input-field" value={incident.cro_notified || ''} onChange={e => upd('cro_notified', e.target.value)}><option value="">— Select —</option><option value="Yes">Yes</option><option value="No">No</option></select></Field>
        <Field label="Legal Counsel Engaged"><select className="input-field" value={incident.legal_counsel_engaged || ''} onChange={e => upd('legal_counsel_engaged', e.target.value)}><option value="">— Select —</option><option value="Yes">Yes</option><option value="No">No</option></select></Field>
        <Field label="Financial Penalty Imposed"><select className="input-field" value={incident.penalty_imposed || ''} onChange={e => upd('penalty_imposed', e.target.value)}><option value="">— Select —</option><option value="Yes">Yes</option><option value="No">No</option></select></Field>
        <Field label="Penalty Amount"><input type="number" className="input-field" value={incident.penalty_amount || ''} onChange={e => upd('penalty_amount', e.target.value)} /></Field>
      </div>
      <Field label="Root Cause"><textarea className="input-field" style={{ minHeight: 70 }} value={incident.root_cause || ''} onChange={e => upd('root_cause', e.target.value)} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Field label="Corrective Action"><input className="input-field" value={incident.corrective_action || ''} onChange={e => upd('corrective_action', e.target.value)} /></Field>
        <Field label="Corrective Action Owner"><input className="input-field" value={incident.corrective_action_owner || ''} onChange={e => upd('corrective_action_owner', e.target.value)} /></Field>
      </div>
    </div>
  );
}

export function FinanceDeptSection({ incident, editable, onChange }: Props) {
  const upd = (k: string, v: any) => onChange?.(k, v);
  if (!editable) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <ReadOnlyField label="Financial Value Involved (AUD)" value={incident.financial_value} />
        <ReadOnlyField label="Actual Financial Loss (AUD)" value={incident.actual_loss} />
        <ReadOnlyField label="Recovery Possible" value={incident.recovery_possible} />
        <ReadOnlyField label="Recovery Amount (AUD)" value={incident.recovery_amount} />
        <ReadOnlyField label="CFO Notified" value={incident.cfo_notified} />
        <ReadOnlyField label="CRO Notified" value={incident.cro_notified} />
        <ReadOnlyField label="Police Reported" value={incident.police_reported} />
        <ReadOnlyField label="Insurer Notified" value={incident.insurer_notified_dept} />
        <ReadOnlyField label="Root Cause" value={incident.root_cause} />
        <ReadOnlyField label="Corrective Action" value={incident.corrective_action} />
        <ReadOnlyField label="Write-Off Required" value={incident.write_off_required} />
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Field label="Financial Value Involved (AUD)"><input type="number" className="input-field" value={incident.financial_value || ''} onChange={e => upd('financial_value', e.target.value)} /></Field>
        <Field label="Actual Financial Loss (AUD)"><input type="number" className="input-field" value={incident.actual_loss || ''} onChange={e => upd('actual_loss', e.target.value)} /></Field>
        <Field label="Recovery Possible"><select className="input-field" value={incident.recovery_possible || ''} onChange={e => upd('recovery_possible', e.target.value)}><option value="">— Select —</option><option value="Yes">Yes</option><option value="No">No</option></select></Field>
        <Field label="Recovery Amount (AUD)"><input type="number" className="input-field" value={incident.recovery_amount || ''} onChange={e => upd('recovery_amount', e.target.value)} /></Field>
        <Field label="CFO Notified"><select className="input-field" value={incident.cfo_notified || ''} onChange={e => upd('cfo_notified', e.target.value)}><option value="">— Select —</option><option value="Yes">Yes</option><option value="No">No</option></select></Field>
        <Field label="CRO Notified"><select className="input-field" value={incident.cro_notified || ''} onChange={e => upd('cro_notified', e.target.value)}><option value="">— Select —</option><option value="Yes">Yes</option><option value="No">No</option></select></Field>
        <Field label="Police Reported"><select className="input-field" value={incident.police_reported || ''} onChange={e => upd('police_reported', e.target.value)}><option value="">— Select —</option><option value="Yes">Yes</option><option value="No">No</option></select></Field>
        <Field label="Insurer Notified"><select className="input-field" value={incident.insurer_notified_dept || ''} onChange={e => upd('insurer_notified_dept', e.target.value)}><option value="">— Select —</option><option value="Yes">Yes</option><option value="No">No</option></select></Field>
      </div>
      <Field label="Root Cause"><textarea className="input-field" style={{ minHeight: 70 }} value={incident.root_cause || ''} onChange={e => upd('root_cause', e.target.value)} /></Field>
      <Field label="Corrective Action"><textarea className="input-field" style={{ minHeight: 70 }} value={incident.corrective_action || ''} onChange={e => upd('corrective_action', e.target.value)} /></Field>
      <Field label="Write-Off Required"><select className="input-field" value={incident.write_off_required || ''} onChange={e => upd('write_off_required', e.target.value)}><option value="">— Select —</option><option value="Yes">Yes</option><option value="No">No</option></select></Field>
    </div>
  );
}
