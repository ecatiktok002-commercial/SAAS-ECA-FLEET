import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { Agreement } from '../../types';
import { ArrowLeft, Save, User, DollarSign, FileText, Loader2 } from 'lucide-react';

const EditAgreement: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    amount: 0,
    details: '',
    status: 'pending' as 'pending' | 'signed'
  });

  useEffect(() => {
    if (id) {
      fetchAgreement();
    }
  }, [id]);

  const fetchAgreement = async () => {
    try {
      setLoading(true);
      const data = await apiService.getAgreementById(id!);
      if (data) {
        setFormData({
          customer_name: data.customer_name,
          amount: data.amount,
          details: data.details || '',
          status: data.status
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      setSaving(true);
      await apiService.updateAgreement(id, formData);
      navigate('/forms');
    } catch (err) {
      alert('Failed to update agreement');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-20 text-center">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto mb-4" />
        <p className="text-slate-500">Loading agreement details...</p>
      </div>
    );
  }

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
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Edit Agreement</h1>
            <p className="text-slate-500 mt-1">Update the details for this digital contract.</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            formData.status === 'signed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {formData.status.toUpperCase()}
          </span>
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
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit"
              disabled={saving || formData.status === 'signed'}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {formData.status === 'signed' ? 'Cannot Edit Signed Agreement' : 'Update Agreement'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAgreement;
