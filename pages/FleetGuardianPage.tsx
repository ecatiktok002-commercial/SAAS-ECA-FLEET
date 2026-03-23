import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Car as CarIcon, AlertCircle, CheckCircle2, Trash2, Edit, Search, Lock, MapPin, History } from 'lucide-react';
import { Car, CarStatus, ExpiryStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { getNowMYT } from '../utils/dateUtils';
import * as Storage from '../services/storageService';
import CarForm from '../components/CarForm';
import AlertModal from '../components/AlertModal';

interface UsageHistory {
  month: string;
  km: number;
}

const FleetGuardianPage: React.FC = () => {
  const { subscriberId, subscriptionTier } = useAuth();
  const location = useLocation();
  const isVehiclesPath = location.pathname === '/vehicles';
  const isTier3 = subscriptionTier === 'tier_3';
  const showGuardianFeatures = isTier3 || !isVehiclesPath;
  
  // State
  const [cars, setCars] = useState<Car[]>([]);
  const [usageHistory, setUsageHistory] = useState<Record<string, UsageHistory[]>>({});
  const [showForm, setShowForm] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [urgentAlerts, setUrgentAlerts] = useState<{ car: Car; status: CarStatus }[]>([]);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // 1. Calculate Expiry Status
  const calculateStatus = useCallback((dateStr: string | undefined, type: ExpiryStatus['type']): ExpiryStatus => {
    if (!dateStr || dateStr === 'Not Set') return { type, daysRemaining: 0, status: 'good', date: 'Not Set' };
    try {
      const today = getNowMYT();
      today.setHours(0, 0, 0, 0);
      const target = new Date(dateStr);
      if (isNaN(target.getTime())) return { type, daysRemaining: 0, status: 'good', date: 'Invalid' };
      target.setHours(0, 0, 0, 0);
      const diffTime = target.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      let status: ExpiryStatus['status'] = 'good';
      if (daysRemaining < 0) status = 'expired';
      else if (daysRemaining <= 30) status = 'warning';
      return { type, daysRemaining, status, date: dateStr };
    } catch { return { type, daysRemaining: 0, status: 'good', date: 'Error' }; }
  }, []);

  const getCarStatus = useCallback((car: Car): CarStatus => ({
    roadtax: calculateStatus(car.roadtaxExpiry, 'roadtax'),
    insurance: calculateStatus(car.insuranceExpiry, 'insurance'),
    inspection: calculateStatus(car.inspectionExpiry, 'inspection'),
  }), [calculateStatus]);

  // 2. Load Data
  useEffect(() => {
    const loadData = async () => {
      if (!subscriberId) return;
      setIsLoading(true);
      try {
        const loadedCars = await Storage.getCars(subscriberId);
        setCars(loadedCars || []);

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
            const date = new Date(item.usage_month);
            historyMap[item.car_id].push({
              month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
              km: Math.max(0, item.total_usage_km || 0)
            });
          });
          setUsageHistory(historyMap);
        }
      } catch (err: any) { setDbError(err.message); } finally { setIsLoading(false); }
    };
    loadData();
  }, [subscriberId]);

  // 3. --- FIX: Added Missing Handlers ---
  const handleSaveCar = async (car: Car) => {
    if (!subscriberId) return;
    setIsLoading(true);
    try {
      if (editingCar) {
        await Storage.updateCar(car, subscriberId);
      } else {
        await Storage.addCar(car, subscriberId);
      }
      setShowForm(false);
      setEditingCar(null);
      // Reload cars to reflect changes
      const updatedCars = await Storage.getCars(subscriberId);
      setCars(updatedCars || []);
    } catch (err: any) {
      alert(`Error saving vehicle: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCar = async (id: string) => {
    if (!subscriberId) return;
    setIsLoading(true);
    try {
      await Storage.deleteCar(id, subscriberId);
      setShowDeleteConfirm(null);
      setCars(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      alert(`Error deleting vehicle: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Sorting Logic (Oldest Expiry First)
  const sortedCars = useMemo(() => {
    let filtered = [...cars];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        (c.plateNumber || c.plate || '').toLowerCase().includes(term) || 
        (c.make || c.name || '').toLowerCase().includes(term)
      );
    }
    return filtered.sort((a, b) => (a.roadtaxExpiry || '9999-12-31').localeCompare(b.roadtaxExpiry || '9999-12-31'));
  }, [cars, searchTerm]);

  const renderStatusBadge = (status: ExpiryStatus) => (
    <div className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-tighter ${
      status.status === 'expired' ? 'text-rose-600 bg-rose-50 border border-rose-100' : 
      status.status === 'warning' ? 'text-amber-600 bg-amber-50 border border-amber-100' : 
      'text-emerald-600 bg-emerald-50 border border-emerald-100'
    }`}>
      {status.status === 'expired' ? 'Expired' : 'Active'}
    </div>
  );

  return (
    <div className="min-h-screen bg-white pb-20 font-sans">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30 px-6 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 p-3 rounded-2xl shadow-xl shadow-slate-100">
              <CarIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase italic">Fleet Guardian</h1>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto flex-1 md:max-w-xl">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text" placeholder="Search vehicle..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400" 
              />
            </div>
            <button 
              onClick={() => { setEditingCar(null); setShowForm(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-2xl shadow-lg transition-all active:scale-95"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedCars.map(car => {
            const status = getCarStatus(car);
            const history = usageHistory[car.id] || [];
            const activeMonthKm = history[0]?.km || 0;

            return (
              <div key={car.id} className="bg-white border border-slate-100 rounded-[2.5rem] p-7 hover:shadow-2xl hover:border-blue-100 transition-all group flex flex-col">
                {/* 1. Vehicle Identity */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 leading-tight tracking-tight uppercase italic">{car.make || car.name} {car.model}</h3>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-[0.2em]">{car.plateNumber || car.plate}</p>
                  </div>
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-200 group-hover:text-blue-500 group-hover:bg-blue-50 transition-all">
                    <CarIcon className="w-5 h-5" />
                  </div>
                </div>

                {/* 2. Usage Section (Current + History) */}
                <div className="space-y-3 mb-8">
                  <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100/50">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-3 h-3 text-blue-500" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">MTD Usage</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900 tabular-nums">{activeMonthKm}</span>
                      <span className="text-xs font-bold text-slate-400 uppercase">KM</span>
                    </div>
                  </div>

                  {/* History List */}
                  {history.length > 1 && (
                    <div className="px-4 py-3 bg-white border border-slate-100 rounded-2xl space-y-2 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <History className="w-2.5 h-2.5 text-slate-300" />
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Performance History</span>
                      </div>
                      {history.slice(1, 4).map((h, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">{h.month}</span>
                          <span className="text-[10px] font-black text-slate-800">{h.km} KM</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Status Rows */}
                <div className="space-y-3.5 flex-1">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Road Tax</span>
                    <div className="flex items-center gap-2">
                       <span className="text-[9px] font-bold text-slate-500">{status.roadtax.date}</span>
                       {renderStatusBadge(status.roadtax)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Insurance</span>
                    <div className="flex items-center gap-2">
                       <span className="text-[9px] font-bold text-slate-500">{status.insurance.date}</span>
                       {renderStatusBadge(status.insurance)}
                    </div>
                  </div>
                </div>

                {/* 4. Action Icons */}
                <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-end gap-2">
                  <button 
                    onClick={() => { setEditingCar(car); setShowForm(true); }}
                    className="p-3 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm(car.id)}
                    className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Modals */}
      {showForm && <CarForm initialData={editingCar} onSave={handleSaveCar} onCancel={() => setShowForm(false)} />}
      {showAlertModal && <AlertModal alerts={urgentAlerts} onClose={() => setShowAlertModal(false)} />}
      
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-slate-900 text-center tracking-tight">Delete Vehicle?</h3>
            <p className="text-slate-500 text-center mt-3 font-medium">Historical records will be lost.</p>
            <div className="flex flex-col gap-3 mt-8">
              <button onClick={() => handleDeleteCar(showDeleteConfirm)} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-rose-700 shadow-lg shadow-rose-900/20">Delete Vehicle</button>
              <button onClick={() => setShowDeleteConfirm(null)} className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs hover:bg-slate-200">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FleetGuardianPage;