
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Copy, Check, ExternalLink, RefreshCw } from 'lucide-react';

const SupabaseErrorBanner: React.FC = () => {
  const [schemaError, setSchemaError] = useState<{ table: string; column: string; type: string; sql: string } | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleSchemaError = (e: any) => {
      setSchemaError(e.detail);
    };

    window.addEventListener('supabase-schema-error', handleSchemaError);
    
    // Check for connection error every few seconds
    const interval = setInterval(() => {
      if ((window as any).supabaseConnectionError) {
        setConnectionError((window as any).supabaseConnectionError);
      }
    }, 2000);

    return () => {
      window.removeEventListener('supabase-schema-error', handleSchemaError);
      clearInterval(interval);
    };
  }, []);

  const copyToClipboard = () => {
    if (schemaError) {
      navigator.clipboard.writeText(schemaError.sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!schemaError && !connectionError) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 z-[9999] animate-in slide-in-from-bottom-8 duration-500">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-w-2xl mx-auto">
        <div className="p-4 md:p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl shrink-0 ${connectionError ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold text-lg mb-1">
                {connectionError ? 'Supabase Connection Error' : 'Database Schema Mismatch'}
              </h3>
              
              {connectionError ? (
                <div className="space-y-3">
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Could not reach your Supabase project. This usually means the project is <span className="text-rose-400 font-bold">Paused</span> or your network is blocking the connection.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <a 
                      href="https://supabase.com/dashboard" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-rose-600 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Check Supabase Dashboard
                    </a>
                    <button 
                      onClick={() => window.location.reload()}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-700 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Retry Connection
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-slate-400 text-sm leading-relaxed">
                    The column <code className="text-amber-400 font-mono bg-amber-400/10 px-1.5 py-0.5 rounded">'{schemaError?.column}'</code> is missing from table <code className="text-amber-400 font-mono bg-amber-400/10 px-1.5 py-0.5 rounded">'{schemaError?.table}'</code>.
                  </p>
                  
                  <div className="bg-black/40 rounded-xl p-4 border border-white/5 relative group">
                    <code className="text-emerald-400 text-xs font-mono break-all block pr-12">
                      {schemaError?.sql}
                    </code>
                    <button 
                      onClick={copyToClipboard}
                      className="absolute right-3 top-3 p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                      title="Copy SQL"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <a 
                      href="https://supabase.com/dashboard" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors"
                    >
                      Open Supabase SQL Editor
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <span className="text-slate-600">•</span>
                    <button 
                      onClick={() => setSchemaError(null)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-400 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupabaseErrorBanner;
