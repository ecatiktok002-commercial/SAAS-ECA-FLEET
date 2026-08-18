import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';
import { SaaSPlanTier, SaaSAccountType } from '../../types';
import { DEFAULT_ACQUISITION_SOURCES, PLAN_CONFIGS, ACCOUNT_TYPES, isCommissionEligible } from '../../utils/saasUtils';

export interface SaasAddSubscriberFormData {
  name: string;
  brand_name?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  account_type: SaaSAccountType;
  include_in_analytics: boolean;
  tier: SaaSPlanTier;
  billing_cycle: 'monthly' | 'annual';
  payment_method: string;
  is_trial: boolean;
  trial_days?: number;
  lead_source: string;
  primary_salesperson_name: string;
  supporting_salesperson_name?: string;
  commission_eligible: boolean;
  commission_split?: string;
}

interface SaasAddSubscriberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSubscriber: (data: SaasAddSubscriberFormData) => Promise<void>;
}

export const SaasAddSubscriberModal: React.FC<SaasAddSubscriberModalProps> = ({
  isOpen,
  onClose,
  onAddSubscriber
}) => {
  if (!isOpen) return null;

  // Step state (1: Company, 2: Subscription, 3: Sales Attribution)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Company Fields
  const [name, setName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [accountType, setAccountType] = useState<SaaSAccountType>('Commercial Customer');

  // Step 2: Subscription Fields
  const [tier, setTier] = useState<SaaSPlanTier>('Tier 3');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [paymentMethod, setPaymentMethod] = useState('FPX');
  const [isTrial, setIsTrial] = useState(false);
  const [includeInAnalytics, setIncludeInAnalytics] = useState(true);

  // Step 3: Sales Attribution Fields
  const [leadSource, setLeadSource] = useState('Threads Organic');
  const [primarySalesperson, setPrimarySalesperson] = useState('Intern A');
  const [supportingSalesperson, setSupportingSalesperson] = useState('');
  const [commissionEligible, setCommissionEligible] = useState(true);
  const [commissionSplit, setCommissionSplit] = useState('50/50');

  const [loading, setLoading] = useState(false);

  // Automatically determine includeInAnalytics strictly from Account Type
  useEffect(() => {
    if (accountType === 'Commercial Customer') {
      setIncludeInAnalytics(true);
    } else {
      setIncludeInAnalytics(false);
    }
  }, [accountType]);

  // Automatically determine commission eligibility based on salesperson name, source, or account type
  useEffect(() => {
    const isEligible = isCommissionEligible({
      account_type: accountType,
      primary_salesperson_name: primarySalesperson,
      lead_source: leadSource
    });
    setCommissionEligible(isEligible);
  }, [primarySalesperson, leadSource, accountType]);

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setStep(2);
  };

  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(3);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setLoading(true);
      await onAddSubscriber({
        name: name.trim(),
        brand_name: brandName.trim() || name.trim(),
        contact_person: contactPerson.trim(),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim(),
        account_type: accountType,
        include_in_analytics: includeInAnalytics,
        tier,
        billing_cycle: billingCycle,
        payment_method: paymentMethod,
        is_trial: isTrial,
        trial_days: isTrial ? 14 : undefined,
        lead_source: leadSource,
        primary_salesperson_name: primarySalesperson.trim(),
        supporting_salesperson_name: supportingSalesperson.trim() || undefined,
        commission_eligible: commissionEligible,
        commission_split: supportingSalesperson.trim() ? commissionSplit : '100/0'
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to create subscriber');
    } finally {
      setLoading(false);
    }
  };

  const plan = PLAN_CONFIGS[tier];
  const priceDisplay = billingCycle === 'annual' 
    ? `RM ${plan.annualPrice}/yr (RM ${Math.round(plan.annualPrice / 12)}/mo normalized)` 
    : `RM ${plan.monthlyPrice}/mo`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Modal Header & Progress Indicator */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Add New Subscriber</h2>
              <p className="text-xs text-slate-500 mt-0.5">3-Step Onboarding Wizard</p>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-between gap-2 px-1">
            <div className={`flex-1 flex items-center gap-2 pb-1 border-b-2 transition-all ${
              step >= 1 ? 'border-slate-900 text-slate-900' : 'border-slate-200 text-slate-400'
            }`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step >= 1 ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
              }`}>1</div>
              <span className="text-xs font-bold">Company</span>
            </div>

            <div className={`flex-1 flex items-center gap-2 pb-1 border-b-2 transition-all ${
              step >= 2 ? 'border-slate-900 text-slate-900' : 'border-slate-200 text-slate-400'
            }`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step >= 2 ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
              }`}>2</div>
              <span className="text-xs font-bold">Subscription</span>
            </div>

            <div className={`flex-1 flex items-center gap-2 pb-1 border-b-2 transition-all ${
              step >= 3 ? 'border-slate-900 text-slate-900' : 'border-slate-200 text-slate-400'
            }`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step >= 3 ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
              }`}>3</div>
              <span className="text-xs font-bold">Attribution</span>
            </div>
          </div>
        </div>

        {/* STEP 1: COMPANY */}
        {step === 1 && (
          <form onSubmit={handleNextStep1} className="p-6 overflow-y-auto space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Company / Business Name *</label>
              <input
                type="text"
                placeholder="e.g. Apex Car Rental Sdn Bhd"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Brand Display Name</label>
              <input
                type="text"
                placeholder="e.g. Apex Rental"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. Alex Tan"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="alex@apex.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">WhatsApp / Phone</label>
                <input
                  type="text"
                  placeholder="+60 12-345 6789"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>
            </div>

            {/* Account Type Selection */}
            <div className="pt-2">
              <label className="block font-bold text-slate-700 mb-1.5">Account Type *</label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as SaaSAccountType)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold bg-white"
              >
                {ACCOUNT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label} {type.defaultInclude ? '(Counts in Commercial MRR)' : '(Excluded from Analytics)'}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                {accountType === 'Commercial Customer' 
                  ? '✓ Automatically included in Paying Customers & Recurring MRR.' 
                  : '⚠ Internal / Test / Demo accounts are automatically excluded from revenue numbers.'}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1.5 transition-all"
              >
                Next: Subscription
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: SUBSCRIPTION */}
        {step === 2 && (
          <form onSubmit={handleNextStep2} className="p-6 overflow-y-auto space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-2">Select Subscription Plan *</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(['Tier 1', 'Tier 2', 'Tier 3'] as SaaSPlanTier[]).map((tierKey) => {
                  const p = PLAN_CONFIGS[tierKey];
                  const isSelected = tier === tierKey;
                  return (
                    <div
                      key={tierKey}
                      onClick={() => setTier(tierKey)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-900/10'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="font-bold text-slate-900 text-xs">{p.name}</div>
                      <div className="text-sm font-black text-slate-900 mt-1">RM {p.monthlyPrice}/mo</div>
                      <div className="text-[10px] text-slate-500 mt-1 leading-snug">{p.description}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Billing Cycle</label>
                <select
                  value={billingCycle}
                  onChange={(e: any) => setBillingCycle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                >
                  <option value="monthly">Monthly — RM {PLAN_CONFIGS[tier].monthlyPrice}/month</option>
                  <option value="annual">Annual — RM {PLAN_CONFIGS[tier].annualPrice}/year (RM {Math.round(PLAN_CONFIGS[tier].annualPrice / 12)}/mo)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                >
                  <option value="FPX">FPX Online Banking</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="DuitNow">DuitNow QR</option>
                  <option value="Manual Bank Transfer">Manual Bank Transfer</option>
                  <option value="Stripe">Stripe</option>
                </select>
              </div>
            </div>

            {/* Free Trial Toggle */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">Free Trial</span>
                <span className="text-[11px] text-slate-500">Optional 14-day evaluation before paid subscription begins</span>
              </div>
              <input
                type="checkbox"
                checked={isTrial}
                onChange={(e) => setIsTrial(e.target.checked)}
                className="w-4 h-4 rounded-sm text-slate-900 focus:ring-slate-900 cursor-pointer"
              />
            </div>

            <div className="flex justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1.5 transition-all"
              >
                Next: Sales Attribution
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: SALES ATTRIBUTION & SUMMARY */}
        {step === 3 && (
          <form onSubmit={handleFinalSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Acquisition Source *</label>
              <select
                value={leadSource}
                onChange={(e) => setLeadSource(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
              >
                {DEFAULT_ACQUISITION_SOURCES.map((src) => (
                  <option key={src} value={src}>{src}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Primary Salesperson *</label>
                <input
                  type="text"
                  placeholder="e.g. Intern A / Sarah"
                  value={primarySalesperson}
                  onChange={(e) => setPrimarySalesperson(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Supporting Salesperson (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Intern B (Leave empty if none)"
                  value={supportingSalesperson}
                  onChange={(e) => setSupportingSalesperson(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                />
              </div>
            </div>

            {/* Split (only if supporting exists) */}
            {supportingSalesperson.trim() && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Commission Split</label>
                <select
                  value={commissionSplit}
                  onChange={(e) => setCommissionSplit(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold bg-white"
                >
                  <option value="50/50">50% Primary ({primarySalesperson}) / 50% Supporting ({supportingSalesperson})</option>
                  <option value="70/30">70% Primary ({primarySalesperson}) / 30% Supporting ({supportingSalesperson})</option>
                  <option value="30/70">30% Primary ({primarySalesperson}) / 70% Supporting ({supportingSalesperson})</option>
                  <option value="100/0">100% Primary ({primarySalesperson}) / 0% Supporting</option>
                </select>
              </div>
            )}

            {/* Automatic Commission Eligible with Manual Override Support */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">Commission Eligible</span>
                <span className="text-[11px] text-slate-500">
                  {commissionEligible 
                    ? '✓ Eligible for 100% 1st-month commission upon successful payment' 
                    : 'Sales attribution recorded with RM0 payable (Founder / Direct rule)'}
                </span>
              </div>
              <input
                type="checkbox"
                checked={commissionEligible}
                onChange={(e) => setCommissionEligible(e.target.checked)}
                className="w-4 h-4 rounded-sm text-slate-900 focus:ring-slate-900 cursor-pointer"
              />
            </div>

            {/* Simple Order Review Card */}
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Summary Review</div>
              <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                <div><span className="text-slate-400">Company:</span> <span className="font-bold">{name}</span></div>
                <div><span className="text-slate-400">Plan:</span> <span className="font-bold">{plan.name}</span></div>
                <div><span className="text-slate-400">Price:</span> <span className="font-bold">{priceDisplay}</span></div>
                <div><span className="text-slate-400">Billing:</span> <span className="font-bold capitalize">{billingCycle}</span></div>
                <div><span className="text-slate-400">Acquisition:</span> <span className="font-bold">{leadSource}</span></div>
                <div>
                  <span className="text-slate-400">Salesperson:</span>{' '}
                  <span className="font-bold">
                    {primarySalesperson}
                    {supportingSalesperson.trim() ? ` & ${supportingSalesperson}` : ''}
                  </span>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Commission:</span>{' '}
                  <span className="font-bold text-emerald-400">
                    {commissionEligible 
                      ? (supportingSalesperson.trim() 
                          ? `100% 1st Month split (${commissionSplit})` 
                          : '100% 1st Month Revenue to Salesperson') 
                      : 'No Commission (Founder / Direct Rule)'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-md shadow-emerald-900/10"
              >
                {loading ? 'Creating...' : 'Create Subscriber'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
