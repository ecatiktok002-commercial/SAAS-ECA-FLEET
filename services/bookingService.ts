import { Booking, Car } from "../types";
import { mytToUtc, getMYTDateString, getNowMYT } from "../utils/dateUtils";

export const parseBookingDate = (dateStr: string, timeStr?: string): number => {
  if (!dateStr) return 0;
  const time = timeStr || "00:00";
  const timeParts = time.split(":");
  const formattedTime = timeParts.length >= 3 ? time : `${time}:00`;
  return mytToUtc(`${dateStr}T${formattedTime}`).getTime();
};

export const getBookingEndTime = (b: Booking): number => {
  if (b.actual_end_time) {
    const timeStr = typeof b.actual_end_time === 'string' ? b.actual_end_time.trim().replace(' ', 'T') : b.actual_end_time;
    if (typeof timeStr === 'string' && !timeStr.includes('Z') && !timeStr.includes('+')) {
      const parsed = mytToUtc(timeStr).getTime();
      if (!isNaN(parsed)) return parsed;
    }
    const t = new Date(timeStr).getTime();
    if (!isNaN(t)) {
      return t;
    }
  }

  const startMs = parseBookingDate(b.start_date, b.pickup_time);

  if (b.return_time) {
    const calcEndDateMs =
      startMs + (b.duration_days || (b as any).duration || 0) * 24 * 60 * 60 * 1000;
    const endDateStr = getMYTDateString(calcEndDateMs);
    return parseBookingDate(endDateStr, b.return_time);
  }

  return startMs + (b.duration_days || (b as any).duration || 0) * 24 * 60 * 60 * 1000;
};

/**
 * Checks if a new booking overlaps with any existing bookings for the same car.
 */
export const validateBooking = (
  newBooking: Omit<Booking, "id">,
  existingBookings: Booking[],
): boolean => {
  const newStart = parseBookingDate(
    newBooking.start_date,
    newBooking.pickup_time,
  );
  const newEnd = getBookingEndTime(newBooking as any);

  // Exclude cancelled bookings from blocking the car availability
  const carBookings = existingBookings.filter(
    (b) => b.car_id === newBooking.car_id && b.status !== "cancelled",
  );

  for (const b of carBookings) {
    const bStart = parseBookingDate(b.start_date, b.pickup_time);

    // Safety check: deeply evaluate actual_end_time in case of parsing idiosyncracies
    // and correctly fallback. getBookingEndTime covers this, but we explicitly call it
    const bEnd = getBookingEndTime(b);

    // Overlap condition:
    // newStart is BEFORE the existing booking ends
    // AND newEnd is AFTER the existing booking starts

    // Add aggressive, verbose timezone logging to the console so the developer can catch timezone shifts
    console.log(`[Validation Debug] Car: ${b.car_id}`);
    console.log(
      `  - Existing ${b.id}: Start ${new Date(bStart).toISOString()} -> End ${new Date(bEnd).toISOString()} (db actual_end_time: ${b.actual_end_time})`,
    );
    console.log(
      `  - New Req: Start ${new Date(newStart).toISOString()} -> End ${new Date(newEnd).toISOString()}`,
    );
    console.log(
      `  - newStart < bEnd: ${newStart < bEnd}, newEnd > bStart: ${newEnd > bStart}`,
    );

    if (newStart < bEnd && newEnd > bStart) {
      console.warn(`Conflict Details: Vehicle ${newBooking.car_id} is busy. 
        Existing booking ${b.id}: Start ${new Date(bStart).toISOString()} -> End ${new Date(bEnd).toISOString()} 
        New request: Start ${new Date(newStart).toISOString()} -> End ${new Date(newEnd).toISOString()}`);
      return false;
    }
  }

  return true;
};

export interface SmartAllocationScore {
  car: Car;
  gapBeforeMs: number; // Time difference between new booking start and previous booking end (>= 0)
  hasPriorBooking: boolean;
  lastPriorBookingEnd?: number;
  gapAfterMs: number; // Time difference between next booking start and new booking end (>= 0)
  hasNextBooking: boolean;
}

/**
 * SMART FLEET ALLOCATION ALGORITHM:
 * Calculates smart fleet allocation ranking for candidate cars.
 * Follows the Fleet Optimization (Tetris/Tight Turnaround) logic:
 * Prioritizes the vehicle whose most recent booking ended closest to the new booking's start time
 * (minimal turnaround gap), packing bookings onto already-active plates to keep other plates contiguous and free.
 */
export const rankCarsBySmartAllocation = (
  candidateCars: Car[],
  startDateTimeStr: string,
  duration: number,
  bookings: Booking[],
  end_time?: string
): SmartAllocationScore[] => {
  let startDate: string;
  let pickupTime: string;

  if (typeof startDateTimeStr === 'string' && startDateTimeStr.includes('T')) {
    const parts = startDateTimeStr.split('T');
    startDate = parts[0];
    pickupTime = parts[1] ? (parts[1].length === 5 ? `${parts[1]}:00` : parts[1]) : '00:00:00';
  } else {
    startDate = typeof startDateTimeStr === 'string' ? startDateTimeStr : getMYTDateString(new Date());
    pickupTime = '10:00:00';
  }

  const newStart = parseBookingDate(startDate, pickupTime);
  const newEnd = (end_time && !isNaN(new Date(end_time).getTime()))
    ? new Date(end_time).getTime()
    : newStart + (Number(duration) || 1) * 24 * 60 * 60 * 1000;

  // Filter for valid available cars only
  const availableCars = candidateCars.filter((car) => {
    if (car.status !== 'active') return false;
    return validateBooking(
      {
        car_id: car.id,
        start_date: startDate,
        pickup_time: pickupTime,
        duration_days: Number(duration) || 1,
        member_id: '',
        end_time,
      },
      bookings
    );
  });

  const scored: SmartAllocationScore[] = availableCars.map((car) => {
    // Non-cancelled bookings for this car
    const carBookings = bookings.filter(
      (b) => b.car_id === car.id && b.status !== 'cancelled'
    );

    // Prior bookings ending before or on newStart
    const priorBookings = carBookings.filter((b) => {
      const bEnd = getBookingEndTime(b);
      return bEnd <= newStart;
    });

    let lastPriorEnd = 0;
    priorBookings.forEach((b) => {
      const bEnd = getBookingEndTime(b);
      if (bEnd > lastPriorEnd) lastPriorEnd = bEnd;
    });

    const hasPrior = lastPriorEnd > 0;
    const gapBefore = hasPrior ? Math.max(0, newStart - lastPriorEnd) : Infinity;

    // Next bookings starting after or on newEnd
    const futureBookings = carBookings.filter((b) => {
      const bStart = parseBookingDate(b.start_date, b.pickup_time);
      return bStart >= newEnd;
    });

    let nextFutureStart = Infinity;
    futureBookings.forEach((b) => {
      const bStart = parseBookingDate(b.start_date, b.pickup_time);
      if (bStart < nextFutureStart) nextFutureStart = bStart;
    });

    const hasNext = nextFutureStart !== Infinity;
    const gapAfter = hasNext ? Math.max(0, nextFutureStart - newEnd) : Infinity;

    return {
      car,
      gapBeforeMs: gapBefore,
      hasPriorBooking: hasPrior,
      lastPriorBookingEnd: hasPrior ? lastPriorEnd : undefined,
      gapAfterMs: gapAfter,
      hasNextBooking: hasNext,
    };
  });

  // Sort scored cars:
  // 1. Cars with prior booking before newStart (smallest gap first -> tightest turnaround)
  // 2. If neither has prior booking (gapBefore === Infinity), check if either has an upcoming booking (smallest gapAfter first)
  // 3. Fallback deterministic: plate alphabetical order
  scored.sort((a, b) => {
    if (a.gapBeforeMs !== b.gapBeforeMs) {
      return a.gapBeforeMs - b.gapBeforeMs;
    }
    if (a.gapAfterMs !== b.gapAfterMs) {
      return a.gapAfterMs - b.gapAfterMs;
    }
    return a.car.plate.localeCompare(b.car.plate);
  });

  return scored;
};

/**
 * SMART ALLOCATION:
 * Finds the optimal car for a model using the Tetris/Turnaround optimization heuristic.
 * Returns the available car whose previous booking ended closest to the new start time.
 */
export const findSmartAllocatedCar = (
  modelName: string,
  startDateTimeStr: string,
  duration: number,
  bookings: Booking[],
  cars: Car[],
  end_time?: string
): Car | null => {
  const modelCars = cars.filter(
    (c) => c.name.trim() === modelName.trim() && c.status === 'active'
  );
  if (modelCars.length === 0) return null;

  const ranked = rankCarsBySmartAllocation(
    modelCars,
    startDateTimeStr,
    duration,
    bookings,
    end_time
  );

  return ranked.length > 0 ? ranked[0].car : null;
};

/**
 * CATEGORY BASED POOLING (SMART ALLOCATION):
 * Checks if ANY car of a specific model is available.
 * Returns the car_id of the smartest allocated car (tightest turnaround from previous booking), or null if fully booked.
 */
export const findAvailableCarByModel = (
  modelName: string,
  startDateTimeStr: string,
  duration: number,
  bookings: Booking[],
  cars: Car[],
  end_time?: string,
): string | null => {
  const smartCar = findSmartAllocatedCar(
    modelName,
    startDateTimeStr,
    duration,
    bookings,
    cars,
    end_time
  );
  return smartCar ? smartCar.id : null;
};

/**
 * UPGRADE LOGIC (SMART ALLOCATION):
 * If the requested model is full, find an available model in a higher tier.
 * Tiers: Economy -> SUV -> Luxury -> Electric
 */
export const suggestUpgrade = (
  currentModel: string,
  startDateTimeStr: string,
  duration: number,
  bookings: Booking[],
  cars: Car[],
  end_time?: string,
): Car | null => {
  const tiers = ["Economy", "SUV", "Luxury", "Electric"];
  const currentCar = cars.find((c) => c.name.trim() === currentModel.trim());
  if (!currentCar) return null;

  const currentTierIndex = tiers.indexOf(currentCar.type);
  const [startDate, pickupTime] = startDateTimeStr.split("T");

  // Look through higher tiers
  for (let i = currentTierIndex + 1; i < tiers.length; i++) {
    const targetTier = tiers[i];
    // Find cars in this tier
    const potentialUpgrades = cars.filter(
      (c) => c.type === targetTier && c.status === "active",
    );

    const rankedUpgrades = rankCarsBySmartAllocation(
      potentialUpgrades,
      startDateTimeStr,
      duration,
      bookings,
      end_time
    );

    if (rankedUpgrades.length > 0) {
      return rankedUpgrades[0].car;
    }
  }

  return null;
};

/**
 * OPTIMIZATION ALGORITHM (Tetris/Auto-Shuffle):
 * Rearranges bookings within the same model group to pack them onto fewer plates,
 * creating larger contiguous blocks of free time on other plates.
 * * RESTRICTION: Only optimizes bookings that start ON or AFTER the current system time.
 * Past/Ongoing bookings remain static on their assigned plates.
 */
export const optimizeBookings = (
  bookings: Booking[],
  cars: Car[],
): Booking[] => {
  const updates: Booking[] = [];
  const now = getNowMYT().getTime(); // System time to determine past vs future

  // 1. Group ALL cars by Model to find all bookings
  const allCarsByModel: Record<string, Car[]> = {};
  cars.forEach((car) => {
    if (!allCarsByModel[car.name]) allCarsByModel[car.name] = [];
    allCarsByModel[car.name].push(car);
  });

  // 2. Process each model group
  Object.keys(allCarsByModel).forEach((modelName) => {
    const allModelCars = allCarsByModel[modelName];
    const activeModelCars = allModelCars.filter((c) => c.status === "active");

    // Get all bookings for this model (including those on offline cars)
    const modelBookings = bookings.filter((b) =>
      allModelCars.some((c) => c.id === b.car_id),
    );

    // Split into Locked (Past/Ongoing) and Optimizable (Future)
    // Locked: Start time < Now. These stay on their assigned car (even if offline).
    // Optimizable: Start time >= Now. These can be shuffled.
    const lockedBookings = modelBookings.filter(
      (b) => parseBookingDate(b.start_date, b.pickup_time) < now,
    );
    const optimizableBookings = modelBookings.filter(
      (b) => parseBookingDate(b.start_date, b.pickup_time) >= now,
    );

    // Sort optimizable bookings by start time to pack them chronologically
    optimizableBookings.sort(
      (a, b) =>
        parseBookingDate(a.start_date, a.pickup_time) -
        parseBookingDate(b.start_date, b.pickup_time),
    );

    // 3. Initialize Car Availability based on Locked Bookings
    // Maps CarID -> Time when it becomes free (End of last locked booking)
    const carAvailability: Record<string, number> = {};

    activeModelCars.forEach((c) => {
      // Find all locked bookings for this specific car
      const carLockedBookings = lockedBookings.filter((b) => b.car_id === c.id);

      // The car is available after the latest end time of its locked bookings
      // If no locked bookings, available immediately (0)
      let maxEnd = 0;
      carLockedBookings.forEach((b) => {
        const bStart = parseBookingDate(b.start_date, b.pickup_time);
        const bEnd = getBookingEndTime(b);
        if (bEnd > maxEnd) maxEnd = bEnd;
      });

      carAvailability[c.id] = maxEnd;
    });

    // 4. Re-assign Optimizable Bookings
    optimizableBookings.forEach((booking) => {
      const bStart = parseBookingDate(booking.start_date, booking.pickup_time);
      const bEnd = getBookingEndTime(booking);

      // Find the "best" car for this booking.
      // Best = The car that becomes free closest to booking start time (without overlap).
      let bestCarId = null;
      let minGap = Infinity;

      // Sort cars to ensure deterministic packing (e.g., always fill Plate A before Plate B)
      const sortedCars = activeModelCars.sort((a, b) =>
        a.plate.localeCompare(b.plate),
      );

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
 * Returns cars that have no bookings overlapping the selected date-time window,
 * ranked by the Smart Allocation (Tetris/Turnaround) heuristic (most recent ended bookings first).
 */
export const getAvailableCars = (
  dateOrStr: Date | string,
  bookings: Booking[],
  cars: Car[],
  duration: number = 1,
  endTime?: string
): Car[] => {
  let dateStr: string;

  if (typeof dateOrStr === 'string') {
    if (dateOrStr.includes('T')) {
      dateStr = dateOrStr;
    } else {
      dateStr = `${dateOrStr}T10:00:00`;
    }
  } else {
    dateStr = `${getMYTDateString(dateOrStr)}T10:00:00`;
  }

  const activeCars = cars.filter((c) => c.status === "active");
  const ranked = rankCarsBySmartAllocation(
    activeCars,
    dateStr,
    duration,
    bookings,
    endTime
  );

  return ranked.map((r) => r.car);
};

/**
 * Assigns vertical tracks to bookings to prevent overlapping in the UI.
 * 
 * 3-TIER STREAK-AWARE CALENDAR LAYOUT PRIORITY:
 * 1. FIRST PRIORITY: Longest single booking duration (e.g. 7-day, 14-day, 30-day).
 * 2. SECOND PRIORITY: Same-Plate Streaks (e.g. Vehicle VLK7868 ending on 31/8 morning and picking up at 1:00PM).
 *    - Connected same-car booking streaks are grouped together and evaluated by their combined streak duration
 *      (e.g., 1 day + 1 day = 2+ days combined streak), moving the entire streak to a higher track position directly below Tier 1.
 *    - The bookings in the streak are placed side-by-side on the exact SAME track row.
 * 3. THIRD PRIORITY: Remaining standalone short bookings (packed into the lowest available tracks from top to bottom).
 */
export const assignTracks = (bookings: Booking[]): Booking[] => {
  if (bookings.length === 0) return [];

  // Group same-car consecutive turnaround bookings into "Streak Chains"
  // Turnaround threshold: gap between end of prior booking and start of next booking <= 36 hours (e.g. same day / next morning)
  const MAX_STREAK_GAP_MS = 36 * 60 * 60 * 1000;

  // Map each booking to start and end timestamps
  interface BookingWithMeta {
    booking: Booking;
    startMs: number;
    endMs: number;
    effectivePriorityScore: number;
    chainBookings: Booking[];
  }

  // Pre-sort all bookings chronologically by start date
  const chronological = [...bookings].sort((a, b) => {
    const startA = parseBookingDate(a.start_date, a.pickup_time);
    const startB = parseBookingDate(b.start_date, b.pickup_time);
    return startA - startB;
  });

  // Build streaks per car_id
  const carChainsMap = new Map<string, Booking[][]>();

  for (const b of chronological) {
    if (!b.car_id) continue;
    const carId = b.car_id;
    const bStart = parseBookingDate(b.start_date, b.pickup_time);
    const bEnd = getBookingEndTime(b);

    if (!carChainsMap.has(carId)) {
      carChainsMap.set(carId, [[b]]);
    } else {
      const chains = carChainsMap.get(carId)!;
      let addedToChain = false;

      // Try appending to the last chain if the gap is within turnaround threshold and no overlap
      const lastChain = chains[chains.length - 1];
      const lastBooking = lastChain[lastChain.length - 1];
      const lastEnd = getBookingEndTime(lastBooking);

      if (bStart >= lastEnd && (bStart - lastEnd) <= MAX_STREAK_GAP_MS) {
        lastChain.push(b);
        addedToChain = true;
      }

      if (!addedToChain) {
        chains.push([b]);
      }
    }
  }

  // Calculate chain metadata for every booking
  const bookingMetaMap = new Map<string, { chain: Booking[]; totalChainDuration: number; isStreak: boolean }>();

  carChainsMap.forEach((chains) => {
    chains.forEach((chain) => {
      const isStreak = chain.length > 1;
      const totalDuration = chain.reduce((sum, b) => sum + (Number(b.duration_days) || 1), 0);
      chain.forEach((b) => {
        bookingMetaMap.set(b.id, {
          chain,
          totalChainDuration: totalDuration,
          isStreak,
        });
      });
    });
  });

  // Sort bookings with the 3-Tier Priority System:
  // Tier 1: Single long-term bookings (e.g. duration_days >= 3)
  // Tier 2: Same-car streaks (effective priority based on combined streak duration, e.g. 1d + 1d + bonus)
  // Tier 3: Standalone shorter bookings
  const sorted = [...bookings].sort((a, b) => {
    const metaA = bookingMetaMap.get(a.id);
    const metaB = bookingMetaMap.get(b.id);

    const durA = Number(a.duration_days) || 1;
    const durB = Number(b.duration_days) || 1;

    // Calculate effective priority score:
    // Standalone booking: base score = dur (e.g. 14 -> 14, 1 -> 1)
    // Streak booking: base score = total combined chain duration + 1.5 bonus priority
    // (This ensures a 1d+1d streak scores 3.5, placing it above 1d & 2d standalone bookings, right below major long rentals)
    const scoreA = metaA && metaA.isStreak ? metaA.totalChainDuration + 1.5 : durA;
    const scoreB = metaB && metaB.isStreak ? metaB.totalChainDuration + 1.5 : durB;

    if (scoreB !== scoreA) {
      return scoreB - scoreA; // Higher score on top
    }

    const startA = parseBookingDate(a.start_date, a.pickup_time);
    const startB = parseBookingDate(b.start_date, b.pickup_time);
    if (startA !== startB) {
      return startA - startB; // Earliest start first
    }

    return (a.car_id || '').localeCompare(b.car_id || '');
  });

  const assigned: Booking[] = [];

  const isTrackConflicting = (track: number, bStart: number, bEnd: number): boolean => {
    return assigned.some((other) => {
      if (other.track !== track) return false;
      const otherStart = parseBookingDate(other.start_date, other.pickup_time);
      const otherEnd = getBookingEndTime(other);
      return bStart < otherEnd && bEnd > otherStart;
    });
  };

  // Track assigned car chain track cache to keep all bookings in a streak on the exact same track
  const carChainTrackMap = new Map<Booking[], number>();

  for (const b of sorted) {
    const bStart = parseBookingDate(b.start_date, b.pickup_time);
    const bEnd = getBookingEndTime(b);
    const meta = bookingMetaMap.get(b.id);

    let chosenTrack: number | null = null;

    // If this booking belongs to an already track-assigned chain/streak:
    if (meta && meta.chain && carChainTrackMap.has(meta.chain)) {
      const assignedTrack = carChainTrackMap.get(meta.chain)!;
      if (!isTrackConflicting(assignedTrack, bStart, bEnd)) {
        chosenTrack = assignedTrack;
      }
    }

    // If not yet assigned to a streak track, check if same car has a prior assigned booking without conflict
    if (chosenTrack === null && b.car_id) {
      const sameCarPriorBookings = assigned.filter(
        (other) => other.car_id === b.car_id && getBookingEndTime(other) <= bStart
      );

      if (sameCarPriorBookings.length > 0) {
        sameCarPriorBookings.sort((p1, p2) => getBookingEndTime(p2) - getBookingEndTime(p1));
        const mostRecentPrior = sameCarPriorBookings[0];
        const sameTrack = mostRecentPrior.track;

        if (
          typeof sameTrack === 'number' &&
          !isTrackConflicting(sameTrack, bStart, bEnd)
        ) {
          chosenTrack = sameTrack;
        }
      }
    }

    // Third Priority / Fallback: Pack into the lowest available non-conflicting track
    if (chosenTrack === null) {
      let track = 0;
      while (isTrackConflicting(track, bStart, bEnd)) {
        track++;
      }
      chosenTrack = track;
    }

    // Cache the chosen track for this chain so the rest of the streak will lock to this same row
    if (meta && meta.chain) {
      carChainTrackMap.set(meta.chain, chosenTrack);
    }

    assigned.push({ ...b, track: chosenTrack });
  }

  return assigned;
};

/**
 * Assigns compacted vertical tracks for a specific 7-day calendar week row.
 * Eliminates artificial gaps and holes caused by bookings on other weeks/days.
 * 
 * Follows the 3-Tier Priority System within the week:
 * 1. FIRST PRIORITY: Longest active duration within this week row on top (tracks 0, 1, 2...).
 * 2. SECOND PRIORITY: Same-Plate Streaks grouped and elevated by combined duration, placed side-by-side.
 * 3. THIRD PRIORITY: Remaining bookings compacted into lowest available non-conflicting row (gap-free).
 */
export const assignTracksForWeek = (
  allBookings: Booking[],
  weekStart: Date,
  weekEnd: Date
): Booking[] => {
  const weekStartStr = getMYTDateString(weekStart);
  const weekEndStr = getMYTDateString(weekEnd);
  const weekStartMs = mytToUtc(`${weekStartStr}T00:00:00`).getTime();
  const weekEndMs = mytToUtc(`${weekEndStr}T23:59:59.999`).getTime();

  // Filter bookings active in this week
  const weekBookings = allBookings.filter((b) => {
    if (b.status === 'cancelled') return false;
    const bStart = parseBookingDate(b.start_date, b.pickup_time);
    const bEnd = getBookingEndTime(b);
    return bStart < weekEndMs && bEnd > weekStartMs;
  });

  if (weekBookings.length === 0) return [];

  // Group same-car consecutive turnaround bookings into streak chains in this week
  const MAX_STREAK_GAP_MS = 36 * 60 * 60 * 1000;

  // Chronological sort within this week
  const chronological = [...weekBookings].sort((a, b) => {
    const startA = parseBookingDate(a.start_date, a.pickup_time);
    const startB = parseBookingDate(b.start_date, b.pickup_time);
    return startA - startB;
  });

  const carChainsMap = new Map<string, Booking[][]>();

  for (const b of chronological) {
    if (!b.car_id) continue;
    const carId = b.car_id;
    const bStart = parseBookingDate(b.start_date, b.pickup_time);

    if (!carChainsMap.has(carId)) {
      carChainsMap.set(carId, [[b]]);
    } else {
      const chains = carChainsMap.get(carId)!;
      let addedToChain = false;

      const lastChain = chains[chains.length - 1];
      const lastBooking = lastChain[lastChain.length - 1];
      const lastEnd = getBookingEndTime(lastBooking);

      if (bStart >= lastEnd && (bStart - lastEnd) <= MAX_STREAK_GAP_MS) {
        lastChain.push(b);
        addedToChain = true;
      }

      if (!addedToChain) {
        chains.push([b]);
      }
    }
  }

  const bookingMetaMap = new Map<string, { chain: Booking[]; totalChainDuration: number; isStreak: boolean }>();

  carChainsMap.forEach((chains) => {
    chains.forEach((chain) => {
      const isStreak = chain.length > 1;
      const totalDuration = chain.reduce((sum, b) => sum + (Number(b.duration_days) || 1), 0);
      chain.forEach((b) => {
        bookingMetaMap.set(b.id, {
          chain,
          totalChainDuration: totalDuration,
          isStreak,
        });
      });
    });
  });

  // Sort bookings with the 3-Tier Priority System:
  const sorted = [...weekBookings].sort((a, b) => {
    const metaA = bookingMetaMap.get(a.id);
    const metaB = bookingMetaMap.get(b.id);

    const durA = Number(a.duration_days) || 1;
    const durB = Number(b.duration_days) || 1;

    const scoreA = metaA && metaA.isStreak ? metaA.totalChainDuration + 1.5 : durA;
    const scoreB = metaB && metaB.isStreak ? metaB.totalChainDuration + 1.5 : durB;

    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }

    const startA = parseBookingDate(a.start_date, a.pickup_time);
    const startB = parseBookingDate(b.start_date, b.pickup_time);
    if (startA !== startB) {
      return startA - startB;
    }

    return (a.car_id || '').localeCompare(b.car_id || '');
  });

  const assigned: Booking[] = [];

  const isTrackConflictingInWeek = (track: number, bStart: number, bEnd: number): boolean => {
    return assigned.some((other) => {
      if (other.track !== track) return false;
      const otherStart = parseBookingDate(other.start_date, other.pickup_time);
      const otherEnd = getBookingEndTime(other);
      return bStart < otherEnd && bEnd > otherStart;
    });
  };

  const carChainTrackMap = new Map<Booking[], number>();

  for (const b of sorted) {
    const bStart = parseBookingDate(b.start_date, b.pickup_time);
    const bEnd = getBookingEndTime(b);
    const meta = bookingMetaMap.get(b.id);

    let chosenTrack: number | null = null;

    // 1. Streak chain track lock
    if (meta && meta.chain && carChainTrackMap.has(meta.chain)) {
      const assignedTrack = carChainTrackMap.get(meta.chain)!;
      if (!isTrackConflictingInWeek(assignedTrack, bStart, bEnd)) {
        chosenTrack = assignedTrack;
      }
    }

    // 2. Same-car prior booking in this week
    if (chosenTrack === null && b.car_id) {
      const sameCarPrior = assigned.filter(
        (other) => other.car_id === b.car_id && getBookingEndTime(other) <= bStart
      );
      if (sameCarPrior.length > 0) {
        sameCarPrior.sort((p1, p2) => getBookingEndTime(p2) - getBookingEndTime(p1));
        const sameTrack = sameCarPrior[0].track;
        if (typeof sameTrack === 'number' && !isTrackConflictingInWeek(sameTrack, bStart, bEnd)) {
          chosenTrack = sameTrack;
        }
      }
    }

    // 3. Compaction: pack into lowest available track (0, 1, 2...)
    if (chosenTrack === null) {
      let track = 0;
      while (isTrackConflictingInWeek(track, bStart, bEnd)) {
        track++;
      }
      chosenTrack = track;
    }

    if (meta && meta.chain) {
      carChainTrackMap.set(meta.chain, chosenTrack);
    }

    assigned.push({ ...b, track: chosenTrack });
  }

  return assigned;
};

export const isBookingOnDate = (booking: Booking, date: Date): boolean => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  const startOfDay = mytToUtc(`${dateStr}T00:00:00`).getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

  const bookingStart = parseBookingDate(
    booking.start_date,
    booking.pickup_time,
  );
  const bookingEnd = getBookingEndTime(booking);

  return bookingStart < endOfDay && bookingEnd > startOfDay;
};

export const getBookingSegmentData = (booking: Booking, date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  const dayStart = mytToUtc(`${dateStr}T00:00:00`).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;

  const bStart = parseBookingDate(booking.start_date, booking.pickup_time);
  const bEnd = getBookingEndTime(booking);

  const intersectionStart = Math.max(dayStart, bStart);
  const intersectionEnd = Math.min(dayEnd, bEnd);

  const DAY_MS = 24 * 60 * 60 * 1000;
  const left = ((intersectionStart - dayStart) / DAY_MS) * 100;
  const width = ((intersectionEnd - intersectionStart) / DAY_MS) * 100;

  const isFirstDay = bStart >= dayStart && bStart < dayEnd;
  const isLastDay = bEnd > dayStart && bEnd <= dayEnd;

  let segment: "start" | "middle" | "end" | "single" = "middle";
  if (isFirstDay && isLastDay) segment = "single";
  else if (isFirstDay) segment = "start";
  else if (isLastDay) segment = "end";

  return {
    segment,
    left: Math.max(0, left),
    width: Math.max(0.1, width),
  };
};
