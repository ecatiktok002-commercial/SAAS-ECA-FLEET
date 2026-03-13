
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import AdminDashboard from './pages/AdminDashboard';
import CalendarPage from './pages/CalendarPage';
import LoginScreen from './components/LoginScreen';
import StaffManagementPage from './pages/StaffManagementPage';
import DigitalFormPage from './pages/DigitalFormPage';
import CustomersPage from './pages/CustomersPage';
import FleetGuardianPage from './pages/FleetGuardianPage';
import SubscriberManager from './pages/SubscriberManager';

import ProtectedRoute from './components/ProtectedRoute';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          
          <Route path="/" element={<Layout />}>
            {/* Dashboard: Tier 3 Only */}
            <Route index element={
              <ProtectedRoute requiredTier="tier_3">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            
            {/* Calendar: Tier 2 or 3 */}
            <Route path="calendar" element={
              <ProtectedRoute requiredTier="tier_2">
                <CalendarPage />
              </ProtectedRoute>
            } />
            
            {/* Digital Forms: All Tiers */}
            <Route path="forms/*" element={
              <ProtectedRoute>
                <DigitalFormPage />
              </ProtectedRoute>
            } />
            
            {/* Customers: All Tiers */}
            <Route path="customers" element={
              <ProtectedRoute>
                <CustomersPage />
              </ProtectedRoute>
            } />
            
            {/* Fleet Guardian: Tier 3 Only */}
            <Route path="fleet" element={
              <ProtectedRoute requiredTier="tier_3">
                <FleetGuardianPage />
              </ProtectedRoute>
            } />
            
            {/* Staff Management: Admin Only */}
            <Route path="staff" element={
              <ProtectedRoute adminOnly>
                <StaffManagementPage />
              </ProtectedRoute>
            } />
            
            {/* Subscriber Manager: Superadmin Only (Handled by ProtectedRoute logic if needed, but here we just use adminOnly or explicit check) */}
            <Route path="subscribers" element={
              <ProtectedRoute adminOnly>
                <SubscriberManager />
              </ProtectedRoute>
            } />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
