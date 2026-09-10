// API Service Đồng Bộ Dữ Liệu Thực Địa VKU & Google Sheets
import { Survey } from '../types';
import { getSettings } from './indexedDB';

export class ApiService {
  /**
   * Tải bản ghi khảo sát lên Google Sheets qua Apps Script Web App Endpoint
   */
  static async uploadSurvey(survey: Survey): Promise<{ success: boolean; message: string; remoteId: string }> {
    const settings = await getSettings();
    const endpoint = settings.googleScriptUrl?.trim();

    if (endpoint && endpoint.startsWith('http')) {
      try {
        console.log('[ApiService] Đang đẩy phiếu lên Google Sheets:', endpoint);
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(survey),
          redirect: 'follow'
        });

        if (response.ok) {
          const resJson = await response.json().catch(() => ({ result: 'success' }));
          return {
            success: true,
            message: 'Đồng bộ lên Google Sheets thành công!',
            remoteId: resJson.id || survey.id
          };
        }
      } catch (err: unknown) {
        console.warn('[ApiService] Lỗi gửi Google Apps Script, thử mode no-cors:', err);
        try {
          await fetch(endpoint, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(survey)
          });
          return {
            success: true,
            message: 'Đã gửi phiếu lên Google Sheets',
            remoteId: survey.id
          };
        } catch (noCorsErr) {
          console.error('[ApiService] Google Sheets sync failed:', noCorsErr);
          throw new Error('Chưa thể kết nối đến Google Sheets Web App Endpoint.');
        }
      }
    }

    // Nếu chưa cấu hình Google Sheets URL, giả lập tải lên đám mây thành công
    console.log('[ApiService] Chưa cấu hình link Google Sheets, giả lập lưu máy chủ thành công');
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      success: true,
      message: 'Đã giả lập đồng bộ máy chủ (Cần dán Web App URL trong Cài đặt)',
      remoteId: 'CLOUD-' + survey.id
    };
  }
}
