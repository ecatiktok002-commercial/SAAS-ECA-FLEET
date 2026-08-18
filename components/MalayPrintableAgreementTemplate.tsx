import React from 'react';
import { format } from 'date-fns';
import { formatInMYT, getNowMYT, formatTimeMYT } from '../utils/dateUtils';

interface MalayPrintableAgreementTemplateProps {
  agreementId?: string;
  customer?: {
    name?: string;
    ic?: string;
    phone?: string;
    address?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    rentalPurpose?: string;
  };
  vehicle?: {
    model?: string;
    plate?: string;
    pickupDate?: string;
    pickupTime?: string;
    returnDate?: string;
    returnTime?: string;
    duration?: number;
  };
  payment?: {
    rentalPrice?: number;
    deposit?: number;
  };
  brandSettings?: {
    logoUrl?: string;
    ssmLogoUrl?: string;
    spdpLogoUrl?: string;
    companyName?: string;
    address?: string;
    contact?: string;
    signatureUrl?: string;
  };
  signatureImg?: string | null;
  beforePhotos?: string[];
  paymentReceipts?: string[];
  icLicensePhotos?: string[];
}

const MalayPrintableAgreementTemplate: React.FC<MalayPrintableAgreementTemplateProps> = ({ 
  agreementId = "", 
  customer = {}, 
  vehicle = {}, 
  payment = {}, 
  brandSettings = {},
  signatureImg = null,
  beforePhotos = [],
  paymentReceipts = [],
  icLicensePhotos = []
}) => {
  
  // Format dates nicely
  const formatDate = (dateString?: string, timeString?: string) => {
    if (!dateString) return "-";
    try {
      const formattedDate = formatInMYT(dateString, 'dd/MM/yyyy');
      if (timeString) {
        return `${formattedDate} ${formatTimeMYT(timeString)}`;
      }
      return formattedDate;
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="absolute top-0 left-0 w-0 h-0 overflow-hidden -z-50 pointer-events-none opacity-0">
        <div id="printable-agreement" className="w-[794px] min-w-[794px] max-w-[794px] bg-white text-black font-sans mx-auto">
          {/* PAGE 1: MAIN AGREEMENT */}
          <div className="p-10 flex flex-col relative">
            {/* --- HEADER: BRAND SETTINGS (LETTERHEAD) --- */}
            <div className="border-b-2 border-black pb-4 mb-6">
              <div className="flex items-center justify-between">
                {brandSettings.logoUrl ? (
                  <div className="w-28 shrink-0 flex items-center justify-start">
                    <img src={brandSettings.logoUrl} alt="Company Logo" className="max-h-16 max-w-full object-contain" crossOrigin="anonymous" />
                  </div>
                ) : null}
                <div className={`text-center flex-1 ${brandSettings.logoUrl || brandSettings.ssmLogoUrl ? 'px-4' : ''}`}>
                  <h1 className="text-2xl font-bold uppercase">{brandSettings.companyName || 'CAR RENTAL'}</h1>
                  {brandSettings.address ? (
                    <p className="text-sm mt-1">{brandSettings.address}</p>
                  ) : null}
                  {brandSettings.contact ? (
                    <p className="text-sm font-bold mt-1">Tel: {brandSettings.contact}</p>
                  ) : null}
                </div>
                {brandSettings.ssmLogoUrl ? (
                  <div className="w-28 shrink-0 flex items-center justify-end">
                    <img src={brandSettings.ssmLogoUrl} alt="SSM" className="max-h-16 max-w-full object-contain" crossOrigin="anonymous" />
                  </div>
                ) : null}
              </div>
              <div className="flex justify-between items-center mt-4 pt-2 border-t border-gray-300">
                <div className="text-left">
                  <h2 className="text-lg font-bold">PERJANJIAN SEWA KENDERAAN</h2>
                </div>
                <div className="text-right">
                  <p className="text-sm">No. Rujukan: <span className="font-bold">{agreementId}</span></p>
                  <p className="text-sm">Tarikh: {formatInMYT(getNowMYT(), 'dd/MM/yyyy')}</p>
                </div>
              </div>
            </div>

            {/* --- SECTION A: MAKLUMAT PELANGGAN --- */}
            <div className="mb-6">
              <h3 className="font-bold bg-gray-200 p-1 border border-black uppercase text-sm mb-2">A. Maklumat Pelanggan</h3>
              <table className="w-full table-fixed border-collapse border border-black text-sm">
                <tbody>
                  <tr>
                    <td className="border border-black p-2 font-semibold w-1/4">Nama Penuh</td>
                    <td className="border border-black p-2 w-3/4" colSpan={3}>{customer.name || '-'}</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2 font-semibold w-1/4">No. K/P / Pasport</td>
                    <td className="border border-black p-2 w-1/4 break-words">{customer.ic || '-'}</td>
                    <td className="border border-black p-2 font-semibold w-1/4">No. Telefon</td>
                    <td className="border border-black p-2 w-1/4 break-words">{customer.phone || '-'}</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2 font-semibold">Alamat Kediaman</td>
                    <td className="border border-black p-2 break-words" colSpan={3}>{customer.address || '-'}</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2 font-semibold">Kenalan Kecemasan</td>
                    <td className="border border-black p-2 break-words">{customer.emergencyContactName || '-'}</td>
                    <td className="border border-black p-2 font-semibold">Hubungan / Tel</td>
                    <td className="border border-black p-2 break-words">{customer.emergencyContactPhone || '-'}</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2 font-semibold">Tujuan Sewa</td>
                    <td className="border border-black p-2 break-words" colSpan={3}>{customer.rentalPurpose || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* --- SECTION B: MAKLUMAT KENDERAAN --- */}
            <div className="mb-6">
              <h3 className="font-bold bg-gray-200 p-1 border border-black uppercase text-sm mb-2">B. Maklumat Kenderaan</h3>
              <table className="w-full table-fixed border-collapse border border-black text-sm">
                <tbody>
                  <tr>
                    <td className="border border-black p-2 font-semibold w-1/4">Model Kenderaan</td>
                    <td className="border border-black p-2 w-1/4 break-words">{vehicle.model || '-'}</td>
                    <td className="border border-black p-2 font-semibold w-1/4">No. Pendaftaran (Plate)</td>
                    <td className="border border-black p-2 w-1/4 font-bold break-words">{vehicle.plate || '-'}</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2 font-semibold">Tarikh & Masa Ambil</td>
                    <td className="border border-black p-2 break-words">{formatDate(vehicle.pickupDate, vehicle.pickupTime)}</td>
                    <td className="border border-black p-2 font-semibold">Tarikh & Masa Pulang</td>
                    <td className="border border-black p-2 break-words">{formatDate(vehicle.returnDate, vehicle.returnTime)}</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2 font-semibold">Tempoh Sewaan</td>
                    <td className="border border-black p-2" colSpan={3}>{vehicle.duration || 0} Hari</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* --- SECTION C: RINGKASAN BAYARAN --- */}
            <div className="mb-6">
              <h3 className="font-bold bg-gray-200 p-1 border border-black uppercase text-sm mb-2">C. Ringkasan Bayaran</h3>
              <table className="w-full table-fixed border-collapse border border-black text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-black p-2 text-left w-3/4">Perkara</th>
                    <th className="border border-black p-2 text-right w-1/4">Jumlah (RM)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-2">Sewa Kenderaan ({vehicle.duration || 0} Hari)</td>
                    <td className="border border-black p-2 text-right">{Number(payment.rentalPrice || 0).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2">Deposit Keselamatan (Security Deposit)</td>
                    <td className="border border-black p-2 text-right">{Number(payment.deposit || 0).toFixed(2)}</td>
                  </tr>
                  <tr className="font-bold">
                    <td className="border border-black p-2 text-right">JUMLAH KESELURUHAN</td>
                    <td className="border border-black p-2 text-right bg-gray-100">{(Number(payment.rentalPrice || 0) + Number(payment.deposit || 0)).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* --- SECTION D: TERMA & SYARAT --- */}
            <div className="mb-6 text-[10px] leading-tight text-justify">
              <h3 className="font-bold bg-gray-200 p-1 border border-black uppercase text-sm mb-2">D. Terma & Syarat (Ringkasan)</h3>
              <div className="border border-black p-2 text-sm text-justify">
                <p className="mb-1"><strong>1. Tujuan Penggunaan:</strong> Kenderaan hanya untuk kegunaan persendirian seperti perjalanan, pelancongan, rekreasi atau lawatan keluarga/rakan. Dilarang digunakan untuk e-hailing, penghantaran, membawa penumpang berbayar, perlumbaan, aktiviti haram, towing, sub-rental atau dipinjamkan kepada pihak ketiga.</p>
                <p className="mb-1"><strong>2. Saman dan Kesalahan Trafik:</strong> Penyewa bertanggungjawab sepenuhnya atas semua saman, kompaun, parkir, tol atau kesalahan yang berlaku sepanjang tempoh sewaan. Tanggungjawab penyewa adalah berdasarkan tarikh dan masa kesalahan dilakukan, bukan tarikh saman diterima, dikesan atau dimaklumkan oleh pihak syarikat. Sekiranya saman hanya muncul selepas tempoh sewaan tamat, penyewa tetap wajib membayar jumlah sebenar yang dikenakan, termasuk sebarang kenaikan kompaun atau penalti.</p>
                <p className="mb-1"><strong>3. Kerosakan dan Kehilangan:</strong> Penyewa bertanggungjawab atas kerosakan, kemalangan, kehilangan atau kecurian sepanjang tempoh sewaan. Kos akan ditolak daripada deposit dan baki, jika ada, wajib dibayar oleh penyewa.</p>
                <p className="mb-1"><strong>4. Lewat Pulang:</strong> Caj lewat akan dikenakan sekiranya kenderaan tidak dipulangkan pada tarikh dan masa yang dipersetujui tanpa kelulusan awal pihak syarikat.</p>
                <p className="mb-1"><strong>5. Kebersihan:</strong> Kenderaan mesti dipulangkan dalam keadaan bersih. Caj pembersihan akan dikenakan bagi kekotoran melampau, kesan muntah, bau rokok, vape, durian atau bau lain yang memerlukan pembersihan khas.</p>
                <p><strong>6. Persetujuan Data Peribadi:</strong> Penyewa bersetuju membenarkan pihak syarikat mengumpul, menyimpan dan memproses maklumat peribadi seperti IC, Lesen Memandu, gambar dan rekod sewaan untuk tujuan pengesahan, pengurusan sewaan, tuntutan, keselamatan dan perlindungan undang-undang.</p>
              </div>
            </div>

            {/* --- SECTION E: PENGESAHAN & TANDATANGAN --- */}
            <div className="mt-4">
              <h3 className="font-bold bg-gray-200 p-1 border border-black uppercase text-sm mb-4">E. Pengesahan & Tandatangan</h3>
              
              <div className="flex items-start gap-2 mb-6">
                <div className="w-4 h-4 border-2 border-black flex items-center justify-center font-bold text-xs mt-0.5">
                  ✓
                </div>
                <p className="text-xs font-semibold">
                  Saya dengan ini mengesahkan bahawa saya telah membaca, memahami, dan bersetuju dengan semua Terma & Syarat yang dinyatakan dalam perjanjian ini. Saya juga mengesahkan bahawa butiran yang diberikan adalah benar.
                </p>
              </div>

              <div className="flex justify-between items-end mt-8 px-8">
                <div className="w-64 text-center">
                  {signatureImg ? (
                    <img src={signatureImg} alt="Customer Signature" className="h-20 mx-auto border-b border-black mb-1 object-contain" crossOrigin="anonymous" />
                  ) : (
                    <div className="h-20 border-b border-black mb-1"></div>
                  )}
                  <p className="font-bold text-sm">{customer.name || 'NAMA PELANGGAN'}</p>
                  <p className="text-xs">Penyewa</p>
                </div>

                <div className="w-64 text-center">
                  {brandSettings.signatureUrl ? (
                    <div className="h-20 border-b border-black mb-1 flex items-end justify-center">
                      <img src={brandSettings.signatureUrl} alt="Wakil Syarikat Signature" className="max-h-20 max-w-full object-contain mb-1" crossOrigin="anonymous" />
                    </div>
                  ) : (
                    <div className="h-20 border-b border-black mb-1"></div>
                  )}
                  <p className="font-bold text-sm uppercase">{brandSettings.companyName || 'WAKIL SYARIKAT'}</p>
                  <p className="text-xs">Wakil Syarikat</p>
                </div>
              </div>
            </div>

            {/* Spacer to ensure footer doesn't overlap content */}
            <div className="mt-auto h-20"></div>
          </div>

          {/* PAGE 2+: APPENDIX (CAR PHOTOS) */}
          {beforePhotos && beforePhotos.length > 0 && (
            <div className="p-10 flex flex-col break-before-page relative">
              <h2 className="text-lg font-bold border-b border-black pb-2 mb-6 uppercase">LAMPIRAN: Keadaan Kenderaan (Sebelum Sewaan)</h2>
              <div className="flex flex-col gap-8">
                {beforePhotos.map((photoUrl, index) => (
                  <div key={index} className="border border-gray-300 p-2 text-center break-inside-avoid">
                    <img src={photoUrl} alt={`Car condition ${index + 1}`} className="w-full h-auto max-h-[800px] object-contain mb-2" crossOrigin="anonymous" />
                    <p className="text-xs font-bold">Gambar {index + 1}</p>
                  </div>
                ))}
              </div>
              {/* Spacer to ensure footer doesn't overlap content */}
              <div className="mt-auto h-20"></div>
            </div>
          )}

          {/* PAGE 3+: PAYMENT RECEIPTS */}
          {paymentReceipts && paymentReceipts.length > 0 && (
            <div className="p-10 flex flex-col break-before-page relative">
              <h2 className="text-lg font-bold border-b border-black pb-2 mb-6 uppercase">LAMPIRAN: Resit Pembayaran</h2>
              <div className="flex flex-col gap-8">
                {paymentReceipts.map((receiptUrl, index) => (
                  <div key={index} className="border border-gray-300 p-2 text-center break-inside-avoid">
                    <img src={receiptUrl} alt={`Payment Receipt ${index + 1}`} className="w-full h-auto max-h-[800px] object-contain mb-2" crossOrigin="anonymous" />
                    <p className="text-xs font-bold">Resit {index + 1}</p>
                  </div>
                ))}
              </div>
              {/* Spacer to ensure footer doesn't overlap content */}
              <div className="mt-auto h-20"></div>
            </div>
          )}

          {/* PAGE 4+: IC & LICENSE PHOTOS */}
          {icLicensePhotos && icLicensePhotos.length > 0 && (
            <div className="p-10 flex flex-col break-before-page relative">
              <h2 className="text-lg font-bold border-b border-black pb-2 mb-6 uppercase">LAMPIRAN: Kad Pengenalan & Lesen Memandu</h2>
              <div className="flex flex-col gap-8">
                {icLicensePhotos.map((photoUrl, index) => (
                  <div key={index} className="border border-gray-300 p-2 text-center break-inside-avoid">
                    <img src={photoUrl} alt={`IC/License Photo ${index + 1}`} className="w-full h-auto max-h-[800px] object-contain mb-2" crossOrigin="anonymous" />
                    <p className="text-xs font-bold">Gambar IC / Lesen {index + 1}</p>
                  </div>
                ))}
              </div>
              {/* Spacer to ensure footer doesn't overlap content */}
              <div className="mt-auto h-20"></div>
            </div>
          )}
        </div>
    </div>
  );
};

export default MalayPrintableAgreementTemplate;
