import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { 
  Users, 
  Car, 
  CalendarCheck, 
  DollarSign, 
  FileText, 
  AlertTriangle, 
  TrendingUp, 
  Clock,
  ArrowRight
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { Agreement, DigitalForm } from '../types';

interface AgentStat {
  name: string;
  total: number;
  percentage: number;
}

const AdminDashboard: React.FC = () => {
  const { subscriberId, staffRole, userId, userUid } = useAuth();
  
  const [stats, setStats] = useState({
    totalSales: 0,
    todayOrders: 0,
    idleVehicles: 0,
    newFormsToday: 0
  });
  const [leaderboard, setLeaderboard] = useState<AgentStat[]>([]);
  const [recentForms, setRecentForms] = useState<DigitalForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (subscriberId) {
      fetchDashboardData();
    }
  }, [subscriberId, staffRole, userId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const agentId = staffRole === 'staff' ? userId || undefined : undefined;

      const [bookings, cars, agreements, forms] = await Promise.all([
        apiService.getBookings(subscriberId!, undefined, undefined, agentId),
        apiService.getCars(subscriberId!),
        apiService.getAgreements(subscriberId!, agentId),
        apiService.getDigitalForms(subscriberId!, agentId)
      ]);

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      // 1. Total Sales
      const totalSales = agreements.reduce((sum, a) => sum + a.total_price, 0);

      // 2. Today's Orders
      const todayOrders = bookings.filter(b => b.start.startsWith(todayStr)).length;

      // 3. Idle Vehicles
      const activeCars = cars.filter(c => c.status === 'active');
      const carsOnRentToday = bookings.filter(b => {
        const start = new Date(b.start);
        const end = new Date(start.getTime() + b.duration * 24 * 60 * 60 * 1000);
        return start <= now && end >= now && b.status !== 'cancelled';
      }).map(b => b.carId);
      
      const uniqueCarsOnRent = new Set(carsOnRentToday);
      const idleVehicles = activeCars.length - uniqueCarsOnRent.size;

      // 4. New Forms Created Today
      const newFormsToday = forms.filter(f => f.created_at.startsWith(todayStr)).length;

      setStats({
        totalSales,
        todayOrders,
        idleVehicles: Math.max(0, idleVehicles),
        newFormsToday
      });

      // Leaderboard Logic
      const agentMap = new Map<string, { name: string, total: number }>();
      agreements.forEach(a => {
        const key = a.created_by || a.agent_name || 'Unknown';
        const current = agentMap.get(key) || { name: a.agent_name || 'Unknown', total: 0 };
        current.total += a.total_price;
        agentMap.set(key, current);
      });

      const sortedAgents = Array.from(agentMap.values())
        .map(({ name, total }) => ({
          name,
          total,
          percentage: totalSales > 0 ? (total / totalSales) * 100 : 0
        }))
        .sort((a, b) => b.total - a.total);

      setLeaderboard(sortedAgents.slice(0, 5));

      // Recent Forms
      setRecentForms(forms.slice(0, 5));

    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.message || 'An unexpected error occurred while loading dashboard data.');
    } finally {
      setLoading(false);
    }
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
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
              {subscriberId === 'superadmin' ? 'Global Fleet Overview' : 
               staffRole === 'admin' ? 'Executive Command Center' : 'Personal Performance Hub'}
            </h1>
            <p className="text-slate-500 mt-2 text-sm">
              {subscriberId === 'superadmin' ? 'Monitoring all platform subscribers and fleet performance.' : 
               staffRole === 'admin' ? 'Real-time fleet performance and sales analytics.' : 'Your personal sales and activity overview.'}
            </p>
          </div>
        </div>

        {/* Top Row: The Daily Pulse */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Sales */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-slate-700" />
              </div>
              <div className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium">
                Live
              </div>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">
              {staffRole === 'admin' ? 'Total Sales' : 'My Total Sales'}
            </h3>
            <p className="text-2xl font-semibold text-slate-900 mt-1">
              RM {stats.totalSales.toLocaleString()}
            </p>
          </div>

          {/* Today's Orders */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center">
                <CalendarCheck className="w-5 h-5 text-slate-700" />
              </div>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">
              {staffRole === 'admin' ? "Today's Orders" : "My Orders Today"}
            </h3>
            <p className="text-2xl font-semibold text-slate-900 mt-1">{stats.todayOrders}</p>
          </div>

          {/* Idle Vehicles - Only for Admin */}
          {staffRole === 'admin' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center">
                  <Car className={`w-5 h-5 ${stats.idleVehicles > 0 ? 'text-amber-500' : 'text-slate-700'}`} />
                </div>
                {stats.idleVehicles > 0 && (
                  <div className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium animate-pulse">
                    Alert
                  </div>
                )}
              </div>
              <h3 className="text-slate-500 text-sm font-medium">Idle Vehicles</h3>
              <p className={`text-2xl font-semibold mt-1 ${stats.idleVehicles > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                {stats.idleVehicles}
              </p>
            </div>
          )}

          {/* New Forms Created */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-slate-700" />
              </div>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">
              {staffRole === 'admin' ? 'Forms Today' : 'My Forms Today'}
            </h3>
            <p className="text-2xl font-semibold text-slate-900 mt-1">{stats.newFormsToday}</p>
          </div>

          {/* Subscriber Manager (Superadmin only) */}
          {subscriberId === 'superadmin' && (
            <Link to="/subscribers" className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm group hover:bg-slate-800 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <ArrowRight className="w-5 h-5 text-white/60 group-hover:translate-x-1 transition-transform" />
              </div>
              <div>
                <h3 className="text-white/80 text-sm font-medium">Platform Control</h3>
                <p className="text-2xl font-semibold text-white mt-1">Subscriber Manager</p>
              </div>
            </Link>
          )}
        </div>

        {/* Bottom Row: Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel: Agent Sales Leaderboard (Admin only) */}
          {staffRole === 'admin' ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-slate-700" />
                  <h2 className="font-semibold text-slate-900">Agent Sales Leaderboard</h2>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  {leaderboard.length > 0 ? leaderboard.map((agent, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{agent.name}</p>
                          <p className="text-xs text-slate-500">Agent ID: {idx + 101}</p>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">RM {agent.total.toLocaleString()}</p>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-slate-900 rounded-full transition-all duration-1000" 
                          style={{ width: `${agent.percentage}%` }}
                        />
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-12 flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                        <TrendingUp className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-slate-500 text-sm font-medium">No sales data recorded yet.</p>
                      <p className="text-slate-400 text-xs mt-1">Sales will appear here once agreements are created.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Agent View: Personal Progress */
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-slate-700" />
                  <h2 className="font-semibold text-slate-900">My Sales Progress</h2>
                </div>
              </div>
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-slate-50 text-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Keep it up!</h3>
                <p className="text-slate-500 max-w-xs mx-auto text-sm">
                  You have generated <span className="font-semibold text-slate-900">RM {stats.totalSales.toLocaleString()}</span> in sales so far.
                </p>
              </div>
            </div>
          )}

          {/* Right Panel: Recent Form History */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-slate-700" />
                <h2 className="font-semibold text-slate-900">
                  {staffRole === 'admin' ? 'Recent Form History' : 'My Recent Forms'}
                </h2>
              </div>
              <Link to="/forms" className="text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-3 text-xs font-medium text-slate-500">Customer</th>
                    <th className="px-6 py-3 text-xs font-medium text-slate-500">Status</th>
                    <th className="px-6 py-3 text-xs font-medium text-slate-500 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentForms.length > 0 ? recentForms.map((form) => (
                    <tr key={form.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-900">{form.customer_name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {new Date(form.created_at).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          form.status === 'signed' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {form.status.charAt(0).toUpperCase() + form.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-sm font-semibold text-slate-900">RM {form.total_price.toLocaleString()}</p>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                            <FileText className="w-6 h-6 text-slate-400" />
                          </div>
                          <p className="text-slate-500 text-sm font-medium">No forms found.</p>
                          <p className="text-slate-400 text-xs mt-1">Recent digital forms will appear here.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
