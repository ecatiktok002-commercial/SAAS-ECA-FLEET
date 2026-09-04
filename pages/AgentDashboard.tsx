import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { parseBookingDate, getBookingEndTime } from '../services/bookingService';
import { getNowMYT, utcToMyt, formatInMYT, getAgreementPickupDateTime, getMYTDateString } from '../utils/dateUtils';
import { 
  Car, DollarSign, AlertTriangle, 
  TrendingUp, TrendingDown, Clock, ArrowRight, CheckCircle2,
  Wallet, BarChart3, ListTodo, X, FileSignature, FileText,
  Copy, MessageCircle, ExternalLink, Sparkles, Filter,
  Eye, ShieldCheck, AlertCircle, RefreshCw, Upload, Check, Info,
  Receipt, ArrowUpRight, HelpCircle, Pencil, Plus, Calendar
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Agreement, Booking, MarketingEvent } from '../types';
import { AgentGamificationWidget } from '../components/AgentGamificationWidget';
import { AvailableToSellCard, AvailableCarOpportunity, GroupedOpportunity } from '../components/AvailableToSellCard';
import BookingModal from '../components/BookingModal';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell 
} from 'recharts';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabase';

interface PendingDelivery {
  id: string;
  customerName: string;
  carPlate: string;
  pickupTime: Date;
}

interface OverdueReturn {
  id: string;
  customerName: string;
  carPlate: string;
  returnTime: Date;
}

const AgentDashboard: React.FC = () => {
  const { subscriberId, userId, userUid, userName, staffRole } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [confirmReturnId, setConfirmReturnId] = useState<string | null>(null);
  const [isConfirmingReturn, setIsConfirmingReturn] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const [missionFilter, setMissionFilter] = useState<'all' | 'forms' | 'vehicles'>('all');
  const [showPayoutModal, setShowPayoutModal] = useState(false);

  // Booking Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedBookingDate, setSelectedBookingDate] = useState<Date | null>(null);
  const [editingBookingModal, setEditingBookingModal] = useState<Booking | null>(null);

  // Custom Agent Name (saved in Frontend localStorage)
  const customNameStorageKey = `agent_custom_display_name_${subscriberId || 'default'}_${userUid || userId || 'default'}`;
  const [customAgentName, setCustomAgentName] = useState<string>(() => {
    try {
      return localStorage.getItem(customNameStorageKey) || '';
    } catch {
      return '';
    }
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempAgentName, setTempAgentName] = useState('');

  // Greeting based on Malaysian Time hour
  const greeting = useMemo(() => {
    const hour = parseInt(formatInMYT(currentTime.getTime(), 'H'), 10);
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }, [currentTime]);

  const handleSaveCustomName = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = tempAgentName.trim();
    if (trimmed) {
      localStorage.setItem(customNameStorageKey, trimmed);
      setCustomAgentName(trimmed);
      toast.success(`Display name updated to "${trimmed}"`);
    } else {
      localStorage.removeItem(customNameStorageKey);
      setCustomAgentName('');
      toast.success('Reset to default staff name');
    }
    setIsEditingName(false);
  };

  // Periodically refresh current time every 30 seconds so vehicle availability is continuously live
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
  
    return () => clearInterval(timer);
  }, []);

  const currencyFormatter = new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
  });

  const { startDateStr, endDateStr } = useMemo(() => {
    // Fetch data for the last 6 months to support the 6-month sales history + future bookings (next 12 months)
    const startDateObj = new Date();
    startDateObj.setMonth(startDateObj.getMonth() - 6);
    startDateObj.setDate(1);
    startDateObj.setHours(0, 0, 0, 0);
    
    const endDateObj = new Date();
    endDateObj.setMonth(endDateObj.getMonth() + 12);
    
    return {
      startDateStr: startDateObj.toISOString(),
      endDateStr: endDateObj.toISOString()
    };
  }, []);

  const { data, isLoading: loading, error: queryError, isFetching } = useQuery({
    queryKey: ['agentDashboard', subscriberId, userId, userUid],
    queryFn: async () => {
      if (!subscriberId) throw new Error('No subscriber ID');
      
      const agentId = userId || undefined;
      const createdBy = ([userUid, userId].filter(Boolean) as string[]);

      const [allBookings, cars, agreements, marketingEvents, members, staffMembers] = await Promise.all([
        apiService.getBookings(subscriberId, startDateStr, endDateStr),
        apiService.getCars(subscriberId),
        apiService.getAgreements(subscriberId),
        apiService.getMarketingEvents(subscriberId),
        apiService.getMembers(subscriberId),
        apiService.getStaffMembers(subscriberId)
      ]);

      let staff = null;
      let logisticCredits: any[] = [];
      if (userUid) {
        staff = staffMembers.find(s => s.staff_uid === userUid) || null;
        if (staff) {
          logisticCredits = await apiService.getLogisticCredits(staff.id, subscriberId);
        }
      }

      return { allBookings, cars, agreements, marketingEvents, members, staff, staffMembers, logisticCredits };
    },
    enabled: !!subscriberId,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  // Real-time dynamic updates on sales metrics and vehicle availability when bookings/cars/agreements change
  useEffect(() => {
    if (!subscriberId) return;

    const channel = supabase.channel(`agent-dashboard-realtime-${subscriberId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `subscriber_id=eq.${subscriberId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['agentDashboard', subscriberId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cars', filter: `subscriber_id=eq.${subscriberId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['agentDashboard', subscriberId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agreements', filter: `subscriber_id=eq.${subscriberId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['agentDashboard', subscriberId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `subscriber_id=eq.${subscriberId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['agentDashboard', subscriberId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketing_events', filter: `subscriber_id=eq.${subscriberId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['agentDashboard', subscriberId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [subscriberId, queryClient]);

  const error = queryError ? queryError.message : null;

  const dashboardData = useMemo(() => {
    if (!data) return null;

    const { allBookings, cars, agreements, marketingEvents, members, staff: currentStaff, logisticCredits } = data;

    const now = currentTime;
    const todayStr = formatInMYT(now, 'yyyy-MM-dd');
    
    const currentMytYear = parseInt(formatInMYT(now, 'yyyy'), 10);
    const currentMytMonth = parseInt(formatInMYT(now, 'MM'), 10);
    
    // Calculate start/end of month in MYT
    const monthDays = new Date(currentMytYear, currentMytMonth, 0).getDate();
    const currentMonthStr = currentMytMonth.toString().padStart(2, '0');
    const startOfMonthStr = `${currentMytYear}-${currentMonthStr}-01`;
    const endOfMonthStr = `${currentMytYear}-${currentMonthStr}-${monthDays.toString().padStart(2, '0')}`;
    
    // Calculate standardized week periods in MYT:
    // Week 1: Day 1 - 7
    // Week 2: Day 8 - 15
    // Week 3: Day 16 - 23
    // Week 4: Day 24 - 30/31 (end of month)
    const mytZonedDate = utcToMyt(now);
    const currentDayOfMonth = mytZonedDate.getDate();
    
    let startDayThisWeek = 1;
    let endDayThisWeek = 7;
    let thisWeekCycleLabel = `Week 1 (Day 1 - 7)`;
    let startOfLastWeekStr = '';
    let endOfLastWeekStr = '';

    if (currentDayOfMonth >= 1 && currentDayOfMonth <= 7) {
      startDayThisWeek = 1;
      endDayThisWeek = 7;
      thisWeekCycleLabel = `Week 1 (Day 1 - 7)`;

      // Last week is Previous Month's Week 4 (Day 24 to End of Prev Month)
      let prevYear = currentMytYear;
      let prevMonth = currentMytMonth - 1;
      if (prevMonth <= 0) {
        prevMonth = 12;
        prevYear -= 1;
      }
      const prevMonthDays = new Date(prevYear, prevMonth, 0).getDate();
      const prevMonthStr = prevMonth.toString().padStart(2, '0');
      startOfLastWeekStr = `${prevYear}-${prevMonthStr}-24`;
      endOfLastWeekStr = `${prevYear}-${prevMonthStr}-${prevMonthDays.toString().padStart(2, '0')}`;
    } else if (currentDayOfMonth >= 8 && currentDayOfMonth <= 15) {
      startDayThisWeek = 8;
      endDayThisWeek = 15;
      thisWeekCycleLabel = `Week 2 (Day 8 - 15)`;

      startOfLastWeekStr = `${currentMytYear}-${currentMonthStr}-01`;
      endOfLastWeekStr = `${currentMytYear}-${currentMonthStr}-07`;
    } else if (currentDayOfMonth >= 16 && currentDayOfMonth <= 23) {
      startDayThisWeek = 16;
      endDayThisWeek = 23;
      thisWeekCycleLabel = `Week 3 (Day 16 - 23)`;

      startOfLastWeekStr = `${currentMytYear}-${currentMonthStr}-08`;
      endOfLastWeekStr = `${currentMytYear}-${currentMonthStr}-15`;
    } else {
      startDayThisWeek = 24;
      endDayThisWeek = monthDays;
      thisWeekCycleLabel = `Week 4 (Day 24 - ${monthDays})`;

      startOfLastWeekStr = `${currentMytYear}-${currentMonthStr}-16`;
      endOfLastWeekStr = `${currentMytYear}-${currentMonthStr}-23`;
    }

    const startOfWeekStr = `${currentMytYear}-${currentMonthStr}-${startDayThisWeek.toString().padStart(2, '0')}`;
    const endOfWeekStr = `${currentMytYear}-${currentMonthStr}-${endDayThisWeek.toString().padStart(2, '0')}`;

    // Calculate Month-To-Date (MTD) and Week-To-Date (WTD) bounds
    let prevMonthYearForMtd = currentMytYear;
    let prevMonthMonthForMtd = currentMytMonth - 1;
    if (prevMonthMonthForMtd <= 0) {
      prevMonthMonthForMtd = 12;
      prevMonthYearForMtd -= 1;
    }
    const prevMonthDays2 = new Date(prevMonthYearForMtd, prevMonthMonthForMtd, 0).getDate();
    const cappedDayMonth = Math.min(currentDayOfMonth, prevMonthDays2);
    const startOfLastMonthMtdStr = `${prevMonthYearForMtd}-${prevMonthMonthForMtd.toString().padStart(2, '0')}-01`;
    const endOfLastMonthMtdStr = `${prevMonthYearForMtd}-${prevMonthMonthForMtd.toString().padStart(2, '0')}-${cappedDayMonth.toString().padStart(2, '0')}`;

    const dayOfCycle = currentDayOfMonth - startDayThisWeek + 1;
    const startDayLastWeek = parseInt(startOfLastWeekStr.substring(8), 10);
    const endDayLastWeekLimit = parseInt(endOfLastWeekStr.substring(8), 10);
    const endDayLastWeekToDate = Math.min(startDayLastWeek + dayOfCycle - 1, endDayLastWeekLimit);
    const endOfLastWeekToDateStr = startOfLastWeekStr.substring(0, 8) + endDayLastWeekToDate.toString().padStart(2, '0');


    // Past 6 months sales tracking
    const past6MonthsSales = Array.from({ length: 6 }).map((_, i) => {
      let targetYear = currentMytYear;
      let targetMonth = currentMytMonth - i;
      while (targetMonth <= 0) {
        targetMonth += 12;
        targetYear -= 1;
      }
      const targetMonthStr = targetMonth.toString().padStart(2, '0');
      const daysInTargetMonth = new Date(targetYear, targetMonth, 0).getDate();
      const startStr = `${targetYear}-${targetMonthStr}-01`;
      const endStr = `${targetYear}-${targetMonthStr}-${daysInTargetMonth.toString().padStart(2, '0')}`;
      
      const sampleDate = new Date(`${startStr}T12:00:00+08:00`);
      return {
        month: formatInMYT(sampleDate, 'MMM yyyy'),
        sales: 0,
        startStr,
        endStr
      };
    });

    const lastMonthKey = past6MonthsSales[1]?.startStr ? past6MonthsSales[1].startStr.substring(0, 7) : '';
    let lastMonthEarnings = 0;

    // Filter to strictly their own agreements for sales metrics (matching Admin logic)
    const isOwnAgreement = (a: Agreement) => {
      const key = a.agent_id || a.created_by || a.agent_name;
      const matchesId = a.agent_id === userId || a.agent_id === currentStaff?.id || a.agent_id === userUid;
      const matchesCreatedBy = a.created_by === userUid || a.created_by === userId || a.created_by === currentStaff?.id;
      const matchesName = Boolean(currentStaff?.name && a.agent_name && a.agent_name.toLowerCase().trim() === currentStaff.name.toLowerCase().trim());
      const matchesStaffUid = Boolean(currentStaff?.staff_uid && (a.agent_id === currentStaff.staff_uid || a.created_by === currentStaff.staff_uid));
      
      // Also match through linked booking if available
      let matchesBooking = false;
      if (a.booking_id) {
        const bk = allBookings.find(b => b.id === a.booking_id);
        if (bk) {
          matchesBooking = bk.agent_id === userId || 
            bk.agent_id === currentStaff?.id || 
            bk.agent_id === userUid || 
            (Boolean(currentStaff?.staff_uid) && bk.agent_id === currentStaff?.staff_uid) ||
            bk.member_id === currentStaff?.id ||
            bk.member_id === userId;
        }
      }

      return matchesId || matchesCreatedBy || matchesName || matchesStaffUid || matchesBooking || key === userId || key === currentStaff?.name || key === userUid || key === currentStaff?.id;
    };

    const ownAgreements = agreements.filter(isOwnAgreement);

    // Action List for Digital Forms: Unsigned & Unpaid
    const unsignedForms = ownAgreements.filter(a => {
      const status = a.status?.toLowerCase().trim();
      const isSigned = status === 'signed' || status === 'completed' || !!a.signed_at || !!a.signature_data;
      return !isSigned || status === 'pending';
    });

    const unpaidForms = ownAgreements.filter(a => {
      const status = a.status?.toLowerCase().trim();
      const hasReceipt = !!a.payment_receipt && a.payment_receipt !== '[]' && a.payment_receipt !== 'null';
      return !hasReceipt && status !== 'completed';
    });

    // 1. Sales Metrics (Valid Booking: Matched with Calendar & Completed Status)
    const completedAgreements = ownAgreements.filter(a => {
      const isMatchedWithCalendar = Boolean(a.booking_id);
      const isCompleted = a.status?.toLowerCase().trim() === 'completed';
      return isMatchedWithCalendar && isCompleted;
    });
    
    let salesToday = 0;
    let salesThisWeek = 0;
    let salesLastWeek = 0;
    let salesLastWeekToDate = 0;
    let salesThisMonth = 0;
    let salesLastMonthToDate = 0;
    
    completedAgreements.forEach(a => {
      // Sales are attributed by Pickup Date (start_date) in MYT
      const matchDateStr = getMYTDateString(getAgreementPickupDateTime(a));
      const price = Number(a.total_price) || 0;
      if (matchDateStr === todayStr) salesToday += price;
      if (matchDateStr >= startOfWeekStr && matchDateStr <= endOfWeekStr) salesThisWeek += price;
      if (matchDateStr >= startOfLastWeekStr && matchDateStr <= endOfLastWeekStr) salesLastWeek += price;
      if (matchDateStr >= startOfLastWeekStr && matchDateStr <= endOfLastWeekToDateStr) salesLastWeekToDate += price;
      if (matchDateStr >= startOfMonthStr && matchDateStr <= endOfMonthStr) salesThisMonth += price;
      if (matchDateStr >= startOfLastMonthMtdStr && matchDateStr <= endOfLastMonthMtdStr) salesLastMonthToDate += price;

      // Populate past 6 months
      for (const monthData of past6MonthsSales) {
        if (matchDateStr >= monthData.startStr && matchDateStr <= monthData.endStr) {
          monthData.sales += price;
          break;
        }
      }
    });

    const salesLastMonth = past6MonthsSales[1]?.sales || 0;

    // 2. Available to Sell Today Opportunities (Turn idle vehicles into revenue)
    const getCarDailyRate = (car: any): number => {
      const modelName = `${car.model || ''} ${car.name || ''} ${car.make || ''}`.toLowerCase();
      if (modelName.includes('aruz')) return 230;
      if (modelName.includes('bezza')) return 110;
      if (modelName.includes('axia')) return 90;
      if (modelName.includes('myvi')) return 100;
      if (modelName.includes('alza')) return 140;
      if (modelName.includes('vios') || modelName.includes('city')) return 130;
      if (modelName.includes('ativa')) return 130;
      if (modelName.includes('veloz') || modelName.includes('innova')) return 180;
      if (modelName.includes('hiace') || modelName.includes('van') || modelName.includes('starex')) return 250;
      if (car.type === 'SUV') return 230;
      if (car.type === 'Luxury') return 250;
      return 100;
    };

    const getCarModelName = (car: any): string => {
      const full = `${car.model || ''} ${car.name || ''}`.trim();
      const lower = full.toLowerCase();
      if (lower.includes('axia')) return 'Axia';
      if (lower.includes('bezza')) return 'Bezza';
      if (lower.includes('aruz')) return 'Aruz';
      if (lower.includes('myvi')) return 'Myvi';
      if (lower.includes('alza')) return 'Alza';
      if (lower.includes('vios')) return 'Vios';
      if (lower.includes('city')) return 'City';
      if (lower.includes('ativa')) return 'Ativa';
      if (lower.includes('veloz')) return 'Veloz';
      if (lower.includes('innova')) return 'Innova';
      return car.model || car.name || 'Vehicle';
    };

    const activeCars = cars.filter(c => c.status === 'active' || !c.status);
    const nowTime = now.getTime();
    const todayFormatted = formatInMYT(now, 'd MMM');

    const availableToSellList: AvailableCarOpportunity[] = [];

    activeCars.forEach(car => {
      const carBookings = allBookings.filter(b => b.car_id === car.id && b.status !== 'cancelled');
      
      const isOccupiedToday = carBookings.some(b => {
        const startMs = parseBookingDate(b.start_date, b.pickup_time);
        const endMs = getBookingEndTime(b);
        return startMs <= nowTime && endMs >= nowTime;
      });

      if (!isOccupiedToday) {
        const futureBookings = carBookings
          .map(b => ({
            booking: b,
            startMs: parseBookingDate(b.start_date, b.pickup_time)
          }))
          .filter(item => item.startMs > nowTime)
          .sort((a, b) => a.startMs - b.startMs);

        const nearest = futureBookings[0];
        const dailyRate = getCarDailyRate(car);
        const model = getCarModelName(car);
        const plate = car.plate || (car as any).plateNumber || 'Unknown';

        if (nearest) {
          const nearestStartMs = nearest.startMs;
          const nextDate = new Date(nearestStartMs);
          const endFormatted = formatInMYT(nextDate, 'd MMM');
          const diffDays = Math.max(1, Math.round((nearestStartMs - nowTime) / (1000 * 60 * 60 * 24)));
          const potentialRevenue = diffDays * dailyRate;
          const member = members.find(m => m.id === nearest.booking.member_id);

          availableToSellList.push({
            carId: car.id,
            carName: car.name || `${model} (${plate})`,
            model,
            plate,
            dailyRate,
            startDateFormatted: todayFormatted,
            endDateFormatted: endFormatted,
            daysAvailable: diffDays,
            potentialRevenue,
            nextBookingDateStr: formatInMYT(nextDate, 'dd/MM/yyyy'),
            nextBookingTimeStr: nearest.booking.pickup_time || '10:00',
            nextBookingCustomer: member?.name,
            isFullyOpen: false
          });
        } else {
          const defaultDays = 5;
          const futureDate = new Date(nowTime + defaultDays * 24 * 60 * 60 * 1000);
          const endFormatted = formatInMYT(futureDate, 'd MMM');
          const potentialRevenue = defaultDays * dailyRate;

          availableToSellList.push({
            carId: car.id,
            carName: car.name || `${model} (${plate})`,
            model,
            plate,
            dailyRate,
            startDateFormatted: todayFormatted,
            endDateFormatted: `${endFormatted} (Open)`,
            daysAvailable: defaultDays,
            potentialRevenue,
            isFullyOpen: true
          });
        }
      }
    });

    const groupedMap: { [model: string]: GroupedOpportunity } = {};
    availableToSellList.forEach(item => {
      if (!groupedMap[item.model]) {
        groupedMap[item.model] = {
          model: item.model,
          count: 0,
          dailyRate: item.dailyRate,
          totalPotentialRevenue: 0,
          dateRangeSummary: `${item.startDateFormatted} → ${item.endDateFormatted}`,
          minDays: item.daysAvailable,
          maxDays: item.daysAvailable,
          cars: []
        };
      }
      const g = groupedMap[item.model];
      g.count += 1;
      g.totalPotentialRevenue += item.potentialRevenue;
      g.minDays = Math.min(g.minDays, item.daysAvailable);
      g.maxDays = Math.max(g.maxDays, item.daysAvailable);
      g.cars.push(item);
    });

    const groupedOpportunities: GroupedOpportunity[] = Object.values(groupedMap).sort((a, b) => b.count - a.count);
    const totalAvailablePotentialRevenue = availableToSellList.reduce((sum, item) => sum + item.potentialRevenue, 0);
    const idleVehicles = availableToSellList.length;

    // 3. Pending Deliveries & Overdue Returns
    const pending: PendingDelivery[] = [];
    const overdue: OverdueReturn[] = [];

    const filteredBookings = allBookings.filter(b => b.agent_id === userId || b.created_by === userUid || b.created_by === userId);

    filteredBookings.forEach(b => {
      if (b.status === 'cancelled') return;
      
      const startMs = parseBookingDate(b.start_date, b.pickup_time);
      
      // FIX: Use actual_end_time or duration_days. Ignore DB's end_time string.
      const endMs = getBookingEndTime(b);
        
      const car = cars.find(c => c.id === b.car_id);
      const member = members.find(m => m.id === b.member_id);
      
      if (formatInMYT(startMs, 'yyyy-MM-dd') === todayStr && startMs > now.getTime()) {
        pending.push({
          id: b.id,
          carPlate: car?.plate || 'Unknown',
          customerName: member?.name || 'Unknown',
          pickupTime: new Date(startMs)
        });
      }
      
      if (now.getTime() > endMs && b.status !== 'completed') {
        overdue.push({
          id: b.id,
          carPlate: car?.plate || 'Unknown',
          customerName: member?.name || 'Unknown',
          returnTime: new Date(endMs)
        });
      }
    });

    pending.sort((a, b) => a.pickupTime.getTime() - b.pickupTime.getTime());
    overdue.sort((a, b) => a.returnTime.getTime() - b.returnTime.getTime());

    // 4. Agent Specific Metrics (Earnings & Chart)
    const getCommissionForAmount = (a: Agreement, runningTotal: number) => {
      const totalPrice = Number(a.total_price) || 0;
      let earned = 0;
      if (a.commission_earned !== undefined && a.commission_earned !== null) {
        earned = Number(a.commission_earned);
        if (earned > 0 || totalPrice === 0) return earned;
      }
      
      if (currentStaff?.commission_rate && Number(currentStaff.commission_rate) > 0) {
        return totalPrice * (Number(currentStaff.commission_rate) / 100);
      }
      const tierOverride = currentStaff?.commission_tier_override || 'auto';
      if (tierOverride !== 'auto') {
        const rate = tierOverride === 'premium' ? 0.20 : tierOverride === 'prestige' ? 0.25 : 0.30;
        return totalPrice * rate;
      }
      const getTotalCommission = (total: number) => {
        if (total <= 5000) return total * 0.20;
        if (total <= 8000) return (5000 * 0.20) + ((total - 5000) * 0.25);
        return (5000 * 0.20) + (3000 * 0.25) + ((total - 8000) * 0.30);
      };
      return getTotalCommission(runningTotal + totalPrice) - getTotalCommission(runningTotal);
    };

    const weeklyData: { [key: string]: number } = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    for (let i = 12; i >= 0; i--) {
      const d = getNowMYT();
      d.setDate(d.getDate() - (i * 7));
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const weekNum = Math.ceil(weekStart.getDate() / 7);
      const monthName = monthNames[weekStart.getMonth()];
      const label = `W${weekNum} - ${monthName}`;
      weeklyData[label] = 0;
    }

    const monthGroups: { [key: string]: Agreement[] } = {};
    completedAgreements.forEach(a => {
      const pickupDateObj = getAgreementPickupDateTime(a);
      const monthKey = getMYTDateString(pickupDateObj).substring(0, 7);
      if (!monthGroups[monthKey]) monthGroups[monthKey] = [];
      monthGroups[monthKey].push(a);
    });

    let earnedToday = 0;
    let lifetime = 0;
    
    Object.keys(monthGroups).forEach(monthKey => {
      const monthAgreements = monthGroups[monthKey].sort((a, b) => 
        getAgreementPickupDateTime(a).getTime() - getAgreementPickupDateTime(b).getTime()
      );

      let runningTotal = 0;
      monthAgreements.forEach(a => {
        const commission = Number(getCommissionForAmount(a, runningTotal)) || 0;
        runningTotal += Number(a.total_price) || 0;
        lifetime += commission;

        if (monthKey === lastMonthKey) {
          lastMonthEarnings += commission;
        }

        const pickupDateObj = getAgreementPickupDateTime(a);
        const matchDateStr = getMYTDateString(pickupDateObj);
        
        if (matchDateStr === todayStr) {
          earnedToday += commission;
        }

        const date = pickupDateObj;
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekNum = Math.ceil(weekStart.getDate() / 7);
        const monthName = monthNames[weekStart.getMonth()];
        const label = `W${weekNum} - ${monthName}`;
        
        if (weeklyData[label] !== undefined) {
          weeklyData[label] += commission;
        }
      });
    });

    const chartData = Object.entries(weeklyData).map(([label, amount]) => ({
      date: label,
      amount: Number(Number(amount || 0).toFixed(2))
    }));

    // 5. Pending Payout from Audit & Payout (Payout Summary, step before Process Payout)
    // Matches AuditPayoutManagement's approvedRecordsForMonth & payoutSummary logic
    const approvedPayoutRecords = ownAgreements.filter(a => 
      Boolean(a.booking_id) && a.payout_status === 'approved'
    );
    
    let pendingPayoutDue = 0;
    let pendingPayoutTotalRevenue = 0;
    
    approvedPayoutRecords.forEach(a => {
      pendingPayoutTotalRevenue += (Number(a.total_price) || 0);
      let earned = Number(a.commission_earned) || 0;
      if (earned <= 0 && Number(a.total_price) > 0) {
        earned = Number(a.total_price) * 0.20;
      }
      pendingPayoutDue += earned;
    });

    // In-Review Audit Records
    const inReviewAuditRecords = ownAgreements.filter(a => 
      Boolean(a.booking_id) && (a.payout_status === 'pending' || a.payout_status === 'pending_review')
    );
    let inReviewPayoutDue = 0;
    inReviewAuditRecords.forEach(a => {
      let earned = Number(a.commission_earned) || 0;
      if (earned <= 0 && Number(a.total_price) > 0) {
        earned = Number(a.total_price) * 0.20;
      }
      inReviewPayoutDue += earned;
    });

    return {
      stats: {
        salesToday,
        salesThisWeek,
        salesLastWeek,
        salesThisMonth,
        salesLastMonth,
        salesLastMonthToDate,
        salesLastWeekToDate,
        past6MonthsSales,
        thisWeekCycleLabel,
        idleVehicles: Math.max(0, idleVehicles),
      },
      availableCarsList: availableToSellList,
      groupedOpportunities,
      totalAvailablePotentialRevenue,
      pendingDeliveries: pending,
      overdueReturns: overdue,
      unsignedForms,
      unpaidForms,
      approvedPayoutRecords,
      pendingPayoutDue,
      pendingPayoutTotalRevenue,
      inReviewAuditRecords,
      inReviewPayoutDue,
      events: marketingEvents,
      bookings: allBookings,
      currentStaff,
      dailyCommissions: chartData,
      totalEarnedToday: earnedToday,
      lastMonthEarnings,
      lifetimeEarnings: lifetime,
      recentAgreements: completedAgreements.slice(0, 5),
      logisticCredits
    };
  }, [data, currentTime, userId, userUid]);

  const handleConfirmReturn = async (id: string) => {
    try {
      if (!subscriberId) return;
      setIsConfirmingReturn(true);
      await apiService.updateBookingStatus(id, subscriberId, 'completed', true);
      setConfirmReturnId(null);
      await queryClient.refetchQueries({ queryKey: ['agentDashboard'] });
      toast.success('Vehicle marked as returned');
    } catch (err) {
      console.error('Failed to confirm return:', err);
      toast.error('Failed to confirm return. Please try again.');
    } finally {
      setIsConfirmingReturn(false);
    }
  };

  const handleCopySignLink = (formId: string, customerName?: string) => {
    const link = `${window.location.origin}/forms/sign/${formId}`;
    navigator.clipboard.writeText(link);
    toast.success(`Signing link copied for ${customerName || 'customer'}!`);
  };

  const handleWhatsAppReminder = (form: Agreement, type: 'sign' | 'payment') => {
    const phone = (form.customer_phone || '').replace(/\D/g, '');
    const carText = form.car_plate_number ? `${form.car_plate_number} (${form.car_model || 'Vehicle'})` : (form.car_model || 'your rental');
    const signLink = `${window.location.origin}/forms/sign/${form.id}`;

    let msg = '';
    if (type === 'sign') {
      msg = `Hi ${form.customer_name || 'Valued Customer'},\n\nHere is your Digital Rental Agreement link for ${carText}:\n🔗 ${signLink}\n\nPlease click the link to review and sign your agreement so we can confirm your reservation.\n\nThank you!`;
    } else {
      const price = form.total_price ? `RM ${Number(form.total_price).toLocaleString()}` : 'the rental amount';
      msg = `Hi ${form.customer_name || 'Valued Customer'},\n\nYour rental agreement for ${carText} has been prepared. Please share your bank transfer / payment receipt for ${price} (Ref: ${form.reference_number || form.id.slice(0, 8)}) to finalize and lock in your reservation.\n\nThank you!`;
    }

    if (!phone) {
      toast.error('No customer phone number available for WhatsApp.');
      return;
    }

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const formatTimeDiff = (date: Date) => {
    const now = getNowMYT();
    const diffMs = Math.abs(date.getTime() - now.getTime());
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    const parts = [];
    if (diffHrs > 0) parts.push(`${diffHrs} ${diffHrs === 1 ? 'HOUR' : 'HOURS'}`);
    if (diffMins > 0 || parts.length === 0) parts.push(`${diffMins} ${diffMins === 1 ? 'MINUTE' : 'MINUTES'}`);
    
    return parts.join(' ');
  };

  const handleSaveBooking = async (bookingData: Omit<Booking, 'id'>, staffName: string) => {
    if (!subscriberId) return;
    try {
      const membersList: any[] = data?.members || [];
      const staffList: any[] = data?.staffMembers || [];
      const selectedMember = membersList.find(m => m.id === bookingData.member_id || m.staff_id === bookingData.member_id);
      
      let actualAgentId = selectedMember?.staff_id;
      if (!actualAgentId && selectedMember) {
        if (selectedMember.is_subscriber) {
          actualAgentId = subscriberId;
        } else {
          const foundStaff = staffList.find(s => s.id === selectedMember.id || s.name.toLowerCase() === selectedMember.name.toLowerCase());
          if (foundStaff) actualAgentId = foundStaff.id;
        }
      }
      if (!actualAgentId) {
        actualAgentId = userId || subscriberId;
      }

      const finalStaffName = staffName || selectedMember?.name || customAgentName || currentStaff?.name || '';
      const bookingWithAgent = {
        ...bookingData,
        agent_id: actualAgentId,
        agent_name: finalStaffName,
        subscriber_id: subscriberId,
        created_by: (editingBookingModal && editingBookingModal.created_by) ? editingBookingModal.created_by : (userUid || userId || '')
      };

      await apiService.saveBooking(bookingWithAgent, subscriberId, editingBookingModal?.id);
      toast.success(editingBookingModal ? 'Booking updated successfully' : 'Booking created successfully');

      setIsBookingModalOpen(false);
      setEditingBookingModal(null);
      queryClient.invalidateQueries({ queryKey: ['agentDashboard', subscriberId] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to save booking');
    }
  };

  const handleDeleteBooking = async (id: string, staffName: string) => {
    if (!subscriberId) return;
    try {
      await apiService.deleteBooking(id, subscriberId);
      toast.success('Booking deleted');
      setIsBookingModalOpen(false);
      setEditingBookingModal(null);
      queryClient.invalidateQueries({ queryKey: ['agentDashboard', subscriberId] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete booking');
    }
  };

  const actionQueueTasks = useMemo(() => {
    if (!dashboardData) return [];
    const queue: any[] = [];
    
    // Priority 1: Overdue Returns
    dashboardData.overdueReturns.forEach((item: any) => {
      queue.push({
        id: `overdue-${item.id}`,
        priority: 1,
        color: 'rose',
        icon: Clock,
        title: `Action Required: Vehicle ${item.carPlate} is overdue for return!`,
        subtitle: `Customer: ${item.customerName} - ${formatTimeDiff(item.returnTime).toUpperCase()} LATE`,
        actionText: 'Ping Customer',
        onClick: () => {
          window.open(`https://wa.me/?text=Hello ${item.customerName}, your vehicle ${item.carPlate} is overdue for return. Please contact us immediately.`, '_blank');
        },
        secondaryActionText: 'Mark Returned',
        secondaryOnClick: () => {
          setConfirmReturnId(item.id);
        }
      });
    });

    // Priority 2: Pending Deliveries (Pickups)
    dashboardData.pendingDeliveries.forEach((item: any) => {
      queue.push({
        id: `pickup-${item.id}`,
        priority: 2,
        color: 'blue',
        icon: ArrowRight,
        title: `Vehicle ${item.carPlate} arriving for pickup`,
        subtitle: `Customer: ${item.customerName} - Scheduled: ${formatInMYT(item.pickupTime.getTime(), 'h:mm a')}`,
        actionText: 'Start Handover',
        onClick: () => {
          navigate(`/handover/${item.id}`);
        }
      });
    });

    // Priority 3: Payment Receipt Needed
    dashboardData.unpaidForms.forEach((form: any) => {
      queue.push({
        id: `unpaid-${form.id}`,
        priority: 3,
        color: 'violet',
        icon: Receipt,
        title: `Verify Payment Receipt for Customer ${form.customer_name || 'Unknown'}`,
        subtitle: `Form #${form.reference_number || 'N/A'} - Total: ${currencyFormatter.format(Number(form.total_price) || 0)}`,
        actionText: 'View Receipt',
        onClick: () => {
          navigate('/forms');
        }
      });
    });

    // Priority 4: Signature Pending
    dashboardData.unsignedForms.forEach((form: any) => {
      queue.push({
        id: `unsigned-${form.id}`,
        priority: 4,
        color: 'amber',
        icon: FileSignature,
        title: `Signature Pending for Customer ${form.customer_name || 'Unknown'}`,
        subtitle: `Form #${form.reference_number || 'N/A'} - Total: ${currencyFormatter.format(Number(form.total_price) || 0)}`,
        actionText: 'Ping Customer',
        onClick: () => {
          window.open(`https://wa.me/?text=Hello ${form.customer_name}, please sign your rental agreement: ${window.location.origin}/forms/sign/${form.id}`, '_blank');
        }
      });
    });

    return queue.sort((a: any, b: any) => a.priority - b.priority);
  }, [dashboardData, navigate, currencyFormatter]);

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center max-w-2xl mx-auto shadow-sm">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-rose-900 mb-3">Unable to Connect to Database</h2>
          <p className="text-rose-700 mb-6 leading-relaxed">{error || 'Unknown error'}</p>
          <button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['agentDashboard', subscriberId] })}
            className="px-6 py-2.5 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 transition-colors shadow-sm"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { 
    stats, 
    availableCarsList,
    groupedOpportunities,
    totalAvailablePotentialRevenue,
    pendingDeliveries, 
    overdueReturns, 
    unsignedForms,
    unpaidForms,
    approvedPayoutRecords,
    pendingPayoutDue,
    pendingPayoutTotalRevenue,
    inReviewAuditRecords,
    inReviewPayoutDue,
    events, 
    bookings, 
    currentStaff, 
    dailyCommissions, 
    totalEarnedToday, 
    lastMonthEarnings, 
    lifetimeEarnings, 
    recentAgreements, 
    logisticCredits 
  } = dashboardData;

  const totalUrgentFormsCount = new Set([...unsignedForms.map(a => a.id), ...unpaidForms.map(a => a.id)]).size;
  const totalVehicleOpsCount = pendingDeliveries.length + overdueReturns.length;
  const totalMissionsCount = totalUrgentFormsCount + totalVehicleOpsCount;

  const defaultStaffName = currentStaff?.name || userName || userUid || (userId ? `Staff (${userId.slice(0, 6)})` : 'Staff');
  const displayStaffName = customAgentName.trim() || defaultStaffName;



  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Compact Agent Command Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left: Greeting, Editable Staff Name & System Live Status */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
                {greeting},
              </span>
              
              {isEditingName ? (
                <form onSubmit={handleSaveCustomName} className="inline-flex items-center gap-1.5">
                  <input
                    type="text"
                    value={tempAgentName}
                    onChange={(e) => setTempAgentName(e.target.value)}
                    placeholder="Enter your name"
                    className="px-2.5 py-1 text-base sm:text-lg font-bold text-slate-900 bg-slate-50 border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs max-w-[200px]"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-2xs cursor-pointer"
                    title="Save Name"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(false)}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <div className="inline-flex items-center gap-1.5">
                  <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {displayStaffName}
                  </span>
                  <button
                    onClick={() => {
                      setTempAgentName(customAgentName || defaultStaffName);
                      setIsEditingName(true);
                    }}
                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    title="Change display name (saved on frontend)"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Date & System Live Indicator */}
            <div className="flex items-center justify-between sm:justify-start gap-2.5">
              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                <span className="text-xs sm:text-sm font-semibold text-slate-500">
                  {formatInMYT(currentTime.getTime(), 'EEEE, d MMMM')}
                </span>
                <span className="text-slate-300">•</span>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-bold shadow-2xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>System Live</span>
                </div>
              </div>

              <Link
                to="/help"
                className="lg:hidden p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg border border-slate-200/60 transition-colors ml-auto cursor-pointer"
                title="Agent Help & Tutorials"
              >
                <HelpCircle className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Right: Action Buttons (2-Column Grid on Mobile, Flex Row on Desktop) */}
          <div className="grid grid-cols-2 gap-2.5 w-full lg:w-auto lg:flex lg:items-center lg:gap-2.5">
            <button
              onClick={() => {
                setEditingBookingModal(null);
                setSelectedBookingDate(new Date());
                setIsBookingModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer active:scale-95 text-center whitespace-nowrap"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>New Booking</span>
            </button>

            <Link
              to="/calendar"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2.5 sm:py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold shadow-2xs transition-all cursor-pointer text-center whitespace-nowrap"
            >
              <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
              <span>View Calendar</span>
            </Link>

            <Link
              to="/help"
              className="hidden lg:inline-flex p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-xl border border-slate-200/60 transition-colors ml-0.5 cursor-pointer"
              title="Agent Help & Tutorials"
            >
              <HelpCircle className="w-4 h-4" />
            </Link>
          </div>
        </div>

        
        {/* ACTION-QUEUE UX (Zero Cognitive Load) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" /> Smart Action-Queue
              </h2>
              <p className="text-slate-500 text-sm mt-0.5">Your intelligent assistant. Tasks are sorted by priority automatically.</p>
            </div>
            <div className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
              {actionQueueTasks.length} Task{actionQueueTasks.length !== 1 && 's'} Pending
            </div>
          </div>
          
          <div className="space-y-3">
            {actionQueueTasks.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">All caught up!</h3>
                <p className="text-slate-500 mt-1">There are no pending actions in your queue.</p>
              </div>
            ) : (
              actionQueueTasks.map((task, index) => {
                const Icon = task.icon;
                const isTopTask = index === 0;
                
                // Colors based on priority
                const colorMap: any = {
                  rose: 'bg-rose-50 border-rose-200 text-rose-900',
                  blue: 'bg-blue-50 border-blue-200 text-blue-900',
                  violet: 'bg-violet-50 border-violet-200 text-violet-900',
                  amber: 'bg-amber-50 border-amber-200 text-amber-900'
                };
                
                const iconBgMap: any = {
                  rose: 'bg-rose-100 text-rose-600',
                  blue: 'bg-blue-100 text-blue-600',
                  violet: 'bg-violet-100 text-violet-600',
                  amber: 'bg-amber-100 text-amber-600'
                };

                const buttonMap: any = {
                  rose: 'bg-rose-600 hover:bg-rose-700 text-white',
                  blue: 'bg-blue-600 hover:bg-blue-700 text-white',
                  violet: 'bg-violet-600 hover:bg-violet-700 text-white',
                  amber: 'bg-amber-600 hover:bg-amber-700 text-white'
                };

                return (
                  <div 
                    key={task.id} 
                    className={`rounded-2xl border ${isTopTask ? 'shadow-md border-indigo-200 bg-white ring-1 ring-indigo-100 scale-100' : 'shadow-sm bg-white/60 border-slate-200 scale-[0.99] opacity-80'} transition-all overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-4`}
                  >
                    <div className="flex items-start sm:items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBgMap[task.color]}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        {isTopTask && (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 mb-1">
                            Focus Priority
                          </span>
                        )}
                        <h3 className={`font-bold ${isTopTask ? 'text-lg text-slate-900' : 'text-base text-slate-700'}`}>{task.title}</h3>
                        <p className={`text-sm mt-0.5 ${isTopTask ? 'text-slate-600' : 'text-slate-500'}`}>{task.subtitle}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2 sm:mt-0 shrink-0 self-start sm:self-auto">
                      {task.secondaryActionText && (
                        <button
                          onClick={task.secondaryOnClick}
                          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors shadow-xs cursor-pointer"
                        >
                          {task.secondaryActionText}
                        </button>
                      )}
                      <button
                        onClick={task.onClick}
                        className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm cursor-pointer ${buttonMap[task.color]}`}
                      >
                        {task.actionText}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

{/* Financial & Commission Hub: My Pocket */}
        <div className="w-full">
          <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 p-6 sm:p-7 rounded-2xl border border-emerald-500/20 shadow-sm text-white relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-xs border border-white/10">
                  <Wallet className="w-6 h-6 text-emerald-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white text-base font-black uppercase tracking-wider">My Pocket</h3>
                    <span className="bg-emerald-400/20 text-emerald-200 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border border-emerald-400/30">
                      Live
                    </span>
                  </div>
                  <p className="text-emerald-100/80 text-xs font-medium mt-0.5">Real-time commissions, audit approval balance, and sales performance</p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="bg-black/25 backdrop-blur-xs px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-100 border border-white/10 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Payouts Disbursed Monthly</span>
                </span>
              </div>
            </div>

            {/* Major Hero Metrics Grid: Today's Earned & Pending Payout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div className="bg-black/20 p-5 rounded-xl backdrop-blur-xs border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Total Earned Today</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-400/20 text-emerald-200 rounded-md">Live</span>
                  </div>
                  <p className="text-3xl sm:text-4xl font-black tracking-tight mt-2 text-white">
                    {currencyFormatter.format(totalEarnedToday)}
                  </p>
                </div>
                <p className="text-emerald-100/70 text-xs mt-2 font-medium">From valid completed bookings starting today</p>
              </div>

              {/* Pending Payout from Audit & Payout Summary */}
              <div className="bg-black/25 p-5 rounded-xl backdrop-blur-xs border border-amber-300/30 flex flex-col justify-between relative group">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-200 text-xs font-black uppercase tracking-wider">Pending Payout</span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 bg-amber-400 text-slate-950 rounded-md shadow-xs">
                        Audit Approved
                      </span>
                    </div>
                    {approvedPayoutRecords.length > 0 && (
                      <button
                        onClick={() => setShowPayoutModal(true)}
                        className="text-xs font-bold text-amber-200 hover:text-white flex items-center gap-1 underline underline-offset-2 transition-colors cursor-pointer"
                      >
                        Breakdown <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-3xl sm:text-4xl font-black tracking-tight mt-2 text-amber-300">
                    {currencyFormatter.format(pendingPayoutDue)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-emerald-100/90 mt-2 font-medium">
                  <span>
                    {approvedPayoutRecords.length > 0 
                      ? `${approvedPayoutRecords.length} deal${approvedPayoutRecords.length > 1 ? 's' : ''} queued in Payout Summary`
                      : 'Awaiting admin audit review'}
                  </span>
                  {inReviewPayoutDue > 0 && (
                    <span className="text-emerald-200/80 text-[11px]" title="Commissions currently pending audit scan & review">
                      (+{currencyFormatter.format(inReviewPayoutDue)} in review)
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Last Month's Payout Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-3 px-4 rounded-xl bg-black/15 border border-white/10 text-emerald-50 text-xs font-medium mb-5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-300 shrink-0" />
                <span className="font-bold uppercase tracking-wider text-[11px] text-emerald-200">Last Month's Disbursed Payout:</span>
                <span className="font-black text-sm text-white">
                  {lastMonthEarnings > 0 
                    ? currencyFormatter.format(lastMonthEarnings) 
                    : "RM 0.00"}
                </span>
              </div>
              {approvedPayoutRecords.length > 0 && (
                <span className="text-[11px] text-emerald-100/90">
                  Next Payout Status: <strong className="text-amber-200">Ready in Audit & Payout</strong>
                </span>
              )}
            </div>

            {/* Performance Stats Sub-Grid */}
            <div className="pt-5 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-5 items-start">
              <div>
                <p className="text-emerald-200/90 text-xs font-bold uppercase tracking-widest mb-1.5">THIS WEEK SALES</p>
                <p className="text-2xl font-black text-white">{currencyFormatter.format(stats.salesThisWeek)}</p>
                {stats.salesThisWeek > 0 ? (
                  stats.salesLastWeekToDate > 0 ? (
                    <div className="flex items-center text-[11px] font-bold mt-1 text-white/90">
                      {stats.salesThisWeek >= stats.salesLastWeekToDate ? (
                        <TrendingUp className="w-3.5 h-3.5 mr-1 text-emerald-300" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 mr-1 text-rose-300" />
                      )}
                      <span>
                        {stats.salesThisWeek >= stats.salesLastWeekToDate ? '↑ +' : '↓ '}{Math.abs(Number((((stats.salesThisWeek - stats.salesLastWeekToDate) / stats.salesLastWeekToDate) * 100).toFixed(1)))}% vs last week (WTD)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center text-[11px] font-bold mt-1 text-emerald-300">
                      <TrendingUp className="w-3.5 h-3.5 mr-1" />
                      <span>↑ +100% vs last week (WTD)</span>
                    </div>
                  )
                ) : (
                  <p className="text-[11px] text-emerald-200/70 mt-1 font-medium">No sales recorded yet this week</p>
                )}
              </div>

              <div className="group relative">
                <p className="text-emerald-200/90 text-xs font-bold uppercase tracking-widest mb-1.5">THIS MONTH SALES</p>
                <p className="text-2xl font-black text-white">{currencyFormatter.format(stats.salesThisMonth)}</p>
                {stats.salesThisMonth > 0 ? (
                  stats.salesLastMonthToDate > 0 ? (
                    <div className="flex items-center text-[11px] font-bold mt-1 text-white/90">
                      {stats.salesThisMonth >= stats.salesLastMonthToDate ? (
                        <TrendingUp className="w-3.5 h-3.5 mr-1 text-emerald-300" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 mr-1 text-rose-300" />
                      )}
                      <span>
                        {stats.salesThisMonth >= stats.salesLastMonthToDate ? '↑ +' : '↓ '}{Math.abs(Number((((stats.salesThisMonth - stats.salesLastMonthToDate) / stats.salesLastMonthToDate) * 100).toFixed(1)))}% vs last month (MTD)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center text-[11px] font-bold mt-1 text-emerald-300">
                      <TrendingUp className="w-3.5 h-3.5 mr-1" />
                      <span>↑ +100% vs last month (MTD)</span>
                    </div>
                  )
                ) : (
                  <p className="text-[11px] text-emerald-200/70 mt-1 font-medium">No sales recorded yet this month</p>
                )}
                
                {/* Hover Tooltip for 6 Months Sales */}
                <div className="absolute bottom-full left-0 mb-2 w-64 bg-slate-900 text-white text-xs rounded-xl shadow-2xl border border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 p-4">
                  <h4 className="font-bold mb-2.5 text-slate-200 border-b border-slate-800 pb-1.5 uppercase tracking-wider text-[10px]">
                    Past 6 Months Sales
                  </h4>
                  <div className="space-y-1.5">
                    {stats.past6MonthsSales.map((monthData: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">{monthData.month}</span>
                        <span className="font-semibold text-white">{currencyFormatter.format(monthData.sales)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-emerald-200/90 text-xs font-bold uppercase tracking-widest mb-1.5">TOTAL PAYOUT RECEIVE 🏆</p>
                <p className="text-2xl font-black text-white">{currencyFormatter.format(lifetimeEarnings)}</p>
                <p className="text-[11px] text-emerald-200/60 mt-1 font-medium">Accumulated career commission</p>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics & Logistics Row (Balanced Grid - Collapses when Logistic Credits is empty) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Weekly Earnings Performance Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm uppercase tracking-tight">Weekly Earnings Performance</h3>
                    <p className="text-xs text-slate-500">Commission trajectory over the last 90 days</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                  90 Days Trend
                </span>
              </div>
            </div>

            <div className="h-56 w-full mt-2">
              {dailyCommissions.some(d => d.amount > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyCommissions} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 11 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      tickFormatter={(value) => `RM${value}`}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                      formatter={(value: any) => [`${currencyFormatter.format(Number(value))}`, 'Commission']}
                    />
                    <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                      {dailyCommissions.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.amount > 0 ? '#10b981' : '#f1f5f9'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
                  <TrendingUp className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-slate-900 font-bold text-xs">No earnings recorded yet in the past 90 days</p>
                  <p className="text-slate-400 text-xs mt-0.5">Complete deals to track your weekly commission trend.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Commission Structure + Optional Logistic Credits Log */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            
            {/* Commission Structure */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm uppercase tracking-tight">Commission Structure</h3>
                  <p className="text-xs text-slate-500">Your earning rates</p>
                </div>
              </div>
              
              <div className="flex-1 flex flex-col justify-center">
                {currentStaff?.commission_tier_override && currentStaff.commission_tier_override !== 'auto' ? (
                  <div className="p-5 bg-purple-50 rounded-xl border border-purple-100 flex flex-col items-center justify-center text-center space-y-2.5">
                    <span className="text-[10px] font-black text-purple-600 uppercase tracking-wider bg-white px-2.5 py-1 rounded-md shadow-sm border border-purple-100">Fixed Rate</span>
                    <span className="text-3xl font-black text-purple-900">
                      {currentStaff.commission_tier_override === 'premium' ? '20%' : currentStaff.commission_tier_override === 'prestige' ? '25%' : '30%'}
                    </span>
                    <p className="text-[11px] text-purple-700/80 font-medium">You are on a fixed commission tier regardless of total sales.</p>
                  </div>
                ) : currentStaff?.commission_rate && Number(currentStaff.commission_rate) > 0 ? (
                  <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col items-center justify-center text-center space-y-2.5">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider bg-white px-2.5 py-1 rounded-md shadow-sm border border-emerald-100">Custom Rate</span>
                    <span className="text-3xl font-black text-emerald-900">{currentStaff.commission_rate}%</span>
                    <p className="text-[11px] text-emerald-700/80 font-medium">You have a custom flat commission rate.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Monthly Progress Tracker */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                      {/* Decorative progress background */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                      
                      <div className="flex justify-between items-end mb-3 relative z-10">
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Current Tier</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-black text-slate-900">Tier {stats.salesThisMonth > 8000 ? 3 : stats.salesThisMonth > 5000 ? 2 : 1}</span>
                            <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-md text-[10px] font-black shadow-sm">
                              {stats.salesThisMonth > 8000 ? '30%' : stats.salesThisMonth > 5000 ? '25%' : '20%'} RATE
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Monthly Sales</p>
                          <p className="text-sm font-bold text-slate-900">{currencyFormatter.format(stats.salesThisMonth || 0)}</p>
                        </div>
                      </div>
                      
                      <div className="relative z-10">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5">
                          <span>Progress to Next Tier</span>
                          <span>{stats.salesThisMonth > 8000 ? 'Maxed Out' : `${Math.round(stats.salesThisMonth > 5000 ? ((stats.salesThisMonth - 5000) / 3000) * 100 : ((stats.salesThisMonth || 0) / 5000) * 100)}%`}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden mb-2.5">
                          <div 
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700 ease-out" 
                            style={{ width: `${Math.min(100, Math.max(0, stats.salesThisMonth > 5000 ? ((stats.salesThisMonth - 5000) / 3000) * 100 : ((stats.salesThisMonth || 0) / 5000) * 100))}%` }}
                          />
                        </div>
                        
                        <p className="text-[10px] text-slate-500 font-medium text-center">
                          {stats.salesThisMonth > 8000 
                            ? '✨ Max tier reached for this month! Great job.' 
                            : <>Unlock <span className="font-bold text-indigo-600">Tier {stats.salesThisMonth > 5000 ? 3 : 2} ({stats.salesThisMonth > 5000 ? '30%' : '25%'})</span> with {currencyFormatter.format((stats.salesThisMonth > 5000 ? 8000 : 5000) - (stats.salesThisMonth || 0))} more in sales</>}
                        </p>
                      </div>
                    </div>

                    {/* Reference List */}
                    <div className="space-y-2">
                      <div className={`flex items-center justify-between p-3 rounded-lg border ${(!stats.salesThisMonth || stats.salesThisMonth <= 5000) ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-50 hover:opacity-100'} transition-all`}>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Tier 1</span>
                          <span className={`text-xs font-bold ${(!stats.salesThisMonth || stats.salesThisMonth <= 5000) ? 'text-indigo-900' : 'text-slate-600'}`}>RM 0 - RM 5,000</span>
                        </div>
                        <span className={`text-sm font-black ${(!stats.salesThisMonth || stats.salesThisMonth <= 5000) ? 'text-indigo-700' : 'text-slate-600'}`}>20%</span>
                      </div>
                      <div className={`flex items-center justify-between p-3 rounded-lg border ${(stats.salesThisMonth > 5000 && stats.salesThisMonth <= 8000) ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-50 hover:opacity-100'} transition-all`}>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Tier 2</span>
                          <span className={`text-xs font-bold ${(stats.salesThisMonth > 5000 && stats.salesThisMonth <= 8000) ? 'text-indigo-900' : 'text-slate-600'}`}>RM 5,001 - RM 8,000</span>
                        </div>
                        <span className={`text-sm font-black ${(stats.salesThisMonth > 5000 && stats.salesThisMonth <= 8000) ? 'text-indigo-700' : 'text-slate-600'}`}>25%</span>
                      </div>
                      <div className={`flex items-center justify-between p-3 rounded-lg border ${(stats.salesThisMonth > 8000) ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-50 hover:opacity-100'} transition-all`}>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Tier 3</span>
                          <span className={`text-xs font-bold ${(stats.salesThisMonth > 8000) ? 'text-indigo-900' : 'text-slate-600'}`}>Above RM 8,000</span>
                        </div>
                        <span className={`text-sm font-black ${(stats.salesThisMonth > 8000) ? 'text-indigo-700' : 'text-slate-600'}`}>30%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Logistic Credits Log (Collapsed when empty) */}
            {logisticCredits && logisticCredits.length > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                        <Car className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm uppercase tracking-tight">Logistic Credits</h3>
                        <p className="text-xs text-slate-500">Fleet handover & return bonuses</p>
                      </div>
                    </div>
                    <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-black">
                      {currencyFormatter.format(logisticCredits.reduce((sum, r) => sum + (r.logistic_credit || 0), 0))}
                    </span>
                  </div>
                </div>

                <div className="max-h-40 overflow-y-auto pr-1 space-y-2 mt-2">
                  {logisticCredits.map(record => (
                    <div key={record.id} className="p-3 bg-slate-50 hover:bg-slate-100/70 transition-colors rounded-xl border border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900">{record.cars?.plate || 'Vehicle Delivery'}</div>
                        <div className="text-[10px] text-slate-500">{formatInMYT(new Date(record.created_at).getTime(), 'dd MMM yyyy, HH:mm')}</div>
                      </div>
                      <div className="text-xs font-black text-blue-600 bg-blue-50/80 px-2 py-1 rounded-md">
                        +{currencyFormatter.format(record.logistic_credit)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pending Payout Breakdown Modal */}
        {showPayoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">Pending Payout Breakdown</h3>
                    <p className="text-xs text-emerald-100">Approved records in Audit Payout Summary awaiting payout processing</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPayoutModal(false)}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
                <div className="pb-4 mb-4 bg-emerald-50/70 p-4 rounded-xl border border-emerald-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Total Approved Payout Due</span>
                    <p className="text-2xl font-black text-emerald-900">{currencyFormatter.format(pendingPayoutDue)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-emerald-700">{approvedPayoutRecords.length} Approved Deal{approvedPayoutRecords.length > 1 ? 's' : ''}</span>
                    <p className="text-xs text-slate-500">Revenue: {currencyFormatter.format(pendingPayoutTotalRevenue)}</p>
                  </div>
                </div>

                {approvedPayoutRecords.length === 0 ? (
                  <div className="py-8 text-center text-slate-500">
                    No approved payout deals currently queued.
                  </div>
                ) : (
                  approvedPayoutRecords.map((a) => {
                    let earned = Number(a.commission_earned) || 0;
                    if (earned <= 0 && Number(a.total_price) > 0) {
                      earned = Number(a.total_price) * 0.20;
                    }

                    return (
                      <div key={a.id} className="py-3 flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">{a.customer_name || 'Customer'}</span>
                            {a.reference_number && (
                              <span className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                #{a.reference_number}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {a.car_plate_number || 'Vehicle'} · {a.start_date ? formatInMYT(new Date(a.start_date).getTime(), 'dd MMM yyyy') : 'Rental'} · Form Total: {currencyFormatter.format(Number(a.total_price) || 0)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-black text-emerald-600">
                            +{currencyFormatter.format(earned)}
                          </span>
                          <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-0.5">
                            Audit Approved
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setShowPayoutModal(false)}
                  className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* New / Edit Booking Modal */}
        {isBookingModalOpen && (
          <BookingModal
            isOpen={isBookingModalOpen}
            onClose={() => {
              setIsBookingModalOpen(false);
              setEditingBookingModal(null);
            }}
            initialDate={selectedBookingDate}
            editingBooking={editingBookingModal}
            onSave={handleSaveBooking}
            onDelete={handleDeleteBooking}
            existingBookings={bookings}
            cars={data?.cars || []}
            members={data?.members || []}
            subscriberId={subscriberId}
            currentStaff={currentStaff}
            currentUserId={userId}
            userUid={userUid}
            staffRole={staffRole}
          />
        )}
      </div>
    </div>
  );
};

export default AgentDashboard;
