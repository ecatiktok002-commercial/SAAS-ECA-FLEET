import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import SupabaseConnectionBanner from './SupabaseConnectionBanner';
import SchemaErrorBanner from './SchemaErrorBanner';
import { Menu } from 'lucide-react';

const Layout: React.FC = () => {
  const { subscriberId, staffRole, subscriptionTier, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    if (isLoading || !subscriberId || !staffRole || !subscriptionTier) return;

    const path = location.pathname;
    const isAdmin = staffRole === 'admin';
    const isStaff = staffRole === 'staff';
    const isSuperAdmin = subscriberId === 'superadmin';

    if (isSuperAdmin) return;

    // Layer 2: Role Gate (Data Access)
    // Agent Role: NEVER sees /staff-management
    if (isStaff && path.startsWith('/staff')) {
      navigate('/', { replace: true });
      return;
    }

    // Layer 1: Tier Gate (Feature Access)
    // Tier 1: Only /forms
    if (subscriptionTier === 'tier_1') {
      if (path === '/' && isStaff) {
        navigate('/forms', { replace: true });
        return;
      }
      const allowedPaths = ['/', '/forms', '/customers'];
      const isAllowed = allowedPaths.some(p => path === p || path.startsWith(p + '/'));
      if (!isAllowed && path !== '/staff') { // Staff is handled by Role Gate
        navigate(isStaff ? '/forms' : '/', { replace: true });
      }
    }

    // Tier 2: /calendar and /forms
    if (subscriptionTier === 'tier_2') {
      if (path === '/' && isStaff) {
        navigate('/calendar', { replace: true });
        return;
      }
      const allowedPaths = ['/', '/calendar', '/forms', '/customers'];
      const isAllowed = allowedPaths.some(p => path === p || path.startsWith(p + '/'));
      if (!isAllowed && path !== '/staff') {
        navigate(isStaff ? '/calendar' : '/', { replace: true });
      }
    }

    // Tier 3: All (Forms, Calendar, Fleet)
    if (subscriptionTier === 'tier_3') {
      if (path === '/' && isStaff) {
        navigate('/calendar', { replace: true });
        return;
      }
    }
  }, [location.pathname, subscriberId, staffRole, subscriptionTier, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // If not fully logged in (missing subscriberId or staffRole/tier), redirect to login
  if (!subscriberId || !staffRole || !subscriptionTier) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans relative">
      <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
      
      <main className="flex-1 overflow-y-auto relative w-full">
        {/* Floating Mobile Hamburger Button */}
        <button 
          onClick={() => setIsMobileOpen(true)}
          className="md:hidden fixed bottom-6 right-6 z-30 p-4 bg-slate-900 text-white rounded-full shadow-2xl hover:bg-slate-800 transition-transform active:scale-95"
        >
          <Menu className="w-6 h-6" />
        </button>
        
        <Outlet />
      </main>
      <SupabaseConnectionBanner />
      <SchemaErrorBanner />
    </div>
  );
};

export default Layout;
