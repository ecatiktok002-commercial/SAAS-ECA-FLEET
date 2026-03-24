import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
const TIMEZONE = 'Asia/Kuala_Lumpur';
const d = toZonedTime(new Date(), TIMEZONE);
console.log("formatInTimeZone:", formatInTimeZone(d, TIMEZONE, 'yyyy-MM-dd HH:mm:ss'));
