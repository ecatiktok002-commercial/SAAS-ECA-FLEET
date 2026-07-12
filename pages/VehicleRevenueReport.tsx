import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { getAgreementPickupDateTime } from '../utils/dateUtils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, getDaysInMonth } from 'date-fns';
import { Car, DollarSign, Calendar, TrendingUp } from 'lucide-react';

const VehicleRevenueReport: React.FC = () => {
  const { subscriberId } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));

  // Generate last 12 months for selector
  const monthOptions = useMemo(() => {
    const options = [];
    for (let i = 0; i < 12; i++) {
      options.push(startOfMonth(subMonths(new Date(), i)));
    }
    return options;
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard-data', subscriberId],
    queryFn: async () => {
      if (!subscriberId) throw new Error('No subscriber ID');
      const [agreements, cars] = await Promise.all([
        apiService.getAgreements(subscriberId),
        apiService.getCars(subscriberId)
      ]);
      return { agreements, cars };
    },
    enabled: !!subscriberId
  });

  const currencyFormatter = new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  const { vehicleData, totalRevenue, totalBookings, daysInMonth } = useMemo(() => {
    if (!data) return { vehicleData: [], totalRevenue: 0, totalBookings: 0, daysInMonth: 30 };

    const monthDays = getDaysInMonth(selectedMonth);
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth() + 1;
    const monthStr = month.toString().padStart(2, '0');

    // STRICTLY follow Frontend timezone (MYT +08:00) for the month boundaries
    const startMs = new Date(`${year}-${monthStr}-01T00:00:00+08:00`).getTime();
    const endMs = new Date(`${year}-${monthStr}-${monthDays.toString().padStart(2, '0')}T23:59:59.999+08:00`).getTime();

    const getAgreementReturnDateTime = (agreement: any, pickup: Date): Date => {
      if (agreement.actual_end_time) return new Date(agreement.actual_end_time);
      if (agreement.duration_days) {
        return new Date(pickup.getTime() + agreement.duration_days * 24 * 60 * 60 * 1000);
      }
      if (agreement.end_date) {
        let dateStr = agreement.end_date;
        if (dateStr.includes('/')) {
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }
        const timeStr = agreement.return_time || '12:00';
        let formattedTime = timeStr;
        const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = timeMatch[2];
          const modifier = timeMatch[3];
          if (modifier) {
            if (modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
            if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
          }
          formattedTime = `${hours.toString().padStart(2, '0')}:${minutes}:00`;
        }
        return new Date(`${dateStr}T${formattedTime}+08:00`);
      }
      return pickup;
    };

    const carStats: Record<string, { total: number; count: number; name: string }> = {};
    const carIntervals: Record<string, { start: number; end: number }[]> = {};
    
    data.cars.forEach(c => {
      if (c.plate) {
        carStats[c.plate] = { 
          total: 0, 
          count: 0,
          name: `${c.make || ''} ${c.model || c.name}`.trim()
        };
        carIntervals[c.plate] = [];
      }
    });

    let totalRev = 0;
    let totalBookingsInMonth = 0;
    const validStatuses = ['signed', 'completed', 'reconciled'];

    data.agreements.forEach(a => {
      const status = a.status?.toLowerCase().trim() || '';
      const payoutStatus = a.payout_status?.toLowerCase().trim() || '';
      const plate = a.car_plate_number || 'Unknown';
      
      if (!carStats[plate]) {
        carStats[plate] = { total: 0, count: 0, name: 'Unknown Model' };
        carIntervals[plate] = [];
      }

      const pickup = getAgreementPickupDateTime(a);
      const ret = getAgreementReturnDateTime(a, pickup);

      const overlapStart = Math.max(startMs, pickup.getTime());
      const overlapEnd = Math.min(endMs, ret.getTime());

      if (overlapStart < overlapEnd) {
        const msInDay = 24 * 60 * 60 * 1000;
        const overlapDays = (overlapEnd - overlapStart) / msInDay;
        
        if (validStatuses.includes(status)) {
          // Push interval for union calculation later (prevents double-counting duplicate bookings)
          carIntervals[plate].push({ start: overlapStart, end: overlapEnd });

          // Calculate actual duration days based on start and return times
          const actualTotalDays = (ret.getTime() - pickup.getTime()) / msInDay;
          const durationDays = actualTotalDays > 0 ? actualTotalDays : (a.duration_days && a.duration_days > 0 ? a.duration_days : 1);
          const dailyRate = (a.total_price || 0) / durationDays;
          
          // Use the exact overlap days in this month to calculate the revenue attributable to this month
          const overlappingRevenue = dailyRate * overlapDays;
          
          carStats[plate].total += overlappingRevenue;
          carStats[plate].count += 1;
          totalRev += overlappingRevenue;
          totalBookingsInMonth += 1;
        }
      }
    });

    // Merge intervals to calculate accurate utilization without double counting
    const finalData = Object.entries(carStats).map(([plate, stats]) => {
      const intervals = carIntervals[plate].sort((a, b) => a.start - b.start);
      const merged: {start: number, end: number}[] = [];
      let current: {start: number, end: number} | null = null;
      
      intervals.forEach(inv => {
        if (!current) {
          current = { ...inv };
        } else if (inv.start <= current.end) {
          current.end = Math.max(current.end, inv.end);
        } else {
          merged.push(current);
          current = { ...inv };
        }
      });
      if (current) merged.push(current);

      let utilizedMs = 0;
      merged.forEach(inv => {
        utilizedMs += (inv.end - inv.start);
      });
      
      const rentedDays = utilizedMs / (24 * 60 * 60 * 1000);

      return {
        plate,
        name: stats.name,
        revenue: stats.total,
        bookings: stats.count,
        rentedDays: Math.min(Math.round(rentedDays), monthDays)
      };
    }).filter(d => d.revenue > 0 || d.rentedDays > 0)
      .sort((a, b) => b.revenue - a.revenue);

    return { 
      vehicleData: finalData, 
      totalRevenue: totalRev,
      totalBookings: totalBookingsInMonth,
      daysInMonth: monthDays
    };
  }, [data, selectedMonth]);

  if (isLoading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  // Generate colors for chart
  const colors = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Vehicle Revenue Report</h1>
            <p className="text-slate-500 mt-2 text-sm">
              Deep breakdown of rental sales generated by each vehicle. Data includes all valid agreements based on their actual duration and overlap days within the month.
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-white border border-slate-200 p-2 rounded-xl shadow-sm">
            <Calendar className="w-5 h-5 text-slate-400 ml-2" />
            <select
              value={selectedMonth.toISOString()}
              onChange={(e) => setSelectedMonth(new Date(e.target.value))}
              className="border-0 bg-transparent text-slate-900 font-medium focus:ring-0 cursor-pointer py-1 pr-8"
            >
              {monthOptions.map((date, idx) => (
                <option key={idx} value={date.toISOString()}>
                  {format(date, 'MMMM yyyy')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="bg-blue-50 p-4 rounded-full text-blue-600">
              <DollarSign className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Revenue ({format(selectedMonth, 'MMM')})</p>
              <h3 className="text-3xl font-bold text-slate-900">{currencyFormatter.format(totalRevenue)}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="bg-emerald-50 p-4 rounded-full text-emerald-600">
              <TrendingUp className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Bookings</p>
              <h3 className="text-3xl font-bold text-slate-900">{totalBookings}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="bg-purple-50 p-4 rounded-full text-purple-600">
              <Car className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Active Vehicles</p>
              <h3 className="text-3xl font-bold text-slate-900">{vehicleData.length}</h3>
            </div>
          </div>
        </div>

        {/* Chart */}
        {vehicleData.length > 0 ? (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Revenue by Vehicle</h3>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vehicleData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="plate" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(value) => `RM${value}`}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [currencyFormatter.format(value as number), 'Revenue']}
                    labelStyle={{ color: '#0f172a', fontWeight: 'bold', marginBottom: '4px' }}
                  />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {vehicleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center">
            <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Car className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No Revenue Data</h3>
            <p className="text-slate-500 mt-1">There are no valid agreements for {format(selectedMonth, 'MMMM yyyy')}.</p>
          </div>
        )}

        {/* Details Table */}
        {vehicleData.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Vehicle Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Vehicle Plate
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Model / Description
                    </th>
                    <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Total Bookings
                    </th>
                    <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Utilization
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Revenue Generated
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      % of Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {vehicleData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }}></div>
                          <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md text-sm border border-slate-200">
                            {row.plate}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                        {row.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-center font-medium">
                        {row.bookings}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex flex-col items-center justify-center">
                          <span className="text-sm font-bold text-slate-700">{row.rentedDays} / {daysInMonth}</span>
                          <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">Days</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right font-bold">
                        {currencyFormatter.format(row.revenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">
                        {totalRevenue > 0 ? ((row.revenue / totalRevenue) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VehicleRevenueReport;
