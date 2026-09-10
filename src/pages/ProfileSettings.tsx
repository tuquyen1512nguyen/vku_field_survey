import React, { useState } from 'react';
import { Save, Copy, Check, Sheet, Code, User, Database, RefreshCw, Trash2, Smartphone } from 'lucide-react';
import { UserSettings, Survey } from '../types';

interface ProfileSettingsProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => Promise<void>;
  surveys: Survey[];
  onClearData: () => Promise<void>;
  onInstallPWA?: () => void;
  canInstallPWA?: boolean;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  settings,
  onUpdateSettings,
  surveys,
  onClearData,
  onInstallPWA,
  canInstallPWA,
}) => {
  const [auditorName, setAuditorName] = useState(settings.auditorName || 'Nguyễn Văn An');
  const [studentId, setStudentId] = useState(settings.studentId || '21IT001');
  const [department, setDepartment] = useState(settings.department || 'Đội Khảo Sát Số 1 - Khoa CNTT');
  const [auditorPhone, setAuditorPhone] = useState(settings.auditorPhone || '0905123456');

  const [googleScriptUrl, setGoogleScriptUrl] = useState(
    settings.googleScriptUrl || ''
  );
  const [publicSheetUrl, setPublicSheetUrl] = useState(
    settings.publicSheetUrl || ''
  );
  const [autoSyncGoogleSheet, setAutoSyncGoogleSheet] = useState(settings.autoSyncGoogleSheet ?? true);
  const [highAccuracyGPS, setHighAccuracyGPS] = useState(settings.highAccuracyGPS ?? true);

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showCode, setShowCode] = useState(true);

  const googleAppsScriptCode = `// VKU FIELD SURVEY - GOOGLE APPS SCRIPT WEB APP ENDPOINT
function doPost(e) {
  try {
    var contents = e.postData.contents;
    var data = JSON.parse(contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    setupSheetHeaders(sheet);

    var row = [
      data.id || '',
      data.createdAt || new Date().toISOString(),
      data.auditorName || '',
      data.studentId || '',
      data.department || '',
      data.auditorPhone || '',
      data.targetName || '',
      data.targetId || '',
      data.targetPhone || '',
      data.targetType || '',
      (data.building || '') + ' - ' + (data.floor || '') + ' - ' + (data.room || ''),
      data.topic || data.facilityType || '',
      (data.ratingStars ? data.ratingStars + ' Star' : '') + ' (' + (data.condition || '') + ')',
      data.notes || '',
      (data.latitude ? data.latitude.toFixed(6) : '') + ', ' + (data.longitude ? data.longitude.toFixed(6) : ''),
      data.photos && data.photos.length > 0 ? 'Có (' + data.photos.length + ' ảnh)' : 'Không'
    ];

    sheet.appendRow(row);
    return ContentService.createTextOutput(JSON.stringify({ result: "success", id: data.id }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function setupSheetHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Mã Khảo Sát (ID)",
      "Thời Gian Khảo Sát",
      "Họ Tên ĐTV",
      "Mã ĐTV / MSSV",
      "Đơn Vị / Đội",
      "SĐT ĐTV",
      "Tên Đối Tượng",
      "Mã/CCCD Đối Tượng",
      "SĐT Đối Tượng",
      "Loại Đối Tượng",
      "Địa Điểm Thực Địa",
      "Chuyên Đề Khảo Sát",
      "Đánh Giá Chất Lượng",
      "Ý Kiến / Ghi Chú",
      "Tọa Độ GPS Vệ Tinh",
      "Ảnh Minh Chứng"
    ]);
  }
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(googleAppsScriptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdateSettings({
        darkMode: true,
        autoSync: autoSyncGoogleSheet,
        highAccuracyGPS,
        auditorName: auditorName.trim(),
        studentId: studentId.trim(),
        department: department.trim(),
        auditorPhone: auditorPhone.trim(),
        googleScriptUrl: googleScriptUrl.trim(),
        publicSheetUrl: publicSheetUrl.trim(),
        autoSyncGoogleSheet,
      });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Lỗi lưu cài đặt');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-3xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-1">
        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Sheet className="w-6 h-6 text-sky-400" />
          <span>Cấu Hình Hệ Thống & Google Sheets</span>
        </h2>
        <p className="text-xs text-slate-400">
          Thiết lập kết nối bảng tính Google Sheet công khai, hồ sơ điều tra viên và tùy chọn lưu trữ offline
        </p>
      </div>

      {/* 1. Hồ Sơ Mặc Định ĐTV */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-sm font-extrabold text-white uppercase tracking-wider">
          <User className="w-4 h-4 text-sky-400" />
          <span>Hồ Sơ Mặc Định Của Người Đi Khảo Sát</span>
        </div>
        <p className="text-xs text-slate-400">
          Thông tin này sẽ được tự động điền vào mỗi phiếu khảo sát để bạn không phải gõ lại khi đi thực địa.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">Họ tên Điều tra viên</label>
            <input
              type="text"
              value={auditorName}
              onChange={(e) => setAuditorName(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-700 bg-slate-950 text-white font-bold text-sm focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">Mã ĐTV / MSSV</label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-700 bg-slate-950 text-white font-bold text-sm focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">Đội / Nhóm / Đơn vị</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-700 bg-slate-950 text-white font-semibold text-sm focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">SĐT Điều tra viên</label>
            <input
              type="text"
              value={auditorPhone}
              onChange={(e) => setAuditorPhone(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-700 bg-slate-950 text-white font-semibold text-sm focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* 2. Tích Hợp Đồng Bộ Google Sheets */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-sm font-extrabold text-white uppercase tracking-wider">
          <Sheet className="w-4 h-4 text-emerald-400" />
          <span>Tích Hợp Đồng Bộ Google Sheets</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">
              Google Apps Script Web App URL (Endpoint Đồng Bộ)
            </label>
            <input
              type="text"
              value={googleScriptUrl}
              onChange={(e) => setGoogleScriptUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              className="w-full p-3.5 rounded-xl border border-slate-700 bg-slate-950 text-sky-400 font-mono text-xs focus:ring-2 focus:ring-sky-500 outline-none"
            />
            <p className="text-[11px] text-slate-500 mt-1">Dán đường dẫn Web App của Google Apps Script tại đây để dữ liệu tự động ghi vào Sheet.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">
              Link Xem Bảng Tính Google Sheet Công Khai (Public View URL)
            </label>
            <input
              type="text"
              value={publicSheetUrl}
              onChange={(e) => setPublicSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/1_.../edit"
              className="w-full p-3.5 rounded-xl border border-slate-700 bg-slate-950 text-emerald-400 font-mono text-xs focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>

          {/* Toggle Auto Sync */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <div className="text-xs font-bold text-white">Tự động gửi lên Google Sheets khi Online</div>
              <div className="text-[11px] text-slate-400">Tự động đẩy phiếu từ hàng đợi máy lên Google Sheet khi khôi phục kết nối Internet.</div>
            </div>
            <input
              type="checkbox"
              checked={autoSyncGoogleSheet}
              onChange={(e) => setAutoSyncGoogleSheet(e.target.checked)}
              className="w-5 h-5 accent-sky-500 rounded cursor-pointer"
            />
          </div>

          {/* Code Apps Script Block */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Code className="w-4 h-4 text-amber-400" />
                <span>Mã Google Apps Script Tự Động Ghi Sheet</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCode(!showCode)}
                  className="text-xs text-slate-400 hover:text-white underline"
                >
                  {showCode ? 'Ẩn mã' : 'Xem mã'}
                </button>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Đã Copy Mã!' : 'Copy Mã Apps Script'}</span>
                </button>
              </div>
            </div>

            {showCode && (
              <pre className="p-3.5 rounded-xl bg-slate-900 text-sky-300 font-mono text-[11px] overflow-x-auto border border-slate-800 leading-relaxed">
                {googleAppsScriptCode}
              </pre>
            )}

            <div className="text-xs text-slate-400 space-y-1 pt-1">
              <div className="font-bold text-white">Cách cài đặt 6 bước:</div>
              <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-slate-400">
                <li>Mở Google Sheets của bạn &gt; vào <strong>Tiện ích mở rộng (Extensions) &gt; Apps Script</strong>.</li>
                <li>Dán đoạn mã phía trên vào và bấm Lưu.</li>
                <li>Bấm <strong>Deploy &gt; New deployment</strong>.</li>
                <li>Mục Select type: Chọn <strong>Web app</strong>.</li>
                <li>Mục Who has access: Chọn <strong>Anyone (Bất kỳ ai)</strong>.</li>
                <li>Bấm Deploy, cấp quyền và copy <strong>Web App URL</strong> dán vào ô bên trên.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Quản Lý Bộ Nhớ Máy (IndexedDB) & PWA */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-sm font-extrabold text-white uppercase tracking-wider">
          <Database className="w-4 h-4 text-purple-400" />
          <span>Quản Lý Bộ Nhớ Máy (IndexedDB) & App</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-950 border border-slate-800">
          <div>
            <div className="text-xs font-bold text-white">Số lượng phiếu đang lưu trên máy</div>
            <div className="text-[11px] text-slate-400">Tổng cộng {surveys.length} bản ghi khảo sát trong cơ sở dữ liệu IndexedDB.</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClearData}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xóa Hết DB</span>
            </button>
          </div>
        </div>

        {canInstallPWA && onInstallPWA && (
          <div className="flex items-center justify-between p-4 rounded-2xl bg-sky-950/40 border border-sky-500/30">
            <div>
              <div className="text-xs font-bold text-sky-400">Cài Đặt Ứng Dụng Ra Màn Hình Chính (PWA)</div>
              <div className="text-[11px] text-slate-300">Cài ứng dụng để chạy độc lập không có thanh URL trình duyệt.</div>
            </div>
            <button
              onClick={onInstallPWA}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
            >
              <Smartphone className="w-4 h-4" />
              <span>Thêm Vào Màn Hình Chính</span>
            </button>
          </div>
        )}
      </div>

      {/* Save Settings Button */}
      <div className="flex justify-end gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-8 py-4 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-sky-600/30 transition-all disabled:opacity-50"
        >
          {savedSuccess ? (
            <>
              <Check className="w-5 h-5 text-emerald-300" />
              <span>Đã Lưu Cấu Hình!</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>LƯU CÀI ĐẶT CẤU HÌNH</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
