import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import HandoverForm from '../components/HandoverForm';
import { CheckCircle, AlertCircle } from 'lucide-react';

const PublicHandoverPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get('type');
  const initialType = (typeParam === 'Pickup' || typeParam === 'Return') ? typeParam : 'Pickup';
  
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) return;
      
      try {
        setLoading(true);
        // Fetch booking details via secure RPC tunnel with one-time use validation
        const { data, error } = await supabase
          .rpc('get_public_handover_details', {
            p_booking_id: bookingId,
            p_type: initialType
          });

        if (error) throw error;
        if (!data) throw new Error('Booking not found');
        
        setBooking(data);
      } catch (err: any) {
        console.error('Error fetching booking:', err);
        setError(err.message || 'Booking not found or link expired.');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId, initialType]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-slate-400">Loading handover details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-red-500/20 p-4 rounded-full">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Link Invalid</h1>
          <p className="text-slate-400">{error || 'This handover link is no longer valid.'}</p>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-emerald-500/20 p-4 rounded-full">
              <CheckCircle className="w-12 h-12 text-emerald-500" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Handover Complete!</h1>
          <p className="text-slate-400 mb-6">
            Thank you for completing the vehicle handover. Your records have been securely submitted.
          </p>
          <p className="text-sm text-slate-500 italic">You can now close this window.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Vehicle Handover</h1>
          <p className="text-slate-400">
            Please complete the form below for vehicle <span className="text-white font-mono">{booking.plate || booking.cars?.plate}</span>
          </p>
        </div>
        
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-slate-700 bg-slate-800/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Booking ID</p>
                <p className="text-sm text-slate-300 font-mono">{bookingId?.slice(0, 8)}...</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Handover Type</p>
                <p className="text-sm text-emerald-400 font-bold">{initialType}</p>
              </div>
            </div>
          </div>
          <div className="p-2">
            <HandoverForm
              bookingId={bookingId!}
              car_id={booking.car_id}
              vehiclePlate={booking.plate || booking.cars?.plate}
              subscriberId={booking.subscriber_id}
              initialType={initialType}
              onClose={() => {}}
              onSuccess={() => setIsCompleted(true)}
            />
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-slate-500 text-xs">
            Powered by FleetTrack Digital Handover System
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicHandoverPage;
