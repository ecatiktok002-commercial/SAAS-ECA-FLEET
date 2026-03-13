import React, { useState, useEffect } from 'react';
import { AlertTriangle, Settings, ExternalLink, WifiOff } from 'lucide-react';

const SupabaseConnectionBanner: React.FC = () => {
  const [isUnreachable, setIsUnreachable] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!url || !key) return;

      try {
        const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, { 
          method: 'GET', 
          headers: { 'apikey': key } 
        });
        if (!res.ok && res.status !== 401) {
          setIsUnreachable(true);
        } else {
          setIsUnreachable(false);
        }
      } catch (err) {
        setIsUnreachable(true);
      }
    };

    checkConnection();
    // Re-check every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!isUnreachable) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] max-w-md animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-white border border-rose-200 rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-rose-600 p-4 flex items-center gap-3 text-white">
          <WifiOff className="w-6 h-6" />
          <h3 className="font-bold">Database Connection Failed</h3>
        </div>
        <div className="p-6">
          <p className="text-slate-600 text-sm leading-relaxed mb-6">
            Could not connect to your Supabase project. Please check if it's paused or if your network is blocking the connection.
          </p>
          
          <div className="space-y-3">
            <a 
              href="https://supabase.com/dashboard" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                <span className="text-sm font-bold text-slate-700">Open Supabase Dashboard</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300" />
            </a>
            
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-900 mb-1">How to fix:</p>
                  <p className="text-[10px] text-amber-800 leading-normal">
                    Go to the <strong>Settings</strong> menu in AI Studio and ensure your <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> are correctly configured.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ArrowRight = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
  </svg>
);

export default SupabaseConnectionBanner;
