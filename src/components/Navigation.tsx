import React from 'react';
import { LayoutDashboard, FileSpreadsheet, MapPin, TableProperties, Settings } from 'lucide-react';
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
    { id: 'home', label: 'Tổng Quan', icon: LayoutDashboard },
    { id: 'survey', label: '+ Khảo Sát Mới', icon: FileSpreadsheet },
    { id: 'records', label: 'Danh Sách Phiếu', icon: TableProperties, badge: pendingCount },
    { id: 'map', label: 'Bản Đồ VKU', icon: MapPin },
    { id: 'profile', label: 'Cài Đặt', icon: Settings },
  ];

  return (
    <>
      {/* 1. Mobile Navigation (Bottom Tab Bar) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 z-50 flex items-center justify-around px-1 shadow-2xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center h-full relative transition-all duration-200 ${
                isActive ? 'text-sky-400 font-extrabold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110 -translate-y-0.5' : ''}`} />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-amber-500 text-slate-950 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight font-medium">{tab.label}</span>
              {isActive && (
                <div className="absolute bottom-1 w-6 h-1 bg-sky-400 rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* 2. Desktop Navigation (Compact Sidebar) */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-100 min-h-screen border-r border-slate-800 p-4 fixed left-0 top-0 bottom-0 z-40">
        <div className="flex items-center gap-3 px-2 py-4 mb-6 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-emerald-500 flex items-center justify-center font-black text-white text-lg shadow-lg">
            VKU
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-white leading-tight">FIELD SURVEY</h1>
            <p className="text-[10px] font-mono tracking-wider text-sky-400 uppercase">Google Sheets Sync</p>
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
                    ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30 font-bold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </div>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="bg-amber-500 text-slate-950 text-xs px-2 py-0.5 rounded-full font-black shadow-sm">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-800 text-[11px] text-slate-400 font-mono px-2">
          <div className="flex items-center justify-between text-slate-300 mb-1">
            <span>GOOGLE SHEETS SYNC</span>
            <span className="text-emerald-400 font-bold">READY</span>
          </div>
          <p className="text-[10px] text-slate-500">Offline-First Engine v2.5</p>
        </div>
      </aside>
    </>
  );
};
