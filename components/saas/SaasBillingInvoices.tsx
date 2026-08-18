import React, { useState } from 'react';
import { CreditCard, Search, Filter, Plus, DollarSign, Download, CheckCircle2, AlertCircle, Clock, FileText } from 'lucide-react';
import { Company, SaaSInvoice, SaaSPlanTier } from '../../types';
import { formatMytDate } from '../../utils/dateUtils';
import { getPlanName, PLAN_CONFIGS } from '../../utils/saasUtils';

interface SaasBillingInvoicesProps {
  invoices: SaaSInvoice[];
  subscribers: Company[];
  onAddInvoice: (invoice: Partial<SaaSInvoice>) => Promise<void>;
  onSelectSubscriber: (subscriber: Company) => void;
}

export const SaasBillingInvoices: React.FC<SaasBillingInvoicesProps> = ({
  invoices,
  subscribers,
  onAddInvoice,
  onSelectSubscriber
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Invoice Form
  const [selectedSubId, setSelectedSubId] = useState<string>(subscribers[0]?.id || '');
  const [amount, setAmount] = useState<number>(150);
  const [billingPeriod, setBillingPeriod] = useState<string>(formatMytDate(new Date(), 'MMM yyyy'));
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<'FPX' | 'Credit Card' | 'DuitNow' | 'Manual Bank Transfer' | 'Stripe'>('Manual Bank Transfer');
  const [invStatus, setInvStatus] = useState<SaaSInvoice['status']>('paid');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filteredInvoices = invoices.filter(inv => {
    const matchSearch = inv.subscriber_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalCollected = invoices.filter(i => i.status === 'paid' || i.status === 'manual_override').reduce((s, i) => s + i.amount, 0);
  const totalPending = invoices.filter(i => i.status === 'pending' || i.status === 'past_due').reduce((s, i) => s + i.amount, 0);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const sub = subscribers.find(s => s.id === selectedSubId);
    if (!sub) return;

    try {
      setSubmitting(true);
      await onAddInvoice({
        subscriber_id: sub.id,
        subscriber_name: sub.name,
        plan_tier: sub.tier as SaaSPlanTier,
        plan_name: getPlanName(sub.tier),
        amount,
        billing_period: billingPeriod,
        billing_cycle: cycle,
        payment_method: paymentMethod,
        status: invStatus,
        notes,
        payment_date: new Date().toISOString()
      });
      setIsAddModalOpen(false);
      setNotes('');
    } catch (err: any) {
      alert(err.message || 'Failed to record invoice');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Financial Summary Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Total Invoiced Collected</span>
          <div className="text-2xl font-black text-emerald-600">
            RM {totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Successfully reconciled payments</span>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Pending / Past Due</span>
          <div className="text-2xl font-black text-rose-600">
            RM {totalPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Awaiting payment or bank transfer</span>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Total Invoices</span>
            <div className="text-2xl font-black text-slate-900">{invoices.length}</div>
            <span className="text-xs text-slate-400 mt-1 block">Ledger transaction count</span>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <span>SaaS Billing & Invoices Ledger</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Complete record of recurring subscription charges & receipts</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search invoice or subscriber..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-slate-900 w-56"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {['all', 'paid', 'pending', 'past_due'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                    statusFilter === st ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {st.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-y border-slate-100">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Subscriber</th>
                <th className="py-3 px-4">Plan / Tier</th>
                <th className="py-3 px-4">Billing Period</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Payment Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No billing records found.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoice_number}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => {
                          const s = subscribers.find(sub => sub.id === inv.subscriber_id);
                          if (s) onSelectSubscriber(s);
                        }}
                        className="font-bold text-slate-900 hover:text-blue-600 text-left"
                      >
                        {inv.subscriber_name}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-600">
                      {inv.plan_name} ({inv.plan_tier})
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-500">{inv.billing_period}</td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">
                      RM {inv.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{inv.payment_method}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
                        inv.status === 'paid' || inv.status === 'manual_override'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : inv.status === 'pending'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {inv.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {formatMytDate(inv.payment_date || inv.created_at, 'dd MMM yyyy')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Invoice Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900">Record SaaS Subscription Payment</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Subscriber</label>
                <select
                  value={selectedSubId}
                  onChange={(e) => {
                    setSelectedSubId(e.target.value);
                    const sub = subscribers.find(s => s.id === e.target.value);
                    if (sub) {
                      setAmount(sub.tier === 'Tier 3' ? 150 : 50);
                    }
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                  required
                >
                  {subscribers.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.tier} - {getPlanName(sub.tier)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount (RM)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                    min={1}
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Billing Period</label>
                  <input
                    type="text"
                    value={billingPeriod}
                    onChange={(e) => setBillingPeriod(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Billing Cycle</label>
                  <select
                    value={cycle}
                    onChange={(e: any) => setCycle(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e: any) => setPaymentMethod(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                  >
                    <option value="Manual Bank Transfer">Manual Bank Transfer</option>
                    <option value="DuitNow">DuitNow QR</option>
                    <option value="FPX">FPX Online Banking</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Stripe">Stripe</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Status</label>
                <select
                  value={invStatus}
                  onChange={(e: any) => setInvStatus(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                >
                  <option value="paid">Paid / Reconciled</option>
                  <option value="pending">Pending</option>
                  <option value="past_due">Past Due</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Reference (Optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Maybank Transfer ref #MBB98234"
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold"
                >
                  {submitting ? 'Saving...' : 'Record Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
