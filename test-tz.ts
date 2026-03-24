import { format, toZonedTime } from 'date-fns-tz';
const TIMEZONE = 'Asia/Kuala_Lumpur';
const d = new Date('2026-03-24T17:30:00Z');
console.log("Original UTC:", d.toISOString());
console.log("formatInTimeZone (correct):", format(d, "yyyy-MM-dd HH:mm", { timeZone: TIMEZONE }));
console.log("Double conversion:", format(toZonedTime(d, TIMEZONE), "yyyy-MM-dd HH:mm", { timeZone: TIMEZONE }));
