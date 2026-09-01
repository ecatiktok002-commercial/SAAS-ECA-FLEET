import React, { useState, useEffect } from 'react';
import { X, MapPin, Navigation, Check, AlertCircle, Info, Calendar } from 'lucide-react';

interface CustomUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (usageString: string, outstationDays: number, klSelangorDays: number) => void;
  initialUsage?: string;
  totalDurationDays?: number | string;
}

export const parseCustomUsage = (usageStr?: string, defaultTotalDays: number = 0) => {
  if (!usageStr) {
    return { outstationDays: 0, klSelangorDays: Math.max(0, defaultTotalDays), totalDays: Math.max(0, defaultTotalDays) };
  }

  let outstationDays = 0;
  let klSelangorDays = 0;

  const outstationMatch = usageStr.match(/(\d+)\s*Days?\s*Outstation/i);
  if (outstationMatch && outstationMatch[1]) {
    outstationDays = parseInt(outstationMatch[1], 10) || 0;
  }

  const klMatch = usageStr.match(/(\d+)\s*Days?\s*(?:Within\s*)?KL/i);
  if (klMatch && klMatch[1]) {
    klSelangorDays = parseInt(klMatch[1], 10) || 0;
  }

  // If no match found but total days exists
  if (!outstationMatch && !klMatch) {
    klSelangorDays = Math.max(0, defaultTotalDays);
  }

  const totalDays = outstationDays + klSelangorDays;
  return { outstationDays, klSelangorDays, totalDays };
};

export const formatCustomUsageString = (outstation: number, klSelangor: number): string => {
  const outstationPart = `${outstation} ${outstation === 1 ? 'Day' : 'Days'} Outstation`;
  const klPart = `${klSelangor} ${klSelangor === 1 ? 'Day' : 'Days'} Within KL/Selangor`;
  return `Customize: ${outstationPart}, ${klPart}`;
};

export const CustomUsageModal: React.FC<CustomUsageModalProps> = ({
  isOpen,
  onClose,
  onApply,
  initialUsage = '',
  totalDurationDays
}) => {
  const numericTotalDays = typeof totalDurationDays === 'string' ? parseInt(totalDurationDays, 10) || 0 : (totalDurationDays || 0);

  const [outstationDays, setOutstationDays] = useState<number>(0);
  const [klSelangorDays, setKlSelangorDays] = useState<number>(0);
  const [validationError, setValidationError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const parsed = parseCustomUsage(initialUsage, numericTotalDays);
      setOutstationDays(parsed.outstationDays);
      setKlSelangorDays(parsed.klSelangorDays);
      setValidationError('');
    }
  }, [isOpen, initialUsage, numericTotalDays]);

  if (!isOpen) return null;

  const totalSelectedDays = (Number(outstationDays) || 0) + (Number(klSelangorDays) || 0);
  const isOneDayDuration = numericTotalDays === 1;
  const isExceedingOneDay = isOneDayDuration && totalSelectedDays > 1;
  const isZeroSelected = totalSelectedDays === 0;
  const isApplyDisabled = isExceedingOneDay || isZeroSelected;

  const handleApply = () => {
    setValidationError('');
    if (isOneDayDuration && totalSelectedDays > 1) {
      setValidationError('The rental duration is only 1 Day. Custom usage cannot exceed 1 Day in total.');
      return;
    }
    if (totalSelectedDays === 0) {
      setValidationError('Please allocate at least 1 day for either Outstation or Within KL/Selangor.');
      return;
    }

    const safeOutstation = Math.max(0, Number(outstationDays) || 0);
    const safeKl = Math.max(0, Number(klSelangorDays) || 0);
    const formatted = formatCustomUsageString(safeOutstation, safeKl);
    onApply(formatted, safeOutstation, safeKl);
    onClose();
  };

  const setAllOutstation = () => {
    if (numericTotalDays > 0) {
      setOutstationDays(numericTotalDays);
      setKlSelangorDays(0);
      setValidationError('');
    }
  };

  const setAllKlSelangor = () => {
    if (numericTotalDays > 0) {
      setOutstationDays(0);
      setKlSelangorDays(numericTotalDays);
      setValidationError('');
    }
  };

  const setSplitEvenly = () => {
    if (numericTotalDays > 0) {
      const half = Math.floor(numericTotalDays / 2);
      setOutstationDays(half);
      setKlSelangorDays(numericTotalDays - half);
      setValidationError('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                Customize Usage Breakdown
              </h2>
              <p className="text-xs text-slate-400">
                Set custom days for Outstation & KL/Selangor
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            type="button"
            className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 text-slate-800">
          {/* Duration info and Quick presets */}
          {numericTotalDays > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="flex items-center gap-1.5 font-medium">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  Total Rental Duration:
                </span>
                <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 text-sm">
                  {numericTotalDays} {numericTotalDays === 1 ? 'Day' : 'Days'}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500">Quick Fill:</span>
                <button
                  type="button"
                  onClick={setAllKlSelangor}
                  className="text-[11px] px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 font-medium rounded border border-slate-200 transition-colors"
                >
                  {isOneDayDuration ? '1 Day KL/Selangor' : 'All KL/Selangor'}
                </button>
                <button
                  type="button"
                  onClick={setAllOutstation}
                  className="text-[11px] px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 font-medium rounded border border-slate-200 transition-colors"
                >
                  {isOneDayDuration ? '1 Day Outstation' : 'All Outstation'}
                </button>
                {numericTotalDays > 1 && (
                  <button
                    type="button"
                    onClick={setSplitEvenly}
                    className="text-[11px] px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 font-medium rounded border border-slate-200 transition-colors"
                  >
                    Split Half
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Validation Error Alert */}
          {(validationError || isExceedingOneDay) && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl flex items-start gap-2.5 text-xs font-medium animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                {isExceedingOneDay
                  ? `Rental duration is only 1 Day. Total custom usage cannot exceed 1 Day (currently selected: ${totalSelectedDays} Days). Please adjust to either 1 Day Outstation or 1 Day KL/Selangor.`
                  : validationError}
              </div>
            </div>
          )}

          {/* Inputs Section */}
          <div className="space-y-4">
            {/* Outstation Days Input */}
            <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-4 transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <label className="text-sm font-bold text-slate-900">
                    Days for Outstation
                  </label>
                </div>
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full">
                  500km limit / day
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setOutstationDays(prev => Math.max(0, prev - 1));
                    setValidationError('');
                  }}
                  className="w-10 h-10 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold text-lg hover:bg-slate-100 flex items-center justify-center transition-colors shadow-sm"
                >
                  -
                </button>
                <input
                  type="number"
                  min="0"
                  max={isOneDayDuration ? 1 : undefined}
                  value={outstationDays}
                  onChange={(e) => {
                    setOutstationDays(Math.max(0, parseInt(e.target.value, 10) || 0));
                    setValidationError('');
                  }}
                  className="flex-1 h-10 text-center font-bold text-lg rounded-lg border-slate-300 focus:border-slate-900 focus:ring-slate-900 bg-white shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    setOutstationDays(prev => {
                      if (isOneDayDuration) {
                        // If duration is 1 day and user increases outstation, automatically reset KL to 0
                        setKlSelangorDays(0);
                        return 1;
                      }
                      return prev + 1;
                    });
                    setValidationError('');
                  }}
                  className="w-10 h-10 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold text-lg hover:bg-slate-100 flex items-center justify-center transition-colors shadow-sm"
                >
                  +
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Travel outside of Kuala Lumpur & Selangor region.
              </p>
            </div>

            {/* Within KL/Selangor Days Input */}
            <div className="bg-blue-50/50 border border-blue-200/80 rounded-xl p-4 transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <label className="text-sm font-bold text-slate-900">
                    Days for Within KL / Selangor
                  </label>
                </div>
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full">
                  200km limit / day
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setKlSelangorDays(prev => Math.max(0, prev - 1));
                    setValidationError('');
                  }}
                  className="w-10 h-10 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold text-lg hover:bg-slate-100 flex items-center justify-center transition-colors shadow-sm"
                >
                  -
                </button>
                <input
                  type="number"
                  min="0"
                  max={isOneDayDuration ? 1 : undefined}
                  value={klSelangorDays}
                  onChange={(e) => {
                    setKlSelangorDays(Math.max(0, parseInt(e.target.value, 10) || 0));
                    setValidationError('');
                  }}
                  className="flex-1 h-10 text-center font-bold text-lg rounded-lg border-slate-300 focus:border-slate-900 focus:ring-slate-900 bg-white shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    setKlSelangorDays(prev => {
                      if (isOneDayDuration) {
                        // If duration is 1 day and user increases KL, automatically reset Outstation to 0
                        setOutstationDays(0);
                        return 1;
                      }
                      return prev + 1;
                    });
                    setValidationError('');
                  }}
                  className="w-10 h-10 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold text-lg hover:bg-slate-100 flex items-center justify-center transition-colors shadow-sm"
                >
                  +
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Local usage within Klang Valley / Selangor region only.
              </p>
            </div>
          </div>

          {/* Result & Validation Preview */}
          <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="uppercase font-semibold tracking-wider">Usage Result Summary</span>
              <span>Total: <strong className={`text-sm ${isExceedingOneDay ? 'text-red-400' : 'text-white'}`}>{totalSelectedDays}</strong> Days</span>
            </div>
            <div className={`text-sm font-mono font-medium p-2.5 rounded-lg border ${isExceedingOneDay ? 'text-red-300 bg-red-950/40 border-red-700' : 'text-emerald-400 bg-slate-800 border-slate-700'}`}>
              {formatCustomUsageString(outstationDays, klSelangorDays)}
            </div>
            {numericTotalDays > 0 && totalSelectedDays !== numericTotalDays && !isExceedingOneDay && (
              <div className="flex items-center gap-1.5 text-xs text-amber-300 pt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Note: Selected total ({totalSelectedDays} days) differs from rental duration ({numericTotalDays} days).</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-slate-300 text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={isApplyDisabled}
            className={`inline-flex items-center gap-2 px-5 py-2.5 border border-transparent text-sm font-semibold rounded-lg transition-colors shadow-sm ${
              isApplyDisabled
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'text-white bg-slate-900 hover:bg-slate-800'
            }`}
          >
            <Check className="w-4 h-4" />
            Apply Usage
          </button>
        </div>
      </div>
    </div>
  );
};
