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
          <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-2">Instructions:</p>
          <div className="space-y-2 text-sm text-blue-900">
            <p>1. Open your Supabase Dashboard.</p>
            <p>2. Navigate to Project Settings &gt; API.</p>
            <p>3. Copy your project URL to <code className="font-mono bg-blue-100 px-1 rounded">VITE_SUPABASE_URL</code>.</p>
            <p>4. Copy your project anon key to <code className="font-mono bg-blue-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code>.</p>
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
