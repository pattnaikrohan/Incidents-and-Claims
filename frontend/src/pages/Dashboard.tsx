import { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle, Activity, TrendingUp, TrendingDown, Search, Zap, Database } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, BarChart, Bar } from 'recharts';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { ChartWrapper } from '../components/ChartWrapper';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/dashboard/statistics');
        setData(response.data);
      } catch (err) {
        setError('Failed to load dashboard metrics. The server might be offline.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);
  
  // Real dynamic data parsing without mock fallbacks
  const monthlyData = data?.monthly || [];
  const categoryData = data?.by_type?.map((item: any) => ({
    name: item.type,
    value: item.count
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

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center' }}>Synchronizing Digital Twin...</div>;

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
          <h2 style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.03em' }}>Executive Fleet Intelligence</h2>
          <p style={{ color: 'var(--fg-muted)', fontSize: '1rem' }}>
            Real-time multi-cluster risk monitoring dashboard.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '1rem', color: 'var(--fg-faint)' }} />
            <input type="text" className="input-field" placeholder="Search Fleet ID..." style={{ paddingLeft: '2.75rem', width: '280px', height: '44px' }} />
          </div>
          <Link to="/incidents/new" className="btn btn-primary" style={{ height: '44px', textDecoration: 'none', padding: '0 1.5rem' }}>
            New Log Entry
          </Link>
        </div>
      </div>

      <div className="bento-grid">
        {/* KPI Cards */}
        {stats.map((stat, i) => (
          <div key={i} className="card" style={{ gridColumn: 'span 3', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
               <div style={{ padding: '0.75rem', background: `${stat.color}10`, color: stat.color, borderRadius: 'var(--radius-md)' }}>
                  <stat.icon size={24} />
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: stat.up ? 'var(--danger-fg)' : 'var(--success-fg)', fontSize: '0.75rem', fontWeight: 900, background: stat.up ? 'var(--danger-bg)' : 'var(--success-bg)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                  {stat.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {stat.trend}
               </div>
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1 }}>{stat.value}</div>
            <div className="overline" style={{ marginTop: '0.5rem', opacity: 0.6 }}>{stat.title}</div>
          </div>
        ))}

        {/* Main Operational Trend Chart */}
        <div style={{ gridColumn: 'span 8', gridRow: 'span 2' }}>
           <ChartWrapper id="main-trend-grad" title="Cluster Resolution Velocity" subtitle="Incident capture vs Finalized records (6 Month Rolling)">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={monthlyData}>
                   <defs>
                     <linearGradient id="primeArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--accent-fg)" stopOpacity={0.3}/><stop offset="95%" stopColor="var(--accent-fg)" stopOpacity={0}/></linearGradient>
                     <linearGradient id="succArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--success-fg)" stopOpacity={0.2}/><stop offset="95%" stopColor="var(--success-fg)" stopOpacity={0}/></linearGradient>
                   </defs>
                   <CartesianGrid vertical={false} strokeOpacity={0.05} />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} dy={10} fontSize={11} fontWeight={800} />
                   <YAxis axisLine={false} tickLine={false} fontSize={11} />
                   <Tooltip content={<CustomTooltip />} />
                   <Area type="monotone" dataKey="incidents" name="New Logs" stroke="var(--accent-fg)" strokeWidth={3} fill="url(#primeArea)" />
                   <Area type="monotone" dataKey="resolved" name="Resolved" stroke="var(--success-fg)" strokeWidth={2} fill="url(#succArea)" strokeDasharray="4 4" />
                 </AreaChart>
              </ResponsiveContainer>
           </ChartWrapper>
        </div>

        {/* Categorical Distribution - REPLACED PIE WITH HORIZONTAL BARS */}
        <div style={{ gridColumn: 'span 4', gridRow: 'span 2' }}>
           <ChartWrapper id="category-bars" title="Incident Distribution" subtitle="System-wide classification breakdown (Non-Pie)">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={categoryData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid horizontal={false} strokeOpacity={0.05} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={10} fontWeight={800} width={100} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                       {categoryData.map((_e: any, i: number) => (
                          <Cell key={i} fill={`var(--accent-fg)`} fillOpacity={1 - (i * 0.15)} />
                       ))}
                    </Bar>
                 </BarChart>
              </ResponsiveContainer>
              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                 {categoryData.map((item: any, i: number) => (
                   <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--fg-muted)' }}>{item.name}</span>
                      <span style={{ fontWeight: 900, color: 'var(--fg-base)' }}>{item.value} Records</span>
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
