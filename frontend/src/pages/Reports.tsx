import { useState } from 'react';
import {
  Download, Calendar, ShieldAlert,
  ArrowUpRight, LayoutDashboard, Database, Scale, ClipboardList,
  Activity, Zap, Target
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { ChartWrapper } from '../components/ChartWrapper';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('dashboard');

  // --- DATA FROM "NEW VAULT SUMMARY" (1:1 Sheet Fidelity) ---
  const vaultMatrix = [
    { division: 'AAW Global - Sydney', open: 8, closed: 53, total: 61, rate: '86.9%' },
    { division: 'CBR', open: 0, closed: 7, total: 7, rate: '100%' },
    { division: 'Global Clusters', open: 12, closed: 82, total: 94, rate: '87.2%' },
    { division: 'Melbourne HQ', open: 21, closed: 164, total: 185, rate: '88.6%' },
  ];

  // --- DATA FROM "COR SUMMARY" (Risk Level Tab) ---
  const riskLevels = [
    { level: 'Severe Risk Exposure', count: 7, perc: '0.7%', color: 'var(--danger-fg)', gradient: 'url(#gradient-danger)' },
    { level: 'High Compliance Risk', count: 18, perc: '5.2%', color: 'var(--warning-fg)', gradient: 'url(#gradient-warning)' },
    { level: 'Medium Operational Risk', count: 42, perc: '12.1%', color: 'var(--accent-fg)', gradient: 'url(#gradient-accent)' },
    { level: 'Low Risk Coverage', count: 156, perc: '82.0%', color: 'var(--success-fg)', gradient: 'url(#gradient-success)' },
  ];

  const legalGuidance = `The customer (consignor/consignee) has a primary duty under HVNL s.26C and s.26G–26H to provide accurate site information and ensure deliveries can be made safely and lawfully.

If the site was unsuitable for a B-double or heavy vehicle, and the customer did not disclose that, they may have breached their duty under CoR.

AAW (as the booking party) has a shared duty to take reasonable steps - which in this case included engaging reputable transport providers.

The new transport provider cannot automatically shift liability to AAW if they failed to confirm access or route suitability themselves - they have an independent duty as both operator and driver under CoR.`;

  // --- 42-COLUMN MASTER HEADERS (1:1 Row 3 "Incident Raw Data") ---
  const rawHeaders = [
    "Vault", "Incident Number", "Name", "Business Unit", "Status", "System Job Number", "Created by", "Date Created", "Customer",
    "Incident State", "Responsible Party", "Company's Liability", "Incident Type", "State", "COR", "Risk Level", "Dupli", "Blank",
    "Status (Closed/Open)", "Total Entries", "Date Created 2", "Date (Day)", "Date (Month)", "Date (Year)", "Date (Time)", "Month", "Month Year", "Quarter",
    "Cargo & Equipment Incident -420 - Cargo Damage (BOC)", "Last email update", "Email Subject", "Can't Find email", "Status Update", "Remarks", "Days",
    "[1ST] Follow Up", "[2ND] Follow Up", "[3RD] Follow Up", "[4TH] Follow Up", "[5TH] Follow Up"
  ];

  const masterData = [
    {
      v: "New", inc: "298", n: "Abandoned cargo Mexico (Signature Orthopaedics)", bu: "AAW Global - Sydney", s: "Open", job: "S00143602", cb: "Joe Di Monaco", dc: "17/03/2025", cust: "MITS ALLOY", state: "Open - Intent to Claim", resp: "Consignee", liab: "AAW agent only", typ: "Abandoned Cargo", cor: "No", risk: "Low", q: "Q1", rem: "Evidence obtained", f1: "17/03/2025", f2: "Pending", f3: "-", f4: "-", f5: "-", day: "17", mon: "03", year: "2025", time: "08:32:00", m_y: "March 2025", days: "12", email_s: "Intent to Claim - Outturn Report"
    },
    {
      v: "New", inc: "101", n: "Car Damage Haval - LGWFFSA51PJ657660", bu: "PILLA", s: "Closed", job: "S00135919", cb: "Briannon Mott", dc: "31/01/2024", cust: "PILLA", state: "Closed - No Claim", resp: "Origin Agent", liab: "None", typ: "Cargo Damage", cor: "No", risk: "Low", q: "Q1", rem: "Damage preexisting", f1: "31/01/2024", f2: "05/02/2024", f3: "Complete", f4: "-", f5: "-", day: "31", mon: "01", year: "2024", time: "06:54:00", m_y: "January 2024", days: "1", email_s: "Outturn Report S00135919"
    }
  ];

  // --- NEW EXPORT HEADERS (20 Columns 1:1) ---
  const exportHeaders = [
    "Status", "Incident Number", "Name", "Business Unit", "Status", "System Job Number", "Created by", "Date Created", "Customer",
    "Incident State", "Responsible Party", "Company's Liability", "Incident Type", "State", "COR", "Risk Level", "Dupli", "Blank", "Status (Closed/Open)", "Total Entries"
  ];

  // --- COR SHEET HEADERS (1:1) ---
  const corHeaders = [
    "Reference / Description", "Cause", "Follow-up", "Details / Identification", "COR Name", "COR Risk Level", "COR Type", "Date Created", "Month", "Year", "Quarter"
  ];

  const corDetailedData = [
    { ref: 'Damage S00165906 / HAWB SOF001071091', cause: 'Weight Distribution', follow: 'Kaper delivery Gnangara', details: 'TCKU6052580', name: 'CoR - Site Suitability', risk: 'Severe', type: 'Vehicle Standards', dc: '20/11/2025', m: 'November', y: '2025', q: 'Q4' },
    { ref: 'S00166291 / Site damage', cause: 'Third Party Interactions', follow: 'Property Damage Fix', details: 'Fletcher Rail Group', name: 'CoR - Incident Logging', risk: 'High', type: 'Site Suitability', dc: '11/02/2025', m: 'February', y: '2025', q: 'Q1' }
  ];

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'vault', label: 'Vault Summary', icon: Database },
    { id: 'master', label: 'Raw Data ', icon: ClipboardList },
    { id: 'cor', label: 'Compliance Audit', icon: Scale },
    { id: 'export', label: 'Expert Export', icon: Download },
  ];

  // Tooltip Formatter to ensure NO TRUNCATION
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 1000
        }}>
          <p style={{ margin: 0, fontWeight: 900, fontSize: '0.875rem', color: 'var(--fg-base)', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-base)', paddingBottom: '0.5rem' }}>{label}</p>
          {payload.map((p: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: p.color || p.fill, boxShadow: `0 0 10px ${p.color || p.fill}aa` }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--fg-muted)' }}>{p.name}: </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--fg-base)' }}>{p.value} {p.unit || ''}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fade-in" style={{ paddingBottom: '5rem' }}>
      {/* Visual background accents */}
      <div style={{ position: 'fixed', top: '20%', right: '-5%', width: '400px', height: '400px', background: 'var(--accent-light)', filter: 'blur(100px)', zIndex: -1, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '10%', left: '-5%', width: '300px', height: '300px', background: 'var(--success-bg)', filter: 'blur(100px)', zIndex: -1, pointerEvents: 'none' }} />

      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '4rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span style={{ padding: '0.4rem 0.8rem', background: 'var(--accent-gradient)', color: '#fff', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', fontWeight: 900, letterSpacing: '0.1em' }}>EXECUTIVE</span>
            <span style={{ color: 'var(--fg-faint)', fontSize: '0.75rem', fontWeight: 700 }}>VER 2.0.42</span>
          </div>
          <h2 style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, color: 'var(--fg-base)' }}>Risk Intelligence</h2>
          <p style={{ fontSize: '1.125rem', color: 'var(--fg-muted)', marginTop: '0.5rem' }}>AAW Group Operational Digital Twin | FY 2025-26 Performance Suite</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem' }}>
            <Calendar size={18} /> FY SHIFT
          </button>
          <button className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontWeight: 800 }}>
            <Download size={18} /> GENERATE REPORT
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        background: 'var(--bg-subtle)',
        padding: '0.4rem',
        borderRadius: 'var(--radius-lg)',
        marginBottom: '4rem',
        border: '1px solid var(--border-base)',
        width: 'fit-content'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '1rem 2rem',
              background: activeTab === tab.id ? 'var(--bg-surface)' : 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: activeTab === tab.id ? 'var(--fg-base)' : 'var(--fg-muted)',
              fontWeight: 800,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              boxShadow: activeTab === tab.id ? 'var(--shadow-md)' : 'none',
              transition: 'all 0.3s ease'
            }}
          >
            <tab.icon size={18} color={activeTab === tab.id ? 'var(--accent-fg)' : 'inherit'} /> {tab.label.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="tab-viewport">
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem', marginBottom: '4rem' }}>
              {[
                { label: 'Managed Records', value: '346', sub: '+12.4% vs prev qtr', icon: Database, color: 'var(--accent-fg)', trend: 'up' },
                { label: 'Completion Velocity', value: '88.1%', sub: 'Target Range: 85-95%', icon: Zap, color: 'var(--success-fg)', trend: 'stable' },
                { label: 'Active Exposure', value: '41', sub: 'Action required in 48h', icon: Activity, color: 'var(--warning-fg)', trend: 'down' },
                { label: 'Severe Breaches', value: '07', sub: 'HNVL Protocol Active', icon: ShieldAlert, color: 'var(--danger-fg)', trend: 'up' }
              ].map((kpi, i) => (
                <div key={i} className="card" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '0.75rem', background: `${kpi.color}15`, borderRadius: 'var(--radius-md)', color: kpi.color }}>
                      <kpi.icon size={28} />
                    </div>
                    <ArrowUpRight size={20} color="var(--fg-faint)" />
                  </div>
                  <div style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.02em' }}>{kpi.value}</div>
                  <div className="overline" style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--fg-base)' }}>{kpi.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--fg-faint)', marginTop: '0.25rem' }}>{kpi.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '8fr 4fr', gap: '2rem' }}>
              <ChartWrapper id="premium-area" title="Lifecycle Velocity Matrix" subtitle="Operational incident load vs Formal claim conversion">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { m: 'Oct', v: 45, c: 8 }, { m: 'Nov', v: 52, c: 12 }, { m: 'Dec', v: 68, c: 15 },
                    { m: 'Jan', v: 34, c: 9 }, { m: 'Feb', v: 45, c: 11 }, { m: 'Mar', v: 60, c: 14 }
                  ]}>
                    <defs>
                      <linearGradient id="colorAccent" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--accent-fg)" stopOpacity={0.3} /><stop offset="95%" stopColor="var(--accent-fg)" stopOpacity={0} /></linearGradient>
                      <linearGradient id="colorDanger" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--danger-fg)" stopOpacity={0.1} /><stop offset="95%" stopColor="var(--danger-fg)" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeOpacity={0.05} />
                    <XAxis dataKey="m" axisLine={false} tickLine={false} dy={10} stroke="var(--fg-faint)" />
                    <YAxis axisLine={false} tickLine={false} stroke="var(--fg-faint)" />
                    <Tooltip content={<CustomTooltip />} />
                    <Area name="System Records" type="monotone" dataKey="v" stroke="var(--accent-fg)" strokeWidth={4} fill="url(#colorAccent)" />
                    <Area name="Formal Claims" type="monotone" dataKey="c" stroke="var(--danger-fg)" strokeWidth={2} strokeDasharray="5 5" fill="url(#colorDanger)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartWrapper>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div className="card" style={{ padding: '2.5rem', background: 'var(--fg-base)', color: '#fff' }}>
                  <Target size={32} color="var(--accent-fg)" style={{ marginBottom: '1.5rem' }} />
                  <h3 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 900, marginBottom: '1rem' }}>SLA Target Audit</h3>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', marginBottom: '2rem' }}>Currently tracking at 92% adherence to the AAW Claim Notification SLA.</p>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '92%', height: '100%', background: 'var(--accent-fg)' }} />
                  </div>
                </div>
                <div className="card" style={{ padding: '2.5rem' }}>
                  <h3 style={{ fontWeight: 900, marginBottom: '1.5rem' }}>Risk Concentration</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {riskLevels.map((r, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 800 }}>
                          <span>{r.level}</span>
                          <span style={{ color: r.color }}>{r.count}</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'var(--bg-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${(r.count / 200) * 100}%`, height: '100%', background: r.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VAULT SUMMARY TAB */}
        {activeTab === 'vault' && (
          <div className="fade-in">
            <div style={{ marginBottom: '4rem' }}>
              <ChartWrapper id="vault-primary-grad" title="Divisional Operation Load" subtitle="Comparative throughput analysis (Non-Stacked Executive View)">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vaultMatrix} barGap={12}>
                    <defs>
                      <linearGradient id="grad-open" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--danger-fg)" /><stop offset="100%" stopColor="#ef4444aa" /></linearGradient>
                      <linearGradient id="grad-closed" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent-fg)" /><stop offset="100%" stopColor="#3b82f6aa" /></linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeOpacity={0.05} />
                    <XAxis dataKey="division" axisLine={false} tickLine={false} dy={15} fontSize={12} fontWeight={800} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" align="right" height={40} iconType="circle" />
                    <Bar name="Active Records" dataKey="open" fill="url(#grad-open)" radius={[10, 10, 0, 0]} barSize={40} />
                    <Bar name="Archived Records" dataKey="closed" fill="url(#grad-closed)" radius={[10, 10, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartWrapper>
            </div>

            <div className="card" style={{ padding: 0 }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead style={{ background: 'var(--bg-subtle)' }}>
                  <tr>
                    <th style={{ padding: '2rem', borderTopLeftRadius: 'var(--radius-lg)' }}>GROUP DIVISION</th>
                    <th style={{ padding: '2rem' }}>OPEN INCIDENTS</th>
                    <th style={{ padding: '2rem' }}>RESOLVED RECORDS</th>
                    <th style={{ padding: '2rem' }}>GROSS TOTAL</th>
                    <th style={{ padding: '2rem', borderTopRightRadius: 'var(--radius-lg)' }}>COMPLETION EFFICIENCY</th>
                  </tr>
                </thead>
                <tbody>
                  {vaultMatrix.map((row, i) => (
                    <tr key={i} className="hover-lift" style={{ borderBottom: '1px solid var(--border-base)' }}>
                      <td style={{ padding: '2rem', fontWeight: 900, color: 'var(--fg-base)' }}>{row.division}</td>
                      <td style={{ padding: '2rem', color: 'var(--danger-fg)', fontWeight: 900 }}>{row.open}</td>
                      <td style={{ padding: '2rem', color: 'var(--fg-muted)', fontWeight: 600 }}>{row.closed}</td>
                      <td style={{ padding: '2rem', fontWeight: 500 }}>{row.total}</td>
                      <td style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ flex: 1, height: '8px', background: 'var(--bg-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: row.rate, height: '100%', background: 'var(--success-fg)' }} />
                          </div>
                          <span style={{ fontWeight: 900, fontSize: '0.85rem' }}>{row.rate}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* RAW DATA TAB - THE WIDE 42 COL TABLE */}
        {activeTab === 'master' && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
              <h3 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Audit Registry</h3>
              <input type="text" className="input-field" placeholder="Search Master Log..." style={{ width: '450px', borderRadius: 'var(--radius-lg)' }} />
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto', maxHeight: '70vh' }}>
                <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-elevated)', zIndex: 10 }}>
                    <tr style={{ borderBottom: '2px solid var(--border-base)' }}>
                      {rawHeaders.map((h, i) => (
                        <th key={i} style={{ padding: '1.5rem 1rem', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap', borderRight: '1px solid var(--border-base)' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {masterData.map((row, i) => (
                      <tr key={i} className="hover-lift" style={{ borderBottom: '1px solid var(--border-base)' }}>
                        <td style={{ padding: '1.25rem 1rem', fontWeight: 900 }}>{row.v}</td>
                        <td style={{ padding: '1.25rem 1rem', color: 'var(--accent-fg)', fontWeight: 900 }}>{row.inc}</td>
                        <td style={{ padding: '1.25rem 1rem', maxWidth: '300px', fontWeight: 600 }}>{row.n}</td>
                        <td style={{ padding: '1.25rem 1rem' }}>{row.bu}</td>
                        <td style={{ padding: '1.25rem 1rem' }}><span className={`badge badge-${row.s.toLowerCase()}`}>{row.s}</span></td>
                        <td style={{ padding: '1.25rem 1rem', fontFamily: 'var(--font-mono)', opacity: 0.6 }}>{row.job}</td>
                        <td style={{ padding: '1.25rem 1rem' }}>{row.cb}</td>
                        <td style={{ padding: '1.25rem 1rem' }}>{row.dc}</td>
                        <td style={{ padding: '1.25rem 1rem', fontWeight: 900 }}>{row.cust}</td>
                        <td style={{ padding: '1.25rem 1rem' }}>{row.state}</td>
                        <td style={{ padding: '1.25rem 1rem' }}>{row.resp}</td>
                        <td style={{ padding: '1.25rem 1rem' }}>{row.liab}</td>
                        <td style={{ padding: '1.25rem 1rem' }}>{row.typ}</td>
                        <td style={{ padding: '1.25rem 1rem' }}>-</td>
                        <td style={{ padding: '1.25rem 1rem' }}>{row.cor}</td>
                        <td style={{ padding: '1.25rem 1rem' }}><span style={{ fontWeight: 900, fontSize: '0.7rem', padding: '0.3rem 0.6rem', border: '1px solid var(--border-base)', borderRadius: '4px' }}>{row.risk.toUpperCase()}</span></td>
                        <td style={{ padding: '1.25rem 1rem' }}>-</td>
                        <td style={{ padding: '1.25rem 1rem' }}>-</td>
                        <td style={{ padding: '1.25rem 1rem' }}>{row.s}</td>
                        <td style={{ padding: '1.25rem 1rem' }}>346</td>
                        <td style={{ padding: '1.25rem 1rem' }}>-</td>
                        <td style={{ padding: '1.25rem 1rem' }}>{row.day}</td>
                        <td style={{ padding: '1.25rem 1rem' }}>{row.mon}</td>
                        <td style={{ padding: '1.25rem 1rem' }}>{row.year}</td>
                        <td style={{ padding: '1.25rem 1rem' }}>{row.time}</td>
                        <td style={{ padding: '1.25rem 1rem' }}>{row.mon}</td>
                        <td style={{ padding: '1.25rem 1rem' }}>{row.m_y}</td>
                        <td style={{ padding: '1.25rem 1rem' }}>{row.q}</td>
                        <td style={{ padding: '1.25rem 1rem' }}>-</td>
                        <td style={{ padding: '1.25rem 1rem' }}>{row.dc}</td>
                        <td style={{ padding: '1.25rem 1rem', maxWidth: '200px', fontSize: '0.7rem' }}>{row.email_s}</td>
                        <td style={{ padding: '1.25rem 1rem' }}>No</td>
                        <td style={{ padding: '1.25rem 1rem' }}>SLA Met</td>
                        <td style={{ padding: '1.25rem 1rem', maxWidth: '300px', fontSize: '0.75rem' }}>{row.rem}</td>
                        <td style={{ padding: '1.25rem 1rem', fontWeight: 800 }}>{row.days}</td>
                        <td style={{ padding: '1.25rem 1rem', background: 'var(--success-bg)' }}>{row.f1}</td>
                        <td style={{ padding: '1.25rem 1rem', background: 'var(--success-bg)' }}>{row.f2}</td>
                        <td style={{ padding: '1.25rem 1rem', opacity: 0.3 }}>-</td>
                        <td style={{ padding: '1.25rem 1rem', opacity: 0.3 }}>-</td>
                        <td style={{ padding: '1.25rem 1rem', opacity: 0.3 }}>-</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* COR & COMPLIANCE TAB */}
        {activeTab === 'cor' && (
          <div className="fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: '8fr 4fr', gap: '2rem', marginBottom: '3rem' }}>
              <ChartWrapper id="cor-audit" title="Vertical Risk Distribution" subtitle="Compliance audit intensity by operational cluster">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vaultMatrix} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis dataKey="division" type="category" axisLine={false} tickLine={false} fontSize={11} fontWeight={800} width={150} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" name="Compliance Samples" fill="var(--fg-base)" barSize={25} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartWrapper>
              <div className="card" style={{ padding: '2.5rem', background: 'var(--fg-base)', color: 'var(--bg-surface)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <Scale size={32} />
                  <h3 style={{ borderBottom: '2px solid var(--accent-fg)', paddingBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 900 }}>Executive Analysis</h3>
                </div>
                <div style={{ fontSize: '0.9375rem', lineHeight: 1.8, opacity: 0.85, whiteSpace: 'pre-wrap', fontWeight: 500 }}>
                  {legalGuidance}
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '2rem', borderBottom: '1px solid var(--border-base)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 900 }}>CoR Detailed Audit Matrix (1:1 COR Sheet)</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span className="badge badge-open">HVNL s.26G</span>
                  <span className="badge badge-open">HVNL s.26H</span>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead style={{ background: 'var(--bg-subtle)' }}>
                    <tr>
                      {corHeaders.map(h => (
                        <th key={h} style={{ padding: '1.5rem', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {corDetailedData.map((row, i) => (
                      <tr key={i} className="hover-lift" style={{ borderBottom: '1px solid var(--border-base)' }}>
                        <td style={{ padding: '1.5rem', fontWeight: 900, fontSize: '0.8rem', color: 'var(--accent-fg)', maxWidth: '200px' }}>{row.ref}</td>
                        <td style={{ padding: '1.5rem', fontWeight: 600 }}>{row.cause}</td>
                        <td style={{ padding: '1.5rem' }}>{row.follow}</td>
                        <td style={{ padding: '1.5rem', fontFamily: 'monospace' }}>{row.details}</td>
                        <td style={{ padding: '1.5rem', fontWeight: 800 }}>{row.name}</td>
                        <td style={{ padding: '1.5rem' }}>
                          <span style={{ color: row.risk === 'Severe' ? 'var(--danger-fg)' : 'var(--warning-fg)', fontWeight: 900, fontSize: '0.7rem' }}>{row.risk.toUpperCase()}</span>
                        </td>
                        <td style={{ padding: '1.5rem' }}>{row.type}</td>
                        <td style={{ padding: '1.5rem', opacity: 0.6 }}>{row.dc}</td>
                        <td style={{ padding: '1.5rem' }}>{row.m}</td>
                        <td style={{ padding: '1.5rem' }}>{row.y}</td>
                        <td style={{ padding: '1.5rem', fontWeight: 900 }}>{row.q}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* NEW EXPORT TAB */}
        {activeTab === 'export' && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
              <h3 style={{ fontSize: '2rem', fontWeight: 900 }}>Operational Export Intelligence</h3>
              <button className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1rem' }}>BUILD FULL DIGITAL EXPORT</button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '2rem', borderBottom: '1px solid var(--border-base)', background: 'var(--bg-subtle)' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 900 }}>Export Preview (20 Columns - 1:1 Sheet Alignment)</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: 'var(--bg-elevated)' }}>
                    <tr>
                      {exportHeaders.map((h, i) => (
                        <th key={i} style={{ padding: '1.5rem 1.25rem', fontSize: '0.6rem', fontWeight: 900, whiteSpace: 'nowrap', textTransform: 'uppercase', borderRight: '1px solid var(--border-base)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5].map(id => (
                      <tr key={id} className="hover-lift" style={{ borderBottom: '1px solid var(--border-base)' }}>
                        <td style={{ padding: '1.25rem', borderRight: '1px solid var(--border-base)' }}><span className="badge badge-closed">Closed</span></td>
                        <td style={{ padding: '1.25rem', fontWeight: 900, borderRight: '1px solid var(--border-base)', color: 'var(--accent-fg)' }}>10{id}</td>
                        <td style={{ padding: '1.25rem', maxWidth: '250px', borderRight: '1px solid var(--border-base)', fontWeight: 600 }}>Car Damage Haval - LGWEEUA...</td>
                        <td style={{ padding: '1.25rem', borderRight: '1px solid var(--border-base)' }}>PILLA</td>
                        <td style={{ padding: '1.25rem', borderRight: '1px solid var(--border-base)' }}>Resolved</td>
                        <td style={{ padding: '1.25rem', borderRight: '1px solid var(--border-base)', opacity: 0.6 }}>S001358{id}4</td>
                        <td style={{ padding: '1.25rem', borderRight: '1px solid var(--border-base)' }}>Briannon Mott</td>
                        <td style={{ padding: '1.25rem', borderRight: '1px solid var(--border-base)' }}>31/01/2024</td>
                        <td style={{ padding: '1.25rem', borderRight: '1px solid var(--border-base)', fontWeight: 800 }}>PILLA GROUP</td>
                        <td style={{ padding: '1.25rem', borderRight: '1px solid var(--border-base)' }}>Closed - No Claim</td>
                        <td style={{ padding: '1.25rem', borderRight: '1px solid var(--border-base)' }}>Origin Agent</td>
                        <td style={{ padding: '1.25rem', borderRight: '1px solid var(--border-base)', fontSize: '0.75rem' }}>No AAW Liability</td>
                        <td style={{ padding: '1.25rem', borderRight: '1px solid var(--border-base)' }}>Cargo Damage</td>
                        <td style={{ padding: '1.25rem', borderRight: '1px solid var(--border-base)' }}>Complete</td>
                        <td style={{ padding: '1.25rem', borderRight: '1px solid var(--border-base)' }}>No</td>
                        <td style={{ padding: '1.25rem', borderRight: '1px solid var(--border-base)' }}><span style={{ color: 'var(--success-fg)', fontWeight: 900, fontSize: '0.7rem' }}>LOW</span></td>
                        <td style={{ padding: '1.25rem', borderRight: '1px solid var(--border-base)' }}>Root Cause</td>
                        <td style={{ padding: '1.25rem', borderRight: '1px solid var(--border-base)' }}>-</td>
                        <td style={{ padding: '1.25rem', borderRight: '1px solid var(--border-base)' }}>Closed</td>
                        <td style={{ padding: '1.25rem', borderRight: '1px solid var(--border-base)', fontWeight: 900 }}>346</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}} />
    </div>
  );
} 123
