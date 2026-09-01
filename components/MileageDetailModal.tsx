import React, { useState } from 'react';
import { MileageUsageAnalysis } from '../utils/mileageUtils';
import { AlertTriangle, Gauge, ArrowRight, CheckCircle2, Info, X, Check, Camera, ImageOff, Loader2 } from 'lucide-react';

interface MileageDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: MileageUsageAnalysis;
  customerName?: string;
  referenceNumber?: string;
  carPlate?: string;
  durationDays?: number;
  usageType?: string;
  isSubscriber?: boolean;
  onMarkSolved?: () => Promise<void> | void;
}

export const MileageDetailModal: React.FC<MileageDetailModalProps> = ({
  isOpen,
  onClose,
  analysis,
  customerName = 'Customer',
  referenceNumber = '-',
  carPlate = '-',
  durationDays = 1,
  usageType = 'Within KL/Selangor (200km limit/day)',
  isSubscriber = false,
  onMarkSolved
}) => {
  const [isSolving, setIsSolving] = useState(false);

  if (!isOpen) return null;

  const {
    isExceeded,
    isMissingData,
    missingDataReason,
    hasPickupRecord,
    hasReturnRecord,
    hasPickupDashboardPhoto,
    hasReturnDashboardPhoto,
    pickupMileage,
    returnMileage,
    pickupFuelLevel,
    returnFuelLevel,
    actualMileageUsed,
    allowedMileageLimit,
    excessMileage,
    usageDescription,
    formattedLimit,
    isUnlimited
  } = analysis;

  const handleSolve = async () => {
    if (!onMarkSolved) return;
    try {
      setIsSolving(true);
      await onMarkSolved();
      onClose();
    } catch (err) {
      console.error('Failed to mark mileage alert solved:', err);
    } finally {
      setIsSolving(false);
    }
  };

  const renderFuelBars = (levelStr?: string | null) => {
    if (!levelStr) return null;
    let activeBars = 0;
    if (levelStr === 'Full Tank') activeBars = 8;
    else if (levelStr.includes('7 Bar')) activeBars = 7;
    else if (levelStr.includes('6 Bar')) activeBars = 6;
    else if (levelStr.includes('5 Bar')) activeBars = 5;
    else if (levelStr.includes('4 Bar')) activeBars = 4;
    else if (levelStr.includes('3 Bar')) activeBars = 3;
    else if (levelStr.includes('2 Bar')) activeBars = 2;
    else if (levelStr.includes('1 Bar')) activeBars = 1;

    return (
      <div className="flex items-center justify-center gap-0.5 mt-1.5">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((bar) => {
          const isLit = bar <= activeBars;
          return (
            <div
              key={bar}
              className={`h-2.5 w-1.5 rounded-xs transition-all ${
                isLit ? 'bg-emerald-500' : 'bg-slate-200 border border-slate-300'
              }`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-5 text-white flex items-center justify-between ${
          isExceeded 
            ? 'bg-gradient-to-r from-red-600 to-rose-700' 
            : isMissingData 
              ? 'bg-gradient-to-r from-amber-600 to-orange-700' 
              : 'bg-gradient-to-r from-slate-900 to-slate-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isExceeded || isMissingData ? 'bg-white/20' : 'bg-white/10'}`}>
              <AlertTriangle className={`w-6 h-6 ${isExceeded || isMissingData ? 'text-amber-300 animate-pulse' : 'text-slate-300'}`} />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                {isExceeded 
                  ? 'Mileage Usage Exceeded Alert' 
                  : isMissingData 
                    ? 'Mileage & Photo Input Required' 
                    : 'Mileage Usage Audit'}
              </h3>
              <p className="text-xs text-white/80 mt-0.5 font-medium">
                Ref: {referenceNumber} • {customerName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Status Banner */}
          {isExceeded ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-900">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-sm text-red-700">Excess Mileage Detected: +{excessMileage.toLocaleString()} km</p>
                <p className="text-red-600 leading-relaxed">
                  The renter has finished the return time and exceeded the allocated mileage allowance for this rental.
                </p>
              </div>
            </div>
          ) : isMissingData ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-900">
              <Camera className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-sm text-amber-800">Missing Mileage / Dashboard Photo</p>
                <p className="text-amber-700 leading-relaxed font-medium">
                  {missingDataReason || 'Please notify staff to input the Mileage and Dashboard photo.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-sm text-emerald-700">Mileage Within Limit</p>
                <p className="text-emerald-600 leading-relaxed">
                  The total recorded distance driven is within the contracted package usage limit.
                </p>
              </div>
            </div>
          )}

          {/* Odometer Metrics Calculation Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2">
              <span className="flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-slate-600" />
                Handover Odometer Inspection
              </span>
              <span className="font-bold text-slate-700">{carPlate}</span>
            </div>

            <div className="grid grid-cols-3 gap-3 items-center text-center">
              {/* Pickup Odometer & Fuel */}
              <div className={`p-3 rounded-lg border shadow-sm ${
                !hasPickupRecord || pickupMileage == null || !hasPickupDashboardPhoto 
                  ? 'bg-amber-50/70 border-amber-200' 
                  : 'bg-white border-slate-200'
              }`}>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Pickup Odometer</span>
                <span className="text-sm sm:text-base font-extrabold font-mono text-slate-800 block">
                  {pickupMileage != null ? `${pickupMileage.toLocaleString()} km` : 'Not recorded'}
                </span>
                
                {/* Photo indicator badge */}
                <div className="mt-1 flex items-center justify-center gap-1">
                  {hasPickupDashboardPhoto ? (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                      <Camera className="w-2.5 h-2.5" /> Photo OK
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                      <ImageOff className="w-2.5 h-2.5" /> No Photo
                    </span>
                  )}
                </div>

                {pickupFuelLevel && (
                  <div className="mt-1">
                    <span className="inline-block text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      Fuel: {pickupFuelLevel}
                    </span>
                    {renderFuelBars(pickupFuelLevel)}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center justify-center">
                <ArrowRight className="w-5 h-5 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Used</span>
                <span className={`text-xs sm:text-sm font-extrabold font-mono ${
                  isExceeded ? 'text-red-600' : actualMileageUsed != null ? 'text-emerald-600' : 'text-slate-400'
                }`}>
                  {actualMileageUsed != null ? `${actualMileageUsed.toLocaleString()} km` : '-'}
                </span>
              </div>

              {/* Return Odometer & Fuel */}
              <div className={`p-3 rounded-lg border shadow-sm ${
                !hasReturnRecord || returnMileage == null || !hasReturnDashboardPhoto 
                  ? 'bg-amber-50/70 border-amber-200' 
                  : 'bg-white border-slate-200'
              }`}>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Return Odometer</span>
                <span className="text-sm sm:text-base font-extrabold font-mono text-slate-800 block">
                  {returnMileage != null ? `${returnMileage.toLocaleString()} km` : 'Not recorded'}
                </span>
                
                {/* Photo indicator badge */}
                <div className="mt-1 flex items-center justify-center gap-1">
                  {hasReturnDashboardPhoto ? (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                      <Camera className="w-2.5 h-2.5" /> Photo OK
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                      <ImageOff className="w-2.5 h-2.5" /> No Photo
                    </span>
                  )}
                </div>

                {returnFuelLevel && (
                  <div className="mt-1">
                    <span className="inline-block text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      Fuel: {returnFuelLevel}
                    </span>
                    {renderFuelBars(returnFuelLevel)}
                  </div>
                )}
              </div>
            </div>

            {/* Formula breakdown */}
            {actualMileageUsed != null && pickupMileage != null && returnMileage != null && (
              <div className="text-center font-mono text-xs text-slate-600 bg-white/70 py-2 px-3 rounded-lg border border-dashed border-slate-300">
                Formula: {returnMileage.toLocaleString()} - {pickupMileage.toLocaleString()} = <strong className="text-slate-900">{actualMileageUsed.toLocaleString()} km</strong>
              </div>
            )}
          </div>

          {/* Usage Rule Details */}
          <div className="space-y-2.5 text-xs text-slate-700">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Rental Duration:</span>
              <span className="font-semibold text-slate-900">{durationDays} {durationDays === 1 ? 'Day' : 'Days'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Contract Usage Type:</span>
              <span className="font-semibold text-slate-900 max-w-[240px] text-right truncate" title={usageType}>
                {usageType || 'Within KL/Selangor (200km limit/day)'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Allowed Distance Limit:</span>
              <span className="font-bold text-slate-900">{formattedLimit}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Mileage Rule Breakdown:</span>
              <span className="font-mono text-slate-600 text-[11px] text-right max-w-[240px]">
                {usageDescription}
              </span>
            </div>
            {isExceeded && (
              <div className="flex justify-between py-2 bg-red-50 px-3 rounded-lg text-red-700 font-bold border border-red-200">
                <span>Exceeded Amount:</span>
                <span className="font-mono text-sm">+{excessMileage.toLocaleString()} km</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          {/* Solved Button: Only visible to Subscriber ID */}
          {isSubscriber && onMarkSolved && (isExceeded || isMissingData) && (
            <button
              type="button"
              onClick={handleSolve}
              disabled={isSolving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-sm disabled:opacity-50"
            >
              {isSolving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Solved</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold rounded-xl text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
