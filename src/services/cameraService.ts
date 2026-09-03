// Dịch vụ Máy ảnh Hiện Trường Chuyên Nghiệp (Camera Service & Watermark Overlay)
import { SurveyPhoto, GPSCoordinates } from '../types';

export class CameraService {
  /**
   * Nén ảnh và vẽ lớp thông tin giám định hiện trường (Watermark Overlay)
   */
  static async processPhotoWithMetadata(
    file: File | Blob,
    metadata: {
      surveyId?: string;
      gps?: GPSCoordinates;
      locationName?: string;
    }
  ): Promise<SurveyPhoto> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Tính toán tỉ lệ chuẩn (giới hạn cạnh dài 1280px)
          let width = img.width;
          let height = img.height;
          const maxDim = 1280;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Không thể khởi tạo Canvas 2D'));
            return;
          }

          // 1. Vẽ ảnh gốc
          ctx.drawImage(img, 0, 0, width, height);

          // 2. Vẽ dải nền Watermark bán trong suốt ở chân ảnh
          const barHeight = Math.max(50, Math.round(height * 0.09));
          const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
          gradient.addColorStop(0, 'rgba(11, 19, 43, 0.85)');
          gradient.addColorStop(1, 'rgba(7, 12, 24, 0.95)');

          ctx.fillStyle = gradient;
          ctx.fillRect(0, height - barHeight, width, barHeight);

          // 3. Đường chỉ viền xanh công nghệ
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(0, height - barHeight);
          ctx.lineTo(width, height - barHeight);
          ctx.stroke();

          // 4. Viết chữ Watermark giám định
          const fontSize = Math.max(12, Math.round(barHeight * 0.28));
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${fontSize}px "Plus Jakarta Sans", sans-serif`;

          const nowStr = new Date().toLocaleString('vi-VN');
          const surveyIdStr = metadata.surveyId ? `#${metadata.surveyId}` : 'VKU-AUDIT';

          // Cột trái: Tên nhiệm vụ & Khảo sát
          ctx.fillText(`VKU FIELD MISSION ${surveyIdStr}`, 16, height - barHeight + fontSize + 6);
          ctx.font = `${Math.max(10, Math.round(fontSize * 0.82))}px "JetBrains Mono", monospace`;
          ctx.fillStyle = '#38bdf8';
          ctx.fillText(`THỜI GIAN: ${nowStr}`, 16, height - 10);

          // Cột phải: Tọa độ GPS
          if (metadata.gps) {
            const gpsStr = `GPS: ${metadata.gps.latitude.toFixed(5)}, ${metadata.gps.longitude.toFixed(5)}`;
            ctx.fillStyle = '#10b981';
            const textWidth = ctx.measureText(gpsStr).width;
            ctx.fillText(gpsStr, width - textWidth - 16, height - 10);
          }

          // 5. Xuất ảnh JPEG chất lượng cao tối ưu
          const base64 = canvas.toDataURL('image/jpeg', 0.8);
          resolve({
            id: 'photo-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            base64,
            timestamp: Date.now(),
            surveyId: metadata.surveyId,
            gps: metadata.gps
              ? { latitude: metadata.gps.latitude, longitude: metadata.gps.longitude }
              : undefined
          });
        };

        img.onerror = () => reject(new Error('Lỗi tải dữ liệu ảnh'));
        img.src = e.target?.result as string;
      };

      reader.onerror = () => reject(new Error('Lỗi FileReader'));
      reader.readAsDataURL(file);
    });
  }
}
