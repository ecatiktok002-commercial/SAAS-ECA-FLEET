import React from 'react';
import { UserPlus, UserCheck, ArrowUpCircle, ArrowDownCircle, UserMinus, Activity } from 'lucide-react';
import { SaaSMetricsSummary } from '../../utils/saasUtils';

interface SaasSubscriberMovementProps {
  movement: SaaSMetricsSummary['movement'];
}

export const SaasSubscriberMovement: React.FC<SaasSubscriberMovementProps> = ({ 
  movement = { newCount: 0, reactivatedCount: 0, upgradedCount: 0, downgradedCount: 0, cancelledCount: 0, netGrowth: 0 } 
}) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-600" />
            <span>Subscriber Movement</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Subscriber inflow, upgrades & churn this month</p>
        </div>
        <span className={`text-xs font-black px-2.5 py-1 rounded-full ${movement.netGrowth >= 0 ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
          Net {movement.netGrowth >= 0 ? `+${movement.netGrowth}` : movement.netGrowth}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {/* + New */}
        <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-[11px] font-bold uppercase">New Joined</span>
            <UserPlus className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black text-emerald-700">+{movement.newCount}</div>
        </div>

        {/* + Reactivated */}
        <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-600 mb-1">
            <span className="text-[11px] font-bold uppercase">Reactivated</span>
            <UserCheck className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black text-blue-700">+{movement.reactivatedCount}</div>
        </div>

        {/* + Upgraded */}
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-indigo-600 mb-1">
            <span className="text-[11px] font-bold uppercase">Upgraded</span>
            <ArrowUpCircle className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black text-indigo-700">+{movement.upgradedCount}</div>
        </div>

        {/* - Downgraded */}
        <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-[11px] font-bold uppercase">Downgraded</span>
            <ArrowDownCircle className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black text-amber-700">−{movement.downgradedCount}</div>
        </div>

        {/* - Cancelled */}
        <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-3 flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-[11px] font-bold uppercase">Cancelled</span>
            <UserMinus className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black text-rose-700">−{movement.cancelledCount}</div>
        </div>
      </div>
    </div>
  );
};
