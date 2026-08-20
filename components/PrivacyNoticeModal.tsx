import React, { useState } from 'react';
import { X, ShieldCheck, FileText, Globe } from 'lucide-react';

interface PrivacyNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyNoticeModal: React.FC<PrivacyNoticeModalProps> = ({ isOpen, onClose }) => {
  const [lang, setLang] = useState<'BM' | 'EN'>('BM');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div 
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {lang === 'BM' ? 'Notis Perlindungan Data Peribadi (PDPA)' : 'Personal Data Protection Notice (PDPA)'}
              </h2>
              <p className="text-xs text-slate-400">
                ECA Group Travel & Tours Sdn. Bhd. • {lang === 'BM' ? 'Tarikh Kuat Kuasa: 01.01.2026' : 'Effective Date: 01.01.2026'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Selector */}
            <div className="bg-slate-800 p-1 rounded-lg flex items-center gap-1 border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setLang('BM')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  lang === 'BM' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                BM
              </button>
              <button
                type="button"
                onClick={() => setLang('EN')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  lang === 'EN' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                EN
              </button>
            </div>

            {/* Close button */}
            <button 
              onClick={onClose}
              type="button"
              className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-sm text-slate-700 leading-relaxed font-sans">
          {lang === 'BM' ? (
            <div className="space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-base font-bold text-slate-900 mb-2">1. Mengenai Notis Ini</h3>
                <p>
                  ECA Group Travel & Tours Sdn. Bhd. (“ECA”, “kami” atau “syarikat”) menghormati privasi anda dan komited untuk melindungi data peribadi anda selaras dengan Akta Perlindungan Data Peribadi 2010 [Akta 709] serta undang-undang dan garis panduan berkaitan yang berkuat kuasa dari semasa ke semasa.
                </p>
                <p className="mt-2">
                  Notis ini menerangkan jenis data peribadi yang kami kumpulkan, cara data tersebut diperoleh, tujuan penggunaannya, pihak yang mungkin menerima data tersebut serta hak anda berhubung data peribadi anda.
                </p>
                <p className="mt-2">
                  Notis ini terpakai kepada pelanggan, penyewa, pemandu tambahan, individu yang mengambil kenderaan, penjamin atau wakil, dan mana-mana individu lain yang memberikan data peribadi kepada ECA berhubung perkhidmatan sewaan kenderaan.
                </p>
              </div>

              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-base font-bold text-slate-900 mb-2">2. Data Peribadi Yang Kami Kumpulkan</h3>
                <p className="mb-3">Bergantung kepada perkhidmatan dan urusan anda dengan ECA, kami mungkin mengumpulkan dan memproses data termasuk:</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-1.5 text-emerald-700">Maklumat Identiti</h4>
                    <ul className="list-disc ml-4 space-y-0.5 text-xs text-slate-600">
                      <li>Nama penuh</li>
                      <li>Nombor Kad Pengenalan / Pasport & Tarikh lahir</li>
                      <li>Gambar Kad Pengenalan atau Pasport</li>
                      <li>Gambar atau video individu</li>
                      <li>Tandatangan fizikal atau digital</li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-1.5 text-emerald-700">Maklumat Pemanduan</h4>
                    <ul className="list-disc ml-4 space-y-0.5 text-xs text-slate-600">
                      <li>Nombor Lesen Memandu</li>
                      <li>Kelas, status dan tarikh tamat Lesen Memandu</li>
                      <li>Maklumat pemandu tambahan atau individu yang mengambil kenderaan</li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-1.5 text-emerald-700">Maklumat Hubungan</h4>
                    <ul className="list-disc ml-4 space-y-0.5 text-xs text-slate-600">
                      <li>Nombor telefon</li>
                      <li>Alamat kediaman / bil & Alamat e-mel</li>
                      <li>Maklumat hubungan kecemasan</li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-1.5 text-emerald-700">Maklumat Sewaan</h4>
                    <ul className="list-disc ml-4 space-y-0.5 text-xs text-slate-600">
                      <li>Maklumat tempahan, tarikh/masa pickup & return</li>
                      <li>Kenderaan yang disewa & Tujuan sewaan</li>
                      <li>Rekod keadaan, mileage, penyerahan & pemulangan</li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-1.5 text-emerald-700">Maklumat Pembayaran</h4>
                    <ul className="list-disc ml-4 space-y-0.5 text-xs text-slate-600">
                      <li>Jumlah sewaan dan deposit</li>
                      <li>Rekod transaksi, invois, resit & pemulangan deposit</li>
                      <li><em>(Kami tidak menyimpan nombor penuh kad sekiranya diproses melalui gerbang pembayaran pihak ketiga)</em></li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-1.5 text-emerald-700">Pengesahan & Keselamatan</h4>
                    <ul className="list-disc ml-4 space-y-0.5 text-xs text-slate-600">
                      <li>Rekod audit tandatangan elektronik & Booking reference</li>
                      <li>Lokasi/GPS kenderaan, telematik & kod akses self-pickup</li>
                      <li>Laporan kemalangan, polis, saman trafik (jika berlaku insiden)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-base font-bold text-slate-900 mb-2">3. Sumber Data Peribadi</h3>
                <p>Kami memperoleh data daripada anda sendiri (WhatsApp, web, borang, perjanjian), pemandu tambahan/wakil sah, penyedia pengesahan identiti/screening, institusi pembayaran, syarikat insurans, pihak polis/agensi kerajaan, atau rekod telematik/GPS kenderaan.</p>
              </div>

              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-base font-bold text-slate-900 mb-2">4. Tujuan Data Digunakan</h3>
                <ul className="list-disc ml-5 space-y-1 text-slate-600">
                  <li>Mengesahkan identiti penyewa, pemandu dan individu yang mengambil kenderaan;</li>
                  <li>Mencegah penggunaan identiti palsu, penipuan dan penyalahgunaan kenderaan;</li>
                  <li>Menentukan kelayakan seseorang untuk menyewa atau memandu kenderaan;</li>
                  <li>Memproses tempahan, deposit, bayaran dan pemulangan deposit;</li>
                  <li>Menyediakan dan melaksanakan Perjanjian Sewa Kenderaan;</li>
                  <li>Mengendalikan self-pickup, pemantauan keselamatan dan keadaan kenderaan;</li>
                  <li>Mengendalikan saman, tol, kemalangan, kerosakan, kehilangan atau kecurian;</li>
                  <li>Membuat atau mengurus tuntutan insurans serta membantu siasatan pihak polis/berkuasa;</li>
                  <li>Menubuhkan, melaksanakan atau mempertahankan hak undang-undang ECA;</li>
                  <li>Menyimpan rekod perniagaan, akaun, audit dan cukai.</li>
                </ul>
              </div>

              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-base font-bold text-slate-900 mb-2">5. Data Yang Wajib Diberikan</h3>
                <p>Maklumat tertentu seperti nama, Kad Pengenalan / Pasport, Lesen Memandu, nombor telefon dan pengesahan identiti adalah <strong>wajib</strong>. Sekiranya tidak diberikan, ECA berhak tidak menerima tempahan, tidak melepaskan kenderaan, atau membatalkan transaksi.</p>
              </div>

              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-base font-bold text-slate-900 mb-2">6. Data Individu Lain</h3>
                <p>Jika anda memberikan data individu lain (cth: pemandu tambahan, kenalan kecemasan), anda mengesahkan anda mempunyai alasan sah dan telah memaklumkan individu tersebut.</p>
              </div>

              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-base font-bold text-slate-900 mb-2">7. Penzahiran Kepada Pihak Ketiga</h3>
                <p>Kami tidak menjual data anda. Data hanya dizahirkan apabila perlu kepada: staf ECA, syarikat insurans, bengkel/towing, bank/penyedia bayaran, penyedia IT/cloud/tandatangan digital, peguam/juruaudit, Polis Diraja Malaysia, JPJ, APAD, MOTAC atau mahkamah.</p>
              </div>

              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-base font-bold text-slate-900 mb-2">8. GPS dan Lokasi Kenderaan</h3>
                <p>Kenderaan mungkin dilengkapi GPS/telematik bagi tujuan keselamatan kenderaan, mengesan kelewatan/kehilangan, bantuan kecemasan, siasatan kemalangan dan perlindungan hak syarikat.</p>
              </div>

              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-base font-bold text-slate-900 mb-2">9. Keselamatan & Penyimpanan Data</h3>
                <p>ECA mengambil langkah pentadbiran, teknikal dan organisasi yang munasabah untuk melindungi data. Data disimpan selama tempoh yang diperlukan untuk sewaan, audit, cukai, tuntutan atau penyelesaian undang-undang.</p>
              </div>

              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-base font-bold text-slate-900 mb-2">10. Hak Anda</h3>
                <p>Anda berhak meminta akses, pembetulan data, menarik balik kebenaran pemasaran, atau mengemukakan pertanyaan mengenai data anda tertakluk kepada peruntukan undang-undang.</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="text-base font-bold text-slate-900 mb-2">11. Pertanyaan, Akses atau Aduan</h3>
                <p className="font-semibold text-slate-900">ECA GROUP TRAVEL & TOURS SDN. BHD.</p>
                <p className="text-xs text-slate-600 mt-1">No. 21-B, Jalan Suarasa 8/3, Bandar Tun Hussein Onn, 43200 Cheras, Selangor.</p>
                <p className="text-xs text-slate-600 mt-1"><strong>Telefon / WhatsApp:</strong> 011-5558 2106</p>
                <p className="text-xs text-slate-600"><strong>E-mel:</strong> michael@ecagroup.com.my</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-base font-bold text-slate-900 mb-2">1. About This Notice</h3>
                <p>
                  ECA Group Travel & Tours Sdn. Bhd. (“ECA”, “we”, “us” or “our”) respects your privacy and is committed to protecting your personal data in accordance with the Personal Data Protection Act 2010 [Act 709] and other applicable laws and guidelines in force from time to time.
                </p>
                <p className="mt-2">
                  This Notice explains the types of personal data we collect, how such data is obtained, the purposes for which it is used, the parties to whom it may be disclosed and your rights in relation to your personal data.
                </p>
                <p className="mt-2">
                  This Notice applies to customers, renters, additional drivers, persons collecting vehicles, guarantors or authorised representatives and any other individual providing personal data to ECA in connection with vehicle rental services.
                </p>
              </div>

              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-base font-bold text-slate-900 mb-2">2. Personal Data We Collect</h3>
                <p className="mb-3">Depending on your dealings with ECA, we may collect and process personal data including:</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-1.5 text-emerald-700">Identity Information</h4>
                    <ul className="list-disc ml-4 space-y-0.5 text-xs text-slate-600">
                      <li>Full name & NRIC / Passport number & Date of birth</li>
                      <li>Copies/photos of NRIC or Passport</li>
                      <li>Photographs or video records of the individual</li>
                      <li>Physical or electronic signatures</li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-1.5 text-emerald-700">Driving Information</h4>
                    <ul className="list-disc ml-4 space-y-0.5 text-xs text-slate-600">
                      <li>Driving licence number, class, status and expiry date</li>
                      <li>Details of additional drivers or vehicle collection representatives</li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-1.5 text-emerald-700">Contact Information</h4>
                    <ul className="list-disc ml-4 space-y-0.5 text-xs text-slate-600">
                      <li>Telephone number</li>
                      <li>Residential / billing address & Email address</li>
                      <li>Emergency-contact information</li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-1.5 text-emerald-700">Rental Information</h4>
                    <ul className="list-disc ml-4 space-y-0.5 text-xs text-slate-600">
                      <li>Booking details, pickup and return schedule</li>
                      <li>Vehicle rented & Purpose of rental</li>
                      <li>Condition, mileage, handover and return records</li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-1.5 text-emerald-700">Payment Information</h4>
                    <ul className="list-disc ml-4 space-y-0.5 text-xs text-slate-600">
                      <li>Rental amounts and security deposits</li>
                      <li>Transaction records, invoices and refund receipts</li>
                      <li><em>(Full payment card numbers are not retained by ECA)</em></li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-1.5 text-emerald-700">Verification & Telematics</h4>
                    <ul className="list-disc ml-4 space-y-0.5 text-xs text-slate-600">
                      <li>E-signature audit records & Booking reference</li>
                      <li>Vehicle GPS, telematics & self-pickup access logs</li>
                      <li>Incident/accident reports and police reports if applicable</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-base font-bold text-slate-900 mb-2">3. Purposes of Processing</h3>
                <ul className="list-disc ml-5 space-y-1 text-slate-600">
                  <li>Verify the identity of renters, drivers and collection agents;</li>
                  <li>Prevent fraud, identity theft and unauthorised vehicle usage;</li>
                  <li>Assess rental eligibility and prepare/execute Rental Agreements;</li>
                  <li>Manage self-pickup, vehicle safety, maintenance and tracking;</li>
                  <li>Handle summons, traffic offences, accidents, theft or insurance claims;</li>
                  <li>Assist law enforcement and statutory authorities;</li>
                  <li>Maintain business, taxation, accounting and audit records.</li>
                </ul>
              </div>

              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-base font-bold text-slate-900 mb-2">4. Mandatory Information</h3>
                <p>Certain identity and driving licence data is mandatory. Failure to provide mandatory data gives ECA the right to decline booking, withhold vehicle release, or cancel transactions.</p>
              </div>

              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-base font-bold text-slate-900 mb-2">5. Third-Party Disclosures</h3>
                <p>We do not sell personal data. Disclosures are limited to authorized staff, insurers, workshops/towing, payment gateways, cloud/digital signature providers, legal counsel, Royal Malaysia Police, JPJ, APAD, MOTAC or courts.</p>
              </div>

              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-base font-bold text-slate-900 mb-2">6. Vehicle GPS and Location</h3>
                <p>Vehicles may be equipped with GPS/telematics for asset safety, recovery of unreturned vehicles, accident investigations, and protection of company property.</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="text-base font-bold text-slate-900 mb-2">7. Inquiries, Access or Complaints</h3>
                <p className="font-semibold text-slate-900">ECA GROUP TRAVEL & TOURS SDN. BHD.</p>
                <p className="text-xs text-slate-600 mt-1">No. 21-B, Jalan Suarasa 8/3, Bandar Tun Hussein Onn, 43200 Cheras, Selangor.</p>
                <p className="text-xs text-slate-600 mt-1"><strong>Phone / WhatsApp:</strong> 011-5558 2106</p>
                <p className="text-xs text-slate-600"><strong>Email:</strong> michael@ecagroup.com.my</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-500">
            {lang === 'BM' ? 'Akta Perlindungan Data Peribadi 2010 (Akta 709)' : 'Personal Data Protection Act 2010 (Act 709)'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
          >
            {lang === 'BM' ? 'Tutup Notis' : 'Close Notice'}
          </button>
        </div>
      </div>
    </div>
  );
};
