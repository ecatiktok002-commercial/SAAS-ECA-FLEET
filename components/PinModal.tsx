import React, { useState, useEffect, useRef } from 'react';
import { hashPin } from '../utils/crypto';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onPinSet?: (pin: string) => void;
  title?: string;
  isSettingPin?: boolean;
  expectedPinHash?: string;
  staffName: string;
}

// Re-export for backward compatibility
export { hashPin };

const PinModal: React.FC<PinModalProps> = ({ 
  isOpen, onClose, onSuccess, onPinSet, title = 'Enter PIN', isSettingPin = false, expectedPinHash, staffName 
}) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'enter' | 'set' | 'confirm'>('enter');
  
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setConfirmPin('');
      setError('');
      setStep(isSettingPin ? 'set' : 'enter');
    }
  }, [isOpen, isSettingPin]);

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + digit);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleConfirm = async () => {
    if (pin.length !== 4) return;

    if (step === 'enter') {
      if (!expectedPinHash) {
        setError('System Error: No PIN set for this user.');
        return;
      }
      const hashed = await hashPin(pin);
      if (hashed === expectedPinHash) {
        onSuccess();
        onClose();
      } else {
        setError('Incorrect PIN');
        setPin('');
      }
    } else if (step === 'set') {
      setConfirmPin(pin);
      setPin('');
      setStep('confirm');
      setError('');
    } else if (step === 'confirm') {
      if (pin === confirmPin) {
        if (onPinSet) {
          onPinSet(pin);
          onClose();
        } else {
          // Fallback if onPinSet is missing but we are in set mode
          console.error('onPinSet prop missing for PIN setting flow');
          onClose();
        }
      } else {
        setError('PINs do not match. Try again.');
        setStep('set');
        setPin('');
        setConfirmPin('');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xs rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-slate-50 p-6 text-center border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">
            {step === 'set' ? 'Set New PIN' : step === 'confirm' ? 'Confirm PIN' : title}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {step === 'enter' ? `Enter PIN for ${staffName}` : step === 'set' ? 'Create a 4-digit PIN' : 'Re-enter to confirm'}
          </p>
        </div>

        <div className="p-6">
          {/* PIN Display */}
          <div className="flex justify-center gap-4 mb-8">
            {[0, 1, 2, 3].map(i => (
              <div 
                key={i} 
                className={`w-4 h-4 rounded-full transition-all duration-200 ${i < pin.length ? 'bg-slate-900 scale-110' : 'bg-slate-200'}`}
              />
            ))}
          </div>

          {error && (
            <div className="text-center text-rose-500 text-xs font-bold mb-4 animate-pulse">
              {error}
            </div>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                onClick={() => handleDigit(num.toString())}
                className="h-14 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-xl font-bold text-slate-700 transition-colors"
              >
                {num}
              </button>
            ))}
            <div />
            <button
              onClick={() => handleDigit('0')}
              className="h-14 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-xl font-bold text-slate-700 transition-colors"
            >
              0
            </button>
            <button
              onClick={handleDelete}
              className="h-14 rounded-xl bg-slate-50 hover:bg-rose-50 active:bg-rose-100 text-slate-400 hover:text-rose-500 transition-colors flex items-center justify-center"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z"/></svg>
            </button>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleConfirm}
              disabled={pin.length !== 4}
              className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {step === 'set' ? 'Next' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PinModal;
