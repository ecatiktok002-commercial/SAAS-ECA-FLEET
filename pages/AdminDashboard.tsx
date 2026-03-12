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
  const { companyId } = useAuth();
  
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
    if (companyId) {
      fetchDashboardData();
    }
  }, [companyId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [bookings, cars, agreements, forms] = await Promise.all([
        apiService.getBookings(companyId!),
        apiService.getCars(companyId!),
        apiService.getAgreements(companyId!),
        apiService.getDigitalForms(companyId!)
      ]);

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      // 1. Total Sales
      const totalSales = agreements.reduce((sum, a) => sum + a.amount, 0);

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
      const agentMap = new Map<string, number>();
      agreements.forEach(a => {
        const current = agentMap.get(a.agent_name) || 0;
        agentMap.set(a.agent_name, current + a.amount);
      });

      const sortedAgents = Array.from(agentMap.entries())
        .map(([name, total]) => ({
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
            className="px-8 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20 active:scale-[0.98]"
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
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Executive Command Center</h1>
          <p className="text-slate-500 mt-1 font-medium">Real-time fleet performance and sales analytics.</p>
        </div>

        {/* Top Row: The Daily Pulse */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Sales */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                Live
              </div>
            </div>
            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">Total Sales</h3>
            <p className="text-3xl font-black text-emerald-600 mt-1">
              RM {stats.totalSales.toLocaleString()}
            </p>
          </div>

          {/* Today's Orders */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <CalendarCheck className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">Today's Orders</h3>
            <p className="text-3xl font-black text-slate-900 mt-1">{stats.todayOrders}</p>
          </div>

          {/* Idle Vehicles */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center">
                <Car className={`w-6 h-6 ${stats.idleVehicles > 0 ? 'text-orange-500' : 'text-slate-600'}`} />
              </div>
              {stats.idleVehicles > 0 && (
                <div className="px-2 py-1 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-bold uppercase tracking-wider animate-pulse">
                  Alert
                </div>
              )}
            </div>
            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">Idle Vehicles</h3>
            <p className={`text-3xl font-black mt-1 ${stats.idleVehicles > 0 ? 'text-orange-600' : 'text-slate-900'}`}>
              {stats.idleVehicles}
            </p>
          </div>

          {/* New Forms Created */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">Forms Today</h3>
            <p className="text-3xl font-black text-slate-900 mt-1">{stats.newFormsToday}</p>
          </div>
        </div>

        {/* Bottom Row: Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel: Agent Sales Leaderboard */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <h2 className="font-bold text-slate-800">Agent Sales Leaderboard</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {leaderboard.length > 0 ? leaderboard.map((agent, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{agent.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Agent ID: {idx + 101}</p>
                      </div>
                      <p className="text-sm font-black text-slate-900">RM {agent.total.toLocaleString()}</p>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                        style={{ width: `${agent.percentage}%` }}
                      />
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-12">
                    <p className="text-slate-400 text-sm">No sales data recorded yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Recent Form History */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-600" />
                <h2 className="font-bold text-slate-800">Recent Form History</h2>
              </div>
              <Link to="/forms" className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Customer</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentForms.length > 0 ? recentForms.map((form) => (
                    <tr key={form.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900">{form.customer_name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {new Date(form.created_at).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          form.status === 'signed' 
                            ? 'bg-emerald-50 text-emerald-600' 
                            : 'bg-amber-50 text-amber-600'
                        }`}>
                          {form.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-sm font-black text-slate-900">RM {form.amount.toLocaleString()}</p>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-400 text-sm">
                        No forms found.
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
