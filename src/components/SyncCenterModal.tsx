import React, { useState, useEffect } from 'react';
import { X, RefreshCw, CheckCircle2, Clock, AlertTriangle, Database, UploadCloud } from 'lucide-react';
import { syncService } from '../services/syncService';
import { getSyncQueue, getAllSurveys } from '../services/indexedDB';
import { SyncQueueItem, Survey } from '../types';

interface SyncCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncCompleted: () => void;
}

export const SyncCenterModal: React.FC<SyncCenterModalProps> = ({
  isOpen,
  onClose,
  onSyncCompleted,
}) => {
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);
  const [allSurveys, setAllSurveys] = useState<Survey[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);

  const refreshData = async () => {
    const q = await getSyncQueue();
    const s = await getAllSurveys();
    setQueue(q);
    setAllSurveys(s);
  };

  useEffect(() => {
    if (isOpen) {
      refreshData();
    }

    const unsubscribe = syncService.subscribe((event, data) => {
      if (event === 'sync-started') {
        setIsSyncing(true);
        setProgressPercent(10);
      } else if (event === 'sync-progress') {
        const p = data as { percent: number };
        setProgressPercent(p.percent);
        refreshData();
      } else if (event === 'sync-completed') {
        setIsSyncing(false);
        setProgressPercent(100);
        refreshData();
        onSyncCompleted();
      }
    });

    return unsubscribe;
  }, [isOpen]);

  const handleSyncNow = async () => {
    if (!syncService.isOnline()) {
      alert('Thiết bị đang ngoại tuyến. Vui lòng kết nối mạng để đồng bộ dữ liệu.');
      return;
    }
    await syncService.syncAll('Thủ công từ Sync Center');
  };

  if (!isOpen) return null;

  const totalLocal = allSurveys.length;
  const waitingCount = queue.length;
  const syncedCount = allSurveys.filter((s) => s.syncStatus === 'synced').length;
  const failedCount = queue.filter((q) => q.status === 'failed').length;

  return (
    <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-navy-800 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-navy-700 overflow-hidden flex flex-col max-h-[85vh]">
        {/* 1. Header */}
        <div className="p-5 border-b border-slate-100 dark:border-navy-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-electric-50 dark:bg-electric-950/50 flex items-center justify-center text-electric-600 dark:text-electric-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-navy-900 dark:text-white">Trung Tâm Đồng Bộ (Sync Center)</h3>
              <p className="text-xs text-slate-500 font-mono">VKU CLOUD DISPATCHER</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-navy-700 flex items-center justify-center text-slate-500 hover:text-navy-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Stats Grid */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="grid grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-navy-700/50 border border-slate-200/60 dark:border-navy-600/60 text-center">
              <Database className="w-4 h-4 mx-auto text-slate-500 mb-1" />
              <div className="text-lg font-extrabold font-mono text-navy-900 dark:text-white">{totalLocal}</div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase">Local</div>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-center">
              <Clock className="w-4 h-4 mx-auto text-amber-500 mb-1" />
              <div className="text-lg font-extrabold font-mono text-amber-600">{waitingCount}</div>
              <div className="text-[10px] font-semibold text-amber-600 uppercase">Waiting</div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 text-center">
              <CheckCircle2 className="w-4 h-4 mx-auto text-emerald-500 mb-1" />
              <div className="text-lg font-extrabold font-mono text-emerald-600">{syncedCount}</div>
              <div className="text-[10px] font-semibold text-emerald-600 uppercase">Synced</div>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 text-center">
              <AlertTriangle className="w-4 h-4 mx-auto text-rose-500 mb-1" />
              <div className="text-lg font-extrabold font-mono text-rose-600">{failedCount}</div>
              <div className="text-[10px] font-semibold text-rose-600 uppercase">Failed</div>
            </div>
          </div>

          {/* Progress bar if syncing */}
          {isSyncing && (
            <div className="p-4 rounded-xl bg-electric-50 dark:bg-electric-950/40 border border-electric-200 dark:border-electric-900/40">
              <div className="flex justify-between items-center text-xs font-bold text-electric-700 dark:text-electric-300 mb-2">
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Đang đồng bộ dữ liệu lên máy chủ VKU...
                </span>
                <span className="font-mono">{progressPercent}%</span>
              </div>
              <div className="w-full h-2.5 bg-electric-200 dark:bg-electric-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-electric-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Queue Listing */}
          <div>
            <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-2">
              Danh sách hàng đợi chờ đồng bộ ({waitingCount})
            </h4>
            {waitingCount === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-navy-700 text-center text-slate-400 text-xs">
                ✨ Tuyệt vời! Tất cả dữ liệu khảo sát đã được đồng bộ an toàn.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-navy-700/50 border border-slate-200/80 dark:border-navy-600/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-navy-800 dark:text-white">
                        {item.surveyData.building} — Phòng {item.surveyData.room}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {item.surveyData.facilityType} | {new Date(item.createdAt).toLocaleTimeString('vi-VN')}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-bold font-mono uppercase">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-navy-900/60 text-[11px] text-slate-500 flex items-start gap-2">
            <span className="text-sm">🛡️</span>
            <span>
              <strong>Bảo toàn tuyệt đối:</strong> Dù tắt trình duyệt, mất pin hay mất mạng, mọi bài khảo sát vẫn được lưu trữ nguyên vẹn trong <strong>IndexedDB</strong> và sẽ tự động gửi đi ngay khi phát hiện có mạng trở lại.
            </span>
          </div>
        </div>

        {/* 3. Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-navy-700 flex justify-end gap-2 bg-slate-50/50 dark:bg-navy-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200/60"
          >
            Đóng
          </button>
          <button
            onClick={handleSyncNow}
            disabled={isSyncing || waitingCount === 0}
            className="px-5 py-2.5 rounded-xl bg-electric-500 hover:bg-electric-600 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-electric-500/20 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>SYNC NOW ({waitingCount})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
