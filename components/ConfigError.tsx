import React from 'react';
import { AlertTriangle, Settings, ExternalLink } from 'lucide-react';

const ConfigError: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-xl border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mx-auto mb-6">
          <AlertTriangle className="w-8 h-8" />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">Configuration Required</h1>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
          Your Supabase credentials are missing or invalid. To fix this, you must provide them in the AI Studio Settings menu.
        </p>

        <div className="space-y-4 text-left mb-8">
          <div className="flex gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 shrink-0 font-bold text-xs">1</div>
            <div>
              <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">Open Settings</p>
              <p className="text-xs text-slate-500">Click the gear icon in the AI Studio sidebar or top menu.</p>
            </div>
          </div>

          <div className="flex gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 shrink-0 font-bold text-xs">2</div>
            <div>
              <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">Add Variables</p>
              <p className="text-xs text-slate-500">Add <code className="bg-slate-200 px-1 rounded">VITE_SUPABASE_URL</code> and <code className="bg-slate-200 px-1 rounded">VITE_SUPABASE_ANON_KEY</code>.</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 mb-8">
          <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-2">Your Credentials (Copy these):</p>
          <div className="space-y-2 font-mono text-[10px] text-blue-900 break-all">
            <div className="flex flex-col gap-1">
              <span className="opacity-50">URL:</span>
              <span className="bg-white/50 p-1 rounded select-all">https://czurhanyrjgeicnbrnev.supabase.co</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="opacity-50">KEY:</span>
              <span className="bg-white/50 p-1 rounded select-all">eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dXJoYW55cmpnZWljbmJybmV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTExMDEsImV4cCI6MjA4NzQyNzEwMX0.LV4hsQEazpbv8AcLDrEASg8s3uGKmvMJ0FrvMOX6AWQ</span>
            </div>
          </div>
        </div>

        <button 
          onClick={() => window.location.reload()}
          className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
        >
          I've added them, refresh app
        </button>
      </div>
    </div>
  );
};

export default ConfigError;
