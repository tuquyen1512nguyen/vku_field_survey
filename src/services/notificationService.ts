import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';

export class NotificationService {
  private static isInitialized = false;

  /**
   * Khởi tạo an toàn các dịch vụ Thông báo (tránh crash khi chưa cấu hình Firebase FCM)
   */
  static async init(): Promise<void> {
    if (this.isInitialized) return;

    // 1. Khởi tạo Local Notifications (Thông báo trạng thái đồng bộ)
    try {
      if (Capacitor.isPluginAvailable('LocalNotifications')) {
        const localStatus = await LocalNotifications.checkPermissions();
        if (localStatus.display !== 'granted') {
          await LocalNotifications.requestPermissions();
        }
      }
    } catch (err) {
      console.warn('[NotificationService] Cảnh báo LocalNotifications:', err);
    }

    // 2. Khởi tạo Push Notifications (An toàn nếu chưa có google-services.json)
    try {
      if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('PushNotifications')) {
        const pushStatus = await PushNotifications.checkPermissions();
        if (pushStatus.receive === 'granted') {
          await PushNotifications.register().catch((e) => {
            console.warn('[NotificationService] Bỏ qua đăng ký FCM Push (Chưa gắn Firebase):', e);
          });
        }
      }
    } catch (err) {
      console.warn('[NotificationService] Cảnh báo PushNotifications:', err);
    }

    this.isInitialized = true;
    console.log('[NotificationService] Khởi tạo hệ thống thông báo thành công');
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
