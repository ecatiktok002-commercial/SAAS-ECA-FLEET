import { fromZonedTime, toZonedTime, format } from 'date-fns-tz';
const TIMEZONE = 'Asia/Kuala_Lumpur';
const d = fromZonedTime('2026-03-24T17:30:00', TIMEZONE);
console.log("mytToUtc:", d.toISOString());
console.log("formatInMYT:", format(toZonedTime(d, TIMEZONE), "yyyy-MM-dd HH:mm", { timeZone: TIMEZONE }));
