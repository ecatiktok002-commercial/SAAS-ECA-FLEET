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
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Agreement Settings</h1>
        <p className="text-slate-500 mt-1">Configure your digital signature preferences and legal templates.</p>
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
            className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            defaultValue="1. The renter agrees to abide by all local traffic laws and regulations.
2. The renter is responsible for any summons or fines incurred during the rental period.
3. Smoking and pets are strictly prohibited inside the vehicle.
4. This agreement is legally binding once signed digitally."
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
