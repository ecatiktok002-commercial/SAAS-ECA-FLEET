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
import AuditPayoutManagement from './pages/AuditPayoutManagement';
import SubscriberManager from './pages/SubscriberManager';
import SignAgreement from './pages/digital-forms/SignAgreement';
import ConfigError from './components/ConfigError';
import SupabaseErrorBanner from './components/SupabaseErrorBanner';
import { isConfigured } from './services/supabase';

// A simple gate to handle Tier/Role redirects
const StrictTierGate: React.FC<{ children: React.ReactNode; allowedTiers: string[]; allowStaff?: boolean }> = ({ children, allowedTiers, allowStaff = true }) => {
  const { user, subscriptionTier, staffRole, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">Loading...</div>;
  }

  if (!user) return <Navigate to="/login" replace />;
  
  // Rule: Agent/Staff can NEVER see Staff Management or other restricted pages
  if (staffRole === 'staff' && !allowStaff) return <Navigate to="/" replace />;
  
  // Rule: Feature requires specific Tier
  if (!subscriptionTier || !allowedTiers.includes(subscriptionTier)) return <Navigate to="/" replace />;

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

const IndexRedirect: React.FC = () => {
  const { subscriptionTier, staffRole } = useAuth();
  
  if (subscriptionTier === 'tier_2') {
    return <Navigate to="/calendar" replace />;
  }
  
  if (staffRole === 'admin' && subscriptionTier === 'tier_1') {
    return <Navigate to="/forms" replace />;
  }
  
  return <AdminDashboard />;
};

const AppRoutes: React.FC = () => {
  const { subscriberId } = useAuth();
  const isSuperAdmin = subscriberId === 'superadmin';

  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/forms/sign/:id" element={<SignAgreement />} />
      
      <Route path="/" element={<Layout />}>
        {/* Dashboard: Tier 3 for Admin, Tier 1/3 for Staff */}
        <Route index element={
          isSuperAdmin ? <Navigate to="/subscribers" replace /> : 
          <StrictTierGate allowedTiers={['tier_1', 'tier_2', 'tier_3']}>
            <IndexRedirect />
          </StrictTierGate>
        } />
        
        {/* Digital Forms: Tier 1 and Tier 3 */}
        <Route path="forms/*" element={
          <StrictTierGate allowedTiers={['tier_1', 'tier_3']}><DigitalFormPage /></StrictTierGate>
        } />

        {/* Audit & Payout: Tier 3 only */}
        <Route path="audit" element={
          <StrictTierGate allowedTiers={['tier_3']} allowStaff={false}><AuditPayoutManagement /></StrictTierGate>
        } />
        
        {/* Customers: Tier 3 only */}
        <Route path="customers" element={
          <StrictTierGate allowedTiers={['tier_3']} allowStaff={false}><CustomersPage /></StrictTierGate>
        } />

        {/* Calendar: Tier 2 and Tier 3 */}
        <Route path="calendar" element={
          <StrictTierGate allowedTiers={['tier_2', 'tier_3']}><CalendarPage /></StrictTierGate>
        } />

        {/* Fleet Guardian: Tier 3 only */}
        <Route path="fleet" element={
          <StrictTierGate allowedTiers={['tier_3']} allowStaff={false}><FleetGuardianPage /></StrictTierGate>
        } />

        {/* Vehicle Management: Tier 3 only */}
        <Route path="vehicles" element={
          <StrictTierGate allowedTiers={['tier_3']} allowStaff={false}><FleetGuardianPage /></StrictTierGate>
        } />

        {/* Staff Management: All Tiers, but Admin only */}
        <Route path="staff" element={
          <StrictTierGate allowedTiers={['tier_1', 'tier_2', 'tier_3']} allowStaff={false}><StaffManagementPage /></StrictTierGate>
        } />
        
        {/* Subscribers: Superadmin only */}
        <Route path="subscribers" element={
          <StrictTierGate allowedTiers={['tier_1', 'tier_2', 'tier_3']} allowStaff={false}><SubscriberManager /></StrictTierGate>
        } />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
 