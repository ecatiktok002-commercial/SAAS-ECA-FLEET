import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { compressVehicleImage } from '../services/imageService';
import { identifyDashboardMeters } from '../services/aiService';
import { Sparkles, CheckCircle2, AlertTriangle, Gauge, Fuel, Eye, ArrowLeft, Send } from 'lucide-react';

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

interface PhotoUploadBoxProps {
  label: string;
  isRequired?: boolean;
  preview?: string;
  isScanning?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const PhotoUploadBox: React.FC<PhotoUploadBoxProps> = ({ 
  label, 
  isRequired = false, 
  preview, 
  isScanning = false,
  onChange 
}) => (
  <div className={`relative aspect-square rounded-xl border-2 border-dashed ${isScanning ? 'border-blue-500 bg-blue-50/30 ring-2 ring-blue-400/50' : 'border-slate-300 bg-white hover:border-blue-400'} overflow-hidden flex flex-col group transition-all cursor-pointer shadow-sm`}>
    <input 
      type="file" 
      accept="image/*" 
      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      onChange={onChange}
    />
    {preview ? (
      <>
        <img src={preview} alt={label} className="w-full h-full object-cover" />
        {isScanning && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-2 text-center text-white z-20 animate-in fade-in duration-150">
            <div className="relative w-8 h-8 mb-2">
              <div className="absolute inset-0 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
              <Sparkles className="w-4 h-4 text-blue-300 absolute inset-0 m-auto animate-pulse" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">AI Reading Meters...</span>
          </div>
        )}
      </>
    ) : (
      <div className="flex flex-col items-center justify-center h-full p-2 text-center pointer-events-none">
        <svg className="w-6 h-6 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/></svg>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        {isRequired && <span className="text-[8px] font-bold text-rose-500 uppercase mt-1">Required</span>}
      </div>
    )}
  </div>
);

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
  
  // AI Meter Scanning States
  const [isScanningDashboard, setIsScanningDashboard] = useState(false);
  const [aiDetectionStatus, setAiDetectionStatus] = useState<{
    success: boolean;
    mileage?: number;
    fuelLevel?: string;
    message?: string;
  } | null>(null);
  const [isFieldAutoFilled, setIsFieldAutoFilled] = useState(false);

  // Pre-submission Verification Alert Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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
        const previewUrl = reader.result as string;
        setPhotoPreviews(prev => ({ ...prev, [label]: previewUrl }));

        // Trigger AI integer & meter identification when Dashboard photo is attached
        if (label === 'Dashboard') {
          runDashboardAiIdentification(file);
        }
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const runDashboardAiIdentification = async (file: File) => {
    setIsScanningDashboard(true);
    setAiDetectionStatus({
      success: true,
      message: 'Scanning Left Fuel Bar & Bottom Odometer...'
    });

    try {
      const result = await identifyDashboardMeters(file);
      if (result.success && (result.mileage != null || result.fuelLevel)) {
        if (result.mileage != null) {
          setMileage(String(result.mileage));
        }
        if (result.fuelLevel) {
          setFuelLevel(result.fuelLevel);
        }
        setIsFieldAutoFilled(true);
        setTimeout(() => setIsFieldAutoFilled(false), 3500);

        setAiDetectionStatus({
          success: true,
          mileage: result.mileage ?? undefined,
          fuelLevel: result.fuelLevel ?? undefined,
          message: `Auto-identified: ${result.mileage != null ? result.mileage.toLocaleString() + ' km' : ''} ${result.fuelLevel ? '• ' + result.fuelLevel : ''}`.trim()
        });
      } else {
        setAiDetectionStatus({
          success: false,
          message: result.error || 'Could not auto-read meters clearly. Please input manually.'
        });
      }
    } catch (err: any) {
      setAiDetectionStatus({
        success: false,
        message: 'Could not auto-read meters. Please input manually.'
      });
    } finally {
      setIsScanningDashboard(false);
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
    
    const { data: publicData } = supabase.storage
      .from('handover_images')
      .getPublicUrl(data.path);
      
    return publicData.publicUrl;
  };

  // Pre-validate inputs before prompting the confirmation alert
  const handleInitiateSubmit = () => {
    setError('');
    
    // 1. Validation
    const isExteriorRequired = handoverType === 'Pickup' || (handoverType === 'Return' && !isGoodCondition);
    const requiredLabels = isExteriorRequired ? [...EXTERIOR_PHOTOS, 'Dashboard'] : ['Dashboard'];
    
    const missingPhotos = requiredLabels.filter(label => !photos[label]);
    if (missingPhotos.length > 0) {
      setError(`Missing required photos: ${missingPhotos.join(', ')}`);
      return;
    }
    if (!mileage || isNaN(Number(mileage)) || Number(mileage) <= 0) {
      setError('Please enter a valid integer mileage (e.g. 45000).');
      return;
    }
    if (!fuelLevel) {
      setError('Please select the fuel level.');
      return;
    }

    // Open Double-Check Confirmation Modal
    setShowConfirmModal(true);
  };

  // Final execution of handover record submission
  const executeFinalSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError('');
      const allUploadedUrls: string[] = [];
      const timestamp = Date.now();
      
      // 2. Upload Photos (Required + Optional Exterior if provided)
      const labelsToUpload = [...EXTERIOR_PHOTOS, 'Dashboard'];
      for (const label of labelsToUpload) {
        const file = photos[label];
        if (file) {
          const ext = file.name.split('.').pop() || 'jpg';
          const path = `${subscriberId}/${bookingId}/${timestamp}_${label}.${ext}`;
          const url = await uploadImage(file, path);
          allUploadedUrls.push(url);
        }
      }

      // 3. Upload Damage Photos
      for (let i = 0; i < damagePhotos.length; i++) {
        const file = damagePhotos[i].file;
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${subscriberId}/${bookingId}/${timestamp}_Damage_${i+1}.${ext}`;
        const url = await uploadImage(file, path);
        allUploadedUrls.push(url);
      }

      // 4. Calculate Logistic Credit
      let logisticCredit = 0;
      let isLogisticCreditsEnabled = true;
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
          photos_url: allUploadedUrls,
          staff_id: currentStaffId || null,
          logistic_credit: logisticCredit
        }]);

      if (dbError) throw dbError;

      // Also update car's current_mileage in cars table for real-time fleet usage tracking
      if (car_id && newMileage > 0) {
        try {
          await supabase
            .from('cars')
            .update({ current_mileage: newMileage })
            .eq('id', car_id);
        } catch (carUpdateErr) {
          console.warn('Could not update car current_mileage in cars table:', carUpdateErr);
        }
      }

      setShowConfirmModal(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit handover record.');
      setShowConfirmModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to render fuel level visual bars
  const renderFuelBars = (levelStr: string) => {
    let activeBars = 0;
    if (levelStr === 'Full Tank') activeBars = 8;
    else if (levelStr.includes('7 Bar')) activeBars = 7;
    else if (levelStr.includes('6 Bar')) activeBars = 6;
    else if (levelStr.includes('5 Bar')) activeBars = 5;
    else if (levelStr.includes('4 Bar')) activeBars = 4;
    else if (levelStr.includes('3 Bar')) activeBars = 3;
    else if (levelStr.includes('2 Bar')) activeBars = 2;
    else if (levelStr.includes('1 Bar')) activeBars = 1;

    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((bar) => {
          const isLit = bar <= activeBars;
          const barColor = isLit
            ? 'bg-emerald-400'
            : 'bg-slate-700/70 border border-slate-600/50';
          return (
            <div
              key={bar}
              className={`h-4 w-2.5 rounded-xs transition-all ${barColor}`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-auto flex flex-col max-h-[90vh]">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl z-20 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Vehicle Handover</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  handoverType === 'Pickup' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                }`}>
                  {handoverType}
                </span>
              </div>
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
                    preview={photoPreviews[label]}
                    onChange={(e) => handleRequiredPhotoChange(label, e)}
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

            {/* Section 3: Dashboard & Meters with Auto Integer Identify Feature */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    3. Dashboard & Meters
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[9px] font-semibold flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      Auto-Identify
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Left bar = Fuel level • Bottom display = Integer Mileage (XXXXXX km)
                  </p>
                </div>
              </div>

              {/* AI Detection Banner */}
              {aiDetectionStatus && (
                <div className={`mb-3 p-2.5 rounded-lg text-[11px] font-medium flex items-center gap-2 border transition-all ${
                  isScanningDashboard 
                    ? 'bg-blue-50/70 border-blue-200 text-blue-700 animate-pulse'
                    : aiDetectionStatus.success 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  {isScanningDashboard ? (
                    <Sparkles className="w-4 h-4 text-blue-500 shrink-0 animate-spin" />
                  ) : aiDetectionStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <span className="leading-tight">{aiDetectionStatus.message}</span>
                </div>
              )}
              
              <div className="grid grid-cols-[100px_1fr] gap-4">
                {/* Dashboard Photo */}
                <div className="h-full">
                  <PhotoUploadBox 
                    label="Dashboard" 
                    isRequired 
                    isScanning={isScanningDashboard}
                    preview={photoPreviews['Dashboard']}
                    onChange={(e) => handleRequiredPhotoChange('Dashboard', e)}
                  />
                </div>

                {/* Meters Inputs */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Gauge className="w-3 h-3 text-slate-400" />
                        Mileage (km)
                      </span>
                      <span className="text-[9px] text-slate-400 font-normal">Integer only</span>
                    </label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={mileage}
                        onChange={(e) => { setMileage(e.target.value); setError(''); }}
                        placeholder="e.g. 45000"
                        className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl outline-none transition-all font-bold text-slate-800 text-sm ${
                          isFieldAutoFilled 
                            ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-400/40' 
                            : 'border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                        }`}
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">
                        km
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider flex items-center gap-1">
                      <Fuel className="w-3 h-3 text-slate-400" />
                      Fuel Level (Left Gauge)
                    </label>
                    <select 
                      value={fuelLevel}
                      onChange={(e) => { setFuelLevel(e.target.value); setError(''); }}
                      className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl outline-none transition-all appearance-none font-bold text-slate-800 text-sm ${
                        isFieldAutoFilled 
                          ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-400/40' 
                          : 'border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      }`}
                    >
                      <option value="">Select Fuel Level...</option>
                      <option value="1 Bar">1 Bar (Low / Reserve)</option>
                      <option value="2 Bar">2 Bar</option>
                      <option value="3 Bar">3 Bar</option>
                      <option value="4 Bar">4 Bar (Half Tank)</option>
                      <option value="5 Bar">5 Bar</option>
                      <option value="6 Bar">6 Bar</option>
                      <option value="7 Bar">7 Bar</option>
                      <option value="Full Tank">Full Tank (8 Bar / F)</option>
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
              onClick={handleInitiateSubmit}
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

      {/* Verification & Double-Check Alert Modal Before Complete Handover */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-white animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800/80 bg-slate-900/50 flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-100 tracking-tight">
                  Double Check Meter Reading
                </h3>
                <p className="text-[11px] text-slate-400">
                  Verify the odometer mileage & fuel level are true and accurate.
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              
              {/* Vehicle & Inspection Context */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Vehicle Plate</span>
                  <p className="text-sm font-black text-white font-mono">{vehiclePlate}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                  handoverType === 'Pickup' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                }`}>
                  {handoverType} Inspection
                </span>
              </div>

              {/* Side-by-Side Reading Verification Card */}
              <div className="grid grid-cols-2 gap-3">
                {/* Mileage Confirmation Card */}
                <div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700/80 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Gauge className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Mileage (ODO)</span>
                  </div>
                  <div className="text-xl font-black text-white font-mono tracking-tight">
                    {Number(mileage).toLocaleString()} <span className="text-xs text-slate-400 font-sans font-medium">km</span>
                  </div>
                  <span className="inline-block text-[9px] px-1.5 py-0.5 bg-blue-500/10 text-blue-300 rounded font-mono">
                    Bottom Cluster
                  </span>
                </div>

                {/* Fuel Level Confirmation Card */}
                <div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700/80 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Fuel className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Fuel Level</span>
                  </div>
                  <div className="text-base font-bold text-emerald-400 truncate">
                    {fuelLevel}
                  </div>
                  <div className="pt-0.5">
                    {renderFuelBars(fuelLevel)}
                  </div>
                </div>
              </div>

              {/* Dashboard Photo Verification Preview */}
              {photoPreviews['Dashboard'] && (
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-slate-700 bg-black">
                    <img 
                      src={photoPreviews['Dashboard']} 
                      alt="Dashboard Meter" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-xs text-slate-300 space-y-0.5">
                    <p className="font-semibold text-slate-200 flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      Dashboard Meter Photo
                    </p>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Cross-checked against the attached dashboard meter image.
                    </p>
                  </div>
                </div>
              )}

              {/* Verification Safety Notice */}
              <div className="p-3 rounded-xl bg-slate-800/20 border border-slate-700/40 text-[11px] text-slate-400 leading-relaxed">
                ⚡ <span className="font-semibold text-slate-300">Accuracy Check:</span> Confirming exact mileage & fuel level updates vehicle usage records and fleet service schedules.
              </div>

            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Review & Edit
              </button>

              <button
                type="button"
                onClick={executeFinalSubmit}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Confirm & Submit
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default HandoverForm;
