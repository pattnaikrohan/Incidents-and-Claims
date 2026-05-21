import { useParams, Link, useLocation } from 'react-router-dom';
import { INCIDENT_STATUSES } from '../utils/incidentConstants';
import { ArrowLeft, FileText, Clock, MapPin, Briefcase, UserPlus, ChevronDown, ChevronRight, Shield, AlertTriangle, FileWarning, Users, HeartPulse, Lock as LockIcon, DollarSign, Edit2, Paperclip, Download, ExternalLink, X, Maximize, UploadCloud, RefreshCw, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CollaborationFeed from '../components/CollaborationFeed';
import { api } from '../services/api';
import { useState, useEffect, useRef } from 'react';
import { useIncidents } from '../hooks/useIncidents';

import CargoForm from './forms/CargoForm';
import HRForm from './forms/HRForm';
import WHSForm from './forms/WHSForm';
import ITForm from './forms/ITForm';
import RiskForm from './forms/RiskForm';
import FinanceForm from './forms/FinanceForm';
import NCRForm from './forms/NCRForm';

import IncidentSection from '../components/IncidentSection';
import { HRDeptSection, HRConfidentialNotes, WHSDeptSection, ITDeptSection, RiskDeptSection, FinanceDeptSection } from '../components/DeptSections';
import { getIncidentCategory, CATEGORY_META, isDeptSectionFilled, canSeeDeptSection, canEditDeptSection, canSeeRCSection, canSeeConfidentialNotes } from '../utils/incidentRoles';

export default function IncidentDetails() {
  const { id } = useParams();
  const { role, email } = useAuth();
  const { incidents, loading: hookLoading } = useIncidents(2000);
  const [incident, setIncident] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [isUpdatingLiability, setIsUpdatingLiability] = useState(false);
  const [isUpdatingDept, setIsUpdatingDept] = useState(false);
  const [isUpdatingConfidential, setIsUpdatingConfidential] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [previewFile, setPreviewFile] = useState<any | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const searchId = incident?.incident_number_str || id;

  // Maps the reliable frontend category to the exact Azure Blob Storage folder name
  const getAzureFolderType = (inc: any): string => {
    if (!inc?.category) return 'General Incident';
    const map: Record<string, string> = {
      cargo: 'Cargo & Equipment Incident',
      hr: 'Human Resources Incident',
      whs: 'WH&S Incident',
      it: 'IT & Security Incident',
      risk: 'Risk & Compliance Incident',
      finance: 'Finance Incident',
      ncr: 'Non-Conformance Report (NCR)',
    };
    return map[inc.category] || 'General Incident';
  };

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const fetchAttachments = async () => {
    setIsRefreshing(true);
    try {
      const folderType = getAzureFolderType(incident);
      const typeQuery = `?incident_type=${encodeURIComponent(folderType)}`;
      const response = await api.get(`/documents/incident/${searchId}/list${typeQuery}`);
      setAttachments(response.data.documents || response.data || []);
    } catch (err) {
      console.error('Failed to refresh attachments', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleDeleteAttachment = async (filename: string) => {
    if (!window.confirm(`Are you sure you want to delete ${filename}?`)) return;
    setIsDeleting(filename);
    try {
      const folderType = getAzureFolderType(incident);
      await api.delete(`/documents/incident/${searchId}/document?filename=${encodeURIComponent(filename)}&incident_type=${encodeURIComponent(folderType)}`);
      await fetchAttachments();
      showNotification('Attachment deleted successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to delete attachment.');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDownloadAll = () => {
    attachments.forEach((file, index) => {
      setTimeout(() => {
        window.open(file.url, '_blank');
      }, index * 400);
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;

    setIsUploading(true);
    const files = Array.from(event.target.files);

    try {
      const folderType = getAzureFolderType(incident);
      const typeQuery = `?incident_type=${encodeURIComponent(folderType)}`;

      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        await api.post(`/documents/incident/${searchId}/upload${typeQuery}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      // Refresh attachments list
      const response = await api.get(`/documents/incident/${searchId}/list${typeQuery}`);
      setAttachments(response.data.documents || response.data || []);
      showNotification('Attachments uploaded successfully.');
    } catch (err) {
      console.error('Failed to upload files:', err);
      alert('Failed to upload files.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  const [liability, setLiability] = useState({
    responsible_party: '',
    formal_claim_issued: '',
    insurer_notified: '',
    risk_level: '',
    management_escalation: '',
    cor: '',
    status: 'Open - Incident Logged',
    comments: '',
    // CoR specialized fields
    cor_risk_level: 'Low',
    cor_status: 'Open',
    cor_assessment: '',
    cor_corrective_action: '',
    cor_action_implemented: 'No'
  });
  const isInsuranceInvolved = liability.insurer_notified === 'Yes';
  const [isEditingForm, setIsEditingForm] = useState(false);
  const location = useLocation();
  const source = location.state?.source;

  const fetchIncident = async () => {
    try {
      let finalIncident = incidents.find((i: any) => String(i.id) === String(id));
      const targetId = finalIncident?.incident_number_str || id;

      // 2. Fetch latest metadata from backend (Investigation findings, Liability, etc.)
      // Skip backend fetch for Digital Twin categories handled via direct polling
      const isDigitalTwin = targetId && (
        targetId.toString().startsWith('CEI-') ||
        targetId.toString().startsWith('HR-') ||
        targetId.toString().startsWith('WHS-') ||
        targetId.toString().startsWith('IT-') ||
        targetId.toString().startsWith('RC-') ||
        targetId.toString().startsWith('FIN-') ||
        targetId.toString().startsWith('NCR-')
      );

      if (targetId && !isDigitalTwin) {
        try {
          const response = await api.get(`/incidents/${targetId}`);
          const backendData = response.data;

          if (backendData) {
            if (finalIncident) {
              // Enrich Dataverse record with backend metadata, ignoring nulls or empty strings from the backend
              const cleanBackendData = Object.fromEntries(
                Object.entries(backendData).filter(([_, v]) => v !== null && v !== undefined && v !== '')
              );
              finalIncident = { ...finalIncident, ...cleanBackendData };
            } else {
              finalIncident = backendData;
            }
          }
        } catch (err: any) {
          if (err.response?.status !== 404) {
            console.warn('Backend metadata fetch failed:', err);
          }
        }
      }

      if (finalIncident) {
        setIncident(finalIncident);
        setLiability(prev => ({
          ...prev,
          responsible_party: finalIncident.responsible_party || '',
          formal_claim_issued: finalIncident.formal_claim_issued || 'No',
          insurer_notified: finalIncident.insurer_notified || 'No',
          risk_level: finalIncident.risk_level || finalIncident.cor_risk_level || '',
          management_escalation: finalIncident.management_escalation || 'No',
          cor: finalIncident.cor || finalIncident.cor_required || 'No',
          status: finalIncident.status || 'Open - Incident Logged',
          comments: finalIncident.comments || '',
          cor_risk_level: finalIncident.cor_risk_level || 'Low',
          cor_status: finalIncident.cor_status || finalIncident.status || 'Open',
          cor_assessment: finalIncident.cor_assessment || '',
          cor_corrective_action: finalIncident.cor_corrective_action || '',
          cor_action_implemented: finalIncident.cor_action_implemented || 'No'
        }));

        // Fetch attachments using the internal system ID (e.g., CEI-...) instead of the Dataverse GUID
        const searchId = finalIncident.incident_number_str || id;
        const catMap: Record<string, string> = {
          cargo: 'Cargo & Equipment Incident',
          hr: 'Human Resources Incident',
          whs: 'WH&S Incident',
          it: 'IT & Security Incident',
          risk: 'Risk & Compliance Incident',
          finance: 'Finance Incident',
          ncr: 'Non-Conformance Report (NCR)',
        };
        const folderType = catMap[finalIncident.category] || 'General Incident';
        try {
          const response = await api.get(`/documents/incident/${searchId}/list?incident_type=${encodeURIComponent(folderType)}`);
          setAttachments(response.data.documents || response.data || []);
        } catch (err) {
          console.error('Failed to fetch attachments:', err);
        }
      }
    } catch (error) {
      console.error('Error fetching incident:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLiabilityUpdate = async () => {
    try {
      setIsUpdatingLiability(true);
      const category = getIncidentCategory(incident);

      // Power Automate Flows for updating liability status
      const CARGO_LIABILITY_FLOW = 'https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/f82e0a4f816842bbbbf1a15479d93e7e/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=GkmKVFteQE4OTTT1CfVQEVW56Pvwq6DYYB32LCQi18o';
      const HR_LIABILITY_FLOW = 'https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/a25b71ec6a184abdb6ee4754f74dfe42/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=uOPlpQvalzoKpKL5dTYB_tE2ZcT38xvA243jlq_jiOA';
      const WHS_LIABILITY_FLOW = 'https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/36ab33f616fe4460b567ac70be5ce53b/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=6VF-s7oy5rhVIArxV6a41Q-LUyDPnrsCDn-nHHtzF9U';
      const IT_LIABILITY_FLOW = 'https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/63e95258ba434a4abeb4b770d44c7a8e/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=5e5LDOwmfDimCA-KrWagKXP6Z3ZcVBxXpbX11mZj_S8';
      const RISK_LIABILITY_FLOW = 'https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/cd9d5fab08af41569033914493120e8b/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=MMWo1wJqW9QQyERWdgsuWFGIECgdsYVGNKIcyTU-kp0';
      const FINANCE_LIABILITY_FLOW = 'https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/15462239604044f49c85668a73631459/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=htjLOUF48E765vQ8qVrvZd2XjOxPqmyxCFNGZGzV4tc';
      const DEFAULT_FLOW_URL = 'https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/465821937cf347c9b5eec4737d068fdd/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=ZUR4iYLZmuytbGXp0uaTvqXkvT927AsbYf9_RtJF2lE';

      let FLOW_URL = DEFAULT_FLOW_URL;
      if (category === 'cargo') FLOW_URL = CARGO_LIABILITY_FLOW;
      else if (category === 'hr') FLOW_URL = HR_LIABILITY_FLOW;
      else if (category === 'whs') FLOW_URL = WHS_LIABILITY_FLOW;
      else if (category === 'it') FLOW_URL = IT_LIABILITY_FLOW;
      else if (category === 'risk') FLOW_URL = RISK_LIABILITY_FLOW;
      else if (category === 'finance') FLOW_URL = FINANCE_LIABILITY_FLOW;

      const payload = {
        incident_id: id,
        incident_number: incident.incident_number_str,
        responsible_party: liability.responsible_party,
        formal_claim_issued: liability.formal_claim_issued,
        insurer_notified: liability.insurer_notified,
        risk_level: liability.risk_level,
        management_escalation: liability.management_escalation,
        cor: liability.cor,
        status: liability.status,
        comments: liability.comments,
        updated_by: email || role,
        updated_at: new Date().toISOString()
      };

      await fetch(FLOW_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      showNotification('Liability update triggered successfully. Changes will reflect shortly.');

      // Update local state temporarily
      setIncident((prev: any) => ({ ...prev, ...payload }));
    } catch (error) {
      console.error('Failed to update liability via PA:', error);
      alert('Error triggering liability update.');
    } finally {
      setIsUpdatingLiability(false);
    }
  };

  useEffect(() => {
    if (!hookLoading) {
      fetchIncident();
    }
  }, [id, incidents, hookLoading]);

  const handleAssign = async (userId: number, name: string) => {
    try {
      setIsAssigning(true);
      await api.patch(`/incidents/${searchId}/assign`, {
        assigned_to_id: userId,
        status: 'Under Review'
      });
      await fetchIncident();
      alert(`Incident successfully assigned to ${name}`);
    } catch (error) {
      console.error('Assignment failed:', error);
    } finally {
      setIsAssigning(false);
    }
  };


  const handleDeptUpdate = async () => {
    if (!incident) return;
    setIsUpdatingDept(true);
    try {
      // Automatically attribute the investigation to the current user
      const updatedIncident = { ...incident };
      const ownerFields = ['corrective_action_owner', 'investigation_owner'];
      ownerFields.forEach(field => {
        if (!updatedIncident[field] || updatedIncident[field] === 'full_access') {
          updatedIncident[field] = email || role;
        }
      });

      // Mark as updated so the "Awaiting" badge disappears
      const payload = { ...updatedIncident, dept_section_updated: true };

      // 1. Sync with Power Automate (Department Specific)
      const category = getIncidentCategory(incident);
      const DEPT_FLOWS: Record<string, string> = {
        hr: 'https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/41ff1f6f431c4a8d8aace30fca16d497/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=ZQkgDLFTsMGwJRTE64Gh5SKAKGwGwIVRfusgJ3L0Pa4',
        whs: 'https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/76f0401a151d4c3b8fd321927864a059/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=dfYfT8hdrW5WSVeMHeVByoWZdVj3OhosX55znWuNEEA',
        it: 'https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/c9fd9c9c477b44f1a7c0353b49dfd5d2/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=fLefge3pIujNJvcP-vTsF7FthjRSrwQW_QbppGny0LM',
        finance: 'https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/00a00330c71b44bfbf75208b54ad9c22/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=wE3HpjZ9SwoOxVmO-QjxJ1L5DzebNj-UmqWzkBXA1T4',
        risk: 'https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/d61393c0f27b4e40a11de350c2a4986f/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=Ut8XEIZEl0H3In1qDf3y-qnIEy8k4pYtvuYMGsv0KEc'
      };

      const flowUrl = DEPT_FLOWS[category];
      if (flowUrl) {
        const flowPayload = category === 'hr' ? {
          incident_id: incident.id,
          incident_number: incident.incident_number_str || id,
          investigation_outcome: incident.investigation_outcome || '',
          corrective_action: incident.corrective_action || '',
          legal_counsel_engaged: incident.legal_counsel_engaged || ''
        } : payload;

        fetch(flowUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(flowPayload)
        }).catch(err => console.error('Dept Flow Trigger failed:', err));
      }

      // 2. Persist to backend database - sanitize payload
      const VALID_DB_KEYS = [
        'id', 'type', 'location', 'description', 'status', 'assigned_to_id', 'branch_id',
        'responsible_party', 'cor_risk_level', 'cor_assessment', 'corrective_action',
        'formal_claim_issued', 'insurer_notified', 'management_escalation', 'cor_required',
        'investigation_outcome', 'legal_counsel_engaged', 'medical_treatment_required',
        'lost_time_injury', 'notifiable_safework', 'root_cause', 'corrective_action_owner',
        'corrective_action_due_date', 'chro_cro_notified', 'workers_comp_claim',
        'containment_actions', 'personal_data_involved', 'notifiable_privacy_breach',
        'cio_notified', 'regulator_involved', 'notified_regulator', 'penalty_imposed',
        'financial_value', 'actual_loss', 'recovery_possible', 'recovery_amount',
        'write_off_required', 'cfo_notified', 'cro_notified', 'police_reported',
        'dept_section_updated', 'notes', 'witnesses', 'immediate_action',
        'investigation_required', 'close_out_date', 'incident_summary', 'date_of_incident',
        'date_logged', 'logged_by', 'employee_name', 'incident_type', 'incident_number_str'
      ];

      const cleanPayload = Object.keys(payload)
        .filter(key => VALID_DB_KEYS.includes(key))
        .reduce((obj: any, key) => {
          obj[key] = payload[key];
          return obj;
        }, {});

      await api.patch(`/incidents/${searchId}`, cleanPayload);

      setIncident(updatedIncident);
      showNotification('Investigation details updated successfully.');
    } catch (error) {
      console.error('Update failed:', error);
      alert('Failed to update investigation details.');
    } finally {
      setIsUpdatingDept(false);
    }
  };

  const handleHRConfidentialNotesUpdate = async () => {
    if (!incident) return;
    setIsUpdatingConfidential(true);
    try {
      const HR_CONFIDENTIAL_FLOW = 'https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/cac1e44666654b3a975a28cbe83a3714/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=GSL2qi2jt7sk-MPPN_y9_fkDr_1HsRsedDU0ALn32Js';

      const payload = {
        incident_id: incident.id,
        incident_number: incident.incident_number_str || id,
        notes: incident.notes || ''
      };

      // 1. Sync with Power Automate (Confidential Notes)
      await fetch(HR_CONFIDENTIAL_FLOW, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // 2. Persist to backend database
      await api.patch(`/incidents/${searchId}`, { notes: incident.notes });

      showNotification('Confidential notes updated successfully.');
    } catch (error) {
      console.error('Confidential notes update failed:', error);
      alert('Failed to update confidential notes.');
    } finally {
      setIsUpdatingConfidential(false);
    }
  };

  if (loading) return <div className="fade-in" style={{ padding: '4rem', textAlign: 'center' }}>Loading incident data...</div>;
  if (!incident) return <div className="fade-in" style={{ padding: '4rem', textAlign: 'center' }}>Incident not found.</div>;

  const renderOriginalForm = () => {
    const category = getIncidentCategory(incident);

    switch (category) {
      case 'cargo': return <CargoForm initialData={incident} readOnly={!isEditingForm} />;
      case 'hr': return <HRForm initialData={incident} readOnly={!isEditingForm} />;
      case 'whs': return <WHSForm initialData={incident} readOnly={!isEditingForm} />;
      case 'it': return <ITForm initialData={incident} readOnly={!isEditingForm} />;
      case 'risk': return <RiskForm initialData={incident} readOnly={!isEditingForm} />;
      case 'finance': return <FinanceForm initialData={incident} readOnly={!isEditingForm} />;
      case 'ncr': return <NCRForm initialData={incident} readOnly={!isEditingForm} />;
    }

    // Fallback to generic JSON mapping if form not matched
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
        {Object.entries(incident)
          .filter(([k, v]) => v !== null && v !== '' && !['id', 'description', 'status', 'location', 'type', 'date', 'assigned_to_id', 'branch_id', 'creator_id'].includes(k))
          .map(([k, v]) => (
            <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--fg-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{k.replace(/_/g, ' ')}</span>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--fg-muted)', background: 'var(--bg-subtle)', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--border-base)' }}>
                {String(v)}
              </div>
            </div>
          ))}
      </div>
    );
  };

  const handleCoRUpdate = async () => {
    if (!incident) return;
    setIsUpdatingDept(true);
    try {
      const COR_SUBMIT_URL = 'https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/1cb43ed7dac84fcca1fe51f0c9b654cb/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=FW9jJLWiwW1fymo7QX7kw3XyqZicA95uwH3Adu4eNGg';

      const payload = {
        incident_id: incident.id,
        incident_number: incident.incident_number_str,
        cor_risk_level: liability.cor_risk_level,
        cor_status: liability.cor_status,
        cor_assessment: liability.cor_assessment,
        cor_corrective_action: liability.cor_corrective_action,
        cor_action_implemented: liability.cor_action_implemented,
        updated_by: email || role,
        updated_at: new Date().toISOString()
      };

      const response = await fetch(COR_SUBMIT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Power Automate submission failed');

      showNotification('CoR details submitted successfully.');
    } catch (error) {
      console.error('CoR Update failed:', error);
      alert('Failed to submit CoR details.');
    } finally {
      setIsUpdatingDept(false);
    }
  };

  if (loading || hookLoading) return <div style={{ padding: '4rem', textAlign: 'center' }}>Synchronizing Digital Twin Data...</div>;
  if (!incident) return <div style={{ padding: '4rem', textAlign: 'center' }}>Incident Record Not Found in Digital Twin Register</div>;

  return (
    <div className="fade-in">
      <Link to="/incidents" className="back-link" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', color: 'var(--fg-muted)', fontSize: '0.875rem' }}>
        <ArrowLeft size={16} /> Back to incidents
      </Link>

      {successMessage && (
        <div className="fade-in" style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid #10b981',
          color: '#10b981',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          backdropFilter: 'blur(10px)',
          fontWeight: 600,
          boxShadow: '0 10px 30px -10px rgba(16, 185, 129, 0.2)'
        }}>
          <Shield size={20} />
          {successMessage}
        </div>
      )}

      <div className="card fade-in" style={{
        position: 'relative', overflow: 'hidden', padding: '2.5rem', marginBottom: '2.5rem',
        background: 'linear-gradient(145deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)',
        border: '1px solid var(--border-base)',
        boxShadow: '0 20px 40px -20px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2rem'
      }}>
        {/* Glow effect */}
        <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '50%', height: '200%', background: 'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.15) 0%, transparent 70%)', transform: 'rotate(-25deg)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '0.75rem' }}>
            <h2 className="page-title" style={{ marginBottom: 0, fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--fg-base)', background: 'linear-gradient(to right, var(--fg-base), var(--fg-muted))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {incident.incident_number_str || `INC-${incident.id}`}
            </h2>
          </div>
          <p className="page-subtitle" style={{ marginBottom: 0, fontSize: '1rem', color: 'var(--fg-muted)', maxWidth: '800px', lineHeight: 1.6 }}>
            {incident.description || 'No description provided'}
          </p>
        </div>

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-end', minWidth: '350px' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-subtle)', backdropFilter: 'blur(10px)' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--fg-faint)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Workflow Status</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: (liability.status || incident?.status || '').includes('Closed') ? '#10b981' : '#3b82f6', boxShadow: `0 0 10px ${(liability.status || incident?.status || '').includes('Closed') ? '#10b981' : '#3b82f6'}` }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--fg-base)' }}>{liability.status || incident?.status || 'Open - Incident Logged'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              className="btn"
              style={{ background: 'var(--bg-subtle)', color: 'var(--fg-base)', border: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s ease', height: '36px' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.borderColor = 'var(--border-base)'; }}
              onClick={() => {
                const userId = prompt("Enter User ID to assign to (e.g., 2):");
                if (userId) handleAssign(parseInt(userId), "Selected User");
              }}
              disabled={isAssigning}
            >
              <UserPlus size={16} /> Assign Handler
            </button>
          </div>
        </div>
      </div>

      <div className="bento-grid">
        {/* Left Column (Main Details + Liability) */}
        <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Main Details Panel */}
          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>Incident Details</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', height: 'fit-content' }}>
                  <Clock size={16} style={{ color: 'var(--fg-muted)' }} />
                </div>
                <div>
                  <label className="overline">Reported Date</label>
                  <div style={{ fontSize: '0.875rem', color: 'var(--fg-base)', fontWeight: 500 }}>
                    {incident.date ? new Date(incident.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)', height: 'fit-content' }}>
                  <Briefcase size={16} style={{ color: 'var(--accent-fg)' }} />
                </div>
                <div>
                  <label className="overline">{(() => { const cat = getIncidentCategory(incident); return cat === 'cargo' ? 'CargoWise Ref' : cat === 'hr' ? 'Employee' : cat === 'whs' ? 'Person(s) Involved' : cat === 'it' ? 'Systems Affected' : cat === 'risk' ? 'Regulation Breached' : cat === 'finance' ? 'Incident Type' : 'Reference'; })()}</label>
                  <div style={{ fontSize: '0.875rem', color: 'var(--accent-fg)', fontWeight: 500 }}>{(() => { const cat = getIncidentCategory(incident); return cat === 'cargo' ? (incident.job_number || 'N/A') : cat === 'hr' ? (incident.employee_name || incident.employee_involved || 'N/A') : cat === 'whs' ? (incident.persons_involved || 'N/A') : cat === 'it' ? (incident.systems_affected || 'N/A') : cat === 'risk' ? (incident.regulation_breached || 'N/A') : cat === 'finance' ? (incident.incident_type || incident.type || 'N/A') : 'N/A'; })()}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', height: 'fit-content' }}>
                  <MapPin size={16} style={{ color: 'var(--fg-muted)' }} />
                </div>
                <div>
                  <label className="overline">{getIncidentCategory(incident) === 'whs' ? 'Location (Site)' : 'Branch / Department'}</label>
                  <div style={{ fontSize: '0.875rem', color: 'var(--fg-base)', fontWeight: 500 }}>{incident.location || incident.branch_department || 'N/A'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', background: `${CATEGORY_META[getIncidentCategory(incident)].color}15`, borderRadius: 'var(--radius-sm)', height: 'fit-content' }}>
                  <FileText size={16} style={{ color: CATEGORY_META[getIncidentCategory(incident)].color }} />
                </div>
                <div>
                  <label className="overline">Classification</label>
                  <div style={{ fontSize: '0.875rem', color: 'var(--fg-base)', fontWeight: 500 }}>{incident.type || incident.incident_type || CATEGORY_META[getIncidentCategory(incident)].label}</div>
                </div>
              </div>
            </div>

            <hr style={{ border: 0, borderBottom: '1px solid var(--border-base)', margin: '0 0 2rem 0' }} />

            <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', fontWeight: 600 }}>Description</h3>

            <div style={{ fontSize: '0.9375rem', lineHeight: 1.6, color: 'var(--fg-muted)', background: 'var(--bg-subtle)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-base)', marginBottom: '1.5rem' }}>
              {incident.description || 'No description provided'}
            </div>

            <hr style={{ border: 0, borderBottom: '1px solid var(--border-base)', margin: '0 0 1.5rem 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => setShowOriginal(!showOriginal)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: '#3b82f6', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', padding: 0 }}
              >
                {showOriginal ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                {showOriginal ? 'Hide Original Submission Data' : 'View Original Submission Data'}
              </button>

              {showOriginal && (
                <button
                  className="btn"
                  style={{
                    padding: '0.4rem 0.8rem', fontSize: '0.7rem', fontWeight: 700,
                    background: isEditingForm ? '#ef4444' : 'var(--bg-subtle)',
                    color: isEditingForm ? 'white' : 'var(--fg-muted)', border: '1px solid var(--border-base)',
                    borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                  onClick={() => setIsEditingForm(!isEditingForm)}
                >
                  <Edit2 size={12} /> {isEditingForm ? 'Cancel Edit' : 'Edit Submission'}
                </button>
              )}
            </div>

            {showOriginal && (
              <div className="fade-in" style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-base)' }}>
                {renderOriginalForm()}
              </div>
            )}
          </div>

          {/* ═══ DEPARTMENT-SPECIFIC SECTIONS (Role-Aware) ═══ */}
          {(() => {
            const category = getIncidentCategory(incident);
            const meta = CATEGORY_META[category];
            const deptFilled = isDeptSectionFilled(incident, category);
            const canSee = canSeeDeptSection(role, category);
            const canEdit = canEditDeptSection(role, category);
            const showConfNotes = canSeeConfidentialNotes(role);
            const isAwaiting = !deptFilled && !canEdit;

            const deptSectionIcon = category === 'hr' ? <Users size={16} /> :
              category === 'whs' ? <HeartPulse size={16} /> :
                category === 'it' ? <LockIcon size={16} /> :
                  category === 'risk' ? <Shield size={16} /> :
                    category === 'finance' ? <DollarSign size={16} /> : <FileText size={16} />;

            const handleFieldChange = (key: string, value: any) => {
              setIncident((prev: any) => ({ ...prev, [key]: value }));
            };

            return (
              <>
                {/* Department Investigation Section */}
                {canSee && category !== 'cargo' && (
                  <IncidentSection
                    title={`${meta.label} Investigation`}
                    icon={deptSectionIcon}
                    color={meta.color}
                    ownerLabel={meta.deptLabel}
                    isAwaitingUpdate={isAwaiting}
                    awaitingMessage={`Awaiting ${meta.deptLabel} Update`}
                  >
                    {category === 'hr' && <HRDeptSection incident={incident} editable={canEdit} onChange={handleFieldChange} />}
                    {category === 'whs' && <WHSDeptSection incident={incident} editable={canEdit} onChange={handleFieldChange} />}
                    {category === 'it' && <ITDeptSection incident={incident} editable={canEdit} onChange={handleFieldChange} />}
                    {category === 'risk' && <RiskDeptSection incident={incident} editable={canEdit} onChange={handleFieldChange} />}
                    {category === 'finance' && <FinanceDeptSection incident={incident} editable={canEdit} onChange={handleFieldChange} />}

                    {canEdit && (
                      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-primary"
                          style={{ background: meta.color, color: '#fff', border: 'none' }}
                          onClick={handleDeptUpdate}
                          disabled={isUpdatingDept}
                        >
                          {isUpdatingDept ? 'Saving...' : 'Save Investigation Updates'}
                        </button>
                      </div>
                    )}
                  </IncidentSection>
                )}

                {/* HR Confidential Notes — HR eyes only */}
                {category === 'hr' && showConfNotes && (
                  <IncidentSection
                    title="Confidential Notes"
                    icon={<LockIcon size={16} />}
                    color="#8b5cf6"
                    ownerLabel="HR Department — Restricted Access"
                  >
                    <HRConfidentialNotes incident={incident} editable={canEdit} onChange={handleFieldChange} />
                    {canEdit && (
                      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-primary"
                          style={{ background: '#8b5cf6', color: '#fff', border: 'none' }}
                          onClick={handleHRConfidentialNotesUpdate}
                          disabled={isUpdatingConfidential}
                        >
                          {isUpdatingConfidential ? 'Saving...' : 'Save Confidential Notes'}
                        </button>
                      </div>
                    )}
                  </IncidentSection>
                )}
              </>
            );
          })()}

          {/* Risk & Compliance Team Liability Form */}
          {canSeeRCSection(role) && (
            <div className="card" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>Incident Management</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label className="overline">Responsible Party</label>
                  <select className="input-field" value={liability.responsible_party} onChange={(e) => setLiability({ ...liability, responsible_party: e.target.value })}>
                    <option value="">— Select —</option>
                    <option value="Origin Agent">Origin Agent</option>
                    <option value="Destination Agent">Destination Agent</option>
                    <option value="Carrier">Carrier</option>
                    <option value="Coloader">Coloader</option>
                    <option value="Customer">Customer</option>
                    <option value="Company">Company</option>
                    <option value="Transport Company">Transport Company</option>
                  </select>
                </div>
                <div>
                  <label className="overline">Formal Claim Issued</label>
                  <select className="input-field" value={liability.formal_claim_issued} onChange={(e) => setLiability({ ...liability, formal_claim_issued: e.target.value })}>
                    <option value="">— Select —</option>
                    <option value="Yes">Yes (* creates Claims Log)</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div>
                  <label className="overline">Insurer Notified</label>
                  <select className="input-field" value={liability.insurer_notified} onChange={(e) => setLiability({ ...liability, insurer_notified: e.target.value })}>
                    <option value="">— Select —</option>
                    <option value="Yes">Yes (* creates Insurers Notification Template)</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div>
                  <label className="overline">Risk Level</label>
                  <select className="input-field" value={liability.risk_level} onChange={(e) => setLiability({ ...liability, risk_level: e.target.value })}>
                    <option value="">— Select —</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="overline">Management Escalation</label>
                  <select className="input-field" value={liability.management_escalation} onChange={(e) => setLiability({ ...liability, management_escalation: e.target.value })}>
                    <option value="">— Select —</option>
                    <option value="Yes">Yes (* creates Management Notification Template)</option>
                    <option value="No">No</option>
                    <option value="Not Applicable">Not Applicable</option>
                  </select>
                </div>
                <div>
                  <label className="overline">COR</label>
                  <select className="input-field" value={liability.cor} onChange={(e) => setLiability({ ...liability, cor: e.target.value })}>
                    <option value="">— Select —</option>
                    <option value="Yes">Yes (* creates CoR Log)</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="overline">Incident Status</label>
                  <select className="input-field" value={liability.status} onChange={(e) => setLiability({ ...liability, status: e.target.value })}>
                    {(INCIDENT_STATUSES[getIncidentCategory(incident)] || INCIDENT_STATUSES.cargo).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="overline">Comments</label>
                  <textarea className="input-field" style={{ minHeight: '80px' }} placeholder="Add comments here..." value={liability.comments} onChange={(e) => setLiability({ ...liability, comments: e.target.value })} />
                </div>
              </div>
              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleLiabilityUpdate}
                  disabled={isUpdatingLiability}
                >
                  {isUpdatingLiability ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>
          )}

          {/* Dynamic Claims Log Form */}
          {incident.formal_claim_issued === 'Yes' && source === 'claims' && (
            <div className="card fade-in" style={{ padding: '2rem', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', color: '#ef4444' }}><FileText size={20} /></div>
                <h3 style={{ fontSize: '1.25rem', color: '#ef4444', margin: 0 }}>Claims Log Details</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div><label className="overline">Claim Reference Number</label><input type="text" className="input-field" placeholder="e.g. CLM-2024-001" /></div>
                <div><label className="overline">Date of Claim</label><input type="date" className="input-field" /></div>
                <div><label className="overline">Claimant</label><input type="text" className="input-field" placeholder="Search claimant..." /></div>
                <div><label className="overline">Time Bar</label><input type="date" className="input-field" disabled value="2025-05-14" style={{ opacity: 0.7 }} /></div>

                <div>
                  <label className="overline">Claim Type</label>
                  <select className="input-field"><option>Cargo Damage</option><option>Theft</option><option>Other</option></select>
                </div>
                <div>
                  <label className="overline">Claim Direction</label>
                  <select className="input-field"><option>Inbound (Against Us)</option><option>Outbound (By Us)</option></select>
                </div>

                <div><label className="overline">Claim Amount (AUD)</label><input type="number" className="input-field" /></div>
                <div><label className="overline">Paid Amount (AUD)</label><input type="number" className="input-field" /></div>
                <div style={{ position: 'relative' }}>
                  <label className="overline">Insurance Paid Amount (AUD)</label>
                  <input type="number" className="input-field" disabled={!isInsuranceInvolved} defaultValue="0.00" />
                  {!isInsuranceInvolved && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--fg-muted)', display: 'block', marginTop: '0.25rem' }}>
                      ⚠️ Disabled (Insurance Involved is No on Incident)
                    </span>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <label className="overline">Deductible (AUD)</label>
                  <input type="number" className="input-field" disabled={!isInsuranceInvolved} defaultValue="0.00" />
                  {!isInsuranceInvolved && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--fg-muted)', display: 'block', marginTop: '0.25rem' }}>
                      ⚠️ Disabled (Insurance Involved is No on Incident)
                    </span>
                  )}
                </div>
                <div><label className="overline">Recovery Amount (AUD)</label><input type="number" className="input-field" /></div>
                <div><label className="overline">Outstanding Balance (AUD)</label><input type="number" className="input-field" disabled value="0" style={{ opacity: 0.7 }} /></div>

                <div>
                  <label className="overline">Write-Off Required</label>
                  <select className="input-field"><option>No</option><option>Yes</option></select>
                </div>
                <div><label className="overline">Write-Off Amount (AUD)</label><input type="number" className="input-field" /></div>
                <div><label className="overline">Write-Off Approved By</label><input type="text" className="input-field" placeholder="User / Role" /></div>
                <div><label className="overline">Write-Off Date</label><input type="date" className="input-field" /></div>

                <div><label className="overline">Claim State</label><input type="text" className="input-field" placeholder="Outcome or decision" /></div>
                <div>
                  <label className="overline">Claim Status</label>
                  <select className="input-field"><option>Open</option><option>In Progress</option><option>Closed</option></select>
                </div>
              </div>
              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-primary"
                  style={{ background: '#ef4444' }}
                  onClick={handleDeptUpdate}
                  disabled={isUpdatingDept}
                >
                  {isUpdatingDept ? 'Saving...' : 'Save Claim Details'}
                </button>
              </div>
            </div>
          )}

          {/* Dynamic CoR Log Form */}
          {(incident.cor === 'Yes' || incident.cor_required === 'Yes') && source === 'cors' && (
            <div className="card fade-in" style={{ padding: '2rem', border: '1px solid rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', color: '#f59e0b' }}><FileText size={20} /></div>
                <h3 style={{ fontSize: '1.25rem', color: '#f59e0b', margin: 0 }}>Chain of Responsibility (CoR) Log</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div><label className="overline">CoR Type</label><input type="text" className="input-field" placeholder="e.g. Mass, Dimension, Load Restraint" /></div>
                <div><label className="overline">Company's Role</label><input type="text" className="input-field" placeholder="e.g. Consignor, Packer, Loader" /></div>
                <div>
                  <label className="overline">CoR Risk Level</label>
                  <select
                    className="input-field"
                    value={liability.cor_risk_level}
                    onChange={(e) => setLiability({ ...liability, cor_risk_level: e.target.value })}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Severe">Severe</option>
                  </select>
                </div>
                <div>
                  <label className="overline">CoR Incident Status</label>
                  <select
                    className="input-field"
                    value={liability.cor_status}
                    onChange={(e) => setLiability({ ...liability, cor_status: e.target.value })}
                  >
                    {['Open', 'Close'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="overline">CoR Assessment</label>
                  <textarea
                    className="input-field"
                    style={{ minHeight: '80px' }}
                    placeholder="Detailed assessment of CoR breach..."
                    value={liability.cor_assessment}
                    onChange={(e) => setLiability({ ...liability, cor_assessment: e.target.value })}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="overline">CoR Corrective Action</label>
                  <textarea
                    className="input-field"
                    style={{ minHeight: '80px' }}
                    placeholder="Actions taken to rectify the CoR breach..."
                    value={liability.cor_corrective_action}
                    onChange={(e) => setLiability({ ...liability, cor_corrective_action: e.target.value })}
                  />
                </div>
                <div>
                  <label className="overline">CoR Corrective Action Implemented?</label>
                  <select
                    className="input-field"
                    value={liability.cor_action_implemented}
                    onChange={(e) => setLiability({ ...liability, cor_action_implemented: e.target.value })}
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-primary"
                  style={{ background: '#f59e0b', color: '#fff' }}
                  onClick={handleCoRUpdate}
                  disabled={isUpdatingDept}
                >
                  {isUpdatingDept ? 'Saving...' : 'Save CoR Details'}
                </button>
              </div>
            </div>
          )}

          {/* Dynamic Insurer Notification Template */}
          {incident.insurer_notified === 'Yes' && source === 'insurers' && (
            <div className="card fade-in" style={{ padding: '2rem', border: '1px solid rgba(59, 130, 246, 0.3)', background: 'rgba(59, 130, 246, 0.02)', marginTop: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', color: '#3b82f6' }}><Shield size={20} /></div>
                <h3 style={{ fontSize: '1.25rem', color: '#3b82f6', margin: 0 }}>Insurer Notification Template</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                <div style={{ padding: '1rem', background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 'var(--radius-md)' }}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--fg-muted)', marginBottom: '1rem' }}>
                    <strong>To:</strong> claims@insurer.com<br />
                    <strong>Subject:</strong> Initial Notification of Loss - {incident.type} - {incident.location}
                  </p>
                  <textarea className="input-field" style={{ minHeight: '150px', fontFamily: 'monospace', fontSize: '0.875rem' }} defaultValue={`Dear Insurer,

Please be advised of an incident that may give rise to a claim under our policy.

Incident ID: INC-${incident.id}
Date of Incident: ${incident.date}
Location: ${incident.location}
Type: ${incident.type}

Preliminary Details:
${incident.description}

We will provide further documentation as our investigation progresses.`} />
                </div>
              </div>
              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button className="btn btn-secondary">Download PDF</button>
                <button className="btn btn-primary" style={{ background: '#3b82f6' }} onClick={() => showNotification('Insurer notified and notification template processed.')}>Send Email Notification</button>
              </div>
            </div>
          )}

          {/* Dynamic Management Escalation Template */}
          {incident.management_escalation === 'Yes' && source === 'escalations' && (
            <div className="card fade-in" style={{ padding: '2rem', border: '1px solid rgba(139, 92, 246, 0.3)', background: 'rgba(139, 92, 246, 0.02)', marginTop: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px', color: '#8b5cf6' }}><AlertTriangle size={20} /></div>
                <h3 style={{ fontSize: '1.25rem', color: '#8b5cf6', margin: 0 }}>Management Escalation Template</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                <div style={{ padding: '1rem', background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 'var(--radius-md)' }}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--fg-muted)', marginBottom: '1rem' }}>
                    <strong>To:</strong> executive.team@aaw.com<br />
                    <strong>Subject:</strong> HIGH PRIORITY ESCALATION - INC-${incident.id}
                  </p>
                  <textarea className="input-field" style={{ minHeight: '150px', fontFamily: 'monospace', fontSize: '0.875rem' }} defaultValue={`URGENT MANAGEMENT ESCALATION

Risk Level: ${liability.risk_level || 'Pending'}
Incident Type: ${incident.type}
Location: ${incident.location}

Summary of Escalation:
${incident.description}

Immediate Action Required:
Please review the attached incident file in the Command Center. Legal and operational holds may be required.`} />
                </div>
              </div>
              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button className="btn btn-secondary">Download Report</button>
                <button className="btn btn-primary" style={{ background: '#8b5cf6' }} onClick={() => showNotification('Management escalation triggered and notification sent.')}>Trigger Exec Workflow</button>
              </div>
            </div>
          )}

          {/* Dynamic NCR Form for R&C/Manager/Admin */}
          {incident.type === 'Non-Conformance Report (NCR)' && ['full_access', 'risk_compliance', 'bu_access', 'branch_access'].includes(role || '') && (
            <div className="card fade-in" style={{ padding: '2rem', border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.02)', marginTop: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', color: '#10b981' }}><FileWarning size={20} /></div>
                <h3 style={{ fontSize: '1.25rem', color: '#10b981', margin: 0 }}>R&C / MANAGER (NCR Follow-up)</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="overline">Cause of NC</label>
                  <textarea className="input-field" style={{ minHeight: '80px' }} placeholder="Identify the root cause of the non-conformance..." />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="overline">Corrective Action</label>
                  <textarea className="input-field" style={{ minHeight: '80px' }} placeholder="Action taken to correct the non-conformance..." />
                </div>
                <div>
                  <label className="overline">Corrective Action Implemented</label>
                  <select className="input-field">
                    <option>No — implementation in progress</option>
                    <option>Yes</option>
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="overline">Preventive Action</label>
                  <textarea className="input-field" style={{ minHeight: '80px' }} placeholder="Action taken to prevent recurrence..." />
                </div>
                <div>
                  <label className="overline">Responsible Person</label>
                  <input type="text" className="input-field" placeholder="Name or Role" />
                </div>
                <div>
                  <label className="overline">Target Completion Date</label>
                  <input type="date" className="input-field" />
                </div>
              </div>
              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-primary"
                  style={{ background: '#10b981', color: '#fff' }}
                  onClick={handleDeptUpdate}
                  disabled={isUpdatingDept}
                >
                  {isUpdatingDept ? 'Saving...' : 'Save Follow-up Details'}
                </button>
              </div>
            </div>
          )}

          {/* Dynamic NCR Close-Out Form for R&C/Admin */}
          {incident.type === 'Non-Conformance Report (NCR)' && ['full_access', 'risk_compliance'].includes(role || '') && (
            <div className="card fade-in" style={{ padding: '2rem', border: '1px solid rgba(139, 92, 246, 0.3)', background: 'rgba(139, 92, 246, 0.02)', marginTop: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px', color: '#8b5cf6' }}><Shield size={20} /></div>
                <h3 style={{ fontSize: '1.25rem', color: '#8b5cf6', margin: 0 }}>CLOSE-OUT (R&C)</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label className="overline">Actual Completion Date</label>
                  <input type="date" className="input-field" />
                </div>
                <div>
                  <label className="overline">Similar NC Checked</label>
                  <select className="input-field">
                    <option>Yes — checked across all branches. No similar NC identified.</option>
                    <option>Yes — similar NC identified. Updating risk register.</option>
                    <option>No</option>
                  </select>
                </div>
                <div>
                  <label className="overline">Effectiveness Verification Date</label>
                  <input type="date" className="input-field" />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="overline">Effectiveness Evidence / Results</label>
                  <textarea className="input-field" style={{ minHeight: '80px' }} placeholder="Detail the evidence supporting the effectiveness of the PA/CA..." />
                </div>
                <div>
                  <label className="overline">Risk Register Updated</label>
                  <select className="input-field">
                    <option>No — to be updated at close-out</option>
                    <option>Yes</option>
                    <option>N/A</option>
                  </select>
                </div>
                <div>
                  <label className="overline">QMS / Procedure Changed</label>
                  <select className="input-field">
                    <option>No — SOP update in progress</option>
                    <option>Yes</option>
                    <option>N/A</option>
                  </select>
                </div>
                <div>
                  <label className="overline">CAPA Adequate</label>
                  <select className="input-field">
                    <option>No — pending effectiveness verification</option>
                    <option>Yes</option>
                  </select>
                </div>
                <div>
                  <label className="overline">Status</label>
                  <select
                    className="input-field"
                    onChange={(e) => setLiability({ ...liability, status: e.target.value })}
                  >
                    {(INCIDENT_STATUSES[getIncidentCategory(incident)] || INCIDENT_STATUSES.cargo).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" style={{ background: '#8b5cf6', color: '#fff' }} onClick={() => { handleDeptUpdate(); showNotification('NCR close-out completed and status updated.'); }}>Save Close-Out Details</button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Panel */}
        <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Related Records Card */}
          {(() => {
            const checkYes = (val: any) => {
              if (typeof val === 'boolean') return val;
              if (typeof val === 'string') return val.toLowerCase() === 'yes';
              return false;
            };

            const hasCoR = checkYes(incident?.cor) || checkYes(incident?.cor_required) || checkYes(liability?.cor);
            const hasClaims = checkYes(incident?.formal_claim_issued) || checkYes(liability?.formal_claim_issued);
            const showRelatedRecords = hasCoR || hasClaims;

            if (!showRelatedRecords) return null;

            return (
              <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--fg-base)' }}>
                  <Shield size={16} color="var(--accent-fg)" /> Related Records
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {hasCoR && (
                    <Link
                      to={`/cors/${incident.id || id}`}
                      state={{ source: 'cors' }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        borderRadius: '10px',
                        background: 'rgba(245, 158, 11, 0.05)',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        textDecoration: 'none',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(245, 158, 11, 0.05)';
                        e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.2)';
                      }}
                    >
                      <div style={{ padding: '0.4rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', color: '#f59e0b', display: 'flex', alignItems: 'center' }}>
                        <AlertTriangle size={16} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--fg-base)' }}>CoR Compliance Log</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--fg-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          View/Edit Chain of Responsibility details →
                        </div>
                      </div>
                    </Link>
                  )}

                  {hasClaims && (
                    <Link
                      to={`/claims/${incident.id || id}`}
                      state={{ source: 'claims' }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        borderRadius: '10px',
                        background: 'rgba(239, 68, 68, 0.05)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        textDecoration: 'none',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                      }}
                    >
                      <div style={{ padding: '0.4rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                        <DollarSign size={16} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--fg-base)' }}>Claims Log Details</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--fg-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          View/Edit Claim settlement details →
                        </div>
                      </div>
                    </Link>
                  )}
                </div>
              </div>
            );
          })()}

          <div className="card" style={{ padding: '1.25rem', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-base)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0, color: 'var(--fg-base)', whiteSpace: 'nowrap' }}>
                  <Paperclip size={16} color="var(--accent-fg)" /> Evidence Vault
                </h3>
                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                  <button
                    className="btn btn-secondary"
                    onClick={fetchAttachments}
                    disabled={isRefreshing}
                    title="Refresh Attachments"
                    style={{ padding: '0.4rem', height: 'auto', background: 'var(--bg-subtle)', border: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <RefreshCw size={14} color={isRefreshing ? "var(--accent-fg)" : "var(--fg-muted)"} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', height: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
                  >
                    <UploadCloud size={14} /> {isUploading ? 'Uploading...' : 'Add File'}
                  </button>
                </div>
              </div>
              {attachments && attachments.length > 0 && (
                <button
                  className="btn btn-secondary"
                  onClick={handleDownloadAll}
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', background: 'var(--bg-subtle)', border: '1px solid var(--border-base)' }}
                >
                  <Download size={14} /> Download All {attachments.length} Files
                </button>
              )}
            </div>
            <input
              type="file"
              multiple
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            {(!attachments || attachments.length === 0) ? (
              <div style={{ fontSize: '0.875rem', color: 'var(--fg-muted)', textAlign: 'center', padding: '1rem 0' }}>
                No attachments uploaded.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {attachments.map((file: any) => {
                  const isImage = file.filename.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) != null;

                  return (
                    <div key={file.id} className="attachment-item" style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.75rem', background: 'var(--bg-surface)', borderRadius: '10px',
                      border: '1px solid var(--border-base)',
                      transition: 'all 0.2s ease',
                      boxShadow: 'var(--shadow-sm)'
                    }}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, cursor: 'pointer', flex: 1 }}
                        onClick={() => {
                          if (isImage) {
                            setPreviewFile(file);
                          } else {
                            window.open(file.url, '_blank', 'noopener,noreferrer');
                          }
                        }}
                      >
                        {isImage ? (
                          <div style={{ width: '32px', height: '32px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
                            <img src={file.url} alt={file.filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ) : (
                          <div style={{ width: '32px', height: '32px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-subtle)', flexShrink: 0 }}>
                            <FileText size={16} color="var(--accent-fg)" />
                          </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--accent-fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'color 0.2s ease' }} title={file.filename}>
                            {file.filename}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--fg-faint)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            {isImage ? <><Maximize size={10} /> Preview Image</> : <><ExternalLink size={10} /> Open Document</>}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: 'var(--fg-muted)', background: 'transparent', padding: '0.4rem', borderRadius: '6px', display: 'flex', transition: 'all 0.2s ease' }}
                          title="Download"
                          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-fg)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fg-muted)'; e.currentTarget.style.background = 'transparent'; }}
                        >
                          <Download size={14} />
                        </a>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteAttachment(file.filename); }}
                          disabled={isDeleting === file.filename}
                          style={{ color: 'var(--danger-fg)', background: 'transparent', padding: '0.4rem', border: 'none', cursor: 'pointer', borderRadius: '6px', display: 'flex', transition: 'all 0.2s ease' }}
                          title="Delete"
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <CollaborationFeed incidentId={incident.id} />
          </div>

        </div>
      </div>

      {/* Image Preview Modal */}
      {previewFile && previewFile.filename.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
          onClick={() => setPreviewFile(null)}
        >
          <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', color: '#fff', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', padding: '0.5rem', borderRadius: '50%', transition: 'background 0.2s ease' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
            <X size={24} />
          </div>
          <img src={previewFile.url} onClick={e => e.stopPropagation()} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', objectFit: 'contain' }} alt="Preview" />
        </div>
      )}
    </div>
  );
}
