
import { Car, Booking } from './types';

export const CARS: Car[] = [
  { id: '1', name: 'Tesla Model 3', type: 'Electric', plate: 'EV-9921' },
  { id: '2', name: 'BMW X5', type: 'SUV', plate: 'DE-4412' },
  { id: '3', name: 'Audi A4', type: 'Luxury', plate: 'AU-1122' },
  { id: '4', name: 'Toyota Corolla', type: 'Economy', plate: 'TY-7788' },
  { id: '5', name: 'Mercedes S-Class', type: 'Luxury', plate: 'MB-0001' },
];

const now = new Date();
const year = now.getFullYear();
const month = now.getMonth();

export const INITIAL_BOOKINGS: Booking[] = [
  { id: 'b1', car_id: '1', member_id: 'm1', start_date: new Date(year, month, 5).toISOString().split('T')[0], pickup_time: '10:00', duration_days: 2 },
  { id: 'b2', car_id: '2', member_id: 'm2', start_date: new Date(year, month, 5).toISOString().split('T')[0], pickup_time: '10:00', duration_days: 1 },
  { id: 'b3', car_id: '3', member_id: 'm1', start_date: new Date(year, month, 12).toISOString().split('T')[0], pickup_time: '10:00', duration_days: 3 },
  { id: 'b4', car_id: '1', member_id: 'm3', start_date: new Date(year, month, 15).toISOString().split('T')[0], pickup_time: '10:00', duration_days: 1 },
  { id: 'b5', car_id: '4', member_id: 'm2', start_date: new Date(year, month, 15).toISOString().split('T')[0], pickup_time: '10:00', duration_days: 4 },
  { id: 'b6', car_id: '2', member_id: 'm3', start_date: new Date(year, month, 18).toISOString().split('T')[0], pickup_time: '10:00', duration_days: 2 },
];
