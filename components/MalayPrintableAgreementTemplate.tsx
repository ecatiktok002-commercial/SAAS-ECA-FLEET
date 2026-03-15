import React from 'react';

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
    companyName?: string;
    address?: string;
    contact?: string;
  };
  signatureImg?: string | null;
  beforePhotos?: string[];
}

const MalayPrintableAgreementTemplate: React.FC<MalayPrintableAgreementTemplateProps> = ({ 
  agreementId = "PENDING", 
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
      const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
      return new Date(dateString).toLocaleDateString('en-MY', options);
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="absolute left-[-9999px] top-0">
      <div 
        id="printable-agreement" 
        className="w-[794px] min-h-[1123px] bg-white text-black p-10 font-sans mx-auto"
      >
        {/* --- HEADER: BRAND SETTINGS --- */}
        <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-6">
          <div className="flex items-center gap-4">
            {brandSettings.logoUrl ? (
              <img src={brandSettings.logoUrl} alt="Company Logo" className="h-16 object-contain" crossOrigin="anonymous" />
            ) : (
              <div className="h-16 w-16 bg-slate-200 flex items-center justify-center font-bold text-xs text-center border border-black">LOGO</div>
            )}
            <div>
              <h1 className="text-xl font-bold uppercase">{brandSettings.companyName || 'ECA GROUP TRAVEL & TOURS SDN BHD'}</h1>
              <p className="text-xs max-w-sm">{brandSettings.address || 'NO 21-B, JALAN SUARASA 8/3, BANDAR TUN HUSSEIN ONN, 43200 CHERAS, SELANGOR'}</p>
              <p className="text-xs font-bold mt-1">Tel: {brandSettings.contact || '011-55582106'}</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold">PERJANJIAN SEWA KENDERAAN</h2>
            <p className="text-sm">No. Rujukan: <span className="font-bold">{agreementId}</span></p>
            <p className="text-sm">Tarikh: {new Date().toLocaleDateString('en-MY')}</p>
          </div>
        </div>

        {/* --- SECTION A: MAKLUMAT PELANGGAN --- */}
        <div className="mb-6">
          <h3 className="font-bold bg-gray-200 p-1 border border-black uppercase text-sm mb-2">A. Maklumat Pelanggan</h3>
          <table className="w-full border-collapse border border-black text-sm">
            <tbody>
              <tr>
                <td className="border border-black p-2 font-semibold w-1/4">Nama Penuh</td>
                <td className="border border-black p-2 w-3/4" colSpan={3}>{customer.name || '-'}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-semibold w-1/4">No. K/P / Pasport</td>
                <td className="border border-black p-2 w-1/4">{customer.ic || '-'}</td>
                <td className="border border-black p-2 font-semibold w-1/4">No. Telefon</td>
                <td className="border border-black p-2 w-1/4">{customer.phone || '-'}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-semibold">Alamat Kediaman</td>
                <td className="border border-black p-2" colSpan={3}>{customer.address || '-'}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-semibold">Kenalan Kecemasan</td>
                <td className="border border-black p-2">{customer.emergencyContactName || '-'}</td>
                <td className="border border-black p-2 font-semibold">Hubungan / Tel</td>
                <td className="border border-black p-2">{customer.emergencyContactPhone || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* --- SECTION B: MAKLUMAT KENDERAAN --- */}
        <div className="mb-6">
          <h3 className="font-bold bg-gray-200 p-1 border border-black uppercase text-sm mb-2">B. Maklumat Kenderaan</h3>
          <table className="w-full border-collapse border border-black text-sm">
            <tbody>
              <tr>
                <td className="border border-black p-2 font-semibold w-1/4">Model Kenderaan</td>
                <td className="border border-black p-2 w-1/4">{vehicle.model || '-'}</td>
                <td className="border border-black p-2 font-semibold w-1/4">No. Pendaftaran (Plate)</td>
                <td className="border border-black p-2 w-1/4 font-bold">{vehicle.plate || '-'}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-semibold">Tarikh & Masa Ambil</td>
                <td className="border border-black p-2">{formatDate(vehicle.pickupDate)}</td>
                <td className="border border-black p-2 font-semibold">Tarikh & Masa Pulang</td>
                <td className="border border-black p-2">{formatDate(vehicle.returnDate)}</td>
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
          <table className="w-full border-collapse border border-black text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-2 text-left w-1/2">Perkara</th>
                <th className="border border-black p-2 text-right w-1/2">Jumlah (RM)</th>
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
                <td className="border border-black p-2 text-right bg-gray-100">{Number((payment.rentalPrice || 0) + (payment.deposit || 0)).toFixed(2)}</td>
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
        <div className="mt-8">
          <h3 className="font-bold bg-gray-200 p-1 border border-black uppercase text-sm mb-4">E. Pengesahan & Tandatangan</h3>
          
          <div className="flex items-start gap-2 mb-8">
            <div className="w-4 h-4 border-2 border-black flex items-center justify-center font-bold text-xs mt-0.5">
              ✓
            </div>
            <p className="text-xs font-semibold">
              Saya dengan ini mengesahkan bahawa saya telah membaca, memahami, dan bersetuju dengan semua Terma & Syarat yang dinyatakan dalam perjanjian ini. Saya juga mengesahkan bahawa butiran yang diberikan adalah benar.
            </p>
          </div>

          <div className="flex justify-between items-end mt-12 px-8">
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

        {/* Footer */}
        <div className="mt-auto pt-8 text-[10px] text-gray-500 flex justify-between border-t border-gray-200">
          <span>Generated by EcaFleet Digital Era</span>
          <span>{new Date().toLocaleDateString('en-MY')}</span>
        </div>

      </div>

      {/* --- PAGE 2: APPENDIX (CAR PHOTOS) --- */}
      {beforePhotos && beforePhotos.length > 0 && (
        <div className="w-[794px] min-h-[1123px] bg-white text-black p-10 font-sans mx-auto mt-4 break-before-page">
          <h2 className="text-lg font-bold border-b border-black pb-2 mb-6">LAMPIRAN: Keadaan Kenderaan (Sebelum Sewaan)</h2>
          <div className="grid grid-cols-2 gap-4">
            {beforePhotos.map((photoUrl, index) => (
              <div key={index} className="border border-gray-300 p-2 text-center">
                <img src={photoUrl} alt={`Car condition ${index + 1}`} className="w-full h-48 object-cover mb-2" crossOrigin="anonymous" />
                <p className="text-xs font-bold">Gambar {index + 1}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MalayPrintableAgreementTemplate;
