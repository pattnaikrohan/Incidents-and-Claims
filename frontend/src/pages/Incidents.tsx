import { useState, useEffect } from 'react';
import { FileText, Filter, Briefcase, AlertTriangle, Shield, Users, RefreshCw, ChevronDown, ChevronUp, Package, HeartPulse, Lock, DollarSign, FileWarning } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Incidents() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('active');
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { role, branchName, businessUnit } = useAuth();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    // Auto-expand relevant section for dept-specific roles
    const base = { cargo: false, hr: false, whs: false, it: false, risk: false, finance: false, ncr: false };
    if (role === 'hr_access') return { ...base, hr: true, whs: true };
    if (role === 'whs_access') return { ...base, whs: true };
    if (role === 'it_access') return { ...base, it: true };
    if (role === 'finance_access') return { ...base, finance: true };
    return base;
  });
  const [sectionFilters, setSectionFilters] = useState<Record<string, string>>({
    cargo: '', hr: '', whs: '', it: '', risk: '', finance: '', ncr: ''
  });
  const [activeFilterMenu, setActiveFilterMenu] = useState<string | null>(null);
  const [sectionSort, setSectionSort] = useState<Record<string, { field: string, dir: 'asc' | 'desc' }>>({
    cargo: { field: 'date', dir: 'desc' },
    hr: { field: 'date', dir: 'desc' },
    whs: { field: 'date', dir: 'desc' },
    it: { field: 'date', dir: 'desc' },
    risk: { field: 'date', dir: 'desc' },
    finance: { field: 'date', dir: 'desc' },
    ncr: { field: 'date', dir: 'desc' },
  });
  const [filterStates, setFilterStates] = useState<Record<string, any>>({}); // category: { status: [], branch: [] }

  const INCIDENT_TYPES = [
    { id: 'cargo', label: 'Cargo & Equipment', icon: Package, color: '#f59e0b', desc: 'Cargo damage, theft, equipment failure', columns: ['Reference', 'Job Number', 'Classification', 'Jurisdiction', 'Customer', 'Lodged Date', 'Status', 'Exposure'] },
    { id: 'hr', label: 'Human Resources', icon: Users, color: '#8b5cf6', desc: 'Workplace conduct & HR matters', columns: ['Reference', 'Matter Type', 'Employee', 'Branch / Dept', 'Lodged Date', 'Status'] },
    { id: 'whs', label: 'WH&S Incident', icon: HeartPulse, color: '#ef4444', desc: 'Workplace health, safety & injuries', columns: ['Reference', 'Injury / Incident', 'Location', 'Branch / Dept', 'Lodged Date', 'Status'] },
    { id: 'it', label: 'IT & Security', icon: Lock, color: '#06b6d4', desc: 'Cyber, data breach & system issues', columns: ['Reference', 'Issue Type', 'System', 'Branch / Dept', 'Lodged Date', 'Status'] },
    { id: 'risk', label: 'Risk & Compliance', icon: Shield, color: '#10b981', desc: 'Regulatory breaches & compliance', columns: ['Reference', 'Breach Type', 'Regulatory Body', 'Branch / Dept', 'Lodged Date', 'Status'] },
    { id: 'finance', label: 'Finance', icon: DollarSign, color: '#3b82f6', desc: 'Financial incidents & travel disruption', columns: ['Reference', 'Financial Incident', 'Transaction Ref', 'Branch / Dept', 'Lodged Date', 'Status'] },
    { id: 'ncr', label: 'Non-Conformance Report', icon: FileWarning, color: '#eab308', desc: 'Process failures & defects', columns: ['Reference', 'Process Failure', 'Root Cause', 'Branch / Dept', 'Lodged Date', 'Status'] },
  ];

  const getCategory = (incident: any) => {
    // 1. Check for explicit category ID from backend/local storage
    if (incident.category && INCIDENT_TYPES.some(c => c.id === incident.category)) {
      return incident.category;
    }
    
    // 2. Check for common prefixes in reference number (e.g., CEI-, HR-, WHS-)
    const ref = (incident.incident_number_str || '').toUpperCase();
    if (ref.startsWith('CEI-')) return 'cargo';
    if (ref.startsWith('HR-')) return 'hr';
    if (ref.startsWith('WHS-')) return 'whs';
    if (ref.startsWith('IT-')) return 'it';
    if (ref.startsWith('RC-')) return 'risk';
    if (ref.startsWith('FIN-')) return 'finance';
    if (ref.startsWith('NCR-')) return 'ncr';

    // 3. Fallback to keyword matching in the type/classification string
    const t = (incident.type || '').toLowerCase();
    if (t.includes('cargo') || t.includes('equipment') || t.includes('damage') || t.includes('theft') || t.includes('property') || t.includes('site') || t.includes('abandoned') || t.includes('container') || t.includes('vessel') || t.includes('warehouse')) return 'cargo';
    if (t.includes('human') || t.includes('hr') || t.includes('conduct') || t.includes('workplace') || t.includes('personnel') || t.includes('grievance') || t.includes('misconduct') || t.includes('harassment')) return 'hr';
    if (t.includes('whs') || t.includes('wh&s') || t.includes('safety') || t.includes('health') || t.includes('injury') || t.includes('accident') || t.includes('near miss') || t.includes('medical') || t.includes('first aid')) return 'whs';
    if (t.includes('it') || t.includes('security') || t.includes('cyber') || t.includes('system') || t.includes('data breach') || t.includes('outage') || t.includes('network') || t.includes('software')) return 'it';
    if (t.includes('risk') || t.includes('compliance') || t.includes('regulatory') || t.includes('breach') || t.includes('policy') || t.includes('sanction') || t.includes('cor') || t.includes('audit')) return 'risk';
    if (t.includes('finance') || t.includes('financial') || t.includes('travel') || t.includes('payment') || t.includes('disruption') || t.includes('claim')) return 'finance';
    if (t.includes('non-conformance') || t.includes('ncr') || t.includes('defect') || t.includes('capa') || t.includes('quality')) return 'ncr';
    
    // Default to Cargo & Equipment for general operational incidents
    return 'cargo';
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Cache and backend DB fetch removed to rely completely on Power Automate

  const fetchLatestFromPA = async () => {
    try {
      console.log('Polling Power Automate for latest incidents...');
      const response = await fetch('https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/c0d6a89ac13e49fb9e84b993721d6b4e/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=Y2-4H9wder7Ea3MoWPW_gMSWPWyL4a9uHsiTbJ1TDFw');
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Power Automate polling failed:', response.status, errorText);
        return;
      }

      const payload = await response.json();
      console.log('Received structured data from Power Automate:', Object.keys(payload));
      
      const allNewIncidents: any[] = [];

      // ── CARGO & EQUIPMENT ─────────────────────────────────
      if (Array.isArray(payload.cargo_equipment_incidents)) {
        payload.cargo_equipment_incidents.forEach((raw: any) => {
          allNewIncidents.push({
            id: raw.cr991_cargoequipmentincidentid || raw.id,
            category: 'cargo',
            incident_number_str: raw.cr991_incidentid,
            type: raw["cr991_incidenttype@OData.Community.Display.V1.FormattedValue"] || 'Cargo & Equipment',
            location: raw.cr991_locationofincident || 'N/A',
            branch_department: raw["cr991_branchdepartment@OData.Community.Display.V1.FormattedValue"] || 'N/A',
            business_unit: raw["cr991_businessunit@OData.Community.Display.V1.FormattedValue"] || 'N/A',
            date: (raw["overriddencreatedon@OData.Community.Display.V1.FormattedValue"] || raw.cr991_datelogged || '').split(' ')[0],
            status: raw["cr991_incidentstatus@OData.Community.Display.V1.FormattedValue"] || 'Open',
            value: raw.cr991_incidentclaimestimate || raw.cr991_cargovalue || 'Pending',
            description: raw.cr991_shortdescription || raw.cr991_cargodescription || 'No description',
            job_number: raw.cr991_systemjobnumber || 'N/A',
            customer_name: raw.cr991_customer || 'N/A',
            formal_claim_issued: 'No',
            cor_required: raw["cr991_cor@OData.Community.Display.V1.FormattedValue"] === 'Yes' ? 'Yes' : 'No',
            insurer_notified: raw["cr991_insurernotified@OData.Community.Display.V1.FormattedValue"] === 'Yes' ? 'Yes' : 'No',
            management_escalation: 'No',
            created_at: raw.createdon,
            // ── CargoForm-specific fields ──
            short_description: raw.cr991_shortdescription || '',
            date_of_incident: raw.cr991_dateofincident || '',
            date_logged: raw.cr991_datelogged || '',
            logged_by: raw.cr991_loggedby || '',
            mode: raw.cr991_mode || '',
            system_job_number: raw.cr991_systemjobnumber || '',
            mbl_mawb_issued: raw["cr991_mblmawbissued@OData.Community.Display.V1.FormattedValue"] || 'N/A',
            mbl_mawb_number: raw.cr991_mblmawbnumber || '',
            hbl_hawb_issued: raw["cr991_hblhawbissued@OData.Community.Display.V1.FormattedValue"] || 'N/A',
            hbl_hawb_number: raw.cr991_hblhawbnumber || '',
            customer: raw.cr991_customer || '',
            container_numbers: raw.cr991_containernumbers || '',
            origin: raw.cr991_origin || '',
            destination: raw.cr991_destination || '',
            cargo_description: raw.cr991_cargodescription || '',
            cargo_value: raw.cr991_cargovalue || '',
            location_of_incident: raw.cr991_locationofincident || '',
            origin_agent: raw.cr991_originagent || '',
            destination_agent: raw.cr991_destinationagent || '',
            shipping_line: raw.cr991_shippinglineairline || '',
            coloader: raw.cr991_coloader || '',
            transport_company: raw.cr991_transportcompany || '',
            scope_of_work: raw.cr991_scopeofwork || '',
            incident_types: raw["cr991_incidenttype@OData.Community.Display.V1.FormattedValue"] ? [raw["cr991_incidenttype@OData.Community.Display.V1.FormattedValue"].trim()] : [],
            corrective_actions: raw["cr991_immediatecorrectiveaction@OData.Community.Display.V1.FormattedValue"] ? [raw["cr991_immediatecorrectiveaction@OData.Community.Display.V1.FormattedValue"].trim()] : [],
            claim_estimate: raw.cr991_incidentclaimestimate || '',
          });
        });
      }

      // ── HUMAN RESOURCES ───────────────────────────────────
      if (Array.isArray(payload.human_resources_incidents)) {
        payload.human_resources_incidents.forEach((raw: any) => {
          allNewIncidents.push({
            id: raw.cr991_humanresourcesincidentid || raw.id,
            category: 'hr',
            incident_number_str: raw.cr991_incidentid,
            type: raw["cr991_incidenttype@OData.Community.Display.V1.FormattedValue"] || 'Human Resources',
            location: raw.cr991_locationofincident || 'N/A',
            branch_department: raw["cr991_branchdepartment@OData.Community.Display.V1.FormattedValue"] || 'N/A',
            business_unit: raw["cr991_businessunit@OData.Community.Display.V1.FormattedValue"] || 'N/A',
            date: (raw["overriddencreatedon@OData.Community.Display.V1.FormattedValue"] || raw.cr991_datelogged || '').split(' ')[0],
            status: raw["cr991_incidentstatus@OData.Community.Display.V1.FormattedValue"] || 'Open',
            description: raw.cr991_shortdescription || raw.cr991_incidentsummary || 'No description',
            employee_involved: raw.cr991_employee || raw.cr991_employeeinvolved || 'N/A',
            formal_claim_issued: 'No',
            cor_required: 'No',
            management_escalation: 'No',
            created_at: raw.createdon,
            // ── HRForm-specific fields ──
            date_of_incident: raw.cr991_dateofincident || '',
            date_logged: raw.cr991_datelogged || '',
            logged_by: raw.cr991_loggedby || '',
            employee_name: raw.cr991_employee || raw.cr991_employeeinvolved || '',
            incident_type: raw["cr991_incidenttype@OData.Community.Display.V1.FormattedValue"] || '',
            witnesses: raw.cr991_witnesses || '',
            immediate_action: raw.cr991_immediateaction || '',
            investigation_required: raw["cr991_investigationrequired@OData.Community.Display.V1.FormattedValue"] || '',
            investigation_outcome: raw.cr991_investigationoutcome || '',
            corrective_action: raw.cr991_correctiveaction || '',
            legal_counsel_engaged: raw["cr991_legalcounselengaged@OData.Community.Display.V1.FormattedValue"] || '',
            close_out_date: raw.cr991_closeoutdate || '',
            notes: raw.cr991_notes || '',
          });
        });
      }

      // ── WH&S ──────────────────────────────────────────────
      if (Array.isArray(payload.workplace_health_safety_incidents)) {
        payload.workplace_health_safety_incidents.forEach((raw: any) => {
          allNewIncidents.push({
            id: raw.cr991_workplacehealthsafetyincidentid || raw.id,
            category: 'whs',
            incident_number_str: raw.cr991_incidentid,
            type: raw["cr991_incidenttype@OData.Community.Display.V1.FormattedValue"] || 'WH&S Incident',
            location: raw.cr991_locationofincident || 'N/A',
            branch_department: raw["cr991_branchdepartment@OData.Community.Display.V1.FormattedValue"] || 'N/A',
            business_unit: raw["cr991_businessunit@OData.Community.Display.V1.FormattedValue"] || 'N/A',
            date: (raw["overriddencreatedon@OData.Community.Display.V1.FormattedValue"] || raw.cr991_datelogged || '').split(' ')[0],
            status: raw["cr991_incidentstatus@OData.Community.Display.V1.FormattedValue"] || 'Open',
            description: raw.cr991_shortdescription || raw.cr991_incidentsummary || 'No description',
            formal_claim_issued: 'No',
            cor_required: 'No',
            management_escalation: 'No',
            created_at: raw.createdon,
            // ── WHSForm-specific fields ──
            date_of_incident: raw.cr991_dateofincident || '',
            date_logged: raw.cr991_datelogged || '',
            logged_by: raw.cr991_loggedby || '',
            persons_involved: raw.cr991_personsinvolved || '',
            incident_type: raw["cr991_incidenttype@OData.Community.Display.V1.FormattedValue"] || '',
            injury_details: raw.cr991_injurydetails || '',
            medical_treatment_required: raw["cr991_medicaltreatmentrequired@OData.Community.Display.V1.FormattedValue"] || '',
            lost_time_injury: raw["cr991_losttimeinjury@OData.Community.Display.V1.FormattedValue"] || '',
            notifiable_safework: raw["cr991_notifiablesafework@OData.Community.Display.V1.FormattedValue"] || '',
            date_notified_regulator: raw.cr991_datenotifiedregulator || '',
            root_cause: raw.cr991_rootcause || '',
            corrective_action: raw.cr991_correctiveaction || '',
            corrective_action_owner: raw.cr991_correctiveactionowner || '',
            corrective_action_due_date: raw.cr991_correctiveactionduedate || '',
            chro_cro_notified: raw["cr991_chro_cronotified@OData.Community.Display.V1.FormattedValue"] || '',
            workers_comp_claim: raw["cr991_workerscompclaim@OData.Community.Display.V1.FormattedValue"] || '',
          });
        });
      }

      // ── IT & SECURITY ─────────────────────────────────────
      if (Array.isArray(payload.it_security_incidents)) {
        payload.it_security_incidents.forEach((raw: any) => {
          allNewIncidents.push({
            id: raw.cr991_itsecurityincidentid || raw.id,
            category: 'it',
            incident_number_str: raw.cr991_incidentid,
            type: raw["cr991_incidenttype@OData.Community.Display.V1.FormattedValue"] || 'IT & Security',
            location: raw.cr991_locationofincident || 'N/A',
            branch_department: raw["cr991_branchdepartment@OData.Community.Display.V1.FormattedValue"] || 'N/A',
            business_unit: raw["cr991_businessunit@OData.Community.Display.V1.FormattedValue"] || 'N/A',
            date: (raw["overriddencreatedon@OData.Community.Display.V1.FormattedValue"] || raw.cr991_datelogged || '').split(' ')[0],
            status: raw["cr991_incidentstatus@OData.Community.Display.V1.FormattedValue"] || 'Open',
            description: raw.cr991_shortdescription || raw.cr991_incidentsummary || 'No description',
            system_affected: raw.cr991_system || raw.cr991_systemaffected || 'N/A',
            formal_claim_issued: 'No',
            cor_required: 'No',
            management_escalation: 'No',
            created_at: raw.createdon,
            // ── ITForm-specific fields ──
            date_of_incident: raw.cr991_dateofincident || '',
            date_logged: raw.cr991_datelogged || '',
            logged_by: raw.cr991_loggedby || '',
            incident_type: raw["cr991_incidenttype@OData.Community.Display.V1.FormattedValue"] || '',
            number_of_users_affected: raw.cr991_numberofusersaffected || '',
            data_breach: raw["cr991_databreach@OData.Community.Display.V1.FormattedValue"] || '',
            data_type_compromised: raw.cr991_datatypecompromised || '',
            notifiable_data_breach: raw["cr991_notifiabledatabreach@OData.Community.Display.V1.FormattedValue"] || '',
            it_support_ticket_ref: raw.cr991_itsupportticketref || '',
            root_cause: raw.cr991_rootcause || '',
            system_restored: raw["cr991_systemrestored@OData.Community.Display.V1.FormattedValue"] || '',
          });
        });
      }

      // ── RISK & COMPLIANCE ─────────────────────────────────
      if (Array.isArray(payload.risk_compliance_incidents)) {
        payload.risk_compliance_incidents.forEach((raw: any) => {
          allNewIncidents.push({
            id: raw.cr991_riskcomplianceincidentid || raw.id,
            category: 'risk',
            incident_number_str: raw.cr991_incidentid,
            type: raw["cr991_incidenttype@OData.Community.Display.V1.FormattedValue"] || 'Risk & Compliance',
            location: raw.cr991_locationofincident || 'N/A',
            branch_department: raw["cr991_branchdepartment@OData.Community.Display.V1.FormattedValue"] || 'N/A',
            business_unit: raw["cr991_businessunit@OData.Community.Display.V1.FormattedValue"] || 'N/A',
            date: (raw["overriddencreatedon@OData.Community.Display.V1.FormattedValue"] || raw.cr991_datelogged || '').split(' ')[0],
            status: raw["cr991_incidentstatus@OData.Community.Display.V1.FormattedValue"] || 'Open',
            description: raw.cr991_shortdescription || raw.cr991_incidentsummary || 'No description',
            regulatory_body: raw.cr991_regulatorybody || 'N/A',
            formal_claim_issued: 'No',
            cor_required: 'No',
            management_escalation: 'No',
            created_at: raw.createdon,
            // ── RiskForm-specific fields ──
            date_of_incident: raw.cr991_dateofincident || '',
            date_logged: raw.cr991_datelogged || '',
            logged_by: raw.cr991_loggedby || '',
            incident_type: raw["cr991_incidenttype@OData.Community.Display.V1.FormattedValue"] || '',
            legislation_policy_breached: raw.cr991_legislationpolicybreached || '',
            financial_penalty_estimate: raw.cr991_financialpenaltyestimate || '',
            regulator_notified: raw["cr991_regulatornotified@OData.Community.Display.V1.FormattedValue"] || '',
            date_regulator_notified: raw.cr991_dateregulatornotified || '',
            remediation_plan: raw.cr991_remediationplan || '',
            board_notified: raw["cr991_boardnotified@OData.Community.Display.V1.FormattedValue"] || '',
          });
        });
      }

      // ── FINANCE ───────────────────────────────────────────
      if (Array.isArray(payload.finance_incidents)) {
        payload.finance_incidents.forEach((raw: any) => {
          allNewIncidents.push({
            id: raw.cr991_financeincidentid || raw.id,
            category: 'finance',
            incident_number_str: raw.cr991_incidentid,
            type: raw["cr991_incidenttype@OData.Community.Display.V1.FormattedValue"] || 'Finance',
            location: raw.cr991_locationofincident || 'N/A',
            branch_department: raw["cr991_branchdepartment@OData.Community.Display.V1.FormattedValue"] || 'N/A',
            business_unit: raw["cr991_businessunit@OData.Community.Display.V1.FormattedValue"] || 'N/A',
            date: (raw["overriddencreatedon@OData.Community.Display.V1.FormattedValue"] || raw.cr991_datelogged || '').split(' ')[0],
            status: raw["cr991_incidentstatus@OData.Community.Display.V1.FormattedValue"] || 'Open',
            description: raw.cr991_shortdescription || raw.cr991_incidentsummary || 'No description',
            transaction_ref: raw.cr991_transactionref || 'N/A',
            formal_claim_issued: 'No',
            cor_required: 'No',
            management_escalation: 'No',
            created_at: raw.createdon,
            // ── FinanceForm-specific fields ──
            date_of_incident: raw.cr991_dateofincident || '',
            date_logged: raw.cr991_datelogged || '',
            logged_by: raw.cr991_loggedby || '',
            incident_type: raw["cr991_incidenttype@OData.Community.Display.V1.FormattedValue"] || '',
            financial_impact_aud: raw.cr991_financialimpactaud || '',
            vendor_customer_name: raw.cr991_vendorcustomername || '',
            police_notified: raw["cr991_policenotified@OData.Community.Display.V1.FormattedValue"] || '',
            bank_notified: raw["cr991_banknotified@OData.Community.Display.V1.FormattedValue"] || '',
            recovery_possible: raw["cr991_recoverypossible@OData.Community.Display.V1.FormattedValue"] || '',
            control_failure_identified: raw.cr991_controlfailureidentified || '',
          });
        });
      }

      // ── BACKWARDS COMPATIBILITY: handle flat array response ─
      if (Array.isArray(payload)) {
        payload.forEach((raw: any) => {
          allNewIncidents.push({
            id: raw.cr991_cargoequipmentincidentid || raw.id,
            category: 'cargo',
            incident_number_str: raw.cr991_incidentid || raw.incident_number_str,
            type: raw["cr991_incidenttype@OData.Community.Display.V1.FormattedValue"] || raw.type || 'Cargo & Equipment',
            location: raw.cr991_locationofincident || raw.location || 'N/A',
            branch_department: raw["cr991_branchdepartment@OData.Community.Display.V1.FormattedValue"] || raw.branch_department || 'N/A',
            business_unit: raw["cr991_businessunit@OData.Community.Display.V1.FormattedValue"] || raw.business_unit || 'N/A',
            date: (raw["overriddencreatedon@OData.Community.Display.V1.FormattedValue"] || raw.cr991_datelogged || raw.date || '').split(' ')[0],
            status: raw["cr991_incidentstatus@OData.Community.Display.V1.FormattedValue"] || raw.status || 'Open',
            value: raw.cr991_incidentclaimestimate || raw.cr991_cargovalue || 'Pending',
            description: raw.cr991_shortdescription || raw.description || 'No description',
            job_number: raw.cr991_systemjobnumber || raw.job_number || 'N/A',
            customer_name: raw.cr991_customer || 'N/A',
            formal_claim_issued: 'No',
            cor_required: 'No',
            management_escalation: 'No',
            created_at: raw.createdon,
          });
        });
      }

      // Filter to only valid records
      const validNew = allNewIncidents.filter((inc: any) => inc.id);

      // ── SYNC WITH BACKEND METADATA ──────────────────────────
      // Power Automate only provides core incident data. 
      // We must merge the investigation metadata from our backend.
      try {
        const response = await api.get('/incidents');
        const backendIncidents = response.data || [];
        validNew.forEach(inc => {
          const match = backendIncidents.find((bi: any) => String(bi.id) === String(inc.id));
          if (match) {
            // Merge metadata fields while preserving PA core fields
            // Fields like _dept_section_updated, investigation_outcome, root_cause, etc.
            Object.keys(match).forEach(key => {
              if (match[key] !== null && match[key] !== undefined && match[key] !== '') {
                inc[key] = match[key];
              }
            });
          }
        });
      } catch (err) {
        console.warn('Metadata sync skip:', err);
      }

      setIncidents([...validNew]);
      // Keep cache synced strictly for the details page navigation
      localStorage.setItem('incidents_cache', JSON.stringify(validNew));
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch from Power Automate (CORS or Network Error):', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestFromPA();
  }, []);

  // Poll for latest incident via Power Automate flow every 2s
  useEffect(() => {
    const interval = setInterval(fetchLatestFromPA, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchLatestFromPA(); // Fetch latest from PA only
    setIsRefreshing(false);
  };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center' }}>Synchronizing Digital Twin Register...</div>;

  let displayedIncidents = incidents;
  
  // Enforce Role-Based Access Control (RBAC)
  // Admin and Risk & Compliance can see everything.
  if (role !== 'full_access' && role !== 'risk_compliance') {
    // If BU manager, they see all branches in their business unit
    if (role === 'bu_access' && businessUnit) {
      displayedIncidents = displayedIncidents.filter(i => i.business_unit === businessUnit || i.branch_department === businessUnit);
    } 
    // Dept-specific roles see ALL incidents but only their category
    else if (role === 'hr_access') {
      displayedIncidents = displayedIncidents.filter(i => {
        const cat = getCategory(i);
        return cat === 'hr' || cat === 'whs';
      });
    }
    else if (role === 'whs_access') {
      displayedIncidents = displayedIncidents.filter(i => getCategory(i) === 'whs');
    }
    else if (role === 'it_access') {
      displayedIncidents = displayedIncidents.filter(i => getCategory(i) === 'it');
    }
    else if (role === 'finance_access') {
      displayedIncidents = displayedIncidents.filter(i => getCategory(i) === 'finance');
    }
    // If Branch Manager (or other branch-specific role), they ONLY see their branch
    else if (branchName) {
      displayedIncidents = displayedIncidents.filter(i => i.branch_department === branchName);
    }
  }

  if (location.pathname === '/claims') {
    displayedIncidents = displayedIncidents.filter(i => i.formal_claim_issued === 'Yes');
  } else if (location.pathname === '/cors') {
    displayedIncidents = displayedIncidents.filter(i => i.cor_required === 'Yes');
  } else if (location.pathname === '/insurers') {
    displayedIncidents = displayedIncidents.filter(i => i.insurer_notified === 'Yes');
  } else if (location.pathname === '/escalations') {
    displayedIncidents = displayedIncidents.filter(i => i.management_escalation === 'Yes');
  }

  // Apply tab filter
  displayedIncidents = displayedIncidents.filter(i => {
    if (activeTab === 'active') return !i.status?.includes('Closed') && i.status !== 'Draft';
    if (activeTab === 'closed') return i.status?.includes('Closed');
    if (activeTab === 'drafts') return i.status === 'Draft';
    return true;
  });

  const isClaims = location.pathname === '/claims';
  const isCors = location.pathname === '/cors';
  const isInsurers = location.pathname === '/insurers';
  const isEscalations = location.pathname === '/escalations';
  
  const pageTitle = isClaims 
    ? 'Claims Register' 
    : isCors 
    ? 'CORs Register' 
    : isInsurers
    ? 'Insurer Notifications'
    : isEscalations
    ? 'Management Escalations'
    : 'Incident Register';
  const HeaderIcon = isClaims ? Briefcase : isCors ? AlertTriangle : isInsurers ? Shield : isEscalations ? Users : FileText;
  const headerColor = isClaims ? '#10b981' : isCors ? '#f97316' : isInsurers ? '#06b6d4' : isEscalations ? '#8b5cf6' : '#6366f1';

  return (
    <div className="fade-in">
      {/* Ultra-Compact Posh Hero Header */}
      <div style={{
        padding: '0.75rem 1.5rem',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.95))',
        boxShadow: '0 10px 20px -8px rgba(0, 0, 0, 0.3)',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: '1rem',
        color: 'white',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        {/* Subtle background glow */}
        <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '300px', height: '300px', background: `radial-gradient(circle, ${headerColor}20 0%, transparent 60%)`, filter: 'blur(30px)', zIndex: 0 }} />
        
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ 
              width: '36px', height: '36px', borderRadius: '10px', 
              background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(255, 255, 255, 0.15)', boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
            }}>
              <HeaderIcon size={20} color={headerColor} />
            </div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(to right, #ffffff, rgba(255,255,255,0.7))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {pageTitle}
              <span style={{ 
                fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.4rem', 
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', 
                borderRadius: '8px', color: '#fff', WebkitTextFillColor: '#fff',
                verticalAlign: 'middle'
              }}>
                {displayedIncidents.length}
              </span>
            </h1>
          </div>

          <button 
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="btn"
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#fff',
              fontSize: '0.7rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(10px)'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            <RefreshCw size={12} className={isRefreshing ? "spin-animation" : ""} />
            {isRefreshing ? 'Refreshing...' : 'Global Refresh'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ 
          display: 'flex', gap: '0.2rem', padding: '0.25rem', 
          background: 'var(--bg-elevated)', borderRadius: '20px', 
          border: '1px solid var(--border-base)', boxShadow: 'var(--shadow-sm)',
          backdropFilter: 'blur(20px)'
        }}>
          {['active', 'closed', 'drafts'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.4rem 1.25rem',
                borderRadius: '16px',
                background: activeTab === tab ? 'var(--primary)' : 'transparent',
                color: activeTab === tab ? '#fff' : 'var(--fg-muted)',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: activeTab === tab ? '0 4px 10px -2px rgba(15, 23, 42, 0.2)' : 'none'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {INCIDENT_TYPES
          .filter(cat => {
            // NCR: only for management/admin
            if (cat.id === 'ncr' && !['branch_access', 'bu_access', 'risk_compliance', 'full_access'].includes(role || '')) return false;
            // Dept-specific roles only see their relevant sections
            if (role === 'hr_access') return cat.id === 'hr' || cat.id === 'whs';
            if (role === 'whs_access') return cat.id === 'whs';
            if (role === 'it_access') return cat.id === 'it';
            if (role === 'finance_access') return cat.id === 'finance';
            return true;
          })
          .map(category => {
            const categoryIncidents = displayedIncidents.filter(i => getCategory(i) === category.id);
            const filteredIncidents = categoryIncidents
              .filter(inc => {
                const q = (sectionFilters[category.id] || '').toLowerCase();
                if (q) {
                  const match = JSON.stringify(inc).toLowerCase().includes(q);
                  if (!match) return false;
                }
                
                const fState = filterStates[category.id];
                if (fState) {
                  if (fState.status && fState.status.length > 0 && !fState.status.includes(inc.status)) return false;
                  if (fState.branch && fState.branch.length > 0 && !fState.branch.includes(inc.branch_department)) return false;
                  if (fState.jurisdiction && fState.jurisdiction.length > 0 && !fState.jurisdiction.includes(inc.location)) return false;
                }
                return true;
              })
              .sort((a, b) => {
                const sort = sectionSort[category.id];
                const valA = a[sort.field] || '';
                const valB = b[sort.field] || '';
                if (sort.field === 'date') {
                  return sort.dir === 'desc' 
                    ? new Date(b.date).getTime() - new Date(a.date).getTime()
                    : new Date(a.date).getTime() - new Date(b.date).getTime();
                }
                return sort.dir === 'desc' 
                  ? String(valB).localeCompare(String(valA))
                  : String(valA).localeCompare(String(valB));
              });
            const isExpanded = expandedSections[category.id];
            const Icon = category.icon;

            return (
              <div 
                key={category.id} 
                style={{ 
                  borderRadius: '20px',
                  background: 'var(--bg-elevated)',
                  border: isExpanded ? `1px solid ${category.color}40` : '1px solid var(--border-base)', 
                  boxShadow: isExpanded ? `0 25px 50px -12px ${category.color}15, 0 0 0 1px ${category.color}10` : 'var(--shadow-sm)',
                  // overflow: 'hidden', // Removed to prevent filter menu clipping
                  transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                  transform: isExpanded ? 'scale(1.005)' : 'scale(1)',
                  position: 'relative',
                  zIndex: (isExpanded || activeFilterMenu === category.id) ? 50 : 1
                }}
              >
                {/* Glowing top accent line when expanded */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: isExpanded ? `linear-gradient(90deg, ${category.color}, transparent)` : 'transparent', transition: 'background 0.4s ease' }} />
                
                {/* Section Header */}
                <div 
                  onClick={() => toggleSection(category.id)}
                  style={{ 
                    padding: '0.75rem 1.25rem', 
                    background: isExpanded ? `linear-gradient(135deg, ${category.color}08 0%, transparent 100%)` : 'transparent',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.3s ease',
                    borderBottom: isExpanded ? '1px solid var(--border-base)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ 
                      width: '32px', height: '32px', borderRadius: '8px', 
                      background: `${category.color}10`, color: category.color, 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `1px solid ${category.color}20`,
                      transition: 'all 0.3s ease'
                    }}>
                      <Icon size={18} strokeWidth={1.5} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--fg-base)', display: 'flex', alignItems: 'center', gap: '0.6rem', letterSpacing: '-0.01em' }}>
                        {category.label}
                        <span style={{ 
                          fontSize: '0.65rem', fontWeight: 800, padding: '0.1rem 0.4rem', 
                          background: categoryIncidents.length > 0 ? category.color : 'var(--bg-subtle)', 
                          borderRadius: '20px', color: categoryIncidents.length > 0 ? '#fff' : 'var(--fg-faint)', 
                          border: categoryIncidents.length === 0 ? '1px solid var(--border-base)' : 'none'
                        }}>
                          {categoryIncidents.length}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--fg-muted)', marginTop: '0.05rem', fontWeight: 500 }}>{category.desc}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }} onClick={e => e.stopPropagation()}>
                    {isExpanded && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-secondary" 
                          onClick={handleManualRefresh}
                          disabled={isRefreshing}
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.7rem', height: '32px' }}
                        >
                          <RefreshCw size={12} className={isRefreshing ? "spin-animation" : ""} /> 
                          Refresh
                        </button>
                        
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <div style={{ position: 'relative' }}>
                            <Filter size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-faint)' }} />
                            <input 
                              type="text" 
                              className="input-field" 
                              placeholder="Search..."
                              value={sectionFilters[category.id]}
                              onChange={e => setSectionFilters(prev => ({ ...prev, [category.id]: e.target.value }))}
                              style={{ padding: '0.35rem 0.75rem 0.35rem 1.75rem', fontSize: '0.7rem', height: '32px', width: '140px' }}
                            />
                          </div>

                          <div style={{ position: 'relative' }}>
                            <button 
                              className={`btn ${filterStates[category.id] && Object.values(filterStates[category.id]).some((v: any) => v.length > 0) ? 'btn-primary' : 'btn-secondary'}`}
                              onClick={(e) => { e.stopPropagation(); setActiveFilterMenu(activeFilterMenu === category.id ? null : category.id); }}
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.7rem', height: '32px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Filter size={12} /> Filter
                            </button>
                            
                            {activeFilterMenu === category.id && (
                              <div 
                                onClick={e => e.stopPropagation()}
                                style={{ 
                                  position: 'absolute', top: '110%', right: 0, zIndex: 100,
                                  background: 'var(--bg-elevated)', border: '1px solid var(--border-base)',
                                  borderRadius: '8px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                                  width: '250px', padding: '1rem'
                                }}
                              >
                                <div style={{ marginBottom: '0.75rem' }}>
                                  <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--fg-faint)', marginBottom: '0.5rem' }}>Status</div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {['Open - Incident Logged', 'Open - Under Investigation', 'Open - Corrective Action Pending', 'Open - Formal Claim', 'Closed - No Further Action'].map(status => {
                                      const isSelected = (filterStates[category.id]?.status || []).includes(status);
                                      return (
                                        <label key={status} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', cursor: 'pointer', padding: '2px 0' }}>
                                          <input 
                                            type="checkbox" 
                                            checked={isSelected}
                                            onChange={() => {
                                              const current = filterStates[category.id]?.status || [];
                                              const next = isSelected ? current.filter((s: string) => s !== status) : [...current, status];
                                              setFilterStates(prev => ({ ...prev, [category.id]: { ...prev[category.id], status: next } }));
                                            }}
                                          />
                                          {status}
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                                <div style={{ marginBottom: '0.75rem' }}>
                                  <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--fg-faint)', marginBottom: '0.5rem' }}>Jurisdiction</div>
                                  <select 
                                    className="input-field" 
                                    style={{ height: '28px', fontSize: '0.7rem', padding: '2px 4px' }}
                                    value={filterStates[category.id]?.jurisdiction?.[0] || ''}
                                    onChange={e => setFilterStates(prev => ({ ...prev, [category.id]: { ...prev[category.id], jurisdiction: e.target.value ? [e.target.value] : [] } }))}
                                  >
                                    <option value="">All States</option>
                                    {Array.from(new Set(categoryIncidents.map(i => i.location).filter(Boolean))).map(loc => (
                                      <option key={loc} value={loc}>{loc}</option>
                                    ))}
                                  </select>
                                </div>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ width: '100%', fontSize: '0.65rem', padding: '4px' }}
                                  onClick={() => setFilterStates(prev => ({ ...prev, [category.id]: {} }))}
                                >
                                  Clear Filters
                                </button>
                              </div>
                            )}
                          </div>

                          <button 
                            className="btn btn-secondary" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSectionSort(prev => ({
                                ...prev,
                                [category.id]: { 
                                  field: prev[category.id].field, 
                                  dir: prev[category.id].dir === 'asc' ? 'desc' : 'asc' 
                                }
                              }));
                            }}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem', height: '28px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <AlertTriangle size={10} style={{ transform: sectionSort[category.id].dir === 'asc' ? 'rotate(180deg)' : 'none' }} /> 
                            {sectionSort[category.id].dir === 'asc' ? 'Oldest' : 'Newest'}
                          </button>
                        </div>
                      </div>
                    )}
                    <div style={{ color: 'var(--fg-faint)', marginLeft: '0.25rem' }}>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>

                {/* Section Body */}
                {isExpanded && (
                  <div className="fade-in" style={{ padding: '0.25rem' }}>
                    <div style={{ overflowX: 'auto', padding: '0.25rem' }}>
                      <table style={{ minWidth: '800px', borderCollapse: 'separate', borderSpacing: '0 0.25rem' }}>
                        <thead>
                          <tr>
                            {category.columns.map((col, idx) => (
                              <th 
                                key={col} 
                                style={{ 
                                  borderTop: 'none', borderBottom: 'none',
                                  paddingLeft: idx === 0 ? '1.5rem' : '0.75rem',
                                  paddingRight: idx === category.columns.length - 1 ? '1.5rem' : '0.75rem',
                                  paddingTop: '0.5rem', paddingBottom: '0.5rem',
                                  textAlign: idx === category.columns.length - 1 && category.id === 'cargo' ? 'right' : 'left',
                                  color: 'var(--fg-faint)', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em'
                                }}
                              >
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredIncidents.length === 0 ? (
                            <tr>
                              <td colSpan={category.columns.length} style={{ textAlign: 'center', padding: '2rem', color: 'var(--fg-faint)', fontSize: '0.85rem' }}>
                                No active records found in this category.
                              </td>
                            </tr>
                          ) : (
                            filteredIncidents.map((incident, i) => (
                              <tr 
                                key={i} 
                                onClick={() => navigate(`/incidents/${incident.id}`)} 
                                style={{ 
                                  cursor: 'pointer', 
                                  background: 'var(--bg-surface)', 
                                  boxShadow: 'var(--shadow-sm)',
                                  transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-1px)';
                                  e.currentTarget.style.boxShadow = '0 4px 8px -2px rgba(0,0,0,0.1)';
                                  e.currentTarget.style.background = 'var(--bg-elevated)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                                  e.currentTarget.style.background = 'var(--bg-surface)';
                                }}
                              >
                                <td style={{ fontWeight: 700, color: 'var(--fg-base)', padding: '0.4rem 0 0.4rem 1.5rem', whiteSpace: 'nowrap', borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px', border: '1px solid transparent', borderRight: 'none' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: category.color, boxShadow: `0 0 8px ${category.color}60` }}></div>
                                    <span style={{ fontSize: '0.8rem' }}>{incident.incident_number_str || `INC-${incident.id}`}</span>
                                  </div>
                                </td>
                                
                                {category.id === 'cargo' && (
                                  <>
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.job_number || incident.system_job_number || 'N/A'}</td>
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.type || incident.incident_types || 'N/A'}</td>
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.location || incident.location_of_incident || 'N/A'}</td>
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.customer_name || 'N/A'}</td>
                                  </>
                                )}
                                {category.id === 'hr' && (
                                  <>
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.type || 'N/A'}</td>
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.employee_involved || 'N/A'}</td>
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.branch_department || 'N/A'}</td>
                                  </>
                                )}
                                {category.id === 'whs' && (
                                  <>
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.type || incident.injury_type || 'N/A'}</td>
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.location || 'N/A'}</td>
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.branch_department || 'N/A'}</td>
                                  </>
                                )}
                                {category.id === 'it' && (
                                  <>
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.type || 'N/A'}</td>
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.system_affected || 'N/A'}</td>
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.branch_department || 'N/A'}</td>
                                  </>
                                )}
                                {category.id === 'risk' && (
                                  <>
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.type || 'N/A'}</td>
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.regulatory_body || 'N/A'}</td>
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.branch_department || 'N/A'}</td>
                                  </>
                                )}
                                {category.id === 'finance' && (
                                  <>
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.type || 'N/A'}</td>
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.transaction_ref || 'N/A'}</td>
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.branch_department || 'N/A'}</td>
                                  </>
                                )}
                                {category.id === 'ncr' && (
                                  <>
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.type || 'N/A'}</td>
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.root_cause || 'N/A'}</td>
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.branch_department || 'N/A'}</td>
                                  </>
                                )}

                                <td className="monospaced" style={{ color: 'var(--fg-muted)', fontWeight: 600, fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.date}</td>
                                <td style={{ padding: '0.4rem 0.75rem', borderTopRightRadius: '10px', borderBottomRightRadius: '10px', border: '1px solid transparent', borderLeft: 'none' }}>
                                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    <span className={`badge badge-${incident.status?.includes('Closed') ? 'closed' : incident.status?.includes('Open') ? 'open' : 'review'}`} style={{ fontWeight: 700, padding: '0.2rem 0.6rem', fontSize: '0.65rem' }}>
                                      {incident.status}
                                    </span>
                                  </div>
                                </td>
                                {category.id === 'cargo' && (
                                  <td style={{ fontSize: '0.75rem', padding: '0.4rem 1.5rem 0.4rem 0.75rem', textAlign: 'right', fontWeight: 600, borderTopRightRadius: '10px', borderBottomRightRadius: '10px', border: '1px solid transparent', borderLeft: 'none' }}>
                                    {incident.total_estimated_costs || '$0.00'}
                                  </td>
                                )}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    {categoryIncidents.length > 0 && (
                      <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid var(--border-base)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-subtle)' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--fg-muted)' }}>Showing {categoryIncidents.length} records in this category</span>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button className="btn btn-secondary" disabled style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem' }}>Prev</button>
                          <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem' }}>Next</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
