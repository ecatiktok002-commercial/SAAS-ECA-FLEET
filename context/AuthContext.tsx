import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export type SubscriptionTier = 'tier_1' | 'tier_2' | 'tier_3';
export type StaffRole = 'admin' | 'staff';

interface AuthContextType {
  subscriberId: string | null;
  userId: string | null;
  user: string | null; // Alias for userId to match refined App.tsx
  userName: string | null;
  userUid: string | null; // The actual string UID (e.g. 'michaelcar' or 'john_staff')
  staffRole: StaffRole | null;
  role: StaffRole | null; // Alias for staffRole to match refined App.tsx
  subscriptionTier: SubscriptionTier | null;
  subscriberTier: number; // Numeric representation for refined App.tsx
  isLoading: boolean;
  login: (subscriberId: string, staffRole: StaffRole, subscriptionTier: SubscriptionTier, userId?: string, userName?: string, userUid?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [subscriberId, setSubscriberId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userUid, setUserUid] = useState<string | null>(null);
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
        
        // Retrieve subscriber_id from metadata or profiles table
        let sId = session.user.user_metadata?.subscriber_id;
        
        if (!sId && !isSuperAdmin) {
          // Try fetching from a profiles table if metadata is missing
          const { data: profile } = await supabase
            .from('profiles')
            .select('subscriber_id')
            .eq('id', session.user.id)
            .single();
          
          if (profile?.subscriber_id) {
            sId = profile.subscriber_id;
          }
        }

        // Fallback to user.id if still missing
        const finalSubscriberId = isSuperAdmin ? 'superadmin' : (sId || session.user.id);
        
        setSubscriberId(finalSubscriberId);
        setUserId(getDisplayId(session.user));
        setUserName(isSuperAdmin ? 'Super Admin' : (session.user.user_metadata?.full_name || getDisplayId(session.user)));
        
        const storedRole = localStorage.getItem('staffRole') as StaffRole;
        const storedName = localStorage.getItem('userName');
        const storedUserId = localStorage.getItem('userId');
        const storedUserUid = localStorage.getItem('userUid');
        
        if (storedRole) {
          setStaffRole(storedRole);
          if (storedName) setUserName(storedName);
          if (storedUserId) setUserId(storedUserId);
          if (storedUserUid) setUserUid(storedUserUid);
        } else if (isSuperAdmin) {
          setStaffRole('admin');
        }

        // Always fetch latest tier from DB for non-superadmins
        if (!isSuperAdmin) {
          const { data: companyData } = await supabase
            .from('companies')
            .select('tier')
            .eq('id', finalSubscriberId)
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

  const login = (id: string, role: StaffRole, tier: SubscriptionTier, uId?: string, uName?: string, uUid?: string) => {
    setSubscriberId(id);
    setStaffRole(role);
    setSubscriptionTier(tier);
    if (uId) {
      setUserId(uId);
      localStorage.setItem('userId', uId);
    }
    if (uName) {
      setUserName(uName);
      localStorage.setItem('userName', uName);
    }
    if (uUid) {
      setUserUid(uUid);
      localStorage.setItem('userUid', uUid);
    }
    localStorage.setItem('staffRole', role);
    localStorage.setItem('subscriptionTier', tier);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSubscriberId(null);
    setUserId(null);
    setUserName(null);
    setUserUid(null);
    setStaffRole(null);
    setSubscriptionTier(null);
    localStorage.removeItem('staffRole');
    localStorage.removeItem('subscriptionTier');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    localStorage.removeItem('userUid');
  };

  const getTierNumber = (tier: SubscriptionTier | null): number => {
    if (tier === 'tier_3') return 3;
    if (tier === 'tier_2') return 2;
    return 1;
  };

  return (
    <AuthContext.Provider value={{ 
      subscriberId,
      userId, 
      user: userId,
      userName, 
      userUid,
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
