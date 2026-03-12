import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { Users, Car, Calendar, DollarSign, FileText, AlertTriangle } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const { companyId, subscriptionTier, staffRole } = useAuth();
  const [stats, setStats] = useState({
    activeBookings: 0,
    totalCustomers: 0,
    fleetAlerts: 0,
    totalRevenue: 0,
    formsSubmitted: 0 // Placeholder for future forms feature
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (companyId) {
      fetchDashboardData();
    }
  }, [companyId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [bookings, members, cars, expenses] = await Promise.all([
        apiService.getBookings(companyId!),
        apiService.getMembers(companyId!),
        apiService.getCars(companyId!),
        apiService.getExpenses(companyId!)
      ]);

      const now = new Date();
      
      // Calculate active bookings (currently ongoing)
      const activeBookingsCount = bookings.filter(b => {
        const start = new Date(b.start);
        const end = new Date(start.getTime() + b.duration * 24 * 60 * 60 * 1000);
        return start <= now && end >= now && b.status !== 'cancelled';
      }).length;

      // Calculate total revenue from bookings (simplified)
      const revenue = bookings.reduce((sum, b) => sum + (b.total_price || 0), 0);

      // Calculate fleet alerts (cars needing service or with issues)
      const alertsCount = cars.filter(c => c.status === 'maintenance' || c.status === 'inactive').length;

      setStats({
        activeBookings: activeBookingsCount,
        totalCustomers: members.length,
        fleetAlerts: alertsCount,
        totalRevenue: revenue,
        formsSubmitted: 0 // Placeholder
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
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

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-2">Welcome back. Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Tier 1 & 3 Cards */}
        {(subscriptionTier === 'tier_1' || subscriptionTier === 'tier_3') && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">Active Bookings</h3>
            <p className="text-3xl font-bold text-slate-900 mt-1">{stats.activeBookings}</p>
          </div>
        )}

        {/* Tier 2 & 3 Cards */}
        {(subscriptionTier === 'tier_2' || subscriptionTier === 'tier_3') && (
          <>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
              <h3 className="text-slate-500 text-sm font-medium">Forms Submitted</h3>
              <p className="text-3xl font-bold text-slate-900 mt-1">{stats.formsSubmitted}</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <h3 className="text-slate-500 text-sm font-medium">Total Customers</h3>
              <p className="text-3xl font-bold text-slate-900 mt-1">{stats.totalCustomers}</p>
            </div>
          </>
        )}

        {/* Tier 3 Cards */}
        {subscriptionTier === 'tier_3' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">Fleet Alerts</h3>
            <p className="text-3xl font-bold text-slate-900 mt-1">{stats.fleetAlerts}</p>
          </div>
        )}

        {/* Admin Only Cards */}
        {staffRole === 'admin' && (subscriptionTier === 'tier_2' || subscriptionTier === 'tier_3') && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">Total Revenue</h3>
            <p className="text-3xl font-bold text-slate-900 mt-1">${stats.totalRevenue.toLocaleString()}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Welcome to your new Workspace</h2>
        <p className="text-slate-500 max-w-md mx-auto">
          Select an option from the sidebar to get started. Your available features depend on your current subscription tier.
        </p>
      </div>
    </div>
  );
};

export default AdminDashboard;
