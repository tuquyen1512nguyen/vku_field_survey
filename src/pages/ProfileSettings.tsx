import React, { useState, useEffect } from 'react';
import {
  User,
  Moon,
  Sun,
  RefreshCw,
  Compass,
  Trash2,
  Download,
  ShieldCheck,
  CheckCircle2,
  HardDrive
} from 'lucide-react';
import { UserSettings, Survey } from '../types';
import { getStorageEstimate } from '../services/indexedDB';

interface ProfileSettingsProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  surveys: Survey[];
  onClearData: () => void;
  onInstallPWA: () => void;
  canInstallPWA: boolean;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  settings,
  onUpdateSettings,
  surveys,
  onClearData,
  onInstallPWA,
  canInstallPWA,
}) => {
  const [storageUsage, setStorageUsage] = useState<string>('Đang tính...');

  useEffect(() => {
    getStorageEstimate().then(setStorageUsage);
  }, [surveys]);

  const totalSurveys = surveys.length;
  const goodCount = surveys.filter((s) => s.condition === 'GOOD').length;
  const issueCount = surveys.filter((s) => s.condition === 'DAMAGED' || s.condition === 'NEEDS_ATTENTION').length;

  return (
    <div className="space-y-6 pb-20 max-w-3xl mx-auto">
      {/* 1. Inspector Badge Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-navy-800 to-navy-900 text-white border border-navy-700 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-electric-600 to-field-500 flex items-center justify-center text-white text-2xl font-extrabold shadow-hud">
            VKU
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-field-500/20 text-field-400 text-[10px] font-bold font-mono uppercase mb-1">
              <span>● AUDITOR LEVEL 1</span>
            </div>
            <h3 className="font-extrabold text-xl">{settings.auditorName}</h3>
            <p className="text-xs text-slate-300 font-mono">
              MSSV: {settings.studentId} | {settings.department}
            </p>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 text-right">
          <div className="text-[10px] font-mono text-electric-300 uppercase">FIELD VERSION</div>
          <div className="text-sm font-extrabold font-mono">v2.0.4 PWA</div>
        </div>
      </div>

      {/* 2. Field Audit Statistics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-center">
          <div className="text-2xl font-extrabold font-mono text-electric-600 dark:text-electric-400">{totalSurveys}</div>
          <div className="text-[11px] font-bold text-slate-500 uppercase mt-0.5">Tổng phiếu đã làm</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-center">
          <div className="text-2xl font-extrabold font-mono text-emerald-600">{goodCount}</div>
          <div className="text-[11px] font-bold text-slate-500 uppercase mt-0.5">Điểm đạt chuẩn</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-center">
          <div className="text-2xl font-extrabold font-mono text-rose-600">{issueCount}</div>
          <div className="text-[11px] font-bold text-slate-500 uppercase mt-0.5">Điểm có sự cố</div>
        </div>
      </div>

      {/* 3. PWA Install Dedicated Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-electric-50 to-sky-50 dark:from-navy-800 dark:to-navy-900 border-2 border-electric-300 dark:border-electric-800/60 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-electric-700 dark:text-electric-400 uppercase font-mono">
            <span>📦 TAKE VKU SURVEY OFFLINE</span>
          </div>
          <h4 className="font-extrabold text-base text-navy-900 dark:text-white">
            Cài đặt Ứng dụng về Màn hình chính
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">
            Cài đặt để tiếp tục chuyến khảo sát tại tầng hầm và các góc khuất không có mạng Internet. Khởi động tức thì trong chưa đầy 1 giây!
          </p>
        </div>

        <button
          onClick={onInstallPWA}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-electric-500 hover:bg-electric-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-electric-500/25 transition-transform active:scale-95 whitespace-nowrap"
        >
          <Download className="w-4 h-4" />
          <span>📲 INSTALL APP</span>
        </button>
      </div>

      {/* 4. System Settings & Toggles */}
      <div className="p-6 rounded-3xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 space-y-5">
        <h4 className="font-extrabold text-sm uppercase text-slate-400 font-mono tracking-wider">
          CẤU HÌNH HỆ THỐNG
        </h4>

        {/* Auto Sync Toggle */}
        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-navy-700/80">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-electric-500" />
            <div>
              <div className="font-bold text-sm text-navy-900 dark:text-white">Tự động đồng bộ (Auto Sync)</div>
              <div className="text-xs text-slate-500">Tự động gửi dữ liệu khi phát hiện kết nối mạng khôi phục</div>
            </div>
          </div>
          <button
            onClick={() => onUpdateSettings({ ...settings, autoSync: !settings.autoSync })}
            className={`w-12 h-6 rounded-full transition-colors relative p-1 ${settings.autoSync ? 'bg-field-500' : 'bg-slate-300 dark:bg-navy-600'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.autoSync ? 'translate-x-6' : ''}`} />
          </button>
        </div>

        {/* High Accuracy GPS Toggle */}
        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-navy-700/80">
          <div className="flex items-center gap-3">
            <Compass className="w-5 h-5 text-electric-500" />
            <div>
              <div className="font-bold text-sm text-navy-900 dark:text-white">GPS độ chính xác cao</div>
              <div className="text-xs text-slate-500">Bật chế độ quét vệ tinh đa kênh để định vị chính xác phòng học</div>
            </div>
          </div>
          <button
            onClick={() => onUpdateSettings({ ...settings, highAccuracyGPS: !settings.highAccuracyGPS })}
            className={`w-12 h-6 rounded-full transition-colors relative p-1 ${settings.highAccuracyGPS ? 'bg-field-500' : 'bg-slate-300 dark:bg-navy-600'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.highAccuracyGPS ? 'translate-x-6' : ''}`} />
          </button>
        </div>

        {/* Storage Quota */}
        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-navy-700/80">
          <div className="flex items-center gap-3">
            <HardDrive className="w-5 h-5 text-electric-500" />
            <div>
              <div className="font-bold text-sm text-navy-900 dark:text-white">Dung lượng bộ nhớ IndexedDB</div>
              <div className="text-xs text-slate-500">Dữ liệu lưu trữ cục bộ trên thiết bị của bạn</div>
            </div>
          </div>
          <span className="font-mono text-xs font-bold text-navy-900 dark:text-white">{storageUsage}</span>
        </div>

        {/* Clear Cache & Test Data */}
        <div className="flex items-center justify-between py-2 pt-3">
          <div>
            <div className="font-bold text-sm text-rose-600">Dọn dẹp dữ liệu kiểm thử</div>
            <div className="text-xs text-slate-500">Xóa các khảo sát mẫu hoặc dọn sạch IndexedDB</div>
          </div>
          <button
            onClick={onClearData}
            className="px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100 text-xs font-extrabold border border-rose-200 transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa dữ liệu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
