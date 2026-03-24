import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'Asia/Kuala_Lumpur';

/**
 * Gets the current date/time in Malaysia timezone
 */
export const getNowMYT = (): Date => {
  return new Date();
};

/**
 * Formats a date to a string in Malaysia timezone
 */
export const formatInMYT = (date: Date | string | number, formatStr: string): string => {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return formatInTimeZone(d, TIMEZONE, formatStr);
};

/**
 * Converts a Malaysia local time string (e.g. from an input) to a UTC Date object for storage
 */
export const mytToUtc = (date: Date | string): Date => {
  return fromZonedTime(date, TIMEZONE);
};

/**
 * Converts a UTC date (from DB) to a Malaysia local time Date object for display/manipulation
 */
export const utcToMyt = (date: Date | string | number): Date => {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return toZonedTime(d, TIMEZONE);
};

/**
 * Helper to get YYYY-MM-DDTHH:mm string for datetime-local inputs in MYT
 */
export const getMYTInputString = (date: Date | string | number): string => {
  return formatInMYT(date, "yyyy-MM-dd'T'HH:mm");
};

/**
 * Helper to get just the date part in MYT
 */
export const getMYTDateString = (date: Date | string | number): string => {
  return formatInMYT(date, "yyyy-MM-dd");
};

/**
 * Helper to get just the time part in MYT
 */
export const getMYTTimeString = (date: Date | string | number): string => {
  return formatInMYT(date, "HH:mm");
};
