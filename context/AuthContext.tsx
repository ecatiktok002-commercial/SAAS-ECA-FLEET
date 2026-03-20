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
  companyName: string | null;
  isLoading: boolean;
  login: (subscriberId: string, staffRole: StaffRole, subscriptionTier: SubscriptionTier, userId?: string, userName?: string, userUid?: string, companyName?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeTier = (tier: string | null): SubscriptionTier => {
  if (!tier) return 'tier_1';
  const normalized = tier.toLowerCase().replace(' ', '_');
  if (normalized === 'tier_1' || normalized === 'tier_2' || normalized === 'tier_3') {
    return normalized as SubscriptionTier;
  }
  return 'tier_1';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [subscriberId, setSubscriberId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userUid, setUserUid] = useState<string | null>(null);
  const [staffRole, setStaffRole] = useState<StaffRole | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getDisplayId = (user: any) => {
      const email = user.email || '';
      if (email.endsWith('@ecafleet.com')) return email.split('@')[0];
      return email || 'Anonymous';
    };

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          if (error.message.includes('Refresh Token Not Found') || error.message.includes('invalid_grant')) {
            console.warn('Auth session expired or invalid. Logging out.');
            await logout();
            return;
          }
          throw error;
        }

        if (session?.user) {
        const isSuperAdmin = session.user.email === 'superadmin@ecafleet.com';
        
        // Retrieve subscriber_id from metadata
        let sId = session.user.user_metadata?.subscriber_id;
        
        // Fallback to user.id if still missing
        let finalSubscriberId = isSuperAdmin ? 'superadmin' : (sId || session.user.id);
        
        // If it's a slug (not a UUID), try to resolve it to a UUID for database compatibility
        if (finalSubscriberId && finalSubscriberId !== 'superadmin' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(finalSubscriberId)) {
          try {
            const { data: subData } = await supabase
              .from('subscribers')
              .select('id')
              .eq('name', finalSubscriberId)
              .single();
            
            if (subData?.id) {
              finalSubscriberId = subData.id;
            }
          } catch (err) {
            console.warn('Failed to resolve subscriber slug to UUID:', err);
          }
        }
        
        setSubscriberId(finalSubscriberId);
        setUserId(getDisplayId(session.user));
        setUserName(isSuperAdmin ? 'Super Admin' : (session.user.user_metadata?.full_name || getDisplayId(session.user)));
        
        // Fetch latest tier and company name from DB for non-superadmins
        if (!isSuperAdmin) {
          const { data: companyData } = await supabase
            .from('subscribers')
            .select('tier, name')
            .eq('id', finalSubscriberId)
            .single();
          
          if (companyData) {
            if (companyData.tier) {
              const normalizedTier = normalizeTier(companyData.tier);
              setSubscriptionTier(normalizedTier);
              localStorage.setItem('subscriptionTier', normalizedTier);
            }
            if (companyData.name) {
              setCompanyName(companyData.name);
              localStorage.setItem('companyName', companyData.name);
            }
          } else if (finalSubscriberId === session.user.id) {
            // Self-Provisioning: Only if record is missing and it's their own ID
            try {
              const { error: upsertError } = await supabase
                .from('subscribers')
                .insert({
                  id: session.user.id,
                  name: session.user.user_metadata?.full_name || getDisplayId(session.user),
                  tier: 'Tier 1',
                  status: 'ACTIVE'
                });
              
              if (upsertError && upsertError.code !== '23505') { // Ignore duplicate key error
                console.warn('Self-provisioning subscriber record failed:', upsertError);
              } else {
                setSubscriptionTier('tier_1');
                localStorage.setItem('subscriptionTier', 'tier_1');
              }
            } catch (e) {
              console.warn('Self-provisioning error:', e);
            }
          }
        } else {
          setSubscriptionTier('tier_3');
        }

        const storedRole = localStorage.getItem('staffRole') as StaffRole;
        const storedSubscriberId = localStorage.getItem('subscriberId');
        const storedTier = localStorage.getItem('subscriptionTier');
        const storedName = localStorage.getItem('userName');
        const storedUserId = localStorage.getItem('userId');
        const storedUserUid = localStorage.getItem('userUid');
        const storedCompanyName = localStorage.getItem('companyName');
        
        if (storedRole) {
          setStaffRole(storedRole);
          if (storedSubscriberId) setSubscriberId(storedSubscriberId);
          if (storedTier) setSubscriptionTier(normalizeTier(storedTier));
          if (storedName) setUserName(storedName);
          if (storedUserId) setUserId(storedUserId);
          if (storedCompanyName) setCompanyName(storedCompanyName);
          
          if (storedUserUid) {
            setUserUid(storedUserUid);
          } else if (storedRole === 'staff' && storedUserId) {
            // Fallback: Fetch staff_uid if missing from storage
            const { data: staffData } = await supabase
              .from('staff_members')
              .select('staff_uid')
              .eq('id', storedUserId)
              .single();
            
            if (staffData?.staff_uid) {
              setUserUid(staffData.staff_uid);
              localStorage.setItem('userUid', staffData.staff_uid);
            }
          }
        } else if (isSuperAdmin) {
          setStaffRole('admin');
        }
      }
    } catch (err) {
      console.error('Error checking session:', err);
    } finally {
      setIsLoading(false);
    }
  };
    
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setSubscriberId(null);
        setUserId(null);
        setUserName(null);
        setUserUid(null);
        setStaffRole(null);
        setSubscriptionTier(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session) {
          checkSession();
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = (id: string, role: StaffRole, tier: string, uId?: string, uName?: string, uUid?: string, cName?: string) => {
    const normalizedTier = normalizeTier(tier);
    setSubscriberId(id);
    setStaffRole(role);
    setSubscriptionTier(normalizedTier);
    localStorage.setItem('subscriberId', id);
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
    if (cName) {
      setCompanyName(cName);
      localStorage.setItem('companyName', cName);
    }
    localStorage.setItem('staffRole', role);
    localStorage.setItem('subscriptionTier', normalizedTier);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSubscriberId(null);
    setUserId(null);
    setUserName(null);
    setUserUid(null);
    setStaffRole(null);
    setSubscriptionTier(null);
    setCompanyName(null);
    localStorage.removeItem('subscriberId');
    localStorage.removeItem('staffRole');
    localStorage.removeItem('subscriptionTier');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    localStorage.removeItem('userUid');
    localStorage.removeItem('companyName');
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
      companyName,
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
