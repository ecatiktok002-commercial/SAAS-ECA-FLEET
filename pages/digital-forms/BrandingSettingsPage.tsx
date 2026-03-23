import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon } from 'lucide-react';
import BrandingSettings from '../../components/BrandingSettings';
import { useAuth } from '../../context/AuthContext';

export default function BrandingSettingsPage() {
  const { staffRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (staffRole && staffRole !== 'admin') {
      navigate('/forms');
    }
  }, [staffRole, navigate]);

  if (staffRole && staffRole !== 'admin') return null;
  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-12">
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/forms" className="text-slate-500 hover:text-slate-900 mr-4">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <ImageIcon className="h-6 w-6 text-slate-900 mr-2" />
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Branding Settings</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <BrandingSettings />
      </main>
    </div>
  );
}
