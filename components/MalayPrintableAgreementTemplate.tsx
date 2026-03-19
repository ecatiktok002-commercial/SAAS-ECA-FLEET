import React from 'react';
import { format } from 'date-fns';

interface MalayPrintableAgreementTemplateProps {
  agreementId?: string;
  customer?: {
    name?: string;
    ic?: string;
    phone?: string;
    address?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
  };
  vehicle?: {
    model?: string;
    plate?: string;
    pickupDate?: string;
    returnDate?: string;
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
  };
  signatureImg?: string | null;
  beforePhotos?: string[];
}

const MalayPrintableAgreementTemplate: React.FC<MalayPrintableAgreementTemplateProps> = ({ 
  agreementId = "", 
  customer = {}, 
  vehicle = {}, 
  payment = {}, 
  brandSettings = {},
  signatureImg = null,
  beforePhotos = []
}) => {
  
  // Format dates nicely
  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="absolute top-0 left-0 w-0 h-0 overflow-hidden -z-50 pointer-events-none opacity-0">
        <div id="printable-agreement" className="w-[794px] min-w-[794px] max-w-[794px] bg-white text-black font-sans mx-auto">
          {/* PAGE 1: MAIN AGREEMENT */}
          <div className="p-10 min-h-[1123px] flex flex-col relative">
            {/* --- HEADER: BRAND SETTINGS --- */}
            <div className="border-b-2 border-black pb-4 mb-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold uppercase">{brandSettings.companyName || 'ECA GROUP TRAVEL & TOURS SDN BHD'}</h1>
                <p className="text-sm mt-1">{brandSettings.address || 'NO 21-B, JALAN SUARASA 8/3, BANDAR TUN HUSSEIN ONN, 43200 CHERAS, SELANGOR'}</p>
                <p className="text-sm font-bold mt-1">Tel: {brandSettings.contact || '011-55582106'}</p>
              </div>
              <div className="flex justify-between items-center mt-4">
                <div className="text-left">
                  <h2 className="text-lg font-bold">PERJANJIAN SEWA KENDERAAN</h2>
                </div>
                <div className="text-right">
                  <p className="text-sm">No. Rujukan: <span className="font-bold">{agreementId}</span></p>
                  <p className="text-sm">Tarikh: {format(new Date(), 'dd/MM/yyyy')}</p>
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
                    <td className="border border-black p-2 break-words">{formatDate(vehicle.pickupDate)}</td>
                    <td className="border border-black p-2 font-semibold">Tarikh & Masa Pulang</td>
                    <td className="border border-black p-2 break-words">{formatDate(vehicle.returnDate)}</td>
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
              <div className="border border-black p-2">
                <p className="mb-1">1. <strong>Pematuhan Undang-Undang:</strong> Kenderaan ini tidak boleh digunakan untuk sebarang aktiviti haram atau menyalahi undang-undang Malaysia. Penyewa bertanggungjawab sepenuhnya ke atas sebarang saman, kompaun, atau tindakan undang-undang yang terbit semasa tempoh sewaan.</p>
                <p className="mb-1">2. <strong>Kerosakan & Kemusnahan:</strong> Penyewa bertanggungjawab atas sebarang kerosakan, kemalangan, atau kehilangan kenderaan (kecurian) semasa tempoh sewaan. Kos baik pulih akan ditolak daripada deposit keselamatan, dan baki kos (jika ada) wajib ditanggung oleh penyewa.</p>
                <p className="mb-1">3. <strong>Lewat Pulang:</strong> Denda akan dikenakan jika kenderaan tidak dipulangkan pada tarikh dan masa yang telah dipersetujui tanpa notis awal.</p>
                <p>4. <strong>Kebersihan:</strong> Kenderaan mesti dipulangkan dalam keadaan bersih. Denda pembersihan akan dikenakan jika kenderaan dipulangkan dalam keadaan kotor yang melampau atau berbau (seperti asap rokok/durian).</p>
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
                  <div className="h-20 border-b border-black mb-1"></div>
                  <p className="font-bold text-sm uppercase">{brandSettings.companyName || 'ECA GROUP TRAVEL & TOURS'}</p>
                  <p className="text-xs">Wakil Syarikat</p>
                </div>
              </div>
            </div>

            {/* Spacer to ensure footer doesn't overlap content */}
            <div className="mt-auto h-20"></div>
          </div>

          {/* PAGE 2+: APPENDIX (CAR PHOTOS) */}
          {beforePhotos && beforePhotos.length > 0 && (
            <div className="p-10 min-h-[1123px] flex flex-col mt-4 break-before-page relative">
              <h2 className="text-lg font-bold border-b border-black pb-2 mb-6 uppercase">LAMPIRAN: Keadaan Kenderaan (Sebelum Sewaan)</h2>
              <div className="grid grid-cols-2 gap-4">
                {beforePhotos.map((photoUrl, index) => (
                  <div key={index} className="border border-gray-300 p-2 text-center break-inside-avoid">
                    <img src={photoUrl} alt={`Car condition ${index + 1}`} className="w-full h-48 object-cover mb-2" crossOrigin="anonymous" />
                    <p className="text-xs font-bold">Gambar {index + 1}</p>
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
