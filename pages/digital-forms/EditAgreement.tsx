import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Upload, CheckCircle2, Eye, Trash2 } from 'lucide-react';
import { addDays, differenceInDays, parseISO, format, isValid } from 'date-fns';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import { openDataURL } from '../../utils/fileUtils';

export default function EditAgreement() {
  const { id } = useParams();
  const { subscriberId, staffRole, userId, userUid } = useAuth();
  const navigate = useNavigate();
  const isAdmin = staffRole === 'admin';
  const [agreement, setAgreement] = useState<any>(null);
  const [requestAmendmentMode, setRequestAmendmentMode] = useState(false);
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
  });
  const [paymentReceipt, setPaymentReceipt] = useState<File | null>(null);
  const [existingReceipt, setExistingReceipt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [highlightReturnDate, setHighlightReturnDate] = useState(false);
  const [highlightReturnTime, setHighlightReturnTime] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);
  const [receiptRemoved, setReceiptRemoved] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const triggerHighlight = (type: 'date' | 'time') => {
    if (type === 'date') {
      setHighlightReturnDate(true);
      setTimeout(() => setHighlightReturnDate(false), 1000);
    } else {
      setHighlightReturnTime(true);
      setTimeout(() => setHighlightReturnTime(false), 1000);
    }
  };

  const status = agreement?.status?.toLowerCase().trim();
  const isCompleted = status === 'completed' || (status === 'signed' && !!agreement?.payment_receipt);
  const isLocked = isCompleted && !isAdmin && !requestAmendmentMode;

  const renderLabel = (label: string, fieldName: string) => {
    const pendingValue = agreement?.pending_changes?.[fieldName];
    const currentValue = (formData as any)[fieldName];
    if (agreement?.has_pending_changes && pendingValue !== undefined && String(pendingValue) !== String(currentValue)) {
      return (
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-slate-700">{label}</label>
          <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
            Requested: {pendingValue}
          </span>
        </div>
      );
    }
    return <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>;
  };

  const handleICBlur = async () => {
    if (!formData.identity_number || formData.identity_number.length < 5 || !subscriberId) return;
    
    try {
      const member = await apiService.searchMemberByIdentity(formData.identity_number, subscriberId);

      if (member) {
        setFormData(prev => ({
          ...prev,
          customer_name: member.name || prev.customer_name,
          customer_phone: member.phone || prev.customer_phone,
          billing_address: member.billing_address || prev.billing_address,
          emergency_contact_name: member.emergency_contact_name || prev.emergency_contact_name,
          emergency_contact_relation: member.emergency_contact_relation || prev.emergency_contact_relation,
        }));
        setCustomerFound(true);
        setTimeout(() => setCustomerFound(false), 4000);
      }
    } catch (err) {
      console.error('Error fetching customer:', err);
    }
  };

  useEffect(() => {
    const fetchAgreement = async () => {
      if (!id) return;
      try {
        const data = await apiService.getAgreementById(id, subscriberId);
        if (!data) {
          throw new Error('Agreement not found');
        }

        // Access Control: Staff can only edit their own agreements
        if (staffRole === 'staff' && data.created_by !== userUid && data.created_by !== userId && data.agent_id !== userId) {
          throw new Error('You do not have permission to edit this agreement.');
        }

        setAgreement(data);

        setFormData({
          customer_name: data.customer_name || '',
          identity_number: data.identity_number || '',
          customer_phone: data.customer_phone || '',
          billing_address: data.billing_address || '',
          emergency_contact_name: data.emergency_contact_name || '',
          emergency_contact_relation: data.emergency_contact_relation || '',
          car_plate_number: data.car_plate_number || '',
          car_model: data.car_model || '',
          start_date: data.start_date || '',
          end_date: data.end_date || '',
          total_price: data.total_price?.toString() || '',
          deposit: data.deposit?.toString() || '',
          duration_days: data.duration_days?.toString() || '',
          pickup_time: data.pickup_time || '',
          return_time: data.return_time || '',
          need_einvoice: data.need_einvoice || false,
        });
        setExistingReceipt(data.payment_receipt || null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setFetching(false);
      }
    };

    fetchAgreement();
  }, [id, subscriberId, staffRole, userUid]);

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
    if (!subscriberId || !id) return;
    setLoading(true);
    setError('');

    try {
      let receiptData = undefined;
      if (paymentReceipt) {
        const reader = new FileReader();
        receiptData = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(paymentReceipt);
        });
      } else if (receiptRemoved) {
        receiptData = null;
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

      // SURGICAL UPDATE: Only send fields that have actually changed
      const updates: any = {};
      
      // Compare formData with original agreement data
      if (formData.customer_name !== agreement.customer_name) updates.customer_name = formData.customer_name;
      if (formData.identity_number !== agreement.identity_number) updates.identity_number = formData.identity_number;
      if (formData.customer_phone !== agreement.customer_phone) updates.customer_phone = formData.customer_phone;
      if (formData.billing_address !== agreement.billing_address) updates.billing_address = formData.billing_address;
      if (formData.emergency_contact_name !== agreement.emergency_contact_name) updates.emergency_contact_name = formData.emergency_contact_name;
      if (formData.emergency_contact_relation !== agreement.emergency_contact_relation) updates.emergency_contact_relation = formData.emergency_contact_relation;
      if (formData.car_plate_number !== agreement.car_plate_number) updates.car_plate_number = formData.car_plate_number;
      if (formData.car_model !== agreement.car_model) updates.car_model = formData.car_model;
      if (formData.start_date !== agreement.start_date) updates.start_date = formData.start_date;
      if (formData.end_date !== agreement.end_date) updates.end_date = formData.end_date;
      if (formData.pickup_time !== agreement.pickup_time) updates.pickup_time = formData.pickup_time;
      if (formData.return_time !== agreement.return_time) updates.return_time = formData.return_time;
      if (formData.need_einvoice !== agreement.need_einvoice) updates.need_einvoice = formData.need_einvoice;
      
      const totalPrice = parseFloat(formData.total_price);
      if (totalPrice !== agreement.total_price) updates.total_price = totalPrice;
      
      const deposit = formData.deposit ? parseFloat(formData.deposit) : 0;
      if (deposit !== agreement.deposit) updates.deposit = deposit;
      
      const duration = parseInt(formData.duration_days, 10);
      if (duration !== agreement.duration_days) updates.duration_days = duration;

      if (customerId !== agreement.customer_id) updates.customer_id = customerId;

      // Handle receipt update
      if (receiptData !== undefined) {
        updates.payment_receipt = receiptData;
        updates.updated_at = new Date().toISOString();
      }

      // HARD GUARD: If we are not explicitly changing status, don't send it.
      // If we must send a status, ensure it doesn't regress.
      const currentStatus = agreement.status;
      if (updates.status && (currentStatus === 'signed' || currentStatus === 'completed')) {
        if (updates.status === 'pending') {
          delete updates.status;
        }
      }

      if (Object.keys(updates).length === 0) {
        alert('No changes detected.');
        setLoading(false);
        return;
      }

      if (requestAmendmentMode && !isAdmin) {
        await apiService.updateAgreement(id, subscriberId, {
          has_pending_changes: true,
          pending_changes: updates
        });
        alert('Amendment requested successfully!');
      } else {
        await apiService.updateAgreement(id, subscriberId, updates);
        alert('Agreement updated successfully!');
      }

      navigate('/forms');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-900 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center">
            <Link to="/forms" className="text-slate-400 hover:text-slate-900 mr-4 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Edit Agreement</h1>
          </div>
          {isCompleted && !isAdmin && !requestAmendmentMode && (
            <button
              type="button"
              onClick={() => setRequestAmendmentMode(true)}
              className="inline-flex items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors"
            >
              Request Amendment
            </button>
          )}
          {agreement?.has_pending_changes && isAdmin && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm('Approve these changes?')) return;
                  try {
                    setLoading(true);
                    await apiService.updateAgreement(id!, subscriberId!, {
                      ...agreement.pending_changes,
                      has_pending_changes: false,
                      pending_changes: null
                    });
                    alert('Changes approved!');
                    navigate('/forms');
                  } catch (e: any) {
                    alert(e.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
              >
                Approve Changes
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm('Reject these changes?')) return;
                  try {
                    setLoading(true);
                    await apiService.updateAgreement(id!, subscriberId!, {
                      has_pending_changes: false,
                      pending_changes: null
                    });
                    alert('Changes rejected!');
                    navigate('/forms');
                  } catch (e: any) {
                    alert(e.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="inline-flex items-center px-4 py-2 border border-red-200 shadow-sm text-sm font-medium rounded-lg text-red-700 bg-white hover:bg-red-50 transition-colors"
              >
                Reject Request
              </button>
            </div>
          )}
        </div>

        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden mb-24">
          <form id="edit-agreement-form" onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-8">
            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm border border-red-200">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2">
              <div className="sm:col-span-2 flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
                <h3 className="text-sm font-medium text-slate-900">Customer Details</h3>
                {customerFound && (
                  <div className="flex items-center text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-xs font-medium animate-pulse">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    ✨ Repeat Customer Found - Details Loaded
                  </div>
                )}
              </div>

              <div className="sm:col-span-2">
                {renderLabel('Identity Number (IC/Passport)', 'identity_number')}
                <input
                  type="text"
                  name="identity_number"
                  required
                  disabled={isLocked}
                  value={formData.identity_number}
                  onChange={handleChange}
                  onBlur={handleICBlur}
                  className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm disabled:bg-slate-100 disabled:text-slate-500"
                  placeholder="Enter IC to auto-fill details"
                />
              </div>

              <div className="sm:col-span-2">
                {renderLabel('Customer Name', 'customer_name')}
                <input
                  type="text"
                  name="customer_name"
                  required
                  disabled={isLocked}
                  value={formData.customer_name}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div className="sm:col-span-2">
                {renderLabel('Phone Number', 'customer_phone')}
                <input
                  type="tel"
                  name="customer_phone"
                  required
                  disabled={isLocked}
                  value={formData.customer_phone}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div className="sm:col-span-2">
                {renderLabel('Billing Address', 'billing_address')}
                <textarea
                  name="billing_address"
                  rows={3}
                  required
                  disabled={isLocked}
                  value={formData.billing_address}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                {renderLabel('Emergency Contact Number', 'emergency_contact_name')}
                <input
                  type="text"
                  name="emergency_contact_name"
                  required
                  disabled={isLocked}
                  value={formData.emergency_contact_name}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                {renderLabel('Relationship', 'emergency_contact_relation')}
                <input
                  type="text"
                  name="emergency_contact_relation"
                  required
                  disabled={isLocked}
                  value={formData.emergency_contact_relation}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div className="sm:col-span-2 flex items-center mt-2">
                <input
                  id="need_einvoice"
                  name="need_einvoice"
                  type="checkbox"
                  disabled={isLocked}
                  checked={formData.need_einvoice}
                  onChange={handleChange}
                  className="h-4 w-4 text-slate-900 focus:ring-slate-900 border-slate-300 rounded disabled:opacity-50"
                />
                <label htmlFor="need_einvoice" className="ml-2 block text-sm text-slate-900">
                  Adakah Perlu E-invoice: Ya
                </label>
              </div>

              <div className="sm:col-span-2 mt-4">
                <h3 className="text-sm font-medium text-slate-900 border-b border-slate-100 pb-2 mb-4">Rental Details</h3>
              </div>

              <div>
                {renderLabel('Car Plate Number', 'car_plate_number')}
                <input
                  type="text"
                  name="car_plate_number"
                  required
                  disabled={isLocked}
                  value={formData.car_plate_number}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm uppercase disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                {renderLabel('Model Name', 'car_model')}
                <input
                  type="text"
                  name="car_model"
                  required
                  disabled={isLocked}
                  value={formData.car_model}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                {renderLabel('Total Price (RM)', 'total_price')}
                <input
                  type="number"
                  step="0.01"
                  name="total_price"
                  required
                  disabled={isLocked}
                  value={formData.total_price}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                {renderLabel('Deposit (RM)', 'deposit')}
                <input
                  type="number"
                  step="0.01"
                  name="deposit"
                  required
                  disabled={isLocked}
                  value={formData.deposit}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                {renderLabel('Start Date', 'start_date')}
                <input
                  type="date"
                  name="start_date"
                  required
                  disabled={isLocked}
                  value={formData.start_date}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                {renderLabel('End Date', 'end_date')}
                <input
                  type="date"
                  name="end_date"
                  required
                  disabled={isLocked}
                  value={formData.end_date}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-lg shadow-sm sm:text-sm transition-colors duration-300 disabled:bg-slate-100 disabled:text-slate-500 ${
                    highlightReturnDate 
                      ? 'border-emerald-500 ring-2 ring-emerald-500 bg-emerald-50' 
                      : 'border-slate-300 focus:border-slate-900 focus:ring-slate-900'
                  }`}
                />
              </div>

              <div>
                {renderLabel('Duration (Days)', 'duration_days')}
                <input
                  type="number"
                  name="duration_days"
                  required
                  min="1"
                  disabled={isLocked}
                  value={formData.duration_days}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                {renderLabel('Pickup Time', 'pickup_time')}
                <input
                  type="time"
                  name="pickup_time"
                  required
                  disabled={isLocked}
                  value={formData.pickup_time}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                {renderLabel('Return Time', 'return_time')}
                <input
                  type="time"
                  name="return_time"
                  required
                  disabled={isLocked}
                  value={formData.return_time}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-lg shadow-sm sm:text-sm transition-colors duration-300 disabled:bg-slate-100 disabled:text-slate-500 ${
                    highlightReturnTime 
                      ? 'border-emerald-500 ring-2 ring-emerald-500 bg-emerald-50' 
                      : 'border-slate-300 focus:border-slate-900 focus:ring-slate-900'
                  }`}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Receipt</label>
                
                {existingReceipt && !receiptRemoved ? (
                  <div className="mt-1 bg-slate-50 rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-emerald-100 p-2 rounded-lg">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Receipt Attached</p>
                          <p className="text-xs text-slate-500">A payment receipt is already uploaded for this agreement.</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewUrl(existingReceipt);
                            setIsPreviewOpen(true);
                          }}
                          className="inline-flex items-center px-3 py-1.5 border border-slate-200 shadow-sm text-xs font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1.5" />
                          View
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Are you sure you want to remove this receipt?')) {
                                setReceiptRemoved(true);
                                setPaymentReceipt(null);
                              }
                            }}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-lg text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {isAdmin && !isLocked && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <p className="text-xs text-slate-500 mb-2">Or replace with a new file:</p>
                        <input 
                          type="file" 
                          onChange={handleFileChange} 
                          accept="image/*,.pdf"
                          className="text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-slate-400" />
                      <div className="flex text-sm text-slate-600 justify-center">
                        <label
                          htmlFor="file-upload"
                          className={`relative cursor-pointer bg-white rounded-lg font-medium text-slate-900 hover:text-slate-700 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-slate-900 ${isLocked ? 'pointer-events-none opacity-50' : ''}`}
                        >
                          <span>{receiptRemoved ? 'Upload a new file' : 'Upload a file'}</span>
                          <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*,.pdf" disabled={isLocked} />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-slate-500">PNG, JPG, PDF up to 10MB</p>
                      {paymentReceipt && (
                        <p className="text-sm font-medium text-emerald-600 mt-2">{paymentReceipt.name}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 hidden sm:flex justify-end space-x-3">
              <Link
                to="/dashboard"
                className="bg-white py-2 px-4 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading || isLocked}
                className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {requestAmendmentMode ? 'Submit Request' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Sticky Footer */}
      {!isLocked && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 sm:hidden z-50">
          <button
            type="submit"
            form="edit-agreement-form"
            disabled={loading || isLocked}
            className="w-full inline-flex justify-center items-center py-3 px-4 border border-transparent shadow-sm text-base font-medium rounded-lg text-white bg-slate-900 hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : (requestAmendmentMode ? 'Submit Request' : 'Save Changes')}
          </button>
        </div>
      )}

      {/* Preview Modal */}
      {isPreviewOpen && previewUrl && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
              <h3 className="text-lg font-bold text-slate-900">Receipt Preview</h3>
              <button 
                onClick={() => {
                  setIsPreviewOpen(false);
                  setPreviewUrl(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-6 overflow-auto flex-1 bg-slate-50 flex items-center justify-center">
              {previewUrl.startsWith('data:application/pdf') ? (
                <iframe src={previewUrl} className="w-full h-full min-h-[60vh] rounded-lg border border-slate-200" title="PDF Preview" />
              ) : (
                <img src={previewUrl} alt="Receipt Preview" className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm" />
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end">
              <button
                onClick={() => {
                  setIsPreviewOpen(false);
                  setPreviewUrl(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
