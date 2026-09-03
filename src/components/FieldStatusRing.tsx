import React from 'react';

interface FieldStatusRingProps {
  completedToday: number;
  targetToday?: number;
}

export const FieldStatusRing: React.FC<FieldStatusRingProps> = ({
  completedToday,
  targetToday = 10,
}) => {
  const percent = Math.min(100, Math.round((completedToday / targetToday) * 100));
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg className="w-24 h-24 transform -rotate-90">
        {/* Background track */}
        <circle
          cx="48"
          cy="48"
          r={radius}
          stroke="currentColor"
          strokeWidth="6"
          className="text-slate-100 dark:text-navy-700 fill-none"
        />
        {/* Progress bar */}
        <circle
          cx="48"
          cy="48"
          r={radius}
          stroke="currentColor"
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="text-field-500 transition-all duration-700 ease-out fill-none"
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xl font-extrabold text-navy-800 dark:text-white leading-none font-mono">
          {completedToday}
        </span>
        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-tighter mt-0.5">
          /{targetToday} TODAY
        </span>
      </div>
    </div>
  );
};
