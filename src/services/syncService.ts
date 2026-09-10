// Dịch vụ Đồng Bộ Thông Minh Ngoại Tuyến (Sync Service)
import { getSyncQueue, removeFromSyncQueue, updateSurveyStatus, updateSyncQueueItem } from './indexedDB';
import { ApiService } from './api';
import { NotificationService } from './notificationService';
import { SyncStatus } from '../types';

export type SyncEventType =
  | 'status-changed'
  | 'sync-started'
  | 'sync-progress'
  | 'sync-completed'
  | 'sync-failed';

export interface SyncProgressData {
  total: number;
  completed: number;
  currentSurveyId?: string;
  percent: number;
}

type SyncListener = (event: SyncEventType, data?: unknown) => void;

class SyncService {
  private isSyncing = false;
  private simulatedOffline = false;
  private listeners: Set<SyncListener> = new Set();

  constructor() {
    this.initNetworkListeners();
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(event: SyncEventType, data?: unknown): void {
    this.listeners.forEach((fn) => {
      try {
        fn(event, data);
      } catch (err) {
        console.error('[SyncService] Listener error:', err);
      }
    });
  }

  public isOnline(): boolean {
    if (this.simulatedOffline) return false;
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  public toggleSimulatedOffline(): boolean {
    this.simulatedOffline = !this.simulatedOffline;
    console.log('[SyncService] Chế độ mô phỏng mất mạng:', this.simulatedOffline);
    this.notify('status-changed', { isOnline: this.isOnline(), simulated: this.simulatedOffline });

    if (this.isOnline()) {
      this.syncAll('Khôi phục kết nối mạng');
    }
    return this.simulatedOffline;
  }

  private initNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('[SyncService] window.online: Khôi phục kết nối mạng!');
      this.notify('status-changed', { isOnline: this.isOnline() });
      this.syncAll('Tự động đồng bộ khi khôi phục mạng');
    });

    window.addEventListener('offline', () => {
      console.log('[SyncService] window.offline: Mất kết nối mạng!');
      this.notify('status-changed', { isOnline: false });
    });
  }

  /**
   * Kích hoạt chu trình xử lý toàn bộ hàng đợi đồng bộ
   */
  public async syncAll(triggerReason = 'Thủ công'): Promise<{ success: boolean; syncedCount: number; failedCount: number }> {
    if (this.isSyncing) {
      console.log('[SyncService] Đang trong chu kỳ đồng bộ khác');
      return { success: false, syncedCount: 0, failedCount: 0 };
    }

    if (!this.isOnline()) {
      console.warn('[SyncService] Thiết bị đang ngoại tuyến, hoãn đồng bộ');
      this.notify('sync-failed', { reason: 'offline' });
      return { success: false, syncedCount: 0, failedCount: 0 };
    }

    const queue = await getSyncQueue();
    if (queue.length === 0) {
      this.notify('sync-completed', { total: 0, synced: 0 });
      return { success: true, syncedCount: 0, failedCount: 0 };
    }

    this.isSyncing = true;
    this.notify('sync-started', { total: queue.length, triggerReason });

    let syncedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < queue.length; i++) {
      if (!this.isOnline()) break;

      const item = queue[i];
      const survey = item.surveyData;

      // Cập nhật trạng thái đang tải lên
      item.status = 'syncing';
      item.attempts += 1;
      item.lastAttempt = new Date().toISOString();
      await updateSyncQueueItem(item);
      await updateSurveyStatus(survey.id, 'syncing');

      const progress: SyncProgressData = {
        total: queue.length,
        completed: i,
        currentSurveyId: survey.id,
        percent: Math.round(((i + 1) / queue.length) * 100)
      };
      this.notify('sync-progress', progress);

      try {
        const uploadResult = await ApiService.uploadSurvey(survey);
        if (uploadResult.success) {
          // Xóa khỏi hàng đợi và cập nhật trạng thái thành công
          await removeFromSyncQueue(item.id);
          await updateSurveyStatus(survey.id, 'synced');
          syncedCount++;
        } else {
          throw new Error(uploadResult.message || 'Lỗi tải lên máy chủ');
        }
      } catch (err: unknown) {
        failedCount++;
        const msg = err instanceof Error ? err.message : 'Lỗi đồng bộ';
        item.status = 'failed';
        item.errorMsg = msg;
        await updateSyncQueueItem(item);
        await updateSurveyStatus(survey.id, 'failed', msg);
      }
    }

    this.isSyncing = false;
    this.notify('sync-completed', { total: queue.length, synced: syncedCount, failed: failedCount });

    if (syncedCount > 0) {
      NotificationService.sendSyncSuccessNotification(syncedCount);
    }

    return { success: true, syncedCount, failedCount };
  }
}

export const syncService = new SyncService();
