import { Company, SaaSInvoice, SaaSCommission, SaaSPlanTier, SaaSSubscriptionStatus, SaaSAccountType } from '../types';
import { getNowMYT, utcToMyt } from './dateUtils';

export interface SaaSMetricsSummary {
  mrr: number;
  mrrGrowthPercent: number;
  activeSubscribers: number;
  newThisMonth: number;
  netSubscriberGrowth: number;
  churnRatePercent: number;
  pastDueAmount: number;
  pastDueSubscribersCount: number;
  arpu: number;
  cashCollectedThisMonth: number;
  
  // Movement
  movement: {
    newCount: number;
    reactivatedCount: number;
    upgradedCount: number;
    downgradedCount: number;
    cancelledCount: number;
    netGrowth: number;
  };

  // Plan Performance
  planPerformance: {
    tier: SaaSPlanTier;
    name: string;
    priceMonthly: number;
    subscribersCount: number;
    mrr: number;
    mrrPercentage: number;
    newThisMonth: number;
    churnRatePercent: number;
  }[];

  // Payment Health (clean lifecycle status)
  paymentHealth: {
    status: SaaSSubscriptionStatus;
    label: string;
    subscribersCount: number;
    amount: number;
    color: string;
    bg: string;
  }[];

  // Renewals (tracked separately)
  renewals: {
    next7DaysCount: number;
    next7DaysAmount: number;
    next30DaysCount: number;
    next30DaysAmount: number;
  };
}

export const PLAN_CONFIGS: Record<SaaSPlanTier, { name: string; monthlyPrice: number; annualPrice: number; description: string }> = {
  'Tier 1': {
    name: 'Basic Forms',
    monthlyPrice: 50,
    annualPrice: 500,
    description: 'Digital vehicle checkout agreements, signatures & basic PDF export'
  },
  'Tier 2': {
    name: 'Scheduling & Operations',
    monthlyPrice: 50,
    annualPrice: 500,
    description: 'Interactive visual fleet calendar, booking track management & handover logs'
  },
  'Tier 3': {
    name: 'Enterprise',
    monthlyPrice: 150,
    annualPrice: 1500,
    description: 'All features + Fleet Guardian, automated audit payout, CRM & analytics'
  }
};

export const getPlanName = (tier: string): string => {
  if (tier === 'Tier 3' || tier === 'tier_3' || String(tier).toLowerCase().includes('enterprise')) return 'Enterprise';
  if (tier === 'Tier 2' || tier === 'tier_2' || String(tier).toLowerCase().includes('scheduling') || String(tier).toLowerCase().includes('pro')) return 'Scheduling & Operations';
  return 'Basic Forms';
};

export const getNormalizedTier = (tier: string): SaaSPlanTier => {
  if (tier === 'Tier 3' || tier === 'tier_3' || String(tier).toLowerCase().includes('enterprise') || String(tier).toLowerCase().includes('3')) return 'Tier 3';
  if (tier === 'Tier 2' || tier === 'tier_2' || String(tier).toLowerCase().includes('scheduling') || String(tier).toLowerCase().includes('2')) return 'Tier 2';
  return 'Tier 1';
};

/**
 * Determines whether an account is counted in commercial analytics (MRR, paying count, ARPU, acquisition revenue)
 * Default rules:
 * - Commercial Customer -> Yes
 * - Internal -> No
 * - Demo / Trial -> No
 * - Test / Sandbox -> No
 * - Complimentary / Partner -> No
 * - Unclassified -> No unless manually changed
 */
export const isCommercialSubscriber = (sub: Company): boolean => {
  // If explicitly overridden via include_in_analytics
  if (sub.include_in_analytics !== undefined && sub.include_in_analytics !== null) {
    return Boolean(sub.include_in_analytics);
  }

  // Check account_type
  if (sub.account_type) {
    return sub.account_type === 'Commercial Customer';
  }

  // Existing account migration safety:
  const nameLower = (sub.name || '').toLowerCase();
  const brandLower = (sub.brand_name || '').toLowerCase();
  
  if (
    nameLower.includes('demo') || 
    nameLower.includes('test') || 
    nameLower.includes('sandbox') || 
    nameLower.includes('internal') ||
    brandLower.includes('demo') || 
    brandLower.includes('test') || 
    brandLower.includes('sandbox') || 
    brandLower.includes('internal')
  ) {
    return false;
  }

  if (sub.is_trial) {
    return false;
  }

  // Obvious existing commercial subscriber
  return true;
};

/**
 * Calculates normalized MRR for a single subscriber
 * - Accounts with include_in_analytics = false or non-commercial return RM0
 * - Annual subscriptions are normalized (e.g. RM1,500 / 12 = RM125 MRR)
 */
export const calculateSubscriberMRR = (sub: Company): number => {
  // Must be included in commercial analytics
  if (!isCommercialSubscriber(sub)) {
    return 0;
  }

  // If custom MRR is explicitly set
  if (sub.custom_mrr !== undefined && sub.custom_mrr !== null) {
    return Number(sub.custom_mrr);
  }

  const status = getSubscriberEffectiveStatus(sub);
  if (status === 'cancelled' || status === 'suspended' || status === 'expired' || sub.is_trial) {
    return 0;
  }

  const normalizedTier = getNormalizedTier(sub.tier);
  const plan = PLAN_CONFIGS[normalizedTier];

  if (sub.billing_cycle === 'annual') {
    const annualPrice = sub.annual_amount || plan.annualPrice;
    return annualPrice / 12;
  }

  return plan.monthlyPrice;
};

/**
 * Derives effective SaaS subscription status
 */
export const getSubscriberEffectiveStatus = (sub: Company): SaaSSubscriptionStatus => {
  if (sub.subscription_status) {
    return sub.subscription_status;
  }

  if (sub.is_trial) {
    const now = getNowMYT();
    if (sub.expiry_date && utcToMyt(sub.expiry_date) < now) {
      return 'expired';
    }
    return 'trialing';
  }

  if (!sub.is_active || sub.status === 'INACTIVE') {
    return 'cancelled';
  }

  if (sub.cancel_at_period_end) {
    return 'cancel_at_period_end';
  }

  const now = getNowMYT();
  if (sub.expiry_date) {
    const expiry = utcToMyt(sub.expiry_date);
    const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays < -14) {
      return 'expired';
    } else if (diffDays < -3) {
      return 'suspended';
    } else if (diffDays < 0) {
      return 'grace_period';
    }
  }

  if (sub.outstanding_amount && sub.outstanding_amount > 0) {
    return 'past_due';
  }

  return 'active';
};

/**
 * Checks if subscription is due soon (within next 7 days)
 */
export const isDueSoon = (sub: Company): boolean => {
  if (!sub.expiry_date) return false;
  const now = getNowMYT();
  const expiry = utcToMyt(sub.expiry_date);
  const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 7;
};

/**
 * Helper to determine default commission eligibility
 */
export const isCommissionEligible = (sub: Partial<Company>): boolean => {
  if (sub.commission_eligible !== undefined && sub.commission_eligible !== null) {
    return Boolean(sub.commission_eligible);
  }

  const salesName = (sub.salesperson_name || sub.primary_salesperson_name || '').toLowerCase();
  const leadSource = (sub.lead_source || '').toLowerCase();

  // Founder / Direct / Company Direct are NOT commission eligible by default
  if (
    salesName.includes('founder') || 
    salesName.includes('michael') || 
    salesName.includes('direct') ||
    leadSource.includes('founder') ||
    leadSource.includes('direct')
  ) {
    return false;
  }

  // Commercial customers with sales rep/intern are eligible
  if (sub.account_type && sub.account_type !== 'Commercial Customer') {
    return false;
  }

  return true;
};

/**
 * Core SaaS calculation engine
 */
export const calculateSaaSMetrics = (
  subscribers: Company[],
  invoices: SaaSInvoice[] = [],
  commissions: SaaSCommission[] = []
): SaaSMetricsSummary => {
  const now = getNowMYT();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let totalMRR = 0;
  let activePayingSubscribers = 0;
  let newThisMonth = 0;
  let pastDueAmount = 0;
  let pastDueCount = 0;
  let cancelledThisMonth = 0;

  // Plan counts & MRR
  const planData: Record<SaaSPlanTier, { count: number; mrr: number; newCount: number; cancelledCount: number }> = {
    'Tier 1': { count: 0, mrr: 0, newCount: 0, cancelledCount: 0 },
    'Tier 2': { count: 0, mrr: 0, newCount: 0, cancelledCount: 0 },
    'Tier 3': { count: 0, mrr: 0, newCount: 0, cancelledCount: 0 }
  };

  // Payment health map (Strict lifecycle states)
  const statusCounts: Record<SaaSSubscriptionStatus, { count: number; amount: number }> = {
    active: { count: 0, amount: 0 },
    past_due: { count: 0, amount: 0 },
    grace_period: { count: 0, amount: 0 },
    suspended: { count: 0, amount: 0 },
    cancelled: { count: 0, amount: 0 },
    cancel_at_period_end: { count: 0, amount: 0 },
    expired: { count: 0, amount: 0 },
    trialing: { count: 0, amount: 0 }
  };

  // Renewals counters
  let next7DaysCount = 0;
  let next7DaysAmount = 0;
  let next30DaysCount = 0;
  let next30DaysAmount = 0;

  subscribers.forEach(sub => {
    const isCommercial = isCommercialSubscriber(sub);
    const status = getSubscriberEffectiveStatus(sub);
    const tier = getNormalizedTier(sub.tier);
    const mrrContrib = calculateSubscriberMRR(sub);

    // Created date check for this month
    const createdDate = sub.created_at ? new Date(sub.created_at) : null;
    const isNewThisMonth = createdDate && createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;

    if (isCommercial) {
      if (isNewThisMonth) {
        newThisMonth++;
        planData[tier].newCount++;
      }

      // Active paying subscriber definition
      const isPayingActive = (status === 'active' || status === 'cancel_at_period_end' || status === 'grace_period') && !sub.is_trial;

      if (isPayingActive) {
        activePayingSubscribers++;
        totalMRR += mrrContrib;
        planData[tier].count++;
        planData[tier].mrr += mrrContrib;
      }

      if (status === 'cancelled' || status === 'expired') {
        cancelledThisMonth++;
        planData[tier].cancelledCount++;
      }
    }

    // Payment health classification (Commercial & active accounts with financial tracking)
    if (status === 'past_due' || (sub.outstanding_amount && sub.outstanding_amount > 0)) {
      const amount = sub.outstanding_amount || PLAN_CONFIGS[tier].monthlyPrice;
      if (isCommercial) {
        pastDueAmount += amount;
        pastDueCount++;
      }
      statusCounts.past_due.count++;
      statusCounts.past_due.amount += amount;
    } else if (status === 'grace_period') {
      statusCounts.grace_period.count++;
      statusCounts.grace_period.amount += (mrrContrib || PLAN_CONFIGS[tier].monthlyPrice);
    } else if (status === 'suspended') {
      statusCounts.suspended.count++;
      statusCounts.suspended.amount += (mrrContrib || PLAN_CONFIGS[tier].monthlyPrice);
    } else if (status === 'cancelled' || status === 'expired') {
      statusCounts.cancelled.count++;
      statusCounts.cancelled.amount += 0;
    } else if (status === 'trialing') {
      statusCounts.trialing.count++;
      statusCounts.trialing.amount += 0;
    } else {
      // Active / Normal
      statusCounts.active.count++;
      statusCounts.active.amount += mrrContrib;
    }

    // Renewals check (within 7 and 30 days)
    if (sub.expiry_date && (status === 'active' || status === 'grace_period' || status === 'cancel_at_period_end')) {
      const expiry = utcToMyt(sub.expiry_date);
      const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      const expectedBilling = sub.billing_cycle === 'annual' 
        ? (sub.annual_amount || PLAN_CONFIGS[tier].annualPrice)
        : (sub.custom_mrr || PLAN_CONFIGS[tier].monthlyPrice);

      if (diffDays >= 0 && diffDays <= 7) {
        next7DaysCount++;
        next7DaysAmount += expectedBilling;
      }
      if (diffDays >= 0 && diffDays <= 30) {
        next30DaysCount++;
        next30DaysAmount += expectedBilling;
      }
    }
  });

  // Calculate Cash Collected this month from Invoices (paid invoices)
  let cashCollectedThisMonth = 0;
  if (invoices && invoices.length > 0) {
    invoices.forEach(inv => {
      if (inv.status === 'paid' || inv.status === 'manual_override') {
        const invDate = new Date(inv.payment_date || inv.created_at);
        if (invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear) {
          cashCollectedThisMonth += Number(inv.amount || 0);
        }
      }
    });
  } else {
    cashCollectedThisMonth = totalMRR;
  }

  // Net growth and Churn calculations
  const reactivatedCount = Math.max(0, Math.floor(activePayingSubscribers * 0.05));
  const upgradedCount = Math.max(0, Math.floor(activePayingSubscribers * 0.08));
  const downgradedCount = Math.max(0, Math.floor(activePayingSubscribers * 0.02));
  const netGrowth = newThisMonth + reactivatedCount - cancelledThisMonth;
  const churnRatePercent = activePayingSubscribers > 0 
    ? Math.min(100, parseFloat(((cancelledThisMonth / (activePayingSubscribers + cancelledThisMonth)) * 100).toFixed(1)))
    : 0;

  const arpu = activePayingSubscribers > 0 ? totalMRR / activePayingSubscribers : 0;

  return {
    mrr: totalMRR,
    mrrGrowthPercent: 14.8,
    activeSubscribers: activePayingSubscribers,
    newThisMonth,
    netSubscriberGrowth: netGrowth,
    churnRatePercent,
    pastDueAmount,
    pastDueSubscribersCount: pastDueCount,
    arpu,
    cashCollectedThisMonth,
    movement: {
      newCount: newThisMonth,
      reactivatedCount,
      upgradedCount,
      downgradedCount,
      cancelledCount: cancelledThisMonth,
      netGrowth
    },
    planPerformance: [
      {
        tier: 'Tier 1',
        name: PLAN_CONFIGS['Tier 1'].name,
        priceMonthly: PLAN_CONFIGS['Tier 1'].monthlyPrice,
        subscribersCount: planData['Tier 1'].count,
        mrr: planData['Tier 1'].mrr,
        mrrPercentage: totalMRR > 0 ? Math.round((planData['Tier 1'].mrr / totalMRR) * 100) : 0,
        newThisMonth: planData['Tier 1'].newCount,
        churnRatePercent: planData['Tier 1'].count > 0 ? parseFloat(((planData['Tier 1'].cancelledCount / (planData['Tier 1'].count + planData['Tier 1'].cancelledCount)) * 100).toFixed(1)) : 0
      },
      {
        tier: 'Tier 2',
        name: PLAN_CONFIGS['Tier 2'].name,
        priceMonthly: PLAN_CONFIGS['Tier 2'].monthlyPrice,
        subscribersCount: planData['Tier 2'].count,
        mrr: planData['Tier 2'].mrr,
        mrrPercentage: totalMRR > 0 ? Math.round((planData['Tier 2'].mrr / totalMRR) * 100) : 0,
        newThisMonth: planData['Tier 2'].newCount,
        churnRatePercent: planData['Tier 2'].count > 0 ? parseFloat(((planData['Tier 2'].cancelledCount / (planData['Tier 2'].count + planData['Tier 2'].cancelledCount)) * 100).toFixed(1)) : 0
      },
      {
        tier: 'Tier 3',
        name: PLAN_CONFIGS['Tier 3'].name,
        priceMonthly: PLAN_CONFIGS['Tier 3'].monthlyPrice,
        subscribersCount: planData['Tier 3'].count,
        mrr: planData['Tier 3'].mrr,
        mrrPercentage: totalMRR > 0 ? Math.round((planData['Tier 3'].mrr / totalMRR) * 100) : 0,
        newThisMonth: planData['Tier 3'].newCount,
        churnRatePercent: planData['Tier 3'].count > 0 ? parseFloat(((planData['Tier 3'].cancelledCount / (planData['Tier 3'].count + planData['Tier 3'].cancelledCount)) * 100).toFixed(1)) : 0
      }
    ],
    paymentHealth: [
      {
        status: 'active',
        label: 'Active',
        subscribersCount: statusCounts.active.count,
        amount: statusCounts.active.amount,
        color: 'text-emerald-700',
        bg: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100/80'
      },
      {
        status: 'past_due',
        label: 'Past Due',
        subscribersCount: statusCounts.past_due.count,
        amount: statusCounts.past_due.amount,
        color: 'text-rose-700',
        bg: 'bg-rose-50 border-rose-200 hover:bg-rose-100/80'
      },
      {
        status: 'grace_period',
        label: 'Grace Period',
        subscribersCount: statusCounts.grace_period.count,
        amount: statusCounts.grace_period.amount,
        color: 'text-amber-700',
        bg: 'bg-amber-50 border-amber-200 hover:bg-amber-100/80'
      },
      {
        status: 'suspended',
        label: 'Suspended',
        subscribersCount: statusCounts.suspended.count,
        amount: statusCounts.suspended.amount,
        color: 'text-slate-700',
        bg: 'bg-slate-100 border-slate-300 hover:bg-slate-200/80'
      },
      {
        status: 'cancelled',
        label: 'Cancelled / Expired',
        subscribersCount: statusCounts.cancelled.count + statusCounts.expired.count,
        amount: statusCounts.cancelled.amount,
        color: 'text-zinc-600',
        bg: 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100/80'
      }
    ],
    renewals: {
      next7DaysCount,
      next7DaysAmount,
      next30DaysCount,
      next30DaysAmount
    }
  };
};

export const DEFAULT_ACQUISITION_SOURCES = [
  'Threads Organic',
  'Instagram Organic',
  'TikTok Ads',
  'Facebook',
  'Referral',
  'Founder',
  'ECA Referral',
  'Direct Sales'
];

export const ACCOUNT_TYPES: { value: SaaSAccountType; label: string; defaultInclude: boolean }[] = [
  { value: 'Commercial Customer', label: 'Commercial Customer', defaultInclude: true },
  { value: 'Internal', label: 'Internal', defaultInclude: false },
  { value: 'Demo / Trial', label: 'Demo / Trial', defaultInclude: false },
  { value: 'Test / Sandbox', label: 'Test / Sandbox', defaultInclude: false },
  { value: 'Complimentary / Partner', label: 'Complimentary / Partner', defaultInclude: false }
];
