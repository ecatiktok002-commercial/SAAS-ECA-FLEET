import React from 'react';
import { X, CheckCircle2, Lock } from 'lucide-react';

interface UpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
}

const UpsellModal: React.FC<UpsellModalProps> = ({ isOpen, onClose, featureName }) => {
  if (!isOpen) return null;

  const getModalContent = () => {
    switch (featureName) {
      case 'Business Dashboard':
        return {
          title: '📊 Unlock Your Command Center',
          copy: 'Stop guessing about your daily cash flow and vehicle utilization. The Business Dashboard gives you real-time visual insights into today\'s revenue, instantly flags idle vehicles that are costing you money, and tracks your team\'s sales performance on a live leaderboard.',
          features: [
            'Real-time revenue tracking',
            'Vehicle utilization insights',
            'Live sales leaderboard'
          ]
        };
      case 'Fleet Guardian':
        return {
          title: '🛡️ Protect Your Biggest Assets',
          copy: 'Managing a growing fleet requires more than just tracking rentals. Fleet Guardian gives you complete control over vehicle health, automates maintenance schedules to prevent costly breakdowns, and centralizes job scopes and SOPs for your entire team.',
          features: [
            'Automated maintenance schedules',
            'Vehicle health monitoring',
            'Centralized SOPs and job scopes'
          ]
        };
      case 'Calendar':
        return {
          title: '🗓️ Master Your Daily Operations',
          copy: 'Say goodbye to scattered schedules and the risk of double-bookings. The Interactive Calendar provides a complete, visual timeline of your entire fleet. Effortlessly manage availability, assign handovers to your staff, and keep your daily operations running flawlessly.',
          features: [
            'Visual fleet timeline',
            'Prevent double-bookings',
            'Staff handover assignments'
          ]
        };
      case 'Digital Form':
        return {
          title: '✍️ Go Completely Paperless',
          copy: 'Stop chasing physical paperwork. Generate professional A4 rental agreements in seconds, capture secure digital signatures on glass, and automatically build your customer CRM for future marketing.',
          features: [
            'Instant A4 rental agreements',
            'Secure digital signatures',
            'Automatic CRM building'
          ]
        };
      case 'Customers / CRM':
        return {
          title: '🎯 Activate Your Revenue Goldmine',
          copy: 'Don\'t let past renters fade away. Unlock the advanced CRM to instantly identify your most loyal Repeat customers. Export your lists with one click and launch targeted WhatsApp campaigns to drive immediate, zero-commission sales.',
          features: [
            'Identify repeat customers',
            'One-click list exports',
            'Targeted marketing campaigns'
          ]
        };
      default:
        return {
          title: '🚀 Unlock Premium Features',
          copy: 'Upgrade your workspace to access advanced tools and take your business to the next level.',
          features: [
            'Advanced analytics',
            'Priority support',
            'Unlimited access'
          ]
        };
    }
  };

  const content = getModalContent();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Gradient */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-slate-800 to-slate-900" />
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative pt-8 px-8 pb-8">
          {/* Icon */}
          <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-6 mx-auto border border-slate-100">
            <Lock className="w-8 h-8 text-slate-700" />
          </div>

          {/* Content */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">
              {content.title}
            </h2>
            <p className="text-slate-600 leading-relaxed">
              {content.copy}
            </p>
          </div>

          {/* Feature List */}
          <div className="bg-slate-50 rounded-xl p-5 mb-8 border border-slate-100">
            <ul className="space-y-3">
              {content.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3 text-slate-700 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <button 
            onClick={() => {
              // In a real app, this would redirect to a billing page or trigger a Stripe checkout
              alert('Redirecting to upgrade page...');
              onClose();
            }}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-slate-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            Unlock Everything: Upgrade to Tier 3 - RM 399/mo
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpsellModal;
