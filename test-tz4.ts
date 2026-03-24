import { format, toZonedTime } from 'date-fns-tz';
const TIMEZONE = 'Asia/Kuala_Lumpur';
const d = new Date('2026-03-24T09:30:00Z');
console.log("Original UTC:", d.toISOString());
console.log("format with tz:", format(d, "yyyy-MM-dd HH:mm", { timeZone: TIMEZONE }));
console.log("toZonedTime + format with tz:", format(toZonedTime(d, TIMEZONE), "yyyy-MM-dd HH:mm", { timeZone: TIMEZONE }));
console.log("toZonedTime + format without tz:", format(toZonedTime(d, TIMEZONE), "yyyy-MM-dd HH:mm"));
