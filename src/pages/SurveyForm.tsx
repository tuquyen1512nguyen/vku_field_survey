import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Camera,
  CheckCircle2,
  Trash2,
  Save,
  UploadCloud,
  AlertTriangle,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { LocationService } from '../services/locationService';
import { saveDraft, clearDraft, saveSurvey, addToSyncQueue } from '../services/indexedDB';
import { syncService } from '../services/syncService';
import { CameraModal } from '../components/CameraModal';
import {
  Survey,
  SurveyDraft,
  FacilityType,
  ConditionRating,
  GPSCoordinates,
  SurveyPhoto
} from '../types';

interface SurveyFormProps {
  onBack: () => void;
  onSurveyCompleted: (survey: Survey) => void;
  initialDraft?: SurveyDraft | null;
}

export const SurveyForm: React.FC<SurveyFormProps> = ({
  onBack,
  onSurveyCompleted,
  initialDraft,
}) => {
  const [surveyId] = useState<string>(
    initialDraft?.id || 'SUR-' + Math.floor(10000 + Math.random() * 90000)
  );
  const [step, setStep] = useState<number>(initialDraft?.step || 1);
  const [building, setBuilding] = useState<string>(initialDraft?.building || 'Khu A');
  const [floor, setFloor] = useState<string>(initialDraft?.floor || 'Tầng 2');
  const [room, setRoom] = useState<string>(initialDraft?.room || 'A.204');
  const [facilityType, setFacilityType] = useState<FacilityType>(initialDraft?.facilityType || 'Classroom');
  const [condition, setCondition] = useState<ConditionRating>(initialDraft?.condition || 'GOOD');
  const [notes, setNotes] = useState<string>(initialDraft?.notes || '');
  const [photos, setPhotos] = useState<SurveyPhoto[]>(initialDraft?.photos || []);
  const [gps, setGps] = useState<GPSCoordinates | undefined>(initialDraft?.gps);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const totalSteps = 5;

  // Lấy GPS ban đầu nếu chưa có
  useEffect(() => {
    if (!gps) {
      handleGetLocation();
    }
  }, []);

  // Tự động lưu nháp vào IndexedDB khi có thay đổi (Real-time Debounce Auto-Save)
  useEffect(() => {
    const draftData: SurveyDraft = {
      id: surveyId,
      step,
      building,
      floor,
      room,
      facilityType,
      condition,
      notes,
      photos,
      gps,
      lastUpdated: new Date().toISOString(),
    };

    const timer = setTimeout(() => {
      saveDraft(draftData).catch(console.error);
    }, 400);

    return () => clearTimeout(timer);
  }, [surveyId, step, building, floor, room, facilityType, condition, notes, photos, gps]);

  const handleGetLocation = async () => {
    setIsLocating(true);
    const coords = await LocationService.getCurrentLocation();
    setGps(coords);
    setIsLocating(false);
  };

  const handlePhotoCaptured = (photo: SurveyPhoto) => {
    setPhotos((prev) => [...prev, photo]);
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleNextStep = () => {
    if (step === 1 && !room.trim()) {
      alert('Vui lòng nhập số phòng / tên vị trí khảo sát');
      return;
    }
    if (step < totalSteps) {
      setStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      onBack();
    }
  };

  const handleFinalSubmit = async () => {
    if (!room.trim()) {
      alert('Vui lòng nhập tên phòng!');
      setStep(1);
      return;
    }

    setIsSaving(true);
    const isOnline = syncService.isOnline();
    const now = new Date().toISOString();

    const newSurvey: Survey = {
      id: surveyId,
      building,
      floor,
      room: room.trim(),
      facilityType,
      condition,
      notes: notes.trim(),
      photos,
      latitude: gps?.latitude || 15.975294,
      longitude: gps?.longitude || 108.252355,
      accuracy: gps?.accuracy || 10,
      createdAt: now,
      updatedAt: now,
      syncStatus: isOnline ? 'syncing' : 'pending',
    };

    try {
      // 1. Lưu vào IndexedDB
      await saveSurvey(newSurvey);

      // 2. Thêm vào hàng đợi đồng bộ
      await addToSyncQueue(newSurvey);

      // 3. Xóa bản nháp
      await clearDraft();

      // 4. Nếu online -> kích hoạt đồng bộ nền ngay
      if (isOnline) {
        syncService.syncAll('Gửi ngay khi nộp');
      }

      onSurveyCompleted(newSurvey);
    } catch (err) {
      console.error('Lỗi khi nộp phiếu:', err);
      alert('Lỗi lưu trữ: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setIsSaving(false);
    }
  };

  const facilityOptions: { id: FacilityType; icon: string; label: string }[] = [
    { id: 'Classroom', icon: '🏫', label: 'Classroom (Phòng học)' },
    { id: 'Laboratory', icon: '💻', label: 'Laboratory (Phòng Lab)' },
    { id: 'Library', icon: '📚', label: 'Library (Thư viện)' },
    { id: 'Parking', icon: '🛵', label: 'Parking (Nhà xe)' },
    { id: 'Restroom', icon: '🚻', label: 'Restroom (Vệ sinh)' },
    { id: 'Canteen', icon: '🍽️', label: 'Canteen (Nhà ăn)' },
    { id: 'Outdoor Area', icon: '🌳', label: 'Outdoor (Khuôn viên)' },
    { id: 'Other', icon: '📦', label: 'Other (Khu vực khác)' },
  ];

  const conditionOptions: { id: ConditionRating; icon: string; label: string; desc: string; border: string; bg: string; text: string }[] = [
    {
      id: 'GOOD',
      icon: '🟢',
      label: 'GOOD',
      desc: 'Hoạt động hoàn hảo, mới, sạch sẽ',
      border: 'border-emerald-500',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-400'
    },
    {
      id: 'NEEDS_ATTENTION',
      icon: '🟡',
      label: 'NEEDS ATTENTION',
      desc: 'Hao mòn nhẹ, cần bảo dưỡng định kỳ',
      border: 'border-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-700 dark:text-amber-400'
    },
    {
      id: 'DAMAGED',
      icon: '🔴',
      label: 'DAMAGED',
      desc: 'Hỏng hóc, chập điện hoặc mất an toàn',
      border: 'border-rose-500',
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      text: 'text-rose-700 dark:text-rose-400'
    },
    {
      id: 'NOT_AVAILABLE',
      icon: '⚫',
      label: 'NOT AVAILABLE',
      desc: 'Đang khóa, bảo trì hoặc không tiếp cận được',
      border: 'border-slate-500',
      bg: 'bg-slate-50 dark:bg-navy-700/50',
      text: 'text-slate-700 dark:text-slate-300'
    },
  ];

  const progressPercent = Math.round((step / totalSteps) * 100);

  return (
    <div className="space-y-5 pb-24 max-w-3xl mx-auto">
      {/* 1. Header with Progress Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 shadow-sm sticky top-14 z-20">
        <div className="flex items-center justify-between gap-3 mb-2">
          <button
            onClick={handlePrevStep}
            className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-navy-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{step === 1 ? 'Thoát' : 'Quay lại'}</span>
          </button>

          <span className="font-mono font-extrabold text-sm text-electric-600 dark:text-electric-400">
            FIELD SURVEY #{surveyId}
          </span>

          <span className="font-mono text-xs font-bold text-slate-500">
            0{step} / 0{totalSteps}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-electric-500 to-field-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 2. Step Content Cards */}
      <div className="p-6 rounded-3xl bg-white dark:bg-navy-800 border border-slate-200/90 dark:border-navy-700/80 shadow-mission">
        {/* STEP 1: LOCATION */}
        {step === 1 && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <span className="text-[11px] font-mono font-bold text-electric-500 uppercase tracking-wider">STEP 01 / LOCATION</span>
              <h3 className="text-xl font-extrabold text-navy-900 dark:text-white mt-1">Xác định Vị trí Khảo sát</h3>
              <p className="text-xs text-slate-500">Khai báo địa điểm cụ thể và tọa độ vệ tinh trong khuôn viên VKU</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-navy-800 dark:text-slate-200 mb-1.5 uppercase">
                  Tòa nhà / Khu vực <span className="text-rose-500">*</span>
                </label>
                <select
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-navy-600 bg-white dark:bg-navy-900 font-semibold text-sm focus:ring-2 focus:ring-electric-400 outline-none"
                >
                  <option value="Khu A">Khu A — Tòa nhà Hiệu bộ & Giảng đường</option>
                  <option value="Khu B">Khu B — Khoa học Máy tính</option>
                  <option value="Khu C">Khu C — Trung tâm Thực hành & Lab</option>
                  <option value="Khu K">Khu K — Giảng đường Lớn & Hội trường</option>
                  <option value="Khu V">Khu V — Khu liên hợp Đa năng & Tầng hầm</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-navy-800 dark:text-slate-200 mb-1.5 uppercase">
                  Tầng <span className="text-rose-500">*</span>
                </label>
                <select
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-navy-600 bg-white dark:bg-navy-900 font-semibold text-sm focus:ring-2 focus:ring-electric-400 outline-none"
                >
                  <option value="Tầng hầm">Tầng hầm (Hạ tầng điện & Cáp ngầm)</option>
                  <option value="Tầng 1">Tầng 1</option>
                  <option value="Tầng 2">Tầng 2</option>
                  <option value="Tầng 3">Tầng 3</option>
                  <option value="Tầng 4">Tầng 4</option>
                  <option value="Tầng 5">Tầng 5</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-navy-800 dark:text-slate-200 mb-1.5 uppercase">
                Số phòng / Tên vị trí cụ thể <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="VD: A.204, Lab B.301, V.B02, Sân bóng..."
                className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-navy-600 bg-white dark:bg-navy-900 font-bold text-sm focus:ring-2 focus:ring-electric-400 outline-none"
                required
              />
            </div>

            {/* GPS HUD Component */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-navy-900/60 border border-slate-200 dark:border-navy-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-electric-100 dark:bg-electric-950 flex items-center justify-center text-electric-600 shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-navy-900 dark:text-white font-mono">
                    {gps ? `${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)}` : 'Chưa có tọa độ'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Sai số: ±{gps?.accuracy || 10}m | {gps?.source || 'Đang lấy...'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGetLocation}
                disabled={isLocating}
                className="px-4 py-2 rounded-xl bg-white dark:bg-navy-800 border border-slate-300 dark:border-navy-600 text-xs font-extrabold hover:border-electric-400 flex items-center gap-1.5 shadow-sm transition-all"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                <span>📍 USE CURRENT LOCATION</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: FACILITY */}
        {step === 2 && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <span className="text-[11px] font-mono font-bold text-electric-500 uppercase tracking-wider">STEP 02 / FACILITY</span>
              <h3 className="text-xl font-extrabold text-navy-900 dark:text-white mt-1">Chọn Loại Cơ Sở Vật Chất</h3>
              <p className="text-xs text-slate-500">Phân loại đối tượng thanh tra để áp dụng tiêu chuẩn kiểm toán tương ứng</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {facilityOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFacilityType(opt.id)}
                  className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-center gap-2 transition-all ${
                    facilityType === opt.id
                      ? 'border-electric-500 bg-electric-50/70 dark:bg-electric-950/40 shadow-md ring-2 ring-electric-400/20'
                      : 'border-slate-200 dark:border-navy-700 hover:border-slate-300 bg-white dark:bg-navy-900'
                  }`}
                >
                  <span className="text-3xl">{opt.icon}</span>
                  <span className="text-xs font-bold text-navy-900 dark:text-white leading-tight">
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: CONDITION */}
        {step === 3 && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <span className="text-[11px] font-mono font-bold text-electric-500 uppercase tracking-wider">STEP 03 / CONDITION</span>
              <h3 className="text-xl font-extrabold text-navy-900 dark:text-white mt-1">Đánh Giá Tình Trạng Thực Tế</h3>
              <p className="text-xs text-slate-500">Visual Cards hiển thị cấp độ chất lượng trang thiết bị hiện trường</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {conditionOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCondition(opt.id)}
                  className={`p-5 rounded-2xl border-2 text-left flex items-start gap-4 transition-all ${
                    condition === opt.id
                      ? `${opt.border} ${opt.bg} shadow-md`
                      : 'border-slate-200 dark:border-navy-700 hover:border-slate-300 bg-white dark:bg-navy-900'
                  }`}
                >
                  <span className="text-2xl mt-0.5">{opt.icon}</span>
                  <div>
                    <div className={`font-extrabold text-sm ${opt.text}`}>
                      {opt.label}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {opt.desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: EVIDENCE */}
        {step === 4 && (
          <div className="space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono font-bold text-electric-500 uppercase tracking-wider">STEP 04 / EVIDENCE</span>
                <h3 className="text-xl font-extrabold text-navy-900 dark:text-white mt-1">Minh Chứng Hình Ảnh Hiện Trường</h3>
                <p className="text-xs text-slate-500">Chụp ảnh có đóng dấu Watermark tọa độ vệ tinh & dấu thời gian</p>
              </div>

              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-electric-500 hover:bg-electric-600 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-electric-500/20"
              >
                <Camera className="w-4 h-4" />
                <span>📸 TAKE PHOTO</span>
              </button>
            </div>

            {photos.length === 0 ? (
              <div
                onClick={() => setIsCameraOpen(true)}
                className="p-10 rounded-2xl border-2 border-dashed border-slate-300 dark:border-navy-700 bg-slate-50/50 dark:bg-navy-900/30 text-center cursor-pointer hover:border-electric-400 transition-colors"
              >
                <Camera className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                <p className="font-extrabold text-sm text-navy-800 dark:text-slate-200">Chưa có ảnh bằng chứng nào</p>
                <p className="text-xs text-slate-500 mt-1">Nhấn để mở máy ảnh và chụp hình hiện trường (Hỗ trợ nhiều ảnh)</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((photo, index) => (
                  <div key={photo.id} className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-navy-700 shadow-sm group">
                    <img src={photo.base64} alt={`Evidence ${index + 1}`} className="w-full h-36 object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(photo.id)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md hover:bg-rose-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-navy-900/80 text-[10px] text-electric-300 font-mono p-1 text-center">
                      ẢNH #{index + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 5: NOTE & REVIEW */}
        {step === 5 && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <span className="text-[11px] font-mono font-bold text-electric-500 uppercase tracking-wider">STEP 05 / NOTES & REVIEW</span>
              <h3 className="text-xl font-extrabold text-navy-900 dark:text-white mt-1">Ghi Chú & Xác Nhận Nộp</h3>
              <p className="text-xs text-slate-500">Mô tả triệu chứng hư hỏng và đề xuất phương án bảo trì</p>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-navy-800 dark:text-slate-200 mb-1.5 uppercase">
                Ghi chú mô tả chi tiết / Đề xuất sửa chữa
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Mô tả sự cố bạn tìm thấy tại hiện trường (VD: Máy chiếu Panasonic bóng đèn mờ, quạt gió điều hòa kêu to, ổ cắm góc phòng bị lỏng...)"
                className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-navy-600 bg-white dark:bg-navy-900 font-medium text-sm focus:ring-2 focus:ring-electric-400 outline-none leading-relaxed"
              />
            </div>

            {/* Summary Review Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-navy-900/60 border border-slate-200 dark:border-navy-700 text-xs space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-navy-700">
                <span className="text-slate-500">Vị trí:</span>
                <span className="font-extrabold text-navy-900 dark:text-white">{building} — {floor} — Phòng {room}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-navy-700">
                <span className="text-slate-500">Cơ sở vật chất:</span>
                <span className="font-bold">{facilityType}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-navy-700">
                <span className="text-slate-500">Tình trạng:</span>
                <span className="font-bold uppercase text-electric-600">{condition}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Ảnh minh chứng:</span>
                <span className="font-bold">{photos.length} tệp ảnh</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Sticky Bottom Actions Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-navy-900/95 backdrop-blur-md border-t border-slate-200 dark:border-navy-800 z-30">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrevStep}
            className="px-5 py-3 rounded-xl border border-slate-300 dark:border-navy-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100"
          >
            {step === 1 ? 'Hủy' : '← Quay lại'}
          </button>

          {step < totalSteps ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="flex-1 sm:flex-none px-7 py-3 rounded-xl bg-electric-500 hover:bg-electric-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-electric-500/25"
            >
              <span>Tiếp tục bước {step + 1}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isSaving}
              className="flex-1 sm:flex-none px-8 py-3.5 rounded-xl bg-field-500 hover:bg-field-600 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-field-500/30 transition-all disabled:opacity-50"
            >
              {syncService.isOnline() ? (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>☁️ SAVE & SYNC (LƯU & ĐỒNG BỘ)</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>💾 SAVE SURVEY (LƯU NGOẠI TUYẾN)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Custom Camera Viewfinder HUD */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onPhotoCaptured={handlePhotoCaptured}
        gps={gps}
        surveyId={surveyId}
      />
    </div>
  );
};
