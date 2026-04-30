import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LogOut, LayoutDashboard, FileText, Search,
  BarChart3, ChevronRight, Package, Users, HeartPulse,
  Shield, DollarSign, Lock, Bell, Settings,
  Briefcase, AlertTriangle
} from 'lucide-react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

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
];

export default function Layout({ children }: { children: ReactNode }) {
  const { logout, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [incidentFlyout, setIncidentFlyout] = useState(false);
  const [collapsed] = useState(false);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const incidentNavRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        flyoutRef.current && !flyoutRef.current.contains(e.target as Node) &&
        incidentNavRef.current && !incidentNavRef.current.contains(e.target as Node)
      ) {
        setIncidentFlyout(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const userInitials = role === 'risk_compliance' ? 'RC' : 'BN';

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
          <Link
            to="/"
            className={`sidebar__nav-item ${isActive('/') && !isActive('/incidents') && !isActive('/search') && !isActive('/reports') ? 'active' : ''}`}
            title="Dashboard"
          >
            <LayoutDashboard size={18} color="#3b82f6" />
            {!collapsed && <span>Dashboard</span>}
          </Link>

          {/* Log New Incident with flyout */}
          <div
            ref={incidentNavRef}
            className={`sidebar__nav-item sidebar__nav-item--has-flyout ${incidentFlyout || isActive('/incidents/new') ? 'active' : ''}`}
            onClick={() => setIncidentFlyout(f => !f)}
            title="Log New Incident"
          >
            <Package size={18} color="#f59e0b" />
            {!collapsed && <span style={{ flex: 1 }}>Log New Incident</span>}
          </div>

          {/* Incident Flyout Panel */}
          {incidentFlyout && (
            <div
              ref={flyoutRef}
              className="incident-flyout"
            >
              <div className="incident-flyout__header">
                <span className="incident-flyout__title">Log New Incident</span>
                <span className="incident-flyout__sub">Select incident category to open form</span>
              </div>
              <div className="incident-flyout__grid">
                {INCIDENT_TYPES.map(inc => (
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
              <div className="incident-flyout__footer">
                <Link to="/incidents" onClick={() => setIncidentFlyout(false)} className="incident-flyout__view-all">
                  View All Incident Records →
                </Link>
              </div>
            </div>
          )}

          {/* Logged Incidents Link */}
          <Link
            to="/incidents"
            className={`sidebar__nav-item ${isActive('/incidents') && !isActive('/incidents/new') ? 'active' : ''}`}
            title="Logged Incidents"
          >
            <FileText size={18} color="#6366f1" />
            {!collapsed && <span>Logged Incidents</span>}
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
            to="/insurers"
            className={`sidebar__nav-item ${isActive('/insurers') ? 'active' : ''}`}
            title="Insurer Notifications"
          >
            <Shield size={18} color="#06b6d4" />
            {!collapsed && <span>Insurers</span>}
          </Link>

          <Link
            to="/escalations"
            className={`sidebar__nav-item ${isActive('/escalations') ? 'active' : ''}`}
            title="Management Escalations"
          >
            <Users size={18} color="#8b5cf6" />
            {!collapsed && <span>Escalations</span>}
          </Link>

          <Link
            to="/search"
            className={`sidebar__nav-item ${isActive('/search') ? 'active' : ''}`}
            title="Search"
          >
            <Search size={18} color="#64748b" />
            {!collapsed && <span>Search</span>}
          </Link>

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
        </nav>


      </aside>

      {/* ── MAIN CONTENT ──────────────────────────────────────── */}
      <div className="sidebar-main">
        {/* Topbar strip */}
        <header className="sidebar-topbar">
          <div className="sidebar-topbar__left">
            <span className="sidebar-topbar__breadcrumb">
              {location.pathname === '/' && 'Dashboard'}
              {location.pathname.startsWith('/incidents') && 'Incidents'}
              {location.pathname.startsWith('/search') && 'Search'}
              {location.pathname.startsWith('/reports') && 'Reports'}
            </span>
          </div>
          <div className="sidebar-topbar__right">
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
                <div className="card fade-in" style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '0.75rem',
                  width: '200px',
                  zIndex: 200,
                  padding: '0.5rem',
                  boxShadow: 'var(--shadow-lg)',
                  border: '1px solid var(--border-base)'
                }}>
                  <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-base)', marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{role === 'risk_compliance' ? 'Risk & Compliance' : 'Branch Manager'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>AAW Group HQ</div>
                  </div>
                  <button className="sidebar__nav-item" style={{ width: '100%', border: 'none', background: 'transparent', margin: 0, padding: '0.6rem 0.75rem' }} onClick={() => { setProfileOpen(false); alert('Settings Panel Coming Soon'); }}>
                    <Settings size={16} />
                    <span style={{ fontSize: '0.875rem', marginLeft: '0.5rem' }}>Settings</span>
                  </button>
                  <button className="sidebar__nav-item" style={{ width: '100%', border: 'none', background: 'transparent', margin: 0, padding: '0.6rem 0.75rem', color: 'var(--danger-fg)' }} onClick={logout}>
                    <LogOut size={16} />
                    <span style={{ fontSize: '0.875rem', marginLeft: '0.5rem' }}>Sign Out</span>
                  </button>
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
