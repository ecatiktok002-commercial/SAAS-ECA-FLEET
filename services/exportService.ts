import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { formatInMYT } from '../utils/dateUtils';
import { Booking, Car, Member } from '../types';
import { parseBookingDate, getBookingEndTime } from './bookingService';

/**
 * Exports bookings for the specified month to an Excel file.
 * Filename format: Fleet_Bookings_Jan_2026.xlsx
 */
export const exportBookingsToExcel = (
  currentMonth: Date,
  bookings: Booking[],
  cars: Car[],
  members: Member[]
) => {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth(); // 0-indexed

  // Calculate Start and End of the month in JavaScript
  const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

  const monthName = startOfMonth.toLocaleString('default', { month: 'short' });
  const fileName = `Fleet_Bookings_${monthName}_${year}.xlsx`;

  // Filter bookings: Overlap logic
  const relevantBookings = bookings.filter(b => {
    const bStart = parseBookingDate(b.start_date, b.pickup_time);
    // FIX: Ignore DB end_time string. Use actual_end_time or duration
    const bEnd = getBookingEndTime(b);
    const mStart = startOfMonth.getTime();
    const mEnd = endOfMonth.getTime();

    return bStart < mEnd && bEnd > mStart;
  });

  if (relevantBookings.length === 0) {
    alert(`No bookings found for ${monthName} ${year}.`);
    return;
  }

  // Map to export format
  const exportData = relevantBookings.map(b => {
    const car = cars.find(c => c.id === b.car_id);
    const member = members.find(m => m.id === b.member_id);
    
    // Calculate End Date for display
    const bStart = parseBookingDate(b.start_date, b.pickup_time);
    // FIX: Ignore DB end_time string. Use actual_end_time or duration
    const endDate = new Date(getBookingEndTime(b));

    return {
      'Plate Number': car?.plate || 'Unknown',
      'Vehicle Model': car?.name || 'Unknown',
      'Fleet Member': member?.name || 'Unknown',
      'Start Date': formatInMYT(new Date(bStart).getTime(), 'dd/MM/yyyy'),
      'End Date': formatInMYT(endDate.getTime(), 'dd/MM/yyyy'),
      'Duration (Days)': b.duration_days,
      'Booking ID': b.id
    };
  });

  // Create workbook and worksheet
  const ws = XLSX.utils.json_to_sheet(exportData);
  
  // Adjust column widths for better readability
  const wscols = [
    { wch: 15 }, // Plate
    { wch: 20 }, // Model
    { wch: 20 }, // Member
    { wch: 15 }, // Start
    { wch: 15 }, // End
    { wch: 15 }, // Duration
    { wch: 10 }  // ID
  ];
  ws['!cols'] = wscols;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${monthName} ${year}`);

  // Trigger download
  XLSX.writeFile(wb, fileName);
};
