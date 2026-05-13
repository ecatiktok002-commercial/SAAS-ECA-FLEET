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

export const formatTimeMYT = (timeStr: string): string => {
  if (!timeStr) return '';
  const formattedTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  const d = new Date(`1970-01-01T${formattedTime}Z`); // parse as UTC
  return formatInTimeZone(d, TIMEZONE, 'h:mm a'); // output as MYT
};

export const getAgreementPickupDateTime = (agreement: any): Date => {
  let dateStr = agreement.start_date;
  if (!dateStr) {
    return new Date(agreement.created_at); // Fallback
  }

  // Convert DD/MM/YYYY to YYYY-MM-DD if needed
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }

  const timeStr = agreement.pickup_time || '12:00';
  let formattedTime = timeStr;
  const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2];
    const modifier = timeMatch[3];
    
    if (modifier) {
      if (modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
      if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
    }
    formattedTime = `${hours.toString().padStart(2, '0')}:${minutes}:00`;
  }

  return new Date(`${dateStr}T${formattedTime}+08:00`);
};
