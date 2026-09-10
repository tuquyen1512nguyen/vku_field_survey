import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export class NotificationService {
  private static isInitialized = false;

  /**
   * Khởi tạo an toàn dịch vụ Thông báo cục bộ (Local Notifications)
   */
  static async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (Capacitor.isPluginAvailable('LocalNotifications')) {
        const localStatus = await LocalNotifications.checkPermissions();
        if (localStatus.display !== 'granted') {
          await LocalNotifications.requestPermissions();
        }
      }
      this.isInitialized = true;
      console.log('[NotificationService] Khởi tạo hệ thống thông báo thành công');
    } catch (err) {
      console.warn('[NotificationService] Cảnh báo LocalNotifications:', err);
    }
  }

  /**
   * Bắn thông báo khi hoàn thành đồng bộ dữ liệu ngoại tuyến thành công
   */
  static async sendSyncSuccessNotification(syncedCount: number): Promise<void> {
    if (syncedCount <= 0) return;

    const title = '⚡ Đồng bộ thành công! (VKU Field Survey)';
    const body = `Đã đồng bộ thành công ${syncedCount} phiếu khảo sát hiện trường lên máy chủ.`;

    try {
      if (Capacitor.isPluginAvailable('LocalNotifications')) {
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body,
              id: Math.floor(Date.now() % 100000),
              schedule: { at: new Date(Date.now() + 300) },
              sound: undefined,
              attachments: undefined,
              actionTypeId: '',
              extra: null
            }
          ]
        });
        console.log('[NotificationService] Local Notification scheduled successfully');
      }
    } catch (err) {
      console.warn('[NotificationService] Lỗi bắn Local Notification:', err);
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
      }
    }
  }
}
