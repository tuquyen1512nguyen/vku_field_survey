import React, { useState } from 'react';
import { Search, Filter, RefreshCw, FolderClock, Calendar, Sparkles } from 'lucide-react';
import { SurveyCard } from '../components/SurveyCard';
import { Survey } from '../types';

interface RecordsTimelineProps {
  surveys: Survey[];
  onSelectSurvey: (survey: Survey) => void;
  onOpenSyncCenter: () => void;
  pendingCount: number;
}

type FilterType = 'ALL' | 'PENDING' | 'SYNCED' | 'ISSUES';

export const RecordsTimeline: React.FC<RecordsTimelineProps> = ({
  surveys,
  onSelectSurvey,
  onOpenSyncCenter,
  pendingCount,
}) => {
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Lọc dữ liệu
  const filteredSurveys = surveys.filter((s) => {
    // 1. Theo bộ lọc
    if (filter === 'PENDING' && s.syncStatus !== 'pending') return false;
    if (filter === 'SYNCED' && s.syncStatus !== 'synced') return false;
    if (filter === 'ISSUES' && (s.condition !== 'DAMAGED' && s.condition !== 'NEEDS_ATTENTION')) return false;

    // 2. Theo tìm kiếm
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRoom = s.room.toLowerCase().includes(q);
      const matchBuilding = s.building.toLowerCase().includes(q);
      const matchFacility = s.facilityType.toLowerCase().includes(q);
      const matchNotes = s.notes.toLowerCase().includes(q);
      return matchRoom || matchBuilding || matchFacility || matchNotes;
    }

    return true;
  });

  // Nhóm theo ngày (TODAY, YESTERDAY, EARLIER)
  const isToday = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  };

  const isYesterday = (dateStr: string) => {
    const d = new Date(dateStr);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return d.toDateString() === yesterday.toDateString();
  };

  const todaySurveys = filteredSurveys.filter((s) => isToday(s.createdAt));
  const yesterdaySurveys = filteredSurveys.filter((s) => isYesterday(s.createdAt));
  const earlierSurveys = filteredSurveys.filter((s) => !isToday(s.createdAt) && !isYesterday(s.createdAt));

  return (
    <div className="space-y-5 pb-20 max-w-4xl mx-auto">
      {/* 1. Header Bar & Sync Center Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <FolderClock className="w-5 h-5 text-electric-500" />
            <h3 className="font-extrabold text-xl text-navy-900 dark:text-white tracking-tight">Records & Timeline</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Nhật ký các lượt thanh tra thực địa theo tiến trình thời gian</p>
        </div>

        <button
          onClick={onOpenSyncCenter}
          className="px-4 py-2.5 rounded-xl bg-electric-50 dark:bg-electric-950 text-electric-600 dark:text-electric-400 font-extrabold text-xs flex items-center justify-center gap-2 border border-electric-200 dark:border-electric-900 hover:bg-electric-100 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Center ({pendingCount} chờ)</span>
        </button>
      </div>

      {/* 2. Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo mã phòng, tòa nhà, loại cơ sở..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-xs font-semibold focus:ring-2 focus:ring-electric-400 outline-none"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'PENDING', 'SYNCED', 'ISSUES'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all whitespace-nowrap ${
                filter === f
                  ? 'bg-navy-800 dark:bg-white text-white dark:text-navy-900 shadow-sm'
                  : 'bg-white dark:bg-navy-800 text-slate-500 border border-slate-200 dark:border-navy-700 hover:bg-slate-50'
              }`}
            >
              {f === 'ISSUES' ? '⚠️ ISSUES' : f}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Timeline Grouped Records */}
      {filteredSurveys.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white dark:bg-navy-800 border border-dashed border-slate-200 dark:border-navy-700 text-center text-slate-400 space-y-2">
          <FolderClock className="w-10 h-10 mx-auto text-slate-300" />
          <p className="font-extrabold text-sm text-navy-800 dark:text-slate-200">Không tìm thấy bản ghi nào</p>
          <p className="text-xs">Thử thay đổi bộ lọc hoặc bắt đầu khảo sát mới tại tab Survey!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Group 1: TODAY */}
          {todaySurveys.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-extrabold font-mono text-electric-600 dark:text-electric-400 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5" />
                <span>📅 TODAY ({todaySurveys.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {todaySurveys.map((s) => (
                  <SurveyCard key={s.id} survey={s} onClick={() => onSelectSurvey(s)} />
                ))}
              </div>
            </div>
          )}

          {/* Group 2: YESTERDAY */}
          {yesterdaySurveys.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-extrabold font-mono text-slate-500 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5" />
                <span>📅 YESTERDAY ({yesterdaySurveys.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {yesterdaySurveys.map((s) => (
                  <SurveyCard key={s.id} survey={s} onClick={() => onSelectSurvey(s)} />
                ))}
              </div>
            </div>
          )}

          {/* Group 3: EARLIER */}
          {earlierSurveys.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-extrabold font-mono text-slate-400 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5" />
                <span>📅 EARLIER RECORDS ({earlierSurveys.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {earlierSurveys.map((s) => (
                  <SurveyCard key={s.id} survey={s} onClick={() => onSelectSurvey(s)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
