import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import AdminDashboard from './pages/AdminDashboard';
import CalendarPage from './pages/CalendarPage';
import LoginScreen from './components/LoginScreen';
import StaffManagementPage from './pages/StaffManagementPage';
import DigitalFormPage from './pages/DigitalFormPage';
import CustomersPage from './pages/CustomersPage';
import FleetGuardianPage from './pages/FleetGuardianPage';
import SubscriberManager from './pages/SubscriberManager';
import ConfigError from './components/ConfigError';
import SupabaseErrorBanner from './components/SupabaseErrorBanner';
import { isConfigured } from './services/supabase';

// A simple gate to handle Tier/Role redirects
const TierGate: React.FC<{ children: React.ReactNode; minTier: number; allowStaff?: boolean }> = ({ children, minTier, allowStaff = true }) => {
  const { user, subscriberTier, role, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">Loading...</div>;
  }

  if (!user) return <Navigate to="/login" replace />;
  
  // Rule: Agent/Staff can NEVER see Staff Management
  if (role === 'staff' && !allowStaff) return <Navigate to="/" replace />;
  
  // Rule: Feature requires a higher Tier
  if (subscriberTier < minTier) return <Navigate to="/" replace />;

  return <>{children}</>;
};

const App: React.FC = () => {
  if (!isConfigured) {
    return <ConfigError />;
  }

  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
        <SupabaseErrorBanner />
      </Router>
    </AuthProvider>
  );
};

const AppRoutes: React.FC = () => {
  const { companyId } = useAuth();
  const isSuperAdmin = companyId === 'superadmin';

  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      
      <Route path="/" element={<Layout />}>
        {/* Tier 1: Digital Forms is available to everyone */}
        <Route index element={isSuperAdmin ? <Navigate to="/subscribers" replace /> : <AdminDashboard />} />
        <Route path="forms/*" element={<DigitalFormPage />} />
        <Route path="customers" element={<CustomersPage />} />

        {/* Tier 2: Calendar Access */}
        <Route path="calendar" element={
          <TierGate minTier={2}><CalendarPage /></TierGate>
        } />

        {/* Tier 3: Fleet Guardian Access */}
        <Route path="fleet" element={
          <TierGate minTier={3}><FleetGuardianPage /></TierGate>
        } />

        {/* Role Gate: Only Subscribers (Owners) can see these */}
        <Route path="staff" element={
          <TierGate minTier={1} allowStaff={false}><StaffManagementPage /></TierGate>
        } />
        <Route path="subscribers" element={
          <TierGate minTier={1} allowStaff={false}><SubscriberManager /></TierGate>
        } />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
