import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { CheckCircle, Download, AlertCircle, ShieldAlert, Car, Clock, Fuel, AlertTriangle, Printer } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { apiService } from '../../services/apiService';

const safeFormat = (dateStr: string | null | undefined, formatStr: string) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (!isValid(d)) return 'Invalid Date';
  return format(d, formatStr);
};
import html2pdf from 'html2pdf.js';
import MalayPrintableAgreementTemplate from '../../components/MalayPrintableAgreementTemplate';

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

  const handlePrint = async () => {
    if (!agreement || !agreement.customer_name) return;

    // Add a small buffer to allow the DOM to render the hidden template
    setTimeout(async () => {
      const element = document.getElementById('printable-agreement');
      if (!element) {
        alert('Printable agreement content not found');
        return;
      }

      const opt = {
        margin:       [0, 0, 0, 0],
        filename:     `Agreement_${agreement?.customer_name?.replace(/\s+/g, '_') || 'Customer'}.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { 
          scale: 2, 
          useCORS: true, 
          logging: false, 
          letterRendering: true,
          windowWidth: 794,
          width: 794
        },
        jsPDF:        { unit: 'px', format: [794, 1123] as [number, number], orientation: 'portrait' as const },
        pagebreak:    { mode: ['css', 'legacy'] }
      };

      // Helper to convert URL to Base64
      const getBase64FromUrl = async (url: string): Promise<string | null> => {
        if (!url) return null;
        if (url.startsWith('data:')) return url;
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.error('Error fetching image for PDF:', e);
          return null;
        }
      };

      // Pre-load logos
      const logoUrls = [company?.logo_url, company?.ssm_logo_url, company?.spdp_logo_url].filter(Boolean);
      const logoBase64s = await Promise.all(logoUrls.map(url => getBase64FromUrl(url)));
      const validLogos = logoBase64s.filter(Boolean) as string[];

      // Generate PDF with repeated footer
      const worker = (html2pdf() as any).set(opt).from(element).toPdf().get('pdf').then((pdf: any) => {
        const totalPages = pdf.internal.getNumberOfPages();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          
          // 1. Add Footer Line
          pdf.setDrawColor(226, 232, 240); // slate-200
          pdf.setLineWidth(1);
          pdf.line(40, pageHeight - 50, pageWidth - 40, pageHeight - 50);
          
          // 2. Add Logos (Centered)
          if (validLogos.length > 0) {
            const logoWidth = 40;
            const logoHeight = 25;
            const gap = 20;
            const totalLogosWidth = (validLogos.length * logoWidth) + ((validLogos.length - 1) * gap);
            let currentX = (pageWidth - totalLogosWidth) / 2;
            
            validLogos.forEach((logo) => {
              try {
                pdf.addImage(logo, 'PNG', currentX, pageHeight - 45, logoWidth, logoHeight, undefined, 'FAST');
                currentX += logoWidth + gap;
              } catch (e) {
                console.error('Error adding logo to page', i, e);
              }
            });
          }
          
          // 3. Add Page Info
          pdf.setFontSize(8);
          pdf.setTextColor(150, 150, 150);
          pdf.text(`Page ${i} of ${totalPages}`, pageWidth - 80, pageHeight - 20);
          pdf.text("Generated by EcaFleet Digital Era", 40, pageHeight - 20);
          pdf.text(format(new Date(), 'dd/MM/yyyy'), pageWidth / 2 - 20, pageHeight - 20);
        }
      }).save();
    }, 300);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-900 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-4 sm:py-12 px-4 sm:px-6 lg:px-8 font-sans text-base leading-relaxed">
      <div id="agreement-content" className="max-w-4xl mx-auto bg-white shadow-xl min-h-screen flex flex-col print:shadow-none print:max-w-none">
        
        {/* Printable Template (Hidden from screen) */}
        {agreement && (
          <MalayPrintableAgreementTemplate
            agreementId={agreement.reference_number || ""}
            customer={{
              name: agreement.customer_name || agreement.full_name,
              ic: agreement.identity_number || agreement.ic_number,
              phone: agreement.customer_phone || agreement.phone_number,
              address: agreement.billing_address || agreement.customer_address,
              emergencyContactName: agreement.emergency_contact_name,
              emergencyContactPhone: agreement.emergency_contact_relation
            }}
            vehicle={{
              model: agreement.car_model || agreement.vehicle_name,
              plate: agreement.car_plate_number || agreement.registration_no,
              pickupDate: agreement.start_date,
              returnDate: agreement.end_date,
              duration: agreement.duration_days
            }}
            payment={{
              rentalPrice: agreement.total_price,
              deposit: agreement.deposit || agreement.security_deposit
            }}
            brandSettings={{
              logoUrl: company?.logo_url,
              ssmLogoUrl: company?.ssm_logo_url,
              spdpLogoUrl: company?.spdp_logo_url,
              companyName: company?.name,
              address: company?.address,
              contact: company?.contact
            }}
            signatureImg={agreement.signature_data}
            beforePhotos={agreement.photos_url}
          />
        )}

        {/* Action Bar for Signed Agreements */}
        {agreement?.signature_data && (
          <div className="sticky top-0 z-50 bg-white border-b border-slate-200 p-4 flex justify-between items-center shadow-sm print:hidden">
            <div className="flex items-center text-emerald-600">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span className="font-semibold">Agreement Signed Successfully</span>
            </div>
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-6 py-2.5 border border-transparent text-sm font-bold rounded-lg shadow-sm text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-all"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Official PDF
            </button>
          </div>
        )}

        {/* 1. Header (Corporate Identity) */}
        <div className="p-4 sm:p-6 print:p-0 border-b border-slate-200 print:border-b-2 print:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white print:mb-2 print:flex-row print:items-center print:page-break-inside-avoid">
          <div className="flex flex-col w-full sm:w-auto mb-4 sm:mb-0 print:mb-0">
            {/* Company Name & Details */}
            <div className="text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl print:text-lg font-bold tracking-tight text-slate-900 mb-0.5 print:mb-0 uppercase">{company?.name || 'ECA GROUP TRAVEL & TOURS SDN BHD'}</h1>
              <p className="text-slate-500 text-xs print:text-[8pt] font-medium print:leading-tight">
                {company?.address || '011-55582106 | NO 21-B, JALAN SUARASA 8/3, BANDAR TUN HUSSEIN ONN, 43200 CHERAS, SELANGOR'}
              </p>
            </div>
          </div>

          {/* Right: Booking Reference Badge */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 print:p-2 text-right self-start sm:self-center flex-shrink-0 min-w-[150px] print:min-w-0 print:bg-transparent print:border-none">
            <p className="text-[10px] print:text-[7pt] text-slate-500 uppercase tracking-wider font-bold mb-0.5 print:mb-0">Booking Reference</p>
            <p className="text-xl print:text-sm font-mono font-bold text-slate-900 tracking-widest">{agreement.reference_number}</p>
          </div>
        </div>

        <div className="p-3 sm:p-4 print:p-0 space-y-4 print:space-y-2 print:flex-grow print:flex print:flex-col">
          
          {/* 2. Section A & B: Customer and Rental Details (Split Layout) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 print:gap-2 print:grid-cols-2 print:page-break-inside-avoid">
            
            {/* Maklumat Pelanggan (Left) */}
            <div className="bg-slate-50 p-3 print:p-2 rounded-xl border border-slate-200 print:border-slate-300 print:rounded-none">
              <h2 className="text-base print:text-[9pt] font-bold text-slate-900 uppercase tracking-wide mb-2 print:mb-1 border-b border-slate-200 print:border-slate-300 pb-1 print:pb-1">Maklumat Pelanggan</h2>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 print:gap-1">
                <div className="col-span-2">
                  <p className="text-[10px] print:text-[7pt] font-bold text-slate-500 uppercase tracking-wider">Name</p>
                  <p className="text-sm print:text-[9pt] font-medium text-slate-900">{agreement.customer_name}</p>
                </div>
                <div>
                  <p className="text-[10px] print:text-[7pt] font-bold text-slate-500 uppercase tracking-wider">IC / Passport</p>
                  <p className="text-sm print:text-[9pt] font-medium text-slate-900">{agreement.identity_number}</p>
                </div>
                <div>
                  <p className="text-[10px] print:text-[7pt] font-bold text-slate-500 uppercase tracking-wider">Phone</p>
                  <p className="text-sm print:text-[9pt] font-medium text-slate-900">{agreement.customer_phone || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] print:text-[7pt] font-bold text-slate-500 uppercase tracking-wider">Billing Address</p>
                  <p className="text-sm print:text-[9pt] font-medium text-slate-900 print:leading-tight">{agreement.billing_address}</p>
                </div>
                <div>
                  <p className="text-[10px] print:text-[7pt] font-bold text-slate-500 uppercase tracking-wider">Kenalan Kecemasan</p>
                  <p className="text-sm print:text-[9pt] font-medium text-slate-900">{agreement.emergency_contact_name || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] print:text-[7pt] font-bold text-slate-500 uppercase tracking-wider">Hubungan</p>
                  <p className="text-sm print:text-[9pt] font-medium text-slate-900">{agreement.emergency_contact_relation || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] print:text-[7pt] font-bold text-slate-500 uppercase tracking-wider">E-invoice</p>
                  <p className="text-sm print:text-[9pt] font-medium text-slate-900">{agreement.need_einvoice ? 'Ya' : 'Tidak'}</p>
                </div>
              </div>
            </div>

            {/* Maklumat Kenderaan (Right) */}
            <div className="bg-slate-50 p-3 print:p-2 rounded-xl border border-slate-200 print:border-slate-300 print:rounded-none">
              <h2 className="text-base print:text-[9pt] font-bold text-slate-900 uppercase tracking-wide mb-2 print:mb-1 border-b border-slate-200 print:border-slate-300 pb-1 print:pb-1">Maklumat Kenderaan</h2>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 print:gap-1">
                <div>
                  <p className="text-[10px] print:text-[7pt] font-bold text-slate-500 uppercase tracking-wider">Car Plate</p>
                  <p className="text-base print:text-[10pt] font-bold text-slate-900 uppercase tracking-widest">{agreement.car_plate_number}</p>
                </div>
                <div>
                  <p className="text-[10px] print:text-[7pt] font-bold text-slate-500 uppercase tracking-wider">Model</p>
                  <p className="text-sm print:text-[9pt] font-medium text-slate-900">{agreement.car_model || 'Standard Vehicle'}</p>
                </div>
                <div>
                  <p className="text-[10px] print:text-[7pt] font-bold text-slate-500 uppercase tracking-wider">Pickup Date/Time</p>
                  <p className="text-sm print:text-[9pt] font-medium text-slate-900">{safeFormat(agreement.start_date, 'dd/MM/yyyy')} {agreement.pickup_time || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] print:text-[7pt] font-bold text-slate-500 uppercase tracking-wider">Return Date/Time</p>
                  <p className="text-sm print:text-[9pt] font-medium text-slate-900">{safeFormat(agreement.end_date, 'dd/MM/yyyy')} {agreement.return_time || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] print:text-[7pt] font-bold text-slate-500 uppercase tracking-wider">Duration</p>
                  <p className="text-sm print:text-[9pt] font-medium text-slate-900">{agreement.duration_days} Days</p>
                </div>
              </div>
            </div>

          </div>

          {/* Ringkasan Bayaran (Full Width underneath) */}
          <div className="bg-slate-900 print:bg-slate-100 text-white print:text-slate-900 rounded-xl print:rounded-none p-4 print:p-2 shadow-sm print:shadow-none print:border print:border-slate-300 print:page-break-inside-avoid">
            <div className="flex flex-row justify-between items-center space-y-0">
              <h2 className="text-xs print:text-[8pt] font-bold text-slate-400 print:text-slate-700 uppercase tracking-widest mr-4">Ringkasan Bayaran</h2>
              <div className="flex space-x-6 print:space-x-4 w-auto">
                <div>
                  <p className="text-[10px] print:text-[7pt] font-medium text-slate-400 print:text-slate-500 uppercase tracking-wider">Rental Price</p>
                  <p className="text-base print:text-[9pt] font-medium">RM {Number(agreement.total_price || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] print:text-[7pt] font-medium text-slate-400 print:text-slate-500 uppercase tracking-wider">Deposit</p>
                  <p className="text-base print:text-[9pt] font-medium">RM {Number(agreement.deposit || 0).toFixed(2)}</p>
                </div>
              </div>
              <div className="w-auto text-right border-l border-slate-700 print:border-slate-300 pl-4">
                <p className="text-[10px] print:text-[7pt] font-bold text-emerald-400 print:text-slate-700 uppercase tracking-widest">Grand Total</p>
                <p className="text-2xl print:text-[10pt] font-bold text-white print:text-slate-900">RM {(Number(agreement.total_price || 0) + Number(agreement.deposit || 0)).toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* 3. Section C: Terma & Syarat (Iconic SaaS Layout) */}
          <section className="print:page-break-inside-avoid">
            <h2 className="text-base print:text-[9pt] font-bold text-slate-900 uppercase tracking-wide print:mb-1 border-b border-slate-200 print:border-slate-300 pb-1 print:pb-1 mb-3">Terma & Syarat</h2>
            
            <div className="space-y-3">
              {/* Warning Banner */}
              <div className="bg-red-50 border border-red-200 p-3 print:p-1.5 rounded-xl print:rounded-none shadow-sm print:shadow-none print:flex print:items-center">
                <div className="flex items-center mb-1 print:mb-0 print:mr-2">
                  <ShieldAlert className="h-5 w-5 print:h-3 print:w-3 text-red-600 mr-2 print:mr-1" />
                  <h3 className="text-sm print:text-[7pt] font-bold text-red-900 uppercase tracking-wide print:whitespace-nowrap">PEMATUHAN UNDANG-UNDANG & PENYALAHGUNAAN:</h3>
                </div>
                <ul className="space-y-1 print:space-y-0 text-xs print:text-[7pt] text-red-800 font-medium ml-7 print:ml-0 list-disc print:list-none print:flex print:space-x-3">
                  <li>• Aktiviti Haram dilarang keras.</li>
                  <li>• Tiada Liabiliti Syarikat atas salah laku penyewa.</li>
                  <li>• Tanggungjawab Penuh penyewa atas saman/jenayah.</li>
                </ul>
              </div>

              {/* Rules Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-4 gap-3 print:gap-2">
                <div className="bg-white p-3 print:p-1.5 rounded-xl print:rounded-none border border-slate-200 print:border-slate-300 shadow-sm print:shadow-none flex items-start print:block">
                  <div className="bg-slate-100 print:bg-transparent p-2 print:p-0 rounded-lg mr-3 print:mr-0 print:mb-0.5">
                    <Car className="h-5 w-5 print:h-3 print:w-3 text-slate-700 print:inline print:mr-1" />
                    <h4 className="font-bold text-slate-900 mb-1 print:mb-0.5 uppercase text-[10px] print:text-[7pt] tracking-wider print:inline">Kelayakan & Penggunaan</h4>
                  </div>
                  <div>
                    <ul className="space-y-0.5 print:space-y-0 text-[11px] print:text-[6.5pt] text-slate-600 list-disc ml-4 print:ml-3 print:leading-tight">
                      <li>Pemandu sah (Kelas D) sahaja.</li>
                      <li>Lesen P excess wajib RM400.</li>
                      <li>Had Mileage 200KM/hari (Lebihan RM0.50/km).</li>
                      <li>Tiada sub-let / luar Semenanjung.</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-white p-3 print:p-1.5 rounded-xl print:rounded-none border border-slate-200 print:border-slate-300 shadow-sm print:shadow-none flex items-start print:block">
                  <div className="bg-slate-100 print:bg-transparent p-2 print:p-0 rounded-lg mr-3 print:mr-0 print:mb-0.5">
                    <Clock className="h-5 w-5 print:h-3 print:w-3 text-slate-700 print:inline print:mr-1" />
                    <h4 className="font-bold text-slate-900 mb-1 print:mb-0.5 uppercase text-[10px] print:text-[7pt] tracking-wider print:inline">Masa Sewaan</h4>
                  </div>
                  <div>
                    <ul className="space-y-0.5 print:space-y-0 text-[11px] print:text-[6.5pt] text-slate-600 list-disc ml-4 print:ml-3 print:leading-tight">
                      <li>Caj RM10.00/jam.</li>
                      <li>Lebih 8 jam = caj 1 hari.</li>
                      <li>Mesti maklum 5 jam awal untuk lanjutan.</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-white p-3 print:p-1.5 rounded-xl print:rounded-none border border-slate-200 print:border-slate-300 shadow-sm print:shadow-none flex items-start print:block">
                  <div className="bg-slate-100 print:bg-transparent p-2 print:p-0 rounded-lg mr-3 print:mr-0 print:mb-0.5">
                    <Fuel className="h-5 w-5 print:h-3 print:w-3 text-slate-700 print:inline print:mr-1" />
                    <h4 className="font-bold text-slate-900 mb-1 print:mb-0.5 uppercase text-[10px] print:text-[7pt] tracking-wider print:inline">Bahan Api</h4>
                  </div>
                  <div>
                    <ul className="space-y-0.5 print:space-y-0 text-[11px] print:text-[6.5pt] text-slate-600 list-disc ml-4 print:ml-3 print:leading-tight">
                      <li>Minyak mesti sama (Same Level) atau RM10/bar.</li>
                      <li>Wajib bersih (Caj cuci RM20).</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-white p-3 print:p-1.5 rounded-xl print:rounded-none border border-slate-200 print:border-slate-300 shadow-sm print:shadow-none flex items-start print:block">
                  <div className="bg-slate-100 print:bg-transparent p-2 print:p-0 rounded-lg mr-3 print:mr-0 print:mb-0.5">
                    <AlertTriangle className="h-5 w-5 print:h-3 print:w-3 text-slate-700 print:inline print:mr-1" />
                    <h4 className="font-bold text-slate-900 mb-1 print:mb-0.5 uppercase text-[10px] print:text-[7pt] tracking-wider print:inline">Kemalangan</h4>
                  </div>
                  <div>
                    <ul className="space-y-0.5 print:space-y-0 text-[11px] print:text-[6.5pt] text-slate-600 list-disc ml-4 print:ml-3 print:leading-tight">
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
          <section className="pt-4 print:pt-2 border-t border-slate-200 print:border-slate-800 print:page-break-inside-avoid">
            {/* Consent Checkbox */}
            <div 
              className={`bg-slate-50 print:bg-transparent border border-slate-300 print:border-none p-3 print:p-0 rounded-xl print:rounded-none flex items-start transition-colors mb-4 print:mb-2 ${!agreement?.signature_data ? 'cursor-pointer hover:bg-slate-100 print:hover:bg-transparent' : ''}`} 
              onClick={() => !agreement?.signature_data && setAgreed(!agreed)}
            >
              <div className="flex items-center h-5 print:h-3 mt-0.5 print:mt-0">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  checked={agreed || !!agreement?.signature_data}
                  disabled={!!agreement?.signature_data}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="focus:ring-slate-900 h-5 w-5 print:h-3 print:w-3 text-slate-900 border-slate-400 rounded cursor-pointer disabled:opacity-50"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="ml-3 print:ml-2">
                <label htmlFor="terms" className="font-bold text-slate-900 text-xs sm:text-sm print:text-[7pt] cursor-pointer leading-tight uppercase">
                  DENGAN MENANDATANGANI DI BAWAH, SAYA AKUI SAYA TELAH MEMBACA FAKTA DI ATAS
                </label>
              </div>
            </div>

            {/* Signature Block */}
            <div className={`transition-opacity duration-300 ${!agreed ? 'opacity-50 print:opacity-100 pointer-events-none print:pointer-events-auto' : 'opacity-100'}`}>
              <div className="max-w-md print:max-w-xs">
                <div className="flex justify-between items-center mb-1 print:mb-1">
                  <p className="font-bold text-slate-900 uppercase tracking-wider text-[10px] print:text-[8pt]">Tandatangan Pelanggan</p>
                  {!agreement?.signature_data && (
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-wider print:hidden"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="border-2 border-slate-300 print:border-slate-400 print:border-dashed rounded-xl print:rounded-none bg-white overflow-hidden shadow-inner print:shadow-none relative h-32 print:h-20">
                  {agreement?.signature_data ? (
                    <img src={agreement.signature_data} alt="Customer Signature" className="w-full h-full object-contain relative z-10" />
                  ) : (
                    <>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 print:opacity-20">
                        <span className="text-2xl print:text-lg font-bold uppercase tracking-widest transform -rotate-12">Sign Here</span>
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
                {agreement?.signed_at && isValid(new Date(agreement.signed_at)) && (
                  <p className="mt-2 text-xs text-slate-500 font-medium italic">
                    Digitally Signed on {format(new Date(agreement.signed_at), 'dd/MM/yyyy HH:mm')}
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

        {/* Official Footer with Partner Logos (Screen View) */}
        <div className="bg-white border-t border-slate-200 print:hidden p-6 flex justify-center items-center gap-8 mt-8">
          {company?.logo_url && (
            <div className="h-12 flex items-center justify-center bg-transparent border-none shadow-none overflow-hidden">
              <img src={company.logo_url} alt="Company Logo" className="h-full w-auto object-contain" />
            </div>
          )}
          {company?.ssm_logo_url && (
            <div className="h-12 flex items-center justify-center bg-transparent border-none shadow-none overflow-hidden">
              <img src={company.ssm_logo_url} alt="SSM Logo" className="h-full w-auto object-contain" />
            </div>
          )}
          {company?.spdp_logo_url && (
            <div className="h-12 flex items-center justify-center bg-transparent border-none shadow-none overflow-hidden">
              <img src={company.spdp_logo_url} alt="SPDP Logo" className="h-full w-auto object-contain" />
            </div>
          )}
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
