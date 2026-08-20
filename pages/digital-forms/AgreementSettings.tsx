import React, { useEffect } from 'react';
import { Settings, Shield, Bell, FileText, Image as ImageIcon, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AgreementSettings: React.FC = () => {
  const navigate = useNavigate();
  const { staffRole } = useAuth();

  useEffect(() => {
    if (staffRole && staffRole !== 'admin') {
      navigate('/forms');
    }
  }, [staffRole, navigate]);

  if (staffRole && staffRole !== 'admin') return null;

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Agreement Settings</h1>
        <p className="text-sm sm:text-base text-slate-500 mt-1">Configure your digital signature preferences and legal templates.</p>
      </div>

      <div className="space-y-6">
        {/* Branding Settings Card */}
        <div 
          onClick={() => navigate('/forms/branding')}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Branding & Identity</h2>
                <p className="text-sm text-slate-500">Customize logos and company details on agreements.</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 transition-colors" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Security & Compliance</h2>
              <p className="text-sm text-slate-500">Manage how agreements are verified and stored.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <div className="font-bold text-slate-900">Two-Factor Verification</div>
                <div className="text-xs text-slate-500">Require SMS code before signing.</div>
              </div>
              <div className="w-12 h-6 bg-slate-200 rounded-full relative cursor-pointer">
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <div className="font-bold text-slate-900">Audit Trail</div>
                <div className="text-xs text-slate-500">Record IP address and browser info of signers.</div>
              </div>
              <div className="w-12 h-6 bg-emerald-500 rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Default Template</h2>
              <p className="text-sm text-slate-500">The base terms and conditions for all new agreements.</p>
            </div>
          </div>
          
          <textarea 
            className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono leading-relaxed"
            defaultValue={`1. Penggunaan & Pemandu Sah: Kenderaan hanya untuk kegunaan persendirian yang sah. Dilarang untuk e-hailing, penghantaran, perlumbaan, aktiviti haram, sub-rental atau diserahkan/dipinjamkan kepada pihak ketiga. Hanya penyewa atau pemandu tambahan yang telah didaftarkan dan diluluskan oleh syarikat dibenarkan mengambil dan memandu kenderaan.
2. Pengesahan Identiti: Penyewa mengesahkan bahawa semua IC, Lesen Memandu, nombor telefon, gambar, tandatangan dan maklumat yang diberikan adalah miliknya sendiri dan benar. Penyewa dilarang menyerahkan atau membenarkan orang lain menggunakan identiti, dokumen, akaun WhatsApp, OTP atau akses sewaan miliknya. Sekiranya penyewa dengan sengaja membenarkan pihak lain menggunakan identiti atau mengambil/menggunakan kenderaan bagi pihaknya, penyewa kekal bertanggungjawab bersama pihak tersebut terhadap segala kerugian, kerosakan dan tuntutan yang timbul.
3. Self-Pickup & Penyerahan Kenderaan: Bagi self-pickup, hanya individu yang telah disahkan oleh syarikat dibenarkan mengambil kenderaan. Pengesahan melalui tandatangan digital, OTP, selfie/video, kod akses atau kaedah pengesahan syarikat dianggap sebagai pengesahan penerimaan kenderaan oleh penyewa.
4. Aktiviti Haram, Dadah & Sitaan Kenderaan: Dilarang menyimpan, membawa atau menggunakan kenderaan untuk dadah, barang terlarang, jenayah atau sebarang aktiviti menyalahi undang-undang. Sekiranya kenderaan ditahan atau disita akibat perbuatan penyewa atau mana-mana pihak yang mendapat akses kepada kenderaan melalui penyewa, penyewa bertanggungjawab atas kos towing, penyimpanan, pengambilan semula, kerosakan, kehilangan penggunaan, penalti dan kos munasabah berkaitan.
5. Kerosakan, Kemalangan & Kehilangan: Penyewa bertanggungjawab atas kerosakan, kemalangan, kehilangan atau kecurian yang berlaku sepanjang kenderaan berada dalam jagaan penyewa, termasuk kos pembaikan, towing, excess insurans dan kehilangan penggunaan yang berkaitan. Deposit boleh digunakan dan sebarang baki masih wajib dibayar.
6. Saman & Kesalahan Trafik: Penyewa bertanggungjawab atas semua saman, kompaun, parkir, tol atau kesalahan yang berlaku sepanjang tempoh sewaan, berdasarkan tarikh dan masa kesalahan, bukan tarikh saman diterima atau dimaklumkan. Saman yang muncul selepas sewaan tamat tetap menjadi tanggungjawab penyewa.
7. Kerjasama Dengan Pihak Berkuasa: Penyewa bersetuju memberikan kerjasama sekiranya berlaku kemalangan, siasatan polis, tuntutan insurans atau tindakan pihak berkuasa. Syarikat berhak menyerahkan rekod sewaan dan maklumat berkaitan kepada pihak berkuasa apabila diperlukan mengikut undang-undang.
8. Data Peribadi: Penyewa membenarkan syarikat mengumpul dan memproses IC, Lesen Memandu, gambar, video/selfie pengesahan, nombor telefon, tandatangan dan rekod sewaan bagi tujuan pengesahan identiti, keselamatan, tuntutan, siasatan, pencegahan penipuan dan perlindungan undang-undang.`}
          />
          <div className="mt-4 flex justify-end">
            <button className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-800 transition-colors">
              Save Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgreementSettings;
