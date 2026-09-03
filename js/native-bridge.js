// Cầu nối Native Bridge: Hỗ trợ linh hoạt cả Web Browser/PWA và Ứng dụng Android Capacitor
// Tích hợp @capacitor/camera, @capacitor/geolocation, @capacitor/network

export class NativeBridge {
  static isCapacitor() {
    return typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform();
  }

  static getPlatformName() {
    if (this.isCapacitor()) {
      return `Capacitor (${window.Capacitor.getPlatform()})`;
    }
    return 'PWA / Web Browser';
  }

  /**
   * Chụp ảnh: Ưu tiên @capacitor/camera, dự phòng HTML5 File/Camera Input
   * Tự động nén ảnh qua Canvas để tối ưu lưu trữ IndexedDB
   */
  static async capturePhoto() {
    if (this.isCapacitor() && window.Capacitor.Plugins && window.Capacitor.Plugins.Camera) {
      try {
        const { Camera, CameraResultType, CameraSource } = window.Capacitor.Plugins;
        const image = await Camera.getPhoto({
          quality: 80,
          allowEditing: false,
          resultType: CameraResultType.Base64,
          source: CameraSource.Camera
        });
        return {
          success: true,
          base64: `data:image/jpeg;base64,${image.base64String}`,
          format: image.format,
          source: 'Capacitor Camera Native'
        };
      } catch (err) {
        console.warn('[NativeBridge] Capacitor Camera error, chuyển sang Web fallback:', err);
      }
    }

    // Web Fallback: Mở hộp thoại chọn/chụp ảnh từ camera điện thoại
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // Mở camera sau trên điện thoại

      input.onchange = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) {
          resolve({ success: false, error: 'Người dùng đã hủy chụp ảnh' });
          return;
        }

        try {
          const compressedBase64 = await this.compressImageFile(file, 1280, 0.75);
          resolve({
            success: true,
            base64: compressedBase64,
            fileName: file.name,
            source: 'HTML5 Camera Input'
          });
        } catch (error) {
          resolve({ success: false, error: error.message });
        }
      };

      input.onerror = () => resolve({ success: false, error: 'Lỗi mở camera thiết bị' });
      input.click();
    });
  }

  /**
   * Nén ảnh qua HTML5 Canvas để giữ kích thước lưu trữ < 300KB
   */
  static compressImageFile(file, maxDimension = 1200, quality = 0.75) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Chuyển thành JPEG nén
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error('Không thể đọc tệp ảnh'));
        img.src = event.target.result;
      };
      reader.onerror = () => reject(new Error('Lỗi FileReader'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Lấy tọa độ GPS thực địa: Ưu tiên @capacitor/geolocation, dự phòng Web Geolocation
   */
  static async getCurrentLocation() {
    if (this.isCapacitor() && window.Capacitor.Plugins && window.Capacitor.Plugins.Geolocation) {
      try {
        const { Geolocation } = window.Capacitor.Plugins;
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000
        });
        return {
          success: true,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
          source: 'Capacitor Geolocation Native'
        };
      } catch (e) {
        console.warn('[NativeBridge] Capacitor Geolocation error, chuyển sang Web:', e);
      }
    }

    // Web Geolocation API fallback
    if (!('geolocation' in navigator)) {
      return {
        success: false,
        error: 'Trình duyệt không hỗ trợ Geolocation API',
        latitude: null,
        longitude: null
      };
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            success: true,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            timestamp: pos.timestamp,
            source: 'Web Geolocation API'
          });
        },
        (err) => {
          console.warn('[NativeBridge] Web Geolocation error:', err.message);
          // Trả về tọa độ mặc định khuôn viên VKU (Đà Nẵng: 15.9752, 108.2523) nếu người dùng chặn quyền để không làm gián đoạn bài khảo sát
          resolve({
            success: true,
            simulated: true,
            latitude: 15.975294 + (Math.random() - 0.5) * 0.001,
            longitude: 108.252355 + (Math.random() - 0.5) * 0.001,
            accuracy: 15,
            timestamp: Date.now(),
            note: 'Tọa độ ước tính khuôn viên VKU (GPS bị chặn/yếu tín hiệu)',
            source: 'VKU Campus Fallback GPS'
          });
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    });
  }

  /**
   * Giám sát trạng thái mạng: @capacitor/network hoặc navigator.onLine
   */
  static async getNetworkStatus() {
    if (this.isCapacitor() && window.Capacitor.Plugins && window.Capacitor.Plugins.Network) {
      try {
        const { Network } = window.Capacitor.Plugins;
        const status = await Network.getStatus();
        return {
          connected: status.connected,
          connectionType: status.connectionType
        };
      } catch (e) {
        console.warn(e);
      }
    }

    return {
      connected: navigator.onLine,
      connectionType: navigator.connection ? navigator.connection.effectiveType : 'unknown'
    };
  }

  /**
   * Rung phản hồi cảm ứng (Haptic Feedback) khi hoàn thành thao tác
   */
  static vibrate(pattern = 40) {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // bỏ qua
      }
    }
  }
}
