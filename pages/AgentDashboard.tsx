import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { parseBookingDate } from '../services/bookingService';
import { getNowMYT, utcToMyt } from '../utils/dateUtils';
import { 
  Car, DollarSign, AlertTriangle, 
  TrendingUp, Clock, ArrowRight, CheckCircle2,
  Wallet, BarChart3, ListTodo, X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Agreement, Booking, MarketingEvent } from '../types';
import { AgentGamificationWidget } from '../components/AgentGamificationWidget';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell 
} from 'recharts';

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
  
  const [stats, setStats] = useState({
    salesToday: 0,
    salesThisWeek: 0,
    salesThisMonth: 0,
    idleVehicles: 0,
  });
  
  const [pendingDeliveries, setPendingDeliveries] = useState<PendingDelivery[]>([]);
  const [overdueReturns, setOverdueReturns] = useState<OverdueReturn[]>([]);
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
  
  const [confirmReturnId, setConfirmReturnId] = useState<string | null>(null);
  const [isConfirmingReturn, setIsConfirmingReturn] = useState(false);

  const currencyFormatter = new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
  });

  useEffect(() => {
    if (subscriberId) {
      fetchDashboardData();
    }
  }, [subscriberId, userId, userUid]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const agentId = userId || undefined;
      const createdBy = ([userUid, userId].filter(Boolean) as string[]);

      const [allBookings, cars, agreements, marketingEvents, members, staffMembers] = await Promise.all([
        apiService.getBookings(subscriberId!),
        apiService.getCars(subscriberId!),
        apiService.getAgreements(subscriberId!, agentId, createdBy),
        apiService.getMarketingEvents(subscriberId!),
        apiService.getMembers(subscriberId!),
        apiService.getStaffMembers(subscriberId!)
      ]);

      if (userUid) {
        const staff = staffMembers.find(s => s.staff_uid === userUid);
        setCurrentStaff(staff || null);
      }

      const now = getNowMYT();
      const todayStr = format(now, 'yyyy-MM-dd');
      
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const startOfWeekStr = format(startOfWeek, 'yyyy-MM-dd');
      
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfMonthStr = format(startOfMonth, 'yyyy-MM-dd');

      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthKey = format(lastMonth, 'yyyy-MM');
      let lastMonthEarnings = 0;

      // 1. Sales Metrics (Completed/Signed Agreements)
      const completedAgreements = agreements.filter(a => {
        const status = a.status?.toLowerCase().trim();
        return status === 'completed' || (status === 'signed' && !!a.payment_receipt);
      });
      
      let salesToday = 0;
      let salesThisWeek = 0;
      let salesThisMonth = 0;
      
      completedAgreements.forEach(a => {
        const createdDate = a.created_at.split('T')[0];
        const price = a.total_price || 0;
        if (createdDate === todayStr) salesToday += price;
        if (createdDate >= startOfWeekStr) salesThisWeek += price;
        if (createdDate >= startOfMonthStr) salesThisMonth += price;
      });

      // 2. Idle Vehicles
      const activeCars = cars.filter(c => c.status === 'active');
      const carsOnRentToday = allBookings.filter(b => {
        const start = utcToMyt(parseBookingDate(b.start_date, b.pickup_time));
        const end = b.end_time ? utcToMyt(b.end_time) : new Date(start.getTime() + b.duration_days * 24 * 60 * 60 * 1000);
        return start <= now && end >= now && b.status !== 'cancelled';
      }).map(b => b.car_id);
      
      const uniqueCarsOnRent = new Set(carsOnRentToday);
      const idleVehicles = activeCars.length - uniqueCarsOnRent.size;

      setStats({
        salesToday,
        salesThisWeek,
        salesThisMonth,
        idleVehicles: Math.max(0, idleVehicles)
      });

      // 3. Pending Deliveries & Overdue Returns
      const pending: PendingDelivery[] = [];
      const overdue: OverdueReturn[] = [];

      const filteredBookings = allBookings.filter(b => b.agent_id === userId || b.created_by === userUid || b.created_by === userId);

      filteredBookings.forEach(b => {
        if (b.status === 'cancelled') return;
        
        const start = utcToMyt(parseBookingDate(b.start_date, b.pickup_time));
        const end = b.end_time ? utcToMyt(b.end_time) : new Date(start.getTime() + b.duration_days * 24 * 60 * 60 * 1000);
        const car = cars.find(c => c.id === b.car_id);
        const member = members.find(m => m.id === b.member_id);
        
        if (format(start, 'yyyy-MM-dd') === todayStr && start > now) {
          pending.push({
            id: b.id,
            carPlate: car?.plate || 'Unknown',
            customerName: member?.name || 'Unknown',
            pickupTime: start
          });
        }
        
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
      setEvents(marketingEvents);
      setBookings(allBookings);
      setRecentAgreements(completedAgreements.slice(0, 5));

      // 4. Agent Specific Metrics (Earnings & Chart)
      const getCommissionForAmount = (a: Agreement, runningTotal: number) => {
        const totalPrice = a.total_price || 0;
        if (a.commission_earned !== undefined && a.commission_earned !== null) {
          return a.commission_earned;
        }
        if (currentStaff?.commission_rate) {
          return totalPrice * (currentStaff.commission_rate / 100);
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
          const commission = getCommissionForAmount(a, runningTotal);
          runningTotal += (a.total_price || 0);
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
        amount: Number(amount.toFixed(2))
      }));

      setDailyCommissions(chartData);
      setTotalEarnedToday(earnedToday);
      setLastMonthEarnings(lastMonthEarnings);
      setLifetimeEarnings(lifetime);

    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.message || 'An unexpected error occurred while loading dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReturn = async (id: string) => {
    try {
      if (!subscriberId) return;
      setIsConfirmingReturn(true);
      await apiService.updateBookingStatus(id, subscriberId, 'completed');
      setConfirmReturnId(null);
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to confirm return:', err);
      alert('Failed to confirm return. Please try again.');
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

              <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-end">
                <div>
                  <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-1">Monthly Sales</p>
                  <p className="text-2xl font-bold">{currencyFormatter.format(stats.salesThisMonth)}</p>
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
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-slate-500 text-sm font-medium">Idle Vehicles</h3>
              <Car className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.idleVehicles}</p>
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
                      {format(new Date(agreement.created_at), 'dd/MM/yyyy')}
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
      </div>
    </div>
  );
};

export default AgentDashboard;
