import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Car as CarIcon, AlertCircle, CheckCircle2, Trash2, Edit, Search, Lock, Zap, History as HistoryIcon } from 'lucide-react';
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

  // Status Logic (Defensive)
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

  // Load All Data
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

  // Alert Monitoring
  useEffect(() => {
    const alerts: { car: Car; status: CarStatus }[] = [];
    cars.forEach(car => {
      const status = getCarStatus(car);
      if (status.roadtax.status !== 'good' || status.insurance.status !== 'good') {
        alerts.push({ car, status });
      }
    });
    setUrgentAlerts(alerts);
  }, [cars, getCarStatus]);

  // Logic Handlers
  const handleSaveCar = async (car: Car) => {
    if (!subscriberId) return;
    try {
      if (editingCar) await Storage.updateCar(car, subscriberId);
      else await Storage.addCar(car, subscriberId);
      setShowForm(false);
      setEditingCar(null);
      const updated = await Storage.getCars(subscriberId);
      setCars(updated || []);
    } catch (err: any) { alert(err.message); }
  };

  const handleDeleteCar = async (id: string) => {
    if (!subscriberId) return;
    try {
      await Storage.deleteCar(id, subscriberId);
      setShowDeleteConfirm(null);
      setCars(prev => prev.filter(c => c.id !== id));
    } catch (err: any) { alert(err.message); }
  };

  // Sorting: Oldest Roadtax First
  const sortedCars = useMemo(() => {
    let filtered = [...cars];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => (c.plateNumber || c.plate || '').toLowerCase().includes(term) || (c.make || c.name || '').toLowerCase().includes(term));
    }
    return filtered.sort((a, b) => (a.roadtaxExpiry || '9999-12-31').localeCompare(b.roadtaxExpiry || '9999-12-31'));
  }, [cars, searchTerm]);

  const renderStatusBadge = (status: ExpiryStatus) => {
    const isError = status.status === 'expired';
    const isWarning = status.status === 'warning';
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${isError ? 'bg-red-100 text-red-800' : isWarning ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
        {(isError || isWarning) && <AlertCircle className="w-3 h-3" />}
        {!isError && !isWarning && <CheckCircle2 className="w-3 h-3" />}
        {isError ? `Expired (${Math.abs(status.daysRemaining)}d ago)` : isWarning ? `${status.daysRemaining} days left` : `${status.daysRemaining} days left`}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="bg-blue-600 p-2 rounded-lg"><CarIcon className="w-6 h-6 text-white" /></div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Fleet Guardian</h1>
              <p className="text-xs text-slate-400">Fleet Expiry Tracker</p>
            </div>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Search plate..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-slate-700 rounded-lg bg-slate-800 text-slate-300 sm:text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
          </div>
          <button onClick={() => { setEditingCar(null); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2"><Plus className="w-5 h-5" /><span>Add Vehicle</span></button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><div className="text-slate-500 text-sm font-medium mb-1">Total Vehicles</div><div className="text-2xl font-bold text-slate-900">{cars.length}</div></div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-slate-500 text-sm font-medium mb-1">Total Alerts</div>
            <div className={`text-2xl font-bold ${urgentAlerts.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{urgentAlerts.length}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedCars.map(car => {
            const status = getCarStatus(car);
            const history = usageHistory[car.id] || [];
            const activeMonth = history[0];

            return (
              <div key={car.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{car.make || car.name} {car.model}</h3>
                    <div className="text-sm font-mono text-slate-500 mt-1 bg-slate-200 inline-block px-2 py-0.5 rounded uppercase">{car.plateNumber || car.plate}</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingCar(car); setShowForm(true); }} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => setShowDeleteConfirm(car.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                <div className="p-5 space-y-4 relative">
                  {!showGuardianFeatures && <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-4"><Lock className="w-5 h-5 text-slate-400 mb-2" /><p className="text-[10px] text-slate-500 font-bold uppercase">Locked</p></div>}
                  
                  {(['roadtax', 'insurance', 'inspection'] as const).map(type => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 font-medium">{type === 'roadtax' ? 'Road Tax' : type.charAt(0).toUpperCase() + type.slice(1)}</span>
                      <div className="text-right flex flex-col items-end">{renderStatusBadge(status[type])}<span className="text-xs text-slate-400 mt-1">{status[type].date}</span></div>
                    </div>
                  ))}

                  {/* Utilization Block */}
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Utilization</span>
                      </div>
                      <span className="text-sm font-black text-slate-900">{activeMonth?.km || 0} <span className="text-[10px] text-slate-400">KM</span></span>
                    </div>
                    
                    {/* Performance History Sub-block */}
                    {history.length > 1 && (
                      <div className="bg-slate-50 rounded-xl p-3 mt-3 space-y-2 border border-slate-100">
                        <div className="flex items-center gap-1.5 mb-1">
                          <HistoryIcon className="w-3 h-3 text-slate-400" />
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">History</span>
                        </div>
                        {history.slice(1, 4).map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[11px] font-medium text-slate-600">
                            <span className="text-slate-400">{item.month}</span>
                            <span>{item.km} KM</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {showForm && <CarForm initialData={editingCar} onSave={handleSaveCar} onCancel={() => setShowForm(false)} />}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl text-center">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Remove Vehicle?</h3>
            <p className="text-slate-500 text-sm mb-6">Historical usage will be lost.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 px-4 py-2 border rounded-lg font-bold text-xs uppercase">Cancel</button>
              <button onClick={() => handleDeleteCar(showDeleteConfirm)} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-xs uppercase">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FleetGuardianPage;