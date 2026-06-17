import { useParams, Link, useLocation } from 'react-router-dom';
import { INCIDENT_STATUSES } from '../utils/incidentConstants';
import { ArrowLeft, FileText, Clock, MapPin, Briefcase, UserPlus, ChevronDown, ChevronRight, Shield, AlertTriangle, FileWarning, Users, HeartPulse, Lock as LockIcon, DollarSign, Edit2, Paperclip, Download, ExternalLink, X, Maximize, UploadCloud, RefreshCw, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CollaborationFeed from '../components/CollaborationFeed';
import { api } from '../services/api';
import { useState, useEffect, useRef } from 'react';
import { useIncidents } from '../hooks/useIncidents';
import { isEqual } from 'lodash';

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
import { StructuredDescription } from '../components/StructuredDescription';

export default function IncidentDetails() {
  const { id } = useParams();
  const { role, email } = useAuth();
  const [pollingInterval, setPollingInterval] = useState(5000); // 5 seconds in ms
  const { incidents, loading: hookLoading, handleManualRefresh } = useIncidents(pollingInterval);
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
  const fastPollingTimeoutRef = useRef<any>(null);
  const [isDirty, setIsDirty] = useState(false);
  const postSaveShieldRef = useRef(false);
  const postSaveTimeoutRef = useRef<any>(null);

  const activatePostSaveShield = () => {
    postSaveShieldRef.current = true;
    setIsDirty(false);
    if (postSaveTimeoutRef.current) clearTimeout(postSaveTimeoutRef.current);
    postSaveTimeoutRef.current = setTimeout(() => {
      postSaveShieldRef.current = false;
    }, 8000);
  };

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

  const triggerFastPolling = () => {
    if (fastPollingTimeoutRef.current) {
      clearTimeout(fastPollingTimeoutRef.current);
    }
    setPollingInterval(2000);
    handleManualRefresh();
    fastPollingTimeoutRef.current = setTimeout(() => {
      setPollingInterval(5000);
      fastPollingTimeoutRef.current = null;
    }, 8000);
  };

  useEffect(() => {
    return () => {
      if (fastPollingTimeoutRef.current) {
        clearTimeout(fastPollingTimeoutRef.current);
      }
      if (postSaveTimeoutRef.current) {
        clearTimeout(postSaveTimeoutRef.current);
      }
    };
  }, []);

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
      // Prioritize matching by stable incident_number_str (e.g. CEI-000001) over unstable Dataverse GUID
      let finalIncident = incidents.find((i: any) => String(i.incident_number_str) === String(id))
        || incidents.find((i: any) => String(i.id) === String(id));
      const targetId = finalIncident?.incident_number_str || id;

      // 2. Fetch latest metadata from backend (Investigation findings, Liability, etc.)
      // Fetch backend metadata for all incidents (including Digital Twins) to merge mock & locally patched records
      if (targetId) {
        try {
          const response = await api.get(`/incidents/${targetId}`);
          const backendData = response.data;

          if (backendData) {
            if (finalIncident) {
              // Enrich Dataverse record with backend metadata, ignoring nulls or empty strings from the backend
              const cleanBackendData = Object.fromEntries(
                Object.entries(backendData).filter(([k, v]) => v !== null && v !== undefined && v !== '' && k !== 'status')
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
        // Set up NCR default values if missing
        if (getIncidentCategory(finalIncident) === 'ncr') {
          if (finalIncident.cause_of_nc === undefined || finalIncident.cause_of_nc === null) finalIncident.cause_of_nc = '';
          if (finalIncident.corrective_action === undefined || finalIncident.corrective_action === null) finalIncident.corrective_action = '';
          if (finalIncident.corrective_action_implemented === undefined || finalIncident.corrective_action_implemented === null) finalIncident.corrective_action_implemented = 'No — implementation in progress';
          if (finalIncident.preventive_action === undefined || finalIncident.preventive_action === null) finalIncident.preventive_action = '';
          if (finalIncident.responsible_person === undefined || finalIncident.responsible_person === null) finalIncident.responsible_person = '';
          if (finalIncident.target_completion_date === undefined || finalIncident.target_completion_date === null || finalIncident.target_completion_date === '') finalIncident.target_completion_date = '21/05/2026';
          
          if (finalIncident.actual_completion_date === undefined || finalIncident.actual_completion_date === null || finalIncident.actual_completion_date === '') finalIncident.actual_completion_date = '— (not yet complete)';
          if (finalIncident.similar_nc_checked === undefined || finalIncident.similar_nc_checked === null || finalIncident.similar_nc_checked === '') finalIncident.similar_nc_checked = 'Yes — checked across all branches. No similar NC identified.';
          if (finalIncident.effectiveness_verification_date === undefined || finalIncident.effectiveness_verification_date === null || finalIncident.effectiveness_verification_date === '') finalIncident.effectiveness_verification_date = '07/06/2026';
          if (finalIncident.effectiveness_evidence_results === undefined || finalIncident.effectiveness_evidence_results === null) finalIncident.effectiveness_evidence_results = '';
          if (finalIncident.risk_register_updated === undefined || finalIncident.risk_register_updated === null || finalIncident.risk_register_updated === '') finalIncident.risk_register_updated = 'No — to be updated at close-out';
          if (finalIncident.qms_procedure_changed === undefined || finalIncident.qms_procedure_changed === null || finalIncident.qms_procedure_changed === '') finalIncident.qms_procedure_changed = 'No — SOP update in progress';
          if (finalIncident.capa_adequate === undefined || finalIncident.capa_adequate === null || finalIncident.capa_adequate === '') finalIncident.capa_adequate = 'No — pending effectiveness verification';
        }

        // Shield: do not overwrite local state if the user is actively editing or we're in a post-save window
        const isSaving = isUpdatingDept || isUpdatingConfidential || isUpdatingLiability;
        const isTyping = document.activeElement && 
          ['input', 'textarea', 'select'].includes(document.activeElement.tagName.toLowerCase());
        const shouldShield = isTyping || isDirty || isSaving || postSaveShieldRef.current;

        if (!shouldShield) {
          if (!incident || !isEqual(incident, finalIncident)) {
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
        }
      }

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
      activatePostSaveShield();
      triggerFastPolling();
    } catch (error) {
      console.error('Failed to update liability via PA:', error);
      alert('Error triggering liability update.');
    } finally {
      setIsUpdatingLiability(false);
    }
  };

  useEffect(() => {
    if (!hookLoading && !isDirty && !postSaveShieldRef.current && !isEditingForm) {
      fetchIncident();
    }
  }, [id, incidents, hookLoading, isDirty, isEditingForm]);

  // Pause polling while actively editing
  useEffect(() => {
    if (isEditingForm) {
      setPollingInterval(0);
    } else if (!fastPollingTimeoutRef.current) {
      setPollingInterval(5000);
    }
  }, [isEditingForm]);

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

  const handleFieldChange = (key: string, value: any) => {
    setIsDirty(true);
    setIncident((prev: any) => ({ ...prev, [key]: value }));
  };


  const handleDeptUpdate = async (ncrSection?: 'followup' | 'closeout') => {
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

      let flowUrl = DEPT_FLOWS[category];
      if (category === 'ncr') {
        if (ncrSection === 'followup') {
          flowUrl = 'https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/d75f953fc8234f9baec244346a4ac779/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=Wo71VN5oZzSYf6a__VPmm_cY39tIKsq8Ho6y7YBPk3s';
        } else if (ncrSection === 'closeout') {
          flowUrl = 'https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/7e50725ad60a40c3a26e43d7b6cae3c1/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=K5k3ARn_Iw9Nmvkqt0LV6HPZUdi48IG13qsDzMkSRdg';
        }
      }

      if (flowUrl) {
        let flowPayload;
        if (category === 'hr') {
          flowPayload = {
            incident_id: incident.id,
            incident_number: incident.incident_number_str || id,
            investigation_outcome: incident.investigation_outcome || '',
            corrective_action: incident.corrective_action || '',
            legal_counsel_engaged: incident.legal_counsel_engaged || ''
          };
        } else if (category === 'whs') {
          flowPayload = {
            incident_id: incident.id,
            incident_number: incident.incident_number_str || id,
            medical_treatment_required: incident.medical_treatment_required || '',
            lost_time_injury: incident.lost_time_injury || '',
            notifiable_safework: incident.notifiable_safework || '',
            date_notified_regulator: incident.date_notified_regulator || '',
            root_cause: incident.root_cause || '',
            corrective_action: incident.corrective_action || '',
            corrective_action_owner: incident.corrective_action_owner || '',
            corrective_action_due_date: incident.corrective_action_due_date || '',
            chro_cro_notified: incident.chro_cro_notified || '',
            workers_comp_claim: incident.workers_comp_claim || ''
          };
        } else if (category === 'it') {
          flowPayload = {
            incident_id: incident.id,
            incident_number: incident.incident_number_str || id,
            containment_actions: incident.containment_actions || '',
            personal_data_involved: incident.personal_data_involved || '',
            records_affected: incident.records_affected || '',
            notifiable_privacy_breach: incident.notifiable_privacy_breach || '',
            date_notified_oaic: incident.date_notified_oaic || '',
            cio_notified: incident.cio_notified || '',
            cro_notified: incident.cro_notified || '',
            cyber_specialist_engaged: incident.cyber_specialist_engaged || '',
            insurer_notified_dept: incident.insurer_notified_dept || '',
            root_cause: incident.root_cause || '',
            corrective_action: incident.corrective_action || ''
          };
        } else if (category === 'risk') {
          flowPayload = {
            incident_id: incident.id,
            incident_number: incident.incident_number_str || id,
            regulator_involved: incident.regulator_involved || '',
            notified_regulator: incident.notified_regulator || '',
            date_notified: incident.date_notified || '',
            cro_notified: incident.cro_notified || '',
            legal_counsel_engaged: incident.legal_counsel_engaged || '',
            penalty_imposed: incident.penalty_imposed || '',
            penalty_amount: incident.penalty_amount || '',
            root_cause: incident.root_cause || '',
            corrective_action: incident.corrective_action || '',
            corrective_action_owner: incident.corrective_action_owner || ''
          };
        } else if (category === 'finance') {
          flowPayload = {
            incident_id: incident.id,
            incident_number: incident.incident_number_str || id,
            financial_value: incident.financial_value || '',
            actual_loss: incident.actual_loss || '',
            recovery_possible: incident.recovery_possible || '',
            recovery_amount: incident.recovery_amount || '',
            cfo_notified: incident.cfo_notified || '',
            cro_notified: incident.cro_notified || '',
            police_reported: incident.police_reported || '',
            insurer_notified_dept: incident.insurer_notified_dept || '',
            root_cause: incident.root_cause || '',
            corrective_action: incident.corrective_action || '',
            write_off_required: incident.write_off_required || ''
          };
        } else if (category === 'ncr') {
          if (ncrSection === 'followup') {
            flowPayload = {
              incident_id: incident.id,
              incident_number: incident.incident_number_str || id,
              ncr_id: incident.id,
              'NCR-id': incident.id,
              cr991_nonconformancereportsid: incident.id,
              cause_of_nc: incident.cause_of_nc || '',
              corrective_action: incident.corrective_action || '',
              corrective_action_implemented: incident.corrective_action_implemented || 'No — implementation in progress',
              preventive_action: incident.preventive_action || '',
              responsible_person: incident.responsible_person || '',
              target_completion_date: incident.target_completion_date || '21/05/2026'
            };
          } else {
            flowPayload = {
              incident_id: incident.id,
              incident_number: incident.incident_number_str || id,
              ncr_id: incident.id,
              'NCR-id': incident.id,
              cr991_nonconformancereportsid: incident.id,
              actual_completion_date: incident.actual_completion_date || '— (not yet complete)',
              similar_nc_checked: incident.similar_nc_checked || 'Yes — checked across all branches. No similar NC identified.',
              effectiveness_verification_date: incident.effectiveness_verification_date || '07/06/2026',
              effectiveness_evidence_results: incident.effectiveness_evidence_results || '',
              risk_register_updated: incident.risk_register_updated || 'No — to be updated at close-out',
              qms_procedure_changed: incident.qms_procedure_changed || 'No — SOP update in progress',
              capa_adequate: incident.capa_adequate || 'No — pending effectiveness verification',
              status: incident.status || 'In Progress'
            };
          }
        } else {
          flowPayload = payload;
        }

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
        'date_logged', 'logged_by', 'employee_name', 'incident_type', 'incident_number_str',
        'records_affected', 'date_notified_oaic', 'cyber_specialist_engaged', 'insurer_notified_dept',
        'date_notified', 'penalty_amount',
        // NCR specific fields
        'entity', 'ncr_entity', 'notify', 'ncr_notify', 'business_unit', 'branch_department',
        'level_of_nonconformity', 'ncr_level', 'identification', 'ncr_identification',
        'identified_by', 'ncr_identified_by', 'at_fault_party', 'ncr_at_fault_party',
        'containment', 'ncr_containment', 'related_record', 'ncr_reference',
        // NCR follow-up and close-out fields
        'cause_of_nc', 'corrective_action_implemented', 'preventive_action', 'responsible_person',
        'target_completion_date', 'actual_completion_date', 'similar_nc_checked',
        'effectiveness_verification_date', 'effectiveness_evidence_results', 'risk_register_updated',
        'qms_procedure_changed', 'capa_adequate'
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
      activatePostSaveShield();
      triggerFastPolling();
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
      activatePostSaveShield();
      triggerFastPolling();
    } catch (error) {
      console.error('Confidential notes update failed:', error);
      alert('Failed to update confidential notes.');
    } finally {
      setIsUpdatingConfidential(false);
    }
  };

  const handleOriginalFormSubmit = async (formData: any, _isDraft?: boolean) => {
    setIsEditingForm(false);
    setIsUpdatingDept(true);
    try {
      // Clean up formData before sending to backend and flow
      const { files, attachments, ...restFormData } = formData;
      
      // For backend: sanitize lists
      const backendPayload = { ...restFormData };
      if (Array.isArray(backendPayload.incident_types)) backendPayload.incident_types = backendPayload.incident_types.join('; ');
      if (Array.isArray(backendPayload.corrective_actions)) backendPayload.corrective_actions = backendPayload.corrective_actions.join('; ');
      if (Array.isArray(backendPayload.claim_types)) backendPayload.claim_types = backendPayload.claim_types.join('; ');

      await api.patch(`/incidents/${searchId}`, backendPayload);

      // Trigger Power Automate Flow
      const flowUrl = 'https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/74f8a63304df494087f857e6f1b2052c/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=oodv6eTDdoSD_vCx-h3peZ8Ltfz0WbXcYUMkYG4YuOE';
      
      const cat = getIncidentCategory(incident);
      const autoMappedPayload: any = {};
      Object.keys(backendPayload).forEach(key => {
        if (!key.startsWith('cr991_')) {
          const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
          autoMappedPayload[`cr991_${cleanKey}`] = backendPayload[key];
        }
      });
      
      const incidentLink = `${window.location.origin}/incidents/${incident.incident_number_str || incident.id || searchId}`;
      const loggedBy = email || localStorage.getItem('email') || 'System User';
      const targetIncidentId = incident.incident_number_str || incident.id || searchId;

      const flowPayload = {
        "editor email": email || '',
        "incident id": targetIncidentId,
        incident_id: targetIncidentId,
        cr991_incidentid: targetIncidentId,
        cr991_incidentref: targetIncidentId,
        cr991_number: targetIncidentId,
        cr991_name: targetIncidentId,
        "incident type": {
          cargo: 'Cargo & Equipment Incident',
          hr: 'Human Resources Incident',
          whs: 'WH&S Incident',
          it: 'IT & Security Incident',
          risk: 'Risk & Compliance Incident',
          finance: 'Finance Incident',
          ncr: 'Non-Conformance Report (NCR)',
        }[cat as string] || cat,
        cr991_incidentnumber: targetIncidentId,
        cr991_incidentstatus: _isDraft ? 'Draft' : 'Open - Incident Logged',
        incident_link: incidentLink,
        cr991_incidentlink: incidentLink,
        submitted_by: loggedBy,
        cr991_submittedby: loggedBy,
        logged_by: loggedBy,
        cr991_loggedby: loggedBy,
        ...backendPayload,
        ...autoMappedPayload,
        cr991_incidenttypeselectallapplicableincid: backendPayload.incident_types || backendPayload.incident_type,
        cr991_immediatecorrectiveactionselectallapplicable: backendPayload.corrective_actions || backendPayload.immediate_action || backendPayload.corrective_action,
        cr991_intenttoclaimissuedselectallapplicable: backendPayload.claim_types,
        cr991_incidenttype: backendPayload.incident_types || backendPayload.incident_type,
        cr991_immediatecorrectiveaction: backendPayload.corrective_actions || backendPayload.immediate_action || backendPayload.corrective_action,
        cr991_intenttoclaimissued: backendPayload.claim_types,
        cr991_intenttoclaim: backendPayload.claim_types,
        intent_to_claim: backendPayload.claim_types,
        cr991_incidentsummary: backendPayload.incident_summary || backendPayload.description,
        cr991_shippinglineairline: backendPayload.carrier || '',
      };

      fetch(flowUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flowPayload)
      }).catch(err => console.error('Power Automate edit trigger failed:', err));

      showNotification('Submission updated successfully.');
      await handleManualRefresh(); // Fetch immediately
      triggerFastPolling(); // Continue fast polling for a few seconds

    } catch (err) {
      console.error('Failed to update submission:', err);
      alert('Failed to update submission.');
    } finally {
      setIsUpdatingDept(false);
    }
  };

  if (loading) return <div className="fade-in" style={{ padding: '4rem', textAlign: 'center' }}>Loading incident data...</div>;
  if (!incident) return <div className="fade-in" style={{ padding: '4rem', textAlign: 'center' }}>Incident not found.</div>;

  const renderOriginalForm = () => {
    const category = getIncidentCategory(incident);
    // Use a stable key: only re-mount the form when the incident ID changes or edit mode toggles.
    // Using JSON.stringify(incident) caused the form to flicker on every poll cycle.
    const formKey = isEditingForm ? `edit-${incident.id}` : `view-${incident.id}`;

    switch (category) {
      case 'cargo': return <CargoForm key={formKey} initialData={incident} readOnly={!isEditingForm} onSubmit={handleOriginalFormSubmit} onCancel={() => setIsEditingForm(false)} loading={isUpdatingDept} />;
      case 'hr': return <HRForm key={formKey} initialData={incident} readOnly={!isEditingForm} onSubmit={handleOriginalFormSubmit} onCancel={() => setIsEditingForm(false)} loading={isUpdatingDept} />;
      case 'whs': return <WHSForm key={formKey} initialData={incident} readOnly={!isEditingForm} onSubmit={handleOriginalFormSubmit} onCancel={() => setIsEditingForm(false)} loading={isUpdatingDept} />;
      case 'it': return <ITForm key={formKey} initialData={incident} readOnly={!isEditingForm} onSubmit={handleOriginalFormSubmit} onCancel={() => setIsEditingForm(false)} loading={isUpdatingDept} />;
      case 'risk': return <RiskForm key={formKey} initialData={incident} readOnly={!isEditingForm} onSubmit={handleOriginalFormSubmit} onCancel={() => setIsEditingForm(false)} loading={isUpdatingDept} />;
      case 'finance': return <FinanceForm key={formKey} initialData={incident} readOnly={!isEditingForm} onSubmit={handleOriginalFormSubmit} onCancel={() => setIsEditingForm(false)} loading={isUpdatingDept} />;
      case 'ncr': return <NCRForm key={formKey} initialData={incident} readOnly={!isEditingForm} onSubmit={handleOriginalFormSubmit} onCancel={() => setIsEditingForm(false)} loading={isUpdatingDept} />;
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
      activatePostSaveShield();
      triggerFastPolling();
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
        position: 'relative', overflow: 'hidden', padding: '1.25rem 2rem', marginBottom: '2rem',
        background: `linear-gradient(145deg, ${CATEGORY_META[getIncidentCategory(incident)].color}15 0%, var(--bg-surface) 100%)`,
        border: '1px solid var(--border-base)',
        borderLeft: `4px solid ${CATEGORY_META[getIncidentCategory(incident)].color}`,
        boxShadow: `0 10px 30px -10px ${CATEGORY_META[getIncidentCategory(incident)].color}20, inset 0 1px 0 rgba(255,255,255,0.05)`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2rem'
      }}>
        {/* Glow effect */}
        <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '50%', height: '200%', background: `radial-gradient(ellipse at center, ${CATEGORY_META[getIncidentCategory(incident)].color}25 0%, transparent 70%)`, transform: 'rotate(-25deg)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ padding: '0.6rem', background: `${CATEGORY_META[getIncidentCategory(incident)].color}15`, borderRadius: '12px', color: CATEGORY_META[getIncidentCategory(incident)].color, border: `1px solid ${CATEGORY_META[getIncidentCategory(incident)].color}30` }}>
              {(() => {
                const cat = getIncidentCategory(incident);
                return cat === 'hr' ? <Users size={24} /> :
                  cat === 'whs' ? <HeartPulse size={24} /> :
                  cat === 'it' ? <LockIcon size={24} /> :
                  cat === 'risk' ? <Shield size={24} /> :
                  cat === 'finance' ? <DollarSign size={24} /> :
                  cat === 'ncr' ? <FileWarning size={24} /> : <FileText size={24} />;
              })()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ width: 'fit-content', fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.6rem', background: `${CATEGORY_META[getIncidentCategory(incident)].color}15`, border: `1px solid ${CATEGORY_META[getIncidentCategory(incident)].color}30`, borderRadius: '20px', color: CATEGORY_META[getIncidentCategory(incident)].color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {CATEGORY_META[getIncidentCategory(incident)].label}
              </span>
              <h2 className="page-title" style={{ marginBottom: 0, fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--fg-base)', whiteSpace: 'nowrap' }}>
                {incident.incident_number_str || `INC-${incident.id}`}
              </h2>
            </div>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border-subtle)', backdropFilter: 'blur(10px)' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--fg-faint)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Workflow Status</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: (incident?.status || '').includes('Closed') ? '#10b981' : '#3b82f6', boxShadow: `0 0 8px ${(incident?.status || '').includes('Closed') ? '#10b981' : '#3b82f6'}` }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--fg-base)' }}>{String(incident?.status || '')}</span>
            </div>
          </div>

          <button
            className="btn"
            style={{ background: 'var(--bg-subtle)', color: 'var(--fg-base)', border: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s ease', height: '36px' }}
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

      <div className="bento-grid">
        {/* Left Column (Main Details + Liability) */}
        <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Main Details Panel */}
          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '2rem', fontWeight: 700, color: 'var(--fg-base)' }}>Incident Details</h3>

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
                  <label className="overline">{(() => { const cat = getIncidentCategory(incident); return cat === 'cargo' ? 'CargoWise Ref' : cat === 'hr' ? 'Employee' : cat === 'whs' ? 'Person(s) Involved' : cat === 'it' ? 'Systems Affected' : cat === 'risk' ? 'Regulation Breached' : cat === 'finance' ? 'Incident Type' : cat === 'ncr' ? 'Related Record' : 'Reference'; })()}</label>
                  <div style={{ fontSize: '0.875rem', color: 'var(--accent-fg)', fontWeight: 500 }}>{(() => { const cat = getIncidentCategory(incident); return cat === 'cargo' ? (incident.job_number || 'N/A') : cat === 'hr' ? (incident.employee_name || incident.employee_involved || 'N/A') : cat === 'whs' ? (incident.persons_involved || 'N/A') : cat === 'it' ? (incident.systems_affected || 'N/A') : cat === 'risk' ? (incident.regulation_breached || 'N/A') : cat === 'finance' ? (incident.incident_type || incident.type || 'N/A') : cat === 'ncr' ? (incident.related_record || incident.ncr_reference || 'N/A') : 'N/A'; })()}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', height: 'fit-content' }}>
                  <MapPin size={16} style={{ color: 'var(--fg-muted)' }} />
                </div>
                <div>
                  <label className="overline">{getIncidentCategory(incident) === 'whs' ? 'Location (Site)' : 'Branch / Department'}</label>
                  <div style={{ fontSize: '0.875rem', color: 'var(--fg-base)', fontWeight: 500 }}>
                    {getIncidentCategory(incident) === 'whs' ? (incident.location || incident.branch_department || 'N/A') : (incident.branch_department || 'N/A')}
                  </div>
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

            {/* Description Narrative */}
            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 700, color: 'var(--fg-base)' }}>Incident Narrative</h3>
              <StructuredDescription description={incident.incident_summary || incident.description} />
            </div>

            {getIncidentCategory(incident) === 'ncr' && (
              <div style={{
                background: 'rgba(234, 179, 8, 0.03)',
                border: '1px solid rgba(234, 179, 8, 0.15)',
                borderRadius: '12px',
                padding: '1.5rem',
                marginTop: '1rem',
                marginBottom: '2rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1.25rem'
              }}>
                <div style={{ gridColumn: 'span 3', borderBottom: '1px solid rgba(234, 179, 8, 0.1)', paddingBottom: '0.75rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileWarning size={16} color="#eab308" />
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#eab308', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Non-Conformance Report Details</span>
                </div>
                <div>
                  <label className="overline" style={{ color: 'var(--fg-faint)' }}>Entity</label>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--fg-base)' }}>{incident.entity || incident.ncr_entity || 'N/A'}</div>
                </div>
                <div>
                  <label className="overline" style={{ color: 'var(--fg-faint)' }}>Business Unit (BU)</label>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--fg-base)' }}>{incident.business_unit || 'N/A'}</div>
                </div>
                <div>
                  <label className="overline" style={{ color: 'var(--fg-faint)' }}>Branch</label>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--fg-base)' }}>{incident.branch_department || incident.location || 'N/A'}</div>
                </div>
                <div>
                  <label className="overline" style={{ color: 'var(--fg-faint)' }}>Level of Nonconformity</label>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', fontWeight: 600, color: (incident.level_of_nonconformity || incident.ncr_level) === 'Critical' ? '#ef4444' : (incident.level_of_nonconformity || incident.ncr_level) === 'Major' ? '#f59e0b' : '#3b82f6' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: (incident.level_of_nonconformity || incident.ncr_level) === 'Critical' ? '#ef4444' : (incident.level_of_nonconformity || incident.ncr_level) === 'Major' ? '#f59e0b' : '#3b82f6' }} />
                    {incident.level_of_nonconformity || incident.ncr_level || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="overline" style={{ color: 'var(--fg-faint)' }}>Identification of NC</label>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--fg-base)' }}>{incident.identification || incident.ncr_identification || 'N/A'}</div>
                </div>
                <div>
                  <label className="overline" style={{ color: 'var(--fg-faint)' }}>Identified By</label>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--fg-base)' }}>{incident.identified_by || incident.ncr_identified_by || 'N/A'}</div>
                </div>
                <div>
                  <label className="overline" style={{ color: 'var(--fg-faint)' }}>At Fault Party</label>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--fg-base)' }}>{incident.at_fault_party || incident.ncr_at_fault_party || 'N/A'}</div>
                </div>
                <div>
                  <label className="overline" style={{ color: 'var(--fg-faint)' }}>Notify</label>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--fg-base)' }}>{incident.notify || incident.ncr_notify || 'N/A'}</div>
                </div>
                <div>
                  <label className="overline" style={{ color: 'var(--fg-faint)' }}>Related Record Reference</label>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-fg)' }}>{incident.related_record || incident.ncr_reference || 'N/A'}</div>
                </div>
                {incident.containment || incident.ncr_containment ? (
                  <div style={{ gridColumn: 'span 3', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <label className="overline" style={{ color: 'var(--fg-faint)', display: 'block', marginBottom: '0.25rem' }}>Immediate Containment Action</label>
                    <div style={{ fontSize: '0.875rem', color: 'var(--fg-muted)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{incident.containment || incident.ncr_containment}</div>
                  </div>
                ) : null}
              </div>
            )}



            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
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
                    category === 'finance' ? <DollarSign size={16} /> :
                      category === 'ncr' ? <FileWarning size={16} /> : <FileText size={16} />;

            return (
              <>
                {/* Department Investigation Section */}
                {canSee && category !== 'cargo' && (
                  <IncidentSection
                    title={category === 'ncr' ? 'R&C / MANAGER' : `${meta.label} Investigation`}
                    icon={deptSectionIcon}
                    color={meta.color}
                    ownerLabel={category === 'ncr' ? 'R&C / MANAGER' : meta.deptLabel}
                    isAwaitingUpdate={isAwaiting}
                    awaitingMessage={`Awaiting ${meta.deptLabel} Update`}
                  >
                    {category === 'hr' && <HRDeptSection incident={incident} editable={canEdit} onChange={handleFieldChange} />}
                    {category === 'whs' && <WHSDeptSection incident={incident} editable={canEdit} onChange={handleFieldChange} />}
                    {category === 'it' && <ITDeptSection incident={incident} editable={canEdit} onChange={handleFieldChange} />}
                    {category === 'risk' && <RiskDeptSection incident={incident} editable={canEdit} onChange={handleFieldChange} />}
                    {category === 'finance' && <FinanceDeptSection incident={incident} editable={canEdit} onChange={handleFieldChange} />}
                    {category === 'ncr' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                          <label className="overline">Cause of NC</label>
                          <textarea
                            className="input-field"
                            style={{ minHeight: '80px' }}
                            placeholder="Identify the root cause of the non-conformance..."
                            value={incident.cause_of_nc || ''}
                            onChange={(e) => handleFieldChange('cause_of_nc', e.target.value)}
                            disabled={!canEdit}
                          />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <label className="overline">Corrective Action</label>
                          <textarea
                            className="input-field"
                            style={{ minHeight: '80px' }}
                            placeholder="Action taken to correct the non-conformance..."
                            value={incident.corrective_action || ''}
                            onChange={(e) => handleFieldChange('corrective_action', e.target.value)}
                            disabled={!canEdit}
                          />
                        </div>
                        <div>
                          <label className="overline">Corrective Action Implemented</label>
                          <select
                            className="input-field"
                            value={incident.corrective_action_implemented || 'No — implementation in progress'}
                            onChange={(e) => handleFieldChange('corrective_action_implemented', e.target.value)}
                            disabled={!canEdit}
                          >
                            <option value="No — implementation in progress">No — implementation in progress</option>
                            <option value="Yes">Yes</option>
                          </select>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <label className="overline">Preventive Action</label>
                          <textarea
                            className="input-field"
                            style={{ minHeight: '80px' }}
                            placeholder="Action taken to prevent recurrence..."
                            value={incident.preventive_action || ''}
                            onChange={(e) => handleFieldChange('preventive_action', e.target.value)}
                            disabled={!canEdit}
                          />
                        </div>
                        <div>
                          <label className="overline">Responsible Person</label>
                          <input
                            type="text"
                            className="input-field"
                            placeholder="Name or Role"
                            value={incident.responsible_person || ''}
                            onChange={(e) => handleFieldChange('responsible_person', e.target.value)}
                            disabled={!canEdit}
                          />
                        </div>
                        <div>
                          <label className="overline">Target Completion Date</label>
                          <input
                            type="text"
                            className="input-field"
                            placeholder="DD/MM/YYYY"
                            value={incident.target_completion_date || '21/05/2026'}
                            onChange={(e) => handleFieldChange('target_completion_date', e.target.value)}
                            disabled={!canEdit}
                          />
                        </div>
                      </div>
                    )}

                    {canEdit && (
                      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-primary"
                          style={{ background: meta.color, color: '#fff', border: 'none' }}
                          onClick={() => handleDeptUpdate('followup')}
                          disabled={isUpdatingDept}
                        >
                          {isUpdatingDept ? 'Saving...' : category === 'ncr' ? 'Save Follow-up Details' : 'Save Investigation Updates'}
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
          {canSeeRCSection(role) && getIncidentCategory(incident) !== 'ncr' && (
            <div className="card" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>Incident Management</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label className="overline">Responsible Party</label>
                  <select className="input-field" value={liability.responsible_party} onChange={(e) => { setIsDirty(true); setLiability({ ...liability, responsible_party: e.target.value }); }}>
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
                  <select className="input-field" value={liability.formal_claim_issued} onChange={(e) => { setIsDirty(true); setLiability({ ...liability, formal_claim_issued: e.target.value }); }}>
                    <option value="">— Select —</option>
                    <option value="Yes">Yes (* creates Claims Log)</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div>
                  <label className="overline">Insurer Notified</label>
                  <select className="input-field" value={liability.insurer_notified} onChange={(e) => { setIsDirty(true); setLiability({ ...liability, insurer_notified: e.target.value }); }}>
                    <option value="">— Select —</option>
                    <option value="Yes">Yes (* creates Insurers Notification Template)</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div>
                  <label className="overline">Risk Level</label>
                  <select className="input-field" value={liability.risk_level} onChange={(e) => { setIsDirty(true); setLiability({ ...liability, risk_level: e.target.value }); }}>
                    <option value="">— Select —</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="overline">Management Escalation</label>
                  <select className="input-field" value={liability.management_escalation} onChange={(e) => { setIsDirty(true); setLiability({ ...liability, management_escalation: e.target.value }); }}>
                    <option value="">— Select —</option>
                    <option value="Yes">Yes (* creates Management Notification Template)</option>
                    <option value="No">No</option>
                    <option value="Not Applicable">Not Applicable</option>
                  </select>
                </div>
                <div>
                  <label className="overline">COR</label>
                  <select className="input-field" value={liability.cor} onChange={(e) => { setIsDirty(true); setLiability({ ...liability, cor: e.target.value }); }}>
                    <option value="">— Select —</option>
                    <option value="Yes">Yes (* creates CoR Log)</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="overline">Incident Status</label>
                  <select className="input-field" value={liability.status} onChange={(e) => { setIsDirty(true); setLiability({ ...liability, status: e.target.value }); }}>
                    {(INCIDENT_STATUSES[getIncidentCategory(incident)] || INCIDENT_STATUSES.cargo).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="overline">Comments</label>
                  <textarea className="input-field" style={{ minHeight: '80px' }} placeholder="Add comments here..." value={liability.comments} onChange={(e) => { setIsDirty(true); setLiability({ ...liability, comments: e.target.value }); }} />
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

          {/* Risk & Compliance Team CLOSE-OUT (R&C) Form for NCR */}
          {canSeeRCSection(role) && getIncidentCategory(incident) === 'ncr' && (
            <div className="card fade-in" style={{ padding: '2rem', border: '1px solid rgba(139, 92, 246, 0.3)', background: 'rgba(139, 92, 246, 0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px', color: '#8b5cf6' }}><Shield size={20} /></div>
                <h3 style={{ fontSize: '1.25rem', color: '#8b5cf6', margin: 0 }}>CLOSE-OUT (R&C)</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label className="overline">Actual Completion Date</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="— (not yet complete)"
                    value={incident.actual_completion_date || '— (not yet complete)'}
                    onChange={(e) => handleFieldChange('actual_completion_date', e.target.value)}
                  />
                </div>
                <div>
                  <label className="overline">Similar NC Checked</label>
                  <select
                    className="input-field"
                    value={incident.similar_nc_checked || 'Yes — checked across all branches. No similar NC identified.'}
                    onChange={(e) => handleFieldChange('similar_nc_checked', e.target.value)}
                  >
                    <option value="Yes — checked across all branches. No similar NC identified.">Yes — checked across all branches. No similar NC identified.</option>
                    <option value="Yes — similar NC identified. Updating risk register.">Yes — similar NC identified. Updating risk register.</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div>
                  <label className="overline">Effectiveness Verification Date</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="07/06/2026"
                    value={incident.effectiveness_verification_date || '07/06/2026'}
                    onChange={(e) => handleFieldChange('effectiveness_verification_date', e.target.value)}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="overline">Effectiveness Evidence / Results</label>
                  <textarea
                    className="input-field"
                    style={{ minHeight: '80px' }}
                    placeholder="Detail the evidence supporting the effectiveness of the PA/CA..."
                    value={incident.effectiveness_evidence_results || ''}
                    onChange={(e) => handleFieldChange('effectiveness_evidence_results', e.target.value)}
                  />
                </div>
                <div>
                  <label className="overline">Risk Register Updated</label>
                  <select
                    className="input-field"
                    value={incident.risk_register_updated || 'No — to be updated at close-out'}
                    onChange={(e) => handleFieldChange('risk_register_updated', e.target.value)}
                  >
                    <option value="No — to be updated at close-out">No — to be updated at close-out</option>
                    <option value="Yes">Yes</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
                <div>
                  <label className="overline">QMS / Procedure Changed</label>
                  <select
                    className="input-field"
                    value={incident.qms_procedure_changed || 'No — SOP update in progress'}
                    onChange={(e) => handleFieldChange('qms_procedure_changed', e.target.value)}
                  >
                    <option value="No — SOP update in progress">No — SOP update in progress</option>
                    <option value="Yes">Yes</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
                <div>
                  <label className="overline">CAPA Adequate</label>
                  <select
                    className="input-field"
                    value={incident.capa_adequate || 'No — pending effectiveness verification'}
                    onChange={(e) => handleFieldChange('capa_adequate', e.target.value)}
                  >
                    <option value="No — pending effectiveness verification">No — pending effectiveness verification</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
                <div>
                  <label className="overline">Status</label>
                  <select
                    className="input-field"
                    value={incident.status || ''}
                    onChange={(e) => {
                      handleFieldChange('status', e.target.value);
                      setLiability(prev => ({ ...prev, status: e.target.value }));
                    }}
                  >
                    {incident.status && ![
                      'In Progress',
                      'Open - New',
                      'Open - Under Investigation',
                      'Open - Corrective Action Pending',
                      'Closed - No Further Action'
                    ].includes(incident.status) && (
                      <option value={incident.status}>{incident.status}</option>
                    )}
                    <option value="">— Select Status —</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Open - New">Open - New</option>
                    <option value="Open - Under Investigation">Open - Under Investigation</option>
                    <option value="Open - Corrective Action Pending">Open - Corrective Action Pending</option>
                    <option value="Closed - No Further Action">Closed - No Further Action</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-primary"
                  style={{ background: '#8b5cf6', color: '#fff', border: 'none' }}
                  onClick={() => handleDeptUpdate('closeout')}
                  disabled={isUpdatingDept}
                >
                  {isUpdatingDept ? 'Saving...' : 'Save Close-Out Details'}
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
                  onClick={() => handleDeptUpdate()}
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
                    onChange={(e) => { setIsDirty(true); setLiability({ ...liability, cor_risk_level: e.target.value }); }}
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
                    onChange={(e) => { setIsDirty(true); setLiability({ ...liability, cor_status: e.target.value }); }}
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
                    onChange={(e) => { setIsDirty(true); setLiability({ ...liability, cor_assessment: e.target.value }); }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="overline">CoR Corrective Action</label>
                  <textarea
                    className="input-field"
                    style={{ minHeight: '80px' }}
                    placeholder="Actions taken to rectify the CoR breach..."
                    value={liability.cor_corrective_action}
                    onChange={(e) => { setIsDirty(true); setLiability({ ...liability, cor_corrective_action: e.target.value }); }}
                  />
                </div>
                <div>
                  <label className="overline">CoR Corrective Action Implemented?</label>
                  <select
                    className="input-field"
                    value={liability.cor_action_implemented}
                    onChange={(e) => { setIsDirty(true); setLiability({ ...liability, cor_action_implemented: e.target.value }); }}
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
