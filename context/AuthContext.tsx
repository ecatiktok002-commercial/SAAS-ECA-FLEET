import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export type SubscriptionTier = 'tier_1' | 'tier_2' | 'tier_3';
export type StaffRole = 'admin' | 'staff';

interface AuthContextType {
  companyId: string | null;
  userId: string | null;
  user: string | null; // Alias for userId to match refined App.tsx
  userName: string | null;
  staffRole: StaffRole | null;
  role: StaffRole | null; // Alias for staffRole to match refined App.tsx
  subscriptionTier: SubscriptionTier | null;
  subscriberTier: number; // Numeric representation for refined App.tsx
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
        const companyId = isSuperAdmin ? 'superadmin' : session.user.id;
        setCompanyId(companyId);
        setUserId(getDisplayId(session.user));
        setUserName(isSuperAdmin ? 'Super Admin' : (session.user.user_metadata?.full_name || getDisplayId(session.user)));
        
        const storedRole = localStorage.getItem('staffRole') as StaffRole;
        const storedName = localStorage.getItem('userName');
        
        if (storedRole) {
          setStaffRole(storedRole);
          if (storedName) setUserName(storedName);
        }

        // Always fetch latest tier from DB for non-superadmins
        if (!isSuperAdmin) {
          const { data: companyData } = await supabase
            .from('companies')
            .select('tier')
            .eq('id', companyId)
            .single();
          
          if (companyData?.tier) {
            setSubscriptionTier(companyData.tier as SubscriptionTier);
            localStorage.setItem('subscriptionTier', companyData.tier);
          }
        } else {
          setSubscriptionTier('tier_3');
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

  const getTierNumber = (tier: SubscriptionTier | null): number => {
    if (tier === 'tier_3') return 3;
    if (tier === 'tier_2') return 2;
    return 1;
  };

  return (
    <AuthContext.Provider value={{ 
      companyId, 
      userId, 
      user: userId,
      userName, 
      staffRole, 
      role: staffRole,
      subscriptionTier, 
      subscriberTier: getTierNumber(subscriptionTier),
      isLoading, 
      login, 
      logout 
    }}>
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
