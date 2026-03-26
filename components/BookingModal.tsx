
import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Link } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import { Car, Booking, Member, StaffMember } from '../types';
import { getAvailableCars, validateBooking, findAvailableCarByModel, suggestUpgrade } from '../services/bookingService';
import { apiService } from '../services/apiService';
import { parseBookingDate } from '../services/bookingService';
import { getNowMYT, getMYTInputString, getMYTDateString, getMYTTimeString, mytToUtc, formatInMYT } from '../utils/dateUtils';
import HandoverForm from './HandoverForm';
import PinModal from './PinModal';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate: Date | null;
  editingBooking: Booking | null;
  onSave: (booking: Omit<Booking, 'id'>, staffName: string) => void;
  onDelete?: (id: string, staffName: string) => void;
  existingBookings: Booking[];
  cars: Car[];
  members: Member[];
  preselectedCarId?: string;
  subscriberId: string | null;
  currentStaff?: StaffMember | null;
  currentUserId?: string | null;
  userUid?: string | null;
  staffRole?: string | null;
}

const BookingModal: React.FC<BookingModalProps> = ({ 
  isOpen, onClose, initialDate, editingBooking, onSave, onDelete, existingBookings, cars, members, preselectedCarId, subscriberId, currentStaff, currentUserId, userUid, staffRole
}) => {
  const navigate = useNavigate();
  const { subscriptionTier } = useAuth();
  // Modes: 'category' (Auto-assign based on model) or 'specific' (Manual plate selection)
  const [bookingMode, setBookingMode] = useState<'category' | 'specific'>('category');
  
  const [car_id, setCarId] = useState(''); // Used for 'specific' mode
  const [selectedModel, setSelectedModel] = useState(''); // Used for 'category' mode
  
  const [member_id, setMemberId] = useState('');
  
  const [duration, setDuration] = useState(1);
  const [selectedDateTimeStr, setSelectedDateTimeStr] = useState('');
  const [error, setError] = useState('');
  const [upgradeSuggestion, setUpgradeSuggestion] = useState<Car | null>(null);

  // New state for Early Return logic
  const [isEarlyReturn, setIsEarlyReturn] = useState(false);
  const [actualEndTime, setActualEndTime] = useState('');

  const [isHandoverOpen, setIsHandoverOpen] = useState(false);
  const [handoverRecords, setHandoverRecords] = useState<any[]>([]);
  const [viewingRecord, setViewingRecord] = useState<any | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [signedUrls, setSignedUrls] = useState<string[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);

  // PIN Modal State
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'save' | 'delete', data?: any } | null>(null);
  const [selectedStaffMember, setSelectedStaffMember] = useState<StaffMember | null>(null);

  // Fetch signed URLs when viewing a record
  useEffect(() => {
    if (viewingRecord && viewingRecord.photos_url && viewingRecord.photos_url.length > 0) {
      // Instead of fetching all at once, we just set the paths or original URLs
      // and let the Lightbox slide render handle the signing.
      // However, yet-another-react-lightbox expects 'src'.
      // To support lazy loading properly, we can fetch the first few, or just fetch all if it's small (6 items).
      // The user specifically asked for lazy loading.
      // Let's implement a custom slide or just fetch all if it's small.
      // Given the constraint "ensure we only request signed URLs when they are actually needed",
      // we should ideally fetch on slide change.
      // But for 6 photos, fetching 6 signed URLs is 1 HTTP request (createSignedUrls).
      // Fetching 1 by 1 is 6 HTTP requests.
      // The most efficient way for DB/Network is actually fetching ALL 6 in ONE batch request.
      // "Lazy loading" usually applies to the *image data* (bytes), not the signed URL generation, unless there are hundreds.
      // If the user insists on "only request signed URLs when needed", they might mean "don't fetch if the modal isn't open".
      // Current code fetches when `viewingRecord` is set (modal open).
      // I will keep the batch fetch as it is MORE efficient for 6 items than 6 separate calls.
      // I will add a check to ensure we don't re-fetch if already valid.
      
      const fetchSignedUrls = async () => {
        setIsLoadingPhotos(true);
        try {
          // Extract paths from public URLs
          // Assuming format: .../handover_images/PATH
          const paths = viewingRecord.photos_url.map((url: string) => {
            const parts = url.split('/handover_images/');
            return parts.length > 1 ? parts[1] : url;
          });

          // Batch fetch is better for performance than lazy single fetches for small counts
          const urls = await apiService.getSignedUrls(paths);
          setSignedUrls(urls);
        } catch (err) {
          console.error('Failed to load private photos:', err);
          setSignedUrls(viewingRecord.photos_url);
        } finally {
          setIsLoadingPhotos(false);
        }
      };
      fetchSignedUrls();
    } else {
      setSignedUrls([]);
    }
  }, [viewingRecord]);

  // Fetch handover records when editing a booking
  useEffect(() => {
    if (editingBooking && subscriberId) {
      apiService.getHandoverRecords(editingBooking.id, subscriberId).then(setHandoverRecords);
    } else {
      setHandoverRecords([]);
    }
  }, [editingBooking, subscriberId, isHandoverOpen]);

  // Derive unique models from cars
  const uniqueModels = useMemo(() => {
    return Array.from(new Set(cars.map(c => c.name.trim()))).sort();
  }, [cars]);

  // Calculate availability for each model based on selected date/duration
  const modelAvailability = useMemo(() => {
    if (!selectedDateTimeStr) return {};
    
    const map: Record<string, number> = {};

    uniqueModels.forEach(model => {
      const modelCars = cars.filter(c => c.name.trim() === model);
      const available = modelCars.filter(car => {
         const [startDate, pickupTime] = selectedDateTimeStr.split('T');
         const bookingData = { 
           car_id: car.id, 
           start_date: startDate, 
           pickup_time: pickupTime,
           duration_days: Number(duration),
           member_id: '', // Dummy for validation
           ...(isEarlyReturn && actualEndTime ? { end_time: mytToUtc(actualEndTime).toISOString() } : { end_time: null })
         };
         // Exclude current booking if editing
         const otherBookings = editingBooking 
           ? existingBookings.filter(b => b.id !== editingBooking.id) 
           : existingBookings;
         return validateBooking(bookingData, otherBookings);
      });
      map[model] = available.length;
    });
    return map;
  }, [selectedDateTimeStr, duration, uniqueModels, cars, existingBookings, editingBooking, isEarlyReturn, actualEndTime]);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setUpgradeSuggestion(null);
      setIsEarlyReturn(false); // Reset checkbox on open
      
      if (editingBooking) {
        // Editing: Switch to specific mode to show current assignment
        setBookingMode('specific');
        setCarId(editingBooking.car_id);
        setMemberId(editingBooking.member_id || '');
        setDuration(editingBooking.duration_days);
        
        if (editingBooking.end_time) {
          setIsEarlyReturn(true);
          setActualEndTime(getMYTInputString(editingBooking.end_time));
        } else {
          setIsEarlyReturn(false);
          setActualEndTime('');
        }
        
        const car = cars.find(c => c.id === editingBooking.car_id);
        if (car) setSelectedModel(car.name);
        
        setSelectedDateTimeStr(getMYTInputString(parseBookingDate(editingBooking.start_date, editingBooking.pickup_time)));
      } else if (initialDate) {
        // New: Default to category mode
        setBookingMode('category');
        setCarId(preselectedCarId || '');
        
        // Pre-select member_id if it corresponds to currentStaff
        if (currentStaff) {
          const ownMember = members.find(m => m.staff_id === currentStaff.id);
          if (ownMember) setMemberId(ownMember.id);
        } else {
          // Fallback: If no currentStaff (e.g. Subscriber/Admin logged in directly),
          // pre-select the subscriber member (Owner)
          const subscriberMember = members.find(m => m.is_subscriber);
          if (subscriberMember) setMemberId(subscriberMember.id);
          else setMemberId('');
        }
        
        // If a car was clicked on the calendar row (preselectedCarId), select its model
        if (preselectedCarId) {
          const car = cars.find(c => c.id === preselectedCarId);
          if (car) setSelectedModel(car.name);
        } else {
          setSelectedModel('');
        }
        
        setDuration(1);
        
        const now = getNowMYT();
        const d = new Date(initialDate);
        if (d.getHours() === 0 && d.getMinutes() === 0) {
           d.setHours(now.getHours(), 0, 0, 0); 
        }

        setSelectedDateTimeStr(getMYTInputString(d));
      }
    }
  }, [isOpen, initialDate, editingBooking, preselectedCarId, cars]);

  // For specific mode: Calculate strictly available cars
  const selectedDate = selectedDateTimeStr ? new Date(selectedDateTimeStr) : null;
  const specificAvailableCars = selectedDate 
    ? getAvailableCars(selectedDate, existingBookings.filter(b => b.id !== editingBooking?.id), cars) 
    : [];

  const dropdownCars = editingBooking && !specificAvailableCars.find(c => c.id === car_id)
    ? [...specificAvailableCars, cars.find(c => c.id === car_id)].filter(Boolean) as Car[]
    : specificAvailableCars;

  // Check if currently selected model is fully booked
  const isSelectedModelFull = selectedModel && modelAvailability[selectedModel] === 0;

  // Privacy Shield Logic
  const isEditable = useMemo(() => {
    // Determine if user is the Subscriber (owner)
    // subscriberId is the UUID of the subscriber
    // userUid is the UUID of the logged-in user
    const isSubscriber = userUid && subscriberId && userUid === subscriberId;
    const isSuperAdmin = subscriberId === 'superadmin' || staffRole === 'admin' && currentUserId === 'superadmin';

    if (!editingBooking) return true; // New bookings are always editable
    
    // Subscriber/Admin has full access
    if (staffRole === 'admin' || isSubscriber || isSuperAdmin) {
      return true;
    }
    
    // Agents can edit if they created the booking
    if (editingBooking.created_by) {
      const canEdit = editingBooking.created_by === currentUserId || editingBooking.created_by === userUid;
      return canEdit;
    }
    
    // Fallback for legacy bookings without created_by
    const isAgent = editingBooking.agent_id === currentUserId || editingBooking.agent_id === userUid;
    console.log('Agent fallback check:', { isAgent });
    return isAgent;
  }, [editingBooking, staffRole, currentUserId, userUid, subscriberId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditable) return; // Guard
    setError('');
    setUpgradeSuggestion(null);

    if (!selectedDateTimeStr) return setError('Please select a start date and time');
    if (!member_id) return setError('Please select a fleet member');
    if (isEarlyReturn) {
      if (!actualEndTime) return setError('Please select an actual end time');
      if (new Date(actualEndTime).getTime() <= new Date(selectedDateTimeStr).getTime()) {
        return setError('Actual end time must be after the start time');
      }
    }
    
    // Logic split based on mode
    let finalCarId = car_id;

    if (bookingMode === 'category') {
      if (!selectedModel) return setError('Please select a Vehicle Model');
      
      const foundCarId = findAvailableCarByModel(
        selectedModel, 
        new Date(selectedDateTimeStr), 
        duration, 
        existingBookings.filter(b => b.id !== editingBooking?.id), 
        cars,
        isEarlyReturn && actualEndTime ? new Date(actualEndTime).toISOString() : undefined
      );

      if (!foundCarId) {
        // Try to find upgrade
        const upgrade = suggestUpgrade(
          selectedModel,
          new Date(selectedDateTimeStr),
          duration,
          existingBookings.filter(b => b.id !== editingBooking?.id),
          cars,
          isEarlyReturn && actualEndTime ? new Date(actualEndTime).toISOString() : undefined
        );

        if (upgrade) {
          setUpgradeSuggestion(upgrade);
          setError(`No ${selectedModel} available. Upgrade available: ${upgrade.name} (${upgrade.type}).`);
        } else {
          setError(`All ${selectedModel}s are fully booked for these dates, and no upgrades are available.`);
        }
        return;
      }
      finalCarId = foundCarId;
    } else {
      if (!finalCarId) return setError('Please select a specific car');
    }

    const selectedMember = members.find(m => m.id === member_id);
    if (!selectedMember) return setError('Invalid member selected');
    
    const finalStaffName = selectedMember.name;

    const [startDate, pickupTime] = selectedDateTimeStr.split('T');

    const bookingData = {
      car_id: finalCarId,
      member_id,
      start_date: startDate,
      pickup_time: pickupTime,
      duration_days: Number(duration),
      ...(isEarlyReturn && actualEndTime ? { end_time: mytToUtc(actualEndTime).toISOString() } : { end_time: null })
    };

    // Double check validation for specific car (Category mode is already validated by findAvailableCarByModel)
    if (bookingMode === 'specific') {
      const otherBookings = editingBooking 
        ? existingBookings.filter(b => b.id !== editingBooking.id) 
        : existingBookings;
      
      if (!validateBooking(bookingData, otherBookings)) {
        return setError('Conflict detected! This specific vehicle is busy during the requested time window.');
      }
    }

    localStorage.setItem('last_staff_name', finalStaffName);

    // PIN CHECK LOGIC
    if (editingBooking && subscriberId) {
      // For updates, we require PIN if it's a staff member
      // Subscribers (is_subscriber: true) might not have a PIN in staff_members table
      if (!selectedMember.is_subscriber) {
        try {
          const staff = await apiService.getStaffMemberByName(finalStaffName, subscriberId);
          if (staff && staff.pin_hash) {
            setSelectedStaffMember(staff);
            setPendingAction({ type: 'save', data: bookingData });
            setIsPinModalOpen(true);
            return;
          }
        } catch (err) {
          console.error('Failed to verify staff PIN status', err);
        }
      }
    }

    onSave(bookingData, finalStaffName);
    onClose();
  };

  const handleDeleteClick = async () => {
    const selectedMember = members.find(m => m.id === member_id);
    if (!selectedMember) {
      setError('Please select a fleet member to delete');
      return;
    }
    const finalStaffName = selectedMember.name;
    localStorage.setItem('last_staff_name', finalStaffName);

    if (editingBooking && onDelete && subscriberId) {
      if (!selectedMember.is_subscriber) {
        try {
          // Fetch fresh staff data from DB to ensure PIN is current
          const staff = await apiService.getStaffMemberByName(finalStaffName, subscriberId);
          if (staff && staff.pin_hash) {
            setSelectedStaffMember(staff);
            setPendingAction({ type: 'delete', data: editingBooking.id });
            setIsPinModalOpen(true);
            return;
          }
        } catch (err) {
          console.error('Failed to verify staff PIN status', err);
        }
      }
      onDelete(editingBooking.id, finalStaffName);
    }
  };

  const handlePinSuccess = () => {
    if (pendingAction && selectedStaffMember) {
      if (pendingAction.type === 'save') {
        onSave(pendingAction.data, selectedStaffMember.name);
        onClose();
      } else if (pendingAction.type === 'delete') {
        if (onDelete) onDelete(pendingAction.data, selectedStaffMember.name);
      }
    }
    setIsPinModalOpen(false);
    setPendingAction(null);
    setSelectedStaffMember(null);
  };

  const acceptUpgrade = () => {
    if (upgradeSuggestion) {
      setSelectedModel(upgradeSuggestion.name);
      setUpgradeSuggestion(null);
      setError('');
      // The user still needs to click "Confirm" to book the new model
    }
  };

  const generateHandoverLink = (type: 'Pickup' | 'Return') => {
    if (!editingBooking) return;
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/handover/${editingBooking.id}?type=${type}`;
    navigator.clipboard.writeText(link);
    toast.success(`${type} link copied to clipboard!`);
  };

  return (
    <>
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-md my-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 rounded-t-3xl z-10">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            {editingBooking ? (isEditable ? 'Edit Booking' : 'View Booking') : 'New Reservation'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-50">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Privacy Shield Notice */}
          {!isEditable && (
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m11-3V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-4z"/></svg>
              </div>
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider leading-tight">
                Privacy Shield Active: This booking belongs to another agent and cannot be modified.
              </p>
            </div>
          )}

          {/* Booking Mode Toggles */}
          {!editingBooking && (
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setBookingMode('category')}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${bookingMode === 'category' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
              >
                By Category
              </button>
              <button
                type="button"
                onClick={() => setBookingMode('specific')}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${bookingMode === 'specific' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Specific Plate
              </button>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wider">Start Time</label>
            <input 
              type="datetime-local"
              value={selectedDateTimeStr}
              onChange={(e) => setSelectedDateTimeStr(e.target.value)}
              disabled={!isEditable}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all font-semibold text-slate-700 text-sm disabled:opacity-60"
            />
          </div>

          {/* Customer Handover Links */}
          {editingBooking && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Customer Self-Service Links</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => generateHandoverLink('Pickup')}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95"
                >
                  <Link className="w-3.5 h-3.5 text-slate-400" />
                  Copy Pickup
                </button>
                <button
                  type="button"
                  onClick={() => generateHandoverLink('Return')}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95"
                >
                  <Link className="w-3.5 h-3.5 text-slate-400" />
                  Copy Return
                </button>
              </div>
              <p className="text-[9px] text-slate-400 text-center leading-tight">
                Send these links to the customer via WhatsApp for self-service handover.
              </p>
            </div>
          )}

          {/* Conditional Input based on Mode */}
          {bookingMode === 'category' ? (
             <div>
               <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wider">Vehicle Model</label>
               <div className="relative">
                 <select 
                   value={selectedModel} 
                   onChange={(e) => {
                     setSelectedModel(e.target.value);
                     setError('');
                     setUpgradeSuggestion(null);
                   }}
                   disabled={!isEditable}
                   className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all appearance-none font-semibold text-sm disabled:opacity-60 ${isSelectedModelFull ? 'bg-rose-50 border-rose-300 text-rose-800 focus:ring-rose-500' : 'bg-slate-50 border-slate-200 text-slate-700 focus:ring-slate-900'}`}
                 >
                   <option value="">-- Select Model --</option>
                   {uniqueModels.map(model => {
                     const count = modelAvailability[model];
                     const isFull = count === 0;
                     const label = count !== undefined 
                       ? (isFull ? `${model} (Fully Booked)` : `${model} (${count} Available)`)
                       : model;
                     
                     return (
                       <option key={model} value={model} className={isFull ? 'text-rose-500 font-bold' : ''}>
                         {label}
                       </option>
                     );
                   })}
                 </select>
                 <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                 </div>
               </div>
               <p className={`text-[10px] mt-2 transition-colors ${isSelectedModelFull ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                 {isSelectedModelFull ? 'This model is unavailable for the selected dates.' : 'System will automatically assign the best available plate for this model.'}
               </p>
             </div>
          ) : (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wider">Specific Vehicle</label>
              <div className="relative">
                <select 
                  value={car_id} 
                  onChange={(e) => setCarId(e.target.value)}
                  disabled={!isEditable}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all appearance-none font-semibold text-slate-700 text-sm disabled:opacity-60"
                >
                  <option value="">-- Select Available Car --</option>
                  {dropdownCars.map(car => (
                    <option key={car.id} value={car.id}>{car.plate} — {car.name}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wider">Fleet Member (Staff / Owner)</label>
            <div className="relative">
              <select 
                value={member_id} 
                onChange={(e) => setMemberId(e.target.value)}
                disabled={!isEditable}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all appearance-none font-semibold text-slate-700 text-sm disabled:opacity-60"
              >
                <option value="">-- Select Member --</option>
                {members.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name} {member.is_subscriber ? '(Owner)' : ''}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Duration (Days)</label>
              
              {/* Early Return Checkbox - Only visible in Specific Mode */}
              {bookingMode === 'specific' && (
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="earlyReturn"
                    checked={isEarlyReturn}
                    onChange={(e) => setIsEarlyReturn(e.target.checked)}
                    disabled={!isEditable}
                    className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900 accent-slate-900 disabled:opacity-60"
                  />
                  <label htmlFor="earlyReturn" className="text-[10px] font-bold text-blue-600 uppercase tracking-wider cursor-pointer select-none hover:text-blue-800 disabled:opacity-60">
                    If Customer Early Return
                  </label>
                </div>
              )}
            </div>

            <input 
              type="number" 
              min="0.001" 
              step="0.001"
              max="365"
              value={duration}
              onChange={(e) => setDuration(parseFloat(e.target.value))}
              disabled={!isEditable}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all font-semibold text-slate-700 text-sm disabled:opacity-60"
            />
          </div>

          {isEarlyReturn && (
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Actual End Time
              </label>
              <input 
                type="datetime-local" 
                value={actualEndTime}
                onChange={(e) => setActualEndTime(e.target.value)}
                disabled={!isEditable}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all font-semibold text-slate-700 text-sm disabled:opacity-60"
              />
            </div>
          )}

          {error && (
            <div className={`p-3 border rounded-xl text-xs font-bold flex flex-col gap-2 ${upgradeSuggestion ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
              <div className="flex items-center gap-2">
                 <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                 {error}
              </div>
              
              {upgradeSuggestion && (
                <button
                  type="button"
                  onClick={acceptUpgrade}
                  className="mt-1 w-full py-2 bg-amber-200 text-amber-900 rounded-lg hover:bg-amber-300 transition-colors uppercase tracking-wide text-[10px]"
                >
                  Accept Upgrade to {upgradeSuggestion.name}
                </button>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 pt-4">
            {editingBooking && (
              subscriptionTier === 'tier_2' ? (
                <button 
                  type="button" 
                  disabled
                  className="w-full py-4 bg-slate-200 rounded-xl text-slate-400 font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 cursor-not-allowed border border-slate-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                  Generate Digital Form (Locked)
                </button>
              ) : (
                <button 
                  type="button" 
                  onClick={() => navigate(`/forms/create?booking_id=${editingBooking.id}`)}
                  className="w-full py-4 bg-blue-600 rounded-xl text-white font-bold uppercase text-xs tracking-widest hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  Generate Digital Form
                </button>
              )
            )}

            {editingBooking && isEditable && (
              <button 
                type="button" 
                onClick={() => setIsHandoverOpen(true)}
                className="w-full py-4 bg-emerald-600 rounded-xl text-white font-bold uppercase text-xs tracking-widest hover:bg-emerald-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                Start Handover
              </button>
            )}

            {/* Handover History */}
            {handoverRecords.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100 mt-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Handover Records</h3>
                {handoverRecords.map(record => (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => setViewingRecord(record)}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 transition-colors text-left group"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{record.handover_type}</div>
                      <div className="text-[10px] text-slate-500">{formatInMYT(new Date(record.created_at).getTime(), 'dd/MM/yyyy HH:mm')}</div>
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 group-hover:text-blue-600 uppercase tracking-wider flex items-center gap-1 transition-colors">
                      View Photos
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {isEditable && (
              <button 
                type="submit"
                disabled={(!car_id && !selectedModel) || !member_id}
                className="w-full py-4 bg-slate-900 rounded-xl text-white font-bold uppercase text-xs tracking-widest hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                {editingBooking ? 'Update Booking' : 'Confirm'}
              </button>
            )}
            
            {editingBooking && onDelete && isEditable && (
              <button 
                type="button" 
                onClick={handleDeleteClick}
                className="w-full py-3 text-rose-500 font-bold uppercase text-[10px] tracking-widest hover:bg-rose-50 rounded-xl transition-all"
              >
                Delete Booking
              </button>
            )}
          </div>
        </form>
      </div>

      {isHandoverOpen && editingBooking && subscriberId && (
        <HandoverForm 
          bookingId={editingBooking.id} 
          car_id={editingBooking.car_id}
          vehiclePlate={cars.find(c => c.id === editingBooking.car_id)?.plate || 'Unknown Vehicle'}
          onClose={() => setIsHandoverOpen(false)} 
          onSuccess={() => {
            setIsHandoverOpen(false);
            alert('Handover record saved successfully!');
          }}
          subscriberId={subscriberId}
        />
      )}

      {/* Handover Record Viewer */}
      {viewingRecord && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col p-4 animate-in fade-in duration-200">
          <div className="flex justify-between items-center text-white mb-6 shrink-0">
            <div>
              <h3 className="font-bold text-lg">{viewingRecord.handover_type} Record</h3>
              <p className="text-xs text-slate-400">{formatInMYT(new Date(viewingRecord.created_at).getTime(), 'dd/MM/yyyy HH:mm')}</p>
            </div>
            <button 
              onClick={() => setViewingRecord(null)} 
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          
            <div className="flex-1 overflow-y-auto">
              {isLoadingPhotos ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-20">
                  {/* Photos */}
                  {signedUrls.map((url: string, index: number) => (
                    <div 
                      key={index} 
                      className="space-y-2 group cursor-pointer"
                      onClick={() => setLightboxIndex(index)}
                    >
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-blue-500 transition-colors">
                        <img src={url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                        <p className="absolute bottom-2 left-2 text-white text-[10px] font-bold uppercase tracking-wider">Photo {index + 1}</p>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-8 h-8 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"/></svg>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Lightbox */}
                  <Lightbox
                    open={lightboxIndex >= 0}
                    index={lightboxIndex}
                    close={() => setLightboxIndex(-1)}
                    slides={signedUrls.map((url: string) => ({ src: url }))}
                    plugins={[Zoom]}
                    zoom={{
                      maxZoomPixelRatio: 3,
                      zoomInMultiplier: 2,
                      doubleTapDelay: 300,
                      doubleClickDelay: 300,
                      doubleClickMaxStops: 2,
                      keyboardMoveDistance: 50,
                      wheelZoomDistanceFactor: 100,
                      pinchZoomDistanceFactor: 100,
                    }}
                  />

                  {/* Details */}
                  <div className="col-span-2 md:col-span-3 bg-slate-900 border border-slate-800 p-6 rounded-xl text-slate-300 text-xs space-y-4 font-mono">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Mileage:</span>
                        <span className="text-white font-bold">{viewingRecord.mileage} km</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fuel Level:</span>
                        <span className="text-white font-bold">{viewingRecord.fuel_level}</span>
                      </div>
                    </div>
                    
                    {viewingRecord.condition_details && (
                      <div className="pt-4 border-t border-slate-800">
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Condition Details:</p>
                        <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{viewingRecord.condition_details}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
        </div>
      )}
    </div>

    {/* PIN Modal for sensitive actions */}
    <PinModal
      isOpen={isPinModalOpen}
      onClose={() => {
        setIsPinModalOpen(false);
        setPendingAction(null);
        setSelectedStaffMember(null);
      }}
      onSuccess={handlePinSuccess}
      title={pendingAction?.type === 'delete' ? 'Confirm Deletion' : 'Confirm Update'}
      staffName={selectedStaffMember?.name || ''}
      expectedPinHash={selectedStaffMember?.pin_hash}
    />
    </>
  );
};

export default BookingModal;
