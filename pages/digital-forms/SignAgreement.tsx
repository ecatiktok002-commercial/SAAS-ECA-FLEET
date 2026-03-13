import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { CheckCircle, Download, AlertCircle, ShieldAlert, Car, Clock, Fuel, AlertTriangle, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { apiService } from '../../services/apiService';

export default function SignAgreement() {
  const { id } = useParams<{ id: string }>();
  const [agreement, setAgreement] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const sigCanvas = useRef<SignatureCanvas>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const agreementData = await apiService.getAgreementById(id);
        
        if (!agreementData) {
          throw new Error('Agreement not found or invalid link.');
        }
        
        setAgreement(agreementData);
        
        if (agreementData.subscriber_id) {
          const companyData = await apiService.getCompanyById(agreementData.subscriber_id);
          setCompany(companyData);
        }

        if (agreementData.status === 'signed') {
          setSuccess(true);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  const handleSubmit = async () => {
    if (!agreed) {
      alert('You must agree to the Terms & Conditions.');
      return;
    }

    if (sigCanvas.current?.isEmpty()) {
      alert('Please provide your signature.');
      return;
    }

    setSubmitting(true);
    try {
      const signatureData = sigCanvas.current?.getCanvas().toDataURL('image/png');
      const now = new Date();
      
      await apiService.updateAgreement(id!, undefined, {
        status: 'signed',
        signed_at: now.toISOString(),
        signature_data: signatureData,
      });

      setAgreement((prev: any) => ({ ...prev, signed_at: now.toISOString(), signature_data: signatureData, status: 'signed' }));
      setSuccess(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-900 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Error</h2>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-10 rounded-2xl shadow-xl border border-slate-200 max-w-md w-full text-center">
          <CheckCircle className="h-20 w-20 text-emerald-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">Agreement Signed!</h2>
          <p className="text-slate-600 mb-8 text-lg">
            Thank you, <span className="font-semibold text-slate-900">{agreement.customer_name}</span>. Your rental agreement has been successfully signed and saved.
          </p>
          {agreement?.signed_at && (
            <p className="text-xs text-slate-400 mb-6 italic">
              Digitally Signed on {new Intl.DateTimeFormat('en-GB', { 
                dateStyle: 'short', 
                timeStyle: 'short', 
                timeZone: 'Asia/Kuala_Lumpur' 
              }).format(new Date(agreement.signed_at)).replace(',', '')}
            </p>
          )}
          <button
            onClick={handlePrint}
            className="w-full inline-flex justify-center items-center py-4 px-6 border border-transparent shadow-lg text-lg font-medium rounded-xl text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-all transform hover:-translate-y-0.5"
          >
            <Printer className="h-6 w-6 mr-2" />
            Print / Save as PDF
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-4 sm:py-12 px-4 sm:px-6 lg:px-8 font-sans text-base leading-relaxed">
      <div className="max-w-3xl mx-auto bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden mb-24">
        
        {/* Print Button for Signed Agreements */}
        {agreement?.signature_data && (
          <div className="bg-emerald-50 border-b border-emerald-200 p-4 flex justify-between items-center print:hidden">
            <div className="flex items-center text-emerald-700">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span className="font-medium">This agreement has been signed.</span>
            </div>
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              <Printer className="h-4 w-4 mr-2" />
              Download PDF
            </button>
          </div>
        )}

        {/* 1. Header (Corporate Identity) */}
        <div className="p-8 sm:p-10 print:p-0 border-b border-slate-200 print:border-b-2 print:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white print:mb-2 print:flex-row print:items-center print:page-break-inside-avoid">
          <div className="flex items-center w-full sm:w-auto mb-6 sm:mb-0 print:mb-0">
            {/* Left: Company Logo Placeholder */}
            <div className="h-20 w-20 print:h-12 print:w-12 bg-slate-100 rounded-lg flex items-center justify-center mr-6 print:mr-3 border border-slate-200 flex-shrink-0">
              {company?.logo_url ? (
                <img src={company.logo_url} alt="Company Logo" className="h-full w-full object-contain p-2 print:p-1" />
              ) : (
                <span className="text-xs text-slate-400 font-medium">LOGO</span>
              )}
            </div>
            
            {/* Center: Company Name & Details */}
            <div>
              <h1 className="text-2xl sm:text-3xl print:text-lg font-bold tracking-tight text-slate-900 mb-1 print:mb-0 uppercase">{company?.name || 'ECA GROUP TRAVEL & TOURS SDN BHD'}</h1>
              <p className="text-slate-500 text-sm print:text-[8pt] font-medium print:leading-tight">
                {company?.address || '011-55582106 | NO 21-B, JALAN SUARASA 8/3, BANDAR TUN HUSSEIN ONN, 43200 CHERAS, SELANGOR'}
              </p>
            </div>
          </div>

          {/* Right: Booking Reference Badge */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 print:p-2 text-right self-start sm:self-center flex-shrink-0 min-w-[180px] print:min-w-0 print:bg-transparent print:border-none">
            <p className="text-xs print:text-[7pt] text-slate-500 uppercase tracking-wider font-bold mb-1 print:mb-0">Booking Reference</p>
            <p className="text-2xl print:text-sm font-mono font-bold text-slate-900 tracking-widest">{agreement.booking_reference || 'PENDING'}</p>
          </div>
        </div>

        <div className="p-8 sm:p-10 print:p-0 space-y-10 print:space-y-2 print:flex-grow print:flex print:flex-col">
          
          {/* 2. Section A & B: Customer and Rental Details (Split Layout) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:gap-2 print:grid-cols-2 print:page-break-inside-avoid">
            
            {/* Maklumat Pelanggan (Left) */}
            <div className="bg-slate-50 p-6 print:p-2 rounded-xl border border-slate-200 print:border-slate-300 print:rounded-none">
              <h2 className="text-lg print:text-[9pt] font-bold text-slate-900 uppercase tracking-wide mb-4 print:mb-1 border-b border-slate-200 print:border-slate-300 pb-2 print:pb-1">Maklumat Pelanggan</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-3 gap-4 print:gap-1">
                <div className="print:col-span-3">
                  <p className="text-xs print:text-[7pt] font-bold text-slate-500 uppercase tracking-wider">Name</p>
                  <p className="text-base print:text-[9pt] font-medium text-slate-900">{agreement.customer_name}</p>
                </div>
                <div>
                  <p className="text-xs print:text-[7pt] font-bold text-slate-500 uppercase tracking-wider">IC / Passport</p>
                  <p className="text-base print:text-[9pt] font-medium text-slate-900">{agreement.identity_number}</p>
                </div>
                <div>
                  <p className="text-xs print:text-[7pt] font-bold text-slate-500 uppercase tracking-wider">Phone</p>
                  <p className="text-base print:text-[9pt] font-medium text-slate-900">{agreement.customer_phone || '-'}</p>
                </div>
                <div className="print:col-span-3">
                  <p className="text-xs print:text-[7pt] font-bold text-slate-500 uppercase tracking-wider">Billing Address</p>
                  <p className="text-base print:text-[9pt] font-medium text-slate-900 print:leading-tight">{agreement.billing_address}</p>
                </div>
                <div>
                  <p className="text-xs print:text-[7pt] font-bold text-slate-500 uppercase tracking-wider">Kenalan Kecemasan</p>
                  <p className="text-base print:text-[9pt] font-medium text-slate-900">{agreement.emergency_contact_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs print:text-[7pt] font-bold text-slate-500 uppercase tracking-wider">Hubungan</p>
                  <p className="text-base print:text-[9pt] font-medium text-slate-900">{agreement.emergency_contact_relation || '-'}</p>
                </div>
                <div>
                  <p className="text-xs print:text-[7pt] font-bold text-slate-500 uppercase tracking-wider">E-invoice</p>
                  <p className="text-base print:text-[9pt] font-medium text-slate-900">{agreement.need_einvoice ? 'Ya' : 'Tidak'}</p>
                </div>
              </div>
            </div>

            {/* Maklumat Kenderaan (Right) */}
            <div className="bg-slate-50 p-6 print:p-2 rounded-xl border border-slate-200 print:border-slate-300 print:rounded-none">
              <h2 className="text-lg print:text-[9pt] font-bold text-slate-900 uppercase tracking-wide mb-4 print:mb-1 border-b border-slate-200 print:border-slate-300 pb-2 print:pb-1">Maklumat Kenderaan</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-4 print:gap-1">
                <div>
                  <p className="text-xs print:text-[7pt] font-bold text-slate-500 uppercase tracking-wider">Car Plate</p>
                  <p className="text-xl print:text-[10pt] font-bold text-slate-900 uppercase tracking-widest">{agreement.car_plate_number}</p>
                </div>
                <div>
                  <p className="text-xs print:text-[7pt] font-bold text-slate-500 uppercase tracking-wider">Model</p>
                  <p className="text-base print:text-[9pt] font-medium text-slate-900">{agreement.car_model || 'Standard Vehicle'}</p>
                </div>
                <div>
                  <p className="text-xs print:text-[7pt] font-bold text-slate-500 uppercase tracking-wider">Pickup Date/Time</p>
                  <p className="text-base print:text-[9pt] font-medium text-slate-900">{format(new Date(agreement.start_date), 'dd MMM yyyy')} {agreement.pickup_time || '-'}</p>
                </div>
                <div>
                  <p className="text-xs print:text-[7pt] font-bold text-slate-500 uppercase tracking-wider">Return Date/Time</p>
                  <p className="text-base print:text-[9pt] font-medium text-slate-900">{format(new Date(agreement.end_date), 'dd MMM yyyy')} {agreement.return_time || '-'}</p>
                </div>
                <div>
                  <p className="text-xs print:text-[7pt] font-bold text-slate-500 uppercase tracking-wider">Duration</p>
                  <p className="text-base print:text-[9pt] font-medium text-slate-900">{agreement.duration_days} Days</p>
                </div>
              </div>
            </div>

          </div>

          {/* Ringkasan Bayaran (Full Width underneath) */}
          <div className="bg-slate-900 print:bg-slate-100 text-white print:text-slate-900 rounded-xl print:rounded-none p-6 print:p-2 shadow-sm print:shadow-none print:border print:border-slate-300 print:page-break-inside-avoid">
            <div className="flex flex-col sm:flex-row justify-between items-center print:flex-row print:items-center space-y-4 sm:space-y-0 print:space-y-0">
              <h2 className="text-sm print:text-[8pt] font-bold text-slate-400 print:text-slate-700 uppercase tracking-widest mb-4 print:mb-0 print:mr-4">Ringkasan Bayaran</h2>
              <div className="flex space-x-8 print:space-x-4 w-full sm:w-auto print:w-auto">
                <div>
                  <p className="text-xs print:text-[7pt] font-medium text-slate-400 print:text-slate-500 uppercase tracking-wider mb-1 print:mb-0">Rental Price</p>
                  <p className="text-xl print:text-[9pt] font-medium">RM {agreement.total_price.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs print:text-[7pt] font-medium text-slate-400 print:text-slate-500 uppercase tracking-wider mb-1 print:mb-0">Deposit</p>
                  <p className="text-xl print:text-[9pt] font-medium">RM {(agreement.deposit || 0).toFixed(2)}</p>
                </div>
              </div>
              <div className="w-full sm:w-auto text-left sm:text-right border-t border-slate-700 print:border-l print:border-t-0 print:border-slate-300 pt-4 sm:pt-0 print:pt-0 print:pl-4">
                <p className="text-xs print:text-[7pt] font-bold text-emerald-400 print:text-slate-700 uppercase tracking-widest mb-1 print:mb-0">Grand Total</p>
                <p className="text-3xl print:text-[10pt] font-bold text-white print:text-slate-900">RM {(agreement.total_price + (agreement.deposit || 0)).toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* 3. Section C: Terma & Syarat (Iconic SaaS Layout) */}
          <section className="print:page-break-inside-avoid">
            <h2 className="text-lg print:text-[9pt] font-bold text-slate-900 uppercase tracking-wide print:mb-1 border-b border-slate-200 print:border-slate-300 pb-2 print:pb-1 mb-6">Terma & Syarat</h2>
            
            <div className="space-y-6">
              {/* Warning Banner */}
              <div className="bg-red-50 border border-red-200 p-6 print:p-1.5 rounded-xl print:rounded-none shadow-sm print:shadow-none print:flex print:items-center">
                <div className="flex items-center mb-3 print:mb-0 print:mr-2">
                  <ShieldAlert className="h-6 w-6 print:h-3 print:w-3 text-red-600 mr-2 print:mr-1" />
                  <h3 className="text-lg print:text-[7pt] font-bold text-red-900 uppercase tracking-wide print:whitespace-nowrap">PEMATUHAN UNDANG-UNDANG & PENYALAHGUNAAN:</h3>
                </div>
                <ul className="space-y-2 print:space-y-0 text-sm print:text-[7pt] text-red-800 font-medium ml-8 print:ml-0 list-disc print:list-none print:flex print:space-x-3">
                  <li>• Aktiviti Haram dilarang keras.</li>
                  <li>• Tiada Liabiliti Syarikat atas salah laku penyewa.</li>
                  <li>• Tanggungjawab Penuh penyewa atas saman/jenayah.</li>
                </ul>
              </div>

              {/* Rules Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-4 gap-6 print:gap-2">
                <div className="bg-white p-6 print:p-1.5 rounded-xl print:rounded-none border border-slate-200 print:border-slate-300 shadow-sm print:shadow-none flex items-start print:block">
                  <div className="bg-slate-100 print:bg-transparent p-3 print:p-0 rounded-lg mr-4 print:mr-0 print:mb-0.5">
                    <Car className="h-6 w-6 print:h-3 print:w-3 text-slate-700 print:inline print:mr-1" />
                    <h4 className="font-bold text-slate-900 mb-2 print:mb-0.5 uppercase text-sm print:text-[7pt] tracking-wider print:inline">Kelayakan & Penggunaan</h4>
                  </div>
                  <div>
                    <ul className="space-y-1 print:space-y-0 text-sm print:text-[6.5pt] text-slate-600 list-disc ml-4 print:ml-3 print:leading-tight">
                      <li>Pemandu sah (Kelas D) sahaja.</li>
                      <li>Lesen P excess wajib RM400.</li>
                      <li>Had Mileage 200KM/hari (Lebihan RM0.50/km).</li>
                      <li>Tiada sub-let / luar Semenanjung.</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-white p-6 print:p-1.5 rounded-xl print:rounded-none border border-slate-200 print:border-slate-300 shadow-sm print:shadow-none flex items-start print:block">
                  <div className="bg-slate-100 print:bg-transparent p-3 print:p-0 rounded-lg mr-4 print:mr-0 print:mb-0.5">
                    <Clock className="h-6 w-6 print:h-3 print:w-3 text-slate-700 print:inline print:mr-1" />
                    <h4 className="font-bold text-slate-900 mb-2 print:mb-0.5 uppercase text-sm print:text-[7pt] tracking-wider print:inline">Masa Sewaan</h4>
                  </div>
                  <div>
                    <ul className="space-y-1 print:space-y-0 text-sm print:text-[6.5pt] text-slate-600 list-disc ml-4 print:ml-3 print:leading-tight">
                      <li>Caj RM10.00/jam.</li>
                      <li>Lebih 8 jam = caj 1 hari.</li>
                      <li>Mesti maklum 5 jam awal untuk lanjutan.</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-white p-6 print:p-1.5 rounded-xl print:rounded-none border border-slate-200 print:border-slate-300 shadow-sm print:shadow-none flex items-start print:block">
                  <div className="bg-slate-100 print:bg-transparent p-3 print:p-0 rounded-lg mr-4 print:mr-0 print:mb-0.5">
                    <Fuel className="h-6 w-6 print:h-3 print:w-3 text-slate-700 print:inline print:mr-1" />
                    <h4 className="font-bold text-slate-900 mb-2 print:mb-0.5 uppercase text-sm print:text-[7pt] tracking-wider print:inline">Bahan Api</h4>
                  </div>
                  <div>
                    <ul className="space-y-1 print:space-y-0 text-sm print:text-[6.5pt] text-slate-600 list-disc ml-4 print:ml-3 print:leading-tight">
                      <li>Minyak mesti sama (Same Level) atau RM10/bar.</li>
                      <li>Wajib bersih (Caj cuci RM20).</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-white p-6 print:p-1.5 rounded-xl print:rounded-none border border-slate-200 print:border-slate-300 shadow-sm print:shadow-none flex items-start print:block">
                  <div className="bg-slate-100 print:bg-transparent p-3 print:p-0 rounded-lg mr-4 print:mr-0 print:mb-0.5">
                    <AlertTriangle className="h-6 w-6 print:h-3 print:w-3 text-slate-700 print:inline print:mr-1" />
                    <h4 className="font-bold text-slate-900 mb-2 print:mb-0.5 uppercase text-sm print:text-[7pt] tracking-wider print:inline">Kemalangan</h4>
                  </div>
                  <div>
                    <ul className="space-y-1 print:space-y-0 text-sm print:text-[6.5pt] text-slate-600 list-disc ml-4 print:ml-3 print:leading-tight">
                      <li>Wajib report polis dalam 24 jam.</li>
                      <li>Penyewa tanggung semua saman.</li>
                      <li>Ganti Rugi Masa Hilang (Loss of Use) dikenakan jika kereta di bengkel.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 4. Section D: Ruangan Tandatangan & Footer */}
          <section className="pt-8 print:pt-2 border-t border-slate-200 print:border-slate-800 print:page-break-inside-avoid">
            {/* Consent Checkbox */}
            <div 
              className={`bg-slate-50 print:bg-transparent border border-slate-300 print:border-none p-6 print:p-0 rounded-xl print:rounded-none flex items-start transition-colors mb-8 print:mb-2 ${!agreement?.signature_data ? 'cursor-pointer hover:bg-slate-100 print:hover:bg-transparent' : ''}`} 
              onClick={() => !agreement?.signature_data && setAgreed(!agreed)}
            >
              <div className="flex items-center h-6 print:h-3 mt-0.5 print:mt-0">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  checked={agreed || !!agreement?.signature_data}
                  disabled={!!agreement?.signature_data}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="focus:ring-slate-900 h-6 w-6 print:h-3 print:w-3 text-slate-900 border-slate-400 rounded cursor-pointer disabled:opacity-50"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="ml-4 print:ml-2">
                <label htmlFor="terms" className="font-bold text-slate-900 text-sm sm:text-base print:text-[7pt] cursor-pointer leading-relaxed print:leading-tight uppercase">
                  DENGAN MENANDATANGANI DI BAWAH, SAYA AKUI SAYA TELAH MEMBACA FAKTA DI ATAS
                </label>
              </div>
            </div>

            {/* Signature Block */}
            <div className={`transition-opacity duration-300 ${!agreed ? 'opacity-50 print:opacity-100 pointer-events-none print:pointer-events-auto' : 'opacity-100'}`}>
              <div className="max-w-md print:max-w-xs">
                <div className="flex justify-between items-center mb-2 print:mb-1">
                  <p className="font-bold text-slate-900 uppercase tracking-wider text-sm print:text-[8pt]">Tandatangan Pelanggan</p>
                  {!agreement?.signature_data && (
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-wider print:hidden"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="border-2 border-slate-300 print:border-slate-400 print:border-dashed rounded-xl print:rounded-none bg-white overflow-hidden shadow-inner print:shadow-none relative h-48 print:h-20">
                  {agreement?.signature_data ? (
                    <img src={agreement.signature_data} alt="Customer Signature" className="w-full h-full object-contain relative z-10" />
                  ) : (
                    <>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 print:opacity-20">
                        <span className="text-3xl print:text-lg font-bold uppercase tracking-widest transform -rotate-12">Sign Here</span>
                      </div>
                      <SignatureCanvas
                        ref={sigCanvas}
                        penColor="#0f172a"
                        canvasProps={{
                          className: 'signature-canvas w-full h-full cursor-crosshair relative z-10',
                        }}
                      />
                    </>
                  )}
                </div>
                {agreement?.signed_at && (
                  <p className="mt-2 text-xs text-slate-500 font-medium italic">
                    Digitally Signed on {new Intl.DateTimeFormat('en-GB', { 
                      dateStyle: 'short', 
                      timeStyle: 'short', 
                      timeZone: 'Asia/Kuala_Lumpur' 
                    }).format(new Date(agreement.signed_at)).replace(',', '')}
                  </p>
                )}
              </div>

              {!agreement?.signature_data && (
                <div className="mt-8 flex justify-start print:hidden">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !agreed}
                    className="w-full sm:w-auto inline-flex justify-center items-center py-4 px-10 border border-transparent shadow-xl text-lg font-bold rounded-xl text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5"
                  >
                    {submitting ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent mr-3"></div>
                    ) : null}
                    {submitting ? 'Submitting...' : 'Confirm & Sign Agreement'}
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Official Footer */}
        <div className="bg-white border-t border-slate-200 print:border-slate-800 p-8 print:p-2 flex justify-between items-end mt-12 print:mt-auto print:page-break-inside-avoid print:mb-0">
          <div className="h-16 w-32 print:h-8 print:w-16 bg-slate-50 print:bg-transparent border border-slate-200 print:border-none rounded-lg print:rounded-none flex items-center justify-center text-xs print:text-[6pt] font-bold text-slate-400 overflow-hidden">
            {company?.ssm_logo_url ? (
              <img src={company.ssm_logo_url} alt="SSM Logo" className="h-full w-full object-contain p-1 print:p-0" />
            ) : (
              "SSM LOGO"
            )}
          </div>
          <div className="h-16 w-32 print:h-8 print:w-16 bg-slate-50 print:bg-transparent border border-slate-200 print:border-none rounded-lg print:rounded-none flex items-center justify-center text-xs print:text-[6pt] font-bold text-slate-400 overflow-hidden">
            {company?.spdp_logo_url ? (
              <img src={company.spdp_logo_url} alt="SPDP Logo" className="h-full w-full object-contain p-1 print:p-0" />
            ) : (
              "SPDP LOGO"
            )}
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      {!agreement?.signature_data && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 z-50">
          <button
            onClick={handleSubmit}
            disabled={submitting || !agreed}
            className="w-full inline-flex justify-center items-center py-3 px-4 border border-transparent shadow-sm text-base font-bold rounded-lg text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Submitting...' : 'Confirm & Sign Agreement'}
          </button>
        </div>
      )}
    </div>
  );
}
