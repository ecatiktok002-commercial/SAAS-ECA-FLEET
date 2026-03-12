import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { Car } from '../types';
import { Shield, AlertTriangle, CheckCircle, Clock, Car as CarIcon } from 'lucide-react';

const FleetGuardianPage: React.FC = () => {
  const { companyId } = useAuth();
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (companyId) {
      fetchCars();
    }
  }, [companyId]);

  const fetchCars = async () => {
    try {
      setLoading(true);
      const data = await apiService.getCars(companyId!);
      setCars(data);
    } catch (error) {
      console.error('Failed to fetch cars:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeAlerts = cars.filter(c => c.status === 'maintenance' || c.status === 'inactive');

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Fleet Guardian</h1>
          <p className="text-slate-500 mt-2">Monitor vehicle health, maintenance, and alerts.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl font-bold border border-amber-200">
          <AlertTriangle className="w-5 h-5" />
          {activeAlerts.length} Active Alerts
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <CarIcon className="w-8 h-8" />
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Total Vehicles</h3>
          <p className="text-4xl font-black text-slate-900 mt-2">{cars.length}</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Active & Healthy</h3>
          <p className="text-4xl font-black text-slate-900 mt-2">{cars.filter(c => c.status === 'active').length}</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-4">
            <Clock className="w-8 h-8" />
          </div>
          <h3 className="text-slate-500 text-sm font-medium">In Maintenance</h3>
          <p className="text-4xl font-black text-slate-900 mt-2">{cars.filter(c => c.status === 'maintenance').length}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Vehicle Status Board</h2>
        </div>
        
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-amber-600 rounded-full animate-spin"></div>
          </div>
        ) : cars.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vehicle</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Plate Number</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cars.map(car => (
                  <tr key={car.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                          <CarIcon className="w-5 h-5 text-slate-600" />
                        </div>
                        <div className="font-bold text-slate-900">{car.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono">{car.plate || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        car.status === 'active' ? 'bg-green-100 text-green-800' :
                        car.status === 'maintenance' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {car.status ? car.status.charAt(0).toUpperCase() + car.status.slice(1) : 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-amber-600 hover:text-amber-900 font-medium text-sm">Log Maintenance</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500">
            <Shield className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p>No vehicles found in the fleet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FleetGuardianPage;
