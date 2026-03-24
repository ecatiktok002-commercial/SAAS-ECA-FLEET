import { toZonedTime } from 'date-fns-tz';
const TIMEZONE = 'Asia/Kuala_Lumpur';
const d = new Date('2026-03-24T17:30:00+08:00'); // Browser in GMT+8
console.log("Original Local:", d.toString());
const shifted = toZonedTime(d, TIMEZONE);
console.log("Shifted Local:", shifted.toString());
