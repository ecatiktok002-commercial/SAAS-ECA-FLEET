import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Car, 
  Zap, 
  Calendar, 
  Copy, 
  Check, 
  ArrowRight, 
  ChevronRight,
  TrendingUp,
  FileText,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

export interface AvailableCarOpportunity {
  carId: string;
  carName: string;
  model: string;
  plate: string;
  dailyRate: number;
  startDateFormatted: string; // e.g. "26 Aug"
  endDateFormatted: string;   // e.g. "31 Aug"
  daysAvailable: number;       // e.g. 5
  potentialRevenue: number;   // e.g. 450
  nextBookingDateStr?: string;
  nextBookingTimeStr?: string;
  nextBookingCustomer?: string;
  isFullyOpen: boolean;
}

export interface GroupedOpportunity {
  model: string;
  count: number;
  dailyRate: number;
  totalPotentialRevenue: number;
  dateRangeSummary: string;
  minDays: number;
  maxDays: number;
  cars: AvailableCarOpportunity[];
}

interface AvailableToSellCardProps {
  availableCars: AvailableCarOpportunity[];
  groupedOpportunities: GroupedOpportunity[];
  totalPotentialRevenue: number;
  currencyFormatter: Intl.NumberFormat;
  isLiveSyncing?: boolean;
  onRefresh?: () => void;
}

export const AvailableToSellCard: React.FC<AvailableToSellCardProps> = ({
  availableCars,
  groupedOpportunities,
  totalPotentialRevenue,
  currencyFormatter,
  isLiveSyncing = false,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grouped' | 'units'>('grouped');
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [copiedCarId, setCopiedCarId] = useState<string | null>(null);

  // Available unique models for quick filter
  const uniqueModels = ['all', ...Array.from(new Set(availableCars.map(c => c.model)))];

  const filteredCars = selectedModel === 'all'
    ? availableCars
    : availableCars.filter(c => c.model.toLowerCase() === selectedModel.toLowerCase());

  const filteredGrouped = selectedModel === 'all'
    ? groupedOpportunities
    : groupedOpportunities.filter(g => g.model.toLowerCase() === selectedModel.toLowerCase());

  const handleCopyWhatsAppQuote = (car: AvailableCarOpportunity, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const quoteText = `🚗 *Available for Rent: ${car.model} (${car.plate})*
📅 *Available Window:* ${car.startDateFormatted} → ${car.endDateFormatted} (${car.daysAvailable} ${car.daysAvailable === 1 ? 'day' : 'days'})
💰 *Rental Rate:* RM${car.dailyRate} / day
💵 *Indicative Total:* ${currencyFormatter.format(car.potentialRevenue)}

✨ Well-maintained, fully inspected & ready for instant delivery.
📲 Reply to this message or WhatsApp us to lock in your booking!`;

    navigator.clipboard.writeText(quoteText);
    setCopiedCarId(car.carId);
    toast.success(`WhatsApp pitch for ${car.model} (${car.plate}) copied!`);
    setTimeout(() => setCopiedCarId(null), 2500);
  };

  const handleCopyGroupWhatsAppQuote = (group: GroupedOpportunity, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const sample = group.cars[0];
    const quoteText = `🚗 *${group.count}x ${group.model} Available Today!*
📅 *Available From:* ${sample ? sample.startDateFormatted : 'Today'} (${group.dateRangeSummary})
💰 *Special Rate:* RM${group.dailyRate} / day
💵 *Indicative Total:* RM${sample ? sample.potentialRevenue : group.dailyRate * 3}

✨ Clean, sanitized & ready for pickup today.
📲 Reply now to secure your reservation!`;

    navigator.clipboard.writeText(quoteText);
    setCopiedCarId(`group-${group.model}`);
    toast.success(`WhatsApp broadcast for ${group.model} copied!`);
    setTimeout(() => setCopiedCarId(null), 2500);
  };

  const handleCreateAgreement = (carId?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (carId) {
      navigate(`/forms?carId=${carId}`);
    } else {
      navigate('/forms');
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Top Header & Overview Banner */}
      <div className="p-5 md:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Title & Badge */}
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 shrink-0">
              <Zap className="w-6 h-6 fill-emerald-400 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  Available to Sell Today
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500 text-slate-950 uppercase tracking-wide">
                  Live Opportunity
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-300 mt-0.5">
                Idle fleet ready for immediate booking — pitch to WhatsApp inquiries and close deals fast
              </p>
            </div>
          </div>

          {/* Key Stat Totals */}
          <div className="flex items-center gap-4 sm:gap-6 bg-slate-800/80 px-4 py-3 rounded-xl border border-slate-700/80 backdrop-blur-xs shrink-0 self-start lg:self-auto">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                Ready Fleet
              </span>
              <div className="text-xl md:text-2xl font-black text-white flex items-baseline gap-1">
                <span>{availableCars.length}</span>
                <span className="text-xs font-medium text-slate-300">
                  {availableCars.length === 1 ? 'vehicle' : 'vehicles'}
                </span>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-700" />
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">
                Potential Revenue
              </span>
              <span className="text-xl md:text-2xl font-black text-emerald-400">
                {currencyFormatter.format(totalPotentialRevenue)}
              </span>
            </div>
          </div>
        </div>

        {/* Action & Filter Bar */}
        <div className="mt-5 pt-4 border-t border-slate-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <div className="inline-flex p-1 bg-slate-800 rounded-lg border border-slate-700">
              <button
                onClick={() => setViewMode('grouped')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  viewMode === 'grouped'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                By Model ({groupedOpportunities.length})
              </button>
              <button
                onClick={() => setViewMode('units')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  viewMode === 'units'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                By Vehicle Unit ({availableCars.length})
              </button>
            </div>

            {/* Quick Model Filter Pills */}
            {uniqueModels.length > 2 && (
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                {uniqueModels.map(m => (
                  <button
                    key={m}
                    onClick={() => setSelectedModel(m)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                      selectedModel === m
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'bg-slate-800/80 text-slate-300 border border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {m === 'all' ? 'All Models' : m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links & Live Calendar Sync Indicator */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700/80 text-[11px] text-slate-300">
              <span className={`w-2 h-2 rounded-full ${isLiveSyncing ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
              <span className="font-semibold text-slate-300">
                {isLiveSyncing ? 'Syncing...' : 'Live Calendar Sync'}
              </span>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={isLiveSyncing}
                  className="ml-1 p-0.5 hover:text-white transition-colors disabled:opacity-50"
                  title="Force refresh availability"
                >
                  <RefreshCw className={`w-3 h-3 ${isLiveSyncing ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
                </button>
              )}
            </div>

            <button 
              onClick={() => navigate('/calendar')}
              className="text-xs font-bold text-emerald-300 hover:text-emerald-200 flex items-center gap-1 transition-colors"
            >
              <span>View Full Calendar</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Cards Grid Area */}
      <div className="p-4 md:p-6 bg-slate-50/50">
        {availableCars.length === 0 ? (
          <div className="p-12 text-center space-y-3 bg-white rounded-xl border border-slate-200">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Car className="w-7 h-7" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">100% Fleet Utilized!</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
              All active vehicles are currently out on live bookings. Check the calendar for upcoming returns.
            </p>
            <button
              onClick={() => navigate('/calendar')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              <span>Open Fleet Calendar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : viewMode === 'grouped' ? (
          // ==========================================
          // GROUPED BY MODEL FULL-SIZE CARDS GRID
          // ==========================================
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredGrouped.map((group) => {
              const sampleCar = group.cars[0];
              const isCopied = copiedCarId === `group-${group.model}`;

              return (
                <div 
                  key={group.model} 
                  className="bg-white rounded-xl border border-slate-200 p-4 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Model & Count Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-black text-slate-900 text-base">
                            {group.model}
                          </h4>
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-black rounded-full border border-blue-200/60">
                            {group.count} {group.count === 1 ? 'unit' : 'units'}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-500">
                          RM{group.dailyRate} / day standard rate
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Potential
                        </span>
                        <span className="text-base font-black text-emerald-600">
                          {currencyFormatter.format(group.totalPotentialRevenue)}
                        </span>
                      </div>
                    </div>

                    {/* Date Window */}
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-2 text-xs text-slate-700 font-semibold">
                      <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{group.dateRangeSummary}</span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        ({sampleCar ? sampleCar.daysAvailable : group.minDays}d window)
                      </span>
                    </div>

                    {/* Plates List Chips */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Available Plates
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {group.cars.map(c => (
                          <span 
                            key={c.carId} 
                            className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-800 rounded border border-slate-200"
                          >
                            {c.plate}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={(e) => handleCopyGroupWhatsAppQuote(group, e)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex-1 justify-center"
                      title="Copy WhatsApp Broadcast Pitch"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'Copied Pitch' : 'WhatsApp Pitch'}</span>
                    </button>

                    <button
                      onClick={(e) => handleCreateAgreement(sampleCar?.carId, e)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
                      title="Create Digital Rental Agreement"
                    >
                      <span>Sell</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // ==========================================
          // INDIVIDUAL VEHICLE UNITS FULL-SIZE CARDS GRID
          // ==========================================
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredCars.map((car) => {
              const isCopied = copiedCarId === car.carId;

              return (
                <div 
                  key={car.carId} 
                  className="bg-white rounded-xl border border-slate-200 p-4 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Vehicle Model & Plate */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-extrabold text-slate-900 text-base">
                            {car.model}
                          </h4>
                          <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-800 rounded border border-slate-200">
                            {car.plate}
                          </span>
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block mt-1">
                          RM{car.dailyRate} / day
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Potential
                        </span>
                        <span className="text-base font-black text-emerald-600">
                          {currencyFormatter.format(car.potentialRevenue)}
                        </span>
                      </div>
                    </div>

                    {/* Date Window */}
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-2 text-xs text-slate-700 font-semibold">
                      <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{car.startDateFormatted} → {car.endDateFormatted}</span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        ({car.daysAvailable} {car.daysAvailable === 1 ? 'day' : 'days'})
                      </span>
                    </div>

                    {/* Next Booking Info */}
                    <p className="text-[11px] text-slate-500">
                      {car.isFullyOpen 
                        ? '✨ Open schedule (No upcoming bookings)'
                        : `Next booking: ${car.nextBookingDateStr} at ${car.nextBookingTimeStr}${car.nextBookingCustomer ? ` (${car.nextBookingCustomer})` : ''}`}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={(e) => handleCopyWhatsAppQuote(car, e)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex-1 justify-center"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'Copied' : 'WhatsApp Pitch'}</span>
                    </button>

                    <button
                      onClick={(e) => handleCreateAgreement(car.carId, e)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
                    >
                      <span>Create Form</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer info note */}
      <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <span>Standard Daily Rates: Axia RM90 • Bezza RM110 • Aruz RM230</span>
        <button 
          onClick={() => handleCreateAgreement()} 
          className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>New Digital Agreement</span>
        </button>
      </div>
    </div>
  );
};
