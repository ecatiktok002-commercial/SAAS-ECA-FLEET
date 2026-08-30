
import React, { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { Booking, Car, Member } from '../types';
import { isBookingOnDate, getBookingSegmentData, assignTracksForWeek } from '../services/bookingService';
import { getNowMYT } from '../utils/dateUtils';
import BookingPill from './BookingPill';
import { ZoomIn, ZoomOut, RotateCcw, Move } from 'lucide-react';

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

const MIN_ZOOM = 1.0;
const MAX_ZOOM = 2.8;

const CalendarView: React.FC<CalendarViewProps> = ({ 
  currentMonth, 
  bookings, 
  cars, 
  members, 
  onDateClick, 
  onBookingClick, 
  onDeleteBooking 
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState(false);
  const [showHint, setShowHint] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Touch tracking references
  const touchStateRef = useRef<{
    startX: number;
    startY: number;
    initialPanX: number;
    initialPanY: number;
    initialDist: number;
    initialZoom: number;
    pinchCenterX: number;
    pinchCenterY: number;
    isPinching: boolean;
    isPanning: boolean;
    hasMoved: boolean;
  }>({
    startX: 0,
    startY: 0,
    initialPanX: 0,
    initialPanY: 0,
    initialDist: 0,
    initialZoom: 1.0,
    pinchCenterX: 0,
    pinchCenterY: 0,
    isPinching: false,
    isPanning: false,
    hasMoved: false,
  });

  const isDraggingRef = useRef(false);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Reset zoom & pan when month changes
  useEffect(() => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  }, [currentMonth]);

  // Clamp pan based on current zoom and viewport dimensions
  const clampPan = useCallback((newPan: { x: number; y: number }, currentZoom: number) => {
    if (!containerRef.current) return newPan;
    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    if (currentZoom <= 1.0) {
      return { x: 0, y: 0 };
    }

    const maxPanX = 0;
    const minPanX = containerWidth * (1 - currentZoom);

    const maxPanY = 0;
    const minPanY = containerHeight * (1 - currentZoom);

    return {
      x: Math.min(maxPanX, Math.max(minPanX, newPan.x)),
      y: Math.min(maxPanY, Math.max(minPanY, newPan.y)),
    };
  }, []);

  // Handle Zoom In/Out helper
  const handleZoomChange = (delta: number) => {
    setShowHint(false);
    setZoom((prevZoom) => {
      const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((prevZoom + delta) * 10) / 10));
      if (nextZoom === 1.0) {
        setPan({ x: 0, y: 0 });
      } else {
        setPan((prevPan) => clampPan(prevPan, nextZoom));
      }
      return nextZoom;
    });
  };

  const handleResetZoom = () => {
    setShowHint(false);
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Touch Event Handlers for Native Pinch & Pan
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTouchStart = (e: TouchEvent) => {
      setShowHint(false);
      const touches = e.touches;

      if (touches.length === 1) {
        const touch = touches[0];
        touchStateRef.current = {
          ...touchStateRef.current,
          startX: touch.clientX,
          startY: touch.clientY,
          initialPanX: pan.x,
          initialPanY: pan.y,
          isPinching: false,
          isPanning: zoom > 1.0,
          hasMoved: false,
        };
        setIsInteracting(false);
      } else if (touches.length === 2) {
        // Pinch start
        const t1 = touches[0];
        const t2 = touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const rect = container.getBoundingClientRect();
        const centerX = (t1.clientX + t2.clientX) / 2 - rect.left;
        const centerY = (t1.clientY + t2.clientY) / 2 - rect.top;

        touchStateRef.current = {
          ...touchStateRef.current,
          initialDist: dist,
          initialZoom: zoom,
          initialPanX: pan.x,
          initialPanY: pan.y,
          pinchCenterX: centerX,
          pinchCenterY: centerY,
          isPinching: true,
          isPanning: false,
          hasMoved: true,
        };
        setIsInteracting(true);
        isDraggingRef.current = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const touches = e.touches;

      if (touches.length === 2 && touchStateRef.current.isPinching) {
        // Handle Pinch to Zoom
        e.preventDefault(); // Prevent native browser screen zoom
        const t1 = touches[0];
        const t2 = touches[1];
        const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

        if (touchStateRef.current.initialDist > 0) {
          const scaleMultiplier = currentDist / touchStateRef.current.initialDist;
          let newZoom = touchStateRef.current.initialZoom * scaleMultiplier;
          newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));

          // Adjust pan to zoom towards pinch center
          const prevZoom = touchStateRef.current.initialZoom;
          const centerX = touchStateRef.current.pinchCenterX;
          const centerY = touchStateRef.current.pinchCenterY;

          const ratio = newZoom / prevZoom;
          const newPanX = centerX - (centerX - touchStateRef.current.initialPanX) * ratio;
          const newPanY = centerY - (centerY - touchStateRef.current.initialPanY) * ratio;

          setZoom(newZoom);
          setPan(clampPan({ x: newPanX, y: newPanY }, newZoom));
        }
      } else if (touches.length === 1 && (zoom > 1.0 || touchStateRef.current.isPanning)) {
        // Handle Single Finger Pan when zoomed in
        const touch = touches[0];
        const dx = touch.clientX - touchStateRef.current.startX;
        const dy = touch.clientY - touchStateRef.current.startY;

        if (Math.hypot(dx, dy) > 8) {
          touchStateRef.current.hasMoved = true;
          isDraggingRef.current = true;
          setIsInteracting(true);
          e.preventDefault(); // Prevent container scroll while panning smoothly

          const nextX = touchStateRef.current.initialPanX + dx;
          const nextY = touchStateRef.current.initialPanY + dy;
          setPan(clampPan({ x: nextX, y: nextY }, zoom));
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (touchStateRef.current.hasMoved) {
        if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
        dragTimeoutRef.current = setTimeout(() => {
          isDraggingRef.current = false;
        }, 120);
      } else {
        isDraggingRef.current = false;
      }

      touchStateRef.current.isPinching = false;
      touchStateRef.current.isPanning = false;
      setIsInteracting(false);

      // Re-clamp on release
      setPan((currentPan) => clampPan(currentPan, zoom));
    };

    // Wheel zoom support (e.g. trackpad pinch or Ctrl+wheel)
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.005;
        setZoom((prevZoom) => {
          const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prevZoom + delta));
          setPan((prevPan) => clampPan(prevPan, nextZoom));
          return nextZoom;
        });
      }
    };

    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: false });
    container.addEventListener('touchcancel', onTouchEnd, { passive: false });
    container.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
      container.removeEventListener('wheel', onWheel);
      if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
    };
  }, [zoom, pan, clampPan]);

  const days = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startDayOfWeek = firstDay.getDay(); 
    const daysInPrevMonth = (startDayOfWeek + 6) % 7; 
    
    const prevMonthLastDay = new Date(year, month, 0);
    
    const todayMYT = getNowMYT();
    const todayYear = todayMYT.getFullYear();
    const todayMonth = todayMYT.getMonth();
    const todayDate = todayMYT.getDate();

    const isDateToday = (d: Date) => {
      return d.getFullYear() === todayYear && d.getMonth() === todayMonth && d.getDate() === todayDate;
    };

    const buildDays = () => {
      const allDays: any[] = [];
      for (let i = daysInPrevMonth - 1; i >= 0; i--) {
        const d = new Date(year, month - 1, prevMonthLastDay.getDate() - i);
        allDays.push({ date: d, isCurrentMonth: false, isToday: isDateToday(d) });
      }
      for (let i = 1; i <= lastDay.getDate(); i++) {
        const d = new Date(year, month, i);
        allDays.push({ date: d, isCurrentMonth: true, isToday: isDateToday(d) });
      }
      const remaining = 42 - allDays.length;
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month + 1, i);
        allDays.push({ date: d, isCurrentMonth: false, isToday: isDateToday(d) });
      }
      return allDays;
    };

    const baseDays = buildDays();
    const resultDays: any[] = [];

    // Process each 7-day week row independently for Per-Week Track Compaction
    for (let w = 0; w < baseDays.length; w += 7) {
      const weekDaysSlice = baseDays.slice(w, w + 7);
      const weekStartDate = weekDaysSlice[0].date;
      const weekEndDate = weekDaysSlice[weekDaysSlice.length - 1].date;

      const weekTrackedBookings = assignTracksForWeek(bookings, weekStartDate, weekEndDate);

      weekDaysSlice.forEach((dayObj) => {
        const dayBookings = weekTrackedBookings.filter((b) => isBookingOnDate(b, dayObj.date));
        const maxTrack = dayBookings.length > 0 ? Math.max(...dayBookings.map((b) => b.track ?? 0)) : -1;
        resultDays.push({
          ...dayObj,
          dayBookings,
          maxTrack,
        });
      });
    }

    return resultDays;
  }, [currentMonth, bookings]);

  // Week order: MON -> SUN
  const weekDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  
  // Track spacing adapts when zoomed for optimal legibility
  const trackSpacing = isMobile ? (zoom > 1.4 ? 19 : 16) : 20; 

  const handleCellClick = (d: Date) => {
    if (isDraggingRef.current) return;
    onDateClick(d);
  };

  const handlePillClick = (b: Booking) => {
    if (isDraggingRef.current) return;
    onBookingClick(b);
  };

  return (
    <div 
      ref={containerRef}
      className="relative flex-1 flex flex-col bg-white select-none overflow-hidden h-full font-sans touch-none"
      style={{ touchAction: zoom > 1.0 ? 'none' : 'pan-y' }}
    >
      {/* Scalable & Pannable Viewport */}
      <div 
        ref={contentRef}
        className="flex flex-col h-full w-full min-w-[340px] will-change-transform"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom})`,
          transformOrigin: '0 0',
          transition: isInteracting ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          width: '100%',
          height: '100%',
        }}
      >
        {/* Header stays aligned with columns */}
        <div className="grid grid-cols-7 bg-white sticky top-0 z-30 shrink-0 border-b border-slate-100 shadow-sm">
          {weekDays.map(day => (
            <div key={day} className="py-2.5 md:py-3 text-center text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 flex-1 auto-rows-min content-start h-full overflow-y-auto bg-white pb-20 md:pb-0">
          {days.map((day: any, idx) => {
            const isLastColumn = (idx % 7) === 6;
            return (
              <div 
                key={idx} 
                onClick={() => handleCellClick(day.date)}
                className={`
                  relative flex flex-col transition-colors cursor-pointer group border-b border-r border-slate-100
                  ${(idx + 1) % 7 === 0 ? 'border-r-0' : ''} 
                  ${day.isCurrentMonth ? 'bg-white' : 'bg-slate-50/30'}
                  hover:bg-slate-50 min-h-[50px] md:min-h-[70px]
                `}
              >
                {/* Day Number */}
                <div className="flex justify-between items-start px-2 pt-1.5 md:pt-2 shrink-0 z-10">
                  <span className={`
                    text-xs md:text-sm font-medium transition-all w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full
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
                    minHeight: day.maxTrack >= 0 
                      ? `${(day.maxTrack + 1) * trackSpacing + 4}px` 
                      : '100%'
                  }}
                >
                  {day.dayBookings.map((booking: Booking) => {
                    const car = cars.find(c => c.id === booking.car_id);
                    const member = members.find(m => m.id === booking.member_id);
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
                        onBookingClick={handlePillClick}
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
