import React from 'react';
import { X, MapPin, Calendar, CheckCircle2, Clock, AlertTriangle, User, Sheet } from 'lucide-react';
import { Survey } from '../types';

interface SurveyDetailModalProps {
  survey: Survey | null;
  onClose: () => void;
}

export const SurveyDetailModal: React.FC<SurveyDetailModalProps> = ({ survey, onClose }) => {
  if (!survey) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-800 overflow-hidden max-h-[90vh] flex flex-col animate-fadeIn">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-black text-sky-400">
              <span>PHIẾU ĐIỀU TRA THỰC ĐỊA #{survey.id}</span>
            </div>
            <h3 className="font-extrabold text-lg text-white mt-0.5">
              {survey.building} — {survey.room}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Status Badge Pill */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 font-medium">Trạng Thái Google Sheet:</span>
            {survey.syncStatus === 'synced' ? (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-black">
                <CheckCircle2 className="w-4 h-4" />
                <span>ĐÃ LÊN GOOGLE SHEET</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-400 font-black">
                <Clock className="w-4 h-4" />
                <span>LƯU CỤC BỘ (CHỜ ĐỒNG BỘ)</span>
              </span>
            )}
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div>
              <span className="text-slate-500 block font-semibold mb-0.5">ĐIỀU TRA VIÊN</span>
              <span className="font-extrabold text-white text-xs">{survey.auditorName || 'Nguyễn Văn An'}</span>
              <span className="block text-[10px] text-slate-400 font-mono">{survey.studentId || '21IT001'}</span>
            </div>
            <div>
              <span className="text-slate-500 block font-semibold mb-0.5">ĐỐI TƯỢNG KHẢO SÁT</span>
              <span className="font-extrabold text-white text-xs">{survey.targetName || 'Chưa ghi tên'}</span>
              <span className="block text-[10px] text-slate-400">{survey.targetType || 'Sinh viên'}</span>
            </div>
            <div>
              <span className="text-slate-500 block font-semibold mb-0.5">VỊ TRÍ & TẦNG</span>
              <span className="font-extrabold text-white text-xs">{survey.building} — {survey.floor}</span>
            </div>
            <div>
              <span className="text-slate-500 block font-semibold mb-0.5">ĐÁNH GIÁ CHẤT LƯỢNG</span>
              <span className="font-black text-amber-400 text-xs">★ {survey.ratingStars || 5}/5 ({survey.condition})</span>
            </div>
          </div>

          {/* Topic */}
          {survey.topic && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block font-semibold text-[10px] uppercase mb-0.5">CHUYÊN ĐỀ KHẢO SÁT</span>
              <span className="font-bold text-sky-400 text-xs">{survey.topic}</span>
            </div>
          )}

          {/* Notes */}
          {survey.notes && (
            <div>
              <h4 className="font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Ý kiến / Ghi nhận hiện trường:</h4>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-medium text-slate-200 leading-relaxed">
                "{survey.notes}"
              </div>
            </div>
          )}

          {/* GPS Coordinates */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
            <MapPin className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="font-mono">
              <div className="font-extrabold text-white">
                {survey.latitude.toFixed(6)}, {survey.longitude.toFixed(6)}
              </div>
              <div className="text-[10px] text-slate-400">Độ chính xác: ±{survey.accuracy}m | Vệ tinh GPS Native</div>
            </div>
          </div>

          {/* Photos */}
          {survey.photos && survey.photos.length > 0 && (
            <div>
              <h4 className="font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                Ảnh minh chứng hiện trường ({survey.photos.length}):
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {survey.photos.map((photo, i) => (
                  <div key={photo.id || i} className="rounded-2xl overflow-hidden border border-slate-800 shadow-sm">
                    <img src={photo.base64} alt={`Evidence ${i + 1}`} className="w-full h-auto max-h-64 object-contain bg-black" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-800 text-white font-extrabold text-xs hover:bg-slate-700 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
