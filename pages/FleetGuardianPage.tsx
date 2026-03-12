import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Car as CarIcon, AlertCircle, CheckCircle2, Trash2, Edit, Download, Upload, FileSpreadsheet, Search, ArrowRight } from 'lucide-react';
import { Car, CarStatus, ExpiryStatus } from '../types';
import * as Storage from '../services/storageService';
import * as ExcelService from '../services/excelService';
import CarForm from '../components/CarForm';
import AlertModal from '../components/AlertModal';

const FleetGuardianPage: React.FC = () => {
  const [cars, setCars] = useState<Car[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [urgentAlerts, setUrgentAlerts] = useState<{ car: Car; status: CarStatus }[]>([]);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Core Logic: Calculate Status
  const calculateStatus = useCallback((dateStr: string | undefined, type: ExpiryStatus['type']): ExpiryStatus => {
    if (!dateStr) {
       return { type, daysRemaining: 0, status: 'good', date: 'Not Set' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let status: ExpiryStatus['status'] = 'good';
    if (daysRemaining < 0) status = 'expired';
    else if (daysRemaining <= 30) status = 'warning';

    return { type, daysRemaining, status, date: dateStr };
  }, []);

  const getCarStatus = useCallback((car: Car): CarStatus => ({
    roadtax: calculateStatus(car.roadtaxExpiry, 'roadtax'),
    insurance: calculateStatus(car.insuranceExpiry, 'insurance'),
    inspection: calculateStatus(car.inspectionExpiry, 'inspection'),
  }), [calculateStatus]);

  // Load Data
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const loadedCars = await Storage.getCars();
      setCars(loadedCars);
      setIsLoading(false);
    };
    load();
  }, []);

  // Check for alerts whenever cars change
  useEffect(() => {
    const alerts: { car: Car; status: CarStatus }[] = [];
    
    cars.forEach(car => {
      const status = getCarStatus(car);
      // Fix: Cast Object.values to ExpiryStatus[] to avoid "Property 'status' does not exist on type 'unknown'" error
      const hasIssue = (Object.values(status) as ExpiryStatus[]).some(s => s.status !== 'good');
      if (hasIssue) {
        alerts.push({ car, status });
      }
    });

    setUrgentAlerts(alerts);
    if (alerts.length > 0) {
      setShowAlertModal(true);
    }
  }, [cars, getCarStatus]);

  const handleSaveCar = async (car: Car) => {
    setIsLoading(true);
    if (editingCar) {
      const updated = await Storage.updateCar(car);
      setCars(updated);
    } else {
      const updated = await Storage.addCar(car);
      setCars(updated);
    }
    setShowForm(false);
    setEditingCar(null);
    setIsLoading(false);
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const handleDeleteCar = async (id: string) => {
    setIsLoading(true);
    const updated = await Storage.deleteCar(id);
    setCars(updated);
    setIsLoading(false);
    setShowDeleteConfirm(null);
  };

  // Excel Handlers
  const handleExport = () => {
    if (cars.length === 0) {
      alert("No data to export.");
      return;
    }
    ExcelService.exportData(cars);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      const importedCars = await ExcelService.parseExcel(file);
      
      if (importedCars.length === 0) {
        alert("No valid vehicle data found in the Excel file.");
        setIsLoading(false);
        return;
      }

      // Override Logic: Replace all existing data with imported data
      await Storage.saveCars(importedCars);
      // Refetch to ensure we are in sync with DB
      const refreshedCars = await Storage.getCars();
      setCars(refreshedCars);
      
      alert(`Successfully imported ${importedCars.length} vehicles. Previous data has been replaced.`);
    } catch (error) {
      console.error(error);
      alert("Failed to import Excel file. Please ensure it is a valid format.");
    } finally {
      // Reset input so same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsLoading(false);
    }
  };

  const renderStatusBadge = (status: ExpiryStatus) => {
    if (status.status === 'expired') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertCircle className="w-3 h-3" /> Expired ({Math.abs(status.daysRemaining)}d ago)
        </span>
      );
    }
    if (status.status === 'warning') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
          <AlertCircle className="w-3 h-3" /> Due in {status.daysRemaining} days
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
        <CheckCircle2 className="w-3 h-3" /> {status.daysRemaining} days left
      </span>
    );
  };

  // Filter and Sort cars
  const sortedCars = useMemo(() => {
    let result = [...cars];
    
    // Filter by search term
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(car => 
        car.plateNumber?.toLowerCase().includes(lowerTerm) ||
        car.make?.toLowerCase().includes(lowerTerm) ||
        car.model?.toLowerCase().includes(lowerTerm) ||
        car.plate?.toLowerCase().includes(lowerTerm) ||
        car.name?.toLowerCase().includes(lowerTerm)
      );
    }

    // Sort by Road Tax Expiry (Ascending)
    return result.sort((a, b) => {
      const dateA = a.roadtaxExpiry || '';
      const dateB = b.roadtaxExpiry || '';
      return dateA.localeCompare(dateB);
    });
  }, [cars, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="bg-blue-600 p-2 rounded-lg">
              <CarIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Eca Fleet Guardian</h1>
              <p className="text-xs text-slate-400">Fleet Expiry Tracker</p>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative w-full sm:w-64 group order-2 sm:order-none">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search plate..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-lg leading-5 bg-slate-800 text-slate-300 placeholder-slate-500 focus:outline-none focus:bg-slate-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto order-3 sm:order-none">
            {/* Hidden File Input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".xlsx, .xls" 
              hidden 
            />
            
            <button 
              onClick={handleImportClick}
              disabled={isLoading}
              className="bg-slate-800 hover:bg-slate-700 text-white p-2.5 rounded-lg transition-colors border border-slate-700 disabled:opacity-50"
              title="Import from Excel"
            >
              <Upload className="w-5 h-5" />
            </button>
            
            <button 
              onClick={handleExport}
              disabled={isLoading}
              className="bg-slate-800 hover:bg-slate-700 text-white p-2.5 rounded-lg transition-colors border border-slate-700 disabled:opacity-50"
              title="Export to Excel"
            >
              <Download className="w-5 h-5" />
            </button>

            <div className="w-px h-8 bg-slate-700 mx-1 hidden sm:block"></div>

            <button 
              onClick={() => { setEditingCar(null); setShowForm(true); }}
              disabled={isLoading}
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95 disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
              <span>Add Vehicle</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        
        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-4">
            <span className="text-slate-500 animate-pulse">Syncing with database...</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-slate-500 text-sm font-medium mb-1">Total Vehicles</div>
            <div className="text-2xl font-bold text-slate-900">{cars.length}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-slate-500 text-sm font-medium mb-1">Total Alerts</div>
            <div className={`text-2xl font-bold ${urgentAlerts.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {urgentAlerts.length}
            </div>
          </div>
        </div>

        {/* Car Grid */}
        {sortedCars.length === 0 && !isLoading ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
            <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileSpreadsheet className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              {searchTerm ? 'No Matching Vehicles Found' : 'No Vehicles Tracked'}
            </h3>
            <p className="text-slate-500 max-w-sm mx-auto mb-6">
              {searchTerm ? `No vehicles match "${searchTerm}".` : 'Add a vehicle manually or import your existing Excel backup to get started.'}
            </p>
            {!searchTerm && (
              <div className="flex justify-center gap-3">
                <button 
                  onClick={handleImportClick}
                  className="text-slate-600 font-medium hover:text-slate-900 flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-lg"
                >
                  <Upload className="w-4 h-4" /> Import Excel
                </button>
                <button 
                  onClick={() => { setEditingCar(null); setShowForm(true); }}
                  className="text-blue-600 font-medium hover:text-blue-800 flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg"
                >
                  <Plus className="w-4 h-4" /> Add Vehicle
                </button>
              </div>
            )}
            {searchTerm && (
               <button 
               onClick={() => setSearchTerm('')}
               className="text-blue-600 font-medium hover:underline"
             >
               Clear Search
             </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {sortedCars.map(car => {
              const status = getCarStatus(car);

              return (
                <div key={car.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group">
                  <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-gradient-to-r from-white to-slate-50">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{car.make || car.name} {car.model}</h3>
                      <div className="text-sm font-mono text-slate-500 mt-1 bg-slate-200 inline-block px-2 py-0.5 rounded">
                        {car.plateNumber || car.plate}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => { setEditingCar(car); setShowForm(true); }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setShowDeleteConfirm(car.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Expiry Rows */}
                    {(['roadtax', 'insurance', 'inspection'] as const).map(type => {
                      const item = status[type];
                      const label = type === 'roadtax' ? 'Road Tax' : type.charAt(0).toUpperCase() + type.slice(1);
                      return (
                        <div key={type} className="flex items-center justify-between">
                          <span className="text-sm text-slate-600 font-medium">{label}</span>
                          <div className="text-right flex flex-col items-end">
                            {renderStatusBadge(item)}
                            <span className="text-xs text-slate-400 mt-1">{item.date}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modals */}
      {showForm && (
        <CarForm 
          initialData={editingCar} 
          onSave={handleSaveCar} 
          onCancel={() => { setShowForm(false); setEditingCar(null); }} 
        />
      )}

      {showAlertModal && (
        <AlertModal 
          alerts={urgentAlerts} 
          onClose={() => setShowAlertModal(false)} 
        />
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <div className="bg-red-50 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Remove Vehicle?</h3>
            <p className="text-slate-500 mb-6">
              Are you sure you want to remove this vehicle from the fleet? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCar(showDeleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FleetGuardianPage;
