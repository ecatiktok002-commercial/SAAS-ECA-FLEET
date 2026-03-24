
import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { formatInMYT } from '../utils/dateUtils';
import { LogEntry } from '../types';
import { apiService } from '../services/apiService';
import { supabase } from '../services/supabase';

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriberId: string | null;
}

const ActivityLogModal: React.FC<ActivityLogModalProps> = ({ isOpen, onClose, subscriberId }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 20;

  useEffect(() => {
    if (isOpen && subscriberId) {
      // Reset state on open
      setLogs([]);
      setPage(0);
      setHasMore(true);
      fetchLogs(0);
      
      // Subscribe to real-time log updates
      const channel = supabase.channel('logs-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'logs', filter: `subscriber_id=eq.${subscriberId}` }, (payload) => {
          setLogs(prev => [payload.new as LogEntry, ...prev]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen, subscriberId]);

  const fetchLogs = async (pageNum: number) => {
    if (!subscriberId) return;
    setLoading(true);
    try {
      const fetchedLogs = await apiService.getLogs(subscriberId, pageNum, pageSize);
      if (fetchedLogs.length < pageSize) {
        setHasMore(false);
      }
      setLogs(prev => pageNum === 0 ? fetchedLogs : [...prev, ...fetchedLogs]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLogs(nextPage);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-end z-[2000]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      
      {/* Drawer */}
      <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Activity Log</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          {logs.length === 0 && !loading ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              No recent activity recorded.
            </div>
          ) : (
            <>
              {logs.map(log => (
                <div key={log.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className={`
                      text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wide
                      ${log.action === 'Created' ? 'bg-emerald-100 text-emerald-700' : ''}
                      ${log.action === 'Updated' ? 'bg-blue-100 text-blue-700' : ''}
                      ${log.action === 'Deleted' ? 'bg-rose-100 text-rose-700' : ''}
                    `}>
                      {log.action}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {formatInMYT(new Date(log.timestamp).getTime(), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {log.details}
                  </p>
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-50 mt-1">
                    <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[8px] font-bold">
                      {log.userId.substring(0,1)}
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      {log.staff_name ? `${log.staff_name} - ${log.userId}` : `ID: ${log.userId}`}
                    </span>
                  </div>
                </div>
              ))}
              
              {hasMore && (
                <button 
                  onClick={handleLoadMore} 
                  disabled={loading}
                  className="w-full py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              )}
            </>
          )}
        </div>
        
        <div className="p-3 bg-white border-t border-slate-100 text-center text-[10px] text-slate-400 font-medium">
          Logs older than 30 days are automatically removed.
        </div>
      </div>
    </div>
  );
};

export default ActivityLogModal;
