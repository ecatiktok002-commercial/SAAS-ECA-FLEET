import { format, toZonedTime } from 'date-fns-tz';
const TIMEZONE = 'Asia/Kuala_Lumpur';
const d = new Date('2026-03-24T17:30:00Z');
const shifted = toZonedTime(d, TIMEZONE);
console.log("format shifted without tz:", format(shifted, "yyyy-MM-dd HH:mm"));
