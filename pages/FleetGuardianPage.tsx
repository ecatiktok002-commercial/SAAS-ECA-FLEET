import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, Search, Car as CarIcon, 
  ShieldCheck, AlertTriangle, Edit, MoreHorizontal, CheckCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Car, CarStatus, ExpiryStatus } from '../types';
import { getNowMYT } from '../utils/dateUtils';
import * as Storage from '../services/storageService';
import CarForm from '../components/CarForm';

interface UsageHistory {
  month: string;
  km: number;
}

const FleetGuardianPage: React.FC = () => {
  const { subscriberId, userId } = useAuth();
  
  // --- 1. PLACEMENT: STATE DECLARATIONS ---
  const [cars, setCars] = useState<Car[]>([]);
  const [usageHistory, setUsageHistory] = useState<Record<string, UsageHistory[]>>({});
  const [utilizationRates, setUtilizationRates] = useState<Record<string, number>>({}); // New State
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);

  // --- 2. PLACEMENT: UPDATED LOAD FUNCTION ---
  const loadFleet = useCallback(async () => {
    if (!subscriberId) return;
    setIsLoading(true);
    try {
      // Fetch Cars
      const loadedCars = await Storage.getCars(subscriberId);
      setCars(loadedCars || []);

      // Fetch Mileage Usage
      const { data: rawUsage } = await Storage.supabase
        .from('car_monthly_usage')
        .select('car_id, total_usage_km, usage_month')
        .eq('subscriber_id', subscriberId)
        .order('usage_month', { ascending: false });

      if (rawUsage) {
        const historyMap: Record<string, UsageHistory[]> = {};
        rawUsage.forEach(item => {
          if (!item.car_id) return;
          if (!historyMap[item.car_id]) historyMap[item.car_id] = [];
          historyMap[item.car_id].push({
            month: new Date(item.usage_month).toLocaleString('default', { month: 'short' }),
            km: item.total_usage_km || 0
          });
        });
        setUsageHistory(historyMap);
      }

      // --- NEW: Fetch Real Utilization Rates ---
      const { data: utilData } = await Storage.supabase
        .from('car_utilization_stats')
        .select('car_id, utilization_rate')
        .eq('subscriber_id', subscriberId);

      if (utilData) {
        const utilMap = utilData.reduce((acc, curr) => ({
          ...acc, [curr.car_id]: curr.utilization_rate
        }), {});
        setUtilizationRates(utilMap);
      }

    } catch (err) {
      console.error("Fleet Load Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [subscriberId]);

  useEffect(() => {
    loadFleet();
  }, [loadFleet]);

  // Status Color Logic
  const getStatus = (dateStr: string | undefined): 'active' | 'warning' | 'expired' => {
    if (!dateStr || dateStr === 'Not Set') return 'active';
    const today = getNowMYT();
    const target = new Date(dateStr);
    if (isNaN(target.getTime())) return 'active';
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'expired';
    if (diff <= 30) return 'warning';
    return 'active';
  };

  const handleReset = async (car: Car) => {
    if (!subscriberId) return;
    try {
      setIsLoading(true);
      const { apiService } = await import('../services/apiService');
      await apiService.completeVehicleService(
        car.id, 
        car.next_service_mileage || 0, 
        car.service_interval || 10000
      );
      
      // Log the action
      if (userId) {
        await apiService.addLog({
          userId: userId,
          action: 'Updated',
          details: `Completed service for car ${car.plateNumber || car.plate}. Next service at ${(car.next_service_mileage || 0) + (car.service_interval || 10000)} km`
        }, subscriberId);
      }
      
      await loadFleet();
    } catch (error) {
      console.error('Error resetting service:', error);
      alert('Failed to reset service. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCars = useMemo(() => {
    const list = Array.isArray(cars) ? cars : [];
    return list.filter(c => 
      (c.plateNumber || c.plate || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.make || c.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => (a.roadtaxExpiry || '9999').localeCompare(b.roadtaxExpiry || '9999'));
  }, [cars, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-sm">
              <CarIcon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Fleet Guardian</h1>
          </div>
          <button onClick={() => { setEditingCar(null); setShowForm(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all active:scale-95">
            <Plus className="w-4 h-4" /> Add Vehicle
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <section className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-slate-800">Active Fleet</h2>
          <div className="w-full md:w-80 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" placeholder="Search plate or model..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCars.map(car => {
            const rtStatus = getStatus(car.roadtaxExpiry);
            const insStatus = getStatus(car.insuranceExpiry);
            const mtdUsage = (usageHistory[car.id] && usageHistory[car.id][0]) ? usageHistory[car.id][0].km : 0;

            return (
              <div key={car.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{car.make || car.name} {car.model}</h3>
                    <p className="text-xs font-mono font-bold text-slate-400 mt-0.5 uppercase tracking-wider">{car.plateNumber || car.plate}</p>
                  </div>
                  <button onClick={() => { setEditingCar(car); setShowForm(true); }} className="p-1.5 text-slate-300 hover:text-blue-600 transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                </div>

                {/* --- 3. PLACEMENT: UPDATED UTILIZATION BLOCK --- */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Usage (MTD)</span>
                    <span className="text-xl font-bold text-slate-900">{mtdUsage} <span className="text-[10px] text-slate-400">KM</span></span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Utilization</span>
                    <span className="text-xl font-bold text-slate-900">
                      {utilizationRates[car.id] || 0}<span className="text-[10px] text-slate-400 ml-0.5">%</span>
                    </span>
                  </div>
                </div>

                {/* --- 4. PLACEMENT: UPDATED EXPIRY ROWS --- */}
                <div className="space-y-3">
                  {[
                    { label: 'Road Tax', date: car.roadtaxExpiry, status: rtStatus, Icon: ShieldCheck },
                    { label: 'Insurance', date: car.insuranceExpiry, status: insStatus, Icon: AlertTriangle }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-2">
                        <item.Icon className={`w-3.5 h-3.5 ${item.status === 'active' ? 'text-emerald-500' : item.status === 'warning' ? 'text-amber-500' : 'text-rose-500'}`} />
                        <span className="text-xs font-semibold text-slate-600">{item.label}</span>
                      </div>
                      <span className={`text-xs font-bold ${
                        item.status === 'active' ? 'text-emerald-600' : 
                        item.status === 'warning' ? 'text-amber-600' : 'text-rose-600'
                      }`}>
                        {item.date || 'Not Set'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Maintenance Section - Only show if baseline is set */}
                {car.next_service_mileage && car.next_service_mileage > 0 ? (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Current Mileage Snapshot</span>
                        <span className="text-lg font-bold text-slate-900">{car.current_mileage || 0} <span className="text-[10px] text-slate-400">KM</span></span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Next Service</span>
                        <span className="text-sm font-bold text-slate-600">{car.next_service_mileage} <span className="text-[10px] text-slate-400">KM</span></span>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-3">
                      <div 
                        className={`h-full transition-all ${
                          ((car.current_mileage || 0) / car.next_service_mileage) > 1 ? 'bg-rose-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(((car.current_mileage || 0) / car.next_service_mileage) * 100, 100)}%` }}
                      />
                    </div>

                    {/* Only show the Reset button if service is needed or already in maintenance */}
                    {(car.current_mileage || 0) >= (car.next_service_mileage - 500) && (
                      <button
                        onClick={() => handleReset(car)}
                        className="w-full py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold shadow-sm hover:bg-rose-100 flex items-center justify-center gap-2 animate-pulse ring-2 ring-rose-500/20"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        CONFIRM SERVICE COMPLETED
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Maintenance Baseline Not Set</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {showForm && (
        <CarForm 
          initialData={editingCar} 
          onSave={async (data) => {
            if (editingCar) await Storage.updateCar(data, subscriberId!);
            else await Storage.addCar(data, subscriberId!);
            setShowForm(false);
            loadFleet();
          }} 
          onCancel={() => setShowForm(false)} 
        />
      )}
    </div>
  );
};

export default FleetGuardianPage;