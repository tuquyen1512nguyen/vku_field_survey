import React, { useState } from 'react';
import { MapPin, Navigation, Info, Eye, Layers, Compass, ExternalLink } from 'lucide-react';
import { Survey, CampusLocation } from '../types';
import { VKU_CAMPUS_LOCATIONS } from '../services/locationService';

interface CampusMapProps {
  surveys: Survey[];
  onSelectSurvey: (survey: Survey) => void;
}

export const CampusMap: React.FC<CampusMapProps> = ({ surveys, onSelectSurvey }) => {
  const [selectedLocation, setSelectedLocation] = useState<CampusLocation | null>(VKU_CAMPUS_LOCATIONS[0]);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [userLocation, setUserLocation] = useState<{ x: number; y: number } | null>({ x: 45, y: 42 });

  const handleMarkerClick = (loc: CampusLocation) => {
    setSelectedLocation(loc);
    // Tìm survey gần nhất của tòa nhà này
    const match = surveys.find((s) => s.building.includes(loc.code) || loc.name.includes(s.building));
    setSelectedSurvey(match || null);
  };

  const handleMyLocation = () => {
    // Đưa tâm về vị trí người dùng
    setUserLocation({ x: 44 + (Math.random() - 0.5) * 4, y: 40 + (Math.random() - 0.5) * 4 });
  };

  // Xác định tình trạng của mỗi tòa nhà dựa trên các bản ghi survey đã nộp
  const getLocationCondition = (locCode: string): 'GOOD' | 'NEEDS_ATTENTION' | 'DAMAGED' | 'NO_DATA' => {
    const matched = surveys.filter((s) => s.building.includes(locCode));
    if (matched.length === 0) return 'NO_DATA';
    if (matched.some((s) => s.condition === 'DAMAGED')) return 'DAMAGED';
    if (matched.some((s) => s.condition === 'NEEDS_ATTENTION')) return 'NEEDS_ATTENTION';
    return 'GOOD';
  };

  return (
    <div className="space-y-4 pb-20">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-field-500 animate-ping" />
            <h3 className="font-extrabold text-lg text-navy-900 dark:text-white tracking-tight">VKU Campus Map</h3>
          </div>
          <p className="text-xs text-slate-500">Bản đồ thực địa khuôn viên trường — Hoạt động 100% ngoại tuyến</p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-emerald-600">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Tốt
          </span>
          <span className="flex items-center gap-1.5 text-amber-600">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Cần bảo trì
          </span>
          <span className="flex items-center gap-1.5 text-rose-600">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Hỏng hóc
          </span>
        </div>
      </div>

      {/* 2. Interactive Campus Map Canvas */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 border-2 border-slate-700/80 shadow-2xl h-[420px] sm:h-[480px]">
        {/* SVG Interactive Blueprint of VKU */}
        <svg
          viewBox="0 0 1000 700"
          className="w-full h-full object-cover select-none"
        >
          {/* Background Grid & Pathways */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
            </pattern>
            <radialGradient id="vkuMapGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0c4a6e" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#070c18" stopOpacity="0.9" />
            </radialGradient>
          </defs>

          {/* Ground */}
          <rect width="1000" height="700" fill="url(#vkuMapGlow)" />
          <rect width="1000" height="700" fill="url(#grid)" />

          {/* Central Main Boulevard (Đường trung tâm VKU) */}
          <path d="M 100 350 Q 500 350 900 350" stroke="#1e293b" strokeWidth="36" fill="none" strokeLinecap="round" />
          <path d="M 500 100 L 500 600" stroke="#1e293b" strokeWidth="28" fill="none" strokeLinecap="round" />

          {/* Football Field & Stadium (Sân vận động VKU) */}
          <rect x="80" y="80" width="180" height="110" rx="16" fill="#064e3b" stroke="#10b981" strokeWidth="2" opacity="0.6" />
          <text x="170" y="140" fill="#a7f3d0" fontSize="13" fontWeight="bold" textAnchor="middle" fontFamily="Plus Jakarta Sans">SÂN BÓNG ĐÁ VKU</text>

          {/* Lake / Green Landscape (Hồ nước & Công viên) */}
          <ellipse cx="800" cy="180" rx="110" ry="70" fill="#0369a1" opacity="0.3" />
          <text x="800" y="185" fill="#7dd3fc" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="Plus Jakarta Sans">HỒ CẢNH QUAN</text>

          {/* Building Blocks */}
          {VKU_CAMPUS_LOCATIONS.map((loc) => {
            const cond = getLocationCondition(loc.code);
            const isSelected = selectedLocation?.id === loc.id;
            const px = (loc.x / 100) * 1000;
            const py = (loc.y / 100) * 700;

            const strokeColor =
              cond === 'DAMAGED'
                ? '#ef4444'
                : cond === 'NEEDS_ATTENTION'
                ? '#f59e0b'
                : cond === 'GOOD'
                ? '#10b981'
                : '#38bdf8';

            return (
              <g
                key={loc.id}
                onClick={() => handleMarkerClick(loc)}
                className="cursor-pointer transition-transform duration-200 hover:scale-105"
                transform={`translate(${px - 60}, ${py - 40})`}
              >
                {/* Building Base */}
                <rect
                  width="120"
                  height="80"
                  rx="14"
                  fill="#1e293b"
                  stroke={strokeColor}
                  strokeWidth={isSelected ? 4 : 2}
                  className="shadow-lg"
                />
                <rect
                  width="120"
                  height="80"
                  rx="14"
                  fill={strokeColor}
                  opacity={isSelected ? 0.25 : 0.08}
                />

                {/* Building Title */}
                <text
                  x="60"
                  y="36"
                  fill="#ffffff"
                  fontSize="15"
                  fontWeight="800"
                  textAnchor="middle"
                  fontFamily="Plus Jakarta Sans"
                >
                  {loc.code}
                </text>
                <text
                  x="60"
                  y="55"
                  fill="#94a3b8"
                  fontSize="10"
                  fontWeight="600"
                  textAnchor="middle"
                  fontFamily="Plus Jakarta Sans"
                >
                  {loc.name.split('(')[0]}
                </text>

                {/* Status Dot */}
                <circle cx="106" cy="16" r="6" fill={strokeColor} />
              </g>
            );
          })}

          {/* Current Inspector Location (Blue Radar Pulse) */}
          {userLocation && (
            <g transform={`translate(${(userLocation.x / 100) * 1000}, ${(userLocation.y / 100) * 700})`}>
              <circle cx="0" cy="0" r="28" fill="#0284c7" opacity="0.25">
                <animate attributeName="r" values="10;35;10" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx="0" cy="0" r="9" fill="#0284c7" stroke="#ffffff" strokeWidth="2.5" />
              <text x="0" y="-14" fill="#38bdf8" fontSize="11" fontWeight="800" textAnchor="middle" fontFamily="JetBrains Mono">
                VỊ TRÍ CỦA BẠN
              </text>
            </g>
          )}
        </svg>

        {/* Floating Button: MY LOCATION */}
        <button
          onClick={handleMyLocation}
          className="absolute bottom-4 right-4 px-4 py-2.5 rounded-xl bg-white/90 dark:bg-navy-800/90 backdrop-blur-md text-navy-900 dark:text-white font-extrabold text-xs flex items-center gap-2 shadow-lg border border-white/20 hover:bg-white transition-all active:scale-95"
        >
          <Navigation className="w-4 h-4 text-electric-500 fill-current" />
          <span>📍 MY LOCATION</span>
        </button>

        {/* Top telemetry overlay */}
        <div className="absolute top-4 left-4 text-[10px] font-mono text-electric-300 bg-navy-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
          CAMPUS GPS // LAT: 15.9752 ● LNG: 108.2523 (VKU FIELD GRID)
        </div>
      </div>

      {/* 3. Clicked Location Inspector Card */}
      {selectedLocation && (
        <div className="p-5 rounded-2xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-electric-100 text-electric-700 text-xs font-bold font-mono">
                {selectedLocation.code}
              </span>
              <span className="text-xs font-bold uppercase text-slate-500">
                {getLocationCondition(selectedLocation.code) === 'DAMAGED'
                  ? '🔴 Cần xử lý khẩn cấp'
                  : getLocationCondition(selectedLocation.code) === 'NEEDS_ATTENTION'
                  ? '🟠 Cần bảo trì'
                  : '🟢 Cơ sở vật chất ổn định'}
              </span>
            </div>
            <h4 className="font-extrabold text-lg text-navy-900 dark:text-white">
              {selectedLocation.name}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">{selectedLocation.description}</p>
          </div>

          {selectedSurvey ? (
            <button
              onClick={() => onSelectSurvey(selectedSurvey)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-electric-500 hover:bg-electric-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-electric-500/20"
            >
              <Eye className="w-4 h-4" />
              <span>Xem phiếu gần nhất (#{selectedSurvey.id})</span>
            </button>
          ) : (
            <span className="text-xs text-slate-400 italic">Chưa có khảo sát gần đây</span>
          )}
        </div>
      )}
    </div>
  );
};
