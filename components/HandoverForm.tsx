import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { compressVehicleImage } from '../services/imageService';

interface HandoverFormProps {
  bookingId: string;
  car_id: string;
  vehiclePlate: string;
  onClose: () => void;
  onSuccess?: () => void;
  subscriberId: string;
}

type HandoverType = 'Pickup' | 'Return';

const PHOTO_LABELS = ['Front', 'Back', 'Left', 'Right', 'Interior', 'Dashboard'];

const HandoverForm: React.FC<HandoverFormProps> = ({ bookingId, car_id, vehiclePlate, onClose, onSuccess, subscriberId }) => {
  const [step, setStep] = useState(1);
  const [handoverType, setHandoverType] = useState<HandoverType>('Pickup');
  const [mileage, setMileage] = useState('');
  const [fuelLevel, setFuelLevel] = useState('');
  const [conditionDetails, setConditionDetails] = useState('');
  
  const [photos, setPhotos] = useState<Record<string, File | null>>({
    Front: null, Back: null, Left: null, Right: null, Interior: null, Dashboard: null
  });
  const [photoPreviews, setPhotoPreviews] = useState<Record<string, string>>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handlePhotoChange = (label: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotos(prev => ({ ...prev, [label]: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews(prev => ({ ...prev, [label]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validateStep1 = () => {
    if (!mileage || isNaN(Number(mileage))) return 'Please enter a valid mileage.';
    if (!fuelLevel) return 'Please enter the fuel level.';
    return '';
  };

  const validateStep2 = () => {
    const missing = PHOTO_LABELS.filter(label => !photos[label]);
    if (missing.length > 0) return `Please upload missing photos: ${missing.join(', ')}`;
    return '';
  };

  const handleNext = () => {
    setError('');
    let err = '';
    if (step === 1) err = validateStep1();
    if (step === 2) err = validateStep2();
    
    if (err) {
      setError(err);
      return;
    }
    
    if (step === 2) {
      handleSubmit();
    } else {
      setStep(prev => prev + 1);
    }
  };

  const uploadImage = async (file: File, path: string): Promise<string> => {
    // 1. Compress image before upload
    const compressedFile = await compressVehicleImage(file);

    // 2. Upload compressed image
    const { data, error } = await supabase.storage
      .from('handover_images')
      .upload(path, compressedFile, { cacheControl: '3600', upsert: false });
      
    if (error) throw error;
    
    const { data: publicUrlData } = supabase.storage
      .from('handover_images')
      .getPublicUrl(data.path);
      
    return publicUrlData.publicUrl;
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError('');

      // 1. Upload Photos
      const uploadedUrls: Record<string, string> = {};
      const timestamp = Date.now();
      
      for (const label of PHOTO_LABELS) {
        const file = photos[label];
        if (file) {
          const ext = file.name.split('.').pop();
          const path = `${subscriberId}/${bookingId}/${timestamp}_${label}.${ext}`;
          uploadedUrls[label] = await uploadImage(file, path);
        }
      }

      // 2. Save to Database
      const { error: dbError } = await supabase
        .from('handover_records')
        .insert([{
          booking_id: bookingId,
          car_id: car_id,
          subscriber_id: subscriberId,
          handover_type: handoverType,
          mileage: mileage ? parseInt(mileage, 10) : null,
          fuel_level: fuelLevel,
          condition_details: conditionDetails,
          photos_url: Object.values(uploadedUrls)
        }]);

      if (dbError) throw dbError;

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit handover record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-auto flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl z-10 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Vehicle Handover</h2>
            <p className="text-xs text-slate-500 font-medium">{vehiclePlate}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-50 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="flex h-1 bg-slate-100 shrink-0">
          <div className="bg-slate-900 transition-all duration-300" style={{ width: `${(step / 2) * 100}%` }} />
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-6 p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-xl flex items-center gap-2">
               <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
               {error}
            </div>
          )}

          {/* Step 1: Verification */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setHandoverType('Pickup')}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${handoverType === 'Pickup' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Pickup
                </button>
                <button
                  type="button"
                  onClick={() => setHandoverType('Return')}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${handoverType === 'Return' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Return
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wider">Current Mileage (km)</label>
                <input 
                  type="number" 
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  placeholder="e.g. 45000"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all font-semibold text-slate-700 text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wider">Fuel Level</label>
                <select 
                  value={fuelLevel}
                  onChange={(e) => setFuelLevel(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all appearance-none font-semibold text-slate-700 text-sm"
                >
                  <option value="">-- Select Fuel Level --</option>
                  <option value="Empty">Empty</option>
                  <option value="1/4">1/4</option>
                  <option value="1/2">1/2</option>
                  <option value="3/4">3/4</option>
                  <option value="Full">Full</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wider">Condition Details / Notes</label>
                <textarea 
                  value={conditionDetails}
                  onChange={(e) => setConditionDetails(e.target.value)}
                  placeholder="Describe any scratches, dents, or other issues..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all font-semibold text-slate-700 text-sm min-h-[100px]"
                />
              </div>
            </div>
          )}

          {/* Step 2: Photos */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <p className="text-xs text-slate-500 font-medium mb-4">Please upload 6 clear photos of the vehicle.</p>
              <div className="grid grid-cols-2 gap-3">
                {PHOTO_LABELS.map(label => (
                  <div key={label} className="relative aspect-square rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden flex flex-col">
                    {/* Hidden Inputs */}
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      id={`photo-camera-${label}`}
                      className="hidden"
                      onChange={(e) => handlePhotoChange(label, e)}
                    />
                    <input 
                      type="file" 
                      accept="image/*" 
                      id={`photo-gallery-${label}`}
                      className="hidden"
                      onChange={(e) => handlePhotoChange(label, e)}
                    />

                    {photoPreviews[label] ? (
                      <div className="relative w-full h-full group">
                        <img src={photoPreviews[label]} alt={label} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                          <button 
                            onClick={() => {
                              setPhotos(prev => ({ ...prev, [label]: null }));
                              setPhotoPreviews(prev => {
                                const newPreviews = { ...prev };
                                delete newPreviews[label];
                                return newPreviews;
                              });
                            }}
                            className="bg-white text-rose-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-rose-50"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] font-bold uppercase py-1 text-center">
                          {label}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col h-full">
                        <label 
                          htmlFor={`photo-camera-${label}`}
                          className="flex-1 flex flex-col items-center justify-center hover:bg-slate-100 cursor-pointer transition-colors border-b border-slate-200/50"
                        >
                          <svg className="w-5 h-5 text-slate-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Camera</span>
                        </label>
                        <div className="h-px bg-slate-200 w-full" />
                        <label 
                          htmlFor={`photo-gallery-${label}`}
                          className="flex-1 flex flex-col items-center justify-center hover:bg-slate-100 cursor-pointer transition-colors"
                        >
                          <svg className="w-5 h-5 text-slate-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Gallery</span>
                        </label>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-1 py-0.5 rounded text-[8px] font-bold text-slate-300 uppercase tracking-widest pointer-events-none border border-slate-100">
                          {label}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 bg-white rounded-b-2xl shrink-0 flex gap-3">
          {step > 1 && (
            <button 
              type="button"
              onClick={() => setStep(prev => prev - 1)}
              disabled={isSubmitting}
              className="px-6 py-4 bg-slate-100 rounded-xl text-slate-600 font-bold uppercase text-xs tracking-widest hover:bg-slate-200 transition-all disabled:opacity-50"
            >
              Back
            </button>
          )}
          
          <button 
            type="button"
            onClick={handleNext}
            disabled={isSubmitting}
            className={`flex-1 py-4 rounded-xl text-white font-bold uppercase text-xs tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 ${step === 2 ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900 hover:bg-slate-800'}`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Submitting...
              </>
            ) : (
              step === 2 ? 'Complete Handover' : 'Next Step'
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default HandoverForm;
