import { useState, useEffect, useRef } from 'react';
import { FileText, Filter, Briefcase, AlertTriangle, Shield, Users, RefreshCw, ChevronDown, ChevronUp, Package, HeartPulse, Lock, DollarSign, FileWarning } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { INCIDENT_STATUSES } from '../utils/incidentConstants';

import { useAuth } from '../context/AuthContext';
import { useIncidents } from '../hooks/useIncidents';

export default function Incidents() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const pageSource = currentPath.includes('/claims') ? 'claims' : 
                     currentPath.includes('/cors') ? 'cors' : 
                     currentPath.includes('/insurers') ? 'insurers' :
                     currentPath.includes('/escalations') ? 'escalations' :
                     currentPath.includes('/ncrs') ? 'ncrs' : 'incidents';
  const [activeTab, setActiveTab] = useState('active');
  const { role, branchName, businessUnit } = useAuth();
  const { incidents, loading, isRefreshing, handleManualRefresh } = useIncidents(2000);
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
  const filterMenuRef = useRef<HTMLDivElement>(null);

  // Global Filter State
  const [globalFilter, setGlobalFilter] = useState({ bu: '', branch: '' });
  const [globalFilterMenuOpen, setGlobalFilterMenuOpen] = useState(false);
  const globalFilterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setActiveFilterMenu(null);
      }
      if (globalFilterRef.current && !globalFilterRef.current.contains(event.target as Node)) {
        setGlobalFilterMenuOpen(false);
      }
    }
    if (activeFilterMenu || globalFilterMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [activeFilterMenu]);

  const INCIDENT_TYPES = [
    { id: 'cargo', label: 'Cargo & Equipment', icon: Package, color: '#f59e0b', desc: 'Cargo damage, theft, equipment failure', columns: ['Reference', 'Job Number', 'Classification', 'Jurisdiction', 'Customer', 'Lodged Date', 'Status', 'Exposure'] },
    { id: 'hr', label: 'Human Resources', icon: Users, color: '#8b5cf6', desc: 'Workplace conduct & HR matters', columns: ['Reference', 'Matter Type', 'Employee', 'Branch / Dept', 'Lodged Date', 'Status'] },
    { id: 'whs', label: 'WH&S Incident', icon: HeartPulse, color: '#ef4444', desc: 'Workplace health, safety & injuries', columns: ['Reference', 'Injury / Incident', 'Location', 'Branch / Dept', 'Lodged Date', 'Status'] },
    { id: 'it', label: 'IT & Security', icon: Lock, color: '#06b6d4', desc: 'Cyber, data breach & system issues', columns: ['Reference', 'Issue Type', 'System', 'Branch / Dept', 'Lodged Date', 'Status'] },
    { id: 'risk', label: 'Risk & Compliance', icon: Shield, color: '#10b981', desc: 'Regulatory breaches & compliance', columns: ['Reference', 'Breach Type', 'Regulatory Body', 'Branch / Dept', 'Lodged Date', 'Status'] },
    { id: 'finance', label: 'Finance', icon: DollarSign, color: '#3b82f6', desc: 'Financial incidents & travel disruption', columns: ['Reference', 'Financial Incident', 'Branch / Dept', 'Reported Date', 'Status'] },
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

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center' }}>Synchronizing Digital Twin Register...</div>;

  let displayedIncidents = incidents;
  
  // ── Fuzzy matching helpers ──────────────────────────────────
  // Dataverse may abbreviate branch names (e.g., "AAW Global - MEL" vs "AAW Global Logistics - Melbourne")
  const BRANCH_KEYWORDS: Record<string, string[]> = {
    'AAW Global Logistics - Melbourne': ['melbourne', 'mel', 'aaw global - mel'],
    'AAW Global Logistics - Sydney': ['sydney', 'syd', 'aaw global - syd'],
    'AAW Global Logistics - Brisbane': ['brisbane', 'bne', 'aaw global - bne'],
    'AAW Global Logistics - Adelaide': ['adelaide', 'adl', 'aaw global - adl'],
    'AAW Global Logistics - Fremantle': ['fremantle', 'fre', 'aaw global - fre'],
    'AAW Customs Brokerage': ['customs', 'brokerage', 'aaw brokerage'],
    'AAW Project Logistics': ['project logistics', 'aaw project'],
    'AAW Global Logistics - Auckland': ['auckland', 'akl', 'aaw global - akl'],
    'AAW Bulk Liquid Logistics Team': ['bulk liquid', 'bll', 'aaw bll'],
    'Coastalbridge': ['coastalbridge'],
    'Coastalbridge Agencies': ['coastalbridge agencies'],
    'PIL Logistics Australia': ['pil', 'pilla'],
    'Regional Shipping Services': ['rss', 'regional shipping'],
    'Hoyer Logistics Australia': ['hoyer', 'hla'],
    'ILM': ['ilm', 'international logistics'],
    'IT & Security': ['it & security', 'it and security'],
    'Finance': ['finance'],
    'Risk & Compliance': ['risk & compliance', 'risk and compliance'],
    'People & Safety': ['people & safety', 'people and safety'],
  };

  const matchesBranch = (incidentBranch: string, userBranch: string): boolean => {
    if (!incidentBranch || !userBranch) return false;
    const a = incidentBranch.toLowerCase().trim();
    const b = userBranch.toLowerCase().trim();
    // Exact match
    if (a === b) return true;
    // Partial contains (either direction)
    if (a.includes(b) || b.includes(a)) return true;
    // Keyword match
    const keywords = BRANCH_KEYWORDS[userBranch] || [];
    return keywords.some(kw => a.includes(kw) || a === kw);
  };

  const matchesBU = (incidentBU: string, incidentBranch: string, userBU: string): boolean => {
    if (!userBU) return false;
    const bu = userBU.toLowerCase().trim();
    // Direct BU match
    if (incidentBU && incidentBU.toLowerCase().trim() === bu) return true;
    if (incidentBU && (incidentBU.toLowerCase().includes(bu) || bu.includes(incidentBU.toLowerCase()))) return true;
    // Check if the incident's branch belongs to this BU via keyword mapping
    if (incidentBranch) {
      for (const [fullBranch] of Object.entries(BRANCH_KEYWORDS)) {
        const branchBU = Object.entries({
          'AAW Group Holdings': ['IT & Security', 'Finance', 'Risk & Compliance', 'People & Safety'],
          'AAW Global Logistics - AU': ['AAW Global Logistics - Melbourne', 'AAW Global Logistics - Sydney', 'AAW Global Logistics - Brisbane', 'AAW Global Logistics - Adelaide', 'AAW Global Logistics - Fremantle', 'AAW Customs Brokerage', 'AAW Project Logistics'],
          'AAW Global Logistics - NZ': ['AAW Global Logistics - Auckland'],
          'AAW Bulk Liquid Logistics': ['AAW Bulk Liquid Logistics Team'],
          'Hoyer Logistics Australia': ['Hoyer Logistics Australia'],
          'Coastalbridge': ['Coastalbridge', 'Coastalbridge Agencies'],
          'Regional Shipping Services': ['PIL Logistics Australia', 'Regional Shipping Services'],
          'International Logistics Management': ['ILM'],
        }).find(([, branches]) => branches.includes(fullBranch))?.[0];
        
        if (branchBU && branchBU.toLowerCase() === bu) {
          if (matchesBranch(incidentBranch, fullBranch)) return true;
        }
      }
    }
    return false;
  };

  // Enforce Role-Based Access Control (RBAC)
  // Admin and Risk & Compliance can see everything.
  if (role !== 'full_access' && role !== 'risk_compliance') {
    // If BU manager, they see all branches in their business unit
    if (role === 'bu_access' && businessUnit) {
      displayedIncidents = displayedIncidents.filter(i => matchesBU(i.business_unit, i.branch_department, businessUnit));
    } 
    // If Branch user, they ONLY see their branch
    else if (role === 'branch_access' && branchName) {
      displayedIncidents = displayedIncidents.filter(i => matchesBranch(i.branch_department, branchName));
    }
    // Dept-specific roles see their category of incidents (globally — they are functional oversight roles)
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
    // Fallback: only own incidents (submit_only)
    else {
      displayedIncidents = [];
    }
  }

  // Apply User-Selected Global Filter
  if (globalFilter.bu) {
    displayedIncidents = displayedIncidents.filter(i => matchesBU(i.business_unit, i.branch_department, globalFilter.bu));
  }
  if (globalFilter.branch) {
    displayedIncidents = displayedIncidents.filter(i => matchesBranch(i.branch_department, globalFilter.branch));
  }

  // Generate unique values for Global Filter dropdowns based on all incidents (bypassing RBAC so options exist)
  const uniqueBUs = Array.from(new Set(incidents.map(i => i.business_unit).filter(Boolean))).sort();
  const uniqueBranches = Array.from(new Set(incidents.map(i => i.branch_department).filter(Boolean))).sort();

  // Final filter by tab
  displayedIncidents = displayedIncidents.filter(i => {
    const draftRegistry = JSON.parse(localStorage.getItem('incident_draft_registry') || '[]');
    const isLocalDraft = draftRegistry.includes(String(i.incident_number_str || '')) || draftRegistry.includes(String(i.incident_id || ''));
    
    const status = String(i.status || '').toLowerCase();
    
    if (activeTab === 'active') {
      // If it's a local draft, it shouldn't be in Active, even if backend says 'Open'
      if (isLocalDraft) return false;
      return !status.includes('closed') && !status.includes('draft');
    }
    
    if (activeTab === 'closed') return status.includes('closed');
    
    if (activeTab === 'drafts') {
      // If it's in the draft registry OR has a 'Draft' status, show it here
      return isLocalDraft || status.includes('draft');
    }
    
    return true;
  });
  
  const pageTitle = pageSource === 'claims' ? 'Claims Management' : 
                    pageSource === 'cors' ? 'CoR Compliance' : 
                    pageSource === 'insurers' ? 'Insurer Notifications' :
                    pageSource === 'escalations' ? 'Management Escalations' :
                    pageSource === 'ncrs' ? 'Non-Conformance Reports' : 'Incident Register';
  const HeaderIcon = pageSource === 'claims' ? Briefcase : pageSource === 'cors' ? AlertTriangle : pageSource === 'ncrs' ? FileWarning : FileText;
  const headerColor = pageSource === 'claims' ? '#10b981' : pageSource === 'cors' ? '#f97316' : pageSource === 'ncrs' ? '#eab308' : '#6366f1';

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

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ position: 'relative' }} ref={globalFilterRef}>
              <button 
                onClick={() => setGlobalFilterMenuOpen(!globalFilterMenuOpen)}
                className="btn"
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '10px',
                  background: (globalFilter.bu || globalFilter.branch) ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)',
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
                onMouseEnter={e => {
                  if (!(globalFilter.bu || globalFilter.branch)) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  }
                }}
                onMouseLeave={e => {
                  if (!(globalFilter.bu || globalFilter.branch)) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
              >
                <Filter size={12} />
                Global Filter
                {(globalFilter.bu || globalFilter.branch) && (
                  <span style={{ 
                    background: '#fff', color: 'var(--primary)', 
                    borderRadius: '50%', width: '16px', height: '16px', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem'
                  }}>
                    {(globalFilter.bu ? 1 : 0) + (globalFilter.branch ? 1 : 0)}
                  </span>
                )}
              </button>

              {globalFilterMenuOpen && (
                <div style={{ 
                  position: 'absolute', top: '120%', right: 0, zIndex: 100,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-base)',
                  borderRadius: '8px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                  width: '250px', padding: '1rem',
                  color: 'var(--fg-base)'
                }}>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--fg-faint)', marginBottom: '0.5rem' }}>Business Unit</div>
                    <select 
                      className="input-field" 
                      style={{ height: '28px', fontSize: '0.7rem', padding: '2px 4px', width: '100%', color: 'var(--fg-base)', background: 'var(--bg-input)' }}
                      value={globalFilter.bu}
                      onChange={e => setGlobalFilter({ ...globalFilter, bu: e.target.value })}
                    >
                      <option value="">All Units</option>
                      {uniqueBUs.map(bu => (
                        <option key={String(bu)} value={String(bu)}>{String(bu)}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--fg-faint)', marginBottom: '0.5rem' }}>Branch / Department</div>
                    <select 
                      className="input-field" 
                      style={{ height: '28px', fontSize: '0.7rem', padding: '2px 4px', width: '100%', color: 'var(--fg-base)', background: 'var(--bg-input)' }}
                      value={globalFilter.branch}
                      onChange={e => setGlobalFilter({ ...globalFilter, branch: e.target.value })}
                    >
                      <option value="">All Branches</option>
                      {uniqueBranches.map(br => (
                        <option key={String(br)} value={String(br)}>{String(br)}</option>
                      ))}
                    </select>
                  </div>

                  <button 
                    className="btn btn-secondary" 
                    style={{ width: '100%', fontSize: '0.65rem', padding: '4px' }}
                    onClick={() => setGlobalFilter({ bu: '', branch: '' })}
                  >
                    Clear Filter
                  </button>
                </div>
              )}
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
            // NCR: only show when specifically in NCRs section, not in general incident register
            if (cat.id === 'ncr') return pageSource === 'ncrs';
            // If in NCRs section, ONLY show ncr
            if (pageSource === 'ncrs') return cat.id === 'ncr';
            // Dept-specific roles only see their relevant sections
            if (role === 'hr_access') return cat.id === 'hr' || cat.id === 'whs';
            if (role === 'whs_access') return cat.id === 'whs';
            if (role === 'it_access') return cat.id === 'it';
            if (role === 'finance_access') return cat.id === 'finance';
            return true;
          })
          .map(category => {
            const categoryIncidents = displayedIncidents
              .filter(i => getCategory(i) === category.id)
              .filter(i => {
                if (pageSource === 'claims') return i.formal_claim_issued === 'Yes';
                if (pageSource === 'cors') return i.cor === 'Yes' || i.cor_required === 'Yes';
                if (pageSource === 'insurers') return i.insurer_notified === 'Yes';
                if (pageSource === 'escalations') return i.management_escalation === 'Yes';
                if (pageSource === 'ncrs') return category.id === 'ncr';
                return true;
              });

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
                  if (fState.bu && fState.bu.length > 0 && !fState.bu.includes(inc.business_unit)) return false;
                  if (fState.customer && fState.customer.length > 0 && !fState.customer.includes(inc.customer_name || inc.customer)) return false;
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ 
                      width: '32px', height: '32px', borderRadius: '8px', 
                      background: `${category.color}10`, color: category.color, 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `1px solid ${category.color}20`,
                      transition: 'all 0.3s ease',
                      flexShrink: 0
                    }}>
                      <Icon size={18} strokeWidth={1.5} />
                    </div>
                    <div style={{ width: '280px', flexShrink: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--fg-base)', letterSpacing: '-0.01em' }}>
                        {category.label}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--fg-muted)', marginTop: '0.05rem', fontWeight: 500 }}>
                        {category.desc}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        minWidth: '32px', height: '24px', padding: '0 0.5rem', 
                        background: categoryIncidents.length > 0 ? `${category.color}10` : 'var(--bg-subtle)', 
                        border: `1px solid ${categoryIncidents.length > 0 ? `${category.color}30` : 'var(--border-base)'}`,
                        borderRadius: '12px',
                        boxShadow: categoryIncidents.length > 0 ? `inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 8px -2px ${category.color}20` : 'none'
                      }}>
                        <span style={{ 
                          fontSize: '0.8rem', fontWeight: 800, 
                          color: categoryIncidents.length > 0 ? category.color : 'var(--fg-muted)' 
                        }}>
                          {categoryIncidents.length}
                        </span>
                      </div>
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
                                ref={filterMenuRef}
                                onClick={e => e.stopPropagation()}
                                style={{ 
                                  position: 'absolute', top: '110%', right: 0, zIndex: 100,
                                  background: 'var(--bg-elevated)', border: '1px solid var(--border-base)',
                                  borderRadius: '8px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                                  width: '250px', padding: '1rem'
                                }}
                              >
                                <div style={{ marginBottom: '0.75rem' }}>
                                  <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--fg-faint)', marginBottom: '0.5rem' }}>Business Unit</div>
                                  <select 
                                    className="input-field" 
                                    style={{ height: '28px', fontSize: '0.7rem', padding: '2px 4px' }}
                                    value={filterStates[category.id]?.bu?.[0] || ''}
                                    onChange={e => setFilterStates(prev => ({ ...prev, [category.id]: { ...prev[category.id], bu: e.target.value ? [e.target.value] : [] } }))}
                                  >
                                    <option value="">All Units</option>
                                    {Array.from(new Set(categoryIncidents.map(i => i.business_unit).filter(Boolean))).map(bu => (
                                      <option key={bu} value={bu}>{bu}</option>
                                    ))}
                                  </select>
                                </div>

                                <div style={{ marginBottom: '0.75rem' }}>
                                  <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--fg-faint)', marginBottom: '0.5rem' }}>Branch / Department</div>
                                  <select 
                                    className="input-field" 
                                    style={{ height: '28px', fontSize: '0.7rem', padding: '2px 4px' }}
                                    value={filterStates[category.id]?.branch?.[0] || ''}
                                    onChange={e => setFilterStates(prev => ({ ...prev, [category.id]: { ...prev[category.id], branch: e.target.value ? [e.target.value] : [] } }))}
                                  >
                                    <option value="">All Branches</option>
                                    {Array.from(new Set(categoryIncidents.map(i => i.branch_department).filter(Boolean))).map(br => (
                                      <option key={br} value={br}>{br}</option>
                                    ))}
                                  </select>
                                </div>

                                <div style={{ marginBottom: '0.75rem' }}>
                                  <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--fg-faint)', marginBottom: '0.5rem' }}>Customer</div>
                                  <select 
                                    className="input-field" 
                                    style={{ height: '28px', fontSize: '0.7rem', padding: '2px 4px' }}
                                    value={filterStates[category.id]?.customer?.[0] || ''}
                                    onChange={e => setFilterStates(prev => ({ ...prev, [category.id]: { ...prev[category.id], customer: e.target.value ? [e.target.value] : [] } }))}
                                  >
                                    <option value="">All Customers</option>
                                    {Array.from(new Set(categoryIncidents.map(i => i.customer_name || i.customer).filter(Boolean))).map(cust => (
                                      <option key={cust} value={cust}>{cust}</option>
                                    ))}
                                  </select>
                                </div>

                                <div style={{ marginBottom: '0.75rem' }}>
                                  <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--fg-faint)', marginBottom: '0.5rem' }}>Status</div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {(INCIDENT_STATUSES[category.id] || INCIDENT_STATUSES.cargo).map(status => {
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
                                      )
                                    })}
                                  </div>
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
                          ) : filteredIncidents.map((incident, i) => {
                                  const isCoR = (
                                    String(incident.cor_required).toLowerCase() === 'yes' || 
                                    String(incident.cor).toLowerCase() === 'yes' || 
                                    incident.cor === true || 
                                    incident.cor === 1 || 
                                    String(incident.cor_formatted).toLowerCase() === 'yes' ||
                                    String(incident.cor_required).toLowerCase() === 'true' ||
                                    String(incident.cor).toLowerCase() === 'true' ||
                                    String(incident.type).toLowerCase().includes('chain of responsibility') ||
                                    String(incident.incident_types).toLowerCase().includes('chain of responsibility') ||
                                    (incident.type && /\bCOR\b/i.test(incident.type))
                                  );

                                  const isClaim = (
                                    String(incident.formal_claim_issued).toLowerCase() === 'yes' ||
                                    incident.formal_claim_issued === true ||
                                    incident.formal_claim_issued === 1 ||
                                    String(incident.formal_claim_issued).toLowerCase() === 'true' ||
                                    (incident.claim_reference && String(incident.claim_reference).trim() !== '')
                                  );

                                  return (
                                    <tr 
                                      key={i} 
                                      onClick={() => {
                                        const status = (incident.status || '').toLowerCase();
                                        const draftRegistry = JSON.parse(localStorage.getItem('incident_draft_registry') || '[]');
                                        const isLocalDraft = draftRegistry.includes(incident.incident_number_str) || draftRegistry.includes(incident.incident_id);
                                        const isDraft = status.includes('draft') || isLocalDraft;

                                        if (isDraft && activeTab === 'drafts') {
                                          navigate(`/incidents/new?type=${category.id}&draftId=${incident.id}`);
                                        } else {
                                          navigate(pageSource === 'cors' ? `/cors/${incident.id}` : pageSource === 'claims' ? `/claims/${incident.id}` : `/incidents/${incident.id}`, { state: { source: pageSource } });
                                        }
                                      }}
                                      style={{ 
                                        cursor: 'pointer', 
                                        background: 'var(--bg-surface)', 
                                        boxShadow: 'var(--shadow-sm)',
                                        transition: 'all 0.2s ease',
                                        borderLeft: isCoR ? `4px solid #f97316` : isClaim ? `4px solid #10b981` : '4px solid transparent',
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
                                <td style={{ fontWeight: 700, color: 'var(--fg-base)', padding: (isCoR || isClaim) ? '0.4rem 0 0.4rem 0.5rem' : '0.4rem 0 0.4rem 1.5rem', whiteSpace: 'nowrap', borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px', border: '1px solid transparent', borderRight: 'none', transition: 'padding 0.2s ease' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    {isCoR && (
                                      <div style={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        alignItems: 'center', 
                                        lineHeight: 1.1,
                                        padding: '4px 3px', 
                                        background: '#fff7ed', 
                                        color: '#c2410c', 
                                        borderRadius: '4px',
                                        fontSize: '0.55rem',
                                        fontWeight: 900,
                                        boxShadow: '0 2px 4px rgba(249,115,22,0.1)',
                                        marginRight: '2px',
                                        border: '1px solid #fdba74'
                                      }}>
                                        <span>C</span>
                                        <span>O</span>
                                        <span>R</span>
                                      </div>
                                    )}
                                    {isClaim && (
                                      <div style={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        alignItems: 'center', 
                                        lineHeight: 1.1,
                                        padding: '4px 3px', 
                                        background: '#ecfdf5', 
                                        color: '#047857', 
                                        borderRadius: '4px',
                                        fontSize: '0.55rem',
                                        fontWeight: 900,
                                        boxShadow: '0 2px 4px rgba(16,185,129,0.1)',
                                        marginRight: '2px',
                                        border: '1px solid #a7f3d0'
                                      }}>
                                        <span>C</span>
                                        <span>L</span>
                                        <span>M</span>
                                      </div>
                                    )}
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
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.employee_involved || incident.employee_name || incident.employee || 'N/A'}</td>
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.branch_department || 'N/A'}</td>
                                  </>
                                )}
                                {category.id === 'whs' && (
                                  <>
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.type || incident.injury_type || 'N/A'}</td>
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.location || incident.location_of_incident || 'N/A'}</td>
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.branch_department || 'N/A'}</td>
                                  </>
                                )}
                                {category.id === 'it' && (
                                  <>
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.type || 'N/A'}</td>
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.system_affected || incident.systems_affected || 'N/A'}</td>
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.branch_department || 'N/A'}</td>
                                  </>
                                )}
                                {category.id === 'risk' && (
                                  <>
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.type || 'N/A'}</td>
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.regulatory_body || incident.regulator_authority_involved || incident.legislation_policy_breached || 'N/A'}</td>
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.branch_department || 'N/A'}</td>
                                  </>
                                )}
                                {category.id === 'finance' && (
                                  <>
                                    <td style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{incident.type || 'N/A'}</td>

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

                                <td className="monospaced" style={{ color: 'var(--fg-muted)', fontWeight: 600, fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>{category.id === 'finance' ? (incident.reported_date || incident.date || 'N/A') : incident.date}</td>
                                <td style={{ padding: '0.4rem 0.75rem', borderTopRightRadius: '10px', borderBottomRightRadius: '10px', border: '1px solid transparent', borderLeft: 'none' }}>
                                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    <span className={`badge badge-${(String(incident.status || '').toLowerCase().includes('closed') || String(incident.status || '').toLowerCase() === 'close') ? 'closed' : (String(incident.status || '').toLowerCase().includes('open') || String(incident.status || '').toLowerCase() === 'new') ? 'open' : 'review'}`} style={{ fontWeight: 700, padding: '0.2rem 0.6rem', fontSize: '0.65rem' }}>
                                      {String(incident.status || '')}
                                    </span>
                                  </div>
                                </td>
                                {category.id === 'cargo' && (
                                  <td style={{ fontSize: '0.75rem', padding: '0.4rem 1.5rem 0.4rem 0.75rem', textAlign: 'right', fontWeight: 600, borderTopRightRadius: '10px', borderBottomRightRadius: '10px', border: '1px solid transparent', borderLeft: 'none' }}>
                                    {incident.total_estimated_costs || '$0.00'}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
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
