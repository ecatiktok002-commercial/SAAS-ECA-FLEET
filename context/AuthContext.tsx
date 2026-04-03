import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export type SubscriptionTier = 'tier_1' | 'tier_2' | 'tier_3';
export type StaffRole = 'admin' | 'staff' | 'agent';

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
  updateCompanyName: (name: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeTier = (tier: any): SubscriptionTier => {
  if (!tier) return 'tier_1';
  const normalized = String(tier).toLowerCase();
  if (normalized.includes('tier 3') || normalized.includes('tier_3') || normalized === '3') return 'tier_3';
  if (normalized.includes('tier 2') || normalized.includes('tier_2') || normalized === '2') return 'tier_2';
  return 'tier_1';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [subscriberId, setSubscriberId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userUid, setUserUid] = useState<string | null>(null);
  const [staffRole, setStaffRole] = useState<StaffRole | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier | null>(() => {
    const stored = localStorage.getItem('subscriptionTier');
    return normalizeTier(stored);
  });
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
          const errMsg = error.message || '';
          if (errMsg.includes('Refresh Token Not Found') || errMsg.includes('invalid_grant')) {
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
        
        // Fallback to current_subscriber_id from localStorage if set during login
        const currentSubId = localStorage.getItem('current_subscriber_id');
        
        // Fallback to user.id if still missing, but we'll validate if they are the owner
        let finalSubscriberId = isSuperAdmin ? 'superadmin' : (sId || currentSubId);

        if (!isSuperAdmin && !finalSubscriberId) {
          // Check if user is a subscriber (owner)
          const emailPrefix = session.user.email?.split('@')[0] || '';
          
          const { data: subData } = await supabase
            .from('subscribers')
            .select('id')
            .or(`id.eq.${session.user.id},name.ilike.${emailPrefix}`)
            .order('tier', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (subData) {
            finalSubscriberId = subData.id;
          } else {
            // Check if user is a staff member to get their subscriber_id
            const { data: staffMemberData } = await supabase
              .from('staff_members')
              .select('subscriber_id')
              .eq('id', session.user.id)
              .maybeSingle();
            
            if (staffMemberData) {
              finalSubscriberId = staffMemberData.subscriber_id;
            } else {
              // Last resort fallback
              finalSubscriberId = session.user.id;
            }
          }
        }
        
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
        setUserId(session.user.id);
        setUserName(isSuperAdmin ? 'Super Admin' : (session.user.user_metadata?.full_name || getDisplayId(session.user)));
        
        // Determine role: prioritize stored role, then owner/superadmin logic
        const storedRole = localStorage.getItem('staffRole') as StaffRole;
        // A user is the subscriber owner only if their ID matches the resolved finalSubscriberId
        // AND they are not a superadmin.
        const isSubscriberOwner = !isSuperAdmin && session.user.id === finalSubscriberId;
        
        if (isSuperAdmin) {
          setStaffRole('admin');
          localStorage.setItem('staffRole', 'admin');
        } else if (storedRole) {
          setStaffRole(storedRole);
        } else if (isSubscriberOwner) {
          setStaffRole('admin');
          localStorage.setItem('staffRole', 'admin');
        } else {
          // Try to fetch role from staff table if we have a userUid
          const storedUserUid = localStorage.getItem('userUid');
          const storedCompanyName = localStorage.getItem('companyName');
          if (storedUserUid && storedCompanyName) {
            try {
              const { data: staffData } = await supabase
                .from('staff')
                .select('role')
                .eq('access_id', storedUserUid)
                .eq('subscriber_id', storedCompanyName)
                .single();
              
              if (staffData?.role) {
                const role = staffData.role === 'admin' ? 'admin' : 'staff';
                setStaffRole(role as StaffRole);
                localStorage.setItem('staffRole', role);
              } else {
                setStaffRole('agent');
                localStorage.setItem('staffRole', 'agent');
              }
            } catch (err) {
              setStaffRole('agent');
              localStorage.setItem('staffRole', 'agent');
            }
          } else {
            // Fallback: check staff_members table using the UUID
            try {
              const { data: staffMemberData } = await supabase
                .from('staff_members')
                .select('role')
                .eq('id', session.user.id)
                .single();
              
              if (staffMemberData?.role) {
                setStaffRole(staffMemberData.role as StaffRole);
                localStorage.setItem('staffRole', staffMemberData.role);
              } else {
                setStaffRole('agent');
                localStorage.setItem('staffRole', 'agent');
              }
            } catch (err) {
              setStaffRole('agent');
              localStorage.setItem('staffRole', 'agent');
            }
          }
        }

        // Fetch latest tier and company name from DB for non-superadmins
        if (!isSuperAdmin) {
          let activeTier = 'tier_1';
          let displayName = '';
          
          // Always use verify_login_uid (SECURITY DEFINER) to fetch the correct tier and subscriber ID.
          // This bypasses RLS issues and handles duplicate records (e.g. self-provisioned vs Superadmin-created).
          const emailPrefix = session.user.email?.split('@')[0] || '';
          if (emailPrefix) {
            const { data: rpcData } = await supabase.rpc('verify_login_uid', { p_uid: emailPrefix });
            if (rpcData) {
              if (rpcData.role === 'disabled_subscriber' || rpcData.role === 'disabled_staff') {
                console.warn('Account is disabled. Logging out.');
                await logout();
                return;
              }

              activeTier = rpcData.tier ? normalizeTier(rpcData.tier) : 'tier_1';
              displayName = rpcData.company_code || rpcData.staff_name;
              
              // Update finalSubscriberId to the correct one from RPC
              if (rpcData.id || rpcData.subscriber_id) {
                finalSubscriberId = rpcData.subscriber_id || rpcData.id;
                setSubscriberId(finalSubscriberId);
                localStorage.setItem('subscriberId', finalSubscriberId);
              }
            }
          }
          
          // If RPC fails or returns nothing, fallback to direct query
          if (!displayName) {
            const { data: companyData } = await supabase
              .from('subscribers')
              .select('tier, name, status, is_active, expiry_date')
              .eq('id', finalSubscriberId)
              .single();
            
            if (companyData) {
              const isExpired = companyData.expiry_date && new Date(companyData.expiry_date) < new Date();
              if (companyData.status !== 'ACTIVE' || companyData.is_active === false || isExpired) {
                console.warn('Account is disabled or expired. Logging out.');
                await logout();
                return;
              }

              activeTier = companyData.tier ? normalizeTier(companyData.tier) : 'tier_1';
              displayName = companyData.name;
            }
          }
          
          setSubscriptionTier(activeTier as SubscriptionTier);
          localStorage.setItem('subscriptionTier', activeTier);
          
          if (displayName) {
            setCompanyName(displayName);
            localStorage.setItem('companyName', displayName);
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
              }
            } catch (e) {
              console.warn('Self-provisioning error:', e);
            }
          }
        } else {
          setSubscriptionTier('tier_3');
        }

        const storedRoleFromStorage = localStorage.getItem('staffRole') as StaffRole;
        const storedSubscriberId = localStorage.getItem('subscriberId');
        const storedTier = localStorage.getItem('subscriptionTier');
        const storedName = localStorage.getItem('userName');
        const storedUserId = localStorage.getItem('userId');
        const storedUserUid = localStorage.getItem('userUid');
        const storedCompanyName = localStorage.getItem('companyName');
        
        if (storedRoleFromStorage) {
          setStaffRole(storedRoleFromStorage);
          if (storedSubscriberId) setSubscriberId(storedSubscriberId);
          if (storedTier) setSubscriptionTier(normalizeTier(storedTier));
          if (storedName) setUserName(storedName);
          if (storedUserId) setUserId(storedUserId);
          if (storedCompanyName) setCompanyName(storedCompanyName);
          
          if (storedUserUid) {
            setUserUid(storedUserUid);
          } else if (storedRoleFromStorage === 'agent' && storedUserId) {
            // Fallback: Fetch staff_uid if missing from storage
            const { data: staffData } = await supabase
              .from('staff_members')
              .select('access_id')
              .eq('id', storedUserId)
              .single();
            
            if (staffData?.access_id) {
              setUserUid(staffData.access_id);
              localStorage.setItem('userUid', staffData.access_id);
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
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    setSubscriberId(null);
    setUserId(null);
    setUserName(null);
    setUserUid(null);
    setStaffRole(null);
    setSubscriptionTier(null);
    setCompanyName(null);
    localStorage.removeItem('subscriberId');
    localStorage.removeItem('current_subscriber_id');
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

  const updateCompanyName = (name: string) => {
    setCompanyName(name);
    localStorage.setItem('companyName', name);
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
      logout,
      updateCompanyName
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
