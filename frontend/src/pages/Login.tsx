import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Mail, Lock, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

import { api } from '../services/api';
import logo from '../assets/aaw_new.png';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('full.access@aaw.com');
  const [password, setPassword] = useState('Access2026!');
  const [error, setError] = useState('');
  const [authStatus, setAuthStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAuthStatus('verifying');

    // Artificial delay for the verifying animation
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const { access_token, role, branch_id, branch_name, business_unit } = response.data;
      login(access_token, role, email, branch_id, branch_name, business_unit);

      setAuthStatus('success');
      await new Promise(resolve => setTimeout(resolve, 1500));
      navigate('/');
    } catch (err: any) {
      setAuthStatus('error');
      setError(err.response?.data?.detail || 'Authentication failed. Verify your credentials.');
    }
  };

  // Parallax Background Effect
  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const moveX = (clientX - window.innerWidth / 2) / 40;
    const moveY = (clientY - window.innerHeight / 2) / 40;
    setMousePos({ x: moveX, y: moveY });
  };

  const handlePaneMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setPaneX(x);
  };



  return (
    <div
      onMouseMove={handleMouseMove}
      style={{
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f1f5f9',
        fontFamily: 'Inter, system-ui, sans-serif',
        position: 'relative'
      }}
    >
      {/* Premium Ambient Background */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: '10%', left: '20%', width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)', filter: 'blur(60px)',
          transform: `translate(${mousePos.x}px, ${mousePos.y}px)`, transition: 'transform 0.1s ease-out'
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', right: '15%', width: '700px', height: '700px',
          background: 'radial-gradient(circle, rgba(20,184,166,0.04) 0%, transparent 70%)', filter: 'blur(80px)',
          transform: `translate(${-mousePos.x}px, ${-mousePos.y}px)`, transition: 'transform 0.1s ease-out'
        }} />

        {/* Subtle Grid Pattern */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
          backgroundSize: '40px 40px', opacity: 0.3
        }} />
      </div>

      {/* Authentication Popup Modal */}
      {authStatus !== 'idle' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', animation: 'fadeIn 0.3s ease-out'
        }}>
          <div className="fade-in-scale" style={{
            background: '#ffffff', padding: '3rem', borderRadius: '24px', width: '400px', maxWidth: '90%',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
          }}>
            {authStatus === 'verifying' && (
              <>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '4px solid #e2e8f0', borderTopColor: '#6366f1', animation: 'spin 1s linear infinite', marginBottom: '1.5rem' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>Verifying Credentials</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Establishing secure connection...</p>
              </>
            )}

            {authStatus === 'success' && (
              <>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: '#fff' }}>
                  <ShieldCheck size={24} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>Welcome On Board</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Authentication successful. Redirecting...</p>
              </>
            )}

            {authStatus === 'error' && (
              <>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: '#fff' }}>
                  <ShieldAlert size={24} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>Access Denied</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 1.5rem 0' }}>{error}</p>
                <button onClick={() => setAuthStatus('idle')} className="premium-btn" style={{ width: '100%' }}>
                  Try Again
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* The App Window - STRICTLY FIXED HEIGHT */}
      <div className="app-window fade-in-scale" style={{
        display: 'flex',
        width: 'min(1000px, 90vw)',
        height: 'min(640px, 85vh)',
        background: 'transparent',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0,0,0,0.05)',
        overflow: 'hidden',
        zIndex: 10,
        position: 'relative',
        transform: 'translateY(-35vh)'
      }}>

        {/* LEFT PANE: Hero & Brand */}
        <div
          onMouseMove={handlePaneMouseMove}
          onMouseEnter={() => setIsHoveringPane(true)}
          onMouseLeave={() => setIsHoveringPane(false)}
          style={{
            flex: '0 0 35%',
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.85) 0%, rgba(2, 6, 23, 0.9) 100%)',
            padding: '3rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            borderRight: '1px solid rgba(255,255,255,0.05)',
            overflow: 'hidden',
            cursor: 'default'
          }}>
          {/* Decorative Background Elements */}
          <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '120%', height: '120%', background: 'radial-gradient(circle at 0% 0%, rgba(99,102,241,0.15) 0%, transparent 60%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 2 }}>
            <img src={logo} alt="R&C Hub" style={{ height: '42px', width: 'auto', marginBottom: '5rem', display: 'block' }} />

            <div style={{ position: 'relative' }}>
              {/* Base Title - ALWAYS VISIBLE */}
              <h1 style={{
                fontSize: '4rem',
                fontWeight: 700,
                color: '#f8fafc',
                fontFamily: "'Outfit', sans-serif",
                letterSpacing: '-0.02em',
                lineHeight: 0.8,
                margin: 0
              }}>
                R&C <br />
                <span style={{
                  marginLeft: '2.5rem',
                  fontSize: '7rem',
                  color: '#38bdf8',
                  fontFamily: "'Pinyon Script', cursive",
                  display: 'inline-block',
                  marginTop: '-2rem',
                  fontWeight: 400
                }}>
                  Hub
                </span>
              </h1>

              {/* Shine Overlay Layer */}
              <h1 style={{
                fontSize: '4rem',
                fontWeight: 700,
                color: '#ffffff',
                fontFamily: "'Outfit', sans-serif",
                letterSpacing: '-0.02em',
                lineHeight: 0.8,
                margin: 0,
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                pointerEvents: 'none',
                WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, #fff 50%, transparent 100%)',
                maskImage: 'linear-gradient(90deg, transparent 0%, #fff 50%, transparent 100%)',
                WebkitMaskSize: '200% 100%',
                maskSize: '200% 100%',
                animation: 'auto-shine 4s cubic-bezier(0.4, 0, 0.2, 1) infinite',
                zIndex: 1
              }}>
                R&C <br />
                <span style={{
                  marginLeft: '2.5rem',
                  fontSize: '7rem',
                  color: '#ffffff',
                  fontFamily: "'Pinyon Script', cursive",
                  display: 'inline-block',
                  marginTop: '-2rem',
                  fontWeight: 400
                }}>
                  Hub
                </span>
              </h1>
            </div>

            <p style={{ color: '#94a3b8', fontSize: '0.95rem', fontWeight: 500, marginTop: '1.5rem', lineHeight: 1.6, maxWidth: '400px' }}>
              A centralized intelligence platform for global risk, compliance, and incident management.
            </p>
          </div>

          <div style={{ position: 'relative', zIndex: 2 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#64748b' }}>
              Powered by <span style={{ color: '#94a3b8', fontWeight: 600 }}>AAW-AI</span>
            </span>
          </div>
        </div>

        {/* RIGHT PANE: Auth Gateway */}
        <div style={{
          flex: '0 0 65%',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          height: '100%',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ padding: '1.5rem 4rem 4rem 4rem' }}>
            <div style={{ marginBottom: '2rem', position: 'relative' }}>
              {/* High-tech corner accents */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '20px', height: '2px', background: '#6366f1' }} />
              <div style={{ position: 'absolute', top: 0, left: 0, width: '2px', height: '20px', background: '#6366f1' }} />

              <div style={{ position: 'relative', zIndex: 1, paddingLeft: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '14px', width: '24px' }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="wave-bar" style={{
                        animationDelay: `${i * 0.15}s`,
                        background: '#10b981',
                        boxShadow: '0 0 8px rgba(16, 185, 129, 0.3)'
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Active</span>
                </div>

                <h2 style={{
                  fontSize: '4rem',
                  fontWeight: 900,
                  color: '#0f172a',
                  letterSpacing: '-0.07em',
                  margin: '0 0 0.5rem 0',
                  fontFamily: "'Outfit', sans-serif",
                  lineHeight: 0.85,
                  background: 'linear-gradient(135deg, #0f172a 30%, #6366f1 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  Authenticate
                </h2>

                <p style={{ color: '#64748b', fontSize: '1.15rem', fontWeight: 500, margin: 0, lineHeight: 1.5, maxWidth: '400px' }}>
                  Secure identification required to access the <br />
                  <span style={{ color: '#6366f1', fontWeight: 800 }}>R&C-Hub</span> Intelligence Core.
                </p>
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(165deg, rgba(248, 250, 252, 0.95) 0%, rgba(226, 232, 240, 0.9) 100%)',
              backdropFilter: 'blur(40px)',
              padding: '2.5rem',
              borderRadius: '32px',
              border: '1px solid rgba(255, 255, 255, 0.8)',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.4) inset, 0 0 20px rgba(99, 102, 241, 0.05)',
              position: 'relative'
            }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                <div className="input-group">
                  <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Corporate Identity</label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}><Mail size={18} /></div>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="premium-input" placeholder="name@aaw-group.com" />
                  </div>
                </div>

                <div className="input-group">
                  <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Security Authorization</label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}><Lock size={18} /></div>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="premium-input" placeholder="••••••••" />
                  </div>
                </div>

                <button type="submit" disabled={authStatus !== 'idle'} className="premium-btn elite-launch-btn" style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                  <Zap size={18} fill="#fff" className="zap-icon" />
                  <span style={{ letterSpacing: '0.02em' }}>Initialize Secure Session</span>
                  <ArrowRight size={18} className="arrow-icon" style={{ marginLeft: 'auto' }} />
                </button>
              </form>

              {/* Elite Authorized Personnel Section for Rapid Testing */}
              <div style={{ marginTop: '3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, transparent, #e2e8f0)' }} />
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Rapid Testing Personas</span>
                  <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, #e2e8f0, transparent)' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
                  {[
                    // CORE
                    { role: 'Global Admin', email: 'full.access@aaw.com', color: '#6366f1', desc: 'Full Oversight' },
                    { role: 'Risk & Comp', email: 'risk.compliance@aaw.com', color: '#10b981', desc: 'R&C Manager' },
                    { role: 'People & Safety', email: 'people.andsafety@aaw.com', color: '#ec4899', desc: 'HR / WHS' },
                    { role: 'IT Security', email: 'it.andsecurity@aaw.com', color: '#06b6d4', desc: 'Cyber/CIO' },
                    { role: 'Finance', email: 'finance@aaw.com', color: '#3b82f6', desc: 'CFO / Loss' },
                    
                    // BU MANAGERS
                    { role: 'BU: AU', email: 'aaw.global.logistics.au.manager@aaw.com', color: '#f59e0b', desc: 'Logistics AU' },
                    { role: 'BU: NZ', email: 'aaw.global.logistics.nz.manager@aaw.com', color: '#f59e0b', desc: 'Logistics NZ' },
                    { role: 'BU: Bulk', email: 'aaw.bulk.liquid.logistics.manager@aaw.com', color: '#f59e0b', desc: 'Bulk Liquid' },
                    { role: 'BU: Hoyer', email: 'hoyer.logistics.australia.manager@aaw.com', color: '#f59e0b', desc: 'Hoyer AU' },
                    
                    // BRANCHES
                    { role: 'MEL Branch', email: 'aaw.global.mel@aaw.com', color: '#a855f7', desc: 'Melbourne' },
                    { role: 'SYD Branch', email: 'aaw.global.syd@aaw.com', color: '#a855f7', desc: 'Sydney' },
                    { role: 'AKL Branch', email: 'aaw.global.akl@aaw.com', color: '#a855f7', desc: 'Auckland' },
                    { role: 'Brokerage', email: 'aaw.brokerage@aaw.com', color: '#a855f7', desc: 'Brokerage' },
                    { role: 'Coastalbridge', email: 'coastalbridge@aaw.com', color: '#a855f7', desc: 'Coastalbridge' },
                  ].map((acc) => (
                    <button type="button" key={acc.email + acc.role} onClick={() => { setEmail(acc.email); setPassword('Access2026!'); }} className="elite-persona-card">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{
                          width: '24px', height: '24px', borderRadius: '6px', background: `${acc.color}10`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${acc.color}20`,
                          transition: 'all 0.3s ease', flexShrink: 0
                        }} className="icon-box">
                          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: acc.color, boxShadow: `0 0 5px ${acc.color}40` }} />
                        </div>
                        <div style={{ textAlign: 'left', minWidth: 0 }}>
                          <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{acc.role}</div>
                          <div style={{ fontSize: '0.5rem', color: '#64748b', fontWeight: 500, marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{acc.desc}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Pinyon+Script&family=Outfit:wght@700&display=swap');

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .fade-in-scale {
            animation: fadeInScale 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          @keyframes fadeInScale {
            0% { opacity: 0; transform: scale(0.95) translateY(20px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-4px); }
            75% { transform: translateX(4px); }
          }
          .shake { animation: shake 0.4s ease-in-out; }

          @keyframes auto-shine {
            0% { -webkit-mask-position: 150% 0; mask-position: 150% 0; }
            100% { -webkit-mask-position: -50% 0; mask-position: -50% 0; }
          }

          @keyframes signal-sweep {
            0% { left: -100%; }
            100% { left: 100%; }
          }

          .wave-bar {
            width: 3px;
            height: 100%;
            background: #10b981;
            border-radius: 4px;
            animation: wave-bounce 0.8s ease-in-out infinite alternate;
          }
          @keyframes wave-bounce {
            0% { height: 20%; }
            100% { height: 100%; }
          }

          .premium-input {
            width: 100%;
            background: rgba(248, 250, 252, 0.6);
            border: 1px solid #e2e8f0;
            padding: 1.1rem 1.5rem 1.1rem 3.5rem;
            border-radius: 16px;
            font-size: 1rem;
            color: #0f172a;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            outline: none;
            box-shadow: inset 0 2px 6px rgba(0,0,0,0.03);
          }
          .premium-input:focus {
            background: #ffffff;
            border-color: #6366f1;
            box-shadow: 0 10px 20px -10px rgba(99,102,241,0.2), 0 0 0 4px rgba(99,102,241,0.05), inset 0 1px 2px rgba(0,0,0,0.01);
            transform: translateY(-2px);
          }

          .premium-btn {
            width: 100%;
            padding: 0.8rem 1.5rem;
            font-size: 0.9rem;
            font-weight: 700;
            border-radius: 10px;
            background: #0f172a;
            color: #ffffff;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          }
          .premium-btn:hover {
            background: #1e293b;
            transform: translateY(-1px);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          }
          .premium-btn:active {
            transform: translateY(0);
          }
          .premium-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .elite-launch-btn {
            background: linear-gradient(135deg, #0f172a 0%, #312e81 50%, #1e293b 100%) !important;
            box-shadow: 0 10px 25px rgba(49, 46, 129, 0.3), 0 0 0 1px rgba(15,23,42,1), inset 0 1px 1px rgba(255,255,255,0.15) !important;
            overflow: hidden;
            position: relative;
            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
          .elite-launch-btn::after {
            content: '';
            position: absolute;
            top: -50%; left: -150%; width: 200%; height: 200%;
            background: linear-gradient(45deg, transparent, rgba(255,255,255,0.25), transparent);
            transform: rotate(45deg);
            transition: 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .elite-launch-btn:hover::after {
            left: 100%;
          }
          .elite-launch-btn:hover {
            transform: translateY(-5px) scale(1.02);
            box-shadow: 0 20px 40px rgba(49, 46, 129, 0.4), 0 0 0 1px rgba(15,23,42,1), inset 0 1px 1px rgba(255,255,255,0.2) !important;
          }
          .elite-launch-btn:hover .arrow-icon {
            transform: translateX(5px);
          }
          .elite-launch-btn:hover .zap-icon {
            animation: pulse-zap 1s infinite;
          }
          
          .arrow-icon {
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          @keyframes pulse-zap {
            0% { transform: scale(1); filter: brightness(1); }
            50% { transform: scale(1.2); filter: brightness(1.5); }
            100% { transform: scale(1); filter: brightness(1); }
          }

          .elite-persona-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 1rem;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
            position: relative;
            overflow: hidden;
          }
          .elite-persona-card:hover {
            transform: translateY(-2px);
            border-color: #cbd5e1;
            background: #f8fafc;
            box-shadow: 0 10px 20px rgba(0,0,0,0.04);
          }
          .elite-persona-card:hover .icon-box {
            transform: scale(1.1);
            background: #ffffff;
            border-color: #cbd5e1;
          }
          .elite-persona-card:active {
            transform: translateY(0);
          }

          /* Custom Premium Scrollbar */
          ::-webkit-scrollbar {
            width: 6px;
          }
          ::-webkit-scrollbar-track {
            background: transparent;
          }
          ::-webkit-scrollbar-thumb {
            background: rgba(15, 23, 42, 0.1);
            border-radius: 20px;
            border: 2px solid transparent;
            background-clip: content-box;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: rgba(15, 23, 42, 0.25);
            background-clip: content-box;
          }
        `}
      </style>
    </div>
  );
}
