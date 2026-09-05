import type { Booking, Car } from '../types';
import { getBookingEndTime, parseBookingDate } from './bookingService';
import { getMYTDateString } from '../utils/dateUtils';

/** Idle now, with no remaining pickup today in Malaysia time. */
export function getIdleVehiclesNow(cars: Car[], bookings: Booking[], nowMs: number): Car[] {
  const today = getMYTDateString(nowMs);
  const occupiedIds = new Set(bookings.filter(booking => {
    if (booking.status === 'cancelled') return false;
    const pickupMs = parseBookingDate(booking.start_date, booking.pickup_time);
    const occupiedNow = pickupMs <= nowMs && nowMs < getBookingEndTime(booking);
    const pickupLaterToday = pickupMs > nowMs && getMYTDateString(pickupMs) === today;
    return occupiedNow || pickupLaterToday;
  }).map(booking => booking.car_id));

  return cars.filter(car => car.status === 'active' && !occupiedIds.has(car.id))
    .sort((a, b) => (a.plate || a.plateNumber || '').localeCompare(b.plate || b.plateNumber || ''));
}
