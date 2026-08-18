import React, { useState } from 'react';
import { Award, ArrowRight, Check, Edit2 } from 'lucide-react';
import { Company, SaaSCommission } from '../../types';
import { calculateSubscriberMRR, isCommercialSubscriber, isCommissionEligible } from '../../utils/saasUtils';

interface SaasSalesCommissionProps {
  subscribers: Company[];
  commissions: SaaSCommission[];
  isDashboardSummary?: boolean;
  onNavigateToLedger?: () => void;
  onUpdateCommissionStatus?: (commissionId: string, newStatus: SaaSCommission['status']) => void;
  onUpdateCommissionAmount?: (commissionId: string, newAmount: number) => void;
}

export const SaasSalesCommission: React.FC<SaasSalesCommissionProps> = ({
  subscribers,
  commissions,
  isDashboardSummary = false,
  onNavigateToLedger,
  onUpdateCommissionStatus,
  onUpdateCommissionAmount
}) => {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'ledger'>('leaderboard');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingCommissionId, setEditingCommissionId] = useState<string | null>(null);
  const [editAmountValue, setEditAmountValue] = useState<number>(0);

  // Derive salesperson summary
  const salesMap = new Map<string, {
    name: string;
    isDirect: boolean;
    leads: number;
    closed: number;
    newMrr: number;
    commissionPayable: number;
  }>();

  subscribers.forEach(sub => {
    const isCommercial = isCommercialSubscriber(sub);
    const primaryRep = sub.primary_salesperson_name || sub.salesperson_name || 'Founder Direct';
    const isDirect = primaryRep.toLowerCase().includes('founder') || primaryRep.toLowerCase().includes('direct') || primaryRep.toLowerCase().includes('michael');
    const eligible = isCommissionEligible(sub);

    const existing = salesMap.get(primaryRep) || {
      name: primaryRep,
      isDirect,
      leads: 0,
      closed: 0,
      newMrr: 0,
      commissionPayable: 0
    };

    existing.leads += 1;

    if (isCommercial && sub.is_active && sub.status === 'ACTIVE' && !sub.is_trial) {
      const mrr = calculateSubscriberMRR(sub);
      existing.closed += 1;
      existing.newMrr += mrr;

      if (eligible) {
        const firstMonth = sub.billing_cycle === 'annual' ? (sub.annual_amount ? sub.annual_amount / 12 : mrr) : mrr;
        
        if (sub.supporting_salesperson_name && sub.commission_split) {
          const [pStr] = sub.commission_split.split('/');
          const primaryRatio = Number(pStr) / 100 || 0.5;
          existing.commissionPayable += (firstMonth * primaryRatio);

          const supportingRep = sub.supporting_salesperson_name;
          const supportingExisting = salesMap.get(supportingRep) || {
            name: supportingRep,
            isDirect: false,
            leads: 0,
            closed: 0,
            newMrr: 0,
            commissionPayable: 0
          };
          supportingExisting.commissionPayable += (firstMonth * (1 - primaryRatio));
          salesMap.set(supportingRep, supportingExisting);
        } else {
          existing.commissionPayable += firstMonth;
        }
      }
    }

    salesMap.set(primaryRep, existing);
  });

  const repsList = Array.from(salesMap.values()).sort((a, b) => b.newMrr - a.newMrr || b.closed - a.closed);
  const totalCommissionDue = repsList.reduce((sum, r) => sum + r.commissionPayable, 0);

  // 1. DASHBOARD COMPACT VIEW (Simplified 4 columns)
  if (isDashboardSummary) {
    return (
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Award className="w-4 h-4 text-slate-900" />
                <span>Sales & Commission</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Attributed subscriber revenue and 1st-month commission payable</p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block font-medium">Total Commission Due</span>
              <span className={`text-xs font-black ${totalCommissionDue > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                RM {totalCommissionDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-y border-slate-100 text-[10px]">
                  <th className="py-2 px-3">Salesperson</th>
                  <th className="py-2 px-3 text-center">Customers</th>
                  <th className="py-2 px-3 text-right">New MRR</th>
                  <th className="py-2 px-3 text-right">Commission Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {repsList.map((rep) => (
                  <tr key={rep.name} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900">{rep.name}</span>
                        {rep.isDirect && (
                          <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.2 rounded">
                            Direct
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                      {rep.closed}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      RM {rep.newMrr.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black">
                      {rep.commissionPayable > 0 ? (
                        <span className="text-emerald-700">RM {rep.commissionPayable.toLocaleString()}</span>
                      ) : (
                        <span className="text-slate-400">RM 0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {onNavigateToLedger && (
          <div className="pt-2 mt-2 border-t border-slate-100 flex justify-end">
            <button
              onClick={onNavigateToLedger}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 py-1"
            >
              <span>View Full Commission Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // 2. DEDICATED FULL COMMISSION LEDGER VIEW (Tab in SuperAdmin)
  const filteredCommissions = commissions.filter(c => {
    if (statusFilter === 'all') return true;
    return c.status === statusFilter;
  });

  const getStatusBadge = (status: SaaSCommission['status']) => {
    switch (status) {
      case 'paid':
        return <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">Paid</span>;
      case 'approved':
        return <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200 text-[10px]">Approved</span>;
      case 'eligible':
        return <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200 text-[10px]">Eligible</span>;
      case 'pending':
        return <span className="bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200 text-[10px]">Pending (Trial)</span>;
      default:
        return <span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full border border-slate-200 text-[10px]">Exempt / Cancelled</span>;
    }
  };

  const handleSaveAmountOverride = (commissionId: string) => {
    if (onUpdateCommissionAmount) {
      onUpdateCommissionAmount(commissionId, Number(editAmountValue));
    }
    setEditingCommissionId(null);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            <span>Commission Ledger & Attribution</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage 100% 1st-month subscription commissions and approvals</p>
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'leaderboard' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Sales Breakdown
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'ledger' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Commission Records ({commissions.length})
          </button>
        </div>
      </div>

      {activeTab === 'leaderboard' ? (
        <div className="space-y-4">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">Commission Policy:</span>
              <span className="text-slate-600">Sales reps & interns receive 100% of 1st Month Subscription revenue upon payment. Founder/Direct is exempt (RM0 liability).</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-y border-slate-100 text-[11px]">
                  <th className="py-2.5 px-3">Salesperson</th>
                  <th className="py-2.5 px-3 text-center">Leads</th>
                  <th className="py-2.5 px-3 text-center">Paid Customers</th>
                  <th className="py-2.5 px-3 text-center">Conversion</th>
                  <th className="py-2.5 px-3 text-right">Attributed MRR</th>
                  <th className="py-2.5 px-3 text-right">Commission Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {repsList.map((rep) => {
                  const convRate = rep.leads > 0 ? ((rep.closed / rep.leads) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={rep.name} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{rep.name}</span>
                          {rep.isDirect && (
                            <span className="text-[10px] bg-zinc-100 text-zinc-600 font-bold px-1.5 py-0.5 rounded">
                              Direct / Exempt
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600">{rep.leads}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-900">{rep.closed}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700">{convRate}%</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        RM {rep.newMrr.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black">
                        {rep.commissionPayable > 0 ? (
                          <span className="text-emerald-700">RM {rep.commissionPayable.toLocaleString()}</span>
                        ) : (
                          <span className="text-slate-400">RM 0.00</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {['all', 'pending', 'eligible', 'approved', 'paid', 'cancelled'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                  statusFilter === st 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-y border-slate-100 text-[11px]">
                  <th className="py-2.5 px-3">Salesperson</th>
                  <th className="py-2.5 px-3">Subscriber</th>
                  <th className="py-2.5 px-3">Plan</th>
                  <th className="py-2.5 px-3 text-right">1st Month Rev</th>
                  <th className="py-2.5 px-3 text-right">Commission</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">SuperAdmin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredCommissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No commission records found.
                    </td>
                  </tr>
                ) : (
                  filteredCommissions.map((comm) => {
                    const isEditingThis = editingCommissionId === comm.id;
                    return (
                      <tr key={comm.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{comm.salesperson_name}</td>
                        <td className="py-2.5 px-3 text-slate-800 font-semibold">{comm.subscriber_name}</td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {comm.plan_name} ({comm.plan_tier})
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                          RM {comm.first_month_revenue.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900">
                          {isEditingThis ? (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                value={editAmountValue}
                                onChange={(e) => setEditAmountValue(Number(e.target.value))}
                                className="w-20 p-1 text-xs border rounded font-bold"
                              />
                              <button
                                onClick={() => handleSaveAmountOverride(comm.id)}
                                className="p-1 bg-emerald-600 text-white rounded"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <span>RM {comm.commission_amount.toFixed(2)}</span>
                              <button
                                onClick={() => {
                                  setEditingCommissionId(comm.id);
                                  setEditAmountValue(comm.commission_amount);
                                }}
                                className="text-slate-400 hover:text-slate-700 p-0.5"
                                title="Override Commission Amount"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {getStatusBadge(comm.status)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {comm.status === 'eligible' && (
                              <button
                                onClick={() => onUpdateCommissionStatus?.(comm.id, 'approved')}
                                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-bold text-[11px]"
                              >
                                Approve
                              </button>
                            )}
                            {comm.status === 'approved' && (
                              <button
                                onClick={() => onUpdateCommissionStatus?.(comm.id, 'paid')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold text-[11px]"
                              >
                                Mark Paid
                              </button>
                            )}
                            {comm.status === 'pending' && (
                              <button
                                onClick={() => onUpdateCommissionStatus?.(comm.id, 'eligible')}
                                className="px-2 py-1 text-slate-500 hover:text-slate-800 text-[10px] underline"
                              >
                                Approve Eligible
                              </button>
                            )}
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
      )}
    </div>
  );
};
