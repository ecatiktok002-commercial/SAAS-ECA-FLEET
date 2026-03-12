import React from 'react';
import { X, AlertCircle, Calendar } from 'lucide-react';
import { Car, CarStatus } from '../types';

interface AlertModalProps {
  alerts: { car: Car; status: CarStatus }[];
  onClose: () => void;
}

const AlertModal: React.FC<AlertModalProps> = ({ alerts, onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-red-50">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-xl">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-900">Urgent Fleet Alerts</h2>
              <p className="text-xs text-red-700 font-medium">{alerts.length} vehicles require attention</p>
            </div>
          </div>
          <button onClick={onClose} className="text-red-400 hover:text-red-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="max-h-[60vh] overflow-y-auto p-6 space-y-4">
          {alerts.map(({ car, status }, idx) => (
            <div key={idx} className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-slate-900">{car.make} {car.model}</h3>
                  <span className="text-xs font-mono text-slate-500 bg-slate-200 px-2 py-0.5 rounded">{car.plateNumber}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['roadtax', 'insurance', 'inspection'] as const).map(type => {
                  const item = status[type];
                  if (item.status === 'good') return null;
                  
                  return (
                    <div key={type} className={`p-3 rounded-xl border ${
                      item.status === 'expired' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-amber-50 border-amber-100 text-amber-700'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-3 h-3" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {type === 'roadtax' ? 'Road Tax' : type}
                        </span>
                      </div>
                      <div className="text-xs font-bold">
                        {item.status === 'expired' ? `Expired ${Math.abs(item.daysRemaining)}d ago` : `Due in ${item.daysRemaining} days`}
                      </div>
                      <div className="text-[10px] opacity-70 mt-0.5">{item.date}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/20"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;
