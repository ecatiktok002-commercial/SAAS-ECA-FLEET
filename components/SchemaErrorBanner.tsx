import React, { useState, useEffect } from 'react';
import { Database, Copy, Check, AlertCircle, Terminal } from 'lucide-react';

interface SchemaError {
  table: string;
  column: string;
  type: string;
  sql: string;
}

const SchemaErrorBanner: React.FC = () => {
  const [errors, setErrors] = useState<SchemaError[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    const handleSchemaError = (event: any) => {
      const { table, column, type, sql } = event.detail;
      setErrors(prev => {
        // Avoid duplicates
        if (prev.some(e => e.table === table && e.column === column)) return prev;
        return [...prev, { table, column, type, sql }];
      });
    };

    window.addEventListener('supabase-schema-error', handleSchemaError);
    return () => window.removeEventListener('supabase-schema-error', handleSchemaError);
  }, []);

  const copySql = (sql: string, index: number) => {
    navigator.clipboard.writeText(sql);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (errors.length === 0) return null;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[10000] w-full max-w-lg px-4 animate-in slide-in-from-top-10 duration-500">
      <div className="bg-white border-2 border-amber-200 rounded-[2rem] shadow-2xl overflow-hidden">
        <div className="bg-amber-500 p-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6" />
            <h3 className="font-bold">Database Schema Outdated</h3>
          </div>
          <button 
            onClick={() => setErrors([])}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <AlertCircle className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-slate-600 text-sm leading-relaxed mb-6">
            We detected that your database is missing some required columns. Please run the following SQL in your <strong>Supabase SQL Editor</strong> to fix them.
          </p>

          <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
            {errors.map((error, index) => (
              <div key={index} className="bg-slate-900 rounded-2xl p-4 border border-slate-800 group relative">
                <div className="flex items-center gap-2 mb-2">
                  <Terminal className="w-3 h-3 text-amber-400" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Fix for {error.table}.{error.column}
                  </span>
                </div>
                <code className="text-[11px] text-amber-200 font-mono break-all block pr-10">
                  {error.sql}
                </code>
                <button 
                  onClick={() => copySql(error.sql, index)}
                  className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-white active:scale-95"
                  title="Copy SQL"
                >
                  {copiedIndex === index ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <a 
              href="https://supabase.com/dashboard" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20"
            >
              Open Supabase Dashboard
            </a>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 text-slate-400 hover:text-slate-600 font-bold text-[10px] uppercase tracking-widest transition-colors"
            >
              I've run the SQL, refresh app
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchemaErrorBanner;
