import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Calendar, FileText, Users, Car, Settings, LogOut } from 'lucide-react';

const Sidebar: React.FC = () => {
  const { staffRole, subscriptionTier, companyId, logout } = useAuth();

  const getMenuItems = () => {
    const items = [
      { name: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-5 h-5" /> },
    ];

    if (companyId === 'superadmin') {
      items.push({ name: 'Subscribers', path: '/subscribers', icon: <Users className="w-5 h-5" /> });
    }

    if (subscriptionTier === 'tier_1' || subscriptionTier === 'tier_3') {
      items.push({ name: 'Calendar', path: '/calendar', icon: <Calendar className="w-5 h-5" /> });
    }

    if (subscriptionTier === 'tier_2' || subscriptionTier === 'tier_3') {
      items.push({ name: 'Digital Form', path: '/forms', icon: <FileText className="w-5 h-5" /> });
      items.push({ name: 'Customers', path: '/customers', icon: <Users className="w-5 h-5" /> });
    }

    if (subscriptionTier === 'tier_3') {
      items.push({ name: 'Fleet Guardian', path: '/fleet', icon: <Car className="w-5 h-5" /> });
    }

    if (staffRole === 'admin') {
      items.push({ name: 'Staff Management', path: '/staff', icon: <Settings className="w-5 h-5" /> });
    }

    return items;
  };

  return (
    <div className="w-64 bg-slate-900 text-white h-screen flex flex-col shrink-0">
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-tight">EcaFleet</h1>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">
          {companyId === 'superadmin' ? 'Master Admin' : `${subscriptionTier?.replace('_', ' ')} Plan`}
        </p>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {getMenuItems().map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                isActive 
                  ? 'bg-blue-600 text-white font-medium' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            {item.icon}
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800 rounded-xl">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white capitalize">{staffRole}</span>
            <span className="text-xs text-slate-400">Logged in</span>
          </div>
          <button 
            onClick={logout}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
