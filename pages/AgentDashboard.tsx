import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { parseBookingDate, getBookingEndTime } from '../services/bookingService';
import { getNowMYT, utcToMyt, formatInMYT } from '../utils/dateUtils';
import { 
  Car, DollarSign, AlertTriangle, 
  TrendingUp, TrendingDown, Clock, ArrowRight, CheckCircle2,
  Wallet, BarChart3, ListTodo, X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Agreement, Booking, MarketingEvent } from '../types';
import { AgentGamificationWidget } from '../components/AgentGamificationWidget';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell 
} from 'recharts';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface PendingDelivery {
  id: string;
  customerName: string;
  carPlate: string;
  pickupTime: Date;
}

interface OverdueReturn {
  id: string;
  customerName: string;
  carPlate: string;
  returnTime: Date;
}

const AgentDashboard: React.FC = () => {
  const { subscriberId, userId, userUid } = useAuth();
  const queryClient = useQueryClient();
  
  const [confirmReturnId, setConfirmReturnId] = useState<string | null>(null);
  const [isConfirmingReturn, setIsConfirmingReturn] = useState(false);

  const currencyFormatter = new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
  });

  const { startDateStr, endDateStr, mytDate, now } = useMemo(() => {
    const now = getNowMYT();
    const mytDate = utcToMyt(now);
    
    // Fetch data for the last 6 months to support the 6-month sales history
    const startDateObj = new Date(mytDate);
    startDateObj.setMonth(startDateObj.getMonth() - 6);
    startDateObj.setDate(1);
    startDateObj.setHours(0, 0, 0, 0);
    
    // End date is end of current month
    const endDateObj = new Date(mytDate.getFullYear(), mytDate.getMonth() + 1, 0, 23, 59, 59, 999);
    
    return {
      now,
      mytDate,
      startDateStr: startDateObj.toISOString(),
      endDateStr: endDateObj.toISOString()
    };
  }, []);

  const { data, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['agentDashboard', subscriberId, userId, userUid, startDateStr, endDateStr],
    queryFn: async () => {
      if (!subscriberId) throw new Error('No subscriber ID');
      
      const agentId = userId || undefined;
      const createdBy = ([userUid, userId].filter(Boolean) as string[]);

      const [allBookings, cars, agreements, marketingEvents, members, staffMembers] = await Promise.all([
        apiService.getBookings(subscriberId, startDateStr, endDateStr),
        apiService.getCars(subscriberId),
        apiService.getAgreements(subscriberId, agentId, createdBy, startDateStr, endDateStr),
        apiService.getMarketingEvents(subscriberId),
        apiService.getMembers(subscriberId),
        apiService.getStaffMembers(subscriberId)
      ]);

      let staff = null;
      let logisticCredits: any[] = [];
      if (userUid) {
        staff = staffMembers.find(s => s.staff_uid === userUid) || null;
        if (staff) {
          logisticCredits = await apiService.getLogisticCredits(staff.id, subscriberId);
        }
      }

      return { allBookings, cars, agreements, marketingEvents, members, staff, logisticCredits };
    },
    enabled: !!subscriberId,
  });

  const error = queryError ? queryError.message : null;

  const dashboardData = useMemo(() => {
    if (!data) return null;

    const { allBookings, cars, agreements, marketingEvents, members, staff: currentStaff, logisticCredits } = data;

    const todayStr = format(mytDate, 'yyyy-MM-dd');
    
    const startOfWeek = new Date(mytDate);
    startOfWeek.setDate(mytDate.getDate() - mytDate.getDay());
    const startOfWeekStr = format(startOfWeek, 'yyyy-MM-dd');
    
    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfWeek.getDate() - 7);
    const startOfLastWeekStr = format(startOfLastWeek, 'yyyy-MM-dd');

    const startOfMonth = new Date(mytDate.getFullYear(), mytDate.getMonth(), 1);
    const startOfMonthStr = format(startOfMonth, 'yyyy-MM-dd');

    // Past 6 months sales tracking
    const past6MonthsSales = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(mytDate.getFullYear(), mytDate.getMonth() - i, 1);
      return {
        month: format(d, 'MMM yyyy'),
        sales: 0,
        startStr: format(d, 'yyyy-MM-dd'),
        endStr: format(new Date(mytDate.getFullYear(), mytDate.getMonth() - i + 1, 0), 'yyyy-MM-dd')
      };
    });

    const lastMonth = new Date(mytDate.getFullYear(), mytDate.getMonth() - 1, 1);
    const lastMonthKey = format(lastMonth, 'yyyy-MM');
    let lastMonthEarnings = 0;

    // 1. Sales Metrics (Completed/Signed Agreements)
    const completedAgreements = agreements.filter(a => {
      const status = a.status?.toLowerCase().trim();
      return status === 'completed' || (status === 'signed' && !!a.payment_receipt);
    });
    
    let salesToday = 0;
    let salesThisWeek = 0;
    let salesLastWeek = 0;
    let salesThisMonth = 0;
    
    completedAgreements.forEach(a => {
      const createdDate = a.created_at.split('T')[0];
      const price = Number(a.total_price) || 0;
      if (createdDate === todayStr) salesToday += price;
      if (createdDate >= startOfWeekStr) salesThisWeek += price;
      if (createdDate >= startOfLastWeekStr && createdDate < startOfWeekStr) salesLastWeek += price;
      if (createdDate >= startOfMonthStr) salesThisMonth += price;

      // Populate past 6 months
      for (const monthData of past6MonthsSales) {
        if (createdDate >= monthData.startStr && createdDate <= monthData.endStr) {
          monthData.sales += price;
          break;
        }
      }
    });

    const salesLastMonth = past6MonthsSales[1]?.sales || 0;

    // 2. Idle Vehicles
    const activeCars = cars.filter(c => c.status === 'active');
    const carsOnRentToday = allBookings.filter(b => {
      const start = utcToMyt(parseBookingDate(b.start_date, b.pickup_time));
      // FIX: Use actual_end_time or duration_days. Ignore DB's end_time string.
      const end = utcToMyt(getBookingEndTime(b));
      return start <= now && end >= now && b.status !== 'cancelled';
    }).map(b => b.car_id);
    
    const uniqueCarsOnRent = new Set(carsOnRentToday);
    const idleVehicles = activeCars.length - uniqueCarsOnRent.size;

    // 3. Pending Deliveries & Overdue Returns
    const pending: PendingDelivery[] = [];
    const overdue: OverdueReturn[] = [];

    const filteredBookings = allBookings.filter(b => b.agent_id === userId || b.created_by === userUid || b.created_by === userId);

    filteredBookings.forEach(b => {
      if (b.status === 'cancelled') return;
      
      const startMs = parseBookingDate(b.start_date, b.pickup_time);
      
      // FIX: Use actual_end_time or duration_days. Ignore DB's end_time string.
      const endMs = getBookingEndTime(b);
        
      const car = cars.find(c => c.id === b.car_id);
      const member = members.find(m => m.id === b.member_id);
      
      if (formatInMYT(startMs, 'yyyy-MM-dd') === todayStr && startMs > now.getTime()) {
        pending.push({
          id: b.id,
          carPlate: car?.plate || 'Unknown',
          customerName: member?.name || 'Unknown',
          pickupTime: new Date(startMs)
        });
      }
      
      if (now.getTime() > endMs && b.status !== 'completed') {
        overdue.push({
          id: b.id,
          carPlate: car?.plate || 'Unknown',
          customerName: member?.name || 'Unknown',
          returnTime: new Date(endMs)
        });
      }
    });

    pending.sort((a, b) => a.pickupTime.getTime() - b.pickupTime.getTime());
    overdue.sort((a, b) => a.returnTime.getTime() - b.returnTime.getTime());

    // 4. Agent Specific Metrics (Earnings & Chart)
    const getCommissionForAmount = (a: Agreement, runningTotal: number) => {
      const totalPrice = Number(a.total_price) || 0;
      let earned = 0;
      if (a.commission_earned !== undefined && a.commission_earned !== null) {
        earned = Number(a.commission_earned);
        if (earned > 0 || totalPrice === 0) return earned;
      }
      
      if (currentStaff?.commission_rate && Number(currentStaff.commission_rate) > 0) {
        return totalPrice * (Number(currentStaff.commission_rate) / 100);
      }
      const tierOverride = currentStaff?.commission_tier_override || 'auto';
      if (tierOverride !== 'auto') {
        const rate = tierOverride === 'premium' ? 0.20 : tierOverride === 'prestige' ? 0.25 : 0.30;
        return totalPrice * rate;
      }
      const getTotalCommission = (total: number) => {
        if (total <= 5000) return total * 0.20;
        if (total <= 8000) return (5000 * 0.20) + ((total - 5000) * 0.25);
        return (5000 * 0.20) + (3000 * 0.25) + ((total - 8000) * 0.30);
      };
      return getTotalCommission(runningTotal + totalPrice) - getTotalCommission(runningTotal);
    };

    const weeklyData: { [key: string]: number } = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    for (let i = 12; i >= 0; i--) {
      const d = getNowMYT();
      d.setDate(d.getDate() - (i * 7));
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const weekNum = Math.ceil(weekStart.getDate() / 7);
      const monthName = monthNames[weekStart.getMonth()];
      const label = `W${weekNum} - ${monthName}`;
      weeklyData[label] = 0;
    }

    const monthGroups: { [key: string]: Agreement[] } = {};
    completedAgreements.forEach(a => {
      const monthKey = a.created_at.substring(0, 7);
      if (!monthGroups[monthKey]) monthGroups[monthKey] = [];
      monthGroups[monthKey].push(a);
    });

    let earnedToday = 0;
    let lifetime = 0;
    
    Object.keys(monthGroups).forEach(monthKey => {
      const monthAgreements = monthGroups[monthKey].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      let runningTotal = 0;
      monthAgreements.forEach(a => {
        const commission = Number(getCommissionForAmount(a, runningTotal)) || 0;
        runningTotal += Number(a.total_price) || 0;
        lifetime += commission;

        if (monthKey === lastMonthKey) {
          lastMonthEarnings += commission;
        }

        const dateStr = a.created_at.split('T')[0];
        if (dateStr === todayStr) {
          earnedToday += commission;
        }

        const date = new Date(a.created_at);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekNum = Math.ceil(weekStart.getDate() / 7);
        const monthName = monthNames[weekStart.getMonth()];
        const label = `W${weekNum} - ${monthName}`;
        
        if (weeklyData[label] !== undefined) {
          weeklyData[label] += commission;
        }
      });
    });

    const chartData = Object.entries(weeklyData).map(([label, amount]) => ({
      date: label,
      amount: Number(Number(amount || 0).toFixed(2))
    }));

    return {
      stats: {
        salesToday,
        salesThisWeek,
        salesLastWeek,
        salesThisMonth,
        salesLastMonth,
        past6MonthsSales,
        idleVehicles: Math.max(0, idleVehicles),
      },
      pendingDeliveries: pending.slice(0, 5),
      overdueReturns: overdue.slice(0, 5),
      events: marketingEvents,
      bookings: allBookings,
      currentStaff,
      dailyCommissions: chartData,
      totalEarnedToday: earnedToday,
      lastMonthEarnings,
      lifetimeEarnings: lifetime,
      recentAgreements: completedAgreements.slice(0, 5),
      logisticCredits
    };
  }, [data, mytDate, now]);

  const handleConfirmReturn = async (id: string) => {
    try {
      if (!subscriberId) return;
      setIsConfirmingReturn(true);
      await apiService.updateBookingStatus(id, subscriberId, 'completed');
      setConfirmReturnId(null);
      queryClient.invalidateQueries({ queryKey: ['agentDashboard', subscriberId] });
      toast.success('Vehicle marked as returned');
    } catch (err) {
      console.error('Failed to confirm return:', err);
      toast.error('Failed to confirm return. Please try again.');
    } finally {
      setIsConfirmingReturn(false);
    }
  };

  const formatTimeDiff = (date: Date) => {
    const now = getNowMYT();
    const diffMs = Math.abs(date.getTime() - now.getTime());
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    const parts = [];
    if (diffHrs > 0) parts.push(`${diffHrs} ${diffHrs === 1 ? 'HOUR' : 'HOURS'}`);
    if (diffMins > 0 || parts.length === 0) parts.push(`${diffMins} ${diffMins === 1 ? 'MINUTE' : 'MINUTES'}`);
    
    return parts.join(' ');
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center max-w-2xl mx-auto shadow-sm">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-rose-900 mb-3">Unable to Connect to Database</h2>
          <p className="text-rose-700 mb-6 leading-relaxed">{error || 'Unknown error'}</p>
          <button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['agentDashboard', subscriberId] })}
            className="px-6 py-2.5 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 transition-colors shadow-sm"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { stats, pendingDeliveries, overdueReturns, events, bookings, currentStaff, dailyCommissions, totalEarnedToday, lastMonthEarnings, lifetimeEarnings, recentAgreements, logisticCredits } = dashboardData;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Personal Performance Hub</h1>
          <p className="text-slate-500 mt-2 text-sm">Real-time fleet operations, sales analytics, and team performance.</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <ListTodo className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-slate-900 uppercase tracking-tight">Daily Mission Log</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {(() => {
              const missions = [
                ...pendingDeliveries.map(p => ({ ...p, type: 'pickup' })),
                ...overdueReturns.map(r => ({ ...r, type: 'return' }))
              ].sort((a, b) => {
                const timeA = 'pickupTime' in a ? a.pickupTime.getTime() : a.returnTime.getTime();
                const timeB = 'pickupTime' in b ? b.pickupTime.getTime() : b.returnTime.getTime();
                return timeA - timeB;
              }).slice(0, 3);

              if (missions.length === 0) {
                return <div className="p-6 text-center text-slate-500 italic">No urgent missions today. Keep hunting!</div>;
              }

              return missions.map((m) => (
                <div 
                  key={m.id} 
                  className={`p-4 hover:bg-slate-50 transition-colors ${m.type === 'return' ? 'cursor-pointer' : ''}`}
                  onClick={() => {
                    if (m.type === 'return') setConfirmReturnId(m.id);
                  }}
                >
                  {confirmReturnId === m.id && m.type === 'return' ? (
                    <div className="flex flex-col items-center justify-center py-2">
                      <p className="text-sm font-semibold text-slate-800 mb-3">Is the Vehicle Returned?</p>
                      <div className="flex gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmReturn(m.id);
                          }}
                          disabled={isConfirmingReturn}
                          className="flex items-center gap-1 px-4 py-1.5 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Yes
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmReturnId(null);
                          }}
                          disabled={isConfirmingReturn}
                          className="flex items-center gap-1 px-4 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300 transition-colors disabled:opacity-50"
                        >
                          <X className="w-4 h-4" /> No
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${m.type === 'pickup' ? 'bg-blue-100 text-blue-600' : 'bg-rose-100 text-rose-600'}`}>
                          {m.type === 'pickup' ? <ArrowRight className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{m.carPlate}</p>
                          <p className="text-sm text-slate-500">{m.customerName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {m.type === 'pickup' ? (
                          <p className="font-bold text-blue-600 uppercase text-sm">
                            {m.carPlate} OUT IN {formatTimeDiff((m as any).pickupTime).toUpperCase()}
                          </p>
                        ) : (
                          <p className="font-bold text-rose-600 uppercase text-sm">
                            {m.carPlate} LATE RETURN ({formatTimeDiff((m as any).returnTime).toUpperCase()} LATE)
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ));
            })()}
          </div>
        </div>

        {currentStaff && (
          <AgentGamificationWidget 
            salesThisMonth={stats.salesThisMonth}
            commissionTierOverride={currentStaff.commission_tier_override || 'auto'}
            events={events}
            bookings={bookings}
            userId={userId || ''}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-xl border border-transparent shadow-lg text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Wallet className="w-6 h-6 text-emerald-100" />
                  <h3 className="text-emerald-50 text-sm font-bold uppercase tracking-widest">My Pocket</h3>
                </div>
                <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Live Earnings</span>
              </div>
              <div className="space-y-1">
                <p className="text-emerald-100 text-sm font-medium">Total Earned Today</p>
                <p className="text-5xl font-black tracking-tighter">{currencyFormatter.format(totalEarnedToday)}</p>
              </div>
              
              <div className="mt-4 flex items-center gap-2 text-emerald-100/80">
                <Clock className="w-4 h-4" />
                <p className="text-xs font-bold uppercase tracking-widest">Last Month's Payout:</p>
                <p className="text-sm font-black">
                  {lastMonthEarnings > 0 
                    ? currencyFormatter.format(lastMonthEarnings) 
                    : "RM 0.00 — Let's make this your first payout month!"}
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-3 gap-4 items-start">
                <div>
                  <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-1">Weekly Sales</p>
                  <p className="text-2xl font-bold">{currencyFormatter.format(stats.salesThisWeek)}</p>
                  {stats.salesLastWeek > 0 ? (
                    <div className="flex items-center text-[10px] font-bold mt-1 text-white/90">
                      {stats.salesThisWeek >= stats.salesLastWeek ? <TrendingUp className="w-3 h-3 mr-1 text-emerald-300" /> : <TrendingDown className="w-3 h-3 mr-1 text-rose-300" />}
                      {stats.salesThisWeek >= stats.salesLastWeek ? '+' : ''}{(((stats.salesThisWeek - stats.salesLastWeek) / stats.salesLastWeek) * 100).toFixed(1)}% vs last week
                    </div>
                  ) : stats.salesThisWeek > 0 ? (
                    <div className="flex items-center text-[10px] font-bold mt-1 text-emerald-300">
                      <TrendingUp className="w-3 h-3 mr-1" /> +100% vs last week
                    </div>
                  ) : null}
                </div>
                <div className="group relative">
                  <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-1">Monthly Sales</p>
                  <p className="text-2xl font-bold">{currencyFormatter.format(stats.salesThisMonth)}</p>
                  {stats.salesLastMonth > 0 ? (
                    <div className="flex items-center text-[10px] font-bold mt-1 text-white/90">
                      {stats.salesThisMonth >= stats.salesLastMonth ? <TrendingUp className="w-3 h-3 mr-1 text-emerald-300" /> : <TrendingDown className="w-3 h-3 mr-1 text-rose-300" />}
                      {stats.salesThisMonth >= stats.salesLastMonth ? '+' : ''}{(((stats.salesThisMonth - stats.salesLastMonth) / stats.salesLastMonth) * 100).toFixed(1)}% vs last month
                    </div>
                  ) : stats.salesThisMonth > 0 ? (
                    <div className="flex items-center text-[10px] font-bold mt-1 text-emerald-300">
                      <TrendingUp className="w-3 h-3 mr-1" /> +100% vs last month
                    </div>
                  ) : null}
                  
                  {/* Hover Tooltip for 6 Months Sales */}
                  <div className="absolute bottom-full left-0 mb-2 w-64 bg-slate-800 text-white text-sm rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 p-4">
                    <h4 className="font-semibold mb-3 text-slate-200 border-b border-slate-700 pb-2">Past 6 Months</h4>
                    <div className="space-y-2">
                      {stats.past6MonthsSales.map((monthData: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span className="text-slate-400">{monthData.month}</span>
                          <span className="font-medium">{currencyFormatter.format(monthData.sales)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-1">LIFETIME EARNINGS 🏆</p>
                  <p className="text-2xl font-bold">{currencyFormatter.format(lifetimeEarnings)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 uppercase tracking-tight text-sm">Weekly Earnings Performance (90 Days)</h3>
              </div>
              <div className="h-40 w-full">
                {dailyCommissions.some(d => d.amount > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyCommissions}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 10 }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        tickFormatter={(value) => `RM${value}`}
                      />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        formatter={(value: any) => [`${currencyFormatter.format(Number(value))}`, 'Commission']}
                      />
                      <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                        {dailyCommissions.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.amount > 0 ? '#10b981' : '#e2e8f0'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <TrendingUp className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-slate-900 font-bold text-xs">No earnings yet this quarter</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-slate-500 text-sm font-medium">Idle Vehicles</h3>
                <Car className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-3xl font-bold text-slate-900">{stats.idleVehicles}</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Car className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="font-bold text-slate-900 uppercase tracking-tight text-sm">Logistic Credits</h3>
                </div>
                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">
                  {currencyFormatter.format(logisticCredits.reduce((sum, r) => sum + (r.logistic_credit || 0), 0))}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                {logisticCredits.length > 0 ? logisticCredits.map(record => (
                  <div key={record.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{record.cars?.plate || 'Vehicle'}</div>
                      <div className="text-[10px] text-slate-500">{formatInMYT(new Date(record.created_at).getTime(), 'dd/MM/yyyy HH:mm')}</div>
                    </div>
                    <div className="text-xs font-black text-blue-600">
                      +{currencyFormatter.format(record.logistic_credit)}
                    </div>
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <Car className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-slate-500 text-xs">No logistic credits yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-slate-900 uppercase tracking-tight">Recent Earnings Table</h2>
            </div>
            <Link to="/agreements" className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Vehicle</th>
                  <th className="px-6 py-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentAgreements.length > 0 ? recentAgreements.map((agreement) => (
                  <tr key={agreement.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatInMYT(new Date(agreement.created_at).getTime(), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">
                      {agreement.customer_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {agreement.car_plate_number || agreement.car_model}
                    </td>
                    <td className="px-6 py-4 text-sm font-black text-emerald-600 text-right">
                      {currencyFormatter.format(Number(agreement.total_price) || 0)}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500 italic">
                      No transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentDashboard;
