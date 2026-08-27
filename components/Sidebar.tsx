import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, Calendar, FileText, Users, Car, Settings, 
  LogOut, ChevronLeft, ChevronRight, X, Lock, FileCheck, 
  BarChart3, HelpCircle, Sparkles, Shield
} from 'lucide-react';
import UpsellModal from './UpsellModal';

interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

interface NavMenuItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  allowedTiers?: number[];
  adminOnly?: boolean;
  isLocked?: boolean;
}

interface NavSection {
  title: string;
  items: NavMenuItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, setIsMobileOpen }) => {
  const { staffRole, subscriptionTier, subscriberTier, subscriberId, companyName, logout } = useAuth();
  const location = useLocation();
  
  // Initialize based on role
  const [isCollapsed, setIsCollapsed] = useState(staffRole !== 'admin');
  const [isHovered, setIsHovered] = useState(false);
  
  // Upsell Modal State
  const [upsellFeature, setUpsellFeature] = useState<string | null>(null);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname, setIsMobileOpen]);

  const isExpanded = !isCollapsed || isHovered;

  const getCategorizedMenu = (): NavSection[] => {
    const isSuperAdmin = subscriberId === 'superadmin';
    const isAdmin = staffRole === 'admin';
    const isStaff = !isAdmin;
    const currentTier = subscriberTier;

    // Master Admin (Superadmin) specific sections
    if (isSuperAdmin) {
      return [
        {
          title: 'SAAS PLATFORM',
          items: [
            { name: 'SaaS Command Center', path: '/subscribers', icon: <LayoutDashboard className="w-4.5 h-4.5" /> },
            { name: 'Subscribers', path: '/subscribers?tab=subscribers', icon: <Users className="w-4.5 h-4.5" /> },
            { name: 'Billing & Invoices', path: '/subscribers?tab=billing', icon: <FileCheck className="w-4.5 h-4.5" /> },
            { name: 'Commission Ledger', path: '/subscribers?tab=commissions', icon: <BarChart3 className="w-4.5 h-4.5" /> }
          ]
        },
        {
          title: 'SUPPORT',
          items: [
            { name: 'Help & Tutorials', path: '/help', icon: <HelpCircle className="w-4.5 h-4.5" /> }
          ]
        }
      ];
    }

    const rawSections: { title: string; items: NavMenuItem[] }[] = [
      {
        title: 'WORKSPACE',
        items: [
          { 
            name: isAdmin ? 'Overview' : 'Overview', 
            path: '/', 
            icon: <LayoutDashboard className="w-4.5 h-4.5" />,
            allowedTiers: [3],
            adminOnly: false
          },
          { 
            name: 'Digital Form', 
            path: '/forms', 
            icon: <FileText className="w-4.5 h-4.5" />,
            allowedTiers: [1, 2, 3],
            adminOnly: false
          },
          { 
            name: 'Calendar', 
            path: '/calendar', 
            icon: <Calendar className="w-4.5 h-4.5" />,
            allowedTiers: [2, 3],
            adminOnly: false
          }
        ]
      },
      {
        title: 'OPERATIONS',
        items: [
          {
            name: 'Vehicle Revenue',
            path: '/revenue',
            icon: <BarChart3 className="w-4.5 h-4.5" />,
            allowedTiers: [3],
            adminOnly: true
          },
          { 
            name: 'Audit & Payout', 
            path: '/audit', 
            icon: <FileCheck className="w-4.5 h-4.5" />,
            allowedTiers: [3],
            adminOnly: true
          },
          { 
            name: 'Fleet Guardian', 
            path: '/fleet', 
            icon: <Car className="w-4.5 h-4.5" />,
            allowedTiers: [3],
            adminOnly: true
          },
          { 
            name: 'Customers / CRM', 
            path: '/customers', 
            icon: <Users className="w-4.5 h-4.5" />,
            allowedTiers: [3],
            adminOnly: true
          },
          { 
            name: 'Staff Management', 
            path: '/staff', 
            icon: <Settings className="w-4.5 h-4.5" />,
            allowedTiers: [1, 2, 3],
            adminOnly: true
          }
        ]
      },
      {
        title: 'SUPPORT',
        items: [
          { 
            name: 'Help & Tutorials', 
            path: '/help', 
            icon: <HelpCircle className="w-4.5 h-4.5" />,
            allowedTiers: [1, 2, 3],
            adminOnly: false
          }
        ]
      }
    ];

    // Filter by tier and role permissions
    return rawSections
      .map(section => {
        const filteredItems = section.items
          .filter(item => {
            if (isStaff) {
              if (item.adminOnly) return false;
              return item.allowedTiers?.includes(currentTier);
            }
            return true;
          })
          .map(item => ({
            ...item,
            isLocked: isAdmin && item.allowedTiers ? !item.allowedTiers.includes(currentTier) : false
          }));

        return {
          title: section.title,
          items: filteredItems
        };
      })
      .filter(section => section.items.length > 0);
  };

  const handleLinkClick = (e: React.MouseEvent, item: NavMenuItem) => {
    if (item.isLocked) {
      e.preventDefault();
      setUpsellFeature(item.name);
    }
  };

  const displayCompanyName = companyName || 'ECA GROUP TRAVEL & TOURS SDN BHD';
  const roleDisplay = subscriberId === 'superadmin' ? 'Master Admin' : (staffRole === 'admin' ? 'Admin' : 'Staff');
  const tierDisplay = subscriberId === 'superadmin' ? 'Superadmin' : `Tier ${subscriberTier || 3}`;

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div 
        className={`
          fixed md:relative top-0 left-0 h-screen bg-slate-950 text-white flex flex-col shrink-0 z-50
          border-r border-slate-800/80 transition-all duration-300 ease-in-out
          ${isExpanded ? 'w-64' : 'w-20'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Brand Header */}
        <div className={`p-4 sm:p-5 flex items-center ${isExpanded ? 'justify-between' : 'justify-center'} shrink-0 border-b border-slate-900/90 h-20`}>
          {isExpanded ? (
            <div className="overflow-hidden min-w-0 pr-2">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black tracking-wider text-white">SMARTDRIVE</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              </div>
              <p 
                className="text-[11px] text-slate-400 font-semibold truncate mt-0.5 tracking-tight"
                title={displayCompanyName}
              >
                {displayCompanyName}
              </p>
            </div>
          ) : (
            <div 
              className="w-10 h-10 bg-linear-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center font-black text-sm tracking-wider text-white shrink-0 shadow-md shadow-blue-900/30 cursor-pointer" 
              title={`SMARTDRIVE - ${displayCompanyName}`}
            >
              SD
            </div>
          )}
          
          {/* Mobile Close Button */}
          <button 
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Navigation Sections */}
        <nav className="flex-1 px-3 py-2 space-y-3 overflow-y-auto overflow-x-hidden no-scrollbar scrollbar-none">
          {getCategorizedMenu().map((section, sectionIdx) => (
            <div key={section.title} className="space-y-1">
              {/* Category Header */}
              {isExpanded ? (
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 pt-1 pb-1">
                  {section.title}
                </div>
              ) : (
                sectionIdx > 0 && <div className="my-2 border-t border-slate-800/80 mx-2" />
              )}

              {/* Category Items */}
              {section.items.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={(e) => handleLinkClick(e, item)}
                  className={({ isActive }) =>
                    `flex items-center ${isExpanded ? 'px-3.5' : 'justify-center px-0'} py-2.5 rounded-xl transition-all whitespace-nowrap group relative ${
                      item.isLocked
                        ? 'text-slate-500 hover:bg-slate-900/60 cursor-pointer'
                        : isActive 
                          ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-900/30' 
                          : 'text-slate-300 hover:bg-slate-900/80 hover:text-slate-100'
                    }`
                  }
                  title={!isExpanded ? item.name : undefined}
                >
                  <div className={`shrink-0 ${item.isLocked ? 'opacity-40' : ''}`}>
                    {item.icon}
                  </div>
                  
                  <span className={`ml-3 flex-1 flex items-center justify-between text-sm font-medium transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 hidden'}`}>
                    <span>{item.name}</span>
                    {item.isLocked && <Lock className="w-4 h-4 text-slate-500 shrink-0" />}
                  </span>
                  
                  {/* Tooltip for collapsed state */}
                  {!isExpanded && (
                    <div className="absolute left-full ml-2.5 px-2.5 py-1.5 bg-slate-800 text-white text-sm font-medium rounded-md shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap flex items-center gap-2 border border-slate-700/60">
                      {item.name}
                      {item.isLocked && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                    </div>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer: User Role, Tier Status & Logout */}
        <div className="p-3 pb-16 md:pb-3 border-t border-slate-900 shrink-0 bg-slate-950/80">
          {isExpanded ? (
            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800/80 shadow-inner">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-200 capitalize truncate">
                    {roleDisplay}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 tracking-tight">
                    {tierDisplay}
                  </span>
                </div>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-950/70 text-blue-400 border border-blue-800/40 shrink-0">
                  {tierDisplay}
                </span>
              </div>

              {/* Logout Button */}
              <button 
                onClick={logout}
                className="w-full mt-2.5 py-1.5 px-2.5 text-xs font-bold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 hover:border-rose-600 rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-98"
                title="Log out of account"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button 
                onClick={logout}
                className="p-2.5 text-rose-400 hover:text-white hover:bg-rose-500/20 rounded-xl transition-colors shrink-0 cursor-pointer"
                title={`Logout (${roleDisplay} - ${tierDisplay})`}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Desktop Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex w-full items-center justify-center p-1.5 mt-2 text-slate-500 hover:text-slate-300 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
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
