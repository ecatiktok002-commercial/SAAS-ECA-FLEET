import type { Booking, Car } from '../types';
import { getBookingEndTime, parseBookingDate } from './bookingService';

/** Calendar availability at an instant: pickup inclusive, return exclusive. */
export function getIdleVehiclesNow(cars: Car[], bookings: Booking[], nowMs: number): Car[] {
  const occupiedIds = new Set(bookings.filter(booking => {
    if (booking.status === 'cancelled') return false;
    return parseBookingDate(booking.start_date, booking.pickup_time) <= nowMs
      && nowMs < getBookingEndTime(booking);
  }).map(booking => booking.car_id));

  return cars.filter(car => car.status === 'active' && !occupiedIds.has(car.id))
    .sort((a, b) => (a.plate || a.plateNumber || '').localeCompare(b.plate || b.plateNumber || ''));
}
