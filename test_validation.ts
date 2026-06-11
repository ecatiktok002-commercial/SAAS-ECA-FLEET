import { validateBooking, parseBookingDate, getBookingEndTime } from './services/bookingService';

const existingBooking: any = {
  id: "b1",
  car_id: "VPJ6727",
  start_date: "2026-06-11",
  pickup_time: "13:00",
  duration_days: 2,
  actual_end_time: "2026-06-11T14:00:00.000Z" // 10:00 PM MYT (UTC is 14:00)
};

const newBooking: any = {
  car_id: "VPJ6727",
  start_date: "2026-06-11",
  pickup_time: "23:00", // 11:00 PM MYT
  duration_days: 2,
  actual_end_time: null
};

console.log("Existing booking end:", new Date(getBookingEndTime(existingBooking)).toISOString());
console.log("New booking start:", new Date(parseBookingDate(newBooking.start_date, newBooking.pickup_time)).toISOString());

const isValid = validateBooking(newBooking, [existingBooking]);
console.log("isValid:", isValid);
