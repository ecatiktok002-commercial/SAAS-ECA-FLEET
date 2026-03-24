import React from 'react';
import { Booking, Car, Member } from '../types';
// Added this import to handle the MYT conversion
import { getMYTTimeString } from '../utils/dateUtils';
import { parseBookingDate } from '../services/bookingService';

interface BookingPillProps {
  booking: Booking;
  car?: Car;
  member?: Member;
  segment: 'start' | 'middle' | 'end' | 'single';
  left: number;
  width: number;
  onBookingClick?: (booking: Booking) => void;
  onDelete?: (id: string) => void;
  isLastColumn?: boolean;
}

const BookingPill: React.FC<BookingPillProps> = ({ booking, car, member, segment, left, width, onBookingClick, onDelete, isLastColumn }) => {
  // Color now comes from Member, fallback to gray if not found
  const colorClass = member?.color || 'bg-slate-400';
  
  const visualClasses = {
    single: 'rounded-lg z-[30] mx-0.5',
    start: 'rounded-l-lg z-[30] ml-0.5', 
    middle: 'rounded-none z-[20]',
    end: 'rounded-r-lg z-[20] mr-0.5'
  }[segment];

  /** * FIX: Treat the stored pickup_time as UTC by adding 'Z', 
   * then use getMYTTimeString to convert it to GMT+8 for display.
   */
  const startTime = booking.pickup_time || '00:00';

  const showLabel = segment === 'start' || segment === 'single';
  const isRightAnchored = isLastColumn && showLabel;

  const isContinuingRight = segment === 'start' || segment === 'middle';
  const pillWidth = isContinuingRight ? `calc(${width}% + 1px)` : `${width}%`;

  const isMobile = window.innerWidth < 768;
  const trackSpacing = isMobile ? 16 : 20; 
  const topOffset = (booking.track || 0) * trackSpacing;

  return (
    <div 
      onClick={(e) => {
        if (onBookingClick) {
          e.stopPropagation();
          onBookingClick(booking);
        }
      }}
      className={`
        absolute flex items-center h-[12px] md:h-[16px] text-[8px] md:text-[9px] text-white font-medium 
        cursor-pointer transition-all hover:brightness-110 select-none 
        ${colorClass} ${visualClasses} border-white
      `}
      style={{ 
        left: `${left}%`, 
        width: pillWidth,
        top: `${topOffset}px`,
        marginRight: isContinuingRight ? '-1px' : undefined,
        overflow: 'visible'
      }}
    >
      <div 
        className={`flex items-center gap-1 px-1 w-full h-full relative overflow-visible whitespace-nowrap ${isRightAnchored ? 'justify-end' : 'justify-start'}`}
      >
        {showLabel && (
          <div className={`flex items-center gap-1 pointer-events-none z-[60] ${isRightAnchored ? 'flex-row-reverse' : ''}`}>
            {/* Plate Pill */}
            <span className="bg-black/25 px-0.5 md:px-1 rounded text-[6px] md:text-[7px] font-bold tracking-wider whitespace-nowrap shadow-sm">
              {car?.plate}
            </span>
            
            {/* Display converted MYT time */}
            <span className={`opacity-100 font-bold uppercase tracking-tight text-[8px] md:text-[9px] drop-shadow-sm truncate max-w-[60px] md:max-w-none`}>
              {member ? startTime : (booking.agent_name || 'Inactive Agent')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingPill;