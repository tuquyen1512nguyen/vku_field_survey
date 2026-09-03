import React from 'react';
import { Home, ClipboardList, MapPin, FolderClock, User } from 'lucide-react';
import { TabType } from '../types';

interface NavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  pendingCount: number;
}

interface TabItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange, pendingCount }) => {
  const tabs: TabItem[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'survey', label: 'Survey', icon: ClipboardList },
    { id: 'map', label: 'Map', icon: MapPin },
    { id: 'records', label: 'Records', icon: FolderClock, badge: pendingCount },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <>
      {/* 1. Mobile Navigation (Bottom Tab Bar) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 z-50 flex items-center justify-around px-2 shadow-lg shadow-navy-900/5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center h-full relative transition-all duration-200 ${
                isActive ? 'text-electric-500 font-bold' : 'text-slate-500 hover:text-navy-700'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110 -translate-y-0.5' : ''}`} />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-status-offline text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight">{tab.label}</span>
              {isActive && (
                <div className="absolute bottom-1 w-6 h-1 bg-electric-500 rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* 2. Desktop Navigation (Compact Sidebar) */}
      <aside className="hidden md:flex flex-col w-64 bg-navy-800 text-white min-h-screen border-r border-navy-700/60 p-4 fixed left-0 top-0 bottom-0 z-40">
        <div className="flex items-center gap-3 px-2 py-4 mb-6 border-b border-navy-700/50">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-electric-600 to-field-500 flex items-center justify-center font-extrabold text-white text-lg shadow-hud">
            VKU
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-white leading-tight">FIELD MISSION</h1>
            <p className="text-[10px] font-mono tracking-wider text-electric-300 uppercase">VKU Campus Survey</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-semibold text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-electric-500 text-white shadow-md shadow-electric-500/30 font-bold'
                    : 'text-slate-300 hover:bg-navy-700 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </div>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="bg-status-offline text-white text-xs px-2 py-0.5 rounded-full font-extrabold shadow-sm">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 border-t border-navy-700/50 text-[11px] text-slate-400 font-mono px-2">
          <div className="flex items-center justify-between text-slate-300 mb-1">
            <span>OFFLINE ENGINE</span>
            <span className="text-field-400 font-bold">READY</span>
          </div>
          <p className="text-[10px] text-slate-500">VKU Mobile Expeditions v2.0</p>
        </div>
      </aside>
    </>
  );
};
