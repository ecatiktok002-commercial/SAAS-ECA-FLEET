import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export type SubscriptionTier = 'tier_1' | 'tier_2' | 'tier_3';
export type StaffRole = 'admin' | 'staff';

interface AuthContextType {
  companyId: string | null;
  userId: string | null;
  userName: string | null;
  staffRole: StaffRole | null;
  subscriptionTier: SubscriptionTier | null;
  isLoading: boolean;
  login: (companyId: string, staffRole: StaffRole, subscriptionTier: SubscriptionTier, userId?: string, userName?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
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
        const isSuperAdmin = session.user.email === 'superadmin@ecafleet.com';
        setCompanyId(isSuperAdmin ? 'superadmin' : session.user.id);
        setUserId(getDisplayId(session.user));
        setUserName(isSuperAdmin ? 'Super Admin' : (session.user.user_metadata?.full_name || getDisplayId(session.user)));
        
        const storedRole = localStorage.getItem('staffRole') as StaffRole;
        const storedTier = localStorage.getItem('subscriptionTier') as SubscriptionTier;
        const storedName = localStorage.getItem('userName');
        
        if (storedRole && storedTier) {
          setStaffRole(storedRole);
          setSubscriptionTier(storedTier);
          if (storedName) setUserName(storedName);
        }
      }
      setIsLoading(false);
    };
    
    checkSession();
  }, []);

  const login = (id: string, role: StaffRole, tier: SubscriptionTier, uId?: string, uName?: string) => {
    setCompanyId(id);
    setStaffRole(role);
    setSubscriptionTier(tier);
    if (uId) setUserId(uId);
    if (uName) {
      setUserName(uName);
      localStorage.setItem('userName', uName);
    }
    localStorage.setItem('staffRole', role);
    localStorage.setItem('subscriptionTier', tier);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCompanyId(null);
    setUserId(null);
    setUserName(null);
    setStaffRole(null);
    setSubscriptionTier(null);
    localStorage.removeItem('staffRole');
    localStorage.removeItem('subscriptionTier');
    localStorage.removeItem('userName');
  };

  return (
    <AuthContext.Provider value={{ companyId, userId, userName, staffRole, subscriptionTier, isLoading, login, logout }}>
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
