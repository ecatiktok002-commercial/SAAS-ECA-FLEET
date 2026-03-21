
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
  const { login, subscriberId: existingSubscriberId, staffRole: existingStaffRole, subscriptionTier: existingSubscriptionTier } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: UID, 2: Staff PIN, 3: Superadmin PIN
  const [uidInput, setUidInput] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [detectedRole, setDetectedRole] = useState<any>(null);

  // Redirect if already logged in fully
  useEffect(() => {
    if (existingSubscriberId && existingStaffRole && existingSubscriptionTier) {
      navigate('/');
    }
  }, [existingSubscriberId, existingStaffRole, existingSubscriptionTier, navigate]);

  // Step 1: Handle UID Verification (Smart Detection)
  const handleVerifyUid = async (e: React.FormEvent) => {
    e.preventDefault();
    // 1. Sanitize the input
    const uid = uidInput.trim().toLowerCase();
    if (!uid) {
      setError('Please enter your UID.');
      return;
    }

    setLoading(true);
    setStatusMessage('Verifying...');
    setError('');

    try {
      // Path A: Superadmin
      if (uid === 'superadmin') {
        setStep(3);
        setLoading(false);
        return;
      }

      // 1. The Parallel Check
      // Check A (Staff): Search the staff table for a record where staff_uid matches the input and is_active is true.
      // Check B (Subscriber): Attempt a standard supabase.auth.signInWithPassword using {input}@ecafleet.com and the password {input}.
      const [staffCheck, authCheck] = await Promise.all([
        supabase.from('staff').select('*').eq('access_id', uid).eq('is_active', true).maybeSingle(),
        supabase.auth.signInWithPassword({
          email: `${uid}@ecafleet.com`,
          password: uid,
        }).catch(err => ({ data: { user: null, session: null }, error: err }))
      ]);

      const staffData = staffCheck.data;
      const authData = authCheck.data;
      const authError = authCheck.error;

      // 2. Execution Flow
      // If a Staff record is found: Halt the Auth login attempt. Show a PIN Input Overlay.
      if (staffData) {
        // We need the subscriber metadata (tier, id)
        const { data: subData } = await supabase.rpc('verify_login_uid', { p_uid: uid });
        setDetectedRole(subData);
        setStep(2); // Show the PIN Input Overlay
        setLoading(false);
        return;
      }

      // If the Auth Login (Subscriber) succeeds first: Redirect immediately to the Admin Dashboard.
      if (authData?.user && !authError) {
        // This is a Subscriber.
        // We need the subscriber metadata (tier, id)
        const { data: subData } = await supabase.rpc('verify_login_uid', { p_uid: uid });

        if (subData && subData.role === 'subscriber') {
          localStorage.setItem('current_subscriber_id', subData.id);
          // Parameters: id, role, tier, uId, uName, uUid, cName
          login(subData.id, 'admin', subData.tier, subData.id, subData.company_code, authData.user.id, subData.company_code);
          if (onLogin) onLogin(subData.id);
          return;
        }
      }

      // Special case for subscribers who might have a different password (legacy)
      const { data: legacySubData } = await supabase.rpc('verify_login_uid', { p_uid: uid });
      if (legacySubData && legacySubData.role === 'subscriber') {
        const sharedUid = legacySubData.company_code.toLowerCase();
        const email = `${sharedUid}@ecafleet.com`;
        const subscriberPassword = `${sharedUid}Eca123!`;
        const fallback = await supabase.auth.signInWithPassword({
          email,
          password: subscriberPassword,
        });
        
        if (!fallback.error) {
          localStorage.setItem('current_subscriber_id', legacySubData.id);
          // Parameters: id, role, tier, uId, uName, uUid, cName
          login(legacySubData.id, 'admin', legacySubData.tier, legacySubData.id, legacySubData.company_code, fallback.data.user.id, legacySubData.company_code);
          if (onLogin) onLogin(legacySubData.id);
          return;
        }
      }

      // If both fail: Show 'Invalid UID or Credentials'
      throw new Error('Invalid UID or Credentials');

    } catch (err: any) {
      setError(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Handle Staff PIN Login
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) {
      setError('Please enter your Security PIN.');
      return;
    }

    setLoading(true);
    setStatusMessage('Verifying PIN...');
    setError('');

    try {
      if (!detectedRole || detectedRole.role !== 'staff') {
        throw new Error('Invalid state. Please restart login.');
      }

      // Step 3: The PIN & Session Isolation
      // Compare input PIN to the pin_code retrieved in Step 1
      if (detectedRole.pin_code) {
        if (pin !== detectedRole.pin_code) {
          throw new Error('Incorrect Security PIN.');
        }
      } else if (detectedRole.pin_hash) {
        // Fallback to hashed PIN if using legacy staff_members table
        const hashedInputPin = await hashPin(pin);
        if (hashedInputPin !== detectedRole.pin_hash) {
          throw new Error('Incorrect Security PIN.');
        }
      } else {
        throw new Error('No PIN configured for this account. Contact Admin.');
      }

      // Once PIN is verified, perform the Hidden Master Login for the staff member's company
      const sharedUid = (detectedRole.subscriber_slug || '').toLowerCase();
      const email = `${sharedUid}@ecafleet.com`;
      const password = sharedUid;

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new Error('Company access failed. Please contact your Master Admin.');
      }

      // Success! Log in via Context
      // We save the staff's specific identity to the session
      login(
        detectedRole.subscriber_id, 
        'staff', 
        detectedRole.tier || 'tier_1', 
        detectedRole.staff_id, 
        detectedRole.staff_name, 
        detectedRole.staff_uid
      );
      
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

            {loading && statusMessage && (
              <div className="text-blue-600 text-xs font-bold text-center animate-pulse bg-blue-50 p-3 rounded-lg border border-blue-100">
                {statusMessage}
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
