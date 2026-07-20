import React from 'react';
import { Shield, ArrowUpCircle, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';

const UpgradePlanPage: React.FC = () => {
  const { subscriptionTier, subscriberTier } = useAuth();
  const navigate = useNavigate();

  // 🛡️ Guard: If the subscriber is already Tier 3, they shouldn't be here
  if (subscriberTier === 3) {
    return <Navigate to="/dashboard" replace />;
  }

  const tiers = [
    {
      name: 'Starter',
      price: 'RM 49/mo',
      description: 'Perfect for operators with 1–10 vehicles. Stop using paper agreements forever.',
      features: [
        'Unlimited Digital Rental Agreements',
        'Digital Signature',
        'PDF Auto Generation',
        'Staff Management'
      ],
      isCurrent: subscriberTier === 1
    },
    {
      name: 'Growth',
      price: 'RM 99/mo',
      description: 'Perfect for operators with 10–30 vehicles.',
      features: [
        'Everything in Starter +',
        'Fleet Calendar',
        'Booking Timeline',
        'Prevent Double Booking',
        'Vehicle Availability',
        'Staff Scheduling'
      ],
      isCurrent: subscriberTier === 2
    },
    {
      name: 'Smart Business',
      price: 'RM 199/mo',
      description: 'Everything included.',
      features: [
        'Business Dashboard',
        'Revenue Analytics',
        'Customer CRM',
        'WhatsApp Marketing Export',
        'Commission Calculator',
        'Fleet Maintenance',
        'Road Tax Reminder',
        'Insurance Reminder',
        'Vehicle Service Records'
      ],
      isCurrent: subscriberTier === 3
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative font-sans">
      
      {/* ❌ Close Button: Redirects to Default Allowed Route */}
      <button 
        onClick={() => {
          // Send them to their respective allowed starting pages
          if (subscriberTier === 1) navigate('/forms');
          else if (subscriberTier === 2) navigate('/calendar');
          else navigate('/dashboard');
        }}
        className="absolute top-6 right-6 p-3 bg-white border border-slate-200 text-slate-400 hover:text-slate-900 rounded-2xl shadow-sm transition-all active:scale-95 z-50"
        title="Continue to App"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="max-w-7xl w-full">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-100">
            <Shield className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Upgrade Your Fleet Command</h1>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium">
            Scale your operations. Choose the module that fits your current business needs.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {tiers.map((tier) => (
            <div 
              key={tier.name}
              className={`bg-white rounded-3xl p-8 border-2 transition-all flex flex-col h-full ${
                tier.isCurrent 
                  ? 'border-blue-600 shadow-xl shadow-blue-900/10' 
                  : 'border-slate-100 hover:border-slate-200 shadow-sm'
              }`}
            >
              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900 mb-2">{tier.name}</h3>
                <p className="text-3xl font-black text-slate-900 mb-4">{tier.price}</p>
                <p className="text-sm text-slate-500 font-medium leading-relaxed min-h-[40px]">{tier.description}</p>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-600 text-sm font-medium">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="leading-tight">{feature}</span>
                  </li>
                ))}
              </ul>

              {tier.isCurrent ? (
                <div className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold text-center text-sm">
                  Current Plan
                </div>
              ) : (
                <button 
                  onClick={() => alert('Please contact +6013 5378032 to upgrade your plan.')}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  <ArrowUpCircle className="w-5 h-5" />
                  Upgrade Now
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UpgradePlanPage;