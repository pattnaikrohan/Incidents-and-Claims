import { ShieldAlert, CheckCircle, Activity, TrendingUp, TrendingDown, Zap, Database } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, BarChart, Bar } from 'recharts';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useIncidents } from '../hooks/useIncidents';
import { ChartWrapper } from '../components/ChartWrapper';

export default function Dashboard() {
  const { role, branchName, businessUnit } = useAuth();
  const { incidents: rawIncidents, loading } = useIncidents(2000);
  
  // ── Fuzzy matching helpers ───────────────────────────────────
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
    'Coastalbridge': ['coastalbridge'], 'Coastalbridge Agencies': ['coastalbridge agencies'],
    'PIL Logistics Australia': ['pil', 'pilla'], 'Regional Shipping Services': ['rss', 'regional shipping'],
    'Hoyer Logistics Australia': ['hoyer', 'hla'], 'ILM': ['ilm', 'international logistics'],
    'IT & Security': ['it & security', 'it and security'], 'Finance': ['finance'],
    'Risk & Compliance': ['risk & compliance', 'risk and compliance'], 'People & Safety': ['people & safety', 'people and safety'],
  };
  const BU_HIERARCHY: Record<string, string[]> = {
    'AAW Group Holdings': ['IT & Security', 'Finance', 'Risk & Compliance', 'People & Safety'],
    'AAW Global Logistics - AU': ['AAW Global Logistics - Melbourne', 'AAW Global Logistics - Sydney', 'AAW Global Logistics - Brisbane', 'AAW Global Logistics - Adelaide', 'AAW Global Logistics - Fremantle', 'AAW Customs Brokerage', 'AAW Project Logistics'],
    'AAW Global Logistics - NZ': ['AAW Global Logistics - Auckland'], 'AAW Bulk Liquid Logistics': ['AAW Bulk Liquid Logistics Team'],
    'Hoyer Logistics Australia': ['Hoyer Logistics Australia'], 'Coastalbridge': ['Coastalbridge', 'Coastalbridge Agencies'],
    'Regional Shipping Services': ['PIL Logistics Australia', 'Regional Shipping Services'], 'International Logistics Management': ['ILM'],
  };
  const matchesBranch = (incBr: string, userBr: string) => {
    if (!incBr || !userBr) return false;
    const a = incBr.toLowerCase().trim(), b = userBr.toLowerCase().trim();
    if (a === b || a.includes(b) || b.includes(a)) return true;
    return (BRANCH_KEYWORDS[userBr] || []).some(kw => a.includes(kw) || a === kw);
  };
  const matchesBU = (incBU: string, incBr: string, userBU: string) => {
    if (!userBU) return false;
    const bu = userBU.toLowerCase().trim();
    if (incBU && (incBU.toLowerCase().trim() === bu || incBU.toLowerCase().includes(bu) || bu.includes(incBU.toLowerCase()))) return true;
    if (incBr) {
      for (const [fb] of Object.entries(BRANCH_KEYWORDS)) {
        const bbu = Object.entries(BU_HIERARCHY).find(([, br]) => br.includes(fb))?.[0];
        if (bbu && bbu.toLowerCase() === bu && matchesBranch(incBr, fb)) return true;
      }
    }
    return false;
  };

  // Apply RBAC
  let incidents = rawIncidents;
  if (role !== 'full_access' && role !== 'risk_compliance') {
    if (role === 'bu_access' && businessUnit) {
      incidents = incidents.filter((i: any) => matchesBU(i.business_unit, i.branch_department, businessUnit));
    } else if (role === 'branch_access' && branchName) {
      incidents = incidents.filter((i: any) => matchesBranch(i.branch_department, branchName));
    } else if (role === 'hr_access') {
      incidents = incidents.filter((i: any) => { const c = (i.category||'').toLowerCase(); const t = (i.type||'').toLowerCase(); return c==='hr'||c==='whs'||t.includes('human')||t.includes('hr')||t.includes('whs')||t.includes('safety'); });
    } else if (role === 'it_access') {
      incidents = incidents.filter((i: any) => { const c = (i.category||'').toLowerCase(); const t = (i.type||'').toLowerCase(); return c==='it'||t.includes('it')||t.includes('security')||t.includes('cyber'); });
    } else if (role === 'finance_access') {
      incidents = incidents.filter((i: any) => { const c = (i.category||'').toLowerCase(); const t = (i.type||'').toLowerCase(); return c==='finance'||t.includes('finance')||t.includes('travel'); });
    } else {
      incidents = [];
    }
  }

  // Calculate stats directly from live data
  const totalOpen = incidents.filter(i => i.status?.toLowerCase().includes('open')).length;
  const totalClosed = incidents.filter(i => i.status?.toLowerCase().includes('closed')).length;
  const totalReview = incidents.filter(i => i.status?.toLowerCase().includes('review') || i.status?.toLowerCase().includes('progress')).length;
  const monitoredCount = incidents.length;

  const typeMap = new Map<string, number>();
  incidents.forEach(i => {
    const t = i.type || 'Unknown';
    typeMap.set(t, (typeMap.get(t) || 0) + 1);
  });
  
  const categoryData = Array.from(typeMap.entries()).map(([name, value], idx) => ({
    name,
    value,
    fill: ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#8b5cf6'][idx % 6]
  })).sort((a, b) => b.value - a.value);

  const ncrOpen = incidents.filter(i => (i.category === 'ncr' || (i.type || '').toLowerCase().includes('ncr')) && i.status?.toLowerCase().includes('open')).length;
  const ncrClosed = incidents.filter(i => (i.category === 'ncr' || (i.type || '').toLowerCase().includes('ncr')) && i.status?.toLowerCase().includes('closed')).length;
  const claimOpen = incidents.filter(i => i.formal_claim_issued === 'Yes' && !i.status?.toLowerCase().includes('closed')).length;
  const claimClosed = incidents.filter(i => i.formal_claim_issued === 'Yes' && i.status?.toLowerCase().includes('closed')).length;
  const corOpen = incidents.filter(i => i.cor_required === 'Yes' && !i.status?.toLowerCase().includes('closed')).length;
  const corClosed = incidents.filter(i => i.cor_required === 'Yes' && i.status?.toLowerCase().includes('closed')).length;

  const stats = [
    { title: 'Total Active Records', value: totalOpen, icon: Activity, color: 'var(--accent-fg)', trend: 'Live', up: true },
    { title: 'Requires Critical Review', value: totalReview, icon: ShieldAlert, color: 'var(--danger-fg)', trend: 'Live', up: true },
    { title: 'Closed Records', value: totalClosed, icon: CheckCircle, color: 'var(--success-fg)', trend: 'Live', up: false },
    { title: 'Total Fleet Logs', value: monitoredCount, icon: Database, color: 'var(--primary)', trend: 'System', up: true },
  ];

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
          zIndex: 100
        }}>
          <p style={{ margin: 0, fontWeight: 900, fontSize: '0.875rem', color: 'var(--fg-base)', marginBottom: '0.5rem' }}>{label}</p>
          {payload.map((p: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color || p.fill }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--fg-muted)' }}>{p.name}: </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--fg-base)' }}>{p.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) return (
    <div style={{ padding: '8rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <Activity className="animate-pulse" size={48} color="var(--accent-fg)" />
      <div className="overline" style={{ fontSize: '0.75rem', letterSpacing: '0.2em' }}>Establishing Secure Connection...</div>
      <div style={{ fontSize: '0.875rem', color: 'var(--fg-muted)' }}>Retrieving operational intelligence for your cluster.</div>
    </div>
  );

  // Monthly Trend Calculation
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyMap = new Map<string, { name: string; incidents: number; resolved: number }>();
  monthNames.forEach(m => monthlyMap.set(m, { name: m, incidents: 0, resolved: 0 }));

  incidents.forEach(i => {
    try {
      const d = new Date(i.date || i.created_at);
      const key = monthNames[d.getMonth()];
      if (key && monthlyMap.has(key)) {
        const entry = monthlyMap.get(key)!;
        entry.incidents += 1;
        if (i.status?.toLowerCase().includes('closed')) {
          entry.resolved += 1;
        }
      }
    } catch {}
  });

  const monthlyData = Array.from(monthlyMap.values());

  return (
    <div className="fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Dynamic Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', justifyContent: 'center' }}>
             <Zap size={16} color="var(--accent-fg)" fill="var(--accent-fg)" />
             <span style={{ fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.1em', color: 'var(--accent-fg)' }}>R&C HUB</span>
          </div>
          <h2 style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.03em', background: 'linear-gradient(135deg, var(--fg-base) 0%, var(--fg-muted) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {branchName ? branchName.split(' - ').pop() : businessUnit ? businessUnit : 'Global'} Dashboard
          </h2>
          <p style={{ color: 'var(--fg-muted)', fontSize: '1.125rem', maxWidth: '600px' }}>
            Live {branchName || businessUnit || 'global'} risk monitoring and automated incident distribution analysis.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="card" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
             <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success-fg)', boxShadow: '0 0 10px var(--success-fg)' }} className="animate-pulse" />
             <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--fg-muted)' }}>NETWORK ONLINE</span>
          </div>
          <Link to="/incidents/new" className="btn btn-primary" style={{ height: '48px', textDecoration: 'none', padding: '0 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 10px 20px -10px var(--accent-fg)' }}>
            <Zap size={18} fill="currentColor" />
            <span>New Log Entry</span>
          </Link>
        </div>
      </div>

      <div className="bento-grid">
        {/* KPI Cards */}
        {stats.map((stat, i) => (
          <div key={i} className="card hover-tilt" style={{ gridColumn: 'span 3', padding: '2rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '120px', height: '120px', background: `${stat.color}05`, borderRadius: '50%', zIndex: 0 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}>
               <div style={{ padding: '0.75rem', background: `${stat.color}15`, color: stat.color, borderRadius: '1rem' }}>
                  <stat.icon size={26} />
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: stat.up ? 'var(--danger-fg)' : 'var(--success-fg)', fontSize: '0.75rem', fontWeight: 900, padding: '0.35rem 0.75rem', borderRadius: '2rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                  {stat.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {stat.trend}
               </div>
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1, position: 'relative', zIndex: 1, letterSpacing: '-0.05em' }}>{stat.value}</div>
            <div className="overline" style={{ marginTop: '0.5rem', opacity: 0.8, fontWeight: 700, fontSize: '0.7rem', color: 'var(--fg-muted)', position: 'relative', zIndex: 1 }}>{stat.title.toUpperCase()}</div>
          </div>
        ))}

        {/* Consolidated Open / Closed KPIs */}
        <div className="card" style={{ gridColumn: 'span 12', padding: '2rem' }}>
          <div className="overline" style={{ marginBottom: '1.5rem', fontWeight: 700, fontSize: '0.7rem', color: 'var(--fg-muted)' }}>CONSOLIDATED STATUS OVERVIEW</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
            {[
              { label: 'Incidents', open: totalOpen, closed: totalClosed, color: '#6366f1' },
              { label: 'NCRs', open: ncrOpen, closed: ncrClosed, color: '#eab308' },
              { label: 'Claims', open: claimOpen, closed: claimClosed, color: '#ef4444' },
              { label: 'CoRs', open: corOpen, closed: corClosed, color: '#f59e0b' },
            ].map((item, i) => (
              <div key={i} style={{ padding: '1.25rem', borderRadius: 12, border: `1px solid ${item.color}20`, background: `${item.color}05` }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: item.color, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>{item.open}</div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--fg-muted)', marginTop: '0.25rem' }}>OPEN</div>
                  </div>
                  <div style={{ width: '1px', height: '40px', background: 'var(--border-base)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981', lineHeight: 1 }}>{item.closed}</div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--fg-muted)', marginTop: '0.25rem' }}>CLOSED</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Operational Trend Chart */}
        <div style={{ gridColumn: 'span 8', gridRow: 'span 2', minHeight: '400px' }}>
           <ChartWrapper id="main-trend-grad" title="Cluster Resolution Velocity" subtitle="Incident capture vs Finalized records (6 Month Rolling Data)">
              <div style={{ width: '100%', height: '320px', minHeight: '320px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="primeArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--accent-fg)" stopOpacity={0.4}/><stop offset="95%" stopColor="var(--accent-fg)" stopOpacity={0}/></linearGradient>
                      <linearGradient id="succArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--success-fg)" stopOpacity={0.3}/><stop offset="95%" stopColor="var(--success-fg)" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.1} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} dy={10} fontSize={11} fontWeight={800} stroke="var(--fg-faint)" />
                    <YAxis axisLine={false} tickLine={false} fontSize={11} stroke="var(--fg-faint)" />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="incidents" name="New Logs" stroke="var(--accent-fg)" strokeWidth={4} fill="url(#primeArea)" />
                    <Area type="monotone" dataKey="resolved" name="Resolved" stroke="var(--success-fg)" strokeWidth={3} fill="url(#succArea)" strokeDasharray="6 6" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
           </ChartWrapper>
        </div>

        {/* Categorical Distribution */}
        <div style={{ gridColumn: 'span 4', gridRow: 'span 2', minHeight: '400px' }}>
           <ChartWrapper id="category-bars" title="Incident Distribution" subtitle="Classification breakdown by severity">
              <div style={{ width: '100%', height: '240px', minHeight: '240px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ left: -20, right: 30, top: 10 }}>
                     <CartesianGrid horizontal={false} strokeDasharray="3 3" strokeOpacity={0.1} />
                     <XAxis type="number" hide />
                     <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={11} fontWeight={900} width={120} stroke="var(--fg-muted)" />
                     <Tooltip content={<CustomTooltip />} />
                     <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={24}>
                        {categoryData.map((entry: any, index: number) => (
                           <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                     </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                 {categoryData.map((item: any, i: number) => (
                   <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                         <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: item.fill }} />
                         <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--fg-muted)' }}>{item.name}</span>
                      </div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 900, color: 'var(--fg-base)' }}>{item.value}</span>
                   </div>
                 ))}
              </div>
           </ChartWrapper>
        </div>

        {/* Action Bar */}
        <div className="card" style={{ gridColumn: 'span 12', padding: '1.5rem 2.5rem', background: 'var(--fg-base)', color: '#fff' }}>
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ width: '48px', height: '48px', background: 'var(--accent-fg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px var(--accent-fg)' }}>
                   <Activity size={24} color="#fff" style={{ margin: 'auto' }} />
                </div>
                <div>
                  <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 900 }}>Automated Fleet Analysis Engine Active</h4>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>Monitoring {monitoredCount} records across all global logistics clusters.</p>
                </div>
             </div>
             <Link to="/reports" className="btn" style={{ background: '#fff', color: '#000', fontWeight: 900, padding: '0.75rem 2rem' }}>OPEN FULL REPORT PORTAL</Link>
           </div>
        </div>

      </div>
    </div>
  );
}
