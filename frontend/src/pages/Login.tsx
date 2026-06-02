import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowRight, ShieldCheck } from 'lucide-react';


import logo from '../assets/aaw_new.png';

export default function Login() {
  const { token, loginWithSSO, ssoLoading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [authStatus, setAuthStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Auto-navigate when token is set (e.g., after SSO redirect return)
  useEffect(() => {
    if (token) {
      setAuthStatus('success');
      const timer = setTimeout(() => navigate('/'), 800);
      return () => clearTimeout(timer);
    }
  }, [token, navigate]);

  // Show verifying state when SSO redirect is being processed
  useEffect(() => {
    if (ssoLoading) {
      setAuthStatus('verifying');
    }
  }, [ssoLoading]);

  const handleSSO = async () => {
    setError('');
    setAuthStatus('verifying');
    try {
      // This will redirect away from the page to Microsoft login
      await loginWithSSO();
      // If we reach here, the redirect is about to happen
    } catch (err: any) {
      console.error('SSO login failed:', err);
      setError(err.message || 'Azure AD authentication failed. Please try again.');
      setAuthStatus('error');
    }
  };





  // Parallax Background Effect
  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const moveX = (clientX - window.innerWidth / 2) / 40;
    const moveY = (clientY - window.innerHeight / 2) / 40;
    setMousePos({ x: moveX, y: moveY });
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
        width: 'min(960px, 95vw)',
        height: 'min(600px, 85vh)',
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
          style={{
            flex: '0 0 38%',
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.85) 0%, rgba(2, 6, 23, 0.9) 100%)',
            padding: '1.5rem',
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
            <img src={logo} alt="R&C Hub" style={{ height: '28px', width: 'auto', marginBottom: '2rem', display: 'block' }} />

            <div style={{ position: 'relative' }}>
              {/* Base Title - ALWAYS VISIBLE */}
              <h1 style={{
                fontSize: '2.8rem',
                fontWeight: 700,
                color: '#f8fafc',
                fontFamily: "'Outfit', sans-serif",
                letterSpacing: '-0.02em',
                lineHeight: 0.9,
                margin: 0
              }}>
                R&C <br />
                <span style={{
                  marginLeft: '1.5rem',
                  fontSize: '4.5rem',
                  color: '#38bdf8',
                  fontFamily: "'Pinyon Script', cursive",
                  display: 'inline-block',
                  marginTop: '-0.5rem',
                  fontWeight: 400
                }}>
                  Hub
                </span>
              </h1>

              {/* Shine Overlay Layer */}
              <h1 style={{
                fontSize: '2.8rem',
                fontWeight: 700,
                color: '#ffffff',
                fontFamily: "'Outfit', sans-serif",
                letterSpacing: '-0.02em',
                lineHeight: 0.9,
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
                  marginLeft: '1.5rem',
                  fontSize: '4.5rem',
                  color: '#ffffff',
                  fontFamily: "'Pinyon Script', cursive",
                  display: 'inline-block',
                  marginTop: '-0.5rem',
                  fontWeight: 400
                }}>
                  Hub
                </span>
              </h1>
            </div>

            <p style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 500, marginTop: '1rem', lineHeight: 1.6 }}>
              A centralized intelligence platform for global risk, compliance, and incident management.
            </p>
          </div>

          <div style={{ position: 'relative', zIndex: 2 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#64748b' }}>
              Powered by <span style={{ color: '#94a3b8', fontWeight: 600 }}>AAW-AI</span>
            </span>
          </div>
        </div>

        {/* RIGHT PANE: Auth Gateway */}
        <div style={{
          flex: '0 0 62%',
          background: 'linear-gradient(160deg, #f8fafc 0%, #eef2ff 50%, #f0fdf4 100%)',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Ambient glow */}
          <div style={{ position: 'absolute', top: '15%', right: '5%', width: '180px', height: '180px', background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '15%', left: '8%', width: '140px', height: '140px', background: 'radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '440px', textAlign: 'center', padding: '2rem' }}>

            {/* Icon */}
            <div style={{
              width: '64px', height: '64px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1.5rem',
              boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.2)'
            }}>
              <ShieldCheck size={32} color="#fff" />
            </div>

            {/* Text */}
            <h2 style={{
              fontSize: '2.2rem',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.04em',
              margin: '0 0 0.5rem 0',
            }}>
              Welcome back
            </h2>
            <p style={{ color: '#64748b', fontSize: '1rem', fontWeight: 500, margin: '0 0 2.5rem 0' }}>
              Sign in with your corporate account to continue to the R&C Hub
            </p>

            {/* SSO Button */}
            <button
              onClick={handleSSO}
              disabled={ssoLoading || authStatus !== 'idle'}
              style={{
                width: '100%',
                padding: '1.1rem 1.5rem',
                fontSize: '1.05rem',
                fontWeight: 700,
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #0078d4 0%, #005a9e 100%)',
                color: '#ffffff',
                border: 'none',
                cursor: ssoLoading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                transition: 'all 0.25s ease',
                boxShadow: '0 4px 14px rgba(0, 120, 212, 0.3)',
              }}
              onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(0, 120, 212, 0.35)'; }}
              onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 14px rgba(0, 120, 212, 0.3)'; }}
            >
              <div style={{
                width: '36px', height: '36px', borderRadius: '8px', background: '#ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                </svg>
              </div>
              <span>Continue with Microsoft SSO</span>
              <ArrowRight size={18} style={{ marginLeft: 'auto', opacity: 0.8 }} />
            </button>

            {/* Trust line */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', marginTop: '2rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px rgba(16,185,129,0.5)' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.04em' }}>Azure AD &middot; SSO &middot; MFA &middot; Encrypted</span>
            </div>

            {/* System Status */}
            <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-around', color: '#64748b' }}>
               <div style={{ textAlign: 'center' }}>
                 <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>100%</div>
                 <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Uptime</div>
               </div>
               <div style={{ textAlign: 'center' }}>
                 <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Active</div>
                 <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Threat Mon</div>
               </div>
               <div style={{ textAlign: 'center' }}>
                 <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>24/7</div>
                 <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Support</div>
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
