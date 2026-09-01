import { parseCustomUsage } from '../components/CustomUsageModal';

export interface MileageUsageAnalysis {
  isFinishedReturnTime: boolean;
  hasHandoverData: boolean;
  hasBothHandovers: boolean;
  hasBothDashboardImages: boolean;
  hasBothFuelLevels: boolean;
  hasValidPickupAndReturn: boolean;
  hasPickupRecord: boolean;
  hasReturnRecord: boolean;
  hasPickupDashboardPhoto: boolean;
  hasReturnDashboardPhoto: boolean;
  isMissingData: boolean;
  missingDataReason: string | null;
  pickupMileage: number | null;
  returnMileage: number | null;
  pickupFuelLevel: string | null;
  returnFuelLevel: string | null;
  actualMileageUsed: number | null;
  allowedMileageLimit: number | null; // null means unlimited
  isUnlimited: boolean;
  isExceeded: boolean;
  excessMileage: number;
  usageDescription: string;
  returnDateTime: Date | null;
  formattedLimit: string;
  alertType: 'exceeded' | 'missing_data' | null;
}

/**
 * Checks if a handover record has a submitted dashboard image.
 */
export function hasDashboardPhoto(record: { photos_url?: string[] | null }): boolean {
  if (!record || !record.photos_url) return false;
  if (!Array.isArray(record.photos_url) || record.photos_url.length === 0) return false;
  
  // HandoverForm saves dashboard photos as "..._Dashboard.jpg" or uploaded photo list
  return record.photos_url.some(url => {
    if (typeof url !== 'string' || !url.trim()) return false;
    return url.toLowerCase().includes('dashboard') || record.photos_url!.length > 0;
  });
}

/**
 * Checks if a handover record has recorded fuel level.
 */
export function hasRecordedFuelLevel(record: { fuel_level?: string | number | null }): boolean {
  if (!record || record.fuel_level == null) return false;
  const str = String(record.fuel_level).trim();
  return str.length > 0 && str !== '-' && str.toLowerCase() !== 'null';
}

/**
 * Calculates the mileage limit based on the rental duration and usage type:
 * - "Within KL/Selangor (200km limit/day)" -> duration * 200 km
 * - "Outstation (500km limit/day)" -> duration * 500 km
 * - "Monthly Subscription (Unlimited)" -> Unlimited (null)
 * - Custom "Customize: X Days Outstation, Y Days Within KL/Selangor" -> (X * 500) + (Y * 200) km
 */
export function calculateAllowedMileage(usage?: string, durationDays: number = 1): { limit: number | null; isUnlimited: boolean; description: string } {
  const safeDays = Math.max(1, Number(durationDays) || 1);
  const normalizedUsage = (usage || '').trim();

  if (!normalizedUsage || normalizedUsage.toLowerCase().includes('within kl') || normalizedUsage.includes('200km')) {
    const limit = safeDays * 200;
    return {
      limit,
      isUnlimited: false,
      description: `${limit.toLocaleString()} km (${safeDays}d × 200km/d)`
    };
  }

  if (normalizedUsage.toLowerCase().includes('monthly') || normalizedUsage.toLowerCase().includes('unlimited')) {
    return {
      limit: null,
      isUnlimited: true,
      description: 'Unlimited'
    };
  }

  if (normalizedUsage.toLowerCase().includes('outstation') && !normalizedUsage.toLowerCase().startsWith('customize')) {
    const limit = safeDays * 500;
    return {
      limit,
      isUnlimited: false,
      description: `${limit.toLocaleString()} km (${safeDays}d × 500km/d)`
    };
  }

  if (normalizedUsage.toLowerCase().startsWith('customize') || normalizedUsage.toLowerCase().includes('customize')) {
    const { outstationDays, klSelangorDays } = parseCustomUsage(normalizedUsage, safeDays);
    const limit = (outstationDays * 500) + (klSelangorDays * 200);
    return {
      limit,
      isUnlimited: false,
      description: `${limit.toLocaleString()} km (${outstationDays}d Outstation × 500km + ${klSelangorDays}d KL × 200km)`
    };
  }

  // Default fallback to 200km/day
  const fallbackLimit = safeDays * 200;
  return {
    limit: fallbackLimit,
    isUnlimited: false,
    description: `${fallbackLimit.toLocaleString()} km (${safeDays}d × 200km/d)`
  };
}

/**
 * Computes return Date object in MYT (+08:00)
 */
export function getAgreementReturnDateTime(agreement: {
  start_date?: string;
  end_date?: string;
  pickup_time?: string;
  return_time?: string;
  duration_days?: number;
  created_at?: string;
}): Date {
  // If end_date is present
  const timeStr = agreement.return_time || agreement.pickup_time || '23:59';
  const formattedTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;

  if (agreement.end_date) {
    return new Date(`${agreement.end_date}T${formattedTime}+08:00`);
  }

  if (agreement.start_date) {
    const dur = Math.max(1, Number(agreement.duration_days) || 1);
    const startObj = new Date(`${agreement.start_date}T00:00:00+08:00`);
    startObj.setDate(startObj.getDate() + dur);
    const yyyy = startObj.getFullYear();
    const mm = String(startObj.getMonth() + 1).padStart(2, '0');
    const dd = String(startObj.getDate()).padStart(2, '0');
    return new Date(`${yyyy}-${mm}-${dd}T${formattedTime}+08:00`);
  }

  return agreement.created_at ? new Date(agreement.created_at) : new Date();
}

// Cutoff for new missing-data alert rules: 00:00 GMT+8, 1 Sept 2026
export const NEW_ALERT_CUTOFF_MYT = new Date('2026-09-01T00:00:00+08:00');

/**
 * Computes start Date object in MYT (+08:00)
 */
export function getAgreementStartDateTime(agreement: {
  start_date?: string;
  pickup_time?: string;
  created_at?: string;
}): Date {
  const timeStr = agreement.pickup_time || '00:00';
  const formattedTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;

  if (agreement.start_date) {
    return new Date(`${agreement.start_date}T${formattedTime}+08:00`);
  }

  return agreement.created_at ? new Date(agreement.created_at) : new Date();
}

/**
 * Evaluates whether an agreement has exceeded its mileage limit or is missing required handover/dashboard data.
 */
export function evaluateMileageUsage(
  agreement: {
    start_date?: string;
    end_date?: string;
    pickup_time?: string;
    return_time?: string;
    duration_days?: number;
    usage?: string;
    created_at?: string;
    status?: string;
    booking_status?: string;
  },
  handoverRecords: Array<{
    handover_type: 'Pickup' | 'Return' | string;
    mileage?: number | string | null;
    fuel_level?: string | number | null;
    photos_url?: string[] | null;
    created_at?: string;
  }> = [],
  currentTime: Date = new Date()
): MileageUsageAnalysis {
  const returnDateTime = getAgreementReturnDateTime(agreement);
  const startDateTime = getAgreementStartDateTime(agreement);
  const isFinishedReturnTime = currentTime.getTime() >= returnDateTime.getTime();

  // Check if booking starts from 00:00 GMT+8, 1 Sept 2026 onwards
  const isFromSept1Onwards = startDateTime.getTime() >= NEW_ALERT_CUTOFF_MYT.getTime();

  // Check if the booking / agreement is in "Completed" status
  const agreementStatus = (agreement.status || '').toLowerCase().trim();
  const bookingStatus = (agreement.booking_status || '').toLowerCase().trim();
  const isCompleted = agreementStatus === 'completed' || agreementStatus === 'reconciled' || bookingStatus === 'completed';

  // Find pickup and return records (sort by date if multiple)
  const pickupRecords = handoverRecords
    .filter(r => (r.handover_type || '').toLowerCase() === 'pickup')
    .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

  const returnRecords = handoverRecords
    .filter(r => (r.handover_type || '').toLowerCase() === 'return')
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  const pickupRecord = pickupRecords.length > 0 ? pickupRecords[0] : null;
  const returnRecord = returnRecords.length > 0 ? returnRecords[0] : null;

  const hasPickupRecord = !!pickupRecord;
  const hasReturnRecord = !!returnRecord;

  const pickupMileage = pickupRecord && pickupRecord.mileage != null && !isNaN(Number(pickupRecord.mileage))
    ? Number(pickupRecord.mileage)
    : null;

  const returnMileage = returnRecord && returnRecord.mileage != null && !isNaN(Number(returnRecord.mileage))
    ? Number(returnRecord.mileage)
    : null;

  const pickupFuelLevel = pickupRecord?.fuel_level != null ? String(pickupRecord.fuel_level) : null;
  const returnFuelLevel = returnRecord?.fuel_level != null ? String(returnRecord.fuel_level) : null;

  const hasPickupDashboardImage = pickupRecord ? hasDashboardPhoto(pickupRecord) : false;
  const hasReturnDashboardImage = returnRecord ? hasDashboardPhoto(returnRecord) : false;
  const hasBothDashboardImages = hasPickupDashboardImage && hasReturnDashboardImage;

  const hasPickupFuelLevel = pickupRecord ? hasRecordedFuelLevel(pickupRecord) : false;
  const hasReturnFuelLevel = returnRecord ? hasRecordedFuelLevel(returnRecord) : false;
  const hasBothFuelLevels = hasPickupFuelLevel && hasReturnFuelLevel;

  const hasBothHandovers = pickupMileage !== null && returnMileage !== null;
  const hasHandoverData = pickupMileage !== null || returnMileage !== null;

  // Valid handover data for both Pickup and Return with photos & fuel
  const hasValidPickupAndReturn = hasBothHandovers && hasBothDashboardImages && hasBothFuelLevels;

  let actualMileageUsed: number | null = null;
  if (hasBothHandovers && returnMileage !== null && pickupMileage !== null) {
    actualMileageUsed = Math.max(0, returnMileage - pickupMileage);
  }

  const durationDays = Math.max(1, Number(agreement.duration_days) || 1);
  const { limit, isUnlimited, description } = calculateAllowedMileage(agreement.usage, durationDays);

  let isExceeded = false;
  let excessMileage = 0;
  let isMissingData = false;
  let missingDataReason: string | null = null;
  let alertType: 'exceeded' | 'missing_data' | null = null;

  // Check if booking has exceeded allowable mileage limit
  if (isFinishedReturnTime && hasValidPickupAndReturn && actualMileageUsed !== null && limit !== null && !isUnlimited) {
    if (actualMileageUsed > limit) {
      isExceeded = true;
      excessMileage = actualMileageUsed - limit;
      alertType = 'exceeded';
    }
  }

  // NEW LOGIC: Only applies to Bookings with start date 00:00 GMT+8, 1 Sept 2026 Onwards AND "Completed" Status
  // If there are empty data for Pickup or Return or missing dashboard photo / mileage,
  // trigger the Alert to notify Staff to input Mileage Photo.
  if (isFromSept1Onwards && isCompleted && !isExceeded) {
    const missingItems: string[] = [];

    if (!hasPickupRecord || pickupMileage === null || !hasPickupDashboardImage) {
      if (!hasPickupRecord) {
        missingItems.push('Missing Pickup Handover');
      } else if (pickupMileage === null && !hasPickupDashboardImage) {
        missingItems.push('Missing Pickup Mileage & Dashboard Photo');
      } else if (pickupMileage === null) {
        missingItems.push('Missing Pickup Mileage');
      } else {
        missingItems.push('Missing Pickup Dashboard Photo');
      }
    }

    // If booking has reached/passed return time or a return was recorded, check return handover completeness
    if (isFinishedReturnTime || hasReturnRecord) {
      if (!hasReturnRecord) {
        missingItems.push('Missing Return Handover');
      } else if (returnMileage === null && !hasReturnDashboardImage) {
        missingItems.push('Missing Return Mileage & Dashboard Photo');
      } else if (returnMileage === null) {
        missingItems.push('Missing Return Mileage');
      } else if (!hasReturnDashboardImage) {
        missingItems.push('Missing Return Dashboard Photo');
      }
    }

    if (missingItems.length > 0) {
      isMissingData = true;
      missingDataReason = missingItems.join(' • ');
      alertType = 'missing_data';
    }
  }

  return {
    isFinishedReturnTime,
    hasHandoverData,
    hasBothHandovers,
    hasBothDashboardImages,
    hasBothFuelLevels,
    hasValidPickupAndReturn,
    hasPickupRecord,
    hasReturnRecord,
    hasPickupDashboardPhoto: hasPickupDashboardImage,
    hasReturnDashboardPhoto: hasReturnDashboardImage,
    isMissingData,
    missingDataReason,
    pickupMileage,
    returnMileage,
    pickupFuelLevel,
    returnFuelLevel,
    actualMileageUsed,
    allowedMileageLimit: limit,
    isUnlimited,
    isExceeded,
    excessMileage,
    usageDescription: description,
    returnDateTime,
    formattedLimit: isUnlimited ? 'Unlimited' : `${limit?.toLocaleString()} km`,
    alertType
  };
}
