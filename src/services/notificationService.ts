import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';

export class NotificationService {
  private static isInitialized = false;

  /**
   * Khởi tạo và yêu cầu cấp quyền Push & Local Notifications
   */
  static async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 1. Kiểm tra và yêu cầu quyền Push Notifications
      const pushStatus = await PushNotifications.checkPermissions();
      if (pushStatus.receive !== 'granted') {
        await PushNotifications.requestPermissions();
      }

      await PushNotifications.register();

      PushNotifications.addListener('registration', (token) => {
        console.log('[NotificationService] Registered Push Token:', token.value);
      });

      PushNotifications.addListener('registrationError', (err) => {
        console.warn('[NotificationService] Push registration error:', err.error);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[NotificationService] Push received:', notification);
      });

      // 2. Kiểm tra và yêu cầu quyền Local Notifications
      const localStatus = await LocalNotifications.checkPermissions();
      if (localStatus.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }

      this.isInitialized = true;
      console.log('[NotificationService] Khởi tạo hệ thống thông báo thành công');
    } catch (err) {
      console.warn('[NotificationService] Lỗi khởi tạo Notifications (bỏ qua nếu chạy Web):', err);
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
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Math.floor(Date.now() % 100000),
            schedule: { at: new Date(Date.now() + 200) },
            sound: undefined,
            attachments: undefined,
            actionTypeId: '',
            extra: null
          }
        ]
      });
      console.log('[NotificationService] Local Notification scheduled successfully');
    } catch (err) {
      console.warn('[NotificationService] Lỗi bắn Local Notification:', err);
      // Web notification fallback
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
      }
    }
  }
}
