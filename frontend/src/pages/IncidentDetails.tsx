import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Clock, MapPin, Briefcase, UserPlus, ChevronDown, ChevronRight, Shield, AlertTriangle, FileWarning, Users, HeartPulse, Lock as LockIcon, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CollaborationFeed from '../components/CollaborationFeed';
import { api } from '../services/api';
import { useState, useEffect } from 'react';

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
  const { role } = useAuth();
  const [incident, setIncident] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [isUpdatingLiability, setIsUpdatingLiability] = useState(false);
  const [isUpdatingDept, setIsUpdatingDept] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setSuccessMessage(null), 3000);
  };
  const [liability, setLiability] = useState({
    responsible_party: '',
    formal_claim_issued: '',
    insurer_notified: '',
    risk_level: '',
    management_escalation: '',
    cor: '',
    status: 'Open - Incident Logged'
  });

  const fetchIncident = async () => {
    try {
      let finalIncident: any = null;

      // 1. Check local cache (usually contains Dataverse skeleton data)
      const saved = localStorage.getItem('incidents_cache');
      if (saved) {
        const cached = JSON.parse(saved);
        finalIncident = cached.find((i: any) => String(i.id) === String(id));
      }

      // 2. Fetch latest metadata from backend (Investigation findings, Liability, etc.)
      try {
        const response = await api.get(`/incidents/${id}`);
        const backendData = response.data;
        
        if (backendData) {
          if (finalIncident) {
            // Enrich Dataverse record with backend metadata
            finalIncident = { ...finalIncident, ...backendData };
          } else {
            finalIncident = backendData;
          }
        }
      } catch (err) {
        console.warn('Backend fetch failed, using cache only:', err);
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
          status: finalIncident.status || 'Open - Incident Logged'
        }));
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
      const payload: any = { ...liability };
      
      if (category === 'cargo') {
        payload.dept_section_updated = true;
      }

      await api.patch(`/incidents/${id}`, payload);
      
      // Synchronize with local cache
      const saved = localStorage.getItem('incidents_cache');
      if (saved) {
        const cached = JSON.parse(saved);
        const idx = cached.findIndex((i: any) => String(i.id) === String(id));
        if (idx !== -1) {
          cached[idx] = { ...cached[idx], ...payload };
          localStorage.setItem('incidents_cache', JSON.stringify(cached));
        }
      }

      setIncident((prev: any) => ({ ...prev, ...payload }));
      showNotification('Liability details updated successfully.');
    } catch (error) {
      console.error('Failed to update liability:', error);
      alert('Error updating liability details.');
    } finally {
      setIsUpdatingLiability(false);
    }
  };

  useEffect(() => {
    fetchIncident();
  }, [id]);

  const handleAssign = async (userId: number, name: string) => {
    try {
      setIsAssigning(true);
      await api.patch(`/incidents/${id}/assign`, {
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
          updatedIncident[field] = userEmail || role;
        }
      });

      // Mark as updated so the "Awaiting" badge disappears
      const payload = { ...updatedIncident, dept_section_updated: true };
      // 2. Persist to backend database
      await api.patch(`/incidents/${id}`, payload);

      // 3. Synchronize with local cache if this is a Dataverse record
      const saved = localStorage.getItem('incidents_cache');
      if (saved) {
        const cached = JSON.parse(saved);
        const idx = cached.findIndex((i: any) => String(i.id) === String(id));
        if (idx !== -1) {
          cached[idx] = { ...cached[idx], ...payload };
          localStorage.setItem('incidents_cache', JSON.stringify(cached));
        }
      }

      setIncident(payload);
      showNotification('Investigation details updated successfully.');
    } catch (error) {
      console.error('Update failed:', error);
      alert('Failed to update investigation details.');
    } finally {
      setIsUpdatingDept(false);
    }
  };

  if (loading) return <div className="fade-in" style={{ padding: '4rem', textAlign: 'center' }}>Loading incident data...</div>;
  if (!incident) return <div className="fade-in" style={{ padding: '4rem', textAlign: 'center' }}>Incident not found.</div>;

  const renderOriginalForm = () => {
    const category = getIncidentCategory(incident);
    
    switch (category) {
      case 'cargo': return <CargoForm initialData={incident} readOnly={true} />;
      case 'hr': return <HRForm initialData={incident} readOnly={true} />;
      case 'whs': return <WHSForm initialData={incident} readOnly={true} />;
      case 'it': return <ITForm initialData={incident} readOnly={true} />;
      case 'risk': return <RiskForm initialData={incident} readOnly={true} />;
      case 'finance': return <FinanceForm initialData={incident} readOnly={true} />;
      case 'ncr': return <NCRForm initialData={incident} readOnly={true} />;
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

  return (
    <div className="fade-in">
      <Link to="/incidents" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--fg-muted)', textDecoration: 'none', marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
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
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border-base)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.25rem' }}>
            <h2 className="page-title" style={{ marginBottom: 0 }}>{incident.incident_number_str || `INC-${incident.id}`}</h2>
            <span className={`badge badge-${incident.status.toLowerCase().replace(' ', '-')}`} style={{ marginTop: '0.25rem' }}>
              {incident.status}
            </span>
          </div>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            {(incident.description || 'No description provided').substring(0, 100)}...
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <div className="dropdown" style={{ position: 'relative' }}>
             <button 
               className="btn btn-secondary" 
               onClick={() => {
                 const userId = prompt("Enter User ID to assign to (e.g., 2):");
                 if (userId) handleAssign(parseInt(userId), "Selected User");
               }}
               disabled={isAssigning}
             >
               <UserPlus size={16} /> {isAssigning ? 'Assigning...' : 'Assign to Handler'}
             </button>
          </div>

          {/* Status Display & Update */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--fg-faint)', textTransform: 'uppercase' }}>Current Status:</span>
              <span className={`badge badge-${incident.status?.includes('Closed') ? 'closed' : incident.status?.includes('Open') ? 'open' : 'review'}`} style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}>
                {incident.status || 'Open - Incident Logged'}
              </span>
            </div>
            {['full_access', 'risk_compliance'].includes(role || '') && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select 
                  className="input-field" 
                  value={liability.status} 
                  onChange={(e) => setLiability({...liability, status: e.target.value})}
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem', height: '32px', minWidth: '200px' }}
                >
                  <option value="Open - Incident Logged">Open - Incident Logged</option>
                  <option value="Open - Under Investigation">Open - Under Investigation</option>
                  <option value="Open - Corrective Action Pending">Open - Corrective Action Pending</option>
                  <option value="Open - Formal Claim">Open - Formal Claim</option>
                  <option value="Closed - No Further Action">Closed - No Further Action</option>
                </select>
                <button 
                  className="btn btn-primary" 
                  onClick={async () => {
                    try {
                      await api.put(`/incidents/${id}/status`, { status: liability.status });
                      await fetchIncident();
                      alert('Status updated successfully.');
                    } catch (err) {
                      // Fallback: update localStorage cache
                      try {
                        const saved = localStorage.getItem('incidents_cache');
                        if (saved) {
                          const cached = JSON.parse(saved);
                          const idx = cached.findIndex((i: any) => String(i.id) === String(id));
                          if (idx !== -1) {
                            cached[idx].status = liability.status;
                            localStorage.setItem('incidents_cache', JSON.stringify(cached));
                            await fetchIncident();
                            alert('Status updated (local cache).');
                            return;
                          }
                        }
                      } catch (e) {}
                      alert('Failed to update status.');
                    }
                  }}
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem', height: '32px' }}
                >
                  Update
                </button>
              </div>
            )}
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

          <button 
            onClick={() => setShowOriginal(!showOriginal)} 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: '#3b82f6', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', padding: 0 }}
          >
            {showOriginal ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            {showOriginal ? 'Hide Original Submission Data' : 'View Original Submission Data'}
          </button>

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
                          onClick={handleDeptUpdate}
                          disabled={isUpdatingDept}
                        >
                          {isUpdatingDept ? 'Saving...' : 'Save Confidential Notes'}
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
            <h3 style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>Risk & Compliance Team Liability</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label className="overline">Responsible Party</label>
                <select className="input-field" value={liability.responsible_party} onChange={(e) => setLiability({...liability, responsible_party: e.target.value})}>
                  <option value="">— Select —</option>
                  <option value="Origin Agent">Origin Agent</option>
                  <option value="Destination Agent">Destination Agent</option>
                  <option value="Shipping Line / Airline">Shipping Line / Airline</option>
                  <option value="Coloader">Coloader</option>
                  <option value="Customer">Customer</option>
                  <option value="Company">Company</option>
                  <option value="Transport Company">Transport Company</option>
                </select>
              </div>
              <div>
                <label className="overline">Formal Claim Issued</label>
                <select className="input-field" value={liability.formal_claim_issued} onChange={(e) => setLiability({...liability, formal_claim_issued: e.target.value})}>
                  <option value="">— Select —</option>
                  <option value="Yes">Yes (* creates Claims Log)</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label className="overline">Insurer Notified</label>
                <select className="input-field" value={liability.insurer_notified} onChange={(e) => setLiability({...liability, insurer_notified: e.target.value})}>
                  <option value="">— Select —</option>
                  <option value="Yes">Yes (* creates Insurers Notification Template)</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label className="overline">Risk Level</label>
                <select className="input-field" value={liability.risk_level} onChange={(e) => setLiability({...liability, risk_level: e.target.value})}>
                  <option value="">— Select —</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div>
                <label className="overline">Management Escalation</label>
                <select className="input-field" value={liability.management_escalation} onChange={(e) => setLiability({...liability, management_escalation: e.target.value})}>
                  <option value="">— Select —</option>
                  <option value="Yes">Yes (* creates Management Notification Template)</option>
                  <option value="No">No</option>
                  <option value="Not Applicable">Not Applicable</option>
                </select>
              </div>
              <div>
                <label className="overline">COR</label>
                <select className="input-field" value={liability.cor} onChange={(e) => setLiability({...liability, cor: e.target.value})}>
                  <option value="">— Select —</option>
                  <option value="Yes">Yes (* creates CoR Log)</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="overline">Incident Status</label>
                <select className="input-field" value={liability.status} onChange={(e) => setLiability({...liability, status: e.target.value})}>
                  <option value="Open - Incident Logged">Open - Incident Logged</option>
                  <option value="Open - Under Investigation">Open - Under Investigation</option>
                  <option value="Open - Corrective Action Pending">Open - Corrective Action Pending</option>
                  <option value="Open - Formal Claim">Open - Formal Claim</option>
                  <option value="Closed - No Further Action">Closed - No Further Action</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-primary" 
                onClick={handleLiabilityUpdate}
                disabled={isUpdatingLiability}
              >
                {isUpdatingLiability ? 'Updating...' : 'Update Liability'}
              </button>
            </div>
          </div>
          )}

          {/* Dynamic Claims Log Form */}
          {liability.formal_claim_issued === 'Yes' && (
            <div className="card fade-in" style={{ padding: '2rem', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', color: '#ef4444' }}><FileText size={20}/></div>
                <h3 style={{ fontSize: '1.25rem', color: '#ef4444', margin: 0 }}>Claims Log Details</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div><label className="overline">Claim Reference Number</label><input type="text" className="input-field" placeholder="e.g. CLM-2024-001" /></div>
                <div><label className="overline">Date of Claim</label><input type="date" className="input-field" /></div>
                <div><label className="overline">Claimant</label><input type="text" className="input-field" placeholder="Search claimant..." /></div>
                <div><label className="overline">Time Bar</label><input type="date" className="input-field" disabled value="2025-05-14" style={{opacity:0.7}} /></div>
                
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
                <div><label className="overline">Insurance Paid Amount (AUD)</label><input type="number" className="input-field" /></div>
                <div><label className="overline">Deductible (AUD)</label><input type="number" className="input-field" /></div>
                <div><label className="overline">Recovery Amount (AUD)</label><input type="number" className="input-field" /></div>
                <div><label className="overline">Outstanding Balance (AUD)</label><input type="number" className="input-field" disabled value="0" style={{opacity:0.7}} /></div>
                
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
          {liability.cor === 'Yes' && (
            <div className="card fade-in" style={{ padding: '2rem', border: '1px solid rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', color: '#f59e0b' }}><FileText size={20}/></div>
                <h3 style={{ fontSize: '1.25rem', color: '#f59e0b', margin: 0 }}>Chain of Responsibility (CoR) Log</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div><label className="overline">CoR Type</label><input type="text" className="input-field" placeholder="e.g. Mass, Dimension, Load Restraint" /></div>
                <div><label className="overline">Company's Role</label><input type="text" className="input-field" placeholder="e.g. Consignor, Packer, Loader" /></div>
                <div>
                  <label className="overline">CoR Risk Level</label>
                  <select className="input-field"><option>Low</option><option>Medium</option><option>High</option><option>Severe</option></select>
                </div>
                <div>
                  <label className="overline">CoR Incident Status</label>
                  <select className="input-field"><option>Open</option><option>Closed</option></select>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="overline">CoR Assessment</label>
                  <textarea className="input-field" style={{ minHeight: '80px' }} placeholder="Detailed assessment of CoR breach..." />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="overline">CoR Corrective Action</label>
                  <textarea className="input-field" style={{ minHeight: '80px' }} placeholder="Actions taken to rectify the CoR breach..." />
                </div>
                <div>
                  <label className="overline">CoR Corrective Action Implemented?</label>
                  <select className="input-field"><option>No</option><option>Yes</option></select>
                </div>
              </div>
              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ background: '#f59e0b', color: '#fff' }} 
                  onClick={handleDeptUpdate}
                  disabled={isUpdatingDept}
                >
                  {isUpdatingDept ? 'Saving...' : 'Save CoR Details'}
                </button>
              </div>
            </div>
          )}

          {/* Dynamic Insurer Notification Template */}
          {liability.insurer_notified === 'Yes' && (
            <div className="card fade-in" style={{ padding: '2rem', border: '1px solid rgba(59, 130, 246, 0.3)', background: 'rgba(59, 130, 246, 0.02)', marginTop: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', color: '#3b82f6' }}><Shield size={20}/></div>
                <h3 style={{ fontSize: '1.25rem', color: '#3b82f6', margin: 0 }}>Insurer Notification Template</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                <div style={{ padding: '1rem', background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 'var(--radius-md)' }}>
                   <p style={{ fontSize: '0.875rem', color: 'var(--fg-muted)', marginBottom: '1rem' }}>
                     <strong>To:</strong> claims@insurer.com<br/>
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
          {liability.management_escalation === 'Yes' && (
            <div className="card fade-in" style={{ padding: '2rem', border: '1px solid rgba(139, 92, 246, 0.3)', background: 'rgba(139, 92, 246, 0.02)', marginTop: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px', color: '#8b5cf6' }}><AlertTriangle size={20}/></div>
                <h3 style={{ fontSize: '1.25rem', color: '#8b5cf6', margin: 0 }}>Management Escalation Template</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                <div style={{ padding: '1rem', background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 'var(--radius-md)' }}>
                   <p style={{ fontSize: '0.875rem', color: 'var(--fg-muted)', marginBottom: '1rem' }}>
                     <strong>To:</strong> executive.team@aaw.com<br/>
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
                <div style={{ padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', color: '#10b981' }}><FileWarning size={20}/></div>
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
                <div style={{ padding: '0.5rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px', color: '#8b5cf6' }}><Shield size={20}/></div>
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
                  <select className="input-field">
                    <option>Open - Pending Assessment</option>
                    <option>In Progress - Implementing CA/PA</option>
                    <option>Pending QA Validation</option>
                    <option>Closed</option>
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
          
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>Attachments</h3>
            <div style={{ fontSize: '0.875rem', color: 'var(--fg-muted)', textAlign: 'center', padding: '1rem 0' }}>
              No attachments uploaded.
            </div>
          </div>

          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <CollaborationFeed incidentId={incident.id} />
          </div>

        </div>
      </div>
    </div>
  );
}
