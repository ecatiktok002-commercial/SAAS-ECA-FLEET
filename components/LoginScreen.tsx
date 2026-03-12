
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { StaffMember } from '../types';
import { hashPin } from '../utils/crypto';

interface LoginScreenProps {
  onLogin?: (userId: string) => void; // Keeping for backward compatibility if needed
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const { login, companyId: existingCompanyId } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [accessCode, setAccessCode] = useState('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (existingCompanyId) {
      navigate('/');
    }
  }, [existingCompanyId, navigate]);

  // Step 1: Handle Company UID Login
  const handleCompanyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const code = accessCode.trim();
    if (!code) {
      setError('Please enter your Access Code.');
      setLoading(false);
      return;
    }

    if (code.toLowerCase() === 'superadmin') {
      setStep(3);
      setLoading(false);
      return;
    }

    try {
      let signInEmail = null;
      let signInPassword = code;

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code);

      if (isUuid) {
        const { data: email, error: rpcError } = await supabase
          .rpc('get_user_email', { user_id: code });
        
        if (!rpcError && email) {
          signInEmail = email;
        }
      }

      if (!signInEmail) {
        signInEmail = `${code}@ecafleet.com`;
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: signInEmail,
        password: signInPassword,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('Access Denied. Please ensure your Password matches your Access Code.');
        }
        throw authError;
      }

      if (authData.user) {
        setCompanyId(authData.user.id);
        
        const getDisplayId = (user: any) => {
          const email = user.email || '';
          if (email.endsWith('@ecafleet.com')) return email.split('@')[0];
          return email || 'Anonymous';
        };
        const displayId = getDisplayId(authData.user);
        setUserId(displayId);
        
        // Fetch staff members for this company
        const { data: staffData, error: staffError } = await supabase
          .from('staff_members')
          .select('*')
          .eq('company_id', authData.user.id);
          
        if (staffError) {
          console.error('Error fetching staff members:', staffError);
        } else if (staffData) {
          setStaffMembers(staffData);
        }
        
        // If no staff members exist, log them in directly as admin (company owner)
        if (!staffData || staffData.length === 0) {
          // Fetch company subscription tier
          let tier: 'tier_1' | 'tier_2' | 'tier_3' = 'tier_1'; // Default
          
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select('subscription_tier')
            .eq('id', authData.user.id)
            .single();
            
          if (!companyError && companyData && companyData.subscription_tier) {
            tier = companyData.subscription_tier as 'tier_1' | 'tier_2' | 'tier_3';
          }

          login(authData.user.id, 'admin', tier, displayId);
          if (onLogin) onLogin(authData.user.id);
          return;
        }
        
        setStep(2);
      }
      
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Handle Super Admin PIN Login
  const handleSuperAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) {
      setError('Please enter your PIN.');
      return;
    }

    if (pin !== '5615') {
      setError('Incorrect PIN.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'superadmin@ecafleet.com',
        password: 'superadmin',
      });

      if (authError) {
        throw authError;
      }

      if (authData.user) {
        login(authData.user.id, 'admin', 'tier_3', 'Master Admin');
        if (onLogin) onLogin(authData.user.id);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please ensure the password for superadmin@ecafleet.com is set to "superadmin".');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Handle Staff PIN Login
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) {
      setError('Please select your name.');
      return;
    }
    if (!pin) {
      setError('Please enter your PIN.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const staffMember = staffMembers.find(s => s.id === selectedStaffId);
      
      if (!staffMember) {
        throw new Error('Staff member not found.');
      }

      if (staffMember.pin_hash) {
        const hashedInputPin = await hashPin(pin);
        if (hashedInputPin !== staffMember.pin_hash) {
          throw new Error('Incorrect PIN.');
        }
      } else {
        // If no PIN is set for this staff member, we might allow them in or require them to set one.
        // For now, we'll allow them in if they don't have a PIN set.
      }

      // Fetch company subscription tier
      let tier: 'tier_1' | 'tier_2' | 'tier_3' = 'tier_1'; // Default
      
      if (companyId) {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('subscription_tier')
          .eq('id', companyId)
          .single();
          
        if (!companyError && companyData && companyData.subscription_tier) {
          tier = companyData.subscription_tier as 'tier_1' | 'tier_2' | 'tier_3';
        }
      }

      // Log in via Context
      const role = staffMember.role || 'staff';
      login(companyId!, role, tier, userId || undefined);
      
      if (onLogin) {
        onLogin(companyId!);
      }
      
    } catch (err: any) {
      setError(err.message || 'PIN verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[5000] bg-slate-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-[1000px] h-[1000px] bg-blue-500/20 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute top-1/2 -right-1/2 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-3xl opacity-30"></div>
      </div>

      <div className="relative bg-white w-full max-w-md p-8 rounded-[2rem] shadow-2xl animate-in zoom-in-95 duration-500">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-900/20">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Welcome to EcaFleet</h1>
          <p className="text-slate-500 font-medium">
            {step === 1 ? 'Please enter your Access Code to continue.' : 
             step === 2 ? 'Select your profile and enter PIN.' : 
             'Enter Master Admin PIN.'}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleCompanyLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Company ID (UID)</label>
              <input 
                type="text"
                value={accessCode}
                onChange={(e) => {
                  setAccessCode(e.target.value);
                  setError('');
                }}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-bold text-slate-800 placeholder-slate-300 text-center text-lg tracking-wider"
                placeholder="Enter Access Code"
                autoFocus
              />
            </div>

            {error && (
              <div className="text-rose-500 text-xs font-bold text-center animate-pulse bg-rose-50 p-3 rounded-lg border border-rose-100">
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Verify Company
            </button>
          </form>
        ) : step === 2 ? (
          <form onSubmit={handleStaffLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Select Staff Member</label>
              <select
                value={selectedStaffId}
                onChange={(e) => {
                  setSelectedStaffId(e.target.value);
                  setError('');
                }}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-bold text-slate-800"
              >
                <option value="" disabled>Select your name</option>
                {staffMembers.map(staff => (
                  <option key={staff.id} value={staff.id}>{staff.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Staff PIN</label>
              <input 
                type="password"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError('');
                }}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-bold text-slate-800 placeholder-slate-300 text-center text-lg tracking-wider"
                placeholder="****"
                maxLength={4}
              />
            </div>

            {error && (
              <div className="text-rose-500 text-xs font-bold text-center animate-pulse bg-rose-50 p-3 rounded-lg border border-rose-100">
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Access System
            </button>
            
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full py-3 text-slate-500 font-medium text-sm hover:text-slate-800 transition-colors"
            >
              Back to Company Login
            </button>
          </form>
        ) : (
          <form onSubmit={handleSuperAdminLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Master Admin PIN</label>
              <input 
                type="password"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError('');
                }}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all font-bold text-slate-800 placeholder-slate-300 text-center text-lg tracking-wider"
                placeholder="****"
                maxLength={4}
                autoFocus
              />
            </div>

            {error && (
              <div className="text-rose-500 text-xs font-bold text-center animate-pulse bg-rose-50 p-3 rounded-lg border border-rose-100">
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-purple-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Access Master Dashboard
            </button>
            
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setPin('');
              }}
              className="w-full py-3 text-slate-500 font-medium text-sm hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Authorized Personnel Only</p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
