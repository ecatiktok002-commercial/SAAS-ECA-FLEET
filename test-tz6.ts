import { toZonedTime } from 'date-fns-tz';
const TIMEZONE = 'Asia/Kuala_Lumpur';
const d = new Date('2026-03-24T09:30:00Z');
console.log("Original UTC:", d.toISOString());
console.log("Original Local:", d.toString());
const shifted = toZonedTime(d, TIMEZONE);
console.log("Shifted UTC:", shifted.toISOString());
console.log("Shifted Local:", shifted.toString());
