import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { AuditRecord, PayoutHistory } from '../types';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  ExternalLink, 
  FileCheck, 
  FileWarning, 
  Search,
  CheckSquare,
  Square,
  MoreVertical,
  Image as ImageIcon,
  Loader2,
  History,
  BarChart3,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  TrendingUp,
  X,
  RefreshCw
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isValid } from 'date-fns';
import { getNowMYT, formatInMYT, utcToMyt } from '../utils/dateUtils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import MatchyScanAlert from '../components/MatchyScanAlert';
import { approveAmendment } from '../services/auditService';

const safeFormat = (dateStr: string | Date | null | undefined, formatStr: string) => {
  if (!dateStr) return 'N/A';
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    if (!isValid(d)) {
      // Fallback for non-ISO strings
      const d2 = new Date(dateStr);
      if (!isValid(d2)) return 'Invalid Date';
      return format(d2, formatStr);
    }
    return format(d, formatStr);
  } catch (e) {
    return 'Invalid Date';
  }
};

const AuditPayoutManagement: React.FC = () => {
  const { subscriberId } = useAuth();
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'summary' | 'history' | 'analytics'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [scanTrigger, setScanTrigger] = useState(0);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (subscriberId) {
      fetchData();
    }
  }, [subscriberId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [auditData, historyData] = await Promise.all([
        apiService.getAuditRecords(subscriberId!),
        apiService.getPayoutHistory(subscriberId!)
      ]);
      setRecords(auditData);
      setPayoutHistory(historyData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOverride = async (record: AuditRecord) => {
    if (!window.confirm(record.has_pending_changes ? 'Approve this amendment and synchronize with booking?' : 'Are you sure you want to approve this payout?')) return;
    
    try {
      setProcessing(record.form_id);
      if (record.has_pending_changes) {
        await approveAmendment(record.form_id, subscriberId!);
      }
      await apiService.approveAuditRecord(record.form_id, record.booking_id, subscriberId!);
      await fetchData();
    } catch (err) {
      alert('Failed to approve record');
    } finally {
      setProcessing(null);
    }
  };

  const handleApproveSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Approve ${selectedIds.length} selected payouts?`)) return;

    try {
      setProcessing('bulk');
      
      // Handle amendments separately to ensure sync with bookings
      const recordsToApprove = records.filter(r => selectedIds.includes(r.form_id));
      const amendmentRecords = recordsToApprove.filter(r => r.has_pending_changes);
      const normalRecords = recordsToApprove.filter(r => !r.has_pending_changes);
      
      // 1. Approve amendments one by one
      for (const record of amendmentRecords) {
        await approveAmendment(record.form_id, subscriberId!);
      }
      
      // 2. Approve normal records in bulk
      if (normalRecords.length > 0) {
        await apiService.approveSelectedAuditRecords(normalRecords.map(r => r.form_id), subscriberId!);
      }
      
      setSelectedIds([]);
      await fetchData();
    } catch (err) {
      alert('Failed to approve selected records');
    } finally {
      setProcessing(null);
    }
  };

  const handleProcessMonthlyPayout = async () => {
    const approvedRecords = records.filter(r => r.payout_status === 'approved' && r.status !== 'reconciled');
    if (approvedRecords.length === 0) {
      alert('No approved payouts to process.');
      return;
    }

    const monthYear = formatInMYT(getNowMYT(), 'MMMM yyyy');
    if (!window.confirm(`Process monthly payout for ${monthYear}? This will reconcile ${approvedRecords.length} records.`)) return;

    try {
      setProcessing('process');
      await apiService.processMonthlyPayout(subscriberId!, monthYear, approvedRecords);
      await fetchData();
      setActiveTab('history');
    } catch (err) {
      alert('Failed to process monthly payout');
    } finally {
      setProcessing(null);
    }
  };

  const toggleSelectAll = (ids: string[]) => {
    if (selectedIds.length === ids.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(ids);
    }
  };

  const orphans = useMemo(() => 
    records.filter(r => !r.booking_id), 
    [records]
  );

  const readyForReview = useMemo(() => 
    records.filter(r => r.booking_id != null && !r.is_receipt_verified), 
    [records]
  );

  const filteredRecords = useMemo(() => readyForReview.filter(r => 
    r.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.agent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.reference_number && r.reference_number.toLowerCase().includes(searchTerm.toLowerCase()))
  ), [readyForReview, searchTerm]);

  const pendingPayoutsSum = readyForReview
    .reduce((sum, r) => sum + (r.commission_earned || 0), 0);

  const readyForPayoutSum = records
    .filter(r => !!r.booking_id && r.payout_status === 'approved' && r.status !== 'reconciled')
    .reduce((sum, r) => sum + (r.commission_earned || 0), 0);

  // Payout Summary Logic
  const payoutSummary = useMemo(() => {
    const approvedRecords = records.filter(r => !!r.booking_id && r.payout_status === 'approved' && r.status !== 'reconciled');
    const agentMap = new Map<string, { agent_id: string, agent_name: string, total_bookings: number, total_revenue: number, payout_due: number }>();
    
    approvedRecords.forEach(r => {
      const existing = agentMap.get(r.agent_id) || {
        agent_id: r.agent_id,
        agent_name: r.agent_name,
        total_bookings: 0,
        total_revenue: 0,
        payout_due: 0
      };
      
      existing.total_bookings += 1;
      existing.total_revenue += (r.form_price || 0);
      existing.payout_due += (r.commission_earned || 0);
      
      agentMap.set(r.agent_id, existing);
    });

    return Array.from(agentMap.values());
  }, [readyForReview]);

  // Chart Data Logic
  const chartData = useMemo(() => {
    // Group history by month_year and agent
    const monthMap = new Map<string, any>();
    const agents = new Set<string>();

    payoutHistory.forEach(h => {
      const month = h.month_year;
      const data = monthMap.get(month) || { month };
      
      h.breakdown.forEach(b => {
        if (b.agent_name) {
          data[b.agent_name] = (data[b.agent_name] || 0) + b.payout_due;
          agents.add(b.agent_name);
        }
      });
      
      monthMap.set(month, data);
    });

    return {
      data: Array.from(monthMap.values()).reverse(),
      agents: Array.from(agents).filter(Boolean)
    };
  }, [payoutHistory]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const now = getNowMYT();
  const currentMonthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const currentMonthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

  const refreshData = async () => {
    try {
      const [auditData, historyData] = await Promise.all([
        apiService.getAuditRecords(subscriberId!),
        apiService.getPayoutHistory(subscriberId!)
      ]);
      setRecords(auditData);
      setPayoutHistory(historyData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  };

  const handleRunScan = () => {
    setIsScanning(true);
    setScanTrigger(prev => prev + 1);
  };

  const handleScanComplete = () => {
    setIsScanning(false);
    fetchData(); // Use fetchData to ensure a clean state refresh
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto font-sans">
      {/* Header & Summary */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Audit & Payout Management</h1>
          <p className="text-slate-500 mt-1">Manage agent commissions, reconcile bookings, and track payout history.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-end gap-4">
          <button
            onClick={handleRunScan}
            disabled={isScanning}
            className="px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {isScanning ? 'Scanning...' : 'Run Matchy Scan'}
          </button>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
                <Clock className="w-4 h-4 text-orange-500" />
                Pending Approval
              </div>
              <div className="text-2xl font-bold text-slate-900">RM {pendingPayoutsSum.toFixed(2)}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Approved for Payout
              </div>
              <div className="text-2xl font-bold text-slate-900">RM {readyForPayoutSum.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Phase 1: Matchy Scan Alert */}
      {subscriberId && (
        <MatchyScanAlert 
          subscriberId={subscriberId} 
          monthStartDate={currentMonthStart} 
          monthEndDate={currentMonthEnd} 
          scanTrigger={scanTrigger}
          onScanComplete={handleScanComplete}
          orphanedAgreements={orphans}
        />
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl w-fit mb-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'pending' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          Pending Review
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'summary' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Payout Summary
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'history' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <History className="w-4 h-4" />
          Payout History
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'analytics' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Analytics
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
        {activeTab === 'pending' && (
          <>
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-full md:w-64"
                />
              </div>
              
              {selectedIds.length > 0 && (
                <button
                  onClick={handleApproveSelected}
                  disabled={!!processing}
                  className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                  {processing === 'bulk' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
                  Approve {selectedIds.length} Selected
                </button>
              )}
            </div>

            <div className="p-0">
              {filteredRecords.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-10 h-10 text-slate-300" />
                  </div>
                  <h3 className="text-slate-900 font-bold text-lg">All caught up!</h3>
                  <p className="text-slate-500 text-sm">No records pending review at the moment.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                        <th className="py-4 px-6 w-12">
                          <button onClick={() => toggleSelectAll(filteredRecords.map(r => r.form_id))}>
                            {selectedIds.length === filteredRecords.length ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5" />}
                          </button>
                        </th>
                        <th className="py-4 px-6">Customer & Reference</th>
                        <th className="py-4 px-6">Agent</th>
                        <th className="py-4 px-6">Booking Details</th>
                        <th className="py-4 px-6">Financials</th>
                        <th className="py-4 px-6">Status</th>
                        <th className="py-4 px-6 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRecords.map((record) => (
                        <tr key={record.form_id} className={`group hover:bg-slate-50 transition-colors ${selectedIds.includes(record.form_id) ? 'bg-blue-50/30' : ''}`}>
                          <td className="py-4 px-6">
                            <button onClick={() => toggleSelect(record.form_id)}>
                              {selectedIds.includes(record.form_id) ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-slate-300 group-hover:text-slate-400" />}
                            </button>
                          </td>
                          <td className="py-4 px-6">
                            <div className="text-sm font-bold text-slate-900">{record.customer_name}</div>
                            <div className="text-[10px] text-blue-600 font-bold font-mono mt-0.5">{record.reference_number || 'NO REF'}</div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="text-sm font-medium text-slate-700">{record.agent_name}</div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="text-xs text-slate-600">{record.car_plate_number}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {record.booking_start 
                                ? `${safeFormat(record.booking_start, 'dd/MM/yyyy')} (${record.booking_duration} Days)` 
                                : `${safeFormat(record.form_start, 'dd/MM/yyyy')} - ${safeFormat(record.form_end, 'dd/MM/yyyy')}`}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="text-sm font-bold text-slate-900">RM {(record.form_price || 0).toFixed(2)}</div>
                            <div className="text-[10px] text-emerald-600 font-bold">Comm: RM {(record.commission_earned || 0).toFixed(2)}</div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col gap-1">
                              {record.payout_status === 'approved' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase w-fit">
                                  <CheckCircle2 className="w-3 h-3" /> Approved
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-50 text-orange-700 text-[10px] font-bold uppercase w-fit">
                                  <Clock className="w-3 h-3" /> Pending
                                </span>
                              )}
                              {record.has_pending_changes && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-yellow-50 text-yellow-700 text-[10px] font-bold uppercase w-fit">
                                  <AlertCircle className="w-3 h-3" /> Amendment Requested
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right">
                            {record.payout_status === 'pending' && (
                              <button
                                onClick={() => handleOverride(record)}
                                disabled={!!processing}
                                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all disabled:opacity-50 shadow-sm"
                              >
                                {processing === record.form_id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Approve'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'summary' && (
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Payout Summary (Bank Transfer View)</h2>
                <p className="text-sm text-slate-500 mt-1">Consolidated figures for the current month's approved payouts.</p>
              </div>
              <button
                onClick={handleProcessMonthlyPayout}
                disabled={!!processing || payoutSummary.length === 0}
                className="bg-emerald-600 text-white px-8 py-3 rounded-2xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/10 flex items-center gap-2 disabled:opacity-50"
              >
                {processing === 'process' ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                Process Monthly Payout
              </button>
            </div>

            {payoutSummary.length === 0 ? (
              <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-slate-900 font-bold">No approved payouts</h3>
                <p className="text-slate-500 text-sm">Approve records in the "Pending Review" tab first.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-4 px-6">Agent Name</th>
                      <th className="py-4 px-6">Total Bookings</th>
                      <th className="py-4 px-6">Total Revenue</th>
                      <th className="py-4 px-6 text-right">Total Payout Due (30%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payoutSummary.map((summary) => (
                      <tr key={summary.agent_id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-5 px-6 font-bold text-slate-900">{summary.agent_name}</td>
                        <td className="py-5 px-6 font-medium text-slate-600">{summary.total_bookings} Bookings</td>
                        <td className="py-5 px-6 font-medium text-slate-600">RM {summary.total_revenue.toFixed(2)}</td>
                        <td className="py-5 px-6 text-right">
                          <span className="text-lg font-bold text-blue-600">RM {summary.payout_due.toFixed(2)}</span>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50/50">
                      <td colSpan={3} className="py-6 px-6 text-right font-bold text-slate-900">Grand Total</td>
                      <td className="py-6 px-6 text-right">
                        <span className="text-2xl font-black text-slate-900">
                          RM {payoutSummary.reduce((sum, s) => sum + s.payout_due, 0).toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="p-8">
            <div className="mb-8">
              <h2 className="text-xl font-bold text-slate-900">Payout History</h2>
              <p className="text-sm text-slate-500 mt-1">Review and audit previous monthly settlements.</p>
            </div>

            {payoutHistory.length === 0 ? (
              <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-slate-900 font-bold">No history found</h3>
                <p className="text-slate-500 text-sm">Your monthly settlements will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {payoutHistory.map((history) => (
                  <div key={history.id} className="border border-slate-200 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setExpandedHistoryId(expandedHistoryId === history.id ? null : history.id)}
                      className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                          <FileCheck className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">{history.month_year}</h3>
                          <p className="text-xs text-slate-500">Processed on {safeFormat(history.payout_date, 'dd/MM/yyyy')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Settled</p>
                          <p className="text-xl font-bold text-slate-900">RM {(history.total_amount || 0).toFixed(2)}</p>
                        </div>
                        {expandedHistoryId === history.id ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                      </div>
                    </button>

                    {expandedHistoryId === history.id && (
                      <div className="px-6 pb-6 bg-slate-50/50 border-t border-slate-100">
                        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                <th className="py-3 px-4">Agent Name</th>
                                <th className="py-3 px-4">Bookings</th>
                                <th className="py-3 px-4">Revenue</th>
                                <th className="py-3 px-4 text-right">Commission Paid</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {history.breakdown.map((b) => (
                                <tr key={b.agent_id}>
                                  <td className="py-3 px-4 font-bold text-slate-700">{b.agent_name}</td>
                                  <td className="py-3 px-4 text-sm text-slate-600">{b.total_bookings}</td>
                                  <td className="py-3 px-4 text-sm text-slate-600">RM {b.total_revenue.toFixed(2)}</td>
                                  <td className="py-3 px-4 text-right font-bold text-blue-600">RM {b.payout_due.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Payout Analytics</h2>
                <p className="text-sm text-slate-500 mt-1">Visualizing commission trends and agent performance.</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold">
                <TrendingUp className="w-4 h-4" />
                Growth Tracking Active
              </div>
            </div>

            {chartData.data.length === 0 ? (
              <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-slate-900 font-bold">Not enough data</h3>
                <p className="text-slate-500 text-sm">Complete your first monthly payout to see analytics.</p>
              </div>
            ) : (
              <div className="h-[400px] w-full mt-8">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData.data}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickFormatter={(value) => `RM${value}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        borderRadius: '16px', 
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                      }}
                      cursor={{ fill: '#f8fafc' }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="right" 
                      iconType="circle"
                      wrapperStyle={{ paddingBottom: '20px' }}
                    />
                    {chartData.agents.map((agent, index) => (
                      <Bar 
                        key={agent} 
                        dataKey={agent} 
                        stackId="a" 
                        fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} 
                        radius={index === chartData.agents.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {isPreviewOpen && previewUrl && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
              <h3 className="text-lg font-bold text-slate-900">Receipt Preview</h3>
              <button 
                onClick={() => {
                  setIsPreviewOpen(false);
                  setPreviewUrl(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-auto flex-1 bg-slate-50 flex items-center justify-center">
              {previewUrl.startsWith('data:application/pdf') ? (
                <iframe src={previewUrl} className="w-full h-full min-h-[60vh] rounded-lg border border-slate-200" title="PDF Preview" />
              ) : (
                <img src={previewUrl} alt="Receipt Preview" className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm" />
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end">
              <button
                onClick={() => {
                  setIsPreviewOpen(false);
                  setPreviewUrl(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditPayoutManagement;
