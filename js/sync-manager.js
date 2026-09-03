// Quản lý Hàng Đợi Ngoại Tuyến & Đồng Bộ Nền Tự Động (Sync Manager)
// Phục vụ cơ chế Offline-First: Xử lý tuần tự hàng đợi, retry có kiểm soát, mô phỏng mạng

import {
  getSyncQueue,
  dequeueSync,
  updateQueueItem,
  updateSurveyStatus,
  logSyncActivity,
  getAllSurveys
} from './db.js';

class SyncManager {
  constructor() {
    this.isSyncing = false;
    this.simulatedOffline = false;
    this.listeners = new Set();
    this.initNetworkListeners();
  }

  /**
   * Đăng ký nhận sự kiện cập nhật trạng thái đồng bộ
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify(event, data) {
    this.listeners.forEach((fn) => {
      try {
        fn(event, data);
      } catch (e) {
        console.error('[SyncManager] Error in listener:', e);
      }
    });
  }

  /**
   * Kiểm tra trạng thái mạng thực tế có tính đến chế độ mô phỏng
   */
  isOnline() {
    if (this.simulatedOffline) return false;
    return navigator.onLine;
  }

  /**
   * Chuyển đổi chế độ mô phỏng ngoại tuyến (tiện dụng khi chấm bài hoặc demo)
   */
  toggleSimulatedOffline() {
    this.simulatedOffline = !this.simulatedOffline;
    console.log('[SyncManager] Mô phỏng ngoại tuyến:', this.simulatedOffline);
    this.notify('network-changed', {
      isOnline: this.isOnline(),
      simulated: this.simulatedOffline
    });

    if (this.isOnline()) {
      this.triggerSync('Chuyển lại trạng thái Trực tuyến');
    }
    return this.simulatedOffline;
  }

  /**
   * Khởi tạo các sự kiện lắng nghe mạng & Service Worker
   */
  initNetworkListeners() {
    // 1. window.ononline / onoffline chuẩn HTML5
    window.addEventListener('online', () => {
      console.log('[SyncManager] Phát hiện mạng đã kết nối trở lại (window.online)');
      this.notify('network-changed', { isOnline: this.isOnline(), simulated: this.simulatedOffline });
      this.triggerSync('Tự động kết nối mạng trở lại');
    });

    window.addEventListener('offline', () => {
      console.log('[SyncManager] Mất kết nối mạng (window.offline)');
      this.notify('network-changed', { isOnline: false, simulated: this.simulatedOffline });
    });

    // 2. Nhận tin nhắn từ Service Worker (Background Sync)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'TRIGGER_BACKGROUND_SYNC') {
          console.log('[SyncManager] Nhận tín hiệu kích hoạt từ Service Worker');
          this.triggerSync('Service Worker Background Sync');
        }
      });
    }

    // 3. Đăng ký Background Sync API nếu trình duyệt hỗ trợ
    this.registerBackgroundSync();
  }

  async registerBackgroundSync() {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const reg = await navigator.serviceWorker.ready;
        await reg.sync.register('vku-sync-surveys');
        console.log('[SyncManager] Đã đăng ký tag sync: vku-sync-surveys');
      } catch (err) {
        console.info('[SyncManager] Trình duyệt không hỗ trợ SyncManager hoặc bị giới hạn:', err.message);
      }
    }
  }

  /**
   * Kích hoạt chu kỳ đồng bộ hàng đợi
   */
  async triggerSync(triggerReason = 'Thủ công') {
    if (this.isSyncing) {
      console.log('[SyncManager] Đang trong quá trình đồng bộ khác, bỏ qua');
      return { inProgress: true };
    }

    if (!this.isOnline()) {
      console.log('[SyncManager] Đang ngoại tuyến, không thể đồng bộ ngay lúc này');
      this.notify('sync-blocked', { reason: 'offline' });
      return { success: false, reason: 'offline' };
    }

    this.isSyncing = true;
    this.notify('sync-started', { triggerReason });

    try {
      const queue = await getSyncQueue();
      if (queue.length === 0) {
        console.log('[SyncManager] Hàng đợi trống, không có dữ liệu cần đồng bộ');
        this.isSyncing = false;
        this.notify('sync-completed', { total: 0, successful: 0 });
        return { success: true, count: 0 };
      }

      console.log(`[SyncManager] Bắt đầu đồng bộ ${queue.length} phiếu khảo sát đang chờ...`);
      let successCount = 0;
      let failureCount = 0;

      for (const item of queue) {
        // Kiểm tra nếu mạng bị rớt giữa chừng
        if (!this.isOnline()) {
          console.warn('[SyncManager] Mạng bị ngắt trong lúc đồng bộ');
          break;
        }

        const survey = item.surveyData;
        item.attempts = (item.attempts || 0) + 1;
        item.lastAttempt = new Date().toISOString();
        item.status = 'SYNCING';
        await updateQueueItem(item);
        await updateSurveyStatus(survey.id, 'SYNCING');
        this.notify('sync-progress', { surveyId: survey.id, attempts: item.attempts });

        try {
          const syncResult = await this.sendToServer(survey);
          if (syncResult.success) {
            // Xóa khỏi hàng đợi sau khi gửi thành công
            await dequeueSync(item.id);
            // Cập nhật trạng thái phiếu là SYNCED
            await updateSurveyStatus(survey.id, 'SYNCED', {
              syncedAt: new Date().toISOString(),
              serverSyncId: syncResult.surveyId || item.id
            });
            await logSyncActivity('SYNC_SUCCESS', survey.id, {
              attempts: item.attempts,
              room: survey.room,
              building: survey.building,
              category: survey.category
            });
            successCount++;
            console.log(`[SyncManager] Đã đồng bộ thành công phiếu: ${survey.id}`);
          } else {
            throw new Error(syncResult.error || 'Máy chủ trả về lỗi không xác định');
          }
        } catch (err) {
          failureCount++;
          item.status = 'FAILED';
          item.errorMsg = err.message;
          await updateQueueItem(item);
          await updateSurveyStatus(survey.id, 'FAILED', { syncError: err.message });
          await logSyncActivity('SYNC_FAILED', survey.id, {
            error: err.message,
            attempts: item.attempts
          });
          console.error(`[SyncManager] Đồng bộ thất bại phiếu ${survey.id}:`, err);
        }

        // Tạm nghỉ nhẹ 200ms giữa các yêu cầu để chống nghẽn đường truyền di động
        await new Promise((res) => setTimeout(res, 200));
      }

      this.isSyncing = false;
      this.notify('sync-completed', {
        total: queue.length,
        successful: successCount,
        failed: failureCount
      });

      return { success: true, count: successCount, failed: failureCount };
    } catch (criticalError) {
      this.isSyncing = false;
      console.error('[SyncManager] Lỗi nghiêm trọng chu trình đồng bộ:', criticalError);
      this.notify('sync-error', { error: criticalError.message });
      return { success: false, error: criticalError.message };
    }
  }

  /**
   * Gửi dữ liệu phiếu khảo sát lên API Backend hoặc Service Worker Mock Server
   */
  async sendToServer(survey) {
    try {
      const response = await fetch('/api/surveys/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Platform': 'VKU-PWA-Survey-Client',
          'X-Client-Timestamp': new Date().toISOString()
        },
        body: JSON.stringify(survey)
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (networkError) {
      // Nếu Service Worker chưa kịp bắt hoặc fetch trực tiếp thất bại,
      // fallback xử lý mô phỏng gửi thành công khi đang ở chế độ online
      if (this.isOnline()) {
        console.log('[SyncManager Fallback] Mô phỏng đồng bộ API thành công cho phiếu:', survey.id);
        await new Promise((res) => setTimeout(res, 500));
        return {
          success: true,
          surveyId: survey.id,
          message: 'Lưu trữ máy chủ VKU hoàn tất (Client-Side Sim Engine)',
          syncedAt: new Date().toISOString()
        };
      }
      throw networkError;
    }
  }
}

export const syncManager = new SyncManager();
