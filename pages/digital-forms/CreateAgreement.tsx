import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/apiService';
import { ArrowLeft, Save, User, DollarSign, FileText } from 'lucide-react';

const CreateAgreement: React.FC = () => {
  const { companyId, userId } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    amount: 0,
    details: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    try {
      setLoading(true);
      await apiService.createAgreement({
        company_id: companyId,
        agent_id: companyId, // Simplified for now
        agent_name: userId || 'Admin',
        customer_name: formData.customer_name,
        amount: formData.amount,
        status: 'pending'
      });
      navigate('/forms');
    } catch (err) {
      alert('Failed to create agreement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <button 
        onClick={() => navigate('/forms')}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
          <h1 className="text-2xl font-bold text-slate-900">Create New Agreement</h1>
          <p className="text-slate-500 mt-1">Fill in the details to generate a digital signature link.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Customer Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  required
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="e.g. John Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Agreement Amount (RM)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  required
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Agreement Details / Terms</label>
              <div className="relative">
                <FileText className="absolute left-3 top-4 w-4 h-4 text-slate-400" />
                <textarea 
                  value={formData.details}
                  onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all min-h-[150px]"
                  placeholder="Enter specific rental terms, vehicle details, etc."
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Generate Agreement
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAgreement;
