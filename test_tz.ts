import { fromZonedTime } from 'date-fns-tz';

const test = fromZonedTime("2026-06-11T23:00", 'Asia/Kuala_Lumpur');
console.log(test.toISOString());
