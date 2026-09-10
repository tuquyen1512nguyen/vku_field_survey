import React from 'react';
import { PlusCircle, ArrowRight, TableProperties, Sheet, ShieldCheck, FileEdit, Database, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { SurveyCard } from '../components/SurveyCard';
import { Survey, SurveyDraft, TabType, UserSettings } from '../types';

interface HomeMissionProps {
  onStartSurvey: () => void;
  onNavigateTab: (tab: TabType) => void;
  isOnline: boolean;
  pendingCount: number;
  completedTodayCount: number;
  activeDraft: SurveyDraft | null;
  recentSurveys: Survey[];
  settings: UserSettings;
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
  settings,
  onSelectSurvey,
}) => {
  const syncedCount = recentSurveys.filter((s) => s.syncStatus === 'synced').length;
  const attentionCount = recentSurveys.filter(
    (s) => s.condition === 'NEEDS_ATTENTION' || s.condition === 'DAMAGED' || (s.ratingStars && s.ratingStars <= 2)
  ).length;

  return (
    <div className="space-y-6 pb-6 animate-fadeIn">
      {/* 1. Hero Section — Space Executive Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white p-6 md:p-8 shadow-2xl border border-slate-800">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-bold font-mono tracking-wider uppercase">
              <span>🌟 Không gian điều hành khảo sát</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
              VKU Field Survey — <span className="text-sky-400">Khảo Sát Thực Địa & Đồng Bộ Google Sheets</span>
            </h2>
            <p className="text-slate-300 text-sm font-medium leading-relaxed">
              Ghi nhận hiện trường nhanh, lưu trữ an toàn ngoại tuyến khi mất mạng và tự động đẩy dữ liệu lên Google Sheets công khai khi sẵn sàng.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 self-start md:self-auto">
            <button
              onClick={onStartSurvey}
              className="px-6 py-3.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Bắt Đầu Khảo Sát</span>
            </button>

            {settings.publicSheetUrl ? (
              <a
                href={settings.publicSheetUrl}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-sm flex items-center justify-center gap-2 border border-slate-700 shadow-sm transition-all"
              >
                <Sheet className="w-4 h-4" />
                <span>Mở Google Sheet</span>
              </a>
            ) : (
              <button
                onClick={() => onNavigateTab('profile')}
                className="px-5 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm flex items-center justify-center gap-2 border border-slate-700 shadow-sm transition-all"
              >
                <Sheet className="w-4 h-4 text-slate-400" />
                <span>Gắn Google Sheet</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Stat Metric Cards (Matching vku-field-survey.pages.dev) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider font-mono">TỔNG PHIẾU ĐÃ THU</span>
            <Database className="w-5 h-5 text-sky-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono">{recentSurveys.length}</div>
          <div className="text-[11px] text-slate-400 font-medium">Toàn bộ dữ liệu thu thập</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider font-mono">ĐANG CHỜ ĐỒNG BỘ</span>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400 font-mono">{pendingCount}</div>
          <div className="text-[11px] text-slate-400 font-medium">Lưu cục bộ an toàn IndexedDB</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider font-mono">ĐÃ LÊN GOOGLE SHEET</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400 font-mono">{syncedCount}</div>
          <div className="text-[11px] text-slate-400 font-medium">Đồng bộ hoàn tất lên cloud</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider font-mono">CẦN LƯU Ý</span>
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
          <div className="text-3xl font-black text-rose-400 font-mono">{attentionCount}</div>
          <div className="text-[11px] text-slate-400 font-medium">Đánh giá ≤ 2 sao hoặc hỏng</div>
        </div>
      </div>

      {/* 3. Continue Incomplete Draft Alert */}
      {activeDraft && (
        <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-500/40 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md font-black">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase font-mono">
                <span>⚡ BẢN NHÁP CHƯA HOÀN THÀNH (BƯỚC {activeDraft.step}/4)</span>
              </div>
              <h4 className="font-extrabold text-base text-white">
                {activeDraft.building} — {activeDraft.room || 'Vị trí chưa ghi tên'} ({activeDraft.facilityType})
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Bản nháp được bảo toàn tự động trong IndexedDB của máy tính/điện thoại này.
              </p>
            </div>
          </div>

          <button
            onClick={onStartSurvey}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
          >
            <span>Tiếp Tục Khảo Sát</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4. Recent Surveys Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-lg text-white tracking-tight">Danh Sách Phiếu Đã Thu Thập</h3>
            <p className="text-xs text-slate-400">Xem nhanh danh sách phiếu điều tra thực địa mới nhất</p>
          </div>
          <button
            onClick={() => onNavigateTab('records')}
            className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1"
          >
            <span>Xem bảng đầy đủ</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentSurveys.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900 border border-dashed border-slate-800 text-center text-slate-400 space-y-2">
            <Database className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-sm font-semibold">Chưa có phiếu khảo sát nào.</p>
            <p className="text-xs text-slate-500">Bấm "+ KHẢO SÁT MỚI" để lập phiếu khảo sát thực địa đầu tiên!</p>
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
