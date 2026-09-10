import React, { useState } from 'react';
import { Search, Download, Sheet, Copy, RefreshCw, Trash2, Eye, CheckCircle2, Clock, AlertTriangle, ExternalLink, Filter } from 'lucide-react';
import { Survey, SyncStatus, UserSettings } from '../types';
import { removeFromSyncQueue, deleteSurvey, updateSurveyStatus } from '../services/indexedDB';
import { syncService } from '../services/syncService';

interface RecordsTimelineProps {
  surveys: Survey[];
  settings: UserSettings;
  onSelectSurvey: (survey: Survey) => void;
  onOpenSyncCenter: () => void;
  pendingCount: number;
  onRefreshData?: () => void;
}

export const RecordsTimeline: React.FC<RecordsTimelineProps> = ({
  surveys,
  settings,
  onSelectSurvey,
  onOpenSyncCenter,
  pendingCount,
  onRefreshData,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'synced' | 'failed'>('all');
  const [copied, setCopied] = useState(false);

  const syncedCount = surveys.filter((s) => s.syncStatus === 'synced').length;
  const failedCount = surveys.filter((s) => s.syncStatus === 'failed').length;

  const filteredSurveys = surveys.filter((s) => {
    const matchStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'pending'
        ? s.syncStatus === 'pending' || s.syncStatus === 'syncing'
        : s.syncStatus === statusFilter;

    const query = searchTerm.toLowerCase();
    const matchQuery =
      !query ||
      s.id.toLowerCase().includes(query) ||
      s.building.toLowerCase().includes(query) ||
      s.room.toLowerCase().includes(query) ||
      s.auditorName?.toLowerCase().includes(query) ||
      s.targetName?.toLowerCase().includes(query) ||
      s.topic?.toLowerCase().includes(query) ||
      s.notes?.toLowerCase().includes(query);

    return matchStatus && matchQuery;
  });

  // Export CSV UTF-8
  const handleExportCSV = () => {
    if (surveys.length === 0) {
      alert('Không có dữ liệu khảo sát để xuất!');
      return;
    }

    const headers = [
      'Mã Khảo Sát (ID)',
      'Thời Gian Tạo',
      'Họ Tên ĐTV',
      'Mã ĐTV',
      'Đơn Vị ĐTV',
      'SĐT ĐTV',
      'Tên Đối Tượng',
      'Mã Đối Tượng',
      'SĐT Đối Tượng',
      'Loại Đối Tượng',
      'Tòa Nhà',
      'Tầng',
      'Phòng/Vị Trí',
      'Chuyên Đề',
      'Đánh Giá',
      'Ý Kiến / Ghi Chú',
      'Tọa Độ GPS',
      'Số Ảnh Minh Chứng',
      'Trạng Thái Đồng Bộ'
    ];

    const rows = surveys.map((s) => [
      s.id,
      new Date(s.createdAt).toLocaleString('vi-VN'),
      `"${s.auditorName || ''}"`,
      `"${s.studentId || ''}"`,
      `"${s.department || ''}"`,
      `"${s.auditorPhone || ''}"`,
      `"${s.targetName || ''}"`,
      `"${s.targetId || ''}"`,
      `"${s.targetPhone || ''}"`,
      `"${s.targetType || ''}"`,
      `"${s.building}"`,
      `"${s.floor}"`,
      `"${s.room}"`,
      `"${s.topic || s.facilityType}"`,
      `"${s.ratingStars ? s.ratingStars + ' Sao' : s.condition}"`,
      `"${(s.notes || '').replace(/"/g, '""')}"`,
      `"${s.latitude.toFixed(6)}, ${s.longitude.toFixed(6)}"`,
      s.photos.length,
      s.syncStatus
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VKU_Field_Surveys_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export JSON Raw
  const handleExportJSON = () => {
    if (surveys.length === 0) return;
    const jsonStr = JSON.stringify(surveys, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VKU_Field_Surveys_Raw_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Copy Data to Clipboard for Excel/Sheets paste
  const handleCopyData = () => {
    if (surveys.length === 0) return;
    const textData = surveys
      .map(
        (s) =>
          `${s.id}\t${new Date(s.createdAt).toLocaleString('vi-VN')}\t${s.auditorName || ''}\t${s.targetName || ''}\t${s.building}-${s.room}\t${s.topic || ''}\t${s.notes || ''}`
      )
      .join('\n');

    navigator.clipboard.writeText(textData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteSurvey = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa phiếu điều tra này khỏi bộ nhớ máy?')) {
      await deleteSurvey(id);
      await removeFromSyncQueue(id);
      if (onRefreshData) onRefreshData();
    }
  };

  return (
    <div className="space-y-6 pb-6 animate-fadeIn">
      {/* 1. Header & Summary Pills */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Bảng Dữ Liệu Khảo Sát Thực Địa</h2>
            <p className="text-xs text-slate-400 mt-1">
              Quản lý danh sách phiếu thu thập, kiểm tra trạng thái đồng bộ Google Sheets và xuất báo cáo
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Xuất CSV</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700"
            >
              <Download className="w-4 h-4" />
              <span>Xuất JSON</span>
            </button>

            <button
              onClick={handleCopyData}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs flex items-center gap-1.5 border border-slate-700"
            >
              <Copy className="w-4 h-4" />
              <span>{copied ? 'Đã copy!' : 'Copy Dữ Liệu'}</span>
            </button>

            {settings.publicSheetUrl && (
              <a
                href={settings.publicSheetUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
              >
                <Sheet className="w-4 h-4" />
                <span>Mở Google Sheet</span>
              </a>
            )}
          </div>
        </div>

        {/* Status Summary Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Tổng số phiếu:</span>
            <span className="font-mono font-black text-white">{surveys.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-amber-400 font-medium">Chờ lên Sheet:</span>
            <span className="font-mono font-black text-amber-400">{pendingCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-emerald-400 font-medium">Đã lên Sheet:</span>
            <span className="font-mono font-black text-emerald-400">{syncedCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-rose-400 font-medium">Lỗi đồng bộ:</span>
            <span className="font-mono font-black text-rose-400">{failedCount}</span>
          </div>
        </div>
      </div>

      {/* 2. Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo Đối tượng, ĐTV, Phòng, Chuyên đề..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white focus:ring-2 focus:ring-sky-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold w-full sm:w-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${statusFilter === 'all' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${statusFilter === 'pending' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Chờ đồng bộ ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('synced')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${statusFilter === 'synced' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Đã lên Sheet ({syncedCount})
            </button>
          </div>
        </div>
      </div>

      {/* 3. Survey Table */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
        {filteredSurveys.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Sheet className="w-10 h-10 mx-auto text-slate-600" />
            <p className="font-bold text-sm text-slate-300">Không tìm thấy phiếu khảo sát nào</p>
            <p className="text-xs text-slate-500">Thử thay đổi từ khóa tìm kiếm hoặc chọn lọc trạng thái khác.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                <tr>
                  <th className="p-4">Mã Phiếu</th>
                  <th className="p-4">Điều Tra Viên</th>
                  <th className="p-4">Đối Tượng</th>
                  <th className="p-4">Vị Trí Hiện Trường</th>
                  <th className="p-4">Chuyên Đề & Đánh Giá</th>
                  <th className="p-4">Ảnh & GPS</th>
                  <th className="p-4 text-center">Trạng Thái Sheet</th>
                  <th className="p-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredSurveys.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-mono font-black text-sky-400">#{s.id}</td>
                    <td className="p-4">
                      <div className="font-bold text-white">{s.auditorName || 'Nguyễn Văn An'}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{s.studentId || '21IT001'}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-200">{s.targetName || 'Chưa ghi tên'}</div>
                      <div className="text-[10px] text-slate-500">{s.targetType || 'Sinh viên'}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-extrabold text-white">{s.building} — {s.room}</div>
                      <div className="text-[10px] text-slate-500">{s.floor}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-300">{s.topic || s.facilityType}</div>
                      <div className="text-[10px] font-bold text-amber-400 font-mono">
                        ★ {s.ratingStars || (s.condition === 'GOOD' ? 5 : 2)}/5 ({s.condition})
                      </div>
                    </td>
                    <td className="p-4 font-mono text-[11px]">
                      <div className="text-emerald-400">📷 {s.photos.length} ảnh</div>
                      <div className="text-slate-500 text-[10px]">
                        GPS: {s.latitude ? `${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)}` : 'Chưa có'}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {s.syncStatus === 'synced' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>ĐÃ LÊN SHEET</span>
                        </span>
                      ) : s.syncStatus === 'pending' || s.syncStatus === 'syncing' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-black border border-amber-500/30">
                          <Clock className="w-3 h-3" />
                          <span>CHỜ ĐỒNG BỘ</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-black border border-rose-500/30">
                          <AlertTriangle className="w-3 h-3" />
                          <span>LỖI SYNC</span>
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectSurvey(s)}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSurvey(s.id)}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-rose-400 transition-colors"
                          title="Xóa khỏi máy"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
