"use client";

import React from 'react';

interface AppHeaderProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onProfileClick: () => void;
  avatarUrl: string;
  onSignOut: () => void;
  isManager: boolean;
  pendingRedemptions?: number;
  pendingAppeals?: number;
  hasNewActivity?: boolean;
}

export default function AppHeader({ activeView, onViewChange, onProfileClick, avatarUrl, onSignOut, isManager, pendingRedemptions = 0, pendingAppeals = 0, hasNewActivity = false }: AppHeaderProps) {
  const navItems: { key: string, label: string, mIcon: string, showToStaff: boolean, badge?: boolean }[] = [
    { key: 'economy', label: 'Bounty & Rewards', mIcon: 'local_play', showToStaff: true },
    { key: 'skills', label: 'Skills', mIcon: 'psychology', showToStaff: true },
    { key: 'staff', label: 'Staff Dashboard', mIcon: 'dashboard', showToStaff: true },
  ];

  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <header className="w-full fixed top-0 z-[100] glass-header">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            className="lg:hidden p-2 -ml-2 text-on-surface"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span className="material-symbols-outlined">{isMobileMenuOpen ? 'close' : 'menu'}</span>
          </button>
          <div 
            onClick={() => isManager && onViewChange('manager')}
            className={`w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 relative ${isManager ? 'cursor-pointer hover:scale-105 active:scale-95 transition-all' : ''}`}
          >
            <span className="material-symbols-outlined font-black">grid_view</span>
            {isManager && (pendingRedemptions + pendingAppeals > 0 || hasNewActivity) && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse shadow-sm shadow-red-500/50"></span>
            )}
          </div>
          <div onClick={() => isManager && onViewChange('manager')} className={isManager ? 'cursor-pointer' : ''}>
            <h1 className="text-lg font-black tracking-[0.2em] uppercase text-on-surface font-headline leading-tight">KPI</h1>
            <p className="text-[10px] font-bold tracking-[0.4em] uppercase text-primary -mt-1 opacity-80">MERIT</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <nav className="hidden lg:flex items-center gap-2">
            {navItems
              .filter(i => {
                if (!isManager) return i.showToStaff;
                // For managers, we only show 'Staff Dashboard' in the top nav to toggle between modes.
                // Bounty and Skills are in their sidebar.
                return i.key === 'staff';
              })
              .map(item => (
                <button
                  key={item.key}
                  onClick={() => onViewChange(item.key)}
                  className={`nav-pill relative ${
                    activeView === item.key ? 'nav-pill-active' : 'nav-pill-inactive'
                  }`}
                >
                  {item.label}
                  {item.badge ? (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-surface shadow-sm"></span>
                  ) : null}
                </button>
              ))}
          </nav>
          
          <div className="h-10 w-px bg-outline-variant/30 mx-2 hidden lg:block" />

          <div className="flex items-center gap-4">
            <button 
              onClick={onSignOut} 
              className="text-xs font-bold uppercase tracking-widest text-error hover:bg-error/10 px-3 py-2 rounded-xl transition-all"
            >
              Sign Out
            </button>
            <div 
              className="h-12 w-12 rounded-2xl overflow-hidden border-2 border-surface-container cursor-pointer hover:border-primary transition-all shadow-sm shrink-0"
              onClick={onProfileClick}
            >
              <img alt="User profile" className="object-cover w-full h-full" src={avatarUrl}/>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-20 left-0 w-full bg-surface-container-high border-b border-outline-variant shadow-xl animate-in slide-in-from-top duration-300">
          <nav className="flex flex-col p-4 gap-2">
            {navItems
              .filter(i => {
                if (!isManager) return i.showToStaff;
                return i.key === 'staff';
              })
              .map(item => (
                <button
                  key={item.key}
                  onClick={() => {
                    onViewChange(item.key);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-bold transition-all relative ${
                    activeView === item.key 
                      ? 'bg-primary text-on-primary shadow-md' 
                      : 'text-on-surface hover:bg-surface-container-highest'
                  }`}
                >
                  <div className="relative">
                    <span className="material-symbols-outlined">{item.mIcon}</span>
                    {item.badge ? (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-surface shadow-sm animate-pulse"></span>
                    ) : null}
                  </div>
                  {item.label}
                </button>
              ))}
          </nav>
        </div>
      )}
    </header>
  );
}
