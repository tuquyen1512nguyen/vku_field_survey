import React from 'react';
import { X, MapPin, Calendar, CheckCircle2, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Survey } from '../types';

interface SurveyDetailModalProps {
  survey: Survey | null;
  onClose: () => void;
}

export const SurveyDetailModal: React.FC<SurveyDetailModalProps> = ({ survey, onClose }) => {
  if (!survey) return null;

  return (
    <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-navy-800 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-navy-700 overflow-hidden max-h-[90vh] flex flex-col animate-fadeIn">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-navy-700 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-extrabold text-electric-600 dark:text-electric-400">
              <span>FIELD INSPECTION #{survey.id}</span>
            </div>
            <h3 className="font-extrabold text-lg text-navy-900 dark:text-white mt-0.5">
              {survey.building} — Phòng {survey.room}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-navy-700 flex items-center justify-center text-slate-500 hover:text-navy-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-navy-900/60 border border-slate-200/80 dark:border-navy-700">
            <div>
              <span className="text-slate-400 block font-semibold mb-0.5">TẦNG / KHU VỰC</span>
              <span className="font-extrabold text-navy-900 dark:text-white text-sm">{survey.floor}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold mb-0.5">LOẠI CƠ SỞ</span>
              <span className="font-extrabold text-navy-900 dark:text-white text-sm">{survey.facilityType}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold mb-0.5">TÌNH TRẠNG</span>
              <span className="font-extrabold text-sm uppercase text-electric-600">● {survey.condition}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold mb-0.5">TRẠNG THÁI ĐỒNG BỘ</span>
              <span className="font-extrabold text-sm uppercase text-field-600">{survey.syncStatus}</span>
            </div>
          </div>

          {/* GPS Coordinates */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-navy-700 flex items-center gap-3">
            <MapPin className="w-5 h-5 text-electric-500 shrink-0" />
            <div className="font-mono">
              <div className="font-extrabold text-navy-900 dark:text-white">
                {survey.latitude.toFixed(6)}, {survey.longitude.toFixed(6)}
              </div>
              <div className="text-[10px] text-slate-400">Độ chính xác: ±{survey.accuracy}m | Vệ tinh GPS VKU</div>
            </div>
          </div>

          {/* Notes */}
          {survey.notes && (
            <div>
              <h4 className="font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Ghi chú sự cố / Lỗi kỹ thuật:</h4>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-navy-900/60 border border-slate-200 dark:border-navy-700 font-medium leading-relaxed">
                "{survey.notes}"
              </div>
            </div>
          )}

          {/* Photos */}
          {survey.photos && survey.photos.length > 0 && (
            <div>
              <h4 className="font-extrabold text-slate-400 uppercase tracking-wider mb-2">Ảnh minh chứng hiện trường ({survey.photos.length}):</h4>
              <div className="grid grid-cols-1 gap-3">
                {survey.photos.map((photo, i) => (
                  <div key={photo.id || i} className="rounded-2xl overflow-hidden border border-slate-200 dark:border-navy-700 shadow-sm">
                    <img src={photo.base64} alt={`Evidence ${i + 1}`} className="w-full h-auto max-h-60 object-contain bg-black" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-navy-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-navy-800 text-white font-extrabold text-xs hover:bg-navy-900 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
