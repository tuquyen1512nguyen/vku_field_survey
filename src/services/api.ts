// API Service Giả Lập Máy Chủ Trung Tâm VKU (Mock Cloud API)
import { Survey } from '../types';

export class ApiService {
  /**
   * Giả lập gửi bản ghi khảo sát lên máy chủ đám mây VKU
   */
  static async uploadSurvey(survey: Survey): Promise<{ success: boolean; message: string; remoteId: string }> {
    // Giả lập độ trễ mạng thực tế 600ms
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Thử gửi qua Service Worker / Mock API nếu có
    try {
      const res = await fetch('/api/surveys/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(survey)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback giả lập thành công trên client
    }

    return {
      success: true,
      message: 'Lưu trữ máy chủ trường thành công',
      remoteId: 'CLOUD-' + survey.id
    };
  }
}
