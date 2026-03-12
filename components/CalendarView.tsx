
import React, { useMemo, useEffect, useState } from 'react';
import { Booking, Car, Member } from '../types';
import { isBookingOnDate, getBookingSegmentData, assignTracks } from '../services/bookingService';
import BookingPill from './BookingPill';

// Calendar View Component
interface CalendarViewProps {
  currentMonth: Date;
  bookings: Booking[];
  cars: Car[];
  members: Member[];
  onDateClick: (date: Date) => void;
  onBookingClick: (booking: Booking) => void;
  onDeleteBooking: (id: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ currentMonth, bookings, cars, members, onDateClick, onBookingClick, onDeleteBooking }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const bookingsWithTracks = useMemo(() => assignTracks(bookings), [bookings]);

  const days = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Calculate padding for Monday start (Mon=0, Sun=6)
    // Standard JS getDay(): Sun=0, Mon=1...
    const startDayOfWeek = firstDay.getDay(); 
    const daysInPrevMonth = (startDayOfWeek + 6) % 7; 
    
    const prevMonthLastDay = new Date(year, month, 0);
    
    const today = new Date();
    today.setHours(0,0,0,0);

    const getDayContent = (d: Date) => {
      const dayBookings = bookingsWithTracks.filter(b => isBookingOnDate(b, d));
      const maxTrack = dayBookings.length > 0 ? Math.max(...dayBookings.map(b => b.track ?? 0)) : -1;
      return { dayBookings, maxTrack };
    };

    const buildDays = () => {
      const allDays: any[] = [];
      for (let i = daysInPrevMonth - 1; i >= 0; i--) {
        const d = new Date(year, month - 1, prevMonthLastDay.getDate() - i);
        allDays.push({ date: d, isCurrentMonth: false, isToday: false });
      }
      for (let i = 1; i <= lastDay.getDate(); i++) {
        const d = new Date(year, month, i);
        allDays.push({ date: d, isCurrentMonth: true, isToday: d.getTime() === today.getTime() });
      }
      const remaining = 42 - allDays.length;
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month + 1, i);
        allDays.push({ date: d, isCurrentMonth: false, isToday: false });
      }
      return allDays;
    };

    return buildDays().map(day => ({
      ...day,
      ...getDayContent(day.date)
    }));
  }, [currentMonth, bookingsWithTracks]);

  // Updated week order: MON -> SUN
  const weekDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  
  // trackSpacing must match the value used in BookingPill.tsx
  // REDUCED: Desktop 20px (was 32), Mobile 16px (was 26)
  const trackSpacing = isMobile ? 16 : 20; 

  return (
    <div className="flex-1 flex flex-col bg-white select-none overflow-hidden h-full font-sans">
      <div className="flex flex-col h-full min-w-[340px]">
        {/* Header stays sticky at the top */}
        <div className="grid grid-cols-7 bg-white sticky top-0 z-40 shrink-0 border-b border-slate-100">
          {weekDays.map(day => (
            <div key={day} className="py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>

        {/* 
          Grid uses auto-rows-min and content-start to ensure rows only 
          occupy the space they need.
        */}
        <div className="grid grid-cols-7 flex-1 auto-rows-min content-start h-full overflow-y-auto bg-white pb-20 md:pb-0">
          {days.map((day: any, idx) => {
            const isLastColumn = (idx % 7) === 6;
            // Minimalist borders: only right and bottom, very light
            // Reduced min-h to match compact aesthetic (was 80/110)
            return (
              <div 
                key={idx} 
                onClick={() => onDateClick(day.date)}
                className={`
                  relative flex flex-col transition-colors cursor-pointer group border-b border-r border-slate-100
                  ${(idx + 1) % 7 === 0 ? 'border-r-0' : ''} 
                  ${day.isCurrentMonth ? 'bg-white' : 'bg-slate-50/30'}
                  hover:bg-slate-50 min-h-[50px] md:min-h-[70px]
                `}
              >
                {/* Day Number */}
                <div className="flex justify-between items-start px-2 pt-2 shrink-0 z-10">
                  <span className={`
                    text-xs md:text-sm font-medium transition-all w-6 h-6 flex items-center justify-center rounded-full
                    ${day.isToday 
                      ? 'bg-slate-900 text-white font-bold' 
                      : day.isCurrentMonth ? 'text-slate-700' : 'text-slate-300'}
                  `}>
                    {day.date.getDate()}
                  </span>
                </div>

                {/* Tracks Container */}
                <div 
                  className="relative flex-1 w-full mt-1"
                  style={{ 
                    overflow: 'visible',
                    // Reduced bottom buffer from +12 to +4
                    minHeight: day.maxTrack >= 0 
                      ? `${(day.maxTrack + 1) * trackSpacing + 4}px` 
                      : '100%'
                  }}
                >
                  {day.dayBookings.map((booking: Booking) => {
                    const car = cars.find(c => c.id === booking.carId);
                    const member = members.find(m => m.id === booking.memberId);
                    const { segment, left, width } = getBookingSegmentData(booking, day.date);
                    return (
                      <BookingPill 
                        key={booking.id}
                        booking={booking} 
                        car={car}
                        member={member}
                        segment={segment}
                        left={left}
                        width={width}
                        onBookingClick={onBookingClick}
                        onDelete={onDeleteBooking}
                        isLastColumn={isLastColumn}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
