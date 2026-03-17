import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, Upload, CheckCircle2 } from 'lucide-react';
import { addDays, differenceInDays, parseISO, format, isValid } from 'date-fns';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';

export default function CreateAgreement() {
  const { subscriberId, userId, userName, userUid, staffRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const bookingId = queryParams.get('booking_id');

  const [formData, setFormData] = useState({
    customer_name: '',
    identity_number: '',
    customer_phone: '',
    billing_address: '',
    emergency_contact_name: '',
    emergency_contact_relation: '',
    car_plate_number: '',
    car_model: '',
    start_date: '',
    end_date: '',
    total_price: '',
    deposit: '',
    duration_days: '',
    pickup_time: '',
    return_time: '',
    need_einvoice: false,
    booking_id: bookingId || '',
  });
  const [paymentReceipt, setPaymentReceipt] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [highlightReturnDate, setHighlightReturnDate] = useState(false);
  const [highlightReturnTime, setHighlightReturnTime] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Handle auto-calculation of end_date and return_time
  const updateReturnDate = (startDateStr: string, durationStr: string) => {
    if (startDateStr && durationStr) {
      const startDate = parseISO(startDateStr);
      const duration = parseInt(durationStr, 10);
      if (isValid(startDate) && !isNaN(duration)) {
        const endDate = addDays(startDate, duration);
        const formattedEndDate = format(endDate, 'yyyy-MM-dd');
        if (formData.end_date !== formattedEndDate) {
          setFormData(prev => ({ ...prev, end_date: formattedEndDate }));
          triggerHighlight('date');
        }
      }
    }
  };

  // Pre-fill from booking if bookingId is present
  useEffect(() => {
    const fetchBookingData = async () => {
      if (bookingId && subscriberId) {
        try {
          const booking = await apiService.getBookingById(bookingId, subscriberId);
          if (booking) {
            // Fetch member details
            const member = await apiService.getMembers(subscriberId).then(members => 
              members.find(m => m.id === booking.memberId)
            );

            // Fetch car details
            const car = await apiService.getCars(subscriberId).then(cars => 
              cars.find(c => c.id === booking.carId)
            );

            if (member && car) {
              const d = new Date(booking.start);
              const startDate = format(d, 'yyyy-MM-dd');
              const time = format(d, 'HH:mm');
              const duration = booking.duration;
              const endDate = format(addDays(parseISO(startDate), duration), 'yyyy-MM-dd');

              const modelName = (car.make && car.model) 
                ? `${car.make} ${car.model}`.trim() 
                : car.name;

              setFormData(prev => ({
                ...prev,
                customer_name: member.name,
                identity_number: member.identity_number || '',
                customer_phone: member.phone || '',
                billing_address: member.billing_address || '',
                emergency_contact_name: member.emergency_contact_name || '',
                emergency_contact_relation: member.emergency_contact_relation || '',
                car_plate_number: car.plateNumber || car.plate || '',
                car_model: modelName,
                start_date: startDate,
                end_date: endDate,
                duration_days: duration.toString(),
                total_price: booking.total_price?.toString() || '',
                pickup_time: time,
                return_time: time,
              }));
              
              setCustomerFound(true);
            }
          }
        } catch (err) {
          console.error('Error pre-filling from booking:', err);
        }
      }
    };

    fetchBookingData();
  }, [bookingId, subscriberId]);

  const updateDuration = (startDateStr: string, endDateStr: string) => {
    if (startDateStr && endDateStr) {
      const startDate = parseISO(startDateStr);
      const endDate = parseISO(endDateStr);
      if (isValid(startDate) && isValid(endDate)) {
        const duration = differenceInDays(endDate, startDate);
        if (duration >= 0 && formData.duration_days !== duration.toString()) {
          setFormData(prev => ({ ...prev, duration_days: duration.toString() }));
        }
      }
    }
  };

  const triggerHighlight = (type: 'date' | 'time') => {
    if (type === 'date') {
      setHighlightReturnDate(true);
      setTimeout(() => setHighlightReturnDate(false), 1000);
    } else {
      setHighlightReturnTime(true);
      setTimeout(() => setHighlightReturnTime(false), 1000);
    }
  };

  const handleICBlur = async () => {
    if (!formData.identity_number || formData.identity_number.length < 5 || !subscriberId) return;
    
    try {
      const customer = await apiService.getCustomerByIC(subscriberId, formData.identity_number);

      if (customer) {
        setFormData(prev => ({
          ...prev,
          customer_name: customer.full_name || prev.customer_name,
          customer_phone: customer.phone_number || prev.customer_phone,
          billing_address: customer.billing_address || prev.billing_address,
          emergency_contact_name: customer.emergency_contact_name || prev.emergency_contact_name,
          emergency_contact_relation: customer.emergency_contact_relation || prev.emergency_contact_relation,
        }));
        setCustomerFound(true);
        setTimeout(() => setCustomerFound(false), 5000);
      }
    } catch (err) {
      console.error('Error fetching customer:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let newFormData = { ...formData };

    if (type === 'checkbox') {
      (newFormData as any)[name] = (e.target as HTMLInputElement).checked;
    } else {
      (newFormData as any)[name] = value;
    }

    // Auto-calculation logic
    if (name === 'start_date') {
      if (newFormData.duration_days) {
        const startDate = parseISO(value);
        const duration = parseInt(newFormData.duration_days, 10);
        if (isValid(startDate) && !isNaN(duration)) {
          newFormData.end_date = format(addDays(startDate, duration), 'yyyy-MM-dd');
          triggerHighlight('date');
          // Ensure 24-hour rule: return_time matches pickup_time
          if (newFormData.pickup_time) {
            newFormData.return_time = newFormData.pickup_time;
            triggerHighlight('time');
          }
        }
      } else if (newFormData.end_date) {
        const startDate = parseISO(value);
        const endDate = parseISO(newFormData.end_date);
        if (isValid(startDate) && isValid(endDate)) {
          newFormData.duration_days = Math.max(0, differenceInDays(endDate, startDate)).toString();
        }
      }
    } else if (name === 'duration_days') {
      if (newFormData.start_date && value) {
        const startDate = parseISO(newFormData.start_date);
        const duration = parseInt(value, 10);
        if (isValid(startDate) && !isNaN(duration)) {
          newFormData.end_date = format(addDays(startDate, duration), 'yyyy-MM-dd');
          triggerHighlight('date');
          // Ensure 24-hour rule: return_time matches pickup_time
          if (newFormData.pickup_time) {
            newFormData.return_time = newFormData.pickup_time;
            triggerHighlight('time');
          }
        }
      }
    } else if (name === 'end_date') {
      if (newFormData.start_date && value) {
        const startDate = parseISO(newFormData.start_date);
        const endDate = parseISO(value);
        if (isValid(startDate) && isValid(endDate)) {
          newFormData.duration_days = Math.max(0, differenceInDays(endDate, startDate)).toString();
        }
      }
    } else if (name === 'pickup_time') {
      newFormData.return_time = value;
      triggerHighlight('time');
    }

    setFormData(newFormData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentReceipt(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscriberId) return;
    setLoading(true);
    setError('');

    try {
      let receiptData = '';
      if (paymentReceipt) {
        const reader = new FileReader();
        receiptData = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(paymentReceipt);
        });
      }

      // Get current staff name if available
      const staffName = userName || 'Agent';
      let actualAgentId = staffRole === 'admin' ? subscriberId : userId;

      // Ensure actualAgentId is a valid UUID. If it's a string UID (e.g., 'idmahira'), fetch the real UUID.
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (actualAgentId && actualAgentId !== 'superadmin' && !uuidRegex.test(actualAgentId)) {
        const staffMember = await apiService.getStaffMemberByUid(actualAgentId, subscriberId);
        if (staffMember) {
          actualAgentId = staffMember.id;
        } else {
          throw new Error('Could not resolve staff UUID. Please log out and log in again.');
        }
      }

      // 1. Upsert customer to CRM first
      const customerId = await apiService.upsertCustomer({
        full_name: formData.customer_name,
        phone_number: formData.customer_phone,
        ic_passport: formData.identity_number,
        subscriber_id: subscriberId,
        billing_address: formData.billing_address,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_relation: formData.emergency_contact_relation
      });

      const agreementData: any = {
        subscriber_id: subscriberId,
        customer_id: customerId, // Attach the customer_id
        agent_id: actualAgentId || subscriberId, // Fallback to subscriberId to avoid UUID syntax error
        agent_name: staffName,
        created_by: userUid || userId || '', // Track the actual string UID
        customer_name: formData.customer_name,
        identity_number: formData.identity_number,
        customer_phone: formData.customer_phone,
        billing_address: formData.billing_address,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_relation: formData.emergency_contact_relation,
        car_plate_number: formData.car_plate_number,
        car_model: formData.car_model,
        start_date: formData.start_date,
        end_date: formData.end_date,
        total_price: formData.total_price ? parseFloat(formData.total_price) : 0,
        deposit: formData.deposit ? parseFloat(formData.deposit) : 0,
        duration_days: formData.duration_days ? parseInt(formData.duration_days, 10) : 0,
        pickup_time: formData.pickup_time,
        return_time: formData.return_time,
        need_einvoice: formData.need_einvoice,
        payment_receipt: receiptData,
        status: 'pending',
        booking_id: formData.booking_id || null
      };

      // 2. Auto-Audit Background Check
      if (formData.booking_id) {
        try {
          const booking = await apiService.getBookingById(formData.booking_id, subscriberId);
          if (booking) {
            const bookingStartDate = booking.start.split('T')[0];
            const bookingDuration = booking.duration;
            const bookingEndDate = format(addDays(parseISO(bookingStartDate), bookingDuration), 'yyyy-MM-dd');
            const bookingTotalPrice = booking.total_price || 0;

            const formStartDate = formData.start_date;
            const formEndDate = formData.end_date;
            const formTotalPrice = parseFloat(formData.total_price);

            const isDatesMatched = (bookingStartDate === formStartDate) && (bookingEndDate === formEndDate);
            const isPriceMatched = bookingTotalPrice === formTotalPrice;
            
            let hasDiscrepancy = false;
            let discrepancyReason = '';

            if (!isDatesMatched || !isPriceMatched) {
              hasDiscrepancy = true;
              const reasons = [];
              if (!isDatesMatched) reasons.push('Date mismatch');
              if (!isPriceMatched) reasons.push('Price mismatch');
              discrepancyReason = reasons.join(' & ');
            }

            await apiService.updateBookingAuditStatus(formData.booking_id, subscriberId, {
              is_dates_matched: isDatesMatched,
              has_discrepancy: hasDiscrepancy,
              discrepancy_reason: discrepancyReason
            });
          }
        } catch (auditErr) {
          console.error('Audit check failed:', auditErr);
          // We don't block the agreement creation if audit fails, but we log it
        }
      }

      const newAgreement = await apiService.createAgreement(agreementData, subscriberId);
      
      alert(`Agreement created! ID: ${newAgreement.id}`);
      navigate('/forms');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans py-4 sm:py-10 px-4 sm:px-6 lg:px-8 text-base">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex justify-between text-sm font-medium text-slate-500 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <button type="button" onClick={() => setCurrentStep(1)} className={`flex items-center gap-2 ${currentStep === 1 ? 'text-slate-900' : ''}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${currentStep === 1 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>1</span> Customer
          </button>
          <button type="button" onClick={() => setCurrentStep(2)} className={`flex items-center gap-2 ${currentStep === 2 ? 'text-slate-900' : ''}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${currentStep === 2 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>2</span> Vehicle
          </button>
          <button type="button" onClick={() => setCurrentStep(3)} className={`flex items-center gap-2 ${currentStep === 3 ? 'text-slate-900' : ''}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${currentStep === 3 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>3</span> Payment
          </button>
        </div>
        <div className="mb-8 flex items-center">
          <Link to="/forms" className="text-slate-400 hover:text-slate-900 mr-4 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">New Agreement</h1>
        </div>

        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden mb-24">
          <form id="agreement-form" onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-6">
            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm border border-red-200">
                {error}
              </div>
            )}

            {currentStep === 1 && (
              <>
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg mb-4">
                  <div className="font-medium text-slate-900">Customer Details</div>
                  {customerFound && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 animate-bounce">
                      <CheckCircle2 className="w-3 h-3" />
                      ✨ Repeat Customer Found - Details Loaded
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-y-4 gap-x-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Identity Number (IC/Passport)</label>
                <input
                  type="text"
                  name="identity_number"
                  required
                  value={formData.identity_number}
                  onChange={handleChange}
                  onBlur={handleICBlur}
                  className="h-11 block w-full rounded-lg border-slate-300 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                  placeholder="Enter IC to auto-fill details"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  name="customer_name"
                  required
                  value={formData.customer_name}
                  onChange={handleChange}
                  className="h-11 block w-full rounded-lg border-slate-300 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  name="customer_phone"
                  required
                  value={formData.customer_phone}
                  onChange={handleChange}
                  className="h-11 block w-full rounded-lg border-slate-300 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Billing Address</label>
                <textarea
                  name="billing_address"
                  rows={3}
                  required
                  value={formData.billing_address}
                  onChange={handleChange}
                  className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Contact Number</label>
                <input
                  type="text"
                  name="emergency_contact_name"
                  required
                  value={formData.emergency_contact_name}
                  onChange={handleChange}
                  className="h-11 block w-full rounded-lg border-slate-300 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Relationship</label>
                <input
                  type="text"
                  name="emergency_contact_relation"
                  required
                  value={formData.emergency_contact_relation}
                  onChange={handleChange}
                  className="h-11 block w-full rounded-lg border-slate-300 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                />
              </div>

              <div className="sm:col-span-2 flex items-center mt-2 mb-4">
                <input
                  id="need_einvoice"
                  name="need_einvoice"
                  type="checkbox"
                  checked={formData.need_einvoice}
                  onChange={handleChange}
                  className="h-5 w-5 text-slate-900 focus:ring-slate-900 border-slate-300 rounded"
                />
                <label htmlFor="need_einvoice" className="ml-2 block text-sm text-slate-900">
                  Adakah Perlu E-invoice: Ya
                </label>
              </div>
            </div>
            
            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex justify-center items-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-slate-900 hover:bg-slate-800 transition-colors"
              >
                Next: Vehicle Details
              </button>
            </div>
            </>
            )}

            {currentStep === 2 && (
              <>
            <div className="bg-slate-50 p-3 rounded-lg font-medium text-slate-900 mb-4">Rental Details</div>
            <div className="grid grid-cols-1 gap-y-4 gap-x-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Car Plate Number</label>
                <input
                  type="text"
                  name="car_plate_number"
                  required
                  value={formData.car_plate_number}
                  onChange={handleChange}
                  className="h-11 block w-full rounded-lg border-slate-300 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm uppercase"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Model Name</label>
                <input
                  type="text"
                  name="car_model"
                  required
                  value={formData.car_model}
                  onChange={handleChange}
                  className="h-11 block w-full rounded-lg border-slate-300 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Total Price (RM)</label>
                <input
                  type="number"
                  step="0.01"
                  name="total_price"
                  required
                  value={formData.total_price}
                  onChange={handleChange}
                  className="h-11 block w-full rounded-lg border-slate-300 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deposit (RM)</label>
                <input
                  type="number"
                  step="0.01"
                  name="deposit"
                  required
                  value={formData.deposit}
                  onChange={handleChange}
                  className="h-11 block w-full rounded-lg border-slate-300 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  name="start_date"
                  required
                  value={formData.start_date}
                  onChange={handleChange}
                  className="h-11 block w-full rounded-lg border-slate-300 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                <input
                  type="date"
                  name="end_date"
                  required
                  value={formData.end_date}
                  onChange={handleChange}
                  className={`h-11 block w-full rounded-lg shadow-sm sm:text-sm transition-colors duration-300 ${
                    highlightReturnDate 
                      ? 'border-emerald-500 ring-2 ring-emerald-500 bg-emerald-50' 
                      : 'border-slate-300 focus:border-slate-900 focus:ring-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Duration (Days)</label>
                <input
                  type="number"
                  name="duration_days"
                  required
                  min="1"
                  value={formData.duration_days}
                  onChange={handleChange}
                  className="h-11 block w-full rounded-lg border-slate-300 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pickup Time</label>
                <input
                  type="time"
                  name="pickup_time"
                  required
                  value={formData.pickup_time}
                  onChange={handleChange}
                  className="h-11 block w-full rounded-lg border-slate-300 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Return Time</label>
                <input
                  type="time"
                  name="return_time"
                  required
                  value={formData.return_time}
                  onChange={handleChange}
                  className={`h-11 block w-full rounded-lg shadow-sm sm:text-sm transition-colors duration-300 ${
                    highlightReturnTime 
                      ? 'border-emerald-500 ring-2 ring-emerald-500 bg-emerald-50' 
                      : 'border-slate-300 focus:border-slate-900 focus:ring-slate-900'
                  }`}
                />
              </div>
              </div>
              <div className="pt-6 border-t border-slate-100 flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="inline-flex justify-center items-center py-2 px-6 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="inline-flex justify-center items-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-slate-900 hover:bg-slate-800 transition-colors"
                >
                  Next: Payment
                </button>
              </div>
              </>
            )}

            {currentStep === 3 && (
              <>
              <div className="bg-slate-50 p-3 rounded-lg font-medium text-slate-900 mb-4">Payment & Receipt</div>
              <div className="grid grid-cols-1 gap-y-4 gap-x-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Receipt</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-slate-400" />
                    <div className="flex text-sm text-slate-600 justify-center">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-lg font-medium text-slate-900 hover:text-slate-700 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-slate-900"
                      >
                        <span>Upload a file</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*,.pdf" />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-slate-500">PNG, JPG, PDF up to 10MB</p>
                    {paymentReceipt && (
                      <p className="text-sm font-medium text-emerald-600 mt-2">{paymentReceipt.name}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex justify-center items-center py-2 px-6 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center items-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Create Agreement
              </button>
            </div>
            </>
            )}
          </form>
        </div>
      </div>
      
      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 sm:hidden z-50 flex gap-2">
        {currentStep > 1 && (
          <button
            type="button"
            onClick={() => setCurrentStep(currentStep - 1)}
            className="w-1/3 inline-flex justify-center items-center py-3 px-4 border border-slate-300 shadow-sm text-base font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            Back
          </button>
        )}
        {currentStep < 3 ? (
          <button
            type="button"
            onClick={() => setCurrentStep(currentStep + 1)}
            className="flex-1 inline-flex justify-center items-center py-3 px-4 border border-transparent shadow-sm text-base font-medium rounded-lg text-white bg-slate-900 hover:bg-slate-800 transition-colors"
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            form="agreement-form"
            disabled={loading}
            className="flex-1 inline-flex justify-center items-center py-3 px-4 border border-transparent shadow-sm text-base font-medium rounded-lg text-white bg-slate-900 hover:bg-slate-800 transition-colors"
          >
            {loading ? 'Submitting...' : 'Create Agreement'}
          </button>
        )}
      </div>
    </div>
  );
}
