import { useAuth } from '../context/AuthContext';
import { useIncidents } from '../hooks/useIncidents';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis } from 'recharts';
import { Link } from 'react-router-dom';

export default function ICDashboard() {
  const { role, branchName, businessUnit } = useAuth();
  const { incidents: allIncidents, loading } = useIncidents(2000);

  // Exclude NCRs — this dashboard is for I&C only
  let incidents = allIncidents.filter((i: any) => {
    const cat = i.category || '';
    const t = (i.type || '').toLowerCase();
    return cat !== 'ncr' && !t.includes('non-conformance') && !t.includes('ncr');
  });

  // RBAC
  if (role !== 'full_access' && role !== 'risk_compliance') {
    if (role === 'bu_access' && businessUnit) {
      incidents = incidents.filter((i: any) => i.business_unit === businessUnit || i.branch_department === businessUnit);
    } else if (branchName) {
      incidents = incidents.filter((i: any) => i.branch_department === branchName);
    }
  }

  incidents.sort((a: any, b: any) => new Date(b.created_at || b.date || 0).getTime() - new Date(a.created_at || a.date || 0).getTime());

  // --- KPI Calculations ---
  const totalOpen = incidents.filter(n => n.status?.toLowerCase().includes('open')).length;
  const inProgress = incidents.filter(n => n.status?.toLowerCase().includes('review') || n.status?.toLowerCase().includes('progress')).length;
  const closed = incidents.filter(n => n.status?.toLowerCase().includes('closed')).length;
  const claimCount = incidents.filter(n => n.formal_claim_issued === 'Yes').length;
  const corCount = incidents.filter(n => n.cor_required === 'Yes').length;

  // Branch breakdown
  const branchCounts: Record<string, number> = {};
  incidents.forEach(n => {
    const b = n.branch_department || n.location || 'Unknown';
    branchCounts[b] = (branchCounts[b] || 0) + 1;
  });
  const branchData = Object.entries(branchCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Type breakdown
  const typeCounts: Record<string, number> = {};
  incidents.forEach(n => {
    const t = n.type || 'Unknown';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });
  const typeData = Object.entries(typeCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Status Pie
  const statusData = [
    { name: 'Open', value: totalOpen, color: '#ef4444' },
    { name: 'In Progress / Review', value: inProgress, color: '#f59e0b' },
    { name: 'Closed', value: closed, color: '#10b981' }
  ].filter(x => x.value > 0);

  // Monthly Trend
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyMap: Record<string, number> = {};
  incidents.forEach(n => {
    try {
      const d = new Date(n.date || n.created_at);
      const key = monthNames[d.getMonth()];
      if (key) monthlyMap[key] = (monthlyMap[key] || 0) + 1;
    } catch (e) {}
  });
  const monthlyData = Object.entries(monthlyMap).map(([name, value]) => ({ name, value }));

  const recentTable = incidents.slice(0, 8);

  const getStatusColor = (s: string) => {
    const sl = s?.toLowerCase() || '';
    if (sl.includes('open')) return 'var(--danger-bg)';
    if (sl.includes('progress') || sl.includes('review')) return 'var(--warning-bg)';
    if (sl.includes('closed') || sl.includes('resolved')) return 'var(--success-bg)';
    return '#f1f5f9';
  };
  const getStatusFg = (s: string) => {
    const sl = s?.toLowerCase() || '';
    if (sl.includes('open')) return 'var(--danger-fg)';
    if (sl.includes('progress') || sl.includes('review')) return 'var(--warning-fg)';
    if (sl.includes('closed') || sl.includes('resolved')) return 'var(--success-fg)';
    return '#475569';
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading Incidents & Claims Intelligence...</div>;

  return (
    <div className="fade-in" style={{ paddingBottom: '3rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border-base)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--fg-base)' }}>Incidents & Claims Dashboard</h2>
        </div>
        <div style={{ fontSize: '0.875rem', color: 'var(--fg-muted)', fontWeight: 500 }}>
          Last updated: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} | AAW Group — All branches
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#f8f7f5', padding: '1.25rem', borderRadius: '4px', border: '1px solid #e5e5e5' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>TOTAL OPEN</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 400, color: '#d94b4b', lineHeight: 1 }}>{totalOpen}</div>
          <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>incidents requiring action</div>
        </div>
        <div style={{ background: '#f8f7f5', padding: '1.25rem', borderRadius: '4px', border: '1px solid #e5e5e5' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>UNDER REVIEW</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 400, color: '#c4892c', lineHeight: 1 }}>{inProgress}</div>
          <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>being investigated</div>
        </div>
        <div style={{ background: '#f8f7f5', padding: '1.25rem', borderRadius: '4px', border: '1px solid #e5e5e5' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>CLOSED</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 400, color: '#4a9c6d', lineHeight: 1 }}>{closed}</div>
          <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>resolved incidents</div>
        </div>
        <div style={{ background: '#f8f7f5', padding: '1.25rem', borderRadius: '4px', border: '1px solid #e5e5e5' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>ACTIVE CLAIMS</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 400, color: '#ef4444', lineHeight: 1 }}>{claimCount}</div>
          <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>formal claims issued</div>
        </div>
        <div style={{ background: '#f8f7f5', padding: '1.25rem', borderRadius: '4px', border: '1px solid #e5e5e5' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>COR FLAGGED</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 400, color: '#f59e0b', lineHeight: 1 }}>{corCount}</div>
          <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>chain of responsibility</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '5fr 3fr', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Incidents by Branch */}
        <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '4px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>INCIDENTS BY BRANCH</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {branchData.slice(0, 6).map((b, i) => {
              const max = Math.max(...branchData.map(d => d.value));
              const pct = (b.value / max) * 100;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '100px', textAlign: 'right', fontSize: '0.8rem', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
                  <div style={{ flex: 1, height: '14px', background: '#f0f0f0', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#6366f1', borderRadius: '2px' }} />
                  </div>
                  <div style={{ width: '20px', fontSize: '0.8rem', color: '#333', textAlign: 'right' }}>{b.value}</div>
                </div>
              );
            })}
            {branchData.length === 0 && <div style={{ color: '#999', fontSize: '0.8rem' }}>No data yet</div>}
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
                <span style={{ fontSize: '1.25rem', fontWeight: 600, lineHeight: 1 }}>{incidents.length}</span>
                <span style={{ fontSize: '0.65rem', color: '#666' }}>total</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {statusData.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#333' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
                  <span style={{ flex: 1, minWidth: '100px' }}>{s.name}</span>
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
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>MONTHLY TREND — INCIDENTS RAISED</div>
          <div style={{ height: '140px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#666' }} dy={5} />
                <Tooltip cursor={{ fill: '#f8f9fa' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="value" fill="#93c5fd" radius={[2, 2, 0, 0]}>
                  {monthlyData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === monthlyData.length - 1 ? '#6366f1' : '#c7d2fe'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Incidents by Type */}
        <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '4px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>INCIDENTS BY TYPE</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {typeData.slice(0, 5).map((b, i) => {
              const max = Math.max(...typeData.map(d => d.value));
              const pct = (b.value / max) * 100;
              const typeColors = ['#6366f1', '#f59e0b', '#ef4444', '#10b981', '#06b6d4'];
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '120px', textAlign: 'right', fontSize: '0.75rem', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
                  <div style={{ flex: 1, height: '12px', background: '#f4f4f5', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: typeColors[i % typeColors.length], borderRadius: '2px' }} />
                  </div>
                  <div style={{ width: '20px', fontSize: '0.8rem', color: '#333', textAlign: 'right' }}>{b.value}</div>
                </div>
              );
            })}
            {typeData.length === 0 && <div style={{ color: '#999', fontSize: '0.8rem' }}>No data yet</div>}
          </div>
        </div>
      </div>

      {/* Recent Incidents Table */}
      <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '4px', padding: '1.25rem', overflowX: 'auto' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666', letterSpacing: '0.05em', marginBottom: '1rem' }}>MOST RECENT INCIDENTS</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ color: '#666', borderBottom: '1px solid #eee' }}>
              <th style={{ padding: '0.5rem', fontWeight: 500 }}>Reference</th>
              <th style={{ padding: '0.5rem', fontWeight: 500 }}>Date</th>
              <th style={{ padding: '0.5rem', fontWeight: 500 }}>Type</th>
              <th style={{ padding: '0.5rem', fontWeight: 500 }}>Branch</th>
              <th style={{ padding: '0.5rem', fontWeight: 500 }}>Description</th>
              <th style={{ padding: '0.5rem', fontWeight: 500 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentTable.map((row: any, i) => (
              <tr key={i} style={{ borderBottom: i === recentTable.length - 1 ? 'none' : '1px solid #f5f5f5' }}>
                <td style={{ padding: '0.75rem 0.5rem', color: '#333' }}>
                  <Link to={`/incidents/${row.id}`} style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}>
                    {row.incident_number_str || `INC-${row.id}`}
                  </Link>
                </td>
                <td style={{ padding: '0.75rem 0.5rem', color: '#666' }}>
                  {row.date || (row.created_at ? new Date(row.created_at).toLocaleDateString('en-GB') : 'N/A')}
                </td>
                <td style={{ padding: '0.75rem 0.5rem', color: '#333' }}>{row.type || 'N/A'}</td>
                <td style={{ padding: '0.75rem 0.5rem', color: '#333' }}>{row.branch_department || row.location || 'N/A'}</td>
                <td style={{ padding: '0.75rem 0.5rem', color: '#666', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {row.description || 'N/A'}
                </td>
                <td style={{ padding: '0.75rem 0.5rem' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 500, background: getStatusColor(row.status), color: getStatusFg(row.status) }}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
