import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { 
  Users, Car, CalendarCheck, DollarSign, FileText, AlertTriangle, 
  TrendingUp, Clock, ArrowRight, Plus, Zap, AlertCircle, CheckCircle2,
  Wallet, BarChart3, ListTodo
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { Agreement, Booking, Car as CarType, MarketingEvent, Member } from '../types';
import { AgentGamificationWidget } from '../components/AgentGamificationWidget';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell 
} from 'recharts';

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
  
  const [stats, setStats] = useState({
    salesToday: 0,
    salesThisWeek: 0,
    salesThisMonth: 0,
    idleVehicles: 0,
  });
  
  const [pendingDeliveries, setPendingDeliveries] = useState<PendingDelivery[]>([]);
  const [overdueReturns, setOverdueReturns] = useState<OverdueReturn[]>([]);
  const [leaderboard, setLeaderboard] = useState<AgentStat[]>([]);
  const [events, setEvents] = useState<MarketingEvent[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [currentStaff, setCurrentStaff] = useState<any>(null);
  const [dailyCommissions, setDailyCommissions] = useState<{ date: string, amount: number }[]>([]);
  const [totalEarnedToday, setTotalEarnedToday] = useState(0);
  const [lastMonthEarnings, setLastMonthEarnings] = useState(0);
  const [lifetimeEarnings, setLifetimeEarnings] = useState(0);
  const [recentAgreements, setRecentAgreements] = useState<Agreement[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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

  useEffect(() => {
    if (subscriberId) {
      fetchDashboardData();
    }
  }, [subscriberId, staffRole, userUid]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const agentId = staffRole === 'staff' ? userId || undefined : undefined;
      const createdBy = staffRole === 'staff' ? ([userUid, userId].filter(Boolean) as string[]) : undefined;

      const [bookings, cars, agreements, marketingEvents, members, staffMembers] = await Promise.all([
        apiService.getBookings(subscriberId!),
        apiService.getCars(subscriberId!),
        apiService.getAgreements(subscriberId!, agentId, createdBy),
        apiService.getMarketingEvents(subscriberId!),
        apiService.getMembers(subscriberId!),
        apiService.getStaffMembers(subscriberId!)
      ]);

      if (userUid) {
        const staff = staffMembers.find(s => s.designated_uid === userUid);
        setCurrentStaff(staff || null);
      }

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const startOfWeekStr = startOfWeek.toISOString().split('T')[0];
      
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfMonthStr = startOfMonth.toISOString().split('T')[0];

      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthKey = lastMonth.toISOString().substring(0, 7);
      let lastMonthEarnings = 0;

      // 1. Sales Metrics (Completed/Signed Agreements)
      const completedAgreements = agreements.filter(a => a.status === 'signed' && !!a.payment_receipt);
      
      let salesToday = 0;
      let salesThisWeek = 0;
      let salesThisMonth = 0;
      
      completedAgreements.forEach(a => {
        const createdDate = a.created_at.split('T')[0];
        const price = Number(a.total_price || 0);
        if (createdDate === todayStr) salesToday += price;
        if (createdDate >= startOfWeekStr) salesThisWeek += price;
        if (createdDate >= startOfMonthStr) salesThisMonth += price;
      });

      // 2. Idle Vehicles
      const activeCars = cars.filter(c => c.status === 'active');
      const carsOnRentToday = bookings.filter(b => {
        const start = new Date(b.start);
        const end = new Date(start.getTime() + b.duration * 24 * 60 * 60 * 1000);
        return start <= now && end >= now && b.status !== 'cancelled';
      }).map(b => b.carId);
      
      const uniqueCarsOnRent = new Set(carsOnRentToday);
      const idleVehicles = activeCars.length - uniqueCarsOnRent.size;

      setStats({
        salesToday,
        salesThisWeek,
        salesThisMonth,
        idleVehicles: Math.max(0, idleVehicles)
      });

      // 3. Pending Deliveries (Today, Current Time < Pickup Time)
      const pending: PendingDelivery[] = [];
      const overdue: OverdueReturn[] = [];

      const filteredBookings = staffRole === 'staff' 
        ? bookings.filter(b => b.agent_id === userId || b.created_by === userUid || b.created_by === userId)
        : bookings;

      filteredBookings.forEach(b => {
        if (b.status === 'cancelled') return;
        
        const start = new Date(b.start);
        const end = new Date(start.getTime() + b.duration * 24 * 60 * 60 * 1000);
        const car = cars.find(c => c.id === b.carId);
        const member = members.find(m => m.id === b.memberId);
        
        // Pending Deliveries
        if (start.toISOString().split('T')[0] === todayStr && start > now) {
          pending.push({
            id: b.id,
            carPlate: car?.plate || 'Unknown',
            customerName: member?.name || 'Unknown',
            pickupTime: start
          });
        }
        
        // Overdue Returns
        if (now > end && b.status !== 'completed') {
          overdue.push({
            id: b.id,
            carPlate: car?.plate || 'Unknown',
            customerName: member?.name || 'Unknown',
            returnTime: end
          });
        }
      });

      pending.sort((a, b) => a.pickupTime.getTime() - b.pickupTime.getTime());
      overdue.sort((a, b) => a.returnTime.getTime() - b.returnTime.getTime());

      setPendingDeliveries(pending);
      setOverdueReturns(overdue);

      // 5. Agent Leaderboard (This month)
      const agentMap = new Map<string, { name: string, total: number }>();
      completedAgreements.forEach(a => {
        const createdDate = a.created_at.split('T')[0];
        if (createdDate >= startOfMonthStr) {
          const key = a.created_by || a.agent_name || 'Unknown';
          const current = agentMap.get(key) || { name: a.agent_name || 'Unknown', total: 0 };
          current.total += Number(a.total_price || 0);
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

      setLeaderboard(sortedAgents.slice(0, 5));
      setEvents(marketingEvents);
      setBookings(bookings);
      setRecentAgreements(completedAgreements.slice(0, 5));

      // 6. Agent Specific Metrics (Earnings & Chart)
      if (staffRole === 'staff') {
        const tierOverride = currentStaff?.commission_tier_override || 'auto';
        
        const getCommissionForAmount = (a: Agreement, runningTotal: number) => {
          const totalPrice = Number(a.total_price || 0);
          // 1. Use stored commission if available
          if (a.commission_earned !== undefined && a.commission_earned !== null) {
            return Number(a.commission_earned);
          }

          // 2. Use dynamic rate from staff profile
          if (currentStaff?.commission_rate) {
            return totalPrice * (currentStaff.commission_rate / 100);
          }

          // 3. Fallback to tier override if set
          const tierOverride = currentStaff?.commission_tier_override || 'auto';
          if (tierOverride !== 'auto') {
            const rate = tierOverride === 'premium' ? 0.20 : tierOverride === 'prestige' ? 0.25 : 0.30;
            return totalPrice * rate;
          }
          
          // 4. Default tier logic
          const getTotalCommission = (total: number) => {
            if (total <= 5000) return total * 0.20;
            if (total <= 8000) return (5000 * 0.20) + ((total - 5000) * 0.25);
            return (5000 * 0.20) + (3000 * 0.25) + ((total - 8000) * 0.30);
          };

          return getTotalCommission(runningTotal + totalPrice) - getTotalCommission(runningTotal);
        };

        // Calculate Weekly Commissions for last 90 days (Quarterly)
        const weeklyData: { [key: string]: number } = {};
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        // Initialize last 13 weeks (approx 90 days)
        for (let i = 12; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - (i * 7));
          // Find the start of that week (Sunday)
          const weekStart = new Date(d);
          weekStart.setDate(d.getDate() - d.getDay());
          
          const weekNum = Math.ceil(weekStart.getDate() / 7);
          const monthName = monthNames[weekStart.getMonth()];
          const label = `W${weekNum} - ${monthName}`;
          weeklyData[label] = 0;
        }

        // Group agreements by month and sort them by date for progressive calculation
        const monthGroups: { [key: string]: Agreement[] } = {};
        completedAgreements.forEach(a => {
          const monthKey = a.created_at.substring(0, 7);
          if (!monthGroups[monthKey]) monthGroups[monthKey] = [];
          monthGroups[monthKey].push(a);
        });

        let earnedToday = 0;
        let lifetime = 0;
        
        Object.keys(monthGroups).forEach(monthKey => {
          // Sort agreements in this month by created_at
          const monthAgreements = monthGroups[monthKey].sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );

          let runningTotal = 0;
          monthAgreements.forEach(a => {
            const commission = getCommissionForAmount(a, runningTotal);
            runningTotal += Number(a.total_price || 0);
            lifetime += commission;

            if (monthKey === lastMonthKey) {
              lastMonthEarnings += commission;
            }

            const dateStr = a.created_at.split('T')[0];
            if (dateStr === todayStr) {
              earnedToday += commission;
            }

            // Group into weeks for the chart
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
          amount: Number(Number(amount).toFixed(2))
        }));

        setDailyCommissions(chartData);
        setTotalEarnedToday(earnedToday);
        setLastMonthEarnings(lastMonthEarnings);
        setLifetimeEarnings(lifetime);
      }

    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.message || 'An unexpected error occurred while loading dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!subscriberId) return;
      await apiService.addMarketingEvent({
        name: newEvent.name,
        goal_type: newEvent.goal_type,
        target_goal: Number(newEvent.target_goal),
        reward_amount: Number(newEvent.reward_amount),
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
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to add event:', err);
    }
  };

  const formatTimeDiff = (date: Date) => {
    const now = new Date();
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

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center max-w-2xl mx-auto shadow-sm">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-rose-900 mb-3">Unable to Connect to Database</h2>
          <p className="text-rose-700 mb-6 leading-relaxed">{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="px-6 py-2.5 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 transition-colors shadow-sm"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
              {subscriberId === 'superadmin' ? 'Global Fleet Overview' : 
               staffRole === 'admin' ? 'Operational Command Center' : 'Personal Performance Hub'}
            </h1>
            <p className="text-slate-500 mt-2 text-sm">
              Real-time fleet operations, sales analytics, and team performance.
            </p>
          </div>
        </div>

        {staffRole === 'staff' && (
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

                return missions.map((m, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
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
                ));
              })()}
            </div>
          </div>
        )}

        {staffRole === 'staff' && currentStaff && (
          <AgentGamificationWidget 
            salesThisMonth={stats.salesThisMonth}
            commissionTierOverride={currentStaff.commission_tier_override || 'auto'}
            events={events}
            bookings={bookings}
            userId={userId || ''}
          />
        )}

        {/* Top Row: High-Level KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {staffRole === 'staff' ? (
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

                <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-end">
                  <div>
                    <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-1">Current Sales</p>
                    <p className="text-2xl font-bold">{currencyFormatter.format(stats.salesToday)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-1">LIFETIME EARNINGS 🏆</p>
                    <p className="text-2xl font-bold">{currencyFormatter.format(lifetimeEarnings)}</p>
                  </div>
                </div>
              </div>

              {/* Weekly Quarterly Chart */}
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
          ) : (
            <>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-slate-500 text-sm font-medium mb-2">Sales Today</h3>
                <p className="text-3xl font-bold text-slate-900">{currencyFormatter.format(stats.salesToday)}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-slate-500 text-sm font-medium mb-2">Sales This Week</h3>
                <p className="text-3xl font-bold text-slate-900">{currencyFormatter.format(stats.salesThisWeek)}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-slate-500 text-sm font-medium mb-2">Sales This Month</h3>
                <p className="text-3xl font-bold text-slate-900">{currencyFormatter.format(stats.salesThisMonth)}</p>
              </div>
            </>
          )}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-slate-500 text-sm font-medium">Idle Vehicles</h3>
              <Car className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.idleVehicles}</p>
          </div>
        </div>

        {/* Middle Row: The Action Center */}
        {staffRole === 'admin' && (
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
                {pendingDeliveries.length > 0 ? pendingDeliveries.map(delivery => (
                  <div key={delivery.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{delivery.customerName}</p>
                      <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                        <Car className="w-4 h-4" /> {delivery.carPlate}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-900">
                        {delivery.pickupTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                {overdueReturns.length > 0 ? overdueReturns.map(returnItem => (
                  <div key={returnItem.id} className="p-4 hover:bg-rose-50/50 transition-colors flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{returnItem.customerName}</p>
                      <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                        <Car className="w-4 h-4" /> {returnItem.carPlate}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-900">
                        {returnItem.returnTime.toLocaleDateString()} {returnItem.returnTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-xs text-rose-600 font-medium mt-1">
                        Late by {formatTimeDiff(returnItem.returnTime)}
                      </p>
                    </div>
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
        )}

        {/* Recent Earnings Table (Agent Only) */}
        {staffRole === 'staff' && (
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
                        {new Date(agreement.created_at).toLocaleDateString()}
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
        )}

        {/* Bottom Row: Strategy & Team */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pop-Up Events Engine */}
          {staffRole === 'admin' && (
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
                  {events.length > 0 ? events.map(event => {
                    const isActive = new Date(event.start_date) <= new Date() && new Date(event.end_date) >= new Date();
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
                                  fetchDashboardData();
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
                          {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
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
          )}

          {/* Agent Leaderboard (Admin Only) */}
          {staffRole === 'admin' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <h2 className="font-semibold text-slate-900">Agent Leaderboard (This Month)</h2>
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  {leaderboard.length > 0 ? leaderboard.map((agent, idx) => (
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
          )}
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
