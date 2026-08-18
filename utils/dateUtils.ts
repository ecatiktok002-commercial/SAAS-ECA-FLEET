import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';

export const TIMEZONE = 'Asia/Kuala_Lumpur';

/**
 * Gets the current date/time
 */
export const getNowMYT = (): Date => {
  return new Date();
};

/**
 * Formats a date to a string in Malaysia timezone
 */
export const formatInMYT = (date: Date | string | number | null | undefined, formatStr: string): string => {
  if (!date) return '';
  let d: Date;
  if (typeof date === 'string') {
    let cleanDate = date.trim();
    if (cleanDate.includes(' ') && !cleanDate.includes('T')) {
      cleanDate = cleanDate.replace(' ', 'T');
    }
    // If string is YYYY-MM-DD only, treat as start of day in MYT
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
      return cleanDate === formatStr ? cleanDate : formatInTimeZone(fromZonedTime(`${cleanDate}T00:00:00`, TIMEZONE), TIMEZONE, formatStr);
    }
    // If string is DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleanDate)) {
      const parts = cleanDate.split('/');
      const isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      return formatInTimeZone(fromZonedTime(`${isoDate}T00:00:00`, TIMEZONE), TIMEZONE, formatStr);
    }
    d = new Date(cleanDate);
  } else if (typeof date === 'number') {
    d = new Date(date);
  } else {
    d = date;
  }
  if (isNaN(d.getTime())) return '';
  return formatInTimeZone(d, TIMEZONE, formatStr);
};

/**
 * Formats a date to a string in Malaysia timezone (default format: 'dd MMM yyyy')
 */
export const formatMytDate = (date?: Date | string | number | null, formatStr: string = 'dd MMM yyyy'): string => {
  if (!date) return '-';
  try {
    const formatted = formatInMYT(date, formatStr);
    return formatted || '-';
  } catch {
    return '-';
  }
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
  let d: Date;
  if (typeof date === 'string') {
    let cleanDate = date.trim();
    if (cleanDate.includes(' ') && !cleanDate.includes('T')) {
      cleanDate = cleanDate.replace(' ', 'T');
    }
    d = new Date(cleanDate);
  } else if (typeof date === 'number') {
    d = new Date(date);
  } else {
    d = date;
  }
  return toZonedTime(d, TIMEZONE);
};

/**
 * Helper to get YYYY-MM-DDTHH:mm string for datetime-local inputs in MYT
 */
export const getMYTInputString = (date: Date | string | number): string => {
  return formatInMYT(date, "yyyy-MM-dd'T'HH:mm");
};

/**
 * Helper to get just the date part in MYT (YYYY-MM-DD)
 */
export const getMYTDateString = (date: Date | string | number): string => {
  return formatInMYT(date, "yyyy-MM-dd");
};

/**
 * Helper to get just the time part in MYT (HH:mm)
 */
export const getMYTTimeString = (date: Date | string | number): string => {
  return formatInMYT(date, "HH:mm");
};

export const formatTimeMYT = (timeStr: string): string => {
  if (!timeStr) return '';
  const formattedTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  
  // Create a date object with the specified time but with MYT explicit offset
  // We use 2024 instead of 1970 because in 1970 Malaysia was on +07:30 timezone
  const d = new Date(`2024-01-01T${formattedTime}+08:00`); 
  return formatInTimeZone(d, TIMEZONE, 'h:mm a'); 
};

export const getAgreementPickupDateTime = (agreement: any): Date => {
  let dateStr = agreement.start_date;
  if (!dateStr) {
    return agreement.created_at ? new Date(agreement.created_at) : new Date(); // Fallback
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
  } else if (formattedTime.length === 5) {
    formattedTime = `${formattedTime}:00`;
  }

  return new Date(`${dateStr}T${formattedTime}+08:00`);
};

export const getAgreementReturnDateTime = (agreement: any, pickupDate?: Date): Date => {
  if (agreement.actual_end_time) return new Date(agreement.actual_end_time);
  
  const pickup = pickupDate || getAgreementPickupDateTime(agreement);
  
  if (agreement.duration_days && Number(agreement.duration_days) > 0) {
    return new Date(pickup.getTime() + Number(agreement.duration_days) * 24 * 60 * 60 * 1000);
  }
  
  if (agreement.end_date) {
    let dateStr = agreement.end_date;
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    const timeStr = agreement.return_time || agreement.pickup_time || '12:00';
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
    } else if (formattedTime.length === 5) {
      formattedTime = `${formattedTime}:00`;
    }
    return new Date(`${dateStr}T${formattedTime}+08:00`);
  }
  
  return pickup;
};
