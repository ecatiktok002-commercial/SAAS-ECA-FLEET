import React, { useState, useEffect } from 'react';
import { differenceInDays } from 'date-fns';
import { AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ExpiryReminder: React.FC = () => {
  const { expiryDate, staffRole } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show to subscribers (admin), not to staff agents
    if (staffRole === 'admin' && expiryDate) {
      const hasSeen = sessionStorage.getItem('hasSeenExpiryReminder');
      if (!hasSeen) {
        const daysLeft = differenceInDays(new Date(expiryDate), new Date());
        if (daysLeft >= 0 && daysLeft <= 7) {
          setShow(true);
        }
      }
    }
  }, [expiryDate, staffRole]);

  const handleClose = () => {
    setShow(false);
    sessionStorage.setItem('hasSeenExpiryReminder', 'true');
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 max-w-sm w-full bg-white rounded-2xl shadow-2xl border border-orange-100 p-6 z-50 animate-in slide-in-from-bottom-5">
      <button 
        onClick={handleClose}
        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
      
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center shrink-0 border border-orange-100">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Subscription Expiring Soon</h3>
          <p className="text-sm text-slate-600 mb-4 leading-relaxed">
            Your subscription will expire on <strong className="text-slate-900">{new Date(expiryDate!).toLocaleDateString()}</strong>. Please contact our sales agent to extend your subscription and maintain access to your workspace.
          </p>
          <a 
            href="https://wa.me/60100000000" // Replace with actual WhatsApp/contact if needed
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-full px-4 py-2.5 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600 transition-colors"
            onClick={handleClose}
          >
            Contact Sales Agent
          </a>
        </div>
      </div>
    </div>
  );
};

export default ExpiryReminder;
