import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MsalProvider } from '@azure/msal-react';
import { AuthProvider, useAuth, msalInstance, ensureMsalInitialized } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Incidents from './pages/Incidents';
import IncidentDetails from './pages/IncidentDetails';
import CoRDetails from './pages/CoRDetails';
import ClaimDetails from './pages/ClaimDetails';
import NewIncident from './pages/NewIncident';
import Search from './pages/Search';

import NCRDashboard from './pages/NCRDashboard';
import NCRs from './pages/NCRs';
import ICDashboard from './pages/ICDashboard';
import AccessControl from './pages/AccessControl';

const ProtectedRoute = ({ children, requireAdmin }: { children: React.ReactNode; requireAdmin?: boolean }) => {
  const { token, role } = useAuth();
  const location = useLocation();
  
  if (!token) return <Navigate to="/login" replace />;
  
  // Admin-only routes (e.g., Access Control)
  if (requireAdmin && role !== 'full_access') {
    return <Navigate to="/" replace />;
  }
  
  const isManager = role !== 'submit_only';
  
  if (!isManager && !location.pathname.startsWith('/incidents/new')) {
    return <Navigate to="/incidents/new" replace />;
  }
  
  return <Layout>{children}</Layout>;
};

export default function App() {
  const [msalReady, setMsalReady] = useState(false);

  useEffect(() => {
    ensureMsalInitialized()
      .then(() => setMsalReady(true))
      .catch((err) => {
        console.error('[MSAL] Init failed, continuing without SSO:', err);
        setMsalReady(true); // Still render app, just SSO won't work
      });
  }, []);

  if (!msalReady) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            border: '3px solid #e2e8f0', borderTopColor: '#6366f1',
            animation: 'spin 1s linear infinite', margin: '0 auto 1rem'
          }} />
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Initializing secure session...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <MsalProvider instance={msalInstance}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/incidents" element={
              <ProtectedRoute>
                <Incidents />
              </ProtectedRoute>
            } />
            <Route path="/claims" element={
              <ProtectedRoute>
                <Incidents />
              </ProtectedRoute>
            } />
            <Route path="/cors" element={
              <ProtectedRoute>
                <Incidents />
              </ProtectedRoute>
            } />
            <Route path="/ncrs" element={
              <ProtectedRoute>
                <NCRs />
              </ProtectedRoute>
            } />
            <Route path="/ic-dashboard" element={
              <ProtectedRoute>
                <ICDashboard />
              </ProtectedRoute>
            } />
            <Route path="/incidents/new" element={
              <ProtectedRoute>
                <NewIncident />
              </ProtectedRoute>
            } />
            <Route path="/incidents/:id" element={
              <ProtectedRoute>
                <IncidentDetails />
              </ProtectedRoute>
            } />
            <Route path="/cors/:id" element={
              <ProtectedRoute>
                <CoRDetails />
              </ProtectedRoute>
            } />
            <Route path="/claims/:id" element={
              <ProtectedRoute>
                <ClaimDetails />
              </ProtectedRoute>
            } />
            <Route path="/search" element={
              <ProtectedRoute>
                <Search />
              </ProtectedRoute>
            } />

            <Route path="/ncr-dashboard" element={
              <ProtectedRoute>
                <NCRDashboard />
              </ProtectedRoute>
            } />
            <Route path="/access-control" element={
              <ProtectedRoute requireAdmin>
                <AccessControl />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </MsalProvider>
  );
}
