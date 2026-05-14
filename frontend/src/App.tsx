import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Incidents from './pages/Incidents';
import IncidentDetails from './pages/IncidentDetails';
import CoRDetails from './pages/CoRDetails';
import ClaimDetails from './pages/ClaimDetails';
import NewIncident from './pages/NewIncident';
import Search from './pages/Search';
import Reports from './pages/Reports';
import NCRDashboard from './pages/NCRDashboard';
import NCRs from './pages/NCRs';
import ICDashboard from './pages/ICDashboard';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, role } = useAuth();
  const location = useLocation();
  
  if (!token) return <Navigate to="/login" replace />;
  
  const isManager = role !== 'submit_only';
  
  if (!isManager && !location.pathname.startsWith('/incidents/new')) {
    return <Navigate to="/incidents/new" replace />;
  }
  
  return <Layout>{children}</Layout>;
};

export default function App() {
  return (
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
          <Route path="/reports" element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          } />
          <Route path="/ncr-dashboard" element={
            <ProtectedRoute>
              <NCRDashboard />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

