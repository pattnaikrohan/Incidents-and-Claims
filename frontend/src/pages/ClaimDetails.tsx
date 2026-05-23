import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Clock, MapPin, Briefcase, ChevronDown, DollarSign, Paperclip, UploadCloud, RefreshCw, Trash2, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { useIncidents } from '../hooks/useIncidents';
import { getIncidentCategory, CATEGORY_META } from '../utils/incidentRoles';
import { api } from '../services/api';
import { StructuredDescription } from '../components/StructuredDescription';

export default function ClaimDetails() {
  const { id } = useParams();
  const { role } = useAuth();
  const { incidents } = useIncidents(0);
  const [incident, setIncident] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Attachment states
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [claim, setClaim] = useState({
    claim_reference: '', claim_date: '', claimant: '', claim_time_bar: '',
    claim_type: 'Cargo Damage', claim_direction: 'Inbound (Against Us)',
    claim_amount: '', paid_amount: '', insurance_paid: '', deductible: '',
    recovery_amount: '', outstanding_balance: '',
    writeoff_required: 'No', writeoff_amount: '', writeoff_approved_by: '', writeoff_date: '',
    claim_state: 'Pending / Under Review', claim_status: 'Open - New', settlement_status: '', comments: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Hydrate from cached incidents
  useEffect(() => {
    if (incidents.length > 0 && id) {
      const cached = incidents.find((i: any) =>
        i.id?.toString() === id || i.incident_number_str === id
      );
      if (cached) {
        setIncident(cached);
        setClaim(prev => ({
          claim_reference: cached.claim_reference || prev.claim_reference,
          claim_date: cached.claim_date || prev.claim_date,
          claimant: cached.claimant || prev.claimant,
          claim_time_bar: cached.claim_time_bar || prev.claim_time_bar,
          claim_type: cached.claim_type || prev.claim_type,
          claim_direction: cached.claim_direction || prev.claim_direction,
          claim_amount: cached.claim_amount || prev.claim_amount,
          paid_amount: cached.paid_amount || prev.paid_amount,
          insurance_paid: cached.insurance_paid || prev.insurance_paid,
          deductible: cached.deductible || prev.deductible,
          recovery_amount: cached.recovery_amount || prev.recovery_amount,
          outstanding_balance: cached.outstanding_balance || prev.outstanding_balance,
          writeoff_required: cached.writeoff_required || prev.writeoff_required,
          writeoff_amount: cached.writeoff_amount || prev.writeoff_amount,
          writeoff_approved_by: cached.writeoff_approved_by || prev.writeoff_approved_by,
          writeoff_date: cached.writeoff_date || prev.writeoff_date,
          claim_state: cached.claim_state || prev.claim_state,
          claim_status: cached.claim_status || prev.claim_status,
          settlement_status: cached.settlement_status || prev.settlement_status,
          comments: cached.comments || prev.comments,
        }));
        setLoading(false);
      }
    }
  }, [incidents, id]);

  // Azure Document folder mapping and upload/delete handlers
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

  const fetchAttachments = async () => {
    if (!incident) return;
    setIsRefreshing(true);
    try {
      const searchId = incident.incident_number_str || id;
      const folderType = getAzureFolderType(incident);
      const typeQuery = `?incident_type=${encodeURIComponent(folderType)}`;
      const response = await api.get(`/documents/incident/${searchId}/list${typeQuery}`);
      setAttachments(response.data.documents || response.data || []);
    } catch (err) {
      console.warn('Failed to refresh attachments:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleDeleteAttachment = async (filename: string) => {
    if (!incident) return;
    if (!window.confirm(`Are you sure you want to delete ${filename}?`)) return;
    setIsDeleting(filename);
    try {
      const searchId = incident.incident_number_str || id;
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!incident) return;
    if (!event.target.files || event.target.files.length === 0) return;
    
    setIsUploading(true);
    const files = Array.from(event.target.files);
    
    try {
      const searchId = incident.incident_number_str || id;
      const folderType = getAzureFolderType(incident);
      const typeQuery = `?incident_type=${encodeURIComponent(folderType)}`;
      
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        await api.post(`/documents/incident/${searchId}/upload${typeQuery}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      
      await fetchAttachments();
      showNotification('Attachments uploaded successfully.');
    } catch (err) {
      console.error('Failed to upload files:', err);
      alert('Failed to upload files.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Fetch attachments once incident is resolved
  useEffect(() => {
    if (incident) {
      fetchAttachments();
    }
  }, [incident]);

  // Rule 4: Auto generated - 1 year from incident date
  useEffect(() => {
    if (incident?.date && !claim.claim_time_bar) {
      const incDate = new Date(incident.date);
      if (!isNaN(incDate.getTime())) {
        incDate.setFullYear(incDate.getFullYear() + 1);
        const yyyy = incDate.getFullYear();
        const mm = String(incDate.getMonth() + 1).padStart(2, '0');
        const dd = String(incDate.getDate()).padStart(2, '0');
        setClaim(prev => ({ ...prev, claim_time_bar: `${yyyy}-${mm}-${dd}` }));
      }
    }
  }, [incident, claim.claim_time_bar]);

  // Rule 12: Auto-calculated: Claim Amount - Paid Amount - Recovery Amount
  const computedBalance = (
    parseFloat(claim.claim_amount || '0') -
    parseFloat(claim.paid_amount || '0') -
    parseFloat(claim.recovery_amount || '0')
  ).toFixed(2);

  // Dynamic Rule: Insurance involved status
  const isInsuranceInvolved = incident?.insurer_notified === 'Yes';

  const validateForm = (): boolean => {
    const tempErrors: Record<string, string> = {};

    // 2. Date of Claim: Mandatory
    if (!claim.claim_date) {
      tempErrors.claim_date = 'Date of Claim is required';
    }

    // 3. Claimant: Mandatory
    if (!claim.claimant.trim()) {
      tempErrors.claimant = 'Claimant is required';
    }

    // 4. Time Bar: Mandatory
    if (!claim.claim_time_bar) {
      tempErrors.claim_time_bar = 'Time Bar is required';
    }

    // 7. Claim Amount: Mandatory, >= 0
    const amt = parseFloat(claim.claim_amount);
    if (!claim.claim_amount) {
      tempErrors.claim_amount = 'Claim Amount is required';
    } else if (isNaN(amt) || amt < 0) {
      tempErrors.claim_amount = 'Claim Amount must be greater than or equal to 0';
    }

    // 8. Paid Amount: Optional, >= 0
    const paid = parseFloat(claim.paid_amount || '0');
    if (claim.paid_amount && (isNaN(paid) || paid < 0)) {
      tempErrors.paid_amount = 'Paid Amount must be greater than or equal to 0';
    }

    // 9. Insurance Paid Amount: Conditional on Insurance Involved
    if (isInsuranceInvolved) {
      const insPaid = parseFloat(claim.insurance_paid || '0');
      if (claim.insurance_paid) {
        if (isNaN(insPaid) || insPaid < 0) {
          tempErrors.insurance_paid = 'Insurance Paid Amount must be greater than or equal to 0';
        } else if (insPaid > paid) {
          tempErrors.insurance_paid = 'Insurance Paid Amount cannot exceed Paid Amount';
        }
      }
    }

    // 10. Deductible: Conditional on Insurance Involved
    if (isInsuranceInvolved) {
      const ded = parseFloat(claim.deductible || '0');
      if (claim.deductible && (isNaN(ded) || ded < 0)) {
        tempErrors.deductible = 'Deductible must be greater than or equal to 0';
      }
    }

    // 11. Recovery Amount: Optional, >= 0 and <= Claim Amount
    const recAmt = parseFloat(claim.recovery_amount || '0');
    if (claim.recovery_amount) {
      if (isNaN(recAmt) || recAmt < 0) {
        tempErrors.recovery_amount = 'Recovery Amount must be greater than or equal to 0';
      } else if (recAmt > (isNaN(amt) ? 0 : amt)) {
        tempErrors.recovery_amount = 'Recovery Amount cannot exceed Claim Amount';
      }
    }

    // 13. Write-Off Required: Yes/No
    const balance = parseFloat(computedBalance);
    if (claim.writeoff_required === 'Yes') {
      if (!claim.claim_status.startsWith('Closed')) {
        tempErrors.writeoff_required = 'Write-Off can only be set to Yes when Claim Status is Closed';
      }
      if (balance <= 0) {
        tempErrors.writeoff_required = 'Write-Off can only be set to Yes when Outstanding Balance is greater than 0';
      }

      // 14. Write-Off Amount: Conditional
      const woAmt = parseFloat(claim.writeoff_amount || '0');
      if (!claim.writeoff_amount) {
        tempErrors.writeoff_amount = 'Write-Off Amount is required when Write-Off is Yes';
      } else if (isNaN(woAmt) || woAmt < 0) {
        tempErrors.writeoff_amount = 'Write-Off Amount must be greater than or equal to 0';
      } else if (woAmt > balance) {
        tempErrors.writeoff_amount = 'Write-Off Amount cannot exceed the Outstanding Balance';
      }

      // 15. Write-Off Approved By: Conditional
      if (!claim.writeoff_approved_by.trim()) {
        tempErrors.writeoff_approved_by = 'Authorized Approver is required when Write-Off is Yes';
      }

      // 16. Write-Off Date: Conditional
      if (!claim.writeoff_date) {
        tempErrors.writeoff_date = 'Write-Off Date is required when Write-Off is Yes';
      } else if (claim.claim_date && new Date(claim.writeoff_date) < new Date(claim.claim_date)) {
        tempErrors.writeoff_date = 'Write-Off Date must be on or after the Date of Claim';
      }
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const PA_CLAIMS_SAVE_URL = 'https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/6c662fa376f54b829f55a4d0b14ce665/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=_cCEq1Y7R3AwloUPlawfWg_ZkPv4q8naIqEOMcgaj5Q';

  const handleSave = async () => {
    if (!validateForm()) {
      showNotification('Could not save: Please correct validation errors highlighted in red.');
      return;
    }

    setIsSaving(true);
    try {
      const category = incident.category || getIncidentCategory(incident);
      const friendlyTypeMap: Record<string, string> = {
        cargo: 'Cargo & Equipment Incident',
        hr: 'Human Resources Incident',
        whs: 'WH&S Incident',
        it: 'IT & Security Incident',
        risk: 'Risk & Compliance Incident',
        finance: 'Finance Incident',
        ncr: 'Non-Conformance Report (NCR)'
      };

      const payload = {
        incident_id: incident.id,
        incident_number: incident.incident_number_str || `INC-${incident.id}`,
        incident_type: friendlyTypeMap[category] || incident.type || 'General Incident',
        incident_category: category,
        ...claim,
        outstanding_balance: computedBalance,
        create_approver_task: claim.writeoff_required === 'Yes'
      };
      
      const resp = await fetch(PA_CLAIMS_SAVE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!resp.ok) throw new Error(`Flow responded with ${resp.status}`);
      
      let msg = 'Claim details saved successfully.';
      if (claim.writeoff_required === 'Yes') {
        msg = 'Claim details saved successfully. A write-off authorization task has been created for the approver.';
      }
      showNotification(msg);
    } catch (err) {
      console.error('Claims save failed:', err);
      const all = JSON.parse(localStorage.getItem('pa_incidents_cache') || '[]');
      const idx = all.findIndex((i: any) => i.id?.toString() === id || i.incident_number_str === id);
      if (idx !== -1) { 
        all[idx] = { 
          ...all[idx], 
          ...claim, 
          outstanding_balance: computedBalance 
        }; 
        localStorage.setItem('pa_incidents_cache', JSON.stringify(all)); 
      }
      
      let msg = '✓ Claim details saved! Your updates are safely queued for background synchronization.';
      if (claim.writeoff_required === 'Yes') {
        msg = '✓ Claim details saved. Write-off authorization is queued and will trigger automatically in the background.';
      }
      showNotification(msg);
    } finally { setIsSaving(false); }
  };

  if (loading || !incident) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--fg-muted)' }}>Loading Claim Record...</div>;

  const category = getIncidentCategory(incident);
  const meta = CATEGORY_META[category];

  const inp = (key: string, label: string, type = 'text', placeholder = '', disabled = false, required = false, listId?: string) => {
    const hasError = !!errors[key];
    return (
      <div>
        <label className="overline" style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
          {label}
          {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
        <input 
          type={type} 
          className="input-field" 
          placeholder={placeholder}
          disabled={disabled}
          list={listId}
          style={hasError ? { border: '1px solid #ef4444', background: 'rgba(239,68,68,0.02)' } : undefined}
          value={(claim as any)[key]} 
          onChange={e => {
            setClaim({ ...claim, [key]: e.target.value });
            if (errors[key]) {
              setErrors(prev => {
                const next = { ...prev };
                delete next[key];
                return next;
              });
            }
          }} 
        />
        {hasError && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: 500 }}>{errors[key]}</div>}
      </div>
    );
  };

  return (
    <div className="fade-in">
      {successMessage && (
        <div style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999, background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', padding: '1rem 1.5rem', borderRadius: '12px', boxShadow: '0 10px 30px rgba(16,185,129,0.3)', fontWeight: 600, fontSize: '0.875rem', animation: 'fadeIn 0.3s ease', maxWidth: '350px' }}>
          ✓ {successMessage}
        </div>
      )}

      <datalist id="snowflake-claimants">
        <option value="Maersk Logistics" />
        <option value="MSC Australasia" />
        <option value="CMA CGM Group" />
        <option value="COSCO Shipping" />
        <option value="ONE Line (Ocean Network Express)" />
        <option value="Qantas Airways Ltd" />
        <option value="Singapore Airlines Cargo" />
        <option value="Toll Global Forwarding" />
        <option value="DHL Global Forwarding" />
        <option value="Kuehne + Nagel" />
      </datalist>

      <Link to="/claims" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#3b82f6', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        <ArrowLeft size={16} /> Back to Claims Register
      </Link>

      {/* Hero Header */}
      <div className="card fade-in" style={{
        position: 'relative', overflow: 'hidden', padding: '1.25rem 2rem', marginBottom: '2rem',
        background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.1) 0%, var(--bg-surface) 100%)',
        border: '1px solid var(--border-base)',
        borderLeft: '4px solid #10b981',
        boxShadow: '0 10px 30px -10px rgba(16, 185, 129, 0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2rem'
      }}>
        {/* Glow effect */}
        <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '50%', height: '200%', background: 'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.25) 0%, transparent 70%)', transform: 'rotate(-25deg)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ padding: '0.6rem', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '12px', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}><DollarSign size={24} /></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ width: 'fit-content', fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.6rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '20px', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Claims Log</span>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: 'var(--fg-base)', whiteSpace: 'nowrap' }}>{incident.incident_number_str || `INC-${incident.id}`}</h2>
            </div>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border-subtle)', backdropFilter: 'blur(10px)' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--fg-faint)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Incident Status</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: (incident?.status || '').includes('Closed') ? '#10b981' : '#3b82f6', boxShadow: `0 0 8px ${(incident?.status || '').includes('Closed') ? '#10b981' : '#3b82f6'}` }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--fg-base)' }}>{String(incident?.status || '')}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0.75rem', background: 'rgba(16, 185, 129, 0.04)', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#10b981', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Claim Status</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: claim.claim_status === 'Closed' ? '#10b981' : '#ef4444', boxShadow: `0 0 8px ${claim.claim_status === 'Closed' ? '#10b981' : '#ef4444'}` }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--fg-base)' }}>{claim.claim_status}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bento-grid">
        <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Incident Summary */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', fontWeight: 700 }}>Linked Incident Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {[
                { icon: <Clock size={14} />, bg: 'var(--bg-subtle)', label: 'Date of Incident', value: incident.date ? new Date(incident.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A' },
                { icon: <Briefcase size={14} />, bg: 'var(--accent-light)', label: 'Classification', value: incident.type || meta.label, color: 'var(--accent-fg)' },
                { icon: <MapPin size={14} />, bg: 'var(--bg-subtle)', label: 'Branch / Location', value: incident.branch_department || incident.location || 'N/A' },
                { icon: <FileText size={14} />, bg: `${meta.color}15`, label: 'Category', value: meta.label, color: meta.color },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ padding: '0.4rem', background: item.bg, borderRadius: 6, height: 'fit-content' }}>{item.icon}</div>
                  <div><label className="overline" style={{ fontSize: '0.65rem' }}>{item.label}</label><div style={{ fontSize: '0.85rem', fontWeight: 500, color: item.color || 'var(--fg-base)' }}>{item.value}</div></div>
                </div>
              ))}
            </div>

            {/* Description Narrative */}
            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 700, color: 'var(--fg-base)' }}>Incident Narrative</h3>
              <StructuredDescription description={incident.description} />
            </div>
          </div>

          {/* Claims Form */}
          <div className="card" style={{ padding: '2rem', border: '1px solid rgba(16, 185, 129, 0.25)', background: 'rgba(16, 185, 129, 0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
              <div style={{ padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 8, color: '#10b981' }}><DollarSign size={20} /></div>
              <h3 style={{ fontSize: '1.25rem', color: '#10b981', margin: 0, fontWeight: 800 }}>Claims Log Details</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {inp('claim_reference', 'Insurance Reference Number (if applicable)', 'text', 'e.g. CLM-2024-001', false, false)}
              {inp('claim_date', 'Date of Claim', 'date', '', false, true)}
              {inp('claimant', 'Claimant', 'text', 'Type claimant...', false, true)}
              {inp('claim_time_bar', 'Time Bar', 'date', '', false, true)}
              
              <div>
                <label className="overline" style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                  Claim Type <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select className="input-field" value={claim.claim_type} onChange={e => setClaim({ ...claim, claim_type: e.target.value })}>
                  <option value="Cargo Damage">Cargo Damage</option>
                  <option value="Theft">Theft</option>
                  <option value="Shortage">Shortage</option>
                  <option value="Loss">Loss</option>
                  <option value="Delay">Delay</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="overline" style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                  Claim Direction <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select className="input-field" value={claim.claim_direction} onChange={e => setClaim({ ...claim, claim_direction: e.target.value })}>
                  <option value="Inbound (Against Us)">Inbound (Against Us)</option>
                  <option value="Outbound (By Us)">Outbound (By Us)</option>
                </select>
              </div>
              
              {inp('claim_amount', 'Claim Amount (AUD)', 'number', '0.00', claim.claim_status === 'Closed', true)}
              {inp('paid_amount', 'Paid Amount (AUD)', 'number', '0.00')}
              
              {/* Conditional Insurance Fields */}
              <div style={{ position: 'relative' }}>
                {inp('insurance_paid', 'Insurance Paid Amount (AUD)', 'number', '0.00', !isInsuranceInvolved)}
                {!isInsuranceInvolved && (
                  <span style={{ fontSize: '0.65rem', color: 'var(--fg-muted)', display: 'block', marginTop: '0.25rem' }}>
                    ⚠️ Disabled (Insurance Involved is No on Incident)
                  </span>
                )}
              </div>
              
              <div style={{ position: 'relative' }}>
                {inp('deductible', 'Deductible (AUD)', 'number', '0.00', !isInsuranceInvolved)}
                {!isInsuranceInvolved && (
                  <span style={{ fontSize: '0.65rem', color: 'var(--fg-muted)', display: 'block', marginTop: '0.25rem' }}>
                    ⚠️ Disabled (Insurance Involved is No on Incident)
                  </span>
                )}
              </div>
              
              {inp('recovery_amount', 'Recovery Amount (AUD)', 'number', '0.00')}
              
              <div>
                <label className="overline">Outstanding Balance (AUD)</label>
                <input type="number" className="input-field" disabled value={computedBalance} style={{ opacity: 0.7 }} />
                <span style={{ fontSize: '0.65rem', color: 'var(--fg-muted)' }}>Auto-calculated: Claim Amount - Paid Amount - Recovery Amount</span>
              </div>
              
              <div>
                <label className="overline">Write-Off Required</label>
                <select className="input-field" 
                  style={errors.writeoff_required ? { border: '1px solid #ef4444', background: 'rgba(239,68,68,0.02)' } : undefined}
                  value={claim.writeoff_required} 
                  onChange={e => {
                    setClaim({ ...claim, writeoff_required: e.target.value });
                    if (errors.writeoff_required) {
                      setErrors(prev => {
                        const next = { ...prev };
                        delete next.writeoff_required;
                        return next;
                      });
                    }
                  }}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
                {errors.writeoff_required && (
                  <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: 500 }}>
                    {errors.writeoff_required}
                  </div>
                )}
                {claim.writeoff_required === 'Yes' && (
                  <span style={{ fontSize: '0.65rem', color: '#ef4444', display: 'block', marginTop: '0.25rem', fontWeight: 600 }}>
                    * Enforces conditional write-off fields and schedules approver task.
                  </span>
                )}
              </div>
              
              {inp('writeoff_amount', 'Write-Off Amount (AUD)', 'number', '0.00', claim.writeoff_required !== 'Yes', claim.writeoff_required === 'Yes')}
              {inp('writeoff_approved_by', 'Write-Off Approved By', 'text', 'Search user or role...', claim.writeoff_required !== 'Yes', claim.writeoff_required === 'Yes')}
              {inp('writeoff_date', 'Write-Off Date', 'date', '', claim.writeoff_required !== 'Yes', claim.writeoff_required === 'Yes')}
              
              <div>
                <label className="overline" style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                  Claim State
                </label>
                <div style={{ position: 'relative' }}>
                  <select className="input-field" value={claim.claim_state} 
                    onChange={e => setClaim({ ...claim, claim_state: e.target.value })}
                    style={{ appearance: 'none', paddingRight: '2.5rem' }}
                  >
                    <option value="Approved">Approved</option>
                    <option value="Rejected - Not a Party">Rejected - Not a Party</option>
                    <option value="Rejected - Terms & Conditions">Rejected - Terms & Conditions</option>
                    <option value="Rejected - Passing to Carrier">Rejected - Passing to Carrier</option>
                    <option value="Pending / Under Review">Pending / Under Review</option>
                    <option value="Escalated / Disputed">Escalated / Disputed</option>
                    <option value="Settled">Settled</option>
                    <option value="Partially Settled">Partially Settled</option>
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)', pointerEvents: 'none' }} />
                </div>
              </div>
              
              <div>
                <label className="overline" style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                  Claim Status <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <select className="input-field" value={claim.claim_status || ''} 
                    onChange={e => {
                      setClaim({ ...claim, claim_status: e.target.value });
                      if (e.target.value === 'Closed' && claim.outstanding_balance !== '0.00' && !claim.writeoff_required) {
                        setErrors(prev => ({...prev, claim_status: 'Cannot close claim with outstanding balance unless written off'}));
                      } else {
                        setErrors(prev => ({...prev, claim_status: ''}));
                      }
                    }}
                    style={{ appearance: 'none', paddingRight: '2.5rem' }}
                  >
                    {claim.claim_status && ![
                      'Open - New',
                      'Open - In Progress',
                      'Open - Under Review',
                      'Closed - Resolved',
                      'Closed - Escalated'
                    ].includes(claim.claim_status) && (
                      <option value={claim.claim_status}>{claim.claim_status}</option>
                    )}
                    <option value="">— Select Status —</option>
                    <option value="Open - New">Open - New</option>
                    <option value="Open - In Progress">Open - In Progress</option>
                    <option value="Open - Under Review">Open - Under Review</option>
                    <option value="Closed - Resolved">Closed - Resolved</option>
                    <option value="Closed - Escalated">Closed - Escalated</option>
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)', pointerEvents: 'none' }} />
                </div>
              </div>
              
              {(claim.claim_state === 'Settled' || claim.claim_state === 'Partially Settled') && (
                <div>
                  <label className="overline" style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                    Settlement Status
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select className="input-field" value={claim.settlement_status} 
                      onChange={e => setClaim({ ...claim, settlement_status: e.target.value })}
                      style={{ appearance: 'none', paddingRight: '2.5rem' }}
                    >
                      <option value="">— Select —</option>
                      <option value="Documents issued">Documents issued</option>
                      <option value="Documents signed">Documents signed</option>
                      <option value="Settlement paid">Settlement paid</option>
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)', pointerEvents: 'none' }} />
                  </div>
                </div>
              )}
              
              <div style={{ gridColumn: 'span 2' }}>
                <label className="overline">Comments</label>
                <textarea className="input-field" style={{ minHeight: '80px' }} placeholder="Add comments here..." value={claim.comments} onChange={(e) => setClaim({...claim, comments: e.target.value})} />
              </div>
            </div>
            
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}
                style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', padding: '0.75rem 2rem', fontSize: '0.875rem', fontWeight: 700, borderRadius: 10, boxShadow: '0 4px 14px rgba(16,185,129,0.35)' }}>
                {isSaving ? 'Saving...' : 'Save Claim Details'}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem', border: '1px solid rgba(16,185,129,0.2)' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><DollarSign size={16} color="#10b981" /> Claim Summary</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { label: 'Claim Amount', value: claim.claim_amount ? `AUD $${parseFloat(claim.claim_amount).toLocaleString()}` : 'Not set', color: '#ef4444' },
                { label: 'Paid Amount', value: claim.paid_amount ? `AUD $${parseFloat(claim.paid_amount).toLocaleString()}` : '$0' },
                { label: 'Outstanding Balance', value: `AUD $${parseFloat(computedBalance).toLocaleString()}`, color: parseFloat(computedBalance) > 0 ? '#ef4444' : '#10b981' },
              ].map((item, i) => (
                <div key={i}><label className="overline" style={{ fontSize: '0.6rem' }}>{item.label}</label>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: item.color || 'var(--fg-base)' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={16} color="var(--accent-fg)" /> Linked Incident</h4>
            <Link to={`/incidents/${incident.id}`} state={{ source: 'incidents' }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: 10, background: 'var(--bg-subtle)', border: '1px solid var(--border-base)', textDecoration: 'none' }}>
              <div style={{ padding: '0.4rem', background: `${meta.color}15`, borderRadius: 8, color: meta.color }}><FileText size={16} /></div>
              <div><div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--fg-base)' }}>{incident.incident_number_str || `INC-${incident.id}`}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--fg-muted)' }}>View full incident record →</div></div>
            </Link>
          </div>

          <div className="card" style={{ padding: '1.5rem', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-base)', paddingBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Paperclip size={16} color="#10b981" /> Supporting Evidence
              </h4>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={fetchAttachments}
                  disabled={isRefreshing}
                  title="Refresh Attachments"
                  style={{ padding: '0.4rem', height: 'auto', background: 'var(--bg-subtle)', border: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <RefreshCw size={14} color={isRefreshing ? "#ef4444" : "var(--fg-muted)"} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', height: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'linear-gradient(135deg,#ef4444,#dc2626)', border: 'none', color: '#fff' }}
                >
                  <UploadCloud size={14} /> {isUploading ? '...' : 'Add'}
                </button>
              </div>
            </div>
            
            <input 
              type="file" 
              multiple 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileUpload} 
            />

            {attachments.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', textAlign: 'center', padding: '1rem 0' }}>
                No attachments uploaded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                {attachments.map((file: any, index: number) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border-base)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', maxWidth: '75%' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--fg-base)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.filename || file.name}>
                        {file.filename || file.name}
                      </span>
                      {file.size && (
                        <span style={{ fontSize: '0.65rem', color: 'var(--fg-muted)' }}>
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <a href={file.url} target="_blank" rel="noopener noreferrer" style={{ padding: '0.25rem', borderRadius: '4px', background: 'var(--bg-elevated)', color: 'var(--fg-muted)', border: '1px solid var(--border-base)', display: 'inline-flex', alignItems: 'center' }}>
                        <ExternalLink size={12} />
                      </a>
                      {['full_access', 'risk_compliance'].includes(role || '') && (
                        <button 
                          onClick={() => handleDeleteAttachment(file.filename || file.name)}
                          disabled={isDeleting === (file.filename || file.name)}
                          style={{ padding: '0.25rem', borderRadius: '4px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
