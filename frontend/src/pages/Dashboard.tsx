import { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle, Activity, TrendingUp, TrendingDown, Search, Zap, Database } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, BarChart, Bar } from 'recharts';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ChartWrapper } from '../components/ChartWrapper';

interface DashboardStats {
  total_incidents: number;
  total_open: number;
  total_closed: number;
  total_review?: number;
  by_type: { type: string; count: number }[];
  by_branch: { branch: string; count: number }[];
  monthly?: { name: string; incidents: number; resolved: number }[];
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { role, branchName, businessUnit } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/dashboard/statistics');
        let backendData: DashboardStats = response.data;
        
        // Merge with Dataverse cache from localStorage
        try {
          const saved = localStorage.getItem('incidents_cache');
          if (saved) {
            let cachedIncidents = JSON.parse(saved);
            
            // Apply RBAC Filter to cache
            if (role !== 'full_access' && role !== 'risk_compliance') {
              if (role === 'bu_access' && businessUnit) {
                cachedIncidents = cachedIncidents.filter((i: any) => i.business_unit === businessUnit || i.branch_department === businessUnit);
              } else if (branchName) {
                cachedIncidents = cachedIncidents.filter((i: any) => i.branch_department === branchName);
              }
            }

            // Aggregate cache into backend stats
            if (cachedIncidents.length > 0) {
              const cacheOpen = cachedIncidents.filter((i: any) => i.status === 'Open').length;
              const cacheClosed = cachedIncidents.filter((i: any) => i.status === 'Closed').length;
              
              backendData.total_incidents += cachedIncidents.length;
              backendData.total_open += cacheOpen;
              backendData.total_closed += cacheClosed;
              
              // Merge by_type
              const typeMap = new Map(
                backendData.by_type
                  .filter((t: any) => t.type !== 'No Data') // Remove fallback label
                  .map((t: any) => [t.type, t.count])
              );
              cachedIncidents.forEach((i: any) => {
                const current = typeMap.get(i.type) || 0;
                typeMap.set(i.type, current + 1);
              });
              backendData.by_type = Array.from(typeMap.entries()).map(([type, count]) => ({ type, count }));
            }
          }
        } catch (e) { console.error('Cache merge error', e); }

        setData(backendData);
      } catch (err) {
        setError('Failed to load dashboard metrics. The server might be offline.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [role, branchName, businessUnit]);

  // Premium Incident Type Colors
  const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#8b5cf6'];
  
  const categoryData = data?.by_type?.filter(t => t.type !== 'No Data' || data?.by_type.length === 1).map((item: any, idx: number) => ({
    name: item.type,
    value: item.count,
    fill: COLORS[idx % COLORS.length]
  })) || [];

  const totalOpen = data?.total_open || 0;
  const monitoredCount = data?.total_incidents || 0;

  const stats = [
    { title: 'Total Active Records', value: totalOpen, icon: Activity, color: 'var(--accent-fg)', trend: 'Live', up: true },
    { title: 'Requires Critical Review', value: data?.total_review || 0, icon: ShieldAlert, color: 'var(--danger-fg)', trend: 'Live', up: true },
    { title: 'Closed Records', value: data?.total_closed || 0, icon: CheckCircle, color: 'var(--success-fg)', trend: 'Live', up: false },
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

  if (error) {
    return (
      <div className="fade-in" style={{ padding: '2rem' }}>
        <div className="card" style={{ border: '1px solid var(--danger-fg)', background: 'rgba(239, 68, 68, 0.05)' }}>
          <h3 style={{ color: 'var(--danger-fg)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <ShieldAlert size={20} /> System Connection Offline
          </h3>
          <p style={{ color: 'var(--fg-muted)', marginTop: '0.5rem' }}>{error}</p>
          <button className="btn" style={{ marginTop: '1rem', background: 'var(--fg-base)', color: '#fff' }} onClick={() => window.location.reload()}>Retry Connection</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Dynamic Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', justifyContent: 'center' }}>
             <Zap size={16} color="var(--accent-fg)" fill="var(--accent-fg)" />
             <span style={{ fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.1em', color: 'var(--accent-fg)' }}>OPERATIONAL COMMAND</span>
          </div>
          <h2 style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.03em', background: 'linear-gradient(135deg, var(--fg-base) 0%, var(--fg-muted) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {branchName ? branchName.split(' - ').pop() : businessUnit ? businessUnit : 'Global Fleet'} Intelligence
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

        {/* Main Operational Trend Chart */}
        <div style={{ gridColumn: 'span 8', gridRow: 'span 2' }}>
           <ChartWrapper id="main-trend-grad" title="Cluster Resolution Velocity" subtitle="Incident capture vs Finalized records (6 Month Rolling Data)">
              <div style={{ width: '100%', height: '320px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.monthly || []}>
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
        <div style={{ gridColumn: 'span 4', gridRow: 'span 2' }}>
           <ChartWrapper id="category-bars" title="Incident Distribution" subtitle="Classification breakdown by severity">
              <div style={{ width: '100%', height: '240px' }}>
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
