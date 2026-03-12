
import { Booking, Car } from '../types';

/**
 * Checks if a new booking overlaps with any existing bookings for the same car.
 */
export const validateBooking = (newBooking: Omit<Booking, 'id'>, existingBookings: Booking[]): boolean => {
  const newStart = new Date(newBooking.start).getTime();
  const newEnd = newStart + (newBooking.duration * 24 * 60 * 60 * 1000);

  const carBookings = existingBookings.filter(b => b.carId === newBooking.carId);

  for (const b of carBookings) {
    const bStart = new Date(b.start).getTime();
    const bEnd = bStart + (b.duration * 24 * 60 * 60 * 1000);

    if (newStart < bEnd && newEnd > bStart) {
      return false; 
    }
  }

  return true;
};

/**
 * CATEGORY BASED POOLING:
 * Checks if ANY car of a specific model is available.
 * Returns the carId of the first available car, or null if fully booked.
 */
export const findAvailableCarByModel = (
  modelName: string, 
  start: Date, 
  duration: number, 
  bookings: Booking[], 
  cars: Car[]
): string | null => {
  // 1. Get all cars of this model
  const modelCars = cars.filter(c => c.name === modelName);
  
  // 2. Iterate through each car to find one that is free
  for (const car of modelCars) {
    const isFree = validateBooking(
      { carId: car.id, start: start.toISOString(), duration, memberId: '' }, // memberId irrelevant for check
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
  cars: Car[]
): Car | null => {
  const tiers = ['Economy', 'SUV', 'Luxury', 'Electric'];
  const currentCar = cars.find(c => c.name === currentModel);
  if (!currentCar) return null;

  const currentTierIndex = tiers.indexOf(currentCar.type);
  
  // Look through higher tiers
  for (let i = currentTierIndex + 1; i < tiers.length; i++) {
    const targetTier = tiers[i];
    // Find cars in this tier
    const potentialUpgrades = cars.filter(c => c.type === targetTier);
    
    // Check if any car in this tier is free
    for (const car of potentialUpgrades) {
      const isFree = validateBooking(
        { carId: car.id, start: start.toISOString(), duration, memberId: '' },
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
  const now = new Date().getTime(); // System time to determine past vs future
  
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
      modelCars.some(c => c.id === b.carId)
    );

    // Split into Locked (Past/Ongoing) and Optimizable (Future)
    // Locked: Start time < Now. These stay on their assigned car.
    // Optimizable: Start time >= Now. These can be shuffled.
    const lockedBookings = modelBookings.filter(b => new Date(b.start).getTime() < now);
    const optimizableBookings = modelBookings.filter(b => new Date(b.start).getTime() >= now);

    // Sort optimizable bookings by start time to pack them chronologically
    optimizableBookings.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    // 3. Initialize Car Availability based on Locked Bookings
    // Maps CarID -> Time when it becomes free (End of last locked booking)
    const carAvailability: Record<string, number> = {};
    
    modelCars.forEach(c => {
        // Find all locked bookings for this specific car
        const carLockedBookings = lockedBookings.filter(b => b.carId === c.id);
        
        // The car is available after the latest end time of its locked bookings
        // If no locked bookings, available immediately (0)
        let maxEnd = 0;
        carLockedBookings.forEach(b => {
            const bEnd = new Date(b.start).getTime() + (b.duration * 24 * 60 * 60 * 1000);
            if (bEnd > maxEnd) maxEnd = bEnd;
        });
        
        carAvailability[c.id] = maxEnd;
    });

    // 4. Re-assign Optimizable Bookings
    optimizableBookings.forEach(booking => {
      const bStart = new Date(booking.start).getTime();
      const bEnd = bStart + (booking.duration * 24 * 60 * 60 * 1000);

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
        
        // If the optimized carId is different from current, mark for update
        if (booking.carId !== bestCarId) {
          updates.push({ ...booking, carId: bestCarId });
        }
      } else {
        // Fallback: If no slot found (e.g. overcapacity), keep original assignment
        // and update availability to prevent stacking
        const currentCarId = booking.carId;
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
    const carBookings = bookings.filter(b => b.carId === car.id);
    const hasOverlap = carBookings.some(b => {
      const bStart = new Date(b.start).getTime();
      const bEnd = bStart + (b.duration * 24 * 60 * 60 * 1000);
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
    const startA = new Date(a.start).getTime();
    const startB = new Date(b.start).getTime();
    if (startA !== startB) return startA - startB;
    return b.duration - a.duration;
  });

  const assigned: Booking[] = [];

  for (const b of sorted) {
    let track = 0;
    const bStart = new Date(b.start).getTime();
    const bEnd = bStart + (b.duration * 24 * 60 * 60 * 1000);

    while (true) {
      const conflict = assigned.some(other => {
        if (other.track !== track) return false;
        const otherStart = new Date(other.start).getTime();
        const otherEnd = otherStart + (other.duration * 24 * 60 * 60 * 1000);
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
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const endOfDay = startOfDay + (24 * 60 * 60 * 1000);
  
  const bookingStart = new Date(booking.start).getTime();
  const bookingEnd = bookingStart + (booking.duration * 24 * 60 * 60 * 1000);
  
  return bookingStart < endOfDay && bookingEnd > startOfDay;
};

export const getBookingSegmentData = (booking: Booking, date: Date) => {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayEnd = dayStart + (24 * 60 * 60 * 1000);
  
  const bStart = new Date(booking.start).getTime();
  const bEnd = bStart + (booking.duration * 24 * 60 * 60 * 1000);

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
