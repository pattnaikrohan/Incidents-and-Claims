import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Clock, MapPin, Briefcase, UserPlus, ChevronDown, ChevronRight, Shield, AlertTriangle } from 'lucide-react';
import CollaborationFeed from '../components/CollaborationFeed';
import { api } from '../services/api';
import { useState, useEffect } from 'react';

export default function IncidentDetails() {
  const { id } = useParams();
  const [incident, setIncident] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [isUpdatingLiability, setIsUpdatingLiability] = useState(false);
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
      // In a real app we fetch by ID, using mock logic for now if needed or actual API
      const response = await api.get(`/incidents/${id}`);
      setIncident(response.data);
      if (response.data) {
         setLiability(prev => ({
            ...prev,
            responsible_party: response.data.responsible_party || '',
            risk_level: response.data.cor_risk_level || '',
            cor: response.data.cor_required || '',
            status: response.data.status || 'Open - Incident Logged'
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
      await api.put(`/incidents/${id}/liability`, liability);
      await fetchIncident(); // Refresh to pull new notes/status
      alert('Liability updated successfully. Triggers processed.');
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

  const handleResolve = async () => {
    try {
      await api.put(`/incidents/${id}/status`, { status: 'Resolved' });
      await fetchIncident();
    } catch (error) {
      console.error('Resolution failed:', error);
    }
  };

  if (loading) return <div className="fade-in" style={{ padding: '4rem', textAlign: 'center' }}>Loading incident data...</div>;
  if (!incident) return <div className="fade-in" style={{ padding: '4rem', textAlign: 'center' }}>Incident not found.</div>;

  return (
    <div className="fade-in">
      <Link to="/incidents" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--fg-muted)', textDecoration: 'none', marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
        <ArrowLeft size={16} /> Back to incidents
      </Link>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border-base)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.25rem' }}>
            <h2 className="page-title" style={{ marginBottom: 0 }}>{incident.incident_number_str || `INC-${incident.id}`}</h2>
            <span className={`badge badge-${incident.status.toLowerCase().replace(' ', '-')}`} style={{ marginTop: '0.25rem' }}>
              {incident.status}
            </span>
          </div>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>{incident.description.substring(0, 100)}...</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
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
          <button className="btn btn-primary" onClick={handleResolve} disabled={incident.status === 'Resolved'}>
            Resolve Incident
          </button>
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
                  {new Date(incident.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ padding: '0.5rem', background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)', height: 'fit-content' }}>
                <Briefcase size={16} style={{ color: 'var(--accent-fg)' }} />
              </div>
              <div>
                <label className="overline">CargoWise Ref</label>
                <div style={{ fontSize: '0.875rem', color: 'var(--accent-fg)', fontWeight: 500 }}>{incident.job_number}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ padding: '0.5rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', height: 'fit-content' }}>
                <MapPin size={16} style={{ color: 'var(--fg-muted)' }} />
              </div>
              <div>
                <label className="overline">Location</label>
                <div style={{ fontSize: '0.875rem', color: 'var(--fg-base)', fontWeight: 500 }}>{incident.location}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ padding: '0.5rem', background: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)', height: 'fit-content' }}>
                <FileText size={16} style={{ color: 'var(--danger-fg)' }} />
              </div>
              <div>
                <label className="overline">Classification</label>
                <div style={{ fontSize: '0.875rem', color: 'var(--fg-base)', fontWeight: 500 }}>Cargo Damage</div>
              </div>
            </div>
          </div>
          
          <div style={{ borderTop: '1px solid var(--border-base)', paddingTop: '2rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Description</h4>
            <div style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--fg-muted)', background: 'var(--bg-subtle)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-base)' }}>
              {incident.description}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-base)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
            <button onClick={() => setShowOriginal(!showOriginal)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', color: 'var(--accent-fg)', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
              {showOriginal ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
              View Original Submission Data
            </button>
            {showOriginal && (
              <div className="fade-in" style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1.5rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-base)' }}>
                {Object.entries(incident)
                  .filter(([k, v]) => v !== null && v !== '' && !['id', 'description', 'status', 'location', 'type', 'date', 'assigned_to_id', 'branch_id', 'creator_id'].includes(k))
                  .map(([k, v]) => (
                  <div key={k}>
                    <span className="overline">{k.replace(/_/g, ' ')}</span>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--fg-base)' }}>{String(v)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>

          {/* Risk & Compliance Team Liability Form */}
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
                  <option value="Under Review">Under Review</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
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
                <button className="btn btn-primary" style={{ background: '#ef4444' }}>Save Claim Details</button>
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
                <button className="btn btn-primary" style={{ background: '#f59e0b', color: '#fff' }}>Save CoR Details</button>
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
                <button className="btn btn-primary" style={{ background: '#3b82f6' }}>Send Email Notification</button>
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
                <button className="btn btn-primary" style={{ background: '#8b5cf6' }}>Trigger Exec Workflow</button>
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
