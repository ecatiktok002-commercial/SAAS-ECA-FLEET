import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getIdleVehiclesNow } from './idleVehicles';
import type { Booking, Car } from '../types';

const car = (id: string, status: Car['status'] = 'active'): Car => ({ id, name: id, plate: id, type: 'Economy', status });
const booking = (car_id: string, changes: Partial<Booking> = {}): Booking => ({
  id: car_id, car_id, member_id: 'customer', start_date: '2026-09-05',
  pickup_time: '10:00', duration_days: 1, status: 'active', ...changes,
});
const at = (time: string) => new Date(`2026-09-05T${time}:00+08:00`).getTime();

test('returns the actual available fleet, not active count minus unrelated bookings', () => {
  const cars = [car('FREE'), car('RENTED'), car('OFF', 'inactive'), car('SERVICE', 'maintenance')];
  const bookings = [booking('RENTED'), booking('RENTED'), booking('OTHER-FLEET')];
  assert.deepEqual(getIdleVehiclesNow(cars, bookings, at('12:00')).map(c => c.id), ['FREE']);
});

test('availability changes at pickup and return boundaries in Malaysia time', () => {
  const cars = [car('CAR')];
  const bookings = [booking('CAR', { duration_days: 0, return_time: '14:00' })];
  assert.equal(getIdleVehiclesNow(cars, bookings, at('09:59')).length, 0);
  assert.equal(getIdleVehiclesNow(cars, bookings, at('10:00')).length, 0);
  assert.equal(getIdleVehiclesNow(cars, bookings, at('13:59')).length, 0);
  assert.equal(getIdleVehiclesNow(cars, bookings, at('14:00')).length, 1);
});

test('excludes later pickups today but allows tomorrow and cancelled bookings', () => {
  const cars = [car('CANCELLED'), car('TODAY'), car('TOMORROW')];
  const bookings = [booking('CANCELLED', { status: 'cancelled' }), booking('TODAY', { pickup_time: '18:00' }), booking('TOMORROW', { start_date: '2026-09-06', pickup_time: '00:00' })];
  assert.deepEqual(getIdleVehiclesNow(cars, bookings, at('12:00')).map(c => c.id), ['CANCELLED', 'TOMORROW']);
});

test('same-day cutoff follows Malaysia midnight, not the UTC date', () => {
  const cars = [car('CAR')];
  const bookings = [booking('CAR', { start_date: '2026-09-06', pickup_time: '09:00' })];
  assert.equal(getIdleVehiclesNow(cars, bookings, new Date('2026-09-05T15:59:59Z').getTime()).length, 1);
  assert.equal(getIdleVehiclesNow(cars, bookings, new Date('2026-09-05T16:00:00Z').getTime()).length, 0);
});

test('uses an adjusted end time and still blocks overlapping rentals', () => {
  const cars = [car('CAR')];
  const returned = booking('CAR', { actual_end_time: '2026-09-05T03:00:00Z' });
  assert.equal(getIdleVehiclesNow(cars, [returned], at('11:00')).length, 1);
  assert.equal(getIdleVehiclesNow(cars, [returned, booking('CAR', { pickup_time: '11:00' })], at('12:00')).length, 0);
  assert.equal(getIdleVehiclesNow(cars, [booking('CAR', { actual_end_time: '2026-09-07T10:00:00+08:00' })], new Date('2026-09-06T12:00:00+08:00').getTime()).length, 0);
});
