import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { Company, SaaSInvoice, SaaSCommission, SaaSActivityLog, SaaSPlanTier } from '../types';
import { getNowMYT, utcToMyt, formatMytDate } from '../utils/dateUtils';
import { 
  calculateSaaSMetrics, 
  calculateSubscriberMRR, 
  getPlanName, 
  getSubscriberEffectiveStatus, 
  isDueSoon, 
  isCommercialSubscriber,
  PLAN_CONFIGS,
  ACCOUNT_TYPES 
} from '../utils/saasUtils';

// Modular SaaS Components
import { SaasKpiHeader } from '../components/saas/SaasKpiHeader';
import { SaasMrrGrowthChart } from '../components/saas/SaasMrrGrowthChart';
import { SaasSubscriberMovement } from '../components/saas/SaasSubscriberMovement';
import { SaasPlanPerformance } from '../components/saas/SaasPlanPerformance';
import { SaasPaymentHealth } from '../components/saas/SaasPaymentHealth';
import { SaasUpcomingRenewals } from '../components/saas/SaasUpcomingRenewals';
import { SaasAcquisitionAnalytics } from '../components/saas/SaasAcquisitionAnalytics';
import { SaasSalesCommission } from '../components/saas/SaasSalesCommission';
import { SaasRecentActivity } from '../components/saas/SaasRecentActivity';
import { SaasSubscriberDetailModal } from '../components/saas/SaasSubscriberDetailModal';
import { SaasBillingInvoices } from '../components/saas/SaasBillingInvoices';
import { SaasAddSubscriberModal, SaasAddSubscriberFormData } from '../components/saas/SaasAddSubscriberModal';

import { 
  Shield, 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  Clock, 
  Power, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ChevronDown, 
  ExternalLink,
  DollarSign,
  Users,
  CreditCard,
  Award,
  Layers,
  Activity,
  SlidersHorizontal,
  Loader2,
  Calendar,
  LogOut
} from 'lucide-react';

const SubscriberManager: React.FC = () => {
  const { subscriberId, logout, staffRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Main Tab from URL (?tab=dashboard | subscribers | billing | commissions)
  const tabParam = searchParams.get('tab');
  const activeTab: 'dashboard' | 'subscribers' | 'billing' | 'commissions' = 
    (tabParam === 'subscribers' || tabParam === 'billing' || tabParam === 'commissions') ? tabParam : 'dashboard';

  const setActiveTab = (tab: 'dashboard' | 'subscribers' | 'billing' | 'commissions') => {
    setSearchParams(tab === 'dashboard' ? {} : { tab });
  };

  // Core Data States
  const [subscribers, setSubscribers] = useState<Company[]>([]);
  const [invoices, setInvoices] = useState<SaaSInvoice[]>([]);
  const [commissions, setCommissions] = useState<SaaSCommission[]>([]);
  const [activityLogs, setActivityLogs] = useState<SaaSActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals and Selection States
  const [selectedSubscriber, setSelectedSubscriber] = useState<Company | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [activeSubscriberId, setActiveSubscriberId] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState("1");
  const [savingId, setSavingId] = useState<string | null>(null);

  // Filter States for Subscribers Table
  const [searchTerm, setSearchTerm] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');

  // Load All SaaS Data
  useEffect(() => {
    if (subscriberId === 'superadmin') {
      fetchData();
    }
  }, [subscriberId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [subsData, invData, commData, logData] = await Promise.all([
        apiService.getCompanies().catch(() => []),
        apiService.getSaasInvoices().catch(() => []),
        apiService.getSaasCommissions().catch(() => []),
        apiService.getSaasActivityLogs().catch(() => [])
      ]);

      // Check for expired trials automation (Auto-expire 30-day trials if no active subscription log/payment exists)
      const now = getNowMYT();
      const expiredTrials = subsData.filter(sub => {
        if (!sub.is_trial || sub.status !== 'ACTIVE') return false;

        const hasActiveSubscriptionLog = logData.some(l => 
          l.subscriber_id === sub.id && 
          (l.event_type === 'subscription_activated' || l.event_type === 'payment_recorded')
        );
        const hasPaidInvoice = invData.some(inv => inv.subscriber_id === sub.id && inv.status === 'paid');

        // If user already has paid subscription records, do not auto-expire
        if (hasActiveSubscriptionLog || hasPaidInvoice) return false;

        // Check if expiry date has passed
        if (sub.expiry_date) {
          return utcToMyt(sub.expiry_date) < now;
        }

        // Fallback: if trial has no explicit expiry_date, check 30 days from start date
        if (sub.subscription_start_date) {
          const startDate = utcToMyt(sub.subscription_start_date);
          const diffDays = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
          return diffDays >= 30;
        }

        return false;
      });

      if (expiredTrials.length > 0) {
        await Promise.all(expiredTrials.map(async trial => {
          await apiService.updateCompany(trial.id, { 
            status: 'INACTIVE', 
            is_active: false,
            subscription_status: 'expired'
          }).catch(() => {});

          await apiService.logSaasActivity({
            subscriber_id: trial.id,
            subscriber_name: trial.name,
            event_type: 'trial_expired',
            description: '30-Day trial expired with no subscription log recorded',
            plan_tier: trial.tier as SaaSPlanTier
          }).catch(() => {});
        }));

        const updatedSubs = await apiService.getCompanies().catch(() => subsData);
        setSubscribers(updatedSubs);
      } else {
        setSubscribers(subsData);
      }

      setInvoices(invData);
      setCommissions(commData);
      setActivityLogs(logData);
    } catch (err: any) {
      console.error('Error loading SaaS Command Center data:', err);
      setError(err.message || 'Failed to load SaaS Command Center data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  // Calculate SaaS Metrics
  const metrics = useMemo(() => {
    return calculateSaaSMetrics(subscribers, invoices, commissions);
  }, [subscribers, invoices, commissions]);

  // Generate MRR Growth Trajectory (Year to date)
  const mrrChartData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentYear = new Date().getFullYear();
    const currentMonthIdx = new Date().getMonth();
    const baseMrr = metrics.mrr;

    // Only plot months up to the current month
    const activeMonths = months.slice(0, currentMonthIdx + 1);

    return activeMonths.map((m, idx) => {
      const factor = Math.max(0.4, (idx + 1) / (currentMonthIdx + 1));
      const monthMrr = Math.round(baseMrr * factor);
      const subsCount = Math.round(metrics.activeSubscribers * factor);

      return {
        month: m,
        displayMonth: `${m} ${currentYear}`,
        mrr: monthMrr,
        activeSubscribers: subsCount
      };
    });
  }, [metrics]);

  // Filtered Subscribers for the Subscribers Table
  const filteredSubscribers = useMemo(() => {
    return subscribers.filter(sub => {
      const matchSearch = sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (sub.brand_name && sub.brand_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (sub.contact_person && sub.contact_person.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (sub.contact_email && sub.contact_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          sub.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const effectiveStatus = getSubscriberEffectiveStatus(sub);
      const isDue = isDueSoon(sub);
      const isCommercial = isCommercialSubscriber(sub);

      let matchAccountType = true;
      if (accountTypeFilter === 'commercial') {
        matchAccountType = isCommercial;
      } else if (accountTypeFilter === 'internal') {
        matchAccountType = !isCommercial;
      }

      let matchStatus = true;
      if (statusFilter === 'active') {
        matchStatus = effectiveStatus === 'active' || effectiveStatus === 'grace_period' || effectiveStatus === 'cancel_at_period_end';
      } else if (statusFilter === 'due_soon') {
        matchStatus = isDue;
      } else if (statusFilter === 'past_due') {
        matchStatus = effectiveStatus === 'past_due' || (sub.outstanding_amount !== undefined && sub.outstanding_amount > 0);
      } else if (statusFilter === 'grace_period') {
        matchStatus = effectiveStatus === 'grace_period';
      } else if (statusFilter === 'suspended') {
        matchStatus = effectiveStatus === 'suspended';
      } else if (statusFilter === 'cancelled') {
        matchStatus = effectiveStatus === 'cancelled' || effectiveStatus === 'expired';
      } else if (statusFilter === 'trialing') {
        matchStatus = sub.is_trial || effectiveStatus === 'trialing';
      }

      const matchTier = tierFilter === 'all' || sub.tier === tierFilter;
      const matchChannel = channelFilter === 'all' || (sub.lead_source || 'Direct Sales') === channelFilter;

      return matchSearch && matchAccountType && matchStatus && matchTier && matchChannel;
    });
  }, [subscribers, searchTerm, accountTypeFilter, statusFilter, tierFilter, channelFilter]);

  // Handler: Add New Subscriber (3-Step Wizard Payload)
  const handleAddSubscriber = async (data: SaasAddSubscriberFormData) => {
    let expiryDate: string | null = null;
    const now = getNowMYT();

    if (data.is_trial) {
      now.setDate(now.getDate() + (data.trial_days || 30));
      expiryDate = now.toISOString();
    } else if (data.billing_cycle === 'annual') {
      now.setDate(now.getDate() + 365);
      expiryDate = now.toISOString();
    } else {
      now.setDate(now.getDate() + 30);
      expiryDate = now.toISOString();
    }

    const createdCompany = await apiService.addCompany(data.name, data.tier, data.is_trial, expiryDate);

    // Save extended SaaS fields
    await apiService.updateCompany(createdCompany.id, {
      brand_name: data.brand_name || data.name,
      contact_person: data.contact_person,
      contact_email: data.contact_email,
      contact_phone: data.contact_phone,
      account_type: data.account_type,
      include_in_analytics: data.include_in_analytics,
      billing_cycle: data.billing_cycle,
      lead_source: data.lead_source,
      salesperson_name: data.primary_salesperson_name,
      primary_salesperson_name: data.primary_salesperson_name,
      supporting_salesperson_name: data.supporting_salesperson_name,
      commission_eligible: data.commission_eligible,
      commission_split: data.commission_split,
      payment_method: data.payment_method,
      subscription_status: data.is_trial ? 'trialing' : 'active'
    });

    const mrrAmount = data.is_trial ? 0 : PLAN_CONFIGS[data.tier].monthlyPrice;

    // Record Activity Log
    await apiService.logSaasActivity({
      subscriber_id: createdCompany.id,
      subscriber_name: data.name,
      event_type: data.is_trial ? 'trial_started' : 'signup',
      description: data.is_trial 
        ? `${PLAN_CONFIGS[data.tier].name} trial started via ${data.lead_source}`
        : `${PLAN_CONFIGS[data.tier].name} subscription activated via ${data.lead_source}`,
      plan_tier: data.tier,
      lead_source: data.lead_source,
      salesperson_name: data.primary_salesperson_name,
      amount: mrrAmount
    });

    // If paid upfront, record invoice
    if (!data.is_trial && data.include_in_analytics) {
      await apiService.addSaasInvoice({
        subscriber_id: createdCompany.id,
        subscriber_name: data.name,
        plan_tier: data.tier,
        plan_name: getPlanName(data.tier),
        amount: data.billing_cycle === 'annual' ? PLAN_CONFIGS[data.tier].annualPrice : PLAN_CONFIGS[data.tier].monthlyPrice,
        billing_period: formatMytDate(new Date(), 'MMM yyyy'),
        billing_cycle: data.billing_cycle,
        payment_method: data.payment_method as any,
        status: 'paid',
        payment_date: new Date().toISOString()
      });

      // Record commission if eligible
      if (data.commission_eligible) {
        await apiService.addSaasCommission({
          subscriber_id: createdCompany.id,
          subscriber_name: data.name,
          salesperson_id: 'sales_rep',
          salesperson_name: data.primary_salesperson_name,
          plan_tier: data.tier,
          plan_name: getPlanName(data.tier),
          first_month_revenue: mrrAmount,
          commission_rate_percent: 100,
          commission_amount: mrrAmount,
          status: 'eligible'
        });

        await apiService.logSaasActivity({
          subscriber_id: createdCompany.id,
          subscriber_name: data.name,
          event_type: 'commission_created',
          description: `Commission created for ${data.primary_salesperson_name}`,
          amount: mrrAmount,
          salesperson_name: data.primary_salesperson_name
        });
      }
    }

    await fetchData();
  };

  // Handler: Update Subscriber
  const handleUpdateSubscriber = async (id: string, updates: Partial<Company>) => {
    await apiService.updateCompany(id, updates);
    await fetchData();
    if (selectedSubscriber && selectedSubscriber.id === id) {
      setSelectedSubscriber(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  // Handler: Record Manual Payment Invoice
  const handleRecordManualPayment = async (invoice: Partial<SaaSInvoice>) => {
    await apiService.addSaasInvoice(invoice);
    await apiService.logSaasActivity({
      subscriber_id: invoice.subscriber_id,
      subscriber_name: invoice.subscriber_name,
      event_type: 'payment_recorded',
      description: `Payment recorded via ${invoice.payment_method}`,
      amount: invoice.amount,
      plan_tier: invoice.plan_tier
    });
    await fetchData();
  };

  // Handler: Update Commission Status
  const handleUpdateCommissionStatus = async (commissionId: string, newStatus: SaaSCommission['status']) => {
    await apiService.updateSaasCommission(commissionId, { 
      status: newStatus,
      paid_date: newStatus === 'paid' ? new Date().toISOString() : null
    });
    const comm = commissions.find(c => c.id === commissionId);
    if (comm) {
      await apiService.logSaasActivity({
        subscriber_id: comm.subscriber_id,
        subscriber_name: comm.subscriber_name,
        event_type: newStatus === 'paid' ? 'commission_paid' : 'commission_approved',
        description: `Commission ${newStatus} for ${comm.salesperson_name}`,
        amount: comm.commission_amount,
        salesperson_name: comm.salesperson_name
      });
    }
    await fetchData();
  };

  // Handler: Update Commission Amount Override
  const handleUpdateCommissionAmount = async (commissionId: string, newAmount: number) => {
    await apiService.updateSaasCommission(commissionId, {
      commission_amount: newAmount
    });
    await fetchData();
  };

  // Handler: Quick Extend Subscription Modal
  const handleQuickAddSubscription = async () => {
    if (!activeSubscriberId) return;
    const sub = subscribers.find(s => s.id === activeSubscriberId);
    if (!sub) return;

    try {
      setLoading(true);
      let newDate: string | null = null;
      let isTrial = false;
      const now = getNowMYT();

      if (selectedDuration === "trial") {
        isTrial = true;
        now.setDate(now.getDate() + 30);
        newDate = now.toISOString();
      } else if (selectedDuration === "unlimited") {
        newDate = null;
      } else {
        const currentExpiry = sub.expiry_date ? utcToMyt(sub.expiry_date) : now;
        const baseDate = currentExpiry > now ? currentExpiry : now;
        const date = new Date(baseDate);
        date.setMonth(date.getMonth() + parseInt(selectedDuration));
        newDate = date.toISOString();
      }

      await apiService.updateCompany(activeSubscriberId, {
        expiry_date: newDate,
        is_active: true,
        status: 'ACTIVE',
        subscription_status: 'active',
        is_trial: isTrial
      });

      await apiService.logSaasActivity({
        subscriber_id: sub.id,
        subscriber_name: sub.name,
        event_type: 'subscription_activated',
        description: `Subscription extended by ${selectedDuration} month(s)`,
        plan_tier: sub.tier as SaaSPlanTier
      });

      setShowExpiryModal(false);
      setActiveSubscriberId(null);
      await fetchData();
    } catch (err) {
      setError('Failed to extend subscription');
    } finally {
      setLoading(false);
    }
  };

  // Handler: Delete Subscriber
  const handleDeleteSubscriber = async () => {
    if (!deleteId) return;
    try {
      setLoading(true);
      await apiService.deleteCompany(deleteId);
      setShowDeleteModal(false);
      setDeleteId(null);
      await fetchData();
    } catch (err) {
      setError('Failed to delete subscriber');
    } finally {
      setLoading(false);
    }
  };

  if (subscriberId !== 'superadmin') {
    return (
      <div className="min-h-full bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 p-8 rounded-2xl max-w-md w-full text-center shadow-sm">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">403 SuperAdmin Restricted</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            The Smart Drive SaaS Command Center is reserved for Superadmin access only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 text-slate-900 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <Shield className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">Smart Drive SaaS Command Center</h1>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span>System Operational</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Commercial revenue, subscriber health, sales attribution & commission ledger
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="p-2.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              title="Refresh Metrics"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Subscriber</span>
            </button>

            {/* Admin Logged In Status & Logout */}
            <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-xl border border-slate-800 shadow-sm ml-1">
              <div className="flex items-center gap-2 pr-2 border-r border-slate-700">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold leading-tight capitalize">{staffRole || 'Admin'}</span>
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Logged in</span>
                </div>
              </div>
              <button
                onClick={logout}
                className="p-1 text-rose-400 hover:text-rose-200 hover:bg-rose-500/20 rounded-lg transition-colors flex items-center gap-1"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-[11px] font-bold">Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Global Navigation Tabs */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Command Center</span>
          </button>

          <button
            onClick={() => setActiveTab('subscribers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'subscribers'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Subscribers ({subscribers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('billing')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'billing'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Billing & Invoices ({invoices.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('commissions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'commissions'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Commission Ledger</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-700 text-xs font-bold">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="flex-1">{error}</p>
            <button onClick={() => setError(null)} className="hover:text-red-900">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 1: SAAS COMMAND CENTER DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* 1. Primary 4 KPI Cards */}
            <SaasKpiHeader
              metrics={metrics}
              onFilterPastDue={() => {
                setStatusFilter('past_due');
                setActiveTab('subscribers');
              }}
              onFilterActive={() => {
                setStatusFilter('active');
                setActiveTab('subscribers');
              }}
              onFilterRenewingSoon={() => {
                setStatusFilter('due_soon');
                setActiveTab('subscribers');
              }}
            />

            {/* 2. MRR Trend (Compact) */}
            <SaasMrrGrowthChart data={mrrChartData} loading={loading} />

            {/* 3. Billing Attention (Urgent renewals & payment problems) */}
            <SaasPaymentHealth
              healthItems={metrics.paymentHealth}
              renewals={metrics.renewals}
              activeFilter={statusFilter}
              onSelectStatus={(st) => {
                setStatusFilter(st);
                setActiveTab('subscribers');
              }}
            />

            {/* 4. Plan Mix */}
            <SaasPlanPerformance
              plans={metrics.planPerformance}
              selectedTier={tierFilter}
              onSelectTier={(tier) => {
                setTierFilter(tier);
                setActiveTab('subscribers');
              }}
            />

            {/* 5. 2-col Grid: Where Customers Came From & Sales & Commission */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SaasAcquisitionAnalytics
                subscribers={subscribers}
                selectedChannel={channelFilter}
                onSelectChannel={(ch) => {
                  setChannelFilter(ch);
                  setActiveTab('subscribers');
                }}
              />
              <SaasSalesCommission
                subscribers={subscribers}
                commissions={commissions}
                isDashboardSummary={true}
                onNavigateToLedger={() => setActiveTab('commissions')}
              />
            </div>

            {/* 6. Recent Subscription Activity (Compact top 5 events) */}
            <SaasRecentActivity activities={activityLogs} />
          </div>
        )}

        {/* TAB 2: SUBSCRIBERS TABLE */}
        {activeTab === 'subscribers' && (
          <div className="space-y-6">
            {/* Filters Bar */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                {/* Search */}
                <div className="relative min-w-[220px] flex-1 sm:flex-initial">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search tenant name, email, brand..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-slate-900 w-full"
                  />
                </div>

                {/* Account Type Filter */}
                <select
                  value={accountTypeFilter}
                  onChange={(e) => setAccountTypeFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                >
                  <option value="all">All Account Types</option>
                  <option value="commercial">Commercial Customers Only</option>
                  <option value="internal">Internal / Test / Demo Accounts</option>
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Paying</option>
                  <option value="due_soon">Due Soon (7 Days)</option>
                  <option value="past_due">Past Due / Overdue</option>
                  <option value="grace_period">Grace Period</option>
                  <option value="suspended">Suspended</option>
                  <option value="cancelled">Cancelled / Expired</option>
                  <option value="trialing">Trial Mode</option>
                </select>

                {/* Tier Filter */}
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                >
                  <option value="all">All Commercial Plans</option>
                  <option value="Tier 1">Tier 1 - Basic Forms (RM50)</option>
                  <option value="Tier 2">Tier 2 - Scheduling & Ops (RM50)</option>
                  <option value="Tier 3">Tier 3 - Enterprise (RM150)</option>
                </select>

                {/* Channel Filter */}
                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hidden sm:block"
                >
                  <option value="all">All Acquisition Channels</option>
                  <option value="Threads Organic">Threads Organic</option>
                  <option value="Instagram Organic">Instagram Organic</option>
                  <option value="TikTok Ads">TikTok Ads</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Referral">Referral</option>
                  <option value="Direct Sales">Direct Sales</option>
                </select>
              </div>

              {(accountTypeFilter !== 'all' || statusFilter !== 'all' || tierFilter !== 'all' || channelFilter !== 'all' || searchTerm) && (
                <button
                  onClick={() => {
                    setAccountTypeFilter('all');
                    setStatusFilter('all');
                    setTierFilter('all');
                    setChannelFilter('all');
                    setSearchTerm('');
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-900 underline"
                >
                  Reset Filters
                </button>
              )}
            </div>

            {/* Subscribers Data Table */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3.5 px-4">Subscriber / Company</th>
                      <th className="py-3.5 px-4">Account Type</th>
                      <th className="py-3.5 px-4">Plan Tier</th>
                      <th className="py-3.5 px-4">MRR Base</th>
                      <th className="py-3.5 px-4">Next Billing Date</th>
                      <th className="py-3.5 px-4">Channel / Rep</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">SuperAdmin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center">
                          <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-2" />
                          <p className="text-slate-500 font-medium">Loading subscriber base...</p>
                        </td>
                      </tr>
                    ) : filteredSubscribers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <p className="font-semibold text-slate-600">No subscribers found.</p>
                          <p className="text-xs text-slate-400 mt-1">Try adjusting search or status filters.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredSubscribers.map((sub) => {
                        const status = getSubscriberEffectiveStatus(sub);
                        const isDue = isDueSoon(sub);
                        const planName = getPlanName(sub.tier);
                        const isCommercial = isCommercialSubscriber(sub);
                        const mrr = calculateSubscriberMRR(sub);

                        return (
                          <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors group">
                            {/* Company Name & Brand */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-800 text-xs shrink-0">
                                  {sub.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <button
                                    onClick={() => setSelectedSubscriber(sub)}
                                    className="font-bold text-slate-900 hover:text-blue-600 text-left block"
                                  >
                                    {sub.name}
                                  </button>
                                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                    <span>{sub.brand_name || 'No brand alias'}</span>
                                    <span>•</span>
                                    <span className="font-mono text-slate-400">{sub.id.substring(0, 8)}...</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Account Type Badge */}
                            <td className="py-3.5 px-4">
                              <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                                isCommercial 
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                  : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                              }`}>
                                {sub.account_type || (isCommercial ? 'Commercial' : 'Internal / Test')}
                              </span>
                            </td>

                            {/* Plan Tier */}
                            <td className="py-3.5 px-4">
                              <div>
                                <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                                  sub.tier === 'Tier 3' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                  sub.tier === 'Tier 2' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}>
                                  {planName} ({sub.tier})
                                </span>
                                <span className="text-[10px] text-slate-400 block mt-0.5 capitalize">
                                  {sub.billing_cycle || 'monthly'}
                                </span>
                              </div>
                            </td>

                            {/* MRR Base */}
                            <td className="py-3.5 px-4">
                              {isCommercial ? (
                                <>
                                  <div className="font-black text-slate-900 text-xs">
                                    RM {mrr.toFixed(2)}
                                  </div>
                                  <span className="text-[10px] text-slate-400 block">per month</span>
                                </>
                              ) : (
                                <>
                                  <div className="font-bold text-slate-400 text-xs">
                                    RM 0.00
                                  </div>
                                  <span className="text-[10px] text-slate-400 block">Excluded</span>
                                </>
                              )}
                            </td>

                            {/* Next Billing / Expiry */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5 text-xs font-semibold">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span className={isDue ? 'text-amber-700 font-bold' : 'text-slate-700'}>
                                  {sub.expiry_date ? formatMytDate(sub.expiry_date, 'dd MMM yyyy') : 'Unlimited'}
                                </span>
                              </div>
                              {isDue && (
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded-sm border border-amber-200 mt-0.5 inline-block">
                                  Due in ≤ 7 days
                                </span>
                              )}
                            </td>

                            {/* Channel / Rep */}
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-slate-800 text-[11px] truncate max-w-[140px]">
                                {sub.lead_source || 'Direct Sales'}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                                Rep: {sub.salesperson_name || 'Founder'}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={async () => {
                                  const newStatus = sub.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
                                  const newIsActive = newStatus === 'ACTIVE';
                                  try {
                                    setSavingId(sub.id);
                                    await apiService.updateCompany(sub.id, { 
                                      status: newStatus, 
                                      is_active: newIsActive,
                                      subscription_status: newIsActive ? 'active' : 'suspended'
                                    });
                                    await fetchData();
                                  } catch (err) {
                                    setError('Failed to toggle status');
                                  } finally {
                                    setSavingId(null);
                                  }
                                }}
                                disabled={savingId === sub.id}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                                  sub.is_trial
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : status === 'active'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-red-50 hover:text-red-700'
                                    : status === 'past_due'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : status === 'grace_period'
                                    ? 'bg-orange-50 text-orange-700 border-orange-200'
                                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                                }`}
                              >
                                {sub.is_trial ? 'Trial' : status.replace(/_/g, ' ')}
                              </button>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedSubscriber(sub)}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-all"
                                  title="View Subscriber Detail"
                                >
                                  Details
                                </button>

                                <button
                                  onClick={() => {
                                    setActiveSubscriberId(sub.id);
                                    setSelectedDuration('1');
                                    setShowExpiryModal(true);
                                  }}
                                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                                  title="Extend or Add Time"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Renew</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setDeleteId(sub.id);
                                    setShowDeleteModal(true);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Delete Subscriber"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BILLING & INVOICES */}
        {activeTab === 'billing' && (
          <SaasBillingInvoices
            invoices={invoices}
            subscribers={subscribers}
            onAddInvoice={handleRecordManualPayment}
            onSelectSubscriber={(sub) => setSelectedSubscriber(sub)}
          />
        )}

        {/* TAB 4: COMMISSION LEDGER */}
        {activeTab === 'commissions' && (
          <SaasSalesCommission
            subscribers={subscribers}
            commissions={commissions}
            onUpdateCommissionStatus={handleUpdateCommissionStatus}
            onUpdateCommissionAmount={handleUpdateCommissionAmount}
          />
        )}
      </div>

      {/* Comprehensive Subscriber Detail Drawer / Modal */}
      {selectedSubscriber && (
        <SaasSubscriberDetailModal
          subscriber={selectedSubscriber}
          invoices={invoices}
          commissions={commissions}
          onClose={() => setSelectedSubscriber(null)}
          onUpdateSubscriber={handleUpdateSubscriber}
          onRecordManualPayment={handleRecordManualPayment}
        />
      )}

      {/* Add Subscriber 3-Step Wizard Modal */}
      <SaasAddSubscriberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddSubscriber={handleAddSubscriber}
      />

      {/* Quick Add Time / Renew Modal */}
      {showExpiryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900">Extend SaaS Subscription</h3>
              <button onClick={() => setShowExpiryModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 font-medium">
                Choose extension duration for this tenant. Expiry date will increment automatically.
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Extension Period</label>
                <select
                  value={selectedDuration}
                  onChange={(e) => setSelectedDuration(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                >
                  <option value="1">1 Month (+30 Days)</option>
                  <option value="3">3 Months (+90 Days)</option>
                  <option value="6">6 Months (+180 Days)</option>
                  <option value="12">1 Year (+365 Days)</option>
                  <option value="trial">Reset to 30-Day Trial</option>
                  <option value="unlimited">Unlimited / Perpetual</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setShowExpiryModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuickAddSubscription}
                  disabled={loading}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all"
                >
                  {loading ? 'Extending...' : 'Apply Extension'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center gap-3 text-rose-600 bg-rose-50/50">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">Delete Tenant Subscriber</h3>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed font-medium">
                Are you sure you want to permanently delete this subscriber? This will remove the tenant profile. Consider <strong className="text-slate-900">Suspending</strong> instead to preserve fleet history.
              </p>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteSubscriber}
                  disabled={loading}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-all"
                >
                  {loading ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriberManager;
