import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { parseBookingDate, getBookingEndTime } from '../services/bookingService';
import { getIdleVehiclesNow } from '../services/idleVehicles';
import { getNowMYT, utcToMyt, formatInMYT, getAgreementPickupDateTime, getMYTDateString } from '../utils/dateUtils';
import { 
  Users, Car, CalendarCheck, DollarSign, FileText, AlertTriangle, 
  TrendingUp, TrendingDown, Clock, ArrowRight, Plus, Zap, AlertCircle, CheckCircle2,
  Wallet, BarChart3, ListTodo, X, Sparkles
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { Agreement, Booking, Car as CarType, MarketingEvent, Member } from '../types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabase';

interface AgentStat {
  name: string;
  total: number;
  percentage: number;
}

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

const AdminDashboard: React.FC = () => {
  const { subscriberId, staffRole, userUid, userId } = useAuth();
  const queryClient = useQueryClient();
  
  const [confirmReturnId, setConfirmReturnId] = useState<string | null>(null);
  const [isConfirmingReturn, setIsConfirmingReturn] = useState(false);
  const [showAllIdleVehicles, setShowAllIdleVehicles] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const refreshClock = () => setNow(new Date());
    const timer = window.setInterval(refreshClock, 15000);
    window.addEventListener('focus', refreshClock);
    document.addEventListener('visibilitychange', refreshClock);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshClock);
      document.removeEventListener('visibilitychange', refreshClock);
    };
  }, []);

  const [showEventModal, setShowEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ 
    name: '', 
    goal_type: 'Total Sales (RM)' as 'Total Orders' | 'Total Sales (RM)',
    target_goal: 0, 
    reward_amount: 0,
    start_date: '', 
    end_date: '' 
  });
  
  const currencyFormatter = new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
  });

  const { startDateStr, endDateStr } = useMemo(() => {
    
    // Fetch data for the last 6 months to support the 6-month sales history + future for bookings
    const startDateObj = new Date();
    startDateObj.setMonth(startDateObj.getMonth() - 6);
    startDateObj.setDate(1);
    startDateObj.setHours(0, 0, 0, 0);
    
    const endDateObj = new Date();
    endDateObj.setMonth(endDateObj.getMonth() + 6);
    
    return {
      startDateStr: startDateObj.toISOString(),
      endDateStr: endDateObj.toISOString()
    };
  }, []);

  const { data, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['adminDashboard', subscriberId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!subscriberId) throw new Error('No subscriber ID');
      
      const agentId = undefined;
      const createdBy = undefined;

      const [bookings, cars, agreements, marketingEvents, members] = await Promise.all([
        apiService.getBookings(subscriberId, startDateStr, endDateStr),
        apiService.getCars(subscriberId),
        apiService.getAgreements(subscriberId, agentId, createdBy, startDateStr, endDateStr),
        apiService.getMarketingEvents(subscriberId),
        apiService.getMembers(subscriberId)
      ]);

      return { bookings, cars, agreements, marketingEvents, members };
    },
    enabled: !!subscriberId,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  // Real-time dynamic updates on sales metrics when bookings/agreements change
  useEffect(() => {
    if (!subscriberId) return;

    const channel = supabase.channel(`admin-dashboard-realtime-${subscriberId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agreements', filter: `subscriber_id=eq.${subscriberId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['adminDashboard', subscriberId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `subscriber_id=eq.${subscriberId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['adminDashboard', subscriberId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cars', filter: `subscriber_id=eq.${subscriberId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['adminDashboard', subscriberId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketing_events', filter: `subscriber_id=eq.${subscriberId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['adminDashboard', subscriberId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [subscriberId, queryClient]);

  const error = queryError ? queryError.message : null;

  const dashboardData = useMemo(() => {
    if (!data) return null;

    const { bookings, cars, agreements, marketingEvents, members } = data;

    const todayStr = formatInMYT(now, 'yyyy-MM-dd');
    
    const currentMytYear = parseInt(formatInMYT(now, 'yyyy'), 10);
    const currentMytMonth = parseInt(formatInMYT(now, 'MM'), 10);
    
    // Calculate start/end of month in MYT
    const monthDays = new Date(currentMytYear, currentMytMonth, 0).getDate();
    const currentMonthStr = currentMytMonth.toString().padStart(2, '0');
    const startOfMonthStr = `${currentMytYear}-${currentMonthStr}-01`;
    const endOfMonthStr = `${currentMytYear}-${currentMonthStr}-${monthDays.toString().padStart(2, '0')}`;
    
    // Calculate standardized week periods in MYT:
    // Week 1: Day 1 - 7
    // Week 2: Day 8 - 15
    // Week 3: Day 16 - 23
    // Week 4: Day 24 - 30/31 (end of month)
    const mytZonedDate = utcToMyt(now);
    const currentDayOfMonth = mytZonedDate.getDate();
    
    let startDayThisWeek = 1;
    let endDayThisWeek = 7;
    let thisWeekCycleLabel = `Week 1 (Day 1 - 7)`;
    
    let startOfLastWeekStr = '';
    let endOfLastWeekStr = '';
    let endOfLastWeekApplesStr = '';

    if (currentDayOfMonth >= 1 && currentDayOfMonth <= 7) {
      startDayThisWeek = 1;
      endDayThisWeek = 7;
      thisWeekCycleLabel = `Week 1 (Day 1 - 7)`;

      // Last week is Previous Month's Week 4 (Day 24 to End of Prev Month)
      let prevYear = currentMytYear;
      let prevMonth = currentMytMonth - 1;
      if (prevMonth <= 0) {
        prevMonth = 12;
        prevYear -= 1;
      }
      const prevMonthDays = new Date(prevYear, prevMonth, 0).getDate();
      const prevMonthStr = prevMonth.toString().padStart(2, '0');
      startOfLastWeekStr = `${prevYear}-${prevMonthStr}-24`;
      endOfLastWeekStr = `${prevYear}-${prevMonthStr}-${prevMonthDays.toString().padStart(2, '0')}`;
      
      const dayOffset = currentDayOfMonth - startDayThisWeek;
      const applesEndDay = 24 + dayOffset;
      endOfLastWeekApplesStr = `${prevYear}-${prevMonthStr}-${applesEndDay.toString().padStart(2, '0')}`;
    } else if (currentDayOfMonth >= 8 && currentDayOfMonth <= 15) {
      startDayThisWeek = 8;
      endDayThisWeek = 15;
      thisWeekCycleLabel = `Week 2 (Day 8 - 15)`;

      startOfLastWeekStr = `${currentMytYear}-${currentMonthStr}-01`;
      endOfLastWeekStr = `${currentMytYear}-${currentMonthStr}-07`;
      
      const dayOffset = currentDayOfMonth - startDayThisWeek;
      const applesEndDay = 1 + dayOffset;
      endOfLastWeekApplesStr = `${currentMytYear}-${currentMonthStr}-${applesEndDay.toString().padStart(2, '0')}`;
    } else if (currentDayOfMonth >= 16 && currentDayOfMonth <= 23) {
      startDayThisWeek = 16;
      endDayThisWeek = 23;
      thisWeekCycleLabel = `Week 3 (Day 16 - 23)`;

      startOfLastWeekStr = `${currentMytYear}-${currentMonthStr}-08`;
      endOfLastWeekStr = `${currentMytYear}-${currentMonthStr}-15`;
      
      const dayOffset = currentDayOfMonth - startDayThisWeek;
      const applesEndDay = 8 + dayOffset;
      endOfLastWeekApplesStr = `${currentMytYear}-${currentMonthStr}-${applesEndDay.toString().padStart(2, '0')}`;
    } else {
      startDayThisWeek = 24;
      endDayThisWeek = monthDays;
      thisWeekCycleLabel = `Week 4 (Day 24 - ${monthDays})`;

      startOfLastWeekStr = `${currentMytYear}-${currentMonthStr}-16`;
      endOfLastWeekStr = `${currentMytYear}-${currentMonthStr}-23`;
      
      const dayOffset = currentDayOfMonth - startDayThisWeek;
      const applesEndDay = 16 + dayOffset;
      endOfLastWeekApplesStr = `${currentMytYear}-${currentMonthStr}-${applesEndDay.toString().padStart(2, '0')}`;
    }

    const startOfWeekStr = `${currentMytYear}-${currentMonthStr}-${startDayThisWeek.toString().padStart(2, '0')}`;
    const endOfWeekStr = `${currentMytYear}-${currentMonthStr}-${endDayThisWeek.toString().padStart(2, '0')}`;

    // Last Month Apples-to-Apples Dates
    let prevYearLastMonth = currentMytYear;
    let prevMonthLastMonth = currentMytMonth - 1;
    if (prevMonthLastMonth <= 0) {
        prevMonthLastMonth = 12;
        prevYearLastMonth -= 1;
    }
    const prevMonthLastMonthStr = prevMonthLastMonth.toString().padStart(2, '0');
    const startOfLastMonthStr = `${prevYearLastMonth}-${prevMonthLastMonthStr}-01`;
    const prevMonthDaysApples = new Date(prevYearLastMonth, prevMonthLastMonth, 0).getDate();
    const applesToApplesLastMonthDay = Math.min(currentDayOfMonth, prevMonthDaysApples);
    const endOfLastMonthApplesStr = `${prevYearLastMonth}-${prevMonthLastMonthStr}-${applesToApplesLastMonthDay.toString().padStart(2, '0')}`;


    // Past 6 months sales tracking
    const past6MonthsSales = Array.from({ length: 6 }).map((_, i) => {
      let targetYear = currentMytYear;
      let targetMonth = currentMytMonth - i;
      while (targetMonth <= 0) {
        targetMonth += 12;
        targetYear -= 1;
      }
      const targetMonthStr = targetMonth.toString().padStart(2, '0');
      const daysInTargetMonth = new Date(targetYear, targetMonth, 0).getDate();
      const startStr = `${targetYear}-${targetMonthStr}-01`;
      const endStr = `${targetYear}-${targetMonthStr}-${daysInTargetMonth.toString().padStart(2, '0')}`;
      
      const sampleDate = new Date(`${startStr}T12:00:00+08:00`);
      return {
        month: formatInMYT(sampleDate, 'MMM yyyy'),
        sales: 0,
        startStr,
        endStr
      };
    });

    // 1. Sales Metrics (Valid Booking: Matched with Calendar & Completed Status)
    const completedAgreements = agreements.filter(a => {
      const isMatchedWithCalendar = Boolean(a.booking_id);
      const isCompleted = a.status?.toLowerCase().trim() === 'completed';
      return isMatchedWithCalendar && isCompleted;
    });
    
    let salesToday = 0;
    let salesThisWeek = 0;
    let salesLastWeek = 0;
    let salesLastWeekApples = 0;
    let salesThisMonth = 0;
    let salesLastMonthApples = 0;
    
    completedAgreements.forEach(a => {
      // Sales are attributed by Pickup Date (start_date) in MYT
      const matchDateStr = getMYTDateString(getAgreementPickupDateTime(a));
      const price = Number(a.total_price) || 0;
      if (matchDateStr === todayStr) salesToday += price;
      if (matchDateStr >= startOfWeekStr && matchDateStr <= endOfWeekStr) salesThisWeek += price;
      if (matchDateStr >= startOfLastWeekStr && matchDateStr <= endOfLastWeekStr) salesLastWeek += price;
      if (matchDateStr >= startOfLastWeekStr && matchDateStr <= endOfLastWeekApplesStr) salesLastWeekApples += price;
      if (matchDateStr >= startOfMonthStr && matchDateStr <= endOfMonthStr) salesThisMonth += price;
      if (matchDateStr >= startOfLastMonthStr && matchDateStr <= endOfLastMonthApplesStr) salesLastMonthApples += price;

      // Populate past 6 months
      for (const monthData of past6MonthsSales) {
        if (matchDateStr >= monthData.startStr && matchDateStr <= monthData.endStr) {
          monthData.sales += price;
          break;
        }
      }
    });

    const salesLastMonth = past6MonthsSales[1]?.sales || 0;

    // Keep the displayed count and plates tied to the same current availability.
    const idleCars = getIdleVehiclesNow(cars, bookings, now.getTime());

    // 3. Pending Deliveries (Today, Current Time < Pickup Time)
    const pending: PendingDelivery[] = [];
    const overdue: OverdueReturn[] = [];

    const filteredBookings = bookings;

    filteredBookings.forEach(b => {
      if (b.status === 'cancelled') return;
      
      // The booking timestamps are saved in UTC.
      // We can compare them directly with `now.getTime()` (which is also UTC).
      const startMs = parseBookingDate(b.start_date, b.pickup_time);
      
      // FIX: Use actual_end_time or duration_days. Ignore DB's end_time string.
      const endMs = getBookingEndTime(b);

      const car = cars.find(c => c.id === b.car_id);
      const member = members.find(m => m.id === b.member_id);
      
      // Pending Deliveries Logic
      // We use formatInMYT to get the MYT date string from the UTC timestamp
      if (formatInMYT(startMs, 'yyyy-MM-dd') === todayStr && startMs > now.getTime()) {
        pending.push({
          id: b.id,
          carPlate: car?.plate || 'Unknown',
          customerName: member?.name || 'Unknown',
          pickupTime: new Date(startMs)
        });
      }
      
      // Overdue Returns
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

    // 5. Agent Leaderboard (This month)
    const agentMap = new Map<string, { name: string, total: number }>();
    completedAgreements.forEach(a => {
      const matchDateStr = getMYTDateString(getAgreementPickupDateTime(a));
      if (matchDateStr >= startOfMonthStr && matchDateStr <= endOfMonthStr) {
        const rawName = a.agent_name?.trim() || 'Unknown';
        const rawId = a.agent_id || a.created_by || '';
        
        let targetName = rawName !== 'Unknown' ? rawName : rawId;
        const key = targetName.toLowerCase();
        
        const current = agentMap.get(key) || { name: targetName, total: 0 };
        current.total += (a.total_price || 0);
        agentMap.set(key, current);
      }
    });

    const sortedAgents = Array.from(agentMap.values())
      .map(({ name, total }) => ({
        name,
        total,
        percentage: salesThisMonth > 0 ? (total / salesThisMonth) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total);

    return {
      stats: {
        salesToday,
        salesThisWeek,
        salesLastWeek,
        salesLastWeekApples,
        salesThisMonth,
        salesLastMonth,
        salesLastMonthApples,
        past6MonthsSales,
        thisWeekCycleLabel,
        idleVehicles: idleCars.length,
        idleCars
      },
      pendingDeliveries: pending.slice(0, 5),
      overdueReturns: overdue.slice(0, 5),
      leaderboard: sortedAgents.slice(0, 5),
      events: marketingEvents,
      bookings,
      recentAgreements: completedAgreements.slice(0, 5),
      agreements
    };
  }, [data, now]);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!subscriberId) return;
      await apiService.addMarketingEvent({
        name: newEvent.name,
        goal_type: newEvent.goal_type,
        target_goal: newEvent.target_goal,
        reward_amount: newEvent.reward_amount,
        start_date: newEvent.start_date,
        end_date: newEvent.end_date
      }, subscriberId);
      setShowEventModal(false);
      setNewEvent({ 
        name: '', 
        goal_type: 'Total Sales (RM)',
        target_goal: 0, 
        reward_amount: 0,
        start_date: '', 
        end_date: '' 
      });
      await queryClient.refetchQueries({ queryKey: ['adminDashboard'] });
      toast.success('Event created successfully');
    } catch (err) {
      console.error('Failed to add event:', err);
      toast.error('Failed to create event');
    }
  };

  const handleConfirmReturn = async (id: string) => {
    try {
      if (!subscriberId) return;
      setIsConfirmingReturn(true);
      await apiService.updateBookingStatus(id, subscriberId, 'completed', true);
      setConfirmReturnId(null);
      await queryClient.refetchQueries({ queryKey: ['adminDashboard'] });
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

  if (staffRole !== 'admin') {
    return <Navigate to="/" replace />;
  }

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
            onClick={() => queryClient.invalidateQueries({ queryKey: ['adminDashboard', subscriberId] })}
            className="px-6 py-2.5 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 transition-colors shadow-sm"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { stats, pendingDeliveries, overdueReturns, leaderboard, events, bookings, recentAgreements, agreements } = dashboardData;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
              {subscriberId === 'superadmin' ? 'Global Fleet Overview' : 'Operational Command Center'}
            </h1>
            <p className="text-slate-500 mt-2 text-sm">
              Real-time fleet operations, sales analytics, and team performance.
            </p>
          </div>
        </div>

        {/* Top Row: High-Level KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-slate-500 text-sm font-medium mb-2">Sales Today</h3>
            <p className="text-3xl font-bold text-slate-900">{currencyFormatter.format(stats.salesToday)}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-slate-500 text-sm font-medium mb-2">Sales This Week</h3>
            <p className="text-3xl font-bold text-slate-900">{currencyFormatter.format(stats.salesThisWeek)}</p>
            {stats.salesThisWeek > 0 ? (
              stats.salesLastWeekApples > 0 ? (
                <div title="Apples-to-apples comparison (Same period last week)" className={`flex items-center text-xs font-medium mt-2 cursor-help ${stats.salesThisWeek >= stats.salesLastWeekApples ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {stats.salesThisWeek >= stats.salesLastWeekApples ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {stats.salesThisWeek >= stats.salesLastWeekApples ? '↑ +' : '↓ '}{Math.abs(Number((((stats.salesThisWeek - stats.salesLastWeekApples) / stats.salesLastWeekApples) * 100).toFixed(1)))}% vs last week
                </div>
              ) : (
                <div className="flex items-center text-emerald-600 text-xs font-medium mt-2">
                  <TrendingUp className="w-3 h-3 mr-1" /> ↑ +100% vs last week
                </div>
              )
            ) : (
              <p className="text-[11px] text-slate-400 mt-2 font-medium">No sales recorded yet this week</p>
            )}
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm group relative">
            <h3 className="text-slate-500 text-sm font-medium mb-2">Sales This Month</h3>
            <p className="text-3xl font-bold text-slate-900">{currencyFormatter.format(stats.salesThisMonth)}</p>
            {stats.salesThisMonth > 0 ? (
              stats.salesLastMonthApples > 0 ? (
                <div title="Apples-to-apples comparison (Same period last month)" className={`flex items-center text-xs font-medium mt-2 cursor-help ${stats.salesThisMonth >= stats.salesLastMonthApples ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {stats.salesThisMonth >= stats.salesLastMonthApples ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {stats.salesThisMonth >= stats.salesLastMonthApples ? '↑ +' : '↓ '}{Math.abs(Number((((stats.salesThisMonth - stats.salesLastMonthApples) / stats.salesLastMonthApples) * 100).toFixed(1)))}% vs last month
                </div>
              ) : (
                <div className="flex items-center text-emerald-600 text-xs font-medium mt-2">
                  <TrendingUp className="w-3 h-3 mr-1" /> ↑ +100% vs last month
                </div>
              )
            ) : (
              <p className="text-[11px] text-slate-400 mt-2 font-medium">No sales recorded yet this month</p>
            )}
            
            {/* Hover Tooltip for 6 Months Sales */}
            <div className="absolute top-full left-0 mt-2 w-64 bg-slate-800 text-white text-sm rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 p-4">
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
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-slate-500 text-sm font-medium">Idle Vehicles</h3>
                <Car className="w-5 h-5 text-slate-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900">{stats.idleVehicles}</p>
              </div>
              <p className="text-xs text-slate-500 mt-1">Available now · {formatInMYT(now, 'HH:mm')} MYT</p>
              <p className="text-xs text-slate-500 mt-1">No remaining pickups today</p>
            </div>
            {stats.idleCars.length > 0 ? (
              <div className="mt-4 space-y-1">
                {(showAllIdleVehicles ? stats.idleCars : stats.idleCars.slice(0, 3)).map((car: CarType) => (
                  <div key={car.id} className="bg-emerald-50 text-emerald-800 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex justify-between items-center gap-2">
                    <span className="break-all">{car.plate || car.plateNumber || car.name}</span>
                    <span className="shrink-0">AVAILABLE</span>
                  </div>
                ))}
                {stats.idleCars.length > 3 && (
                  <button type="button" onClick={() => setShowAllIdleVehicles(value => !value)} aria-expanded={showAllIdleVehicles} className="min-h-11 w-full text-xs text-blue-600 text-center font-medium mt-1 hover:text-blue-800">
                    {showAllIdleVehicles ? 'Show fewer vehicles' : `Show all ${stats.idleCars.length} available vehicles`}
                  </button>
                )}
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-500">No vehicles available right now.</p>
            )}
          </div>
        </div>

        {/* Middle Row: The Action Center */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pending Deliveries */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-slate-900">Pending Deliveries (Today)</h2>
              <span className="ml-auto bg-blue-100 text-blue-700 py-0.5 px-2.5 rounded-full text-xs font-medium">
                {pendingDeliveries.length} To-Do
              </span>
            </div>
            <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-96">
              {pendingDeliveries.length > 0 ? pendingDeliveries.map((delivery: any) => (
                <div key={delivery.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{delivery.customerName}</p>
                    <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                      <Car className="w-4 h-4" /> {delivery.carPlate}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">
                      {formatInMYT(delivery.pickupTime, 'HH:mm')}
                    </p>
                    <p className="text-xs text-blue-600 font-medium mt-1">
                      In {formatTimeDiff(delivery.pickupTime)}
                    </p>
                  </div>
                </div>
              )) : (
                <div className="p-8 text-center text-slate-500">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-emerald-500" />
                  <p>No pending deliveries today.</p>
                </div>
              )}
            </div>
          </div>

          {/* Overdue Returns */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-rose-50/30 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <h2 className="font-semibold text-slate-900">Overdue Returns (Urgent)</h2>
              <span className="ml-auto bg-rose-100 text-rose-700 py-0.5 px-2.5 rounded-full text-xs font-medium">
                {overdueReturns.length} Late
              </span>
            </div>
            <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-96">
              {overdueReturns.length > 0 ? overdueReturns.map((returnItem: any) => (
                <div 
                  key={returnItem.id} 
                  className="p-4 hover:bg-rose-50/50 transition-colors cursor-pointer"
                  onClick={() => setConfirmReturnId(returnItem.id)}
                >
                  {confirmReturnId === returnItem.id ? (
                    <div className="flex flex-col items-center justify-center py-2">
                      <p className="text-sm font-semibold text-slate-800 mb-3">Is the Vehicle Returned?</p>
                      <div className="flex gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmReturn(returnItem.id);
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
                      <div>
                        <p className="font-medium text-slate-900">{returnItem.customerName}</p>
                        <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                          <Car className="w-4 h-4" /> {returnItem.carPlate}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-900">
                          {formatInMYT(returnItem.returnTime, 'dd/MM/yyyy HH:mm')}
                        </p>
                        <p className="text-xs text-rose-600 font-medium mt-1">
                          Late by {formatTimeDiff(returnItem.returnTime)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )) : (
                <div className="p-8 text-center text-slate-500">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-emerald-500" />
                  <p>No overdue returns.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Earnings Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-slate-900 uppercase tracking-tight">Recent Transactions</h2>
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
                {recentAgreements.length > 0 ? recentAgreements.map((agreement: any) => (
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
                      {currencyFormatter.format(agreement.total_price)}
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

        {/* Bottom Row: Strategy & Team */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pop-Up Events Engine */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-amber-500" />
                <h2 className="font-semibold text-slate-900">Pop-Up Events Engine</h2>
              </div>
              <button 
                onClick={() => setShowEventModal(true)}
                className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Event
              </button>
            </div>
            <div className="p-6 flex-1 bg-slate-50/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {events.length > 0 ? events.map((event: any) => {
                  const nowStr = formatInMYT(getNowMYT(), 'yyyy-MM-dd');
                  const eStart = event.start_date.substring(0, 10);
                  const eEnd = event.end_date.substring(0, 10);
                  const isActive = eStart <= nowStr && eEnd >= nowStr;
                  return (
                    <div key={event.id} className={`p-4 rounded-xl border ${isActive ? 'bg-gradient-to-br from-indigo-500 to-purple-600 border-transparent text-white shadow-md' : 'bg-white border-slate-200 text-slate-900'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-bold text-lg">{event.name}</h3>
                        <div className="flex items-center gap-2">
                          {isActive && <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider">Active</span>}
                          <button 
                            onClick={async () => {
                              try {
                                await apiService.deleteMarketingEvent(event.id, subscriberId!);
                                await queryClient.refetchQueries({ queryKey: ['adminDashboard'] });
                              } catch (err) {
                                console.error('Failed to delete event:', err);
                              }
                            }}
                            className={`p-1 rounded-md transition-colors ${isActive ? 'hover:bg-white/20 text-white/70 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-rose-500'}`}
                            title="Delete Event"
                          >
                            &times;
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className={`text-xs ${isActive ? 'text-indigo-100' : 'text-slate-500'}`}>Goal: {event.goal_type}</p>
                          <p className="text-lg font-bold">
                            {event.goal_type === 'Total Orders' ? `${event.target_goal} Orders` : currencyFormatter.format(event.target_goal)}
                          </p>
                        </div>
                        <div>
                          <p className={`text-xs ${isActive ? 'text-indigo-100' : 'text-slate-500'}`}>Reward</p>
                          <p className="text-lg font-bold text-emerald-500">{currencyFormatter.format(event.reward_amount)}</p>
                        </div>
                      </div>
                      <p className={`text-xs mt-4 ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                        {formatInMYT(new Date(event.start_date).getTime(), 'dd/MM/yyyy')} - {formatInMYT(new Date(event.end_date).getTime(), 'dd/MM/yyyy')}
                      </p>
                    </div>
                  );
                }) : (
                  <div className="col-span-full text-center py-8 text-slate-500">
                    <Zap className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                    <p>No active marketing events.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Agent Leaderboard */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <h2 className="font-semibold text-slate-900">Agent Leaderboard (This Month)</h2>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {leaderboard.length > 0 ? leaderboard.map((agent: any, idx: number) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0 ? 'bg-amber-100 text-amber-700' : 
                          idx === 1 ? 'bg-slate-100 text-slate-700' : 
                          idx === 2 ? 'bg-orange-100 text-orange-800' : 'bg-slate-50 text-slate-500'
                        }`}>
                          {idx + 1}
                        </span>
                        <p className="text-sm font-medium text-slate-900">{agent.name}</p>
                      </div>
                      <p className="text-sm font-bold text-slate-900">{currencyFormatter.format(agent.total)}</p>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden ml-9" style={{ width: 'calc(100% - 36px)' }}>
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                        style={{ width: `${agent.percentage}%` }}
                      />
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-slate-500">
                    <TrendingUp className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                    <p>No sales recorded this month.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Create Pop-Up Event</h2>
              <button onClick={() => setShowEventModal(false)} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>
            <form onSubmit={handleAddEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Event Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Raya Promo"
                  value={newEvent.name}
                  onChange={e => setNewEvent({...newEvent, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Goal Type</label>
                  <select 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={newEvent.goal_type}
                    onChange={e => setNewEvent({...newEvent, goal_type: e.target.value as any})}
                  >
                    <option value="Total Orders">Total Orders</option>
                    <option value="Total Sales (RM)">Total Sales (RM)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {newEvent.goal_type === 'Total Orders' ? 'Target Orders' : 'Target Sales (RM)'}
                  </label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={newEvent.goal_type === 'Total Orders' ? '10' : '5000'}
                    value={newEvent.target_goal || ''}
                    onChange={e => setNewEvent({...newEvent, target_goal: Number(e.target.value)})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reward Amount (RM)</label>
                <input 
                  type="number" 
                  required
                  min="0"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="100"
                  value={newEvent.reward_amount || ''}
                  onChange={e => setNewEvent({...newEvent, reward_amount: Number(e.target.value)})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input 
                    type="date" 
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={newEvent.start_date}
                    onChange={e => setNewEvent({...newEvent, start_date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input 
                    type="date" 
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={newEvent.end_date}
                    onChange={e => setNewEvent({...newEvent, end_date: e.target.value})}
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
