import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import CalendarView from '../components/CalendarView';
import BookingModal from '../components/BookingModal';
import FleetModal from '../components/FleetModal';
import ActivityLogModal from '../components/ActivityLogModal';
import { Booking, Car, Member, Expense, StaffMember } from '../types';
import { apiService } from '../services/apiService';
import { parseBookingDate } from '../services/bookingService';
import { supabase } from '../services/supabase';
import { exportBookingsToExcel } from '../services/exportService';
import { optimizeBookings } from '../services/bookingService';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle } from 'lucide-react';
import { getNowMYT, utcToMyt, formatInMYT, mytToUtc } from '../utils/dateUtils';

const CalendarPage: React.FC = () => {
  const { subscriberId: currentSubscriberId, userId: currentUserId, userUid, staffRole } = useAuth();
  const location = useLocation();
  
  const [currentStaff, setCurrentStaff] = useState<StaffMember | null>(null);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);

  const [currentMonth, setCurrentMonth] = useState(getNowMYT());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTablesMissing, setIsTablesMissing] = useState(false);
  
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isFleetModalOpen, setIsFleetModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logisticCreditsEnabled, setLogisticCreditsEnabled] = useState(true);
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  const fetchData = async () => {
    if (!currentUserId || !currentSubscriberId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      setIsTablesMissing(false);
      
      const start = utcToMyt(currentMonth);
      start.setMonth(start.getMonth() - 2);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      
      const end = utcToMyt(currentMonth);
      end.setMonth(end.getMonth() + 3);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);

      const [fetchedCars, fetchedMembers, fetchedBookings, fetchedExpenses, fetchedStaff, companyProfile] = await Promise.all([
        apiService.getCars(currentSubscriberId),
        apiService.getMembers(currentSubscriberId),
        apiService.getBookings(currentSubscriberId, mytToUtc(start).toISOString(), mytToUtc(end).toISOString()),
        apiService.getExpenses(currentSubscriberId),
        apiService.getStaffMembers(currentSubscriberId),
        apiService.getCompanyById(currentSubscriberId)
      ]);
      
      if (companyProfile && companyProfile.logistic_credits_enabled !== undefined) {
        setLogisticCreditsEnabled(companyProfile.logistic_credits_enabled);
      }
      
      // --- START BULLETPROOF ROSTER LOGIC V3 ---
      
      // 1. Find the legacy DB Owner (if they have a custom color saved)
      const dbOwner = fetchedMembers.find(m => 
        m.id === currentSubscriberId || 
        m.is_subscriber || 
        (!m.staff_id && m.name.toLowerCase().includes('owner'))
      );
      
      // 2. NUCLEAR OWNER INJECTION
      const guaranteedOwner: Member = {
        id: dbOwner?.id || currentSubscriberId, 
        name: dbOwner?.name || 'ecateam (Owner)',
        subscriber_id: currentSubscriberId,
        staff_id: undefined,
        is_active: true,
        is_subscriber: true,
        color: dbOwner?.color || 'bg-slate-900' // Dark badge for Owner
      };

      // 3. BUILD FROM THE ABSOLUTE TRUTH (fetchedStaff)
      // Instead of filtering the members table, we build directly from the active staff list.
      const activeStaffMembers: Member[] = fetchedStaff.map(staff => {
        // Look in the members table ONLY to find their saved color
        const memberProfile = fetchedMembers.find(m => m.staff_id === staff.id || m.name === staff.name);
        
        return {
          id: memberProfile?.id || staff.id, // Use member ID if it exists so Color Editing still works
          name: staff.name,
          subscriber_id: currentSubscriberId,
          staff_id: staff.id,
          is_active: true,
          color: memberProfile?.color || 'bg-blue-600' // Fallback color if they are missing from the members table
        };
      });

      // 4. Update React States
      setCars(fetchedCars);
      setMembers([guaranteedOwner, ...activeStaffMembers]);
      setBookings(fetchedBookings);
      setExpenses(fetchedExpenses);
      setStaffMembers(fetchedStaff);
      
      // --- END BULLETPROOF ROSTER LOGIC V3 ---

      // Set current staff from fetched staff members if it matches currentUserId or userUid
      if (currentUserId || userUid) {
        const found = fetchedStaff.find(s => s.staff_uid === userUid || s.staff_uid === currentUserId || s.id === currentUserId);
        if (found) {
          setCurrentStaff(found);
        }
      }
    } catch (err: any) {
      if (err.message === 'DATABASE_TABLES_MISSING') {
        setIsTablesMissing(true);
      } else {
        setError(`Connection failed: ${err.message}`);
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUserId && currentSubscriberId) {
      fetchData();
    }
  }, [currentUserId, currentSubscriberId, currentMonth]);

  useEffect(() => {
    if (!currentUserId || !currentSubscriberId) return;

    const channel = supabase.channel('fleet-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `subscriber_id=eq.${currentSubscriberId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newBooking = payload.new as Booking;
          
          setBookings((prev) => {
            if (prev.some(b => b.id === payload.new.id)) return prev;
            return [...prev, newBooking];
          });
        }
        else if (payload.eventType === 'DELETE') setBookings((prev) => prev.filter((b) => b.id !== payload.old.id));
        else if (payload.eventType === 'UPDATE') {
          const updatedBooking = payload.new as Booking;
          
          setBookings((prev) => prev.map((b) => (b.id === payload.new.id ? updatedBooking : b)));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cars', filter: `subscriber_id=eq.${currentSubscriberId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setCars((prev) => {
            if (prev.some(c => c.id === payload.new.id)) return prev;
            return [...prev, payload.new as Car];
          });
        }
        else if (payload.eventType === 'DELETE') setCars((prev) => prev.filter((c) => c.id !== payload.old.id));
        else if (payload.eventType === 'UPDATE') setCars((prev) => prev.map((c) => (c.id === payload.new.id ? (payload.new as Car) : c)));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `subscriber_id=eq.${currentSubscriberId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setMembers((prev) => {
            if (prev.some(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as Member];
          });
        }
        else if (payload.eventType === 'DELETE') setMembers((prev) => prev.filter((m) => m.id !== payload.old.id));
        else if (payload.eventType === 'UPDATE') setMembers((prev) => prev.map((m) => (m.id === payload.new.id ? (payload.new as Member) : m)));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `subscriber_id=eq.${currentSubscriberId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newExpense = payload.new as Expense;
          
          setExpenses((prev) => {
            if (prev.some(e => e.id === payload.new.id)) return prev;
            return [newExpense, ...prev];
          });
        }
        else if (payload.eventType === 'DELETE') setExpenses((prev) => prev.filter((e) => e.id !== payload.old.id));
        else if (payload.eventType === 'UPDATE') {
          const updatedExpense = payload.new as Expense;
          
          setExpenses((prev) => prev.map((e) => (e.id === payload.new.id ? updatedExpense : e)));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, currentSubscriberId]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateClick = (date: Date) => {
    setEditingBooking(null);
    setSelectedDate(date);
    setIsBookingModalOpen(true);
  };

  const handleBookingClick = (booking: Booking) => {
    setEditingBooking(booking);
    setSelectedDate(utcToMyt(parseBookingDate(booking.start_date, booking.pickup_time)));
    setIsBookingModalOpen(true);
  };

  const handleSaveBooking = async (bookingData: Omit<Booking, 'id'>, staffName: string) => {
    if (!currentSubscriberId) return;
    try {
      setIsLoading(true);
      
      // Find the member to determine agent_id
      const selectedMember = members.find(m => m.id === bookingData.member_id);
      const actualAgentId = selectedMember?.staff_id || currentSubscriberId;
      
      const bookingWithAgent = {
        ...bookingData,
        agent_id: actualAgentId || '',
        agent_name: staffName,
        subscriber_id: currentSubscriberId,
        created_by: (editingBooking && editingBooking.created_by) ? editingBooking.created_by : (userUid || currentUserId || '')
      };
      const savedBooking = await apiService.saveBooking(bookingWithAgent, currentSubscriberId, editingBooking?.id);
      
      setBookings(prev => {
        const exists = prev.find(b => b.id === savedBooking.id);
        if (exists) {
           return prev.map(b => b.id === savedBooking.id ? savedBooking : b);
        }
        return [...prev, savedBooking];
      });
      
      if (currentUserId) {
        const car = cars.find(c => c.id === bookingData.car_id);
        const action = editingBooking ? 'Updated' : 'Created';
        const startDate = formatInMYT(parseBookingDate(bookingData.start_date, bookingData.pickup_time), 'dd/MM/yyyy HH:mm');
        
        await apiService.addLog({
          userId: currentUserId,
          staff_name: staffName,
          action: action,
          details: `Booking for ${car?.plate || 'Unknown Car'} (${car?.name}) starting ${startDate} for ${bookingData.duration_days} days.`
        }, currentSubscriberId);
      }

      setIsBookingModalOpen(false);
    } catch (err: any) {
      if (err.message === 'DATABASE_TABLES_MISSING') setIsTablesMissing(true);
      else alert(`Error saving booking: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBooking = async (id: string, staffName?: string) => {
    if (!currentSubscriberId) return;
    try {
      const booking = bookings.find(b => b.id === id);
      setIsLoading(true);
      await apiService.deleteBooking(id, currentSubscriberId);
      
      setBookings(prev => prev.filter(b => b.id !== id));

      if (currentUserId && booking) {
        const car = cars.find(c => c.id === booking.car_id);
        const startDate = formatInMYT(parseBookingDate(booking.start_date, booking.pickup_time), 'dd/MM/yyyy HH:mm');
        
        await apiService.addLog({
          userId: currentUserId,
          staff_name: staffName,
          action: 'Deleted',
          details: `Booking for ${car?.plate || 'Unknown Car'} on ${startDate}.`
        }, currentSubscriberId);
      }

      setIsBookingModalOpen(false);
    } catch (err: any) {
      alert(`Error deleting booking: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateMember = async (id: string, updates: Partial<Member>) => {
    if (!currentSubscriberId) return;
    try {
      await apiService.updateMember(id, currentSubscriberId, updates);
      setMembers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    } catch (err: any) {
      alert(`Error updating member: ${err.message}`);
    }
  };

  const handleOptimizeCalendar = async () => {
    const confirmed = window.confirm("This will automatically rearrange bookings within the same model group to pack them more tightly and clear up larger gaps. Continue?");
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const optimizationUpdates = optimizeBookings(bookings, cars);
      
      if (optimizationUpdates.length === 0) {
        alert("Calendar is already optimized!");
        setIsLoading(false);
        return;
      }

      let successCount = 0;
      if (currentSubscriberId) {
        for (const update of optimizationUpdates) {
          await apiService.saveBooking({
            car_id: update.car_id,
            member_id: update.member_id,
            start_date: update.start_date,
            pickup_time: update.pickup_time,
            duration_days: update.duration_days
          }, currentSubscriberId, update.id);
          successCount++;
        }
        
        if (currentUserId) {
          await apiService.addLog({
            userId: currentUserId,
            action: 'Updated',
            details: `Ran Auto-Shuffle Optimization. Re-assigned ${successCount} bookings.`
          }, currentSubscriberId);
        }
      }
      
      await fetchData();
      alert(`Optimization complete! ${successCount} bookings were rearranged.`);

    } catch (err: any) {
      alert(`Optimization failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCarStatus = async (id: string, status: 'active' | 'inactive') => {
    try {
      setIsLoading(true);
      await apiService.updateCarStatus(id, status);
      
      // Update local state
      setCars(prev => prev.map(car => car.id === id ? { ...car, status } : car));
      
      if (currentUserId && currentSubscriberId) {
        const car = cars.find(c => c.id === id);
        await apiService.addLog({
          userId: currentUserId,
          action: 'Updated',
          details: `Changed status of car ${car?.plate} to ${status}`
        }, currentSubscriberId);
      }
    } catch (error) {
      console.error('Error updating car status:', error);
      alert('Failed to update car status. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCar = async (newCar: Omit<Car, 'id'>) => {
    if (!currentSubscriberId) return;
    try {
      setIsLoading(true);
      const addedCar = await apiService.addCar(newCar, currentSubscriberId);
      
      // Update local state immediately for better UX
      setCars(prev => [...prev, addedCar]);
      
      if (currentUserId) {
        await apiService.addLog({
          userId: currentUserId,
          action: 'Created',
          details: `Added new vehicle to fleet: ${newCar.plate} (${newCar.name})`
        }, currentSubscriberId);
      }
      
      // Also refresh all data to be sure
      await fetchData();
    } catch (err: any) {
      if (err.message === 'DATABASE_TABLES_MISSING') setIsTablesMissing(true);
      else alert(`Error adding car: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCar = async (id: string) => {
    if (!currentSubscriberId) return;
    try {
      const car = cars.find(c => c.id === id);
      setIsLoading(true);
      await apiService.deleteCar(id, currentSubscriberId);
      
      setCars(prev => prev.filter(c => c.id !== id));
      
      if (currentUserId && car) {
        await apiService.addLog({
          userId: currentUserId,
          action: 'Deleted',
          details: `Removed vehicle from fleet: ${car.plate}`
        }, currentSubscriberId);
      }
      
      await fetchData();
    } catch (err: any) {
      alert(`Error deleting car: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async (newMember: Omit<Member, 'id'>) => {
    if (!currentSubscriberId) return;
    try {
      setIsLoading(true);
      await apiService.addMember(newMember, currentSubscriberId);
    } catch (err: any) {
      alert(`Error adding member: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!currentSubscriberId) return;
    try {
      setIsLoading(true);
      await apiService.deleteMember(id, currentSubscriberId);
    } catch (err: any) {
      alert(`Error deleting member: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddExpense = async (newExpense: Omit<Expense, 'id'>) => {
    if (!currentSubscriberId) return;
    try {
      setIsLoading(true);
      const expenseWithUser = {
        ...newExpense,
        created_by: userUid || currentUserId || ''
      };
      const addedExpense = await apiService.addExpense(expenseWithUser, currentSubscriberId);
      
      // Update local state immediately for instant feedback
      setExpenses(prev => {
        if (prev.some(e => e.id === addedExpense.id)) return prev;
        return [addedExpense, ...prev].slice(0, 30);
      });
    } catch (err: any) {
      if (err.message === 'DATABASE_TABLES_MISSING') setIsTablesMissing(true);
      else alert(`Error adding expense: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!currentSubscriberId) return;
    try {
      setIsLoading(true);
      await apiService.deleteExpense(id, currentSubscriberId);
      
      // Update local state immediately for instant feedback
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (err: any) {
      alert(`Error deleting expense: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    exportBookingsToExcel(currentMonth, bookings, cars, members);
  };

  const monthName = formatInMYT(currentMonth, 'MMMM yyyy');

  if (error && bookings.length === 0 && cars.length === 0) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 md:p-12 text-center max-w-2xl w-full shadow-2xl shadow-slate-200/50">
          <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-4 tracking-tight">Connection Lost</h2>
          <p className="text-slate-500 mb-8 leading-relaxed font-medium">
            We're having trouble reaching the Supabase database. This usually happens if the project is paused or your network is restricted.
          </p>
          
          <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-left border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-3 text-xs uppercase tracking-widest">Quick Fixes:</h3>
            <ul className="text-sm text-slate-600 space-y-3 font-medium">
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span>Go to your <strong>Supabase Dashboard</strong> and check if the project is "Paused".</span>
              </li>
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span>Ensure you are not behind a firewall that blocks <code>supabase.co</code>.</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={fetchData}
              className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-[0.98]"
            >
              Retry Sync
            </button>
            <a 
              href="https://supabase.com/dashboard" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-8 py-4 bg-white text-slate-600 border border-slate-200 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-slate-50 transition-all active:scale-[0.98]"
            >
              Supabase Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-slate-50 overflow-hidden relative font-sans text-slate-900">
      {isLoading && (
        <div className="absolute inset-0 z-[1000] bg-white/60 backdrop-blur-[1px] flex items-center justify-center transition-opacity">
          <div className="bg-slate-900 text-white px-5 py-2.5 rounded-full font-bold text-[10px] tracking-widest uppercase flex items-center gap-2.5 shadow-xl">
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Syncing...
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1001] bg-rose-500 text-white px-6 py-3 rounded-full shadow-xl font-medium flex items-center gap-3 animate-in slide-in-from-top-4">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span className="text-sm">{error}</span>
        </div>
      )}

      <header className="bg-white/80 backdrop-blur-md h-14 md:h-16 flex items-center justify-between px-4 md:px-8 shrink-0 z-50 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
          <div className="flex flex-col md:flex-row md:items-baseline gap-0 md:gap-2">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Calendar</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {staffRole === 'admin' && (
            <button 
              onClick={async () => {
                if (!currentSubscriberId) return;
                const newValue = !logisticCreditsEnabled;
                setLogisticCreditsEnabled(newValue);
                try {
                  await apiService.updateCompany(currentSubscriberId, { logistic_credits_enabled: newValue });
                } catch (err) {
                  console.error("Failed to update logistic credits setting", err);
                  setLogisticCreditsEnabled(!newValue); // revert on error
                }
              }}
              className={`hidden md:flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors px-3 py-2 rounded-lg ${
                logisticCreditsEnabled 
                  ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100' 
                  : 'text-rose-700 bg-rose-50 hover:bg-rose-100'
              }`}
              title={logisticCreditsEnabled ? "Logistic Credits: ON" : "Logistic Credits: OFF"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Logistic Credits: {logisticCreditsEnabled ? 'ON' : 'OFF'}
            </button>
          )}

          <button 
             onClick={handleOptimizeCalendar}
             className="hidden md:flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 hover:text-purple-800 transition-colors px-3 py-2 bg-purple-50 hover:bg-purple-100 rounded-lg"
             title="Pack bookings tightly"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
            Re-Optimize
          </button>

          <button 
             onClick={() => setIsLogModalOpen(true)}
             className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-indigo-600 transition-colors px-3 py-2"
             title="View Activity Logs"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
            <span className="hidden md:inline">Activity</span>
          </button>
          
          <div className="h-6 w-px bg-slate-200 hidden md:block" />

          <button 
            onClick={() => setIsFleetModalOpen(true)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
            <span className="hidden md:inline">Manage Fleet</span>
          </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-3 md:p-6 lg:px-8 max-w-[1600px] mx-auto w-full shrink-0">
        <div className="flex items-center justify-between w-full md:w-auto gap-4 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-1">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <button onClick={handleNextMonth} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
          <h2 className="text-base md:text-lg font-bold text-slate-800 tracking-tight flex-1 text-center md:text-left min-w-[120px]">
            {monthName}
          </h2>
          <button onClick={() => setCurrentMonth(getNowMYT())} className="px-3 py-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 rounded-lg uppercase tracking-wide hover:bg-blue-100 transition-colors">
            Today
          </button>
          
          <div className="w-px h-6 bg-slate-200 mx-1 hidden md:block"></div>
          
          <button 
            onClick={handleExport} 
            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" 
            title="Export Month to Excel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
        </div>

        <div className="flex w-full md:w-auto gap-2">
          {staffRole === 'admin' && (
            <button 
              onClick={async () => {
                if (!currentSubscriberId) return;
                const newValue = !logisticCreditsEnabled;
                setLogisticCreditsEnabled(newValue);
                try {
                  await apiService.updateCompany(currentSubscriberId, { logistic_credits_enabled: newValue });
                } catch (err) {
                  console.error("Failed to update logistic credits setting", err);
                  setLogisticCreditsEnabled(!newValue); // revert on error
                }
              }}
              className={`md:hidden flex-1 border px-2 py-3 rounded-xl font-bold text-[10px] uppercase tracking-wide shadow-sm flex items-center justify-center gap-1 ${
                logisticCreditsEnabled 
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                  : 'text-rose-700 bg-rose-50 border-rose-200'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              LC: {logisticCreditsEnabled ? 'ON' : 'OFF'}
            </button>
          )}

          <button 
            onClick={handleOptimizeCalendar}
            className="md:hidden flex-1 bg-purple-50 border border-purple-200 text-purple-700 px-2 py-3 rounded-xl font-bold text-[10px] uppercase tracking-wide shadow-sm flex items-center justify-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
            Optimize
          </button>
          
          <button 
            onClick={() => handleDateClick(getNowMYT())}
            className="flex-1 md:flex-none bg-slate-900 hover:bg-slate-800 text-white px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-slate-900/10 active:scale-[0.98] transition-all"
          >
            + Booking
          </button>
        </div>
      </div>

      <main className="flex-1 px-2 md:px-6 lg:px-8 max-w-[1600px] mx-auto w-full mb-2 md:mb-6 overflow-hidden">
        <div className="bg-white h-full rounded-2xl md:rounded-[2rem] shadow-sm border border-slate-200/60 flex flex-col overflow-hidden">
          <CalendarView 
            currentMonth={currentMonth} 
            bookings={bookings}
            cars={cars}
            members={members}
            onDateClick={handleDateClick}
            onBookingClick={handleBookingClick}
            onDeleteBooking={handleDeleteBooking}
          />
        </div>
      </main>

      <BookingModal 
        isOpen={isBookingModalOpen} 
        onClose={() => setIsBookingModalOpen(false)}
        initialDate={selectedDate}
        editingBooking={editingBooking}
        onSave={handleSaveBooking}
        onDelete={handleDeleteBooking}
        existingBookings={bookings}
        cars={cars}
        members={members}
        subscriberId={currentSubscriberId}
        currentStaff={currentStaff}
        currentUserId={currentUserId}
        userUid={userUid}
        staffRole={staffRole}
      />

      <FleetModal
        isOpen={isFleetModalOpen}
        onClose={() => setIsFleetModalOpen(false)}
        cars={cars}
        members={members}
        expenses={expenses}
        onAddCar={handleAddCar}
        onDeleteCar={handleDeleteCar}
        onUpdateCarStatus={handleUpdateCarStatus}
        onUpdateMember={handleUpdateMember}
        onAddExpense={handleAddExpense}
        onDeleteExpense={handleDeleteExpense}
        currentStaff={currentStaff}
      />

      <ActivityLogModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        subscriberId={currentSubscriberId}
      />
    </div>
  );
};

export default CalendarPage;
