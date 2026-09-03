import React from 'react';
import { Play, ArrowRight, MapPin, Wifi, WifiOff, Clock, ShieldCheck, FileEdit, Database } from 'lucide-react';
import { FieldStatusRing } from '../components/FieldStatusRing';
import { SurveyCard } from '../components/SurveyCard';
import { Survey, SurveyDraft, TabType } from '../types';

interface HomeMissionProps {
  onStartSurvey: () => void;
  onNavigateTab: (tab: TabType) => void;
  isOnline: boolean;
  pendingCount: number;
  completedTodayCount: number;
  activeDraft: SurveyDraft | null;
  recentSurveys: Survey[];
  onSelectSurvey: (survey: Survey) => void;
}

export const HomeMission: React.FC<HomeMissionProps> = ({
  onStartSurvey,
  onNavigateTab,
  isOnline,
  pendingCount,
  completedTodayCount,
  activeDraft,
  recentSurveys,
  onSelectSurvey,
}) => {
  return (
    <div className="space-y-6 pb-6">
      {/* 1. Hero Section — Mission Exploration Style */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-navy-800 via-navy-900 to-navy-800 text-white p-6 md:p-8 shadow-2xl border border-navy-700/80">
        {/* Subtle background tech grid */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-electric-500/20 border border-electric-400/30 text-electric-300 text-xs font-bold font-mono tracking-wider uppercase">
              <span>🌟 VKU FIELD EXPEDITION</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
              Khảo sát cơ sở vật chất khuôn viên VKU mọi lúc, <span className="text-electric-400">kể cả khi offline</span>.
            </h2>
            <p className="text-slate-300 text-sm font-medium leading-relaxed">
              Thu thập hình ảnh hiện trường, tọa độ GPS vệ tinh và ghi nhận hư hỏng tại tầng hầm, phòng học cách âm không có mạng.
            </p>
          </div>

          {/* Field Status Ring */}
          <div className="flex items-center gap-4 bg-navy-700/40 backdrop-blur-md p-4 rounded-2xl border border-white/10 self-start md:self-auto">
            <FieldStatusRing completedToday={completedTodayCount} targetToday={10} />
            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">TIẾN ĐỘ HÔM NAY</div>
              <div className="text-xs text-slate-400">Chỉ tiêu: 10 phòng/ngày</div>
              <div className="text-[11px] text-field-400 font-semibold font-mono">
                {completedTodayCount >= 10 ? '✓ ĐẠT MỤC TIÊU' : `Còn ${10 - completedTodayCount} điểm khảo sát`}
              </div>
            </div>
          </div>
        </div>

        {/* 2. HUD Telemetry Bar */}
        <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-slate-400">KẾT NỐI MẠNG</div>
              <div className="text-xs font-bold font-mono">{isOnline ? 'ONLINE ● CLOUD' : 'OFFLINE ● LOCAL'}</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-electric-500/20 text-electric-400 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-slate-400">VỆ TINH GPS</div>
              <div className="text-xs font-bold font-mono">VKU CAMPUS READY</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-slate-400">CHỜ ĐỒNG BỘ</div>
              <div className="text-xs font-bold font-mono">{pendingCount} BẢN GHI</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-field-500/20 text-field-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-slate-400">INDEXEDDB SAFE</div>
              <div className="text-xs font-bold font-mono">BẢO TOÀN 100%</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Big CTA — Mission Start Button */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onStartSurvey}
          className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-electric-500 via-electric-600 to-electric-500 hover:from-electric-600 hover:to-electric-700 text-white font-extrabold text-base tracking-wide flex items-center justify-center gap-3 shadow-lg shadow-electric-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>🚀 START SURVEY (BẮT ĐẦU NHIỆM VỤ MỚI)</span>
        </button>

        <button
          onClick={() => onNavigateTab('map')}
          className="py-4 px-6 rounded-2xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 hover:border-electric-400 font-extrabold text-sm text-navy-800 dark:text-white flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <MapPin className="w-4 h-4 text-electric-500" />
          <span>Xem Bản Đồ VKU</span>
        </button>
      </div>

      {/* 4. Continue Mission (If incomplete draft exists in IndexedDB) */}
      {activeDraft && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-navy-800 dark:to-navy-700 border-2 border-amber-300 dark:border-amber-600/50 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-400 uppercase font-mono">
                <span>⚡ KHẢO SÁT ĐANG LÀM DỞ (BƯỚC {activeDraft.step}/5)</span>
              </div>
              <h4 className="font-extrabold text-base text-navy-900 dark:text-white">
                {activeDraft.building} — Phòng {activeDraft.room || 'Chưa đặt tên'} ({activeDraft.facilityType})
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Dữ liệu tự động bảo toàn trong IndexedDB. Bạn có thể tiếp tục bất cứ lúc nào!
              </p>
            </div>
          </div>

          <button
            onClick={onStartSurvey}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
          >
            <span>Tiếp tục nhiệm vụ</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 5. Recent Field Notes Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-lg text-navy-900 dark:text-white tracking-tight">Recent Field Notes</h3>
            <p className="text-xs text-slate-500">Các cuộc khảo sát cơ sở vật chất được ghi nhận gần đây</p>
          </div>
          <button
            onClick={() => onNavigateTab('records')}
            className="text-xs font-bold text-electric-500 hover:text-electric-600 flex items-center gap-1"
          >
            <span>Xem tất cả</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentSurveys.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-navy-800 border border-dashed border-slate-200 dark:border-navy-700 text-center text-slate-400 space-y-2">
            <Database className="w-8 h-8 mx-auto text-slate-300 dark:text-navy-600" />
            <p className="text-sm font-semibold">Chưa có bản ghi khảo sát nào.</p>
            <p className="text-xs">Bấm "START SURVEY" để bắt đầu lượt thanh tra đầu tiên tại VKU!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {recentSurveys.slice(0, 4).map((survey) => (
              <SurveyCard
                key={survey.id}
                survey={survey}
                onClick={() => onSelectSurvey(survey)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
