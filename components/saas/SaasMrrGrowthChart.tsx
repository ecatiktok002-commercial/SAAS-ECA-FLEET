import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { TrendingUp } from 'lucide-react';

export interface MrrMonthData {
  month: string;
  displayMonth?: string;
  mrr: number;
  activeSubscribers?: number;
}

interface SaasMrrGrowthChartProps {
  data: MrrMonthData[];
  loading?: boolean;
}

// Module-level standalone tooltip component to prevent React 19 Fiber reconciliation errors
const CustomMrrTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const row = payload[0].payload as MrrMonthData;
    return (
      <div className="bg-slate-900 text-white px-3 py-2 rounded-xl shadow-xl border border-slate-800 text-xs min-w-[140px]">
        <div className="font-bold text-slate-200 mb-1 border-b border-slate-800 pb-1">
          {row.displayMonth || label}
        </div>
        <div className="space-y-1">
          <div className="flex justify-between items-center text-emerald-400 font-bold">
            <span>MRR:</span>
            <span>RM {row.mrr?.toLocaleString() || 0}</span>
          </div>
          {row.activeSubscribers !== undefined && (
            <div className="flex justify-between items-center text-slate-300">
              <span>Paying Customers:</span>
              <span>{row.activeSubscribers}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export const SaasMrrGrowthChart: React.FC<SaasMrrGrowthChartProps> = ({
  data = [],
  loading = false
}) => {
  // Only plot months that have defined data (do not plot unreached future months)
  const filteredData = React.useMemo(() => {
    return (data || []).filter(d => d.mrr !== undefined && d.mrr !== null);
  }, [data]);

  const hasData = filteredData.some(d => d.mrr > 0);

  return (
    <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>MRR Trend</span>
          </h2>
          <p className="text-[11px] text-slate-500">Monthly recurring revenue progression</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>MRR (RM)</span>
        </div>
      </div>

      <div className="h-44 w-full">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs">
            Loading recurring revenue trend...
          </div>
        ) : !hasData ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200 p-4">
            <p className="font-semibold text-slate-600">No MRR data recorded yet.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Chart updates as active paying customers are added.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredData} margin={{ top: 8, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="compactMrrGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                dy={6}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748B', fontSize: 11 }}
                tickFormatter={(val) => `RM ${val}`}
              />
              <Tooltip content={CustomMrrTooltip} />
              <Area 
                type="monotone" 
                dataKey="mrr" 
                stroke="#10B981" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#compactMrrGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
