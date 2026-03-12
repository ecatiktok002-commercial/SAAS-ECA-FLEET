import React from 'react';
import { FileText } from 'lucide-react';

const DigitalFormPage: React.FC = () => {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Digital Forms</h1>
        <p className="text-slate-500 mt-2">Manage your digital handover forms and inspections.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Digital Forms Module</h2>
        <p className="text-slate-500 max-w-md mx-auto mb-6">
          This feature is currently under development. Soon you will be able to create, send, and manage digital forms for your customers.
        </p>
        <button className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors">
          Create New Form
        </button>
      </div>
    </div>
  );
};

export default DigitalFormPage;
