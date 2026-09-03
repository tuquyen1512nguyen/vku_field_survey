import React from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';

interface OfflineBadgeProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  isSimulatedOffline: boolean;
  onToggleSimulate: () => void;
  onOpenSyncCenter: () => void;
}

export const OfflineBadge: React.FC<OfflineBadgeProps> = ({
  isOnline,
  isSyncing,
  pendingCount,
  isSimulatedOffline,
  onToggleSimulate,
  onOpenSyncCenter,
}) => {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white/80 dark:bg-navy-800/80 backdrop-blur-md border-b border-slate-200/80 dark:border-navy-700/80 sticky top-0 z-30 transition-colors">
      {/* 1. Status Indicator Chip */}
      <div className="flex items-center gap-2">
        {isSyncing ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-electric-300/20 text-electric-600 dark:text-electric-400 text-xs font-bold border border-electric-400/30 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>🔄 BACK ONLINE · SYNCING...</span>
          </div>
        ) : isOnline ? (
          pendingCount > 0 ? (
            <button
              onClick={onOpenSyncCenter}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-xs font-bold border border-amber-300/50 hover:bg-amber-100 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>🟠 {pendingCount} PENDING SYNC</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-300/50">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>🟢 ONLINE ● Connected</span>
            </div>
          )
        ) : (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-xs font-bold border border-rose-300/50">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>📴 OFFLINE · SAVED LOCALLY</span>
          </div>
        )}
      </div>

      {/* 2. Simulation Switch & Action */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSimulate}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
            isSimulatedOffline
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-navy-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
          title="Bật/Tắt mô phỏng ngoại tuyến để thử nghiệm tính năng"
        >
          {isSimulatedOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
          <span>{isSimulatedOffline ? 'Exit Offline Sim' : 'Simulate Offline'}</span>
        </button>
      </div>
    </div>
  );
};
