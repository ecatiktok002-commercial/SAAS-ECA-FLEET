import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
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
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (subscriberId) {
      fetchAgreements();
    }
  }, [subscriberId, staffRole, userUid]);

  const fetchAgreements = async () => {
    try {
      setLoading(true);
      // Force fresh fetch by ensuring we're calling the API directly
      console.log('Fetching fresh agreements data...');
      
      let createdBy: string | string[] | undefined = undefined;
      
      // Agents and Staff only see their own forms, Admins/Subscribers see everything
      if (staffRole !== 'admin') {
        const ids = [userUid, userId].filter(Boolean) as string[];
        
        // CRITICAL: If we are staff but don't have any ID yet, don't fetch
        if (ids.length === 0) {
          setAgreements([]);
          setLoading(false);
          return;
        }
        
        // userId is the UUID for staff, userUid is the string UID
        const agentId = userId || undefined;
        createdBy = ids;
        
        const data = await apiService.getAgreements(subscriberId!, agentId, createdBy);
        setAgreements(data);
      } else {
        const data = await apiService.getAgreements(subscriberId!);
        setAgreements(data);
      }
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

  const filteredForms = agreements.filter(a => {
    const query = searchQuery.toLowerCase();
    return (
      a.reference_number?.toLowerCase().includes(query) ||
      a.customer_name?.toLowerCase().includes(query) ||
      a.car_plate_number?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Digital Agreements</h1>
          <p className="text-slate-500 mt-1">Create and manage legally binding rental agreements.</p>
        </div>
        <div className="flex items-center gap-3">
          {staffRole === 'admin' && (
            <button 
              onClick={() => navigate('branding')}
              className="bg-white hover:bg-slate-50 text-slate-700 px-6 py-3 rounded-xl font-bold border border-slate-200 flex items-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <ImageIcon className="w-5 h-5" />
              Branding
            </button>
          )}
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
            <span className="text-sm font-medium text-slate-500">Signed/Completed</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {agreements.filter(a => {
              const s = a.status?.toLowerCase().trim();
              return s === 'signed' || s === 'completed';
            }).length}
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
            {agreements.filter(a => a.status?.toLowerCase().trim() === 'pending').length}
          </div>
        </div>
        {staffRole === 'admin' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-red-50 p-2 rounded-lg text-red-600">
                <AlertCircle className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-slate-500">Pending Requests</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {agreements.filter(a => a.has_pending_changes).length}
            </div>
          </div>
        )}
      </div>

      {/* Search and List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by Reference, Name, or Plate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                <th className="px-6 py-4">Handled By</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
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
              ) : filteredForms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    {staffRole === 'agent' ? (
                      <div className="space-y-2">
                        <p className="text-slate-600 font-medium">You have no active agreements.</p>
                        <p className="text-sm">Create a new reservation to get started.</p>
                      </div>
                    ) : (
                      "No agreements found across the fleet."
                    )}
                  </td>
                </tr>
              ) : (
                filteredForms.map((agreement) => (
                  <tr key={agreement.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{agreement.customer_name || 'Unnamed Customer'}</div>
                      <div className="text-xs text-slate-500">{agreement.reference_number || agreement.id.substring(0, 8)}</div>
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
                      <div className="flex flex-col gap-2 items-start">
                        {(() => {
                          const status = agreement.status?.toLowerCase().trim();
                          
                          if (status === 'completed') {
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                                <CheckCircle2 className="w-3 h-3" />
                                Completed
                              </span>
                            );
                          } else if (status === 'signed') {
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
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
                        {agreement.has_pending_changes && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                            <Clock className="w-3 h-3" />
                            Pending Request
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-sm">
                      {format(new Date(agreement.start_date || agreement.created_at), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {agreement.status?.toLowerCase().trim() === 'pending' ? (
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
