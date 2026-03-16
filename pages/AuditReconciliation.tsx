import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { AuditRecord } from '../types';
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
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { openDataURL } from '../utils/fileUtils';

const AuditReconciliation: React.FC = () => {
  const { subscriberId } = useAuth();
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'action' | 'quick'>('action');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    if (subscriberId) {
      fetchRecords();
    }
  }, [subscriberId]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const data = await apiService.getAuditRecords(subscriberId!);
      setRecords(data);
    } catch (err) {
      console.error('Failed to fetch audit records:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOverride = async (record: AuditRecord) => {
    if (!window.confirm('Are you sure you want to override the discrepancy and approve this payout?')) return;
    
    try {
      setProcessing(record.form_id);
      await apiService.approveAuditRecord(record.form_id, record.booking_id, subscriberId!);
      await fetchRecords();
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
      await apiService.approveSelectedAuditRecords(selectedIds, subscriberId!);
      setSelectedIds([]);
      await fetchRecords();
    } catch (err) {
      alert('Failed to approve selected records');
    } finally {
      setProcessing(null);
    }
  };

  const handleCloseMonth = async () => {
    const approvedCount = records.filter(r => r.payout_status === 'approved').length;
    if (approvedCount === 0) {
      alert('No approved payouts to close.');
      return;
    }

    if (!window.confirm(`This will mark all ${approvedCount} approved payouts as "Paid" and hide them from this view. Continue?`)) return;

    try {
      setProcessing('close');
      await apiService.closeMonthPayouts(subscriberId!);
      await fetchRecords();
    } catch (err) {
      alert('Failed to close month payouts');
    } finally {
      setProcessing(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (ids: string[]) => {
    if (selectedIds.length === ids.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(ids);
    }
  };

  // Filter logic
  const actionRequired = records.filter(r => 
    r.payout_status === 'pending' && 
    (r.has_discrepancy || !r.payment_receipt)
  ).filter(r => 
    r.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.agent_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const quickApprove = records.filter(r => 
    r.payout_status === 'pending' && 
    !r.has_discrepancy && 
    r.payment_receipt
  ).filter(r => 
    r.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.agent_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingPayoutsSum = records
    .filter(r => r.payout_status === 'pending')
    .reduce((sum, r) => sum + Number(r.commission_earned || 0), 0);

  const readyForPayoutSum = records
    .filter(r => r.payout_status === 'approved')
    .reduce((sum, r) => sum + Number(r.commission_earned || 0), 0);

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
          <h1 className="text-3xl font-bold text-slate-900">Audit & Reconciliation</h1>
          <p className="text-slate-500 mt-1">Verify receipts and reconcile commissions with bookings.</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
              <Clock className="w-4 h-4 text-orange-500" />
              Pending Payouts
            </div>
            <div className="text-2xl font-bold text-slate-900">RM {pendingPayoutsSum.toFixed(2)}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Ready for Payout
            </div>
            <div className="text-2xl font-bold text-slate-900">RM {readyForPayoutSum.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Main Controls */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex p-1 bg-slate-100 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('action')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'action' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Action Required ({actionRequired.length})
            </button>
            <button
              onClick={() => setActiveTab('quick')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'quick' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Quick Approve ({quickApprove.length})
            </button>
          </div>

          <div className="flex items-center gap-3">
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
            <button
              onClick={handleCloseMonth}
              disabled={!!processing}
              className="bg-slate-900 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {processing === 'close' ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
              Close the Month
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'action' ? (
            <div className="space-y-4">
              {actionRequired.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-slate-900 font-bold">All clear!</h3>
                  <p className="text-slate-500 text-sm">No records currently require manual action.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        <th className="pb-4 px-4">Date</th>
                        <th className="pb-4 px-4">Agent / Customer</th>
                        <th className="pb-4 px-4">Discrepancy Reason</th>
                        <th className="pb-4 px-4">Commission</th>
                        <th className="pb-4 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {actionRequired.map((record) => (
                        <tr key={record.form_id} className="group hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="text-sm font-medium text-slate-900">
                              {format(new Date(record.created_at), 'MMM dd, yyyy')}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              #{record.form_id.slice(0, 8)}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm font-bold text-slate-900">{record.agent_name}</div>
                            <div className="text-xs text-slate-500">Cust: {record.customer_name}</div>
                          </td>
                          <td className="py-4 px-4">
                            {!record.payment_receipt && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-orange-50 text-orange-700 text-[10px] font-bold uppercase mb-1">
                                <ImageIcon className="w-3 h-3" /> No Receipt
                              </span>
                            )}
                            {record.has_discrepancy && (
                              <div className="text-xs font-bold text-red-600 flex items-center gap-1.5">
                                <FileWarning className="w-4 h-4" />
                                {record.discrepancy_reason || 'Data Mismatch'}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm font-bold text-slate-900">RM {Number(record.commission_earned || 0).toFixed(2)}</div>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => handleOverride(record)}
                              disabled={!!processing}
                              className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-all disabled:opacity-50"
                            >
                              {processing === record.form_id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Override & Approve'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleSelectAll(quickApprove.map(r => r.form_id))}
                    className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    {selectedIds.length === quickApprove.length && quickApprove.length > 0 ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                    Select All
                  </button>
                  {selectedIds.length > 0 && (
                    <span className="text-xs font-medium text-slate-400">
                      {selectedIds.length} items selected
                    </span>
                  )}
                </div>
                
                {selectedIds.length > 0 && (
                  <button
                    onClick={handleApproveSelected}
                    disabled={!!processing}
                    className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
                  >
                    {processing === 'bulk' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
                    Approve Selected
                  </button>
                )}
              </div>

              {quickApprove.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-slate-900 font-bold">Nothing to quick approve</h3>
                  <p className="text-slate-500 text-sm">All perfect matches have been processed.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                        <th className="pb-4 px-4 w-12"></th>
                        <th className="pb-4 px-4">Date</th>
                        <th className="pb-4 px-4">Agent / Customer</th>
                        <th className="pb-4 px-4">Receipt</th>
                        <th className="pb-4 px-4">Commission</th>
                        <th className="pb-4 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {quickApprove.map((record) => (
                        <tr 
                          key={record.form_id}
                          onClick={() => toggleSelect(record.form_id)}
                          className={`group cursor-pointer transition-colors ${
                            selectedIds.includes(record.form_id) ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center">
                              {selectedIds.includes(record.form_id) ? (
                                <CheckSquare className="w-5 h-5 text-blue-600" />
                              ) : (
                                <Square className="w-5 h-5 text-slate-300 group-hover:text-slate-400" />
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm font-medium text-slate-900">
                              {format(new Date(record.created_at), 'MMM dd, yyyy')}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              #{record.form_id.slice(0, 8)}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm font-bold text-slate-900">{record.agent_name}</div>
                            <div className="text-xs text-slate-500">Cust: {record.customer_name}</div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="w-16 h-10 bg-slate-100 rounded overflow-hidden relative border border-slate-200">
                              {record.payment_receipt ? (
                                <img 
                                  src={record.payment_receipt} 
                                  alt="Receipt" 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                  <ImageIcon className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm font-bold text-slate-900">RM {Number(record.commission_earned || 0).toFixed(2)}</div>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (record.payment_receipt) {
                                  setPreviewUrl(record.payment_receipt);
                                  setIsPreviewOpen(true);
                                }
                              }}
                              className="text-blue-600 hover:text-blue-700 text-xs font-bold flex items-center justify-end gap-1 ml-auto"
                            >
                              View Receipt <ExternalLink className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
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

export default AuditReconciliation;
