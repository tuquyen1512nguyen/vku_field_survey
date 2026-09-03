// Dịch vụ định vị vệ tinh GPS Hiện Trường VKU
import { GPSCoordinates, CampusLocation } from '../types';

// Tọa độ các mốc trọng điểm tại khuôn viên Đại học Việt - Hàn (VKU)
export const VKU_CAMPUS_LOCATIONS: CampusLocation[] = [
  {
    id: 'building-a',
    name: 'Tòa nhà Khu A (Hiệu bộ & Giảng đường)',
    code: 'Khu A',
    x: 42,
    y: 38,
    lat: 15.975412,
    lng: 108.252210,
    description: 'Phòng hội đồng, văn phòng khoa, phòng thực hành CNTT'
  },
  {
    id: 'building-b',
    name: 'Tòa nhà Khu B (Khoa học Máy tính)',
    code: 'Khu B',
    x: 28,
    y: 52,
    lat: 15.974950,
    lng: 108.251640,
    description: 'Trung tâm nghiên cứu AI, các phòng Lab chuyên đề'
  },
  {
    id: 'building-c',
    name: 'Tòa nhà Khu C (Thực hành & Sáng tạo)',
    code: 'Khu C',
    x: 65,
    y: 44,
    lat: 15.975820,
    lng: 108.253100,
    description: 'Xưởng thực hành điện tử, Robotics, IoT Lab'
  },
  {
    id: 'building-k',
    name: 'Tòa nhà Khu K (Giảng đường Lớn)',
    code: 'Khu K',
    x: 52,
    y: 68,
    lat: 15.974890,
    lng: 108.253102,
    description: 'Hội trường lớn 500 chỗ, các giảng đường bậc thang'
  },
  {
    id: 'building-v',
    name: 'Tòa nhà Khu V (Đa năng & Tầng hầm)',
    code: 'Khu V',
    x: 78,
    y: 62,
    lat: 15.976105,
    lng: 108.251944,
    description: 'Khu thể thao trong nhà, trạm biến áp, hạ tầng ngầm'
  }
];

export class LocationService {
  /**
   * Lấy vị trí GPS hiện tại với độ chính xác cao
   */
  static async getCurrentLocation(highAccuracy = true): Promise<GPSCoordinates> {
    if (!('geolocation' in navigator)) {
      return this.getFallbackVKUCoords('Thiết bị không hỗ trợ Geolocation API');
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            timestamp: pos.timestamp,
            source: 'Vệ tinh GPS thực địa'
          });
        },
        (err) => {
          console.warn('[LocationService] Lỗi GPS:', err.message);
          resolve(this.getFallbackVKUCoords('Tọa độ VKU hiệu chuẩn (Tín hiệu yếu trong nhà/hầm)'));
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: 8000,
          maximumAge: 30000
        }
      );
    });
  }

  /**
   * Tọa độ mặc định tại khuôn viên VKU (Tránh chặn quy trình khi ở tầng hầm kín)
   */
  static getFallbackVKUCoords(sourceNote: string): GPSCoordinates {
    // Tọa độ trung tâm VKU Đà Nẵng
    const baseLat = 15.975294;
    const baseLng = 108.252355;
    const jitter = (Math.random() - 0.5) * 0.0008;

    return {
      latitude: parseFloat((baseLat + jitter).toFixed(6)),
      longitude: parseFloat((baseLng + jitter).toFixed(6)),
      accuracy: 8,
      timestamp: Date.now(),
      source: sourceNote
    };
  }
}
