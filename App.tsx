
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
import ConfigError from './components/ConfigError';
import { isConfigured } from './services/supabase';

const App: React.FC = () => {
  if (!isConfigured) {
    return <ConfigError />;
  }

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          
          <Route path="/" element={<Layout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="forms/*" element={<DigitalFormPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="fleet" element={<FleetGuardianPage />} />
            <Route path="staff" element={<StaffManagementPage />} />
            <Route path="subscribers" element={<SubscriberManager />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
