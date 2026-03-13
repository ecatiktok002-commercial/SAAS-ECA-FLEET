import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, SubscriptionTier, StaffRole } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredTier?: SubscriptionTier;
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredTier, 
  adminOnly 
}) => {
  const { companyId, staffRole, subscriptionTier, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const isSuperAdmin = companyId === 'superadmin';

  // Basic Auth Check
  if (!companyId || !staffRole || !subscriptionTier) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Super Admin bypasses all gates
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // Role Gate
  if (adminOnly && staffRole !== 'admin') {
    // If an Agent tries to access /staff-management, redirect them to their allowed dashboard
    return <Navigate to="/" replace />;
  }

  // Tier Gate
  if (requiredTier) {
    const tierLevels: Record<SubscriptionTier, number> = {
      'tier_1': 1,
      'tier_2': 2,
      'tier_3': 3
    };

    if (tierLevels[subscriptionTier] < tierLevels[requiredTier]) {
      // Redirect to the highest allowed route for their tier
      if (subscriptionTier === 'tier_1') return <Navigate to="/forms" replace />;
      if (subscriptionTier === 'tier_2') return <Navigate to="/calendar" replace />;
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
