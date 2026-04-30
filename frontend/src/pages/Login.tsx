import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

import { api } from '../services/api';
import logo from '../assets/logo.png';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('full.access@aaw.com');
  const [password, setPassword] = useState('Access2026!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      // The FastAPI OAuth2PasswordRequestForm expects form-data
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);
      
      const response = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      const { access_token, role, branch_id } = response.data;
      login(access_token, role, branch_id);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-subtle)' }}>
      <div className="card fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', margin: '1rem' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ 
            background: '#0b101a', 
            display: 'inline-flex', 
            padding: '1.25rem 2rem', 
            borderRadius: '12px', 
            marginBottom: '1.5rem',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <img src={logo} alt="AAW Group" style={{ height: '32px', width: 'auto' }} />
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--fg-base)', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>Incident & Claims Management</h1>
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.875rem' }}>AAW Group Command Center</p>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div style={{ padding: '0.75rem', background: 'var(--danger-bg)', color: 'var(--danger-fg)', fontSize: '0.875rem', borderRadius: 'var(--radius-sm)' }}>
              {error}
            </div>
          )}
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--fg-base)' }}>Email</label>
            <input 
              type="email" 
              className="input-field" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--fg-base)' }}>Password</label>
            <input 
              type="password" 
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', fontSize: '0.875rem', marginTop: '0.5rem' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
        
        <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-base)' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <ShieldAlert size={16} style={{ color: 'var(--fg-muted)', marginTop: '2px', flexShrink: 0 }} />
            <p style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', margin: 0, lineHeight: 1.5 }}>
              Standard test credentials (Password: <strong style={{ color: 'var(--fg-base)' }}>Access2026!</strong>)
            </p>
          </div>
          
          <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-faint)', fontWeight: 700, marginBottom: '0.75rem' }}>
            Click to Auto-Fill Persona
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '160px', overflowY: 'auto', paddingRight: '0.25rem' }}>
            {[
              { role: 'Global Admin (All Access)', email: 'full.access@aaw.com' },
              { role: 'Submit Only User', email: 'submit.only@aaw.com' },
              { role: 'National Manager (AU)', email: 'aaw.global.logistics.au.manager@aaw.com' },
              { role: 'Command Center: Risk', email: 'risk.and.compliance@aaw.com' },
              { role: 'Command Center: IT', email: 'it.and.security@aaw.com' },
              { role: 'Command Center: HR', email: 'people.and.safety@aaw.com' },
              { role: 'Command Center: Finance', email: 'finance@aaw.com' },
              { role: 'Branch: AAW Global - MEL', email: 'aaw.global.mel@aaw.com' },
              { role: 'Branch: AAW Global - SYD', email: 'aaw.global.syd@aaw.com' },
              { role: 'Branch: AAW Global - BNE', email: 'aaw.global.bne@aaw.com' },
              { role: 'Branch: AAW Global - ADL', email: 'aaw.global.adl@aaw.com' },
              { role: 'Branch: AAW Global - FRE', email: 'aaw.global.fre@aaw.com' },
              { role: 'Branch: AAW Brokerage', email: 'aaw.brokerage@aaw.com' },
              { role: 'Branch: AAW Project Logistics', email: 'aaw.project.logistics@aaw.com' },
              { role: 'Branch: AAW Global - AKL', email: 'aaw.global.akl@aaw.com' },
              { role: 'Branch: AAW BLL', email: 'aaw.bll@aaw.com' },
              { role: 'Branch: HLA', email: 'hla@aaw.com' },
              { role: 'Branch: Coastalbridge', email: 'coastalbridge@aaw.com' },
              { role: 'Branch: Coastalbridge Agencies', email: 'coastalbridge.agencies@aaw.com' },
              { role: 'Branch: PILLA', email: 'pilla@aaw.com' },
              { role: 'Branch: RSS', email: 'rss@aaw.com' },
              { role: 'Branch: ILM', email: 'ilm@aaw.com' },
            ].map((acc) => (
              <div 
                key={acc.email} 
                onClick={() => setEmail(acc.email)}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '0.5rem 0.75rem', 
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-base)',
                  borderRadius: '6px',
                  cursor: 'pointer', 
                  transition: 'all 0.15s ease' 
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-elevated)';
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-subtle)';
                  e.currentTarget.style.borderColor = 'var(--border-base)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--fg-base)' }}>{acc.role}</span>
                <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--fg-muted)' }}>{acc.email}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
