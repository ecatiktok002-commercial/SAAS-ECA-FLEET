import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export type SubscriptionTier = 'tier_1' | 'tier_2' | 'tier_3';
export type StaffRole = 'admin' | 'staff';

interface AuthContextType {
  companyId: string | null;
  userId: string | null;
  staffRole: StaffRole | null;
  subscriptionTier: SubscriptionTier | null;
  isLoading: boolean;
  login: (companyId: string, staffRole: StaffRole, subscriptionTier: SubscriptionTier, userId?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [staffRole, setStaffRole] = useState<StaffRole | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getDisplayId = (user: any) => {
      const email = user.email || '';
      if (email.endsWith('@ecafleet.com')) return email.split('@')[0];
      return email || 'Anonymous';
    };

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCompanyId(session.user.id);
        setUserId(getDisplayId(session.user));
        
        const storedRole = localStorage.getItem('staffRole') as StaffRole;
        const storedTier = localStorage.getItem('subscriptionTier') as SubscriptionTier;
        
        if (storedRole && storedTier) {
          setStaffRole(storedRole);
          setSubscriptionTier(storedTier);
        }
      }
      setIsLoading(false);
    };
    
    checkSession();
  }, []);

  const login = (id: string, role: StaffRole, tier: SubscriptionTier, uId?: string) => {
    setCompanyId(id);
    setStaffRole(role);
    setSubscriptionTier(tier);
    if (uId) setUserId(uId);
    localStorage.setItem('staffRole', role);
    localStorage.setItem('subscriptionTier', tier);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCompanyId(null);
    setUserId(null);
    setStaffRole(null);
    setSubscriptionTier(null);
    localStorage.removeItem('staffRole');
    localStorage.removeItem('subscriptionTier');
  };

  return (
    <AuthContext.Provider value={{ companyId, userId, staffRole, subscriptionTier, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
