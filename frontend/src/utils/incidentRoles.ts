// Utility: Determine incident category + role-based visibility
// Backend roles: full_access, bu_access, branch_access, hr_access, whs_access, it_access, risk_compliance, finance_access, submit_only

export type IncidentCategory = 'cargo' | 'hr' | 'whs' | 'it' | 'risk' | 'finance' | 'ncr';

export function getIncidentCategory(incident: any): IncidentCategory {
  if (incident.category) return incident.category;
  const ref = (incident.incident_number_str || '').toUpperCase();
  if (ref.startsWith('CEI-') || ref.startsWith('CRG')) return 'cargo';
  if (ref.startsWith('HR-') || ref.startsWith('HRI')) return 'hr';
  if (ref.startsWith('WHS-')) return 'whs';
  if (ref.startsWith('IT-') || ref.startsWith('ITI')) return 'it';
  if (ref.startsWith('RC-') || ref.startsWith('RCI')) return 'risk';
  if (ref.startsWith('FIN-')) return 'finance';
  if (ref.startsWith('NCR-')) return 'ncr';

  const t = (incident.type || '').toLowerCase();
  if (t.includes('cargo') || t.includes('equipment')) return 'cargo';
  if (t.includes('human') || t.includes('hr') || t.includes('misconduct') || t.includes('harassment') || t.includes('grievance')) return 'hr';
  if (t.includes('whs') || t.includes('safety') || t.includes('health') || t.includes('injury')) return 'whs';
  if (t.includes('it') || t.includes('security') || t.includes('cyber') || t.includes('data breach')) return 'it';
  if (t.includes('risk') || t.includes('compliance') || t.includes('regulatory')) return 'risk';
  if (t.includes('finance') || t.includes('travel')) return 'finance';
  if (t.includes('ncr') || t.includes('non-conformance')) return 'ncr';
  return 'cargo';
}

export const CATEGORY_META: Record<IncidentCategory, { label: string; color: string; deptOwner: string; deptLabel: string }> = {
  cargo: { label: 'Cargo & Equipment', color: '#f59e0b', deptOwner: 'risk_compliance', deptLabel: 'Risk & Compliance Team' },
  hr:    { label: 'Human Resources', color: '#8b5cf6', deptOwner: 'hr_access', deptLabel: 'HR Department' },
  whs:   { label: 'WH&S Incident', color: '#ef4444', deptOwner: 'hr_access', deptLabel: 'WHS / Safety Team' },
  it:    { label: 'IT & Security', color: '#06b6d4', deptOwner: 'it_access', deptLabel: 'IT / CIO Office' },
  risk:  { label: 'Risk & Compliance', color: '#10b981', deptOwner: 'risk_compliance', deptLabel: 'R&C Team' },
  finance: { label: 'Finance', color: '#3b82f6', deptOwner: 'finance_access', deptLabel: 'Finance Team' },
  ncr:   { label: 'Non-Conformance', color: '#eab308', deptOwner: 'risk_compliance', deptLabel: 'R&C / Quality Team' },
};

/**
 * Check if the dept-specific section has been filled.
 * Uses ONLY fields exclusive to the dept investigation section
 * (NOT fields that overlap with user submission like root_cause / corrective_action).
 */
export function isDeptSectionFilled(incident: any, category: IncidentCategory): boolean {
  if (incident.dept_section_updated === true || incident.dept_section_updated === 'true') return true;

  switch (category) {
    case 'hr':
      return !!(incident.investigation_outcome || incident.legal_counsel_engaged);
    case 'whs':
      return !!(incident.medical_treatment_required || incident.lost_time_injury || incident.notifiable_safework || incident.chro_cro_notified || incident.workers_comp_claim);
    case 'it':
      return !!(incident.containment_actions || incident.personal_data_involved || incident.notifiable_privacy_breach || incident.cio_notified);
    case 'risk':
      return !!(incident.regulator_involved || incident.notified_regulator || incident.penalty_imposed);
    case 'finance':
      return !!(incident.financial_value || incident.actual_loss || incident.recovery_possible || incident.cfo_notified);
    case 'cargo':
      // For cargo, the "investigation" is the Liability/Claims section
      return !!(incident.responsible_party || incident.formal_claim_issued || incident.risk_level);
    case 'ncr':
      return !!(incident.cause_of_nc || incident.corrective_action || incident.preventive_action);
    default:
      return !!incident.dept_section_updated;
  }
}

/** Can the current role see the department-specific section? */
export function canSeeDeptSection(role: string | null, category: IncidentCategory): boolean {
  if (role === 'full_access') return true;
  if (role === 'risk_compliance') return true;
  if (role === 'bu_access' || role === 'branch_access') return true;
  // Dept-specific roles
  if (role === 'hr_access' && (category === 'hr' || category === 'whs')) return true;
  if (role === 'whs_access' && category === 'whs') return true;
  if (role === 'it_access' && category === 'it') return true;
  if (role === 'finance_access' && category === 'finance') return true;
  return false;
}

/**
 * Can the current role EDIT the department-specific section?
 * Only the actual department team can edit their section.
 */
export function canEditDeptSection(role: string | null, category: IncidentCategory): boolean {
  if (role === 'hr_access' && (category === 'hr' || category === 'whs')) return true;
  if (role === 'whs_access' && category === 'whs') return true;
  if (role === 'it_access' && category === 'it') return true;
  if (role === 'risk_compliance' && (category === 'risk' || category === 'cargo')) return true;
  if (role === 'finance_access' && category === 'finance') return true;
  return false;
}

/** Can see the R&C Liability section? */
export function canSeeRCSection(role: string | null): boolean {
  return ['full_access', 'risk_compliance'].includes(role || '');
}

/** Can see the confidential HR notes? */
export function canSeeConfidentialNotes(role: string | null): boolean {
  return ['full_access', 'hr_access'].includes(role || '');
}
