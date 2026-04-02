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
  initialType?: 'Pickup' | 'Return';
  currentStaffId?: string;
  bookingStaffId?: string;
}

type HandoverType = 'Pickup' | 'Return';

const EXTERIOR_PHOTOS = ['Front', 'Back', 'Left', 'Right'];

interface DamagePhoto {
  id: string;
  file: File;
  preview: string;
}

const HandoverForm: React.FC<HandoverFormProps> = ({ 
  bookingId, 
  car_id, 
  vehiclePlate, 
  onClose, 
  onSuccess, 
  subscriberId,
  initialType,
  currentStaffId,
  bookingStaffId
}) => {
  const [handoverType, setHandoverType] = useState<HandoverType>(initialType || 'Pickup');
  const [mileage, setMileage] = useState('');
  const [fuelLevel, setFuelLevel] = useState('');
  const [conditionDetails, setConditionDetails] = useState('');
  const [isGoodCondition, setIsGoodCondition] = useState(false);
  
  // Required Photos State (Exterior + Dashboard)
  const [photos, setPhotos] = useState<Record<string, File | null>>({
    Front: null, Back: null, Left: null, Right: null, Dashboard: null
  });
  const [photoPreviews, setPhotoPreviews] = useState<Record<string, string>>({});
  
  // Dynamic Special Attention Photos
  const [damagePhotos, setDamagePhotos] = useState<DamagePhoto[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleRequiredPhotoChange = (label: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotos(prev => ({ ...prev, [label]: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews(prev => ({ ...prev, [label]: reader.result as string }));
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const handleDamagePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDamagePhotos(prev => [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          file,
          preview: reader.result as string
        }]);
      };
      reader.readAsDataURL(file);
      // Reset input value so the same file can be selected again if needed
      e.target.value = '';
    }
  };

  const removeDamagePhoto = (id: string) => {
    setDamagePhotos(prev => prev.filter(p => p.id !== id));
  };

  const uploadImage = async (file: File, path: string): Promise<string> => {
    const compressedFile = await compressVehicleImage(file);
    const { data, error } = await supabase.storage
      .from('handover_images')
      .upload(path, compressedFile, { cacheControl: '3600', upsert: false });
      
    if (error) throw error;
    
    // Replace getPublicUrl with createSignedUrl
    const { data: signedData, error: signedError } = await supabase.storage
      .from('handover_images')
      .createSignedUrl(data.path, 3600); // URL expires in 1 hour (3600 seconds)
      
    if (signedError) throw signedError;
    return signedData.signedUrl;
  };

  const handleSubmit = async () => {
    setError('');
    
    // 1. Validation
    const isExteriorRequired = handoverType === 'Pickup' || (handoverType === 'Return' && !isGoodCondition);
    const requiredLabels = isExteriorRequired ? [...EXTERIOR_PHOTOS, 'Dashboard'] : ['Dashboard'];
    
    const missingPhotos = requiredLabels.filter(label => !photos[label]);
    if (missingPhotos.length > 0) {
      setError(`Missing required photos: ${missingPhotos.join(', ')}`);
      return;
    }
    if (!mileage || isNaN(Number(mileage))) {
      setError('Please enter a valid mileage.');
      return;
    }
    if (!fuelLevel) {
      setError('Please select the fuel level.');
      return;
    }

    try {
      setIsSubmitting(true);
      const allUploadedUrls: string[] = [];
      const timestamp = Date.now();
      
      // 2. Upload Photos (Required + Optional Exterior if provided)
      const labelsToUpload = [...EXTERIOR_PHOTOS, 'Dashboard'];
      for (const label of labelsToUpload) {
        const file = photos[label];
        if (file) {
          const ext = file.name.split('.').pop();
          const path = `${subscriberId}/${bookingId}/${timestamp}_${label}.${ext}`;
          const url = await uploadImage(file, path);
          allUploadedUrls.push(url);
        }
      }

      // 3. Upload Damage Photos
      for (let i = 0; i < damagePhotos.length; i++) {
        const file = damagePhotos[i].file;
        const ext = file.name.split('.').pop();
        const path = `${subscriberId}/${bookingId}/${timestamp}_Damage_${i+1}.${ext}`;
        const url = await uploadImage(file, path);
        allUploadedUrls.push(url);
      }

      // 4. Calculate Logistic Credit
      let logisticCredit = 0;
      
      // Fetch subscriber settings to check if logistic credits are enabled
      let isLogisticCreditsEnabled = true; // Default to true
      try {
        const { data: subscriberData, error: subError } = await supabase
          .from('subscribers')
          .select('logistic_credits_enabled')
          .eq('id', subscriberId)
          .single();
          
        if (!subError && subscriberData) {
          isLogisticCreditsEnabled = subscriberData.logistic_credits_enabled !== false;
        }
      } catch (e) {
        console.warn("Could not fetch logistic_credits_enabled, defaulting to true", e);
      }

      if (isLogisticCreditsEnabled) {
        const currentHour = new Date().getHours();
        
        // If time is < 09:00 or >= 20:00 AND the handover agent is different from the booking agent
        if ((currentHour < 9 || currentHour >= 20) && currentStaffId && currentStaffId !== bookingStaffId) {
          logisticCredit = 5;
        }
      }

      // 5. Save to Database
      const newMileage = parseInt(mileage, 10);
      
      let finalConditionDetails = conditionDetails;
      if (handoverType === 'Return' && isGoodCondition) {
        finalConditionDetails = `[VEHICLE IN GOOD CONDITION AS PER BEFORE] ${conditionDetails}`.trim();
      }

      const { error: dbError } = await supabase
        .from('handover_records')
        .insert([{
          booking_id: bookingId,
          car_id: car_id,
          subscriber_id: subscriberId,
          handover_type: handoverType,
          mileage: newMileage,
          fuel_level: fuelLevel,
          condition_details: finalConditionDetails,
          photos_url: allUploadedUrls, // Array of all strings
          staff_id: currentStaffId || null,
          logistic_credit: logisticCredit
        }]);

      if (dbError) throw dbError;

      // 6. Update Car's Current Mileage if higher
      if (!isNaN(newMileage) && newMileage > 0) {
        // Fetch current car mileage
        const { data: carData } = await supabase
          .from('cars')
          .select('current_mileage')
          .eq('id', car_id)
          .eq('subscriber_id', subscriberId)
          .single();
          
        if (carData && newMileage > (carData.current_mileage || 0)) {
          await supabase
            .from('cars')
            .update({ current_mileage: newMileage })
            .eq('id', car_id)
            .eq('subscriber_id', subscriberId);
        }
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit handover record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reusable component for a single photo upload box
  const PhotoUploadBox = ({ label, isRequired = false }: { label: string, isRequired?: boolean }) => (
    <div className="relative aspect-square rounded-xl border-2 border-dashed border-slate-300 bg-white overflow-hidden flex flex-col group hover:border-blue-400 transition-colors cursor-pointer shadow-sm">
      <input 
        type="file" 
        accept="image/*" 
        /* ❌ REMOVED: capture="environment" */
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        onChange={(e) => handleRequiredPhotoChange(label, e)}
      />
      {photoPreviews[label] ? (
        <img src={photoPreviews[label]} alt={label} className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center justify-center h-full p-2 text-center pointer-events-none">
          <svg className="w-6 h-6 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/></svg>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
          {isRequired && <span className="text-[8px] font-bold text-rose-500 uppercase mt-1">Required</span>}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-auto flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl z-20 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Vehicle Handover</h2>
            <p className="text-xs text-slate-500 font-medium">{vehiclePlate}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-50 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6 bg-slate-50">
          
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm">
               <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
               {error}
            </div>
          )}

          {/* Type Toggle OR Fixed Header */}
          {!initialType ? (
            <div className="flex bg-slate-200/50 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setHandoverType('Pickup')}
                className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all ${handoverType === 'Pickup' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Pickup
              </button>
              <button
                type="button"
                onClick={() => setHandoverType('Return')}
                className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all ${handoverType === 'Return' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Return
              </button>
            </div>
          ) : (
            <div className="bg-slate-100 text-slate-700 py-3 px-4 rounded-xl font-bold uppercase tracking-widest text-center text-xs border border-slate-200 shadow-inner">
              {handoverType} Inspection Form
            </div>
          )}

          {/* Section 1: Exterior Photos */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <div className="mb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">1. Exterior Integrity</h3>
              <p className="text-[10px] text-slate-400">Capture all 4 sides of the vehicle.</p>
            </div>
            
            {handoverType === 'Return' && (
              <label className="flex items-start gap-3 p-3 mb-4 bg-emerald-50 border border-emerald-100 rounded-xl cursor-pointer hover:bg-emerald-100/50 transition-colors">
                <div className="relative flex items-center justify-center mt-0.5">
                  <input 
                    type="checkbox" 
                    checked={isGoodCondition}
                    onChange={(e) => setIsGoodCondition(e.target.checked)}
                    className="w-5 h-5 appearance-none border-2 border-emerald-400 rounded-md checked:bg-emerald-500 checked:border-emerald-500 transition-colors cursor-pointer"
                  />
                  {isGoodCondition && (
                    <svg className="absolute w-3 h-3 text-white pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div>
                  <span className="block text-sm font-bold text-emerald-900">Vehicle in Good condition as per before</span>
                  <span className="block text-[10px] text-emerald-700 mt-0.5">Tick this to skip exterior photos if there are no new damages.</span>
                </div>
              </label>
            )}

            <div className={`grid grid-cols-2 gap-3 transition-opacity duration-300 ${handoverType === 'Return' && isGoodCondition ? 'opacity-50' : 'opacity-100'}`}>
              {EXTERIOR_PHOTOS.map(label => (
                <PhotoUploadBox 
                  key={label} 
                  label={label} 
                  isRequired={handoverType === 'Pickup' || (handoverType === 'Return' && !isGoodCondition)} 
                />
              ))}
            </div>
          </div>

          {/* Section 2: Special Attention / Damages */}
          <div className="bg-orange-50/50 p-4 rounded-xl shadow-sm border border-orange-100">
            <div className="mb-3">
              <h3 className="text-xs font-bold text-orange-800 uppercase tracking-wider">2. Special Attention</h3>
              <p className="text-[10px] text-orange-600/70">Document any scratches, dents, or issues.</p>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mb-4">
              {/* Existing Damage Photos */}
              {damagePhotos.map(photo => (
                <div key={photo.id} className="relative aspect-square rounded-xl border border-orange-200 overflow-hidden group">
                  <img src={photo.preview} alt="Damage" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => removeDamagePhoto(photo.id)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-widest"
                  >
                    Remove
                  </button>
                </div>
              ))}

              {/* Add New Damage Photo Button */}
              <div className="relative aspect-square rounded-xl border-2 border-dashed border-orange-300 bg-white overflow-hidden flex flex-col group hover:border-orange-500 transition-colors cursor-pointer">
                <input 
                  type="file" 
                  accept="image/*" 
                  /* ❌ REMOVED: capture="environment" */
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  onChange={handleDamagePhotoAdd}
                />
                <div className="flex flex-col items-center justify-center h-full p-2 text-center pointer-events-none">
                  <svg className="w-5 h-5 text-orange-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                  <span className="text-[9px] font-bold text-orange-600 uppercase tracking-wider">Add Photo</span>
                </div>
              </div>
            </div>

            <textarea 
              value={conditionDetails}
              onChange={(e) => setConditionDetails(e.target.value.toUpperCase())}
              placeholder="Describe the damages here (optional)..."
              className="w-full px-4 py-3 bg-white border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition-all font-medium text-slate-700 text-sm min-h-[80px] uppercase"
            />
          </div>

          {/* Section 3: Dashboard & Meters */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <div className="mb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">3. Dashboard & Meters</h3>
              <p className="text-[10px] text-slate-400">Record mileage and fuel status.</p>
            </div>
            
            <div className="grid grid-cols-[100px_1fr] gap-4">
              {/* Dashboard Photo */}
              <div className="h-full">
                <PhotoUploadBox label="Dashboard" isRequired />
              </div>

              {/* Meters Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Mileage (km)</label>
                  <input 
                    type="number" 
                    value={mileage}
                    onChange={(e) => { setMileage(e.target.value); setError(''); }}
                    placeholder="e.g. 45000"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-bold text-slate-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Fuel Level</label>
                  <select 
                    value={fuelLevel}
                    onChange={(e) => { setFuelLevel(e.target.value); setError(''); }}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all appearance-none font-bold text-slate-700 text-sm"
                  >
                    <option value="">Select...</option>
                    <option value="1 Bar">1 Bar</option>
                    <option value="2 Bar">2 Bar</option>
                    <option value="3 Bar">3 Bar</option>
                    <option value="4 Bar">4 Bar</option>
                    <option value="5 Bar">5 Bar</option>
                    <option value="6 Bar">6 Bar</option>
                    <option value="7 Bar">7 Bar</option>
                    <option value="Full Tank">Full Tank</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Action */}
        <div className="p-4 border-t border-slate-100 bg-white rounded-b-2xl shrink-0 z-20">
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-xs tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Uploading...
              </>
            ) : (
              'Complete Handover'
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default HandoverForm;