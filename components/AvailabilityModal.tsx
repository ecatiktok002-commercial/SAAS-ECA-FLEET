
import React, { useMemo, useState, useEffect } from 'react';
import { Car, Booking } from '../types';
import { getAvailableCars } from '../services/bookingService';

interface AvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  cars: Car[];
  bookings: Booking[];
  onBookCar: (car_id: string) => void;
}

const AvailabilityModal: React.FC<AvailabilityModalProps> = ({ isOpen, onClose, cars, bookings, onBookCar }) => {
  // Default to empty string to force user input
  const [checkDateStr, setCheckDateStr] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCheckDateStr('');
    }
  }, [isOpen]);
  
  const checkDate = useMemo(() => checkDateStr ? new Date(checkDateStr) : null, [checkDateStr]);

  const availableCars = useMemo(() => {
    if (!isOpen || !checkDateStr || !checkDate || isNaN(checkDate.getTime())) return [];
    return getAvailableCars(checkDate, bookings, cars);
  }, [isOpen, bookings, cars, checkDate, checkDateStr]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Check Availability</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-50 rounded-full">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
           <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wider">Pick Date & Time</label>
           <input 
              type="datetime-local"
              value={checkDateStr}
              onChange={(e) => setCheckDateStr(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all font-semibold text-slate-700 text-sm"
            />
        </div>

        <div className="p-4 overflow-y-auto space-y-3">
          {!checkDateStr ? (
            <div className="text-center py-10">
              <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              </div>
              <p className="text-slate-500 text-sm font-medium">Please select a date and time to see available vehicles.</p>
            </div>
          ) : availableCars.length > 0 ? (
            availableCars.map(car => (
              <div key={car.id} className="group flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all bg-white hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800 uppercase tracking-tight">{car.plate}</div>
                    <div className="text-xs text-slate-500 font-medium">{car.name}</div>
                  </div>
                </div>
                <button 
                  onClick={() => onBookCar(car.id)}
                  className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-800"
                >
                  Book
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-10">
              <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <p className="text-slate-500 text-sm font-medium">No vehicles available at this time.</p>
            </div>
          )}
        </div>
        
        {checkDateStr && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
              {availableCars.length} Vehicle{availableCars.length !== 1 && 's'} Available
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvailabilityModal;
