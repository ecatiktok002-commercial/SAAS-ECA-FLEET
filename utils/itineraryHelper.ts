import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { Booking, Car, Member, Agreement } from '../types';
import { formatInMYT } from './dateUtils';

export interface GenerateItineraryOptions {
  booking: Booking;
  car?: Car;
  member?: Member | null;
  agreement?: Agreement | null;
  companyName?: string;
}

export function getCustomerName(booking: Booking, member?: Member | null, agreement?: Agreement | null): string {
  const name = agreement?.customer_name || member?.name || (booking as any)?.customer_name || 'Pelanggan';
  return name.trim();
}

export function formatPickupDateTime(booking: Booking, agreement?: Agreement | null): string {
  const dateStr = booking.start_date || agreement?.start_date;
  const timeStr = booking.pickup_time || agreement?.pickup_time || '00:00';
  
  if (!dateStr) return '-';
  try {
    let d: Date;
    if (dateStr.includes('T')) {
      d = parseISO(dateStr);
    } else {
      d = new Date(`${dateStr}T00:00:00`);
    }

    const formattedDate = format(d, 'dd/MM/yyyy');
    
    if (timeStr) {
      const timeParts = timeStr.trim().split(':');
      let hours = parseInt(timeParts[0], 10) || 0;
      const minutes = (timeParts[1] || '00').padStart(2, '0');
      const period = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${formattedDate} ${hours}:${minutes} ${period}`;
    }

    return formattedDate;
  } catch {
    return dateStr;
  }
}

export function getPaymentStatus(agreement?: Agreement | null): 'PAID' | 'NO' {
  if (!agreement) return 'NO';
  return (agreement.status === 'completed' || agreement.status === 'reconciled') ? 'PAID' : 'NO';
}

export function getItineraryText(booking: Booking, member?: Member | null, agreement?: Agreement | null): string {
  const customerName = getCustomerName(booking, member, agreement);
  const pickupDateTime = formatPickupDateTime(booking, agreement);
  const paymentStatus = getPaymentStatus(agreement);

  return [
    `1. Nama: ${customerName}`,
    `2. Masa Ambil: ${pickupDateTime}`,
    `3. Payment Status: ${paymentStatus}`
  ].join('\n');
}

/**
 * Draws a sharp, professional 3-item itinerary snapshot card to an off-screen canvas.
 */
export async function generateItineraryImageBlob(options: GenerateItineraryOptions): Promise<Blob | null> {
  const { booking, car, member, agreement, companyName = 'ECA GROUP TRAVEL & TOURS' } = options;
  const customerName = getCustomerName(booking, member, agreement);
  const pickupDateTime = formatPickupDateTime(booking, agreement);
  const isPaid = getPaymentStatus(agreement) === 'PAID';
  const paymentStatus = isPaid ? 'PAID' : 'NO';
  const carPlate = (agreement?.car_plate_number || car?.plate || '-').toUpperCase();
  const carModel = (agreement?.car_model || car?.name || 'Standard Vehicle').toUpperCase();
  const bookingRef = agreement?.reference_number || (
    booking.id ? `${formatInMYT(booking.start_date || new Date(), 'ddMMyy')}-${booking.id.replace(/-/g, '').slice(0, 6).toUpperCase()}` : 'REF-PENDING'
  );

  const width = 640;
  const height = 410;
  const scale = 2; // High-DPI for crisp text

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#f8fafc'; // slate-50
  ctx.fillRect(0, 0, width, height);

  // Card Container
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#e2e8f0'; // slate-200
  ctx.lineWidth = 1.5;
  const cardX = 16;
  const cardY = 16;
  const cardW = width - 32;
  const cardH = height - 32;
  const radius = 16;

  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, radius);
  ctx.fill();
  ctx.stroke();

  // Top Header Area
  ctx.fillStyle = '#0f172a'; // slate-900
  ctx.font = 'bold 16px Inter, system-ui, sans-serif';
  ctx.fillText(companyName.toUpperCase(), cardX + 20, cardY + 34);

  ctx.fillStyle = '#64748b'; // slate-500
  ctx.font = '500 12px Inter, system-ui, sans-serif';
  ctx.fillText(`${carPlate} • ${carModel}`, cardX + 20, cardY + 54);

  // Booking Ref Badge (Top Right)
  const refText = bookingRef;
  ctx.font = 'bold 9px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('BOOKING REF', cardX + cardW - 140, cardY + 30);

  ctx.font = 'bold 13px monospace, sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(refText, cardX + cardW - 140, cardY + 50);

  // Divider line
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 20, cardY + 68);
  ctx.lineTo(cardX + cardW - 20, cardY + 68);
  ctx.stroke();

  const boxH = 68;
  const boxW = cardW - 40;

  // Item 1 Box: Nama
  const box1Y = cardY + 80;
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.roundRect(cardX + 20, box1Y, boxW, boxH, 12);
  ctx.fill();
  ctx.stroke();

  // Item 1 Label
  ctx.fillStyle = '#4f46e5'; // indigo-600
  ctx.font = 'bold 10px Inter, system-ui, sans-serif';
  ctx.fillText('1. NAMA', cardX + 36, box1Y + 24);

  // Item 1 Value
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 16px Inter, system-ui, sans-serif';
  ctx.fillText(customerName.toUpperCase(), cardX + 36, box1Y + 49);

  // Item 2 Box: Masa Ambil
  const box2Y = box1Y + boxH + 10;
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.roundRect(cardX + 20, box2Y, boxW, boxH, 12);
  ctx.fill();
  ctx.stroke();

  // Item 2 Label
  ctx.fillStyle = '#4f46e5'; // indigo-600
  ctx.font = 'bold 10px Inter, system-ui, sans-serif';
  ctx.fillText('2. MASA AMBIL', cardX + 36, box2Y + 24);

  // Item 2 Value
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 16px Inter, system-ui, sans-serif';
  ctx.fillText(pickupDateTime, cardX + 36, box2Y + 49);

  // Item 3 Box: Payment Status
  const box3Y = box2Y + boxH + 10;
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.roundRect(cardX + 20, box3Y, boxW, boxH, 12);
  ctx.fill();
  ctx.stroke();

  // Item 3 Label
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 10px Inter, system-ui, sans-serif';
  ctx.fillText('3. PAYMENT STATUS', cardX + 36, box3Y + 24);

  // Item 3 Value Text
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 16px Inter, system-ui, sans-serif';
  ctx.fillText(paymentStatus, cardX + 36, box3Y + 49);

  // Payment Status Pill Badge (Right side of box 3)
  const badgeW = 76;
  const badgeH = 32;
  const badgeX = cardX + cardW - 36 - badgeW;
  const badgeY = box3Y + (boxH - badgeH) / 2;

  ctx.fillStyle = isPaid ? '#10b981' : '#f43f5e'; // emerald-500 vs rose-500
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 8);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(paymentStatus, badgeX + badgeW / 2, badgeY + 20);
  ctx.textAlign = 'left'; // Reset

  // Bottom Branding Line
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 10px Inter, system-ui, sans-serif';
  ctx.fillText('ECA GROUP • MOTAC L/N 11689 • System Generated Itinerary', cardX + 20, cardY + cardH - 12);

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png', 1.0);
  });
}

/**
 * 1-Click Combined Copy: writes both text/plain and image/png to the system clipboard
 * and displays an immediate toast notification.
 */
export async function copyCombinedItinerary(options: GenerateItineraryOptions): Promise<boolean> {
  const { booking, member, agreement } = options;
  const itineraryText = getItineraryText(booking, member, agreement);

  try {
    const imageBlob = await generateItineraryImageBlob(options);
    const textBlob = new Blob([itineraryText], { type: 'text/plain' });

    let written = false;

    // Check if Clipboard API supports multi-mime writing
    if (navigator.clipboard && (window as any).ClipboardItem && imageBlob) {
      try {
        const item = new (window as any).ClipboardItem({
          'text/plain': textBlob,
          'image/png': imageBlob
        });
        await navigator.clipboard.write([item]);
        written = true;
      } catch (multiErr) {
        console.warn('Multi-MIME clipboard write failed, trying text write:', multiErr);
      }
    }

    if (!written) {
      await navigator.clipboard.writeText(itineraryText);
    }

    toast.success('Itinerary Copied! Ready to paste in WhatsApp.', {
      duration: 3000,
      icon: '📋'
    });
    return true;
  } catch (err) {
    console.error('Failed to copy itinerary:', err);
    try {
      await navigator.clipboard.writeText(itineraryText);
      toast.success('Itinerary text copied to clipboard!');
      return true;
    } catch {
      toast.error('Failed to copy itinerary to clipboard.');
      return false;
    }
  }
}
