import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/apiService';
import { Agreement } from '../../types';
import { 
  FileText, 
  Plus, 
  Search, 
  MoreVertical, 
  ExternalLink, 
  Trash2, 
  Edit,
  CheckCircle2,
  Clock,
  AlertCircle,
  Image as ImageIcon,
  Link as LinkIcon,
  Download
} from 'lucide-react';

const AgreementDashboard: React.FC = () => {
  const { subscriberId, staffRole, userId, userUid } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (subscriberId) {
      fetchAgreements();
    }
  }, [subscriberId, staffRole, userUid]);

  const fetchAgreements = async () => {
    try {
      setLoading(true);
      let agentId: string | undefined = undefined;
      
      if (staffRole === 'staff') {
        agentId = userUid || undefined;
      }

      const data = await apiService.getAgreements(subscriberId!, agentId);
      setAgreements(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this agreement?')) {
      try {
        await apiService.deleteAgreement(id, subscriberId!);
        setAgreements(prev => prev.filter(a => a.id !== id));
      } catch (err) {
        alert('Failed to delete agreement');
      }
    }
  };

  const filteredAgreements = agreements.filter(a => 
    a.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.agent_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Digital Agreements</h1>
          <p className="text-slate-500 mt-1">Create and manage legally binding rental agreements.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('branding')}
            className="bg-white hover:bg-slate-50 text-slate-700 px-6 py-3 rounded-xl font-bold border border-slate-200 flex items-center gap-2 transition-all shadow-sm active:scale-95"
          >
            <ImageIcon className="w-5 h-5" />
            Branding
          </button>
          <button 
            onClick={() => navigate('create')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Create Agreement
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-slate-500">Total Agreements</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{agreements.length}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-slate-500">Signed</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {agreements.filter(a => a.status === 'signed').length}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-amber-50 p-2 rounded-lg text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-slate-500">Pending Signature</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {agreements.filter(a => a.status === 'pending').length}
          </div>
        </div>
      </div>

      {/* Search and List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by customer or agent..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">IC / Phone</th>
                <th className="px-6 py-4">Agent</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    Loading agreements...
                  </td>
                </tr>
              ) : filteredAgreements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No agreements found.
                  </td>
                </tr>
              ) : (
                filteredAgreements.map((agreement) => (
                  <tr key={agreement.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{agreement.customer_name || 'Unnamed Customer'}</div>
                      <div className="text-xs text-slate-500">{agreement.id.substring(0, 8)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-700 font-mono">{agreement.identity_number || 'N/A'}</div>
                      <div className="text-xs text-slate-500">{agreement.customer_phone || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{agreement.agent_name}</td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">
                      RM {agreement.total_price.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const isCompleted = agreement.status === 'signed' && !!agreement.payment_receipt;
                        const isSigned = agreement.status === 'signed' && !agreement.payment_receipt;
                        
                        if (isCompleted) {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                              <CheckCircle2 className="w-3 h-3" />
                              Completed
                            </span>
                          );
                        } else if (isSigned) {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                              <CheckCircle2 className="w-3 h-3" />
                              Signed
                            </span>
                          );
                        } else {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                              <Clock className="w-3 h-3" />
                              Pending
                            </span>
                          );
                        }
                      })()}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-sm">
                      {new Date(agreement.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {agreement.status === 'pending' ? (
                          <button 
                            onClick={() => {
                              const link = `${window.location.origin}/forms/sign/${agreement.id}`;
                              navigator.clipboard.writeText(link);
                              alert('Link generated and copied to clipboard! Share this with the customer.');
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Generate Link"
                          >
                            <LinkIcon className="w-4 h-4" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => window.open(`${window.location.origin}/forms/sign/${agreement.id}`, '_blank')}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => navigate(`edit/${agreement.id}`)}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(agreement.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AgreementDashboard;
