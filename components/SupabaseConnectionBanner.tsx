import React, { useState, useEffect } from 'react';
import { AlertTriangle, ExternalLink, WifiOff, Copy, Check } from 'lucide-react';
import { SUPABASE_URL, SUPABASE_KEY } from '../services/supabase';

const SupabaseConnectionBanner: React.FC = () => {
  const [isUnreachable, setIsUnreachable] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      if (!SUPABASE_URL || !SUPABASE_KEY || SUPABASE_URL.includes('placeholder')) return;

      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/`, { 
          method: 'GET', 
          headers: { 'apikey': SUPABASE_KEY } 
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
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const copyUrl = () => {
    navigator.clipboard.writeText(SUPABASE_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isUnreachable) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] max-w-md animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-white border border-rose-200 rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-rose-600 p-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <WifiOff className="w-6 h-6" />
            <h3 className="font-bold">Database Offline</h3>
          </div>
          <div className="px-2 py-0.5 bg-rose-500/50 rounded text-[10px] font-bold uppercase tracking-widest border border-white/20">
            Project Paused?
          </div>
        </div>
        <div className="p-6">
          <p className="text-slate-600 text-sm leading-relaxed mb-4">
            The application cannot reach your Supabase project. This <strong>Failed to fetch</strong> error usually means your project is <strong>paused</strong> in the Supabase dashboard.
          </p>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 mb-6">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Target URL:</p>
            <div className="flex items-center justify-between gap-2">
              <code className="text-[11px] text-slate-700 break-all font-mono bg-white px-2 py-1 rounded border border-slate-200 flex-1">
                {SUPABASE_URL}
              </code>
              <button 
                onClick={copyUrl}
                className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                title="Copy URL"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          <div className="space-y-3">
            <a 
              href="https://supabase.com/dashboard" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all group shadow-lg shadow-blue-600/20"
            >
              <div className="flex items-center gap-3">
                <ExternalLink className="w-4 h-4" />
                <span className="text-sm font-bold">Open Supabase Dashboard</span>
              </div>
              <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100" />
            </a>
            
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-900 mb-1">How to fix:</p>
                  <ul className="text-[10px] text-amber-800 leading-normal list-disc ml-4 space-y-1">
                    <li>Log in to Supabase and ensure your project is <strong>Active</strong> (not paused).</li>
                    <li>Verify the URL above matches your project URL in Settings.</li>
                    <li>Check if your network/firewall is blocking <code>supabase.co</code>.</li>
                  </ul>
                </div>
              </div>
            </div>

            <button 
              onClick={() => {
                setIsUnreachable(false);
                window.location.reload();
              }}
              className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-[0.98]"
            >
              Retry Connection
            </button>
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
