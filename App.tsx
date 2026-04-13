import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginScreen from './components/LoginScreen';
import ConfigError from './components/ConfigError';
import SupabaseErrorBanner from './components/SupabaseErrorBanner';
import { isConfigured } from './services/supabase';

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AgentDashboard = lazy(() => import('./pages/AgentDashboard'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const StaffManagementPage = lazy(() => import('./pages/StaffManagementPage'));
const DigitalFormPage = lazy(() => import('./pages/DigitalFormPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const FleetGuardianPage = lazy(() => import('./pages/FleetGuardianPage'));
const AuditPayoutManagement = lazy(() => import('./pages/AuditPayoutManagement'));
const SubscriberManager = lazy(() => import('./pages/SubscriberManager'));
const SignAgreement = lazy(() => import('./pages/digital-forms/SignAgreement'));
const UpgradePlanPage = lazy(() => import('./pages/UpgradePlanPage'));
const PublicHandoverPage = lazy(() => import('./pages/PublicHandoverPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: false, // Prevents infinite retry loops on database errors
    },
  },
});

// A simple gate to handle Tier/Role redirects
const StrictTierGate: React.FC<{ children: React.ReactNode; allowedTiers: number[]; allowStaff?: boolean }> = ({ children, allowedTiers, allowStaff = true }) => {
  const { user, subscriberTier, staffRole, isLoading } = useAuth();
  const location = useLocation();
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">Loading...</div>;
  }

  if (!user) return <Navigate to="/login" replace />;
  
  const isAdmin = staffRole === 'admin';
  const isStaff = !isAdmin;

  // Rule: Staff can NEVER see Admin-only pages
  if (isStaff && !allowStaff) {
    // Redirect staff to their tier's default route
    if (subscriberTier === 1) return <Navigate to="/forms" replace />;
    if (subscriberTier === 2) return <Navigate to="/calendar" replace />;
    return <Navigate to="/agent-dashboard" replace />;
  }
  
  // Rule: Feature requires specific Tier
  const isTierAllowed = allowedTiers.includes(subscriberTier);

  if (!isTierAllowed) {
    if (isAdmin) {
      // Subscriber navigates to unauthorized tier -> Upgrade Plan
      return <Navigate to="/upgrade" replace />;
    } else {
      // Staff navigates to unauthorized tier -> Default Route
      if (subscriberTier === 1) return <Navigate to="/forms" replace />;
      if (subscriberTier === 2) return <Navigate to="/calendar" replace />;
      return <Navigate to="/agent-dashboard" replace />;
    }
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  if (!isConfigured) {
    return <ConfigError />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster position="bottom-right" />
        <Router>
          <AppRoutes />
          <SupabaseErrorBanner />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
};

const IndexRedirect: React.FC = () => {
  const { staffRole, subscriberTier } = useAuth();
  
  if (staffRole === 'admin') {
    // If they hit the root URL "/" while logged in, force the upgrade pop-out
    if (subscriberTier === 1 || subscriberTier === 2) {
      return <Navigate to="/upgrade" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  
  // Staff Redirects based on Tier
  if (subscriberTier === 1) return <Navigate to="/forms" replace />;
  if (subscriberTier === 2) return <Navigate to="/calendar" replace />;
  return <Navigate to="/agent-dashboard" replace />;
};

const AppRoutes: React.FC = () => {
  const { subscriberId } = useAuth();
  const isSuperAdmin = subscriberId === 'superadmin';

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">Loading Page...</div>}>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/forms/sign/:id" element={<SignAgreement />} />
        <Route path="/handover/:bookingId" element={<PublicHandoverPage />} />
        
        <Route path="/" element={<Layout />}>
          {/* Dashboard: Tier 3 for Admin, Tier 1/3 for Staff */}
          <Route index element={
            isSuperAdmin ? <Navigate to="/subscribers" replace /> : 
            <IndexRedirect />
          } />

          <Route path="upgrade" element={<UpgradePlanPage />} />

          <Route path="dashboard" element={
            <StrictTierGate allowedTiers={[3]} allowStaff={false}>
              <AdminDashboard />
            </StrictTierGate>
          } />

          <Route path="admin" element={<Navigate to="/dashboard" replace />} />
          <Route path="admin-dashboard" element={<Navigate to="/dashboard" replace />} />

          <Route path="agent-dashboard" element={
            <StrictTierGate allowedTiers={[3]}>
              <AgentDashboard />
            </StrictTierGate>
          } />
          
          {/* Digital Forms: Tier 1 and Tier 3 */}
          <Route path="forms/*" element={
            <StrictTierGate allowedTiers={[1, 3]}><DigitalFormPage /></StrictTierGate>
          } />

          {/* Audit & Payout: Tier 3 only */}
          <Route path="audit" element={
            <StrictTierGate allowedTiers={[3]} allowStaff={false}><AuditPayoutManagement /></StrictTierGate>
          } />
          
          {/* Customers: Tier 3 only */}
          <Route path="customers" element={
            <StrictTierGate allowedTiers={[3]} allowStaff={false}><CustomersPage /></StrictTierGate>
          } />

          {/* Calendar: Tier 2 and Tier 3 */}
          <Route path="calendar" element={
            <StrictTierGate allowedTiers={[2, 3]}><CalendarPage /></StrictTierGate>
          } />

          {/* Fleet Guardian: Tier 3 only */}
          <Route path="fleet" element={
            <StrictTierGate allowedTiers={[3]} allowStaff={false}><FleetGuardianPage /></StrictTierGate>
          } />

          {/* Vehicle Management: Tier 3 only */}
          <Route path="vehicles" element={
            <StrictTierGate allowedTiers={[3]} allowStaff={false}><FleetGuardianPage /></StrictTierGate>
          } />

          {/* Staff Management: All Tiers, but Admin only */}
          <Route path="staff" element={
            <StrictTierGate allowedTiers={[1, 2, 3]} allowStaff={false}><StaffManagementPage /></StrictTierGate>
          } />
          
          {/* Subscribers: Superadmin only */}
          <Route path="subscribers" element={
            <StrictTierGate allowedTiers={[1, 2, 3]} allowStaff={false}><SubscriberManager /></StrictTierGate>
          } />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default App;
 