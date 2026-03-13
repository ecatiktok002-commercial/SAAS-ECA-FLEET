import React, { useState, useEffect } from 'react';
import { Upload, Save, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { apiService } from '../services/apiService';
import { useAuth } from '../context/AuthContext';

export default function BrandingSettings() {
  const { subscriberId } = useAuth();
  const [settings, setSettings] = useState({
    company_logo_url: '',
    ssm_logo_url: '',
    spdp_logo_url: '',
    company_name: 'ECA GROUP TRAVEL & TOURS SDN BHD',
    company_address: '011-55582106 | NO 21-B, JALAN SUARASA 8/3, BANDAR TUN HUSSEIN ONN, 43200 CHERAS, SELANGOR'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (subscriberId) {
      fetchSettings();
    }
  }, [subscriberId]);

  const fetchSettings = async () => {
    try {
      const data = await apiService.getCompanySettings(subscriberId!);
      if (data) {
        setSettings({
          company_logo_url: data.logo_url || '',
          ssm_logo_url: data.ssm_logo_url || '',
          spdp_logo_url: data.spdp_logo_url || '',
          company_name: data.name || 'ECA GROUP TRAVEL & TOURS SDN BHD',
          company_address: data.address || '011-55582106 | NO 21-B, JALAN SUARASA 8/3, BANDAR TUN HUSSEIN ONN, 43200 CHERAS, SELANGOR'
        });
      }
    } catch (error) {
      console.error('Failed to fetch settings', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (limit to 1MB for Base64 storage in TEXT column)
      if (file.size > 1024 * 1024) {
        alert('Image size too large. Please upload images smaller than 1MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, [field]: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!subscriberId) return;
    setSaving(true);
    setMessage('');
    try {
      await apiService.updateCompanySettings(subscriberId, settings);
      setMessage('Branding settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Save error', error);
      setMessage('An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading settings...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Branding Settings</h1>
          <p className="text-slate-500 mt-1">Manage your company logos and details for digital agreements.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {saving ? 'Saving...' : 'Save Branding'}
        </button>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center ${message.includes('success') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message.includes('success') && <CheckCircle className="w-5 h-5 mr-2 text-emerald-500" />}
          {message}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Company Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
              <input
                type="text"
                value={settings.company_name}
                onChange={(e) => setSettings({...settings, company_name: e.target.value})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company Address & Contact</label>
              <input
                type="text"
                value={settings.company_address}
                onChange={(e) => setSettings({...settings, company_address: e.target.value})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Logos & Certificates</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Company Logo */}
            <div className="border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <h3 className="text-sm font-bold text-slate-900 mb-2">Main Company Logo</h3>
              <p className="text-xs text-slate-500 mb-4">Appears at the top left of agreements.</p>
              
              <div className="w-full h-32 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg mb-4 flex items-center justify-center overflow-hidden relative group">
                {settings.company_logo_url ? (
                  <img src={settings.company_logo_url} alt="Company Logo" className="max-h-full max-w-full object-contain p-2" />
                ) : (
                  <div className="text-slate-400 flex flex-col items-center">
                    <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                    <span className="text-xs">No logo uploaded</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <label className="cursor-pointer bg-white text-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center">
                    <Upload className="w-3 h-3 mr-1" /> Upload New
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'company_logo_url')} />
                  </label>
                </div>
              </div>
            </div>

            {/* SSM Logo */}
            <div className="border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <h3 className="text-sm font-bold text-slate-900 mb-2">SSM Certificate Logo</h3>
              <p className="text-xs text-slate-500 mb-4">Appears at the bottom of agreements.</p>
              
              <div className="w-full h-32 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg mb-4 flex items-center justify-center overflow-hidden relative group">
                {settings.ssm_logo_url ? (
                  <img src={settings.ssm_logo_url} alt="SSM Logo" className="max-h-full max-w-full object-contain p-2" />
                ) : (
                  <div className="text-slate-400 flex flex-col items-center">
                    <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                    <span className="text-xs">No logo uploaded</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <label className="cursor-pointer bg-white text-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center">
                    <Upload className="w-3 h-3 mr-1" /> Upload New
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'ssm_logo_url')} />
                  </label>
                </div>
              </div>
            </div>

            {/* SPDP Logo */}
            <div className="border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <h3 className="text-sm font-bold text-slate-900 mb-2">SPDP Logo</h3>
              <p className="text-xs text-slate-500 mb-4">Appears at the bottom of agreements.</p>
              
              <div className="w-full h-32 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg mb-4 flex items-center justify-center overflow-hidden relative group">
                {settings.spdp_logo_url ? (
                  <img src={settings.spdp_logo_url} alt="SPDP Logo" className="max-h-full max-w-full object-contain p-2" />
                ) : (
                  <div className="text-slate-400 flex flex-col items-center">
                    <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                    <span className="text-xs">No logo uploaded</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <label className="cursor-pointer bg-white text-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center">
                    <Upload className="w-3 h-3 mr-1" /> Upload New
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'spdp_logo_url')} />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
