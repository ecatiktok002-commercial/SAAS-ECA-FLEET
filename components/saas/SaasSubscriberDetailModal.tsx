import React, { useState, useEffect } from 'react';
import { X, Building2, CreditCard, Shield, User, ArrowUpCircle, Clock, PauseCircle, CheckCircle2, DollarSign, Calendar, Sparkles, Edit3, Save } from 'lucide-react';
import { Company, SaaSInvoice, SaaSCommission, SaaSPlanTier, SaaSAccountType } from '../../types';
import { calculateSubscriberMRR, getPlanName, getSubscriberEffectiveStatus, PLAN_CONFIGS, ACCOUNT_TYPES, DEFAULT_ACQUISITION_SOURCES, isCommercialSubscriber } from '../../utils/saasUtils';
import { formatMytDate } from '../../utils/dateUtils';

interface SaasSubscriberDetailModalProps {
  subscriber: Company | null;
  invoices: SaaSInvoice[];
  commissions: SaaSCommission[];
  onClose: () => void;
  onUpdateSubscriber: (id: string, updates: Partial<Company>) => Promise<void>;
  onRecordManualPayment: (invoice: Partial<SaaSInvoice>) => Promise<void>;
}

export const SaasSubscriberDetailModal: React.FC<SaasSubscriberDetailModalProps> = ({
  subscriber,
  invoices,
  commissions,
  onClose,
  onUpdateSubscriber,
  onRecordManualPayment
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'controls' | 'commission'>('overview');
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Editable Form State
  const [accountType, setAccountType] = useState<SaaSAccountType>(subscriber?.account_type || 'Commercial Customer');
  const [includeInAnalytics, setIncludeInAnalytics] = useState<boolean>(subscriber ? isCommercialSubscriber(subscriber) : true);
  const [tier, setTier] = useState<SaaSPlanTier>((subscriber?.tier as SaaSPlanTier) || 'Tier 1');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(subscriber?.billing_cycle || 'monthly');
  const [expiryDate, setExpiryDate] = useState<string>(
    subscriber?.expiry_date ? subscriber.expiry_date.substring(0, 10) : ''
  );
  const [outstandingAmount, setOutstandingAmount] = useState<number>(subscriber?.outstanding_amount || 0);
  const [leadSource, setLeadSource] = useState<string>(subscriber?.lead_source || 'Threads Organic');
  const [primarySalesperson, setPrimarySalesperson] = useState<string>(subscriber?.primary_salesperson_name || subscriber?.salesperson_name || 'Founder Direct');
  const [supportingSalesperson, setSupportingSalesperson] = useState<string>(subscriber?.supporting_salesperson_name || '');
  const [commissionEligible, setCommissionEligible] = useState<boolean>(
    subscriber?.commission_eligible !== undefined ? Boolean(subscriber.commission_eligible) : true
  );
  const [commissionSplit, setCommissionSplit] = useState<string>(subscriber?.commission_split || '50/50');

  // Manual payment state
  const [manualAmount, setManualAmount] = useState<number>(subscriber ? calculateSubscriberMRR(subscriber) : 0);
  const [manualMethod, setManualMethod] = useState<'FPX' | 'Credit Card' | 'DuitNow' | 'Manual Bank Transfer' | 'Stripe'>('Manual Bank Transfer');
  const [graceDays, setGraceDays] = useState(7);

  // Reset editable states on subscriber prop change
  useEffect(() => {
    if (!subscriber) return;
    setAccountType(subscriber.account_type || 'Commercial Customer');
    setIncludeInAnalytics(isCommercialSubscriber(subscriber));
    setTier((subscriber.tier as SaaSPlanTier) || 'Tier 1');
    setBillingCycle(subscriber.billing_cycle || 'monthly');
    setExpiryDate(subscriber.expiry_date ? subscriber.expiry_date.substring(0, 10) : '');
    setOutstandingAmount(subscriber.outstanding_amount || 0);
    setLeadSource(subscriber.lead_source || 'Threads Organic');
    setPrimarySalesperson(subscriber.primary_salesperson_name || subscriber.salesperson_name || 'Founder Direct');
    setSupportingSalesperson(subscriber.supporting_salesperson_name || '');
    setCommissionEligible(subscriber.commission_eligible !== undefined ? Boolean(subscriber.commission_eligible) : true);
    setCommissionSplit(subscriber.commission_split || '50/50');
  }, [subscriber]);

  const status = subscriber ? getSubscriberEffectiveStatus(subscriber) : 'ACTIVE';
  const planName = subscriber ? getPlanName(subscriber.tier) : 'Basic Forms';
  const mrr = subscriber ? calculateSubscriberMRR(subscriber) : 0;

  const subInvoices = subscriber ? invoices.filter(i => i.subscriber_id === subscriber.id) : [];
  const subCommission = subscriber ? commissions.find(c => c.subscriber_id === subscriber.id) : undefined;

  const handleAction = async (msg: string, updateFn: () => Promise<void>) => {
    try {
      setLoading(true);
      await updateFn();
      setActionSuccess(msg);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscriber) return;
    await handleAction('Subscriber configuration updated successfully.', async () => {
      await onUpdateSubscriber(subscriber.id, {
        account_type: accountType,
        include_in_analytics: includeInAnalytics,
        tier,
        billing_cycle: billingCycle,
        expiry_date: expiryDate ? new Date(expiryDate).toISOString() : undefined,
        outstanding_amount: Number(outstandingAmount),
        lead_source: leadSource,
        salesperson_name: primarySalesperson,
        primary_salesperson_name: primarySalesperson,
        supporting_salesperson_name: supportingSalesperson.trim() || undefined,
        commission_eligible: commissionEligible,
        commission_split: supportingSalesperson.trim() ? commissionSplit : '100/0'
      });
      setIsEditing(false);
    });
  };

  const handleManualPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscriber) return;
    await handleAction(`Payment of RM ${manualAmount} recorded. Next billing extended.`, async () => {
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + (subscriber.billing_cycle === 'annual' ? 365 : 30));

      await onRecordManualPayment({
        subscriber_id: subscriber.id,
        subscriber_name: subscriber.name,
        plan_tier: subscriber.tier as SaaSPlanTier,
        plan_name: planName,
        amount: manualAmount,
        billing_period: `${formatMytDate(new Date(), 'MMM yyyy')}`,
        billing_cycle: subscriber.billing_cycle || 'monthly',
        payment_method: manualMethod,
        status: 'paid',
        payment_date: new Date().toISOString()
      });

      await onUpdateSubscriber(subscriber.id, {
        expiry_date: nextDate.toISOString(),
        last_payment_date: new Date().toISOString(),
        subscription_status: 'active',
        status: 'ACTIVE',
        is_active: true,
        outstanding_amount: 0
      });
    });
  };

  if (!subscriber) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200/80 bg-slate-50/70 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-lg">
              {subscriber.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900">{subscriber.name}</h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 capitalize">
                  {status.replace(/_/g, ' ')}
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  isCommercialSubscriber(subscriber) ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-600'
                }`}>
                  {subscriber.account_type || (isCommercialSubscriber(subscriber) ? 'Commercial' : 'Internal/Test')}
                </span>
                {!isCommercialSubscriber(subscriber) && (
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    Excluded from Commercial MRR
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Tenant ID: <span className="font-mono text-slate-600">{subscriber.id}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && activeTab === 'overview' && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-slate-800 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Details</span>
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 bg-white text-xs font-bold">
          <button
            onClick={() => { setActiveTab('overview'); setIsEditing(false); }}
            className={`pb-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'overview' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Overview & Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={`pb-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'invoices' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Invoices & Billing ({subInvoices.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('commission')}
            className={`pb-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'commission' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Sales Commission</span>
          </button>

          <button
            onClick={() => setActiveTab('controls')}
            className={`pb-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'controls' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Lifecycle Controls</span>
          </button>
        </div>

        {/* Alert message */}
        {actionSuccess && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/30">
          {activeTab === 'overview' && (
            isEditing ? (
              <form onSubmit={handleSaveEdits} className="space-y-4 text-xs">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Edit Subscriber Configuration
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Account Type *</label>
                      <select
                        value={accountType}
                        onChange={(e) => {
                          const val = e.target.value as SaaSAccountType;
                          setAccountType(val);
                          setIncludeInAnalytics(val === 'Commercial Customer');
                        }}
                        className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold bg-white"
                      >
                        {ACCOUNT_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Include in Commercial Analytics?</label>
                      <select
                        value={includeInAnalytics ? 'yes' : 'no'}
                        onChange={(e) => setIncludeInAnalytics(e.target.value === 'yes')}
                        className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold bg-white"
                      >
                        <option value="yes">Yes (Counts in Active MRR & ARPU)</option>
                        <option value="no">No (Exclude from Commercial Metrics)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Subscription Plan Tier</label>
                      <select
                        value={tier}
                        onChange={(e) => setTier(e.target.value as SaaSPlanTier)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold bg-white"
                      >
                        <option value="Tier 1">Tier 1: Basic Forms (RM 50/mo)</option>
                        <option value="Tier 2">Tier 2: Scheduling & Operations (RM 50/mo)</option>
                        <option value="Tier 3">Tier 3: Enterprise (RM 150/mo)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Billing Cycle</label>
                      <select
                        value={billingCycle}
                        onChange={(e: any) => setBillingCycle(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold bg-white"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="annual">Annual</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Expiry / Renewal Date</label>
                      <input
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Outstanding Balance (RM)</label>
                      <input
                        type="number"
                        value={outstandingAmount}
                        onChange={(e) => setOutstandingAmount(Number(e.target.value))}
                        className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold bg-white"
                        min={0}
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Acquisition Source</label>
                      <select
                        value={leadSource}
                        onChange={(e) => setLeadSource(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold bg-white"
                      >
                        {DEFAULT_ACQUISITION_SOURCES.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Primary Salesperson</label>
                      <input
                        type="text"
                        value={primarySalesperson}
                        onChange={(e) => setPrimarySalesperson(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Supporting Salesperson</label>
                      <input
                        type="text"
                        placeholder="Leave empty if none"
                        value={supportingSalesperson}
                        onChange={(e) => setSupportingSalesperson(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Commission Eligible?</label>
                      <select
                        value={commissionEligible ? 'yes' : 'no'}
                        onChange={(e) => setCommissionEligible(e.target.value === 'yes')}
                        className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold bg-white"
                      >
                        <option value="yes">Yes (Eligible for 1st Month Commission)</option>
                        <option value="no">No (RM0 Commission / Direct)</option>
                      </select>
                    </div>

                    {supportingSalesperson.trim() && (
                      <div className="sm:col-span-2">
                        <label className="block font-bold text-slate-700 mb-1">Commission Split</label>
                        <select
                          value={commissionSplit}
                          onChange={(e) => setCommissionSplit(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold bg-white"
                        >
                          <option value="50/50">50% Primary / 50% Supporting</option>
                          <option value="70/30">70% Primary / 30% Supporting</option>
                          <option value="30/70">30% Primary / 70% Supporting</option>
                          <option value="100/0">100% Primary / 0% Supporting</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Company Info */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Account Profile</h3>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Business Name:</span>
                      <span className="font-bold text-slate-900">{subscriber.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Brand Display:</span>
                      <span className="font-bold text-slate-900">{subscriber.brand_name || subscriber.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Account Type:</span>
                      <span className="font-bold text-slate-900">{subscriber.account_type || 'Commercial Customer'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Commercial Analytics:</span>
                      <span className={`font-bold ${isCommercialSubscriber(subscriber) ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {isCommercialSubscriber(subscriber) ? 'Included in MRR' : 'Excluded'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Contact Person:</span>
                      <span className="font-semibold text-slate-800">{subscriber.contact_person || 'Owner Admin'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Registered On:</span>
                      <span className="font-semibold text-slate-800">{formatMytDate(subscriber.created_at, 'dd MMM yyyy')}</span>
                    </div>
                  </div>
                </div>

                {/* Subscription & MRR */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Subscription & Revenue</h3>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Plan:</span>
                      <span className="font-bold text-slate-900">{planName} ({subscriber.tier})</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Billing Cycle:</span>
                      <span className="font-bold text-slate-900 capitalize">{subscriber.billing_cycle || 'monthly'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Attributed MRR:</span>
                      <span className="font-black text-slate-900 text-sm">RM {mrr.toFixed(2)}/mo</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Expiry / Renewal:</span>
                      <span className="font-bold text-slate-900">
                        {subscriber.expiry_date ? formatMytDate(subscriber.expiry_date, 'dd MMM yyyy') : 'No expiry date'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Outstanding:</span>
                      <span className={`font-bold ${subscriber.outstanding_amount ? 'text-rose-600' : 'text-slate-900'}`}>
                        RM {(subscriber.outstanding_amount || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Attribution Box */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3 md:col-span-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Attribution & Commission</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Acquisition Channel</span>
                      <span className="font-bold text-slate-900 text-sm">{subscriber.lead_source || 'Threads Organic'}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Salesperson</span>
                      <span className="font-bold text-slate-900 text-sm">
                        {subscriber.primary_salesperson_name || subscriber.salesperson_name || 'Founder Direct'}
                        {subscriber.supporting_salesperson_name ? ` & ${subscriber.supporting_salesperson_name}` : ''}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Commission Rule</span>
                      <span className="font-bold text-slate-900 text-sm">
                        {subscriber.commission_eligible !== false ? '100% 1st Month' : 'None (RM0)'}
                        {subscriber.supporting_salesperson_name ? ` (${subscriber.commission_split || '50/50'})` : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}

          {activeTab === 'invoices' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                      <th className="py-2.5 px-4">Invoice #</th>
                      <th className="py-2.5 px-4">Period</th>
                      <th className="py-2.5 px-4 text-right">Amount</th>
                      <th className="py-2.5 px-4">Method</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                      <th className="py-2.5 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {subInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400">
                          No invoice records found for this subscriber yet.
                        </td>
                      </tr>
                    ) : (
                      subInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{inv.invoice_number}</td>
                          <td className="py-2.5 px-4 font-medium">{inv.billing_period}</td>
                          <td className="py-2.5 px-4 text-right font-black text-slate-900">RM {inv.amount.toFixed(2)}</td>
                          <td className="py-2.5 px-4">{inv.payment_method}</td>
                          <td className="py-2.5 px-4 text-center">
                            <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full text-[10px] border border-emerald-200">
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-500">{formatMytDate(inv.payment_date, 'dd MMM yyyy')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Record Payment */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Record Payment / Manual Bank Transfer</span>
                </h4>
                <form onSubmit={handleManualPaymentSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">Amount (RM)</label>
                    <input
                      type="number"
                      value={manualAmount}
                      onChange={(e) => setManualAmount(Number(e.target.value))}
                      className="w-full text-xs font-bold p-2 rounded-lg border border-slate-200"
                      min={1}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">Payment Method</label>
                    <select
                      value={manualMethod}
                      onChange={(e: any) => setManualMethod(e.target.value)}
                      className="w-full text-xs font-semibold p-2 rounded-lg border border-slate-200"
                    >
                      <option value="Manual Bank Transfer">Manual Bank Transfer</option>
                      <option value="DuitNow">DuitNow QR</option>
                      <option value="FPX">FPX Online Banking</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Stripe">Stripe</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      Record & Extend Expiry
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'commission' && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Commission Status & Attribution</h3>
              <div className="p-4 bg-slate-50 rounded-xl space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Primary Salesperson:</span>
                  <span className="font-bold text-slate-900">{subscriber.primary_salesperson_name || subscriber.salesperson_name || 'Founder Direct'}</span>
                </div>
                {subscriber.supporting_salesperson_name && (
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Supporting Salesperson:</span>
                    <span className="font-bold text-slate-900">{subscriber.supporting_salesperson_name}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Commission Eligibility:</span>
                  <span className="font-bold text-slate-900">
                    {subscriber.commission_eligible !== false ? 'Eligible' : 'Not Eligible (Direct/Founder)'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">First Month Revenue:</span>
                  <span className="font-bold text-slate-900">RM {mrr.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Commission Payable:</span>
                  <span className="font-bold text-emerald-700">
                    {subscriber.commission_eligible !== false ? `RM ${mrr.toFixed(2)}` : 'RM 0.00'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Ledger Payout Status:</span>
                  <span className="font-bold text-slate-900">
                    {subCommission?.status || (subscriber.commission_eligible !== false ? 'pending_approval' : 'none')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'controls' && (
            <div className="space-y-6">
              {/* Account Lifecycle State */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <PauseCircle className="w-4 h-4 text-slate-600" />
                  <span>Account Lifecycle State</span>
                </h4>
                <p className="text-xs text-slate-500">Data is never deleted on suspension or cancellation.</p>
                <div className="flex items-center gap-2 pt-2">
                  {subscriber.is_active && status !== 'suspended' ? (
                    <button
                      onClick={async () => {
                        if (!confirm(`Suspend account for ${subscriber.name}?`)) return;
                        await handleAction('Account suspended.', async () => {
                          await onUpdateSubscriber(subscriber.id, {
                            subscription_status: 'suspended',
                            status: 'SUSPENDED',
                            is_active: false
                          });
                        });
                      }}
                      disabled={loading}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors"
                    >
                      Suspend Access
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        const nextExpiry = new Date();
                        nextExpiry.setDate(nextExpiry.getDate() + 30);
                        await handleAction('Account reactivated.', async () => {
                          await onUpdateSubscriber(subscriber.id, {
                            subscription_status: 'active',
                            status: 'ACTIVE',
                            is_active: true,
                            expiry_date: nextExpiry.toISOString()
                          });
                        });
                      }}
                      disabled={loading}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      Reactivate Account
                    </button>
                  )}

                  <button
                    onClick={async () => {
                      const currentCancel = subscriber.cancel_at_period_end;
                      await handleAction(currentCancel ? 'Cancel at period end removed.' : 'Scheduled to cancel at end of period.', async () => {
                        await onUpdateSubscriber(subscriber.id, {
                          cancel_at_period_end: !currentCancel,
                          subscription_status: !currentCancel ? 'cancel_at_period_end' : 'active'
                        });
                      });
                    }}
                    disabled={loading}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                  >
                    {subscriber.cancel_at_period_end ? 'Undo Cancel at End' : 'Cancel at Period End'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Smart Drive SaaS Multi-Tenant Command Center</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
