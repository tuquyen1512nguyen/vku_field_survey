import React from 'react';
import { MapPin, Calendar, Camera, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Survey, ConditionRating } from '../types';

interface SurveyCardProps {
  survey: Survey;
  onClick?: () => void;
}

export const SurveyCard: React.FC<SurveyCardProps> = ({ survey, onClick }) => {
  const conditionConfig: Record<ConditionRating, { label: string; color: string; badgeBg: string }> = {
    GOOD: { label: 'GOOD', color: 'text-emerald-600', badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300/50' },
    NEEDS_ATTENTION: { label: 'NEEDS ATTENTION', color: 'text-amber-600', badgeBg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-300/50' },
    DAMAGED: { label: 'DAMAGED', color: 'text-rose-600', badgeBg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-300/50' },
    NOT_AVAILABLE: { label: 'NOT AVAILABLE', color: 'text-slate-500', badgeBg: 'bg-slate-100 dark:bg-navy-700/50 border-slate-300/50' },
  };

  const cond = conditionConfig[survey.condition] || conditionConfig.GOOD;

  return (
    <div
      onClick={onClick}
      className="p-4 rounded-2xl bg-white dark:bg-navy-800 border border-slate-200/80 dark:border-navy-700/80 shadow-sm hover:shadow-md hover:border-electric-400/50 transition-all cursor-pointer group flex flex-col justify-between gap-3"
    >
      <div>
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-navy-900 dark:text-white">
            <span className="font-mono text-electric-500 font-extrabold">{survey.id}</span>
            <span className="text-slate-300">·</span>
            <span className="truncate">{survey.facilityType}</span>
          </div>

          {/* Sync badge */}
          {survey.syncStatus === 'synced' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 text-[10px] font-extrabold border border-emerald-300/50">
              <CheckCircle2 className="w-3 h-3" /> Synced
            </span>
          ) : survey.syncStatus === 'syncing' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-electric-50 dark:bg-electric-950/40 text-electric-600 text-[10px] font-extrabold border border-electric-300/50 animate-pulse">
              <Clock className="w-3 h-3 animate-spin" /> Syncing
            </span>
          ) : survey.syncStatus === 'failed' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-[10px] font-extrabold border border-rose-300/50">
              <AlertCircle className="w-3 h-3" /> Failed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 text-[10px] font-extrabold border border-amber-300/50">
              <Clock className="w-3 h-3" /> Pending
            </span>
          )}
        </div>

        {/* Location & Title */}
        <h4 className="font-extrabold text-base text-navy-900 dark:text-white tracking-tight group-hover:text-electric-500 transition-colors">
          {survey.building} — Phòng {survey.room}
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
          {survey.floor} {survey.notes ? `• "${survey.notes}"` : ''}
        </p>
      </div>

      {/* Thumbnail & Condition Row */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-navy-700/60">
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-extrabold ${cond.badgeBg} ${cond.color}`}>
            ● {cond.label}
          </span>
          {survey.photos && survey.photos.length > 0 && (
            <span className="inline-flex items-center gap-1 text-slate-400 text-xs font-mono">
              <Camera className="w-3.5 h-3.5" />
              {survey.photos.length}
            </span>
          )}
        </div>

        <span className="text-[11px] text-slate-400 font-mono">
          {new Date(survey.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};
