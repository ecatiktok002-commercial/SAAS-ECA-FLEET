
import React from 'react';
import { Booking, Car, Member } from '../types';

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

  const startTime = new Date(booking.start).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false 
  });

  const showLabel = segment === 'start' || segment === 'single';
  const isRightAnchored = isLastColumn && showLabel;

  const isContinuingRight = segment === 'start' || segment === 'middle';
  const pillWidth = isContinuingRight ? `calc(${width}% + 1px)` : `${width}%`;

  const isMobile = window.innerWidth < 768;
  // REDUCED: Desktop 20px (was 32), Mobile 16px (was 26)
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
        // Remove right margin if continuing to avoid gap
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
            
            {/* Replaced Name with Start Time (24h) */}
            <span className={`opacity-100 font-bold uppercase tracking-tight text-[8px] md:text-[9px] drop-shadow-sm truncate max-w-[60px] md:max-w-none`}>
              {startTime}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingPill;
