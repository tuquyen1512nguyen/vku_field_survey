import React from 'react';
import { Wifi, WifiOff, RefreshCw, Sheet, AlertCircle } from 'lucide-react';

interface OfflineBadgeProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  isSimulatedOffline: boolean;
  googleScriptUrl?: string;
  onToggleSimulate: () => void;
  onOpenSyncCenter: () => void;
}

export const OfflineBadge: React.FC<OfflineBadgeProps> = ({
  isOnline,
  isSyncing,
  pendingCount,
  isSimulatedOffline,
  googleScriptUrl,
  onToggleSimulate,
  onOpenSyncCenter,
}) => {
  const hasSheetConfig = !!googleScriptUrl && googleScriptUrl.trim().length > 0;

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 transition-colors">
      {/* 1. Status Indicator Chip */}
      <div className="flex items-center gap-2 flex-wrap">
        {isSyncing ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold border border-sky-500/30 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>🔄 Đang Đồng Bộ Lên Google Sheets...</span>
          </div>
        ) : isOnline ? (
          pendingCount > 0 ? (
            <button
              onClick={onOpenSyncCenter}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>🟠 {pendingCount} phiếu chờ đồng bộ</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>🟢 Online · Đang kết nối</span>
            </div>
          )
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/30">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            <span>📴 Offline · Đang lưu cục bộ</span>
          </div>
        )}

        {/* Google Sheets Config Warning Pill */}
        {!hasSheetConfig && (
          <div className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-[11px] font-medium border border-slate-700">
            <Sheet className="w-3 h-3 text-emerald-400" />
            <span>Chưa gắn Google Sheet URL</span>
          </div>
        )}
      </div>

      {/* 2. Simulation Switch & Action */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSimulate}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
            isSimulatedOffline
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
          }`}
          title="Bật/Tắt chế độ mô phỏng mất mạng để kiểm thử offline"
        >
          {isSimulatedOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isSimulatedOffline ? 'Thoát Mô Phỏng Offline' : 'Mô Phỏng Offline'}</span>
        </button>
      </div>
    </div>
  );
};
