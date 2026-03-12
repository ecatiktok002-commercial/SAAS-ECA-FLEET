import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Car } from '../types';

interface CarFormProps {
  initialData: Car | null;
  onSave: (car: Car) => void;
  onCancel: () => void;
}

const CarForm: React.FC<CarFormProps> = ({ initialData, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Car>>(
    initialData || {
      plateNumber: '',
      make: '',
      model: '',
      roadtaxExpiry: '',
      insuranceExpiry: '',
      inspectionExpiry: '',
      type: 'Economy',
      status: 'active'
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      id: initialData?.id || `car-${Date.now()}`,
      name: `${formData.make} ${formData.model}`,
      plate: formData.plateNumber || ''
    } as Car);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-900">
            {initialData ? 'Edit Vehicle' : 'Add New Vehicle'}
          </h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Plate Number</label>
              <input
                required
                type="text"
                value={formData.plateNumber}
                onChange={e => setFormData({ ...formData, plateNumber: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="ABC 1234"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Make</label>
              <input
                required
                type="text"
                value={formData.make}
                onChange={e => setFormData({ ...formData, make: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Toyota"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
              <input
                required
                type="text"
                value={formData.model}
                onChange={e => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Vios"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Road Tax Expiry</label>
              <input
                required
                type="date"
                value={formData.roadtaxExpiry}
                onChange={e => setFormData({ ...formData, roadtaxExpiry: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Insurance Expiry</label>
              <input
                required
                type="date"
                value={formData.insuranceExpiry}
                onChange={e => setFormData({ ...formData, insuranceExpiry: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Inspection Expiry</label>
              <input
                required
                type="date"
                value={formData.inspectionExpiry}
                onChange={e => setFormData({ ...formData, inspectionExpiry: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20"
            >
              Save Vehicle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CarForm;
