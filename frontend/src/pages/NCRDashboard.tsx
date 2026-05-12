import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useIncidents } from '../hooks/useIncidents';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis } from 'recharts';
import { Link } from 'react-router-dom';

export default function NCRDashboard() {
  const { role, branchName, businessUnit } = useAuth();
  const { incidents: allIncidents, loading } = useIncidents(2000);

  // Filter for NCRs
  let ncrs = allIncidents.filter((i: any) => i.category === 'ncr' || i.type === 'Non-Conformance Report (NCR)');

  // Role-based filtering if needed (though this dashboard is admin/R&C only)
  if (role !== 'full_access' && role !== 'risk_compliance') {
    if (role === 'bu_access' && businessUnit) {
      ncrs = ncrs.filter((i: any) => i.business_unit === businessUnit || i.branch_department === businessUnit);
    } else if (branchName) {
      ncrs = ncrs.filter((i: any) => i.branch_department === branchName);
    }
  }

  // Sort by most recent
  ncrs.sort((a: any, b: any) => new Date(b.created_at || new Date()).getTime() - new Date(a.created_at || new Date()).getTime());

  // --- Calculations ---
  const totalOpen = ncrs.filter(n => n.status?.toLowerCase().includes('open')).length;
  const inProgress = ncrs.filter(n => n.status?.toLowerCase().includes('progress')).length;
  const closed = ncrs.filter(n => n.status?.toLowerCase().includes('closed')).length;

  // Branch breakdown
  const branchCounts: Record<string, number> = {};
  ncrs.forEach(n => {
    const b = n.branch_department || n.location || 'Unknown';
    branchCounts[b] = (branchCounts[b] || 0) + 1;
  });
  const branchData = Object.entries(branchCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Level breakdown
  const levelCounts: Record<string, number> = {};
  ncrs.forEach(n => {
    try {
      const descObj = typeof n.description === 'string' ? JSON.parse(n.description) : n.description;
      const lvl = descObj?.level || 'Minor';
      levelCounts[lvl] = (levelCounts[lvl] || 0) + 1;
    } catch(e) {
      levelCounts['Minor'] = (levelCounts['Minor'] || 0) + 1;
    }
  });
  const levelData = Object.entries(levelCounts).map(([name, value]) => ({ name, value }));

  // Status Pie
  const statusData = [
    { name: 'Open', value: totalOpen, color: '#ef4444' },
    { name: 'In Progress', value: inProgress, color: '#f59e0b' },
    { name: 'Closed', value: closed, color: '#10b981' }
  ].filter(x => x.value > 0);

  // BU Breakdown
  const buCounts: Record<string, number> = {};
  ncrs.forEach(n => {
    const b = n.business_unit || 'Operations';
    buCounts[b] = (buCounts[b] || 0) + 1;
  });
  const buData = Object.entries(buCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Fault Party
  const faultData = ncrs.length > 0 ? [{ name: 'AAW (internal)', value: ncrs.length }] : [];

  // Monthly Trend
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyMap: Record<string, number> = {};
  ncrs.forEach(n => {
    try {
      const d = new Date(n.date || n.created_at);
      const key = monthNames[d.getMonth()];
      if (key) monthlyMap[key] = (monthlyMap[key] || 0) + 1;
    } catch {}
  });
  const monthlyData = Object.entries(monthlyMap).map(([name, value]) => ({ name, value }));

  const recentTable = ncrs.slice(0, 5);

  const getStatusColor = (s: string) => {
    const sl = s?.toLowerCase() || '';
    if (sl.includes('open')) return 'var(--danger-bg)';
    if (sl.includes('progress')) return 'var(--warning-bg)';
    if (sl.includes('closed') || sl.includes('resolved')) return 'var(--success-bg)';
    if (sl.includes('overdue')) return '#ffe4e6';
    return '#f1f5f9';
  };
  const getStatusFg = (s: string) => {
    const sl = s?.toLowerCase() || '';
    if (sl.includes('open')) return 'var(--danger-fg)';
    if (sl.includes('progress')) return 'var(--warning-fg)';
    if (sl.includes('closed') || sl.includes('resolved')) return 'var(--success-fg)';
    if (sl.includes('overdue')) return '#e11d48';
    return '#475569';
  };
  
  const getLevelColor = (l: string) => {
    if (l === 'Major') return '#fca5a5';
    if (l === 'Minor') return '#fcd34d';
    if (l === 'Observation') return '#bfdbfe';
    if (l === 'OFI') return '#d9f99d';
    return '#e2e8f0';
  };
  const getLevelFg = (l: string) => {
    if (l === 'Major') return '#991b1b';
    if (l === 'Minor') return '#92400e';
    if (l === 'Observation') return '#1e40af';
    if (l === 'OFI') return '#3f6212';
    return '#475569';
  };

  const getLevelBarColor = (l: string) => {
    if (l === 'Major') return '#ef4444';
    if (l === 'Minor') return '#f59e0b';
    if (l === 'Observation') return '#3b82f6';
    if (l === 'OFI') return '#84cc16';
    return '#94a3b8';
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading NCR Intelligence...</div>;

  return (
    <div className="fade-in" style={{ paddingBottom: '3rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border-base)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--fg-base)' }}>NCR & CAPA dashboard</h2>
        </div>
        <div style={{ fontSize: '0.875rem', color: 'var(--fg-muted)', fontWeight: 500 }}>
          Last updated: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} | AAW Group — All branches
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#f8f7f5', padding: '1.25rem', borderRadius: '4px', border: '1px solid #e5e5e5' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>TOTAL OPEN</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 400, color: '#d94b4b', lineHeight: 1 }}>{totalOpen}</div>
          <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>awaiting resolution</div>
        </div>
        <div style={{ background: '#f8f7f5', padding: '1.25rem', borderRadius: '4px', border: '1px solid #e5e5e5' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>IN PROGRESS</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 400, color: '#c4892c', lineHeight: 1 }}>{inProgress}</div>
          <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>under investigation</div>
        </div>
        <div style={{ background: '#f8f7f5', padding: '1.25rem', borderRadius: '4px', border: '1px solid #e5e5e5' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>CLOSED THIS MONTH</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 400, color: '#4a9c6d', lineHeight: 1 }}>{closed}</div>
          <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>resolved this period</div>
        </div>
        <div style={{ background: '#f8f7f5', padding: '1.25rem', borderRadius: '4px', border: '1px solid #e5e5e5' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>CAPA VERIFIED</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 400, color: '#3182ce', lineHeight: 1 }}>{ncrs.length > 0 ? '100%' : '0%'}</div>
          <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>effectiveness rate</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '5fr 3fr', gap: '1rem', marginBottom: '1.5rem' }}>
        
        {/* NCRS by Branch */}
        <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '4px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>NCRS BY BRANCH</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {branchData.slice(0, 5).map((b, i) => {
              const max = Math.max(...branchData.map(d => d.value));
              const pct = (b.value / max) * 100;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '80px', textAlign: 'right', fontSize: '0.8rem', color: '#333' }}>{b.name}</div>
                  <div style={{ flex: 1, height: '14px', background: '#f0f0f0', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#3b82f6', borderRadius: '2px' }} />
                  </div>
                  <div style={{ width: '20px', fontSize: '0.8rem', color: '#333', textAlign: 'right' }}>{b.value}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Breakdown */}
        <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '4px', padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666', letterSpacing: '0.05em', marginBottom: '1rem' }}>STATUS BREAKDOWN</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '2rem' }}>
            <div style={{ width: '120px', height: '120px', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} innerRadius={40} outerRadius={55} dataKey="value" stroke="none">
                    {statusData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 600, lineHeight: 1 }}>{totalOpen + inProgress + closed}</span>
                <span style={{ fontSize: '0.65rem', color: '#666' }}>total</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {statusData.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#333' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
                  <span style={{ flex: 1, minWidth: '70px' }}>{s.name}</span>
                  <span style={{ fontWeight: 600 }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        
        {/* Monthly Trend */}
        <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '4px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>MONTHLY TREND — NCRS RAISED</div>
          <div style={{ height: '140px', width: '100%' }}>
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#666' }} dy={5} />
                   <Tooltip cursor={{ fill: '#f8f9fa' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                   <Bar dataKey="value" fill="#93c5fd" radius={[2, 2, 0, 0]}>
                     {monthlyData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === monthlyData.length - 1 ? '#3b82f6' : '#bfdbfe'} />
                     ))}
                   </Bar>
                </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* NCRS by Level */}
        <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '4px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>NCRS BY LEVEL</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {levelData.map((b: any, i) => {
              const max = Math.max(...levelData.map((d: any) => d.value));
              const pct = (b.value / max) * 100;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '80px', textAlign: 'right', fontSize: '0.8rem', color: '#333' }}>{b.name}</div>
                  <div style={{ flex: 1, height: '12px', background: '#f4f4f5', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: getLevelBarColor(b.name), borderRadius: '2px' }} />
                  </div>
                  <div style={{ width: '20px', fontSize: '0.8rem', color: '#333', textAlign: 'right' }}>{b.value}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent NCRs Table */}
      <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '4px', padding: '1.25rem', marginBottom: '1.5rem', overflowX: 'auto' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666', letterSpacing: '0.05em', marginBottom: '1rem' }}>MOST RECENT NCRS</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ color: '#666', borderBottom: '1px solid #eee' }}>
              <th style={{ padding: '0.5rem', fontWeight: 500 }}>Number</th>
              <th style={{ padding: '0.5rem', fontWeight: 500 }}>Date</th>
              <th style={{ padding: '0.5rem', fontWeight: 500 }}>Branch</th>
              <th style={{ padding: '0.5rem', fontWeight: 500 }}>BU</th>
              <th style={{ padding: '0.5rem', fontWeight: 500 }}>Description</th>
              <th style={{ padding: '0.5rem', fontWeight: 500 }}>Level</th>
              <th style={{ padding: '0.5rem', fontWeight: 500 }}>Status</th>
            </tr>
          </thead>
          <tbody>
              {recentTable.map((row: any, i) => {
                let parsedDesc = row.description;
                let parsedLvl = 'Minor';
                let parsedBU = row.business_unit || row.branch_department || 'Operations';
                try {
                  const d = typeof row.description === 'string' ? JSON.parse(row.description) : row.description;
                  parsedDesc = d?.description || d?.incident_summary || row.description || 'N/A';
                  parsedLvl = d?.level || 'Minor';
                  parsedBU = d?.business_unit || d?.branch_department || row.business_unit || row.branch_department || 'Operations';
                } catch(e) {
                  // Fallback
                }
                return (
                <tr key={i} style={{ borderBottom: i === recentTable.length - 1 ? 'none' : '1px solid #f5f5f5' }}>
                  <td style={{ padding: '0.75rem 0.5rem', color: '#333' }}>
                    <Link to={`/incidents/${row.id}`} style={{color:'inherit'}}>{row.incident_number_str || `NCR-${String(row.id).split('-')[0]}`}</Link>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', color: '#666' }}>
                    {new Date(row.created_at).toLocaleDateString('en-GB')}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', color: '#333' }}>{row.branch || row.location}</td>
                  <td style={{ padding: '0.75rem 0.5rem', color: '#333' }}>{parsedBU}</td>
                  <td style={{ padding: '0.75rem 0.5rem', color: '#666', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{parsedDesc}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 500, background: getLevelColor(parsedLvl), color: getLevelFg(parsedLvl) }}>
                      {parsedLvl}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 500, background: getStatusColor(row.status), color: getStatusFg(row.status) }}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              )})}
              {recentTable.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>No NCR records found</td>
                </tr>
              )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {/* NCRS by Business Unit */}
        <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '4px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>NCRS BY BUSINESS UNIT</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {buData.map((b, i) => {
              const max = Math.max(...buData.map(d => d.value));
              const pct = (b.value / max) * 100;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '80px', textAlign: 'left', fontSize: '0.8rem', color: '#333' }}>{b.name}</div>
                  <div style={{ flex: 1, height: '10px', background: '#f0f0f0', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#7dd3fc', borderRadius: '2px' }} />
                  </div>
                  <div style={{ width: '20px', fontSize: '0.8rem', color: '#333', textAlign: 'right' }}>{b.value}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* At Fault Party */}
        <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '4px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>AT FAULT PARTY</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {faultData.map((b, i) => {
              const max = Math.max(...faultData.map(d => d.value));
              const pct = (b.value / max) * 100;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '80px', textAlign: 'left', fontSize: '0.8rem', color: '#333' }}>{b.name}</div>
                  <div style={{ flex: 1, height: '10px', background: '#f0f0f0', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#fbbf24', borderRadius: '2px' }} />
                  </div>
                  <div style={{ width: '20px', fontSize: '0.8rem', color: '#333', textAlign: 'right' }}>{b.value}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CAPA Completion Health */}
        <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '4px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>CAPA COMPLETION HEALTH</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {[
              { label: 'Target date met', num: ncrs.length > 0 ? 100 : 0, color: '#65a30d' },
              { label: 'Risk register updated', num: ncrs.length > 0 ? 100 : 0, color: '#f59e0b' },
              { label: 'QMS procedure updated', num: ncrs.length > 0 ? 100 : 0, color: '#f87171' },
              { label: 'Effectiveness verified', num: ncrs.length > 0 ? 100 : 0, color: '#4d7c0f' },
            ].map((c, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#333', marginBottom: '4px' }}>
                  <span>{c.label}</span>
                  <span>{c.num}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#f4f4f5', borderRadius: '3px', overflow: 'hidden' }}>
                   <div style={{ width: `${c.num}%`, height: '100%', background: c.color, borderRadius: '3px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
    </div>
  );
}
