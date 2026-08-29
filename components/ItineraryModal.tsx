import React, { useState, useEffect, useRef } from 'react';
import { Copy, Download, Check, X, Printer, Car as CarIcon, User } from 'lucide-react';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import { Booking, Car, Member, Agreement } from '../types';
import { apiService } from '../services/apiService';
import { formatInMYT } from '../utils/dateUtils';
import { format, addDays, parseISO } from 'date-fns';

interface ItineraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
  car?: Car;
  member?: Member;
  agreement?: Agreement | null;
  subscriberId?: string | null;
}

export const ItineraryModal: React.FC<ItineraryModalProps> = ({
  isOpen,
  onClose,
  booking,
  car,
  member,
  agreement,
  subscriberId
}) => {
  const snapshotRef = useRef<HTMLDivElement>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [company, setCompany] = useState<{
    brand_name?: string;
    name?: string;
    address?: string;
    logo_url?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen && subscriberId) {
      apiService.getCompanySettings(subscriberId).then((res) => {
        if (res) setCompany(res);
      }).catch((err) => {
        console.error('Error loading company settings for itinerary:', err);
      });
    }
  }, [isOpen, subscriberId]);

  if (!isOpen) return null;

  // Format Helper for dates & times
  const formatDateTimeDisplay = (dateStr: string, timeStr?: string | null): string => {
    if (!dateStr) return '-';
    try {
      let d: Date;
      if (dateStr.includes('T')) {
        d = parseISO(dateStr);
      } else {
        d = new Date(`${dateStr}T00:00:00`);
      }

      const formattedDate = format(d, 'dd/MM/yyyy');
      
      // If time string is provided (e.g., "14:00" or "02:00:00")
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
  };

  // 1. Calculate Actual Calendar Pickup Time (Requirement 3)
  const pickupDateTimeFormatted = (() => {
    if (booking.start_date) {
      return formatDateTimeDisplay(booking.start_date, booking.pickup_time || '00:00');
    }
    if (agreement?.start_date) {
      return formatDateTimeDisplay(agreement.start_date, agreement.pickup_time);
    }
    return '-';
  })();

  // Calculate Return Date & Time
  const returnDateTimeFormatted = (() => {
    // If booking has return_time or duration_days
    if (booking.start_date && booking.duration_days) {
      try {
        const startDate = new Date(`${booking.start_date}T00:00:00`);
        const endDate = addDays(startDate, booking.duration_days);
        const formattedDate = format(endDate, 'dd/MM/yyyy');
        const timeStr = booking.return_time || booking.pickup_time || '00:00';
        const timeParts = timeStr.trim().split(':');
        let hours = parseInt(timeParts[0], 10) || 0;
        const minutes = (timeParts[1] || '00').padStart(2, '0');
        const period = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${formattedDate} ${hours}:${minutes} ${period}`;
      } catch {
        // fallback
      }
    }
    if (agreement?.end_date) {
      return formatDateTimeDisplay(agreement.end_date, agreement.return_time || agreement.pickup_time);
    }
    return '-';
  })();

  // 2. Derive Payment Status (Requirement 2: Completed = PAID, otherwise NO)
  const isPaid = agreement ? (agreement.status === 'completed' || agreement.status === 'reconciled') : false;
  const paymentStatus = isPaid ? 'PAID' : 'NO';

  // Extract Customer details
  const customerName = agreement?.customer_name || member?.name || 'N/A';
  const customerIc = agreement?.identity_number || member?.identity_number || '-';
  const customerPhone = agreement?.customer_phone || member?.phone || '-';
  const customerAddress = agreement?.billing_address || member?.billing_address || '-';
  const emergencyContactName = agreement?.emergency_contact_name || member?.emergency_contact_name || '-';
  const emergencyContactRelation = agreement?.emergency_contact_relation || member?.emergency_contact_relation || '-';
  const rentalPurpose = agreement?.rental_purpose || 'Leisure / Recreation';
  const needEinvoice = agreement?.need_einvoice ? 'Ya' : 'Tidak';

  // Extract Vehicle details
  const carPlate = (agreement?.car_plate_number || car?.plate || '-').toUpperCase();
  const carModel = (agreement?.car_model || car?.name || 'Standard Vehicle').toUpperCase();
  const durationText = `${booking.duration_days || agreement?.duration_days || 1} Days`;
  const usageText = agreement?.usage || member?.usage || 'Within KL/Selangor (200km limit/day)';

  // Extract Financials
  const rentalPriceNum = Number(agreement?.total_price ?? booking.total_price ?? 0);
  const depositNum = Number(agreement?.deposit ?? 100);
  const grandTotalNum = rentalPriceNum + depositNum;

  // Booking Reference
  const bookingReference = agreement?.reference_number || (
    booking.id ? `${formatInMYT(booking.start_date || new Date(), 'ddMMyy')}-${booking.id.replace(/-/g, '').slice(0, 6).toUpperCase()}` : 'REF-PENDING'
  );

  // Company Details
  const companyName = company?.brand_name || company?.name || 'ECA GROUP TRAVEL & TOURS';
  const companyAddress = company?.address || 'MOTAC L/N 11689 | NO 21-B, JALAN SUARASA 8/3, BANDAR TUN HUSSEIN ONN, 43200 CHERAS, SELANGOR TEL:011 5558 2106';

  // Generate clean concise text context with Nama, Masa Ambil & Payment Status
  const getItineraryTextContext = (): string => {
    return [
      `1. Nama: ${customerName}`,
      `2. Masa Ambil: ${pickupDateTimeFormatted}`,
      `3. Payment Status: ${paymentStatus}`
    ].join('\n');
  };

  // Copy plain text to clipboard
  const handleCopyText = async () => {
    try {
      const text = getItineraryTextContext();
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      toast.success('Itinerary text copied to clipboard!');
      setTimeout(() => setCopiedText(false), 2500);
    } catch (err) {
      console.error('Failed to copy text:', err);
      toast.error('Failed to copy text.');
    }
  };

  // Download snapshot as PNG image using html2canvas
  const handleDownloadImage = async () => {
    if (!snapshotRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(snapshotRef.current, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imageBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 1.0));
      if (!imageBlob) throw new Error('Blob generation failed');

      // Trigger download
      const link = document.createElement('a');
      link.download = `Itinerary_${carPlate}_${bookingReference}.png`;
      link.href = URL.createObjectURL(imageBlob);
      link.click();
      URL.revokeObjectURL(link.href);

      toast.success('Itinerary image downloaded!');
    } catch (err) {
      console.error('Failed to export image:', err);
      toast.error('Could not export image.');
    } finally {
      setIsExporting(false);
    }
  };

  // Copy image directly to clipboard if browser supports ClipboardItem
  const handleCopyImage = async () => {
    if (!snapshotRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(snapshotRef.current, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error('Clipboard image copy not supported on this device. Downloading PNG instead.');
          handleDownloadImage();
          return;
        }
        try {
          if (navigator.clipboard && (window as any).ClipboardItem) {
            await navigator.clipboard.write([
              new (window as any).ClipboardItem({ 'image/png': blob })
            ]);
            setCopiedImage(true);
            toast.success('Itinerary image copied to clipboard!');
            setTimeout(() => setCopiedImage(false), 2500);
          } else {
            handleDownloadImage();
          }
        } catch {
          handleDownloadImage();
        } finally {
          setIsExporting(false);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Failed to copy image:', err);
      setIsExporting(false);
      handleDownloadImage();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-100 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-300 overflow-hidden my-auto flex flex-col relative z-[201]">
        
        {/* Top Modal Action Bar */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              <CarIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                Vehicle Handover Itinerary
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                  isPaid ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  Payment: {paymentStatus}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">1-click copy or snapshot for instant handover to Management</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all active:scale-95 shadow-sm"
              title="Copy WhatsApp Formatted Text"
            >
              {copiedText ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedText ? 'Copied Text!' : 'Copy Context'}
            </button>

            <button
              onClick={handleCopyImage}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95 border border-slate-700 disabled:opacity-50"
              title="Copy PNG Snapshot to Clipboard"
            >
              {copiedImage ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
              {copiedImage ? 'Copied Image!' : isExporting ? 'Exporting...' : 'Copy / Save Image'}
            </button>

            <button
              onClick={() => window.print()}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700"
              title="Print Itinerary"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-200 rounded-lg transition-colors border border-slate-700 ml-1"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Snapshot Container */}
        <div className="p-5 sm:p-7 flex flex-col items-center justify-center bg-slate-100/90">
          
          {/* Target Element for Screenshot and Visual Display */}
          <div 
            ref={snapshotRef}
            className="w-full max-w-xl bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-7 space-y-5 text-slate-900"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            {/* Header: Branding & Booking Reference */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <div>
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">
                  {companyName}
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  {carPlate} • {carModel}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-right shrink-0">
                <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">
                  BOOKING REF
                </p>
                <p className="text-sm sm:text-base font-mono font-black text-slate-900">
                  {bookingReference}
                </p>
              </div>
            </div>

            {/* Main 3-Item Section (Nama, Masa Ambil & Payment Status) */}
            <div className="space-y-3">
              
              {/* Item 1: Nama */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider block mb-0.5">
                    1. NAMA
                  </span>
                  <p className="text-base sm:text-lg font-bold text-slate-900 uppercase">
                    {customerName}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <User className="w-4 h-4" />
                </div>
              </div>

              {/* Item 2: Masa Ambil */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider block mb-0.5">
                    2. MASA AMBIL
                  </span>
                  <p className="text-base sm:text-lg font-bold text-slate-900">
                    {pickupDateTimeFormatted}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <CarIcon className="w-4 h-4" />
                </div>
              </div>

              {/* Item 3: Payment Status */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-0.5">
                    3. PAYMENT STATUS
                  </span>
                  <p className="text-base sm:text-lg font-bold text-slate-900">
                    {paymentStatus}
                  </p>
                </div>
                <div>
                  <span className={`text-xs font-black uppercase px-3 py-1.5 rounded-lg inline-block tracking-wider ${
                    isPaid 
                      ? 'bg-emerald-500 text-white shadow-sm' 
                      : 'bg-rose-500 text-white shadow-sm'
                  }`}>
                    {paymentStatus}
                  </span>
                </div>
              </div>

            </div>

            {/* Quick 1-Click Copy Button inside Card */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleCopyText}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
              >
                {copiedText ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedText ? 'Copied to Clipboard!' : '1-Click Copy Itinerary'}
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default ItineraryModal;
