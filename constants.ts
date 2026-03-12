
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
  { id: 'b1', carId: '1', memberId: 'm1', start: new Date(year, month, 5).toISOString(), duration: 2 },
  { id: 'b2', carId: '2', memberId: 'm2', start: new Date(year, month, 5).toISOString(), duration: 1 },
  { id: 'b3', carId: '3', memberId: 'm1', start: new Date(year, month, 12).toISOString(), duration: 3 },
  { id: 'b4', carId: '1', memberId: 'm3', start: new Date(year, month, 15).toISOString(), duration: 1 },
  { id: 'b5', carId: '4', memberId: 'm2', start: new Date(year, month, 15).toISOString(), duration: 4 },
  { id: 'b6', carId: '2', memberId: 'm3', start: new Date(year, month, 18).toISOString(), duration: 2 },
];
