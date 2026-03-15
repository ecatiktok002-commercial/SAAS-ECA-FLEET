
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { hashPin } from '../utils/crypto';

interface LoginScreenProps {
  onLogin?: (userId: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const { login, subscriberId: existingSubscriberId, staffRole: existingStaffRole } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: UID, 2: Staff PIN, 3: Superadmin PIN
  const [uidInput, setUidInput] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detectedRole, setDetectedRole] = useState<any>(null);

  // Redirect if already logged in fully
  useEffect(() => {
    if (existingSubscriberId && existingStaffRole) {
      navigate('/');
    }
  }, [existingSubscriberId, existingStaffRole, navigate]);

  // Step 1: Handle UID Verification (Smart Detection)
  const handleVerifyUid = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = uidInput.trim();
    if (!uid) {
      setError('Please enter your UID.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Path A: Superadmin
      if (uid.toLowerCase() === 'superadmin') {
        setStep(3);
        setLoading(false);
        return;
      }

      // Call RPC to detect role
      const { data, error: rpcError } = await supabase.rpc('verify_login_uid', { p_uid: uid });
      
      let roleData = data;

      // Fallback if RPC is missing or fails
      if (rpcError || !roleData || roleData.role === 'unknown') {
        let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: `${uid}@ecafleet.com`,
          password: `${uid}Eca123!`, // Try strong password first
        });

        if (authError) {
          // Fallback to old password format
          const fallback = await supabase.auth.signInWithPassword({
            email: `${uid}@ecafleet.com`,
            password: uid,
          });
          authData = fallback.data;
          authError = fallback.error;
        }

        if (authError || !authData.user) {
          throw new Error('Invalid UID. If you are a staff member, please ensure the database RPC is installed.');
        }

        // It's a company (Subscriber)
        const { data: companyData } = await supabase
          .from('subscribers')
          .select('tier')
          .eq('id', authData.user.id)
          .single();

        roleData = {
          role: 'subscriber',
          id: authData.user.id,
          tier: companyData?.tier || 'tier_1',
          company_code: uid
        };
      }

      setDetectedRole(roleData);

      // Path B: Subscriber (Owner)
      if (roleData.role === 'subscriber') {
        await loginAsSubscriber(roleData);
      } 
      // Path C: Staff (Agent)
      else if (roleData.role === 'staff') {
        setStep(2);
      } else {
        throw new Error('Unknown role detected.');
      }

    } catch (err: any) {
      setError(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const loginAsSubscriber = async (roleData: any) => {
    try {
      // Ensure Supabase Auth session
      let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: `${roleData.company_code}@ecafleet.com`,
        password: `${roleData.company_code}Eca123!`, // Try strong password first
      });

      if (authError) {
        // Fallback to old password format
        const fallback = await supabase.auth.signInWithPassword({
          email: `${roleData.company_code}@ecafleet.com`,
          password: roleData.company_code,
        });
        authData = fallback.data;
        authError = fallback.error;
      }

      if (authError) throw authError;

      login(roleData.id, 'admin', roleData.tier, roleData.company_code, roleData.company_code, roleData.company_code);
      if (onLogin) onLogin(roleData.id);
    } catch (err: any) {
      setError('Failed to login as Subscriber: ' + err.message);
    }
  };

  // Step 2: Handle Staff PIN Login
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) {
      setError('Please enter your PIN.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (!detectedRole || detectedRole.role !== 'staff') {
        throw new Error('Invalid state. Please restart login.');
      }

      // Verify PIN
      if (detectedRole.pin_hash) {
        const hashedInputPin = await hashPin(pin);
        if (hashedInputPin !== detectedRole.pin_hash) {
          throw new Error('Incorrect PIN.');
        }
      }

      // Login to Supabase Auth as the Company to satisfy RLS
      const sanitizedCode = detectedRole.company_code.toLowerCase().replace(/\s+/g, '');
      
      let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: `${sanitizedCode}@ecafleet.com`,
        password: `${sanitizedCode}Eca123!`,
      });

      if (authError) {
        // Try with original company code (legacy)
        const original = await supabase.auth.signInWithPassword({
          email: `${detectedRole.company_code}@ecafleet.com`,
          password: `${detectedRole.company_code}Eca123!`,
        });
        
        if (original.error) {
          // Try fallback format for sanitized
          const fallbackSanitized = await supabase.auth.signInWithPassword({
            email: `${sanitizedCode}@ecafleet.com`,
            password: sanitizedCode,
          });
          
          if (fallbackSanitized.error) {
            // Try fallback format for original
            const fallbackOriginal = await supabase.auth.signInWithPassword({
              email: `${detectedRole.company_code}@ecafleet.com`,
              password: detectedRole.company_code,
            });
            
            authData = fallbackOriginal.data;
            authError = fallbackOriginal.error;
          } else {
            authData = fallbackSanitized.data;
            authError = null;
          }
        } else {
          authData = original.data;
          authError = null;
        }
      }

      if (authError) {
        throw new Error(`Failed to authenticate with company credentials (${detectedRole.company_code}). Please ensure the Subscriber account is active.`);
      }

      // Log in via Context
      login(detectedRole.subscriber_id, 'staff', detectedRole.tier || 'tier_1', detectedRole.staff_id, detectedRole.staff_name, detectedRole.designated_uid);
      
      if (onLogin) {
        onLogin(detectedRole.subscriber_id);
      }
      
    } catch (err: any) {
      setError(err.message || 'PIN verification failed.');
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
      let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'superadmin@ecafleet.com',
        password: 'superadmin',
      });

      if (authError && authError.message.includes('Invalid login credentials')) {
        // Try to sign up if the user doesn't exist
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: 'superadmin@ecafleet.com',
          password: 'superadmin',
        });
        
        if (signUpError) {
          if (signUpError.message.includes('User already registered')) {
            throw new Error('Invalid credentials for Master Admin. Please ensure the password for superadmin@ecafleet.com is set to "superadmin".');
          }
          throw signUpError;
        }
        
        // After signup, we might need to sign in again if email confirmation is disabled
        // If email confirmation is enabled, this will still fail until confirmed.
        if (signUpData.user && signUpData.session) {
          authData = { user: signUpData.user, session: signUpData.session };
          authError = null;
        } else {
          throw new Error('Superadmin account created but requires email confirmation. Please disable email confirmation in Supabase Auth settings or confirm the email.');
        }
      } else if (authError) {
        throw authError;
      }

      if (authData?.user) {
        login('superadmin', 'admin', 'tier_3', 'Master Admin', 'Master Admin', 'superadmin');
        if (onLogin) onLogin('superadmin');
      }
    } catch (err: any) {
      let errorMessage = err.message || 'Authentication failed.';
      
      if (errorMessage.includes('Invalid API key')) {
        errorMessage = 'Supabase Configuration Error: The API Key provided is invalid for this project URL. Please check your environment variables in the Settings menu.';
      } else if (errorMessage.includes('Invalid login credentials')) {
        errorMessage = 'Invalid credentials for Master Admin. Please ensure the password for superadmin@ecafleet.com is set to "superadmin".';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setStep(1);
    setUidInput('');
    setPin('');
    setDetectedRole(null);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-[5000] bg-slate-900 flex items-center justify-center p-4">
      {/* Subtle geometric grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-[1000px] h-[1000px] bg-blue-500/20 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute top-1/2 -right-1/2 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-3xl opacity-30"></div>
      </div>

      <div className="relative bg-white/95 backdrop-blur-xl w-full max-w-md p-8 rounded-[2rem] shadow-2xl animate-in zoom-in-95 duration-500 border border-white/20">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-900/20">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
            {detectedRole?.role === 'subscriber' ? 'Business Command Center' :
             step === 1 ? 'Welcome to the Car Rental Digitalization Era' :
             step === 2 ? 'Agent Operations Portal' :
             step === 3 ? 'System Core Access' :
             'Welcome to the Car Rental Digitalization Era'}
          </h1>
          <p className="text-slate-500 font-medium">
            {detectedRole?.role === 'subscriber' ? 'Welcome back, Owner. Preparing your dashboard...' :
             step === 1 ? 'Powering the future of fleet management. Enter your UID.' : 
             step === 2 ? 'Enter your Staff PIN to access your shift.' : 
             step === 3 ? 'Master PIN authentication required.' :
             'Powering the future of fleet management. Enter your UID.'}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleVerifyUid} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">User ID (UID)</label>
              <input 
                type="text"
                value={uidInput}
                onChange={(e) => {
                  setUidInput(e.target.value);
                  setError('');
                  setDetectedRole(null);
                }}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-bold text-slate-800 placeholder-slate-300 text-center text-lg tracking-wider"
                placeholder="Enter UID"
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
              Verify
            </button>
          </form>
        ) : step === 2 ? (
          <form onSubmit={handleStaffLogin} className="space-y-4">
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
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Access System
            </button>
            
            <button
              type="button"
              onClick={handleCancel}
              className="w-full py-3 text-slate-500 font-medium text-sm hover:text-slate-800 transition-colors"
            >
              Cancel
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
              onClick={handleCancel}
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
