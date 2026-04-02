
import { Booking, Car } from '../types';
import { mytToUtc, getMYTDateString, getNowMYT } from '../utils/dateUtils';

export const parseBookingDate = (dateStr: string, timeStr?: string): number => {
  if (!dateStr) return 0;
  const time = timeStr || '00:00';
  const timeParts = time.split(':');
  const formattedTime = timeParts.length >= 3 ? time : `${time}:00`;
  return mytToUtc(`${dateStr}T${formattedTime}`).getTime();
};

/**
 * Checks if a new booking overlaps with any existing bookings for the same car.
 */
export const validateBooking = (newBooking: Omit<Booking, 'id'>, existingBookings: Booking[]): boolean => {
  const newStart = parseBookingDate(newBooking.start_date, newBooking.pickup_time);
  const newEnd = newBooking.end_time ? new Date(newBooking.end_time).getTime() : newStart + (newBooking.duration_days * 24 * 60 * 60 * 1000);

  const carBookings = existingBookings.filter(b => b.car_id === newBooking.car_id);

  for (const b of carBookings) {
    const bStart = parseBookingDate(b.start_date, b.pickup_time);
    const bEnd = b.end_time ? new Date(b.end_time).getTime() : bStart + (b.duration_days * 24 * 60 * 60 * 1000);

    if (newStart < bEnd && newEnd > bStart) {
      return false; 
    }
  }

  return true;
};

/**
 * CATEGORY BASED POOLING:
 * Checks if ANY car of a specific model is available.
 * Returns the car_id of the first available car, or null if fully booked.
 */
export const findAvailableCarByModel = (
  modelName: string, 
  start: Date, 
  duration: number, 
  bookings: Booking[], 
  cars: Car[],
  end_time?: string
): string | null => {
  // FIX: Filter only for 'active' cars so toggled-off units are skipped
  const modelCars = cars.filter(c => c.name.trim() === modelName.trim() && c.status === 'active');
  
  // 2. Iterate through each car to find one that is free
  for (const car of modelCars) {
    const isFree = validateBooking(
      { 
        car_id: car.id, 
        start_date: start.toISOString().split('T')[0], 
        pickup_time: start.toISOString().split('T')[1].substring(0, 5), 
        duration_days: duration, 
        member_id: '', 
        end_time 
      }, // member_id irrelevant for check
      bookings
    );
    
    if (isFree) {
      return car.id;
    }
  }
  
  return null;
};

/**
 * UPGRADE LOGIC:
 * If the requested model is full, find an available model in a higher tier.
 * Tiers: Economy -> SUV -> Luxury -> Electric
 */
export const suggestUpgrade = (
  currentModel: string, 
  start: Date, 
  duration: number, 
  bookings: Booking[], 
  cars: Car[],
  end_time?: string
): Car | null => {
  const tiers = ['Economy', 'SUV', 'Luxury', 'Electric'];
  const currentCar = cars.find(c => c.name.trim() === currentModel.trim());
  if (!currentCar) return null;

  const currentTierIndex = tiers.indexOf(currentCar.type);
  
  // Look through higher tiers
  for (let i = currentTierIndex + 1; i < tiers.length; i++) {
    const targetTier = tiers[i];
    // Find cars in this tier
    const potentialUpgrades = cars.filter(c => c.type === targetTier && c.status === 'active');
    
    // Check if any car in this tier is free
    for (const car of potentialUpgrades) {
      const isFree = validateBooking(
        { 
          car_id: car.id, 
          start_date: start.toISOString().split('T')[0], 
          pickup_time: start.toISOString().split('T')[1].substring(0, 5), 
          duration_days: duration, 
          member_id: '', 
          end_time 
        },
        bookings
      );
      if (isFree) return car;
    }
  }
  
  return null;
};

/**
 * OPTIMIZATION ALGORITHM (Tetris/Auto-Shuffle):
 * Rearranges bookings within the same model group to pack them onto fewer plates,
 * creating larger contiguous blocks of free time on other plates.
 * 
 * RESTRICTION: Only optimizes bookings that start ON or AFTER the current system time.
 * Past/Ongoing bookings remain static on their assigned plates.
 */
export const optimizeBookings = (bookings: Booking[], cars: Car[]): Booking[] => {
  const updates: Booking[] = [];
  const now = getNowMYT().getTime(); // System time to determine past vs future
  
  // 1. Group cars by Model
  const carsByModel: Record<string, Car[]> = {};
  cars.forEach(car => {
    if (!carsByModel[car.name]) carsByModel[car.name] = [];
    carsByModel[car.name].push(car);
  });

  // 2. Process each model group
  Object.keys(carsByModel).forEach(modelName => {
    const modelCars = carsByModel[modelName];
    // Get all bookings for this model
    const modelBookings = bookings.filter(b => 
      modelCars.some(c => c.id === b.car_id)
    );

    // Split into Locked (Past/Ongoing) and Optimizable (Future)
    // Locked: Start time < Now. These stay on their assigned car.
    // Optimizable: Start time >= Now. These can be shuffled.
    const lockedBookings = modelBookings.filter(b => parseBookingDate(b.start_date, b.pickup_time) < now);
    const optimizableBookings = modelBookings.filter(b => parseBookingDate(b.start_date, b.pickup_time) >= now);

    // Sort optimizable bookings by start time to pack them chronologically
    optimizableBookings.sort((a, b) => parseBookingDate(a.start_date, a.pickup_time) - parseBookingDate(b.start_date, b.pickup_time));

    // 3. Initialize Car Availability based on Locked Bookings
    // Maps CarID -> Time when it becomes free (End of last locked booking)
    const carAvailability: Record<string, number> = {};
    
    modelCars.forEach(c => {
        // Find all locked bookings for this specific car
        const carLockedBookings = lockedBookings.filter(b => b.car_id === c.id);
        
        // The car is available after the latest end time of its locked bookings
        // If no locked bookings, available immediately (0)
        let maxEnd = 0;
        carLockedBookings.forEach(b => {
            const bEnd = b.end_time ? new Date(b.end_time).getTime() : parseBookingDate(b.start_date, b.pickup_time) + (b.duration_days * 24 * 60 * 60 * 1000);
            if (bEnd > maxEnd) maxEnd = bEnd;
        });
        
        carAvailability[c.id] = maxEnd;
    });

    // 4. Re-assign Optimizable Bookings
    optimizableBookings.forEach(booking => {
      const bStart = parseBookingDate(booking.start_date, booking.pickup_time);
      const bEnd = booking.end_time ? new Date(booking.end_time).getTime() : bStart + (booking.duration_days * 24 * 60 * 60 * 1000);

      // Find the "best" car for this booking.
      // Best = The car that becomes free closest to booking start time (without overlap).
      let bestCarId = null;
      let minGap = Infinity;

      // Sort cars to ensure deterministic packing (e.g., always fill Plate A before Plate B)
      const sortedCars = modelCars.sort((a, b) => a.plate.localeCompare(b.plate));

      for (const car of sortedCars) {
        const lastEnd = carAvailability[car.id];
        
        if (bStart >= lastEnd) {
          const gap = bStart - lastEnd;
          if (gap < minGap) {
            minGap = gap;
            bestCarId = car.id;
          }
        }
      }

      // If we found a valid slot
      if (bestCarId) {
        carAvailability[bestCarId] = bEnd; // Update when this car becomes free
        
        // If the optimized car_id is different from current, mark for update
        if (booking.car_id !== bestCarId) {
          updates.push({ ...booking, car_id: bestCarId });
        }
      } else {
        // Fallback: If no slot found (e.g. overcapacity), keep original assignment
        // and update availability to prevent stacking
        const currentCarId = booking.car_id;
        const currentLastEnd = carAvailability[currentCarId] || 0;
        if (bStart >= currentLastEnd) {
           carAvailability[currentCarId] = bEnd;
        }
      }
    });
  });

  return updates;
};

/**
 * Returns cars that have no bookings overlapping the selected date-time window.
 */
export const getAvailableCars = (date: Date, bookings: Booking[], cars: Car[]): Car[] => {
  const checkStart = date.getTime();
  const checkEnd = checkStart + (1 * 60 * 60 * 1000); 

  return cars.filter(car => {
    if (car.status !== 'active') return false;
    const carBookings = bookings.filter(b => b.car_id === car.id);
    const hasOverlap = carBookings.some(b => {
      const bStart = parseBookingDate(b.start_date, b.pickup_time);
      const bEnd = b.end_time ? new Date(b.end_time).getTime() : bStart + (b.duration_days * 24 * 60 * 60 * 1000);
      return checkStart < bEnd && checkEnd > bStart;
    });
    return !hasOverlap;
  });
};

/**
 * Assigns vertical tracks to bookings to prevent overlapping in the UI.
 * Higher priority to bookings that start earlier and have longer duration.
 */
export const assignTracks = (bookings: Booking[]): Booking[] => {
  const sorted = [...bookings].sort((a, b) => {
    const startA = parseBookingDate(a.start_date, a.pickup_time);
    const startB = parseBookingDate(b.start_date, b.pickup_time);
    if (startA !== startB) return startA - startB;
    return b.duration_days - a.duration_days;
  });

  const assigned: Booking[] = [];

  for (const b of sorted) {
    let track = 0;
    const bStart = parseBookingDate(b.start_date, b.pickup_time);
    const bEnd = b.end_time ? new Date(b.end_time).getTime() : bStart + (b.duration_days * 24 * 60 * 60 * 1000);

    while (true) {
      const conflict = assigned.some(other => {
        if (other.track !== track) return false;
        const otherStart = parseBookingDate(other.start_date, other.pickup_time);
        const otherEnd = other.end_time ? new Date(other.end_time).getTime() : otherStart + (other.duration_days * 24 * 60 * 60 * 1000);
        return bStart < otherEnd && bEnd > otherStart;
      });

      if (!conflict) break;
      track++;
    }
    assigned.push({ ...b, track });
  }

  return assigned;
};

export const isBookingOnDate = (booking: Booking, date: Date): boolean => {
  // FIX: Use your utility to get the correct YYYY-MM-DD for Malaysia
  const dateStr = getMYTDateString(date); 
  const startOfDay = mytToUtc(`${dateStr}T00:00:00`).getTime();
  const endOfDay = startOfDay + (24 * 60 * 60 * 1000);
  
  const bookingStart = parseBookingDate(booking.start_date, booking.pickup_time);
  const bookingEnd = booking.end_time 
    ? new Date(booking.end_time).getTime() 
    : bookingStart + (booking.duration_days * 24 * 60 * 60 * 1000);
  
  return bookingStart < endOfDay && bookingEnd > startOfDay;
};

export const getBookingSegmentData = (booking: Booking, date: Date) => {
  // FIX: Force dayStart to be 00:00 Malaysia Time, converted to UTC correctly
  const dateStr = getMYTDateString(date); 
  const dayStart = mytToUtc(`${dateStr}T00:00:00`).getTime();
  const dayEnd = dayStart + (24 * 60 * 60 * 1000);
  
  const bStart = parseBookingDate(booking.start_date, booking.pickup_time);
  const bEnd = booking.end_time 
    ? new Date(booking.end_time).getTime() 
    : bStart + (booking.duration_days * 24 * 60 * 60 * 1000);

  const intersectionStart = Math.max(dayStart, bStart);
  const intersectionEnd = Math.min(dayEnd, bEnd);

  const DAY_MS = 24 * 60 * 60 * 1000;
  const left = ((intersectionStart - dayStart) / DAY_MS) * 100;
  const width = ((intersectionEnd - intersectionStart) / DAY_MS) * 100;

  const isFirstDay = bStart >= dayStart && bStart < dayEnd;
  const isLastDay = bEnd > dayStart && bEnd <= dayEnd;

  let segment: 'start' | 'middle' | 'end' | 'single' = 'middle';
  if (isFirstDay && isLastDay) segment = 'single';
  else if (isFirstDay) segment = 'start';
  else if (isLastDay) segment = 'end';

  return { 
    segment, 
    left: Math.max(0, left), 
    width: Math.max(0.1, width) 
  };
};
