import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Calendar, FileText, Users, Car, Settings, LogOut, ChevronLeft, ChevronRight, X, Lock, FileCheck } from 'lucide-react';
import UpsellModal from './UpsellModal';

interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, setIsMobileOpen }) => {
  const { staffRole, subscriptionTier, subscriberId, logout } = useAuth();
  const location = useLocation();
  
  // Initialize based on role
  const [isCollapsed, setIsCollapsed] = useState(staffRole === 'staff');
  const [isHovered, setIsHovered] = useState(false);
  
  // Upsell Modal State
  const [upsellFeature, setUpsellFeature] = useState<string | null>(null);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname, setIsMobileOpen]);

  const isExpanded = !isCollapsed || isHovered;

  const getMenuItems = () => {
    const items = [];
    const isSuperAdmin = subscriberId === 'superadmin';
    const isAdmin = staffRole === 'admin';
    const isStaff = staffRole === 'staff';

    // Master Admin (Superadmin) specific items
    if (isSuperAdmin) {
      items.push({ name: 'Subscribers', path: '/subscribers', icon: <Users className="w-5 h-5" />, isLocked: false });
      return items;
    }

    // Strict Tier Access Logic
    // Tier 1: Digital Form, Staff Management
    // Tier 2: Calendar, Staff Management
    // Tier 3: All Features

    // Business Dashboard
    if (isAdmin) {
      items.push({ 
        name: 'Business Dashboard', 
        path: '/', 
        icon: <LayoutDashboard className="w-5 h-5" />,
        isLocked: subscriptionTier !== 'tier_3'
      });
    } else if (isStaff && subscriptionTier !== 'tier_2') {
      items.push({ 
        name: 'Personal Stats', 
        path: '/', 
        icon: <LayoutDashboard className="w-5 h-5" />,
        isLocked: false
      });
    }

    // Audit & Payout
    if (isAdmin) {
      items.push({ 
        name: 'Audit & Payout', 
        path: '/audit', 
        icon: <FileCheck className="w-5 h-5" />,
        isLocked: subscriptionTier !== 'tier_3'
      });
    }

    // Digital Form
    if (isAdmin) {
      items.push({ 
        name: 'Digital Form', 
        path: '/forms', 
        icon: <FileText className="w-5 h-5" />,
        isLocked: subscriptionTier === 'tier_2'
      });
    } else if (isStaff && (subscriptionTier === 'tier_1' || subscriptionTier === 'tier_3')) {
      items.push({ 
        name: 'Digital Form', 
        path: '/forms', 
        icon: <FileText className="w-5 h-5" />,
        isLocked: false
      });
    }

    // Calendar
    if (isAdmin) {
      items.push({ 
        name: 'Calendar', 
        path: '/calendar', 
        icon: <Calendar className="w-5 h-5" />,
        isLocked: subscriptionTier === 'tier_1'
      });
    } else if (isStaff && (subscriptionTier === 'tier_2' || subscriptionTier === 'tier_3')) {
      items.push({ 
        name: 'Calendar', 
        path: '/calendar', 
        icon: <Calendar className="w-5 h-5" />,
        isLocked: false
      });
    }

    // Fleet Guardian / Vehicles
    if (isAdmin) {
      if (subscriptionTier === 'tier_2') {
        items.push({ 
          name: 'Vehicles', 
          path: '/vehicles', 
          icon: <Car className="w-5 h-5" />,
          isLocked: false
        });
        items.push({ 
          name: 'Fleet Guardian', 
          path: '/fleet', 
          icon: <Lock className="w-5 h-5" />,
          isLocked: true
        });
      } else {
        items.push({ 
          name: 'Fleet Guardian', 
          path: '/fleet', 
          icon: <Car className="w-5 h-5" />,
          isLocked: subscriptionTier === 'tier_1'
        });
      }
    }

    // Customers / CRM
    if (isAdmin) {
      items.push({ 
        name: 'Customers / CRM', 
        path: '/customers', 
        icon: <Users className="w-5 h-5" />,
        isLocked: subscriptionTier !== 'tier_3'
      });
    }

    // Staff Management
    if (isAdmin) {
      items.push({ 
        name: 'Staff Management', 
        path: '/staff', 
        icon: <Settings className="w-5 h-5" />,
        isLocked: false
      });
    }

    return items;
  };

  const handleLinkClick = (e: React.MouseEvent, item: any) => {
    if (item.isLocked) {
      e.preventDefault();
      setUpsellFeature(item.name);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div 
        className={`
          fixed md:relative top-0 left-0 h-screen bg-slate-900 text-white flex flex-col shrink-0 z-50
          transition-all duration-300 ease-in-out
          ${isExpanded ? 'w-64' : 'w-20'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Header */}
        <div className={`p-6 flex items-center ${isExpanded ? 'justify-between' : 'justify-center'} shrink-0 h-24`}>
          {isExpanded ? (
            <div className="overflow-hidden">
              <h1 className="text-2xl font-bold tracking-tight truncate">EcaFleet</h1>
              <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-bold truncate">
                {subscriberId === 'superadmin' ? 'Master Admin' : `${subscriptionTier?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`}
              </p>
            </div>
          ) : (
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-xl shrink-0 shadow-lg">
              E
            </div>
          )}
          
          {/* Mobile Close Button */}
          <button 
            className="md:hidden p-2 -mr-2 text-slate-400 hover:text-white"
            onClick={() => setIsMobileOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-2 mt-2 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {getMenuItems().map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={(e) => handleLinkClick(e, item)}
              className={({ isActive }) =>
                `flex items-center ${isExpanded ? 'px-4' : 'justify-center px-0'} py-3 rounded-xl transition-colors whitespace-nowrap group relative ${
                  item.isLocked
                    ? 'text-slate-400 hover:bg-slate-800/50 cursor-pointer'
                    : isActive 
                      ? 'bg-blue-600 text-white font-medium shadow-md shadow-blue-900/20' 
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
              title={!isExpanded ? item.name : undefined}
            >
              <div className={`shrink-0 ${item.isLocked ? 'opacity-50' : ''}`}>{item.icon}</div>
              <span className={`ml-3 flex-1 flex items-center justify-between transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 hidden'}`}>
                <span>{item.name}</span>
                {item.isLocked && <Lock className="w-4 h-4 text-slate-500 shrink-0" />}
              </span>
              
              {/* Tooltip for collapsed state */}
              {!isExpanded && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap flex items-center gap-2">
                  {item.name}
                  {item.isLocked && <Lock className="w-3 h-3 text-slate-400" />}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 shrink-0">
          <div className={`flex items-center ${isExpanded ? 'justify-between px-4' : 'justify-center'} py-3 bg-slate-800 rounded-xl`}>
            {isExpanded && (
              <div className="flex flex-col overflow-hidden mr-2">
                <span className="text-sm font-medium text-white capitalize truncate">{staffRole}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Logged in</span>
              </div>
            )}
            <button 
              onClick={logout}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors shrink-0"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Desktop Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex w-full items-center justify-center p-2 mt-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <UpsellModal 
        isOpen={!!upsellFeature} 
        onClose={() => setUpsellFeature(null)} 
        featureName={upsellFeature || ''} 
      />
    </>
  );
};

export default Sidebar;
