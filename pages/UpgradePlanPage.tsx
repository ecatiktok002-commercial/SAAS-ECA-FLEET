import React from 'react';
import { Shield, ArrowUpCircle, CheckCircle2, X } from 'lucide-react'; // Added X here
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom'; // Added for navigation

const UpgradePlanPage: React.FC = () => {
  const { subscriptionTier } = useAuth();
  const navigate = useNavigate(); // Hook to go back

  const tiers = [
    {
      name: 'Tier 1 (Forms Module)',
      price: 'RM 199/mo',
      features: ['Digital Forms', 'Staff Management'],
      isCurrent: subscriptionTier === 'tier_1'
    },
    {
      name: 'Tier 2 (Calendar Module)',
      price: 'RM 299/mo',
      features: ['Calendar UI', 'Staff Management'],
      isCurrent: subscriptionTier === 'tier_2'
    },
    {
      name: 'Tier 3 (Fleet Guardian)',
      price: 'RM 499/mo',
      features: ['All Features', 'CRM', 'Audit & Payouts', 'Fleet Tracking', 'Admin Dashboard'],
      isCurrent: subscriptionTier === 'tier_3'
    }
  ];

  return (
    <div className="min-h-full bg-slate-50 flex items-center justify-center p-6 relative">
      
      {/* ❌ NEW: Fixed Close Button for Mobile/Desktop */}
      <button 
        onClick={() => navigate(-1)} // Takes them back to the last page they were on
        className="absolute top-6 right-6 p-3 bg-white border border-slate-200 text-slate-400 hover:text-slate-900 rounded-2xl shadow-sm transition-all active:scale-90 z-50"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-100">
            <Shield className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Upgrade Your Fleet Command</h1>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            The feature you're trying to access is locked under a higher tier. 
            Choose the module that fits your business needs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {tiers.map((tier) => (
            <div 
              key={tier.name}
              className={`bg-white rounded-3xl p-8 border-2 transition-all ${
                tier.isCurrent 
                  ? 'border-blue-600 shadow-xl shadow-blue-900/10' 
                  : 'border-slate-100 hover:border-slate-200 shadow-sm'
              }`}
            >
              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900 mb-2">{tier.name}</h3>
                <p className="text-3xl font-black text-slate-900">{tier.price}</p>
              </div>

              <ul className="space-y-4 mb-8">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-slate-600 text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              {tier.isCurrent ? (
                <div className="w-full py-3 bg-slate-100 text-slate-500 rounded-xl font-bold text-center text-sm">
                  Current Plan
                </div>
              ) : (
                <button className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                  <ArrowUpCircle className="w-5 h-5" />
                  Upgrade Now
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate-400 text-sm font-medium">
            Need a custom enterprise solution? <button className="text-blue-600 font-bold hover:underline">Contact Sales</button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpgradePlanPage;