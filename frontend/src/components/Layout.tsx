import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LogOut, LayoutDashboard, FileText, Search,
  BarChart3, ChevronRight, Package, Users, HeartPulse,
  Shield, DollarSign, Lock, Bell, Settings,
  Briefcase, AlertTriangle, FileWarning, PieChart
} from 'lucide-react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import logo from '../assets/aaw_logo.png';

const INCIDENT_TYPES = [
  {
    id: 'cargo',
    label: 'Cargo & Equipment',
    icon: Package,
    color: '#f59e0b',
    desc: 'Cargo damage, theft, equipment failure',
  },
  {
    id: 'hr',
    label: 'Human Resources',
    icon: Users,
    color: '#8b5cf6',
    desc: 'Workplace conduct & HR matters',
  },
  {
    id: 'whs',
    label: 'WH&S Incident',
    icon: HeartPulse,
    color: '#ef4444',
    desc: 'Workplace health, safety & injuries',
  },
  {
    id: 'it',
    label: 'IT & Security',
    icon: Lock,
    color: '#06b6d4',
    desc: 'Cyber, data breach & system issues',
  },
  {
    id: 'risk',
    label: 'Risk & Compliance',
    icon: Shield,
    color: '#10b981',
    desc: 'Regulatory breaches & compliance',
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: DollarSign,
    color: '#3b82f6',
    desc: 'Financial incidents & travel disruption',
  },
  {
    id: 'ncr',
    label: 'Non-Conformance Report',
    icon: FileWarning,
    color: '#eab308',
    desc: 'Process failures & defects',
  },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { logout, role, email, branchName, businessUnit, displayName: ssoDisplayName, isSSOUser, resolvedGroupInfo } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [incidentFlyout, setIncidentFlyout] = useState(false);
  const [dashboardFlyout, setDashboardFlyout] = useState(false);
  const [collapsed] = useState(false);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const incidentNavRef = useRef<HTMLDivElement>(null);
  const dashboardFlyoutRef = useRef<HTMLDivElement>(null);
  const dashboardNavRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        flyoutRef.current && !flyoutRef.current.contains(e.target as Node) &&
        incidentNavRef.current && !incidentNavRef.current.contains(e.target as Node)
      ) {
        setIncidentFlyout(false);
      }
      if (
        dashboardFlyoutRef.current && !dashboardFlyoutRef.current.contains(e.target as Node) &&
        dashboardNavRef.current && !dashboardNavRef.current.contains(e.target as Node)
      ) {
        setDashboardFlyout(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    
    // Check state source from navigation
    const source = location.state?.source;
    
    if (path === '/claims') {
      return location.pathname.startsWith('/claims') || source === 'claims';
    }
    if (path === '/cors') {
      return location.pathname.startsWith('/cors') || source === 'cors';
    }
    if (path === '/ncrs') {
      return location.pathname.startsWith('/ncrs') || source === 'ncrs';
    }
    if (path === '/incidents') {
      // Don't highlight incidents if we are actually viewing a claim, cor, or ncr
      if (location.pathname.startsWith('/claims') || location.pathname.startsWith('/cors') || location.pathname.startsWith('/ncrs')) return false;
      if (source === 'claims' || source === 'cors' || source === 'ncrs') return false;
      return location.pathname.startsWith(path);
    }
    
    return location.pathname.startsWith(path);
  };

  const roleLabel = role === 'full_access' ? 'Global Admin' :
    role === 'risk_compliance' ? 'Risk & Compliance' :
      role === 'bu_access' ? 'BU Manager' :
        role === 'hr_access' ? 'HR & Safety' :
          role === 'whs_access' ? 'WHS Officer' :
            role === 'it_access' ? 'IT Security' :
              role === 'finance_access' ? 'Finance' :
                role === 'submit_only' ? 'Operator' :
                  'Branch Lead';

  // Use Azure AD display name for SSO users, role label for dev/mock users
  const displayName = isSSOUser && ssoDisplayName ? ssoDisplayName : roleLabel;

  // Derive initials from display name (e.g. Global Admin -> GA, John Smith -> JS)
  const userInitials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="sidebar-layout">
      {/* ── LEFT SIDEBAR ──────────────────────────────────────── */}
      <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
        {/* Brand - Centered Black Section */}
        <div className="sidebar__brand">
          <Link to="/" className="sidebar__logo-link">
            <img src={logo} alt="AAW Group" className="sidebar__logo" />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="sidebar__nav">
          {/* Dashboards with flyout */}
          {role !== 'submit_only' && (
            <>
              <div
                ref={dashboardNavRef}
                className={`sidebar__nav-item sidebar__nav-item--has-flyout ${dashboardFlyout || (isActive('/') && !isActive('/incidents') && !isActive('/search') && !isActive('/reports') && !isActive('/ncr-dashboard')) || isActive('/ncr-dashboard') ? 'active' : ''}`}
                onClick={() => setDashboardFlyout(f => !f)}
                title="Dashboards"
              >
                <LayoutDashboard size={18} color="#3b82f6" />
                {!collapsed && <span style={{ flex: 1 }}>Dashboards</span>}
              </div>

              {/* Dashboard Flyout Panel */}
              {dashboardFlyout && (
                <div
                  ref={dashboardFlyoutRef}
                  className="incident-flyout"
                >
                  <div className="incident-flyout__header">
                    <span className="incident-flyout__title">Dashboards</span>
                    <span className="incident-flyout__sub">Select operational dashboard</span>
                  </div>
                  <div className="incident-flyout__grid">
                    <button
                      className="incident-flyout__item"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDashboardFlyout(false);
                        navigate('/');
                      }}
                    >
                      <div className="incident-flyout__icon" style={{ background: '#3b82f618', color: '#3b82f6', borderColor: '#3b82f630' }}>
                        <LayoutDashboard size={20} />
                      </div>
                      <div className="incident-flyout__content">
                        <span className="incident-flyout__label">Global Dashboard</span>
                        <span className="incident-flyout__desc">Main fleet and operational metrics</span>
                      </div>
                      <ChevronRight size={14} className="incident-flyout__arrow" />
                    </button>

                    {['risk_compliance', 'full_access'].includes(role || '') && (
                      <>
                        <button
                          className="incident-flyout__item"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDashboardFlyout(false);
                            navigate('/ic-dashboard');
                          }}
                        >
                          <div className="incident-flyout__icon" style={{ background: '#6366f118', color: '#6366f1', borderColor: '#6366f130' }}>
                            <BarChart3 size={20} />
                          </div>
                          <div className="incident-flyout__content">
                            <span className="incident-flyout__label">Incidents & Claims</span>
                            <span className="incident-flyout__desc">I&C performance and claim tracking</span>
                          </div>
                          <ChevronRight size={14} className="incident-flyout__arrow" />
                        </button>

                        <button
                          className="incident-flyout__item"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDashboardFlyout(false);
                            navigate('/ncr-dashboard');
                          }}
                        >
                          <div className="incident-flyout__icon" style={{ background: '#eab30818', color: '#eab308', borderColor: '#eab30830' }}>
                            <PieChart size={20} />
                          </div>
                          <div className="incident-flyout__content">
                            <span className="incident-flyout__label">NCR Dashboard</span>
                            <span className="incident-flyout__desc">Non-conformance and CAPA tracking</span>
                          </div>
                          <ChevronRight size={14} className="incident-flyout__arrow" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Log New Incident with flyout */}
          <div
            ref={incidentNavRef}
            className={`sidebar__nav-item sidebar__nav-item--has-flyout ${incidentFlyout || isActive('/incidents/new') ? 'active' : ''}`}
            onClick={() => setIncidentFlyout(f => !f)}
            title="Create New +"
          >
            <Package size={18} color="#f59e0b" />
            {!collapsed && <span style={{ flex: 1 }}>Create New +</span>}
          </div>

          {/* Incident Flyout Panel */}
          {incidentFlyout && (
            <div
              ref={flyoutRef}
              className="incident-flyout"
            >
              <div className="incident-flyout__header">
                <span className="incident-flyout__title">Create New +</span>
                <span className="incident-flyout__sub">Select incident category to open form</span>
              </div>
              <div className="incident-flyout__grid">
                {INCIDENT_TYPES
                  .filter(inc => inc.id !== 'ncr' || ['branch_access', 'bu_access', 'risk_compliance', 'full_access'].includes(role || ''))
                  .map(inc => (
                    <button
                      key={inc.id}
                      className="incident-flyout__item"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIncidentFlyout(false);
                        navigate(`/incidents/new?type=${inc.id}`);
                      }}
                    >
                      <div className="incident-flyout__icon" style={{ background: `${inc.color}18`, color: inc.color, borderColor: `${inc.color}30` }}>
                        <inc.icon size={20} />
                      </div>
                      <div className="incident-flyout__content">
                        <span className="incident-flyout__label">{inc.label}</span>
                        <span className="incident-flyout__desc">{inc.desc}</span>
                      </div>
                      <ChevronRight size={14} className="incident-flyout__arrow" />
                    </button>
                  ))}
              </div>
              {role !== 'submit_only' && (
                <div className="incident-flyout__footer">
                  <Link to="/incidents" onClick={() => setIncidentFlyout(false)} className="incident-flyout__view-all">
                    View All Incident Records →
                  </Link>
                </div>
              )}
            </div>
          )}

          {role !== 'submit_only' && (
            <>
              {/* Logged Incidents Link */}
              <Link
                to="/incidents"
                className={`sidebar__nav-item ${isActive('/incidents') && !isActive('/incidents/new') ? 'active' : ''}`}
                title="Incidents"
              >
                <FileText size={18} color="#6366f1" />
                {!collapsed && <span>Incidents</span>}
              </Link>

              <Link
                to="/claims"
                className={`sidebar__nav-item ${isActive('/claims') ? 'active' : ''}`}
                title="Claims"
              >
                <Briefcase size={18} color="#10b981" />
                {!collapsed && <span>Claims</span>}
              </Link>

              <Link
                to="/cors"
                className={`sidebar__nav-item ${isActive('/cors') ? 'active' : ''}`}
                title="CORs"
              >
                <AlertTriangle size={18} color="#f97316" />
                {!collapsed && <span>CORs</span>}
              </Link>

              <Link
                to="/ncrs"
                className={`sidebar__nav-item ${isActive('/ncrs') ? 'active' : ''}`}
                title="NCRs"
              >
                <FileWarning size={18} color="#eab308" />
                {!collapsed && <span>NCRs</span>}
              </Link>

              {/* Search link moved to header */}

              {role === 'risk_compliance' && (
                <Link
                  to="/reports"
                  className={`sidebar__nav-item ${isActive('/reports') ? 'active' : ''}`}
                  title="Reports"
                >
                  <BarChart3 size={18} color="#f43f5e" />
                  {!collapsed && <span>Reports</span>}
                </Link>
              )}

              <Link
                to="/access-control"
                className={`sidebar__nav-item ${isActive('/access-control') ? 'active' : ''}`}
                title="Access Control"
              >
                <Shield size={18} color="#6366f1" />
                {!collapsed && <span>Access Control</span>}
              </Link>

            </>
          )}
        </nav>

        {/* Sidebar Footer - Slogan */}
        <div style={{
          marginTop: 'auto',
          padding: '1rem 1.6rem',
          textAlign: 'left',
          fontSize: '0.65rem',
          fontWeight: 800,
          letterSpacing: '0.15em',
          color: 'var(--fg-faint)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          opacity: collapsed ? 0 : 1,
          transition: 'opacity 0.2s ease',
          pointerEvents: 'none'
        }}>

        </div>

      </aside>

      {/* ── MAIN CONTENT ──────────────────────────────────────── */}
      <div className="sidebar-main">
        {/* Topbar strip */}
        <header className="sidebar-topbar">
          <div className="sidebar-topbar__left">
            {/* Breadcrumb removed as per user request */}
          </div>
          <div className="sidebar-topbar__right">
            <button
              className="sidebar-topbar__icon-btn"
              title="Search Records"
              onClick={() => navigate('/search')}
              style={{ color: isActive('/search') ? '#fff' : '#a1a1aa' }}
            >
              <Search size={17} />
            </button>
            <button className="sidebar-topbar__icon-btn" title="Notifications">
              <Bell size={17} />
              <span className="sidebar-topbar__notif-dot" />
            </button>
            <div style={{ position: 'relative' }} ref={profileRef}>
              <div
                className="sidebar-topbar__avatar"
                title="User Profile"
                onClick={() => setProfileOpen(!profileOpen)}
                style={{ cursor: 'pointer' }}
              >
                {userInitials}
              </div>

              {profileOpen && (
                <div className="fade-in" style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '1rem',
                  width: '280px',
                  zIndex: 200,
                  background: 'linear-gradient(165deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.95) 100%)',
                  backdropFilter: 'blur(32px)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '20px',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), inset 0 0 0 1px rgba(255,255,255,0.05)',
                  padding: '1.5rem',
                  color: '#fff',
                  overflow: 'hidden'
                }}>
                  {/* Subtle Mesh Glow */}
                  <div style={{
                    position: 'absolute',
                    top: '-50%',
                    right: '-50%',
                    width: '200px',
                    height: '200px',
                    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
                    zIndex: 0,
                    pointerEvents: 'none'
                  }} />

                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '14px',
                        background: isSSOUser ? 'linear-gradient(135deg, #0078d4 0%, #005a9e 100%)' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        boxShadow: isSSOUser ? '0 8px 16px -4px rgba(0, 120, 212, 0.4)' : '0 8px 16px -4px rgba(99, 102, 241, 0.4)',
                        color: '#fff'
                      }}>
                        {userInitials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {displayName}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.15rem 0.5rem',
                            background: 'rgba(99, 102, 241, 0.15)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            borderRadius: '6px',
                            fontSize: '0.6rem',
                            fontWeight: 800,
                            color: '#818cf8',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            {roleLabel}
                          </div>
                          {isSSOUser && (
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.15rem 0.5rem',
                              background: 'rgba(0, 120, 212, 0.15)',
                              border: '1px solid rgba(0, 120, 212, 0.3)',
                              borderRadius: '6px',
                              fontSize: '0.6rem',
                              fontWeight: 800,
                              color: '#60a5fa',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em'
                            }}>
                              <svg width="10" height="10" viewBox="0 0 21 21" fill="none">
                                <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                                <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                                <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                                <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                              </svg>
                              SSO
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: '#475569',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      marginBottom: '0.75rem',
                      paddingLeft: '0.5rem'
                    }}>
                      Account Management
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <button
                        onClick={() => { setProfileOpen(false); alert('Settings Panel Coming Soon'); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          width: '100%',
                          padding: '0.875rem',
                          borderRadius: '12px',
                          border: 'none',
                          background: 'rgba(255,255,255,0.03)',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                          textAlign: 'left'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                          e.currentTarget.style.color = '#fff';
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                          e.currentTarget.style.color = '#94a3b8';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }}
                      >
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Settings size={18} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>Settings</div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 500, opacity: 0.6 }}>Preferences & security</div>
                        </div>
                      </button>

                      <button
                        onClick={logout}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          width: '100%',
                          padding: '0.875rem',
                          borderRadius: '12px',
                          border: 'none',
                          background: 'rgba(239, 68, 68, 0.05)',
                          color: '#f87171',
                          cursor: 'pointer',
                          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                          textAlign: 'left'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }}
                      >
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <LogOut size={18} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>Sign Out</div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 500, opacity: 0.6 }}>End current session</div>
                        </div>
                      </button>
                    </div>

                    <div style={{
                      marginTop: '1.5rem',
                      padding: '1rem',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.05)',
                      fontSize: '0.7rem',
                      color: '#64748b',
                      lineHeight: 1.4
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span>Session Status</span>
                        <span style={{ color: '#10b981', fontWeight: 800 }}>ACTIVE</span>
                      </div>
                      <div style={{ color: '#94a3b8', marginBottom: '0.25rem' }}>{email}</div>
                      <div>{branchName ? branchName : businessUnit ? businessUnit : 'Global Headquarters'}</div>
                    </div>

                    {/* AD Group Info (SSO users only) */}
                    {isSSOUser && (
                      <div style={{
                        marginTop: '0.75rem',
                        padding: '1rem',
                        background: 'rgba(99, 102, 241, 0.04)',
                        borderRadius: '12px',
                        border: '1px solid rgba(99, 102, 241, 0.1)',
                        fontSize: '0.7rem',
                        color: '#64748b',
                        lineHeight: 1.5
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                          <Shield size={12} style={{ color: '#818cf8' }} />
                          <span style={{ fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.6rem' }}>AD Group Membership</span>
                        </div>
                        {resolvedGroupInfo && resolvedGroupInfo.matchedGroups.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            {resolvedGroupInfo.matchedGroups.map((group, idx) => (
                              <div key={idx} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.35rem 0.6rem',
                                background: 'rgba(99, 102, 241, 0.08)',
                                borderRadius: '6px',
                                fontSize: '0.68rem',
                                color: '#94a3b8',
                                fontWeight: 600
                              }}>
                                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#818cf8', flexShrink: 0 }} />
                                {group}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ color: '#64748b', fontStyle: 'italic' }}>No AD groups matched</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="sidebar-content">
          {children}
        </main>
      </div>
    </div>
  );
}
