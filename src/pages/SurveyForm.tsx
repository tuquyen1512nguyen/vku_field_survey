import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Camera,
  Check,
  Trash2,
  Save,
  UploadCloud,
  RotateCcw,
  Star,
  User,
  Building2,
  FileText,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { LocationService } from '../services/locationService';
import { saveDraft, clearDraft, saveSurvey, addToSyncQueue, getSettings } from '../services/indexedDB';
import { syncService } from '../services/syncService';
import { CameraModal } from '../components/CameraModal';
import {
  Survey,
  SurveyDraft,
  FacilityType,
  ConditionRating,
  GPSCoordinates,
  SurveyPhoto,
  UserSettings
} from '../types';

interface SurveyFormProps {
  onBack: () => void;
  onSurveyCompleted: (survey: Survey) => void;
  initialDraft?: SurveyDraft | null;
  settings: UserSettings;
}

export const SurveyForm: React.FC<SurveyFormProps> = ({
  onBack,
  onSurveyCompleted,
  initialDraft,
  settings,
}) => {
  const [surveyId] = useState<string>(
    initialDraft?.id || 'SUR-' + Math.floor(10000 + Math.random() * 90000)
  );
  const [step, setStep] = useState<number>(initialDraft?.step || 1);

  // Bước 1: Thông tin ĐTV & Đối Tượng
  const [auditorName, setAuditorName] = useState<string>(
    initialDraft?.auditorName || settings.auditorName || 'Nguyễn Văn An'
  );
  const [studentId, setStudentId] = useState<string>(
    initialDraft?.studentId || settings.studentId || '21IT001'
  );
  const [department, setDepartment] = useState<string>(
    initialDraft?.department || settings.department || 'Đội Khảo Sát Số 1 - Khoa CNTT'
  );
  const [auditorPhone, setAuditorPhone] = useState<string>(
    initialDraft?.auditorPhone || settings.auditorPhone || '0905123456'
  );

  const [targetName, setTargetName] = useState<string>(initialDraft?.targetName || '');
  const [targetId, setTargetId] = useState<string>(initialDraft?.targetId || '');
  const [targetPhone, setTargetPhone] = useState<string>(initialDraft?.targetPhone || '');
  const [targetType, setTargetType] = useState<string>(initialDraft?.targetType || 'Sinh viên VKU');

  // Bước 2: Địa Điểm & Nội Dung
  const [building, setBuilding] = useState<string>(initialDraft?.building || 'Khu A');
  const [floor, setFloor] = useState<string>(initialDraft?.floor || 'Tầng 2');
  const [room, setRoom] = useState<string>(initialDraft?.room || 'A.204');
  const [facilityType, setFacilityType] = useState<FacilityType>(initialDraft?.facilityType || 'Classroom');
  const [topic, setTopic] = useState<string>(initialDraft?.topic || 'Cơ sở vật chất & Thiết bị');
  const [condition, setCondition] = useState<ConditionRating>(initialDraft?.condition || 'GOOD');
  const [ratingStars, setRatingStars] = useState<number>(initialDraft?.ratingStars || 5);
  const [notes, setNotes] = useState<string>(initialDraft?.notes || '');

  // Bước 3: GPS & Minh Chứng Ảnh
  const [photos, setPhotos] = useState<SurveyPhoto[]>(initialDraft?.photos || []);
  const [gps, setGps] = useState<GPSCoordinates | undefined>(initialDraft?.gps);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const totalSteps = 4;

  useEffect(() => {
    if (!gps) {
      handleGetLocation();
    }
  }, []);

  // Tự động lưu nháp vào IndexedDB
  useEffect(() => {
    const draftData: SurveyDraft = {
      id: surveyId,
      step,
      auditorName,
      studentId,
      department,
      auditorPhone,
      targetName,
      targetId,
      targetPhone,
      targetType,
      building,
      floor,
      room,
      facilityType,
      topic,
      condition,
      ratingStars,
      notes,
      photos,
      gps,
      lastUpdated: new Date().toISOString(),
    };

    const timer = setTimeout(() => {
      saveDraft(draftData).catch(console.error);
    }, 400);

    return () => clearTimeout(timer);
  }, [
    surveyId,
    step,
    auditorName,
    studentId,
    department,
    auditorPhone,
    targetName,
    targetId,
    targetPhone,
    targetType,
    building,
    floor,
    room,
    facilityType,
    topic,
    condition,
    ratingStars,
    notes,
    photos,
    gps,
  ]);

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
    if (step === 1) {
      if (!auditorName.trim() || !studentId.trim()) {
        alert('Vui lòng nhập đầy đủ Họ tên ĐTV và Mã ĐTV/MSSV.');
        return;
      }
    } else if (step === 2) {
      if (!room.trim()) {
        alert('Vui lòng nhập Số phòng / Tên vị trí cụ thể.');
        return;
      }
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
    if (!room.trim() || !auditorName.trim()) {
      alert('Vui lòng điền đầy đủ các thông tin bắt buộc!');
      setStep(1);
      return;
    }

    setIsSaving(true);
    const isOnline = syncService.isOnline();
    const now = new Date().toISOString();

    const newSurvey: Survey = {
      id: surveyId,
      auditorName: auditorName.trim(),
      studentId: studentId.trim(),
      department: department.trim(),
      auditorPhone: auditorPhone.trim(),
      targetName: targetName.trim(),
      targetId: targetId.trim(),
      targetPhone: targetPhone.trim(),
      targetType: targetType.trim(),
      building,
      floor,
      room: room.trim(),
      facilityType,
      topic,
      condition,
      ratingStars,
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

      // 4. Nếu Online -> tự động kích hoạt đồng bộ
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

  const progressPercent = Math.round((step / totalSteps) * 100);

  return (
    <div className="space-y-5 pb-24 max-w-3xl mx-auto animate-fadeIn">
      {/* 1. Progress Header Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg sticky top-14 z-20">
        <div className="flex items-center justify-between gap-3 mb-2">
          <button
            onClick={handlePrevStep}
            className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{step === 1 ? 'Thoát' : 'Quay lại'}</span>
          </button>

          <span className="font-mono font-black text-sm text-sky-400">
            PHIẾU KHẢO SÁT #{surveyId}
          </span>

          <span className="font-mono text-xs font-bold text-slate-400">
            Bước 0{step} / 0{totalSteps}
          </span>
        </div>

        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 2. Step Content Box */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
        {/* BƯỚC 1: ĐTV & ĐỐI TƯỢNG */}
        {step === 1 && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <span className="text-[11px] font-mono font-bold text-sky-400 uppercase tracking-wider">BƯỚC 01 / THÔNG TIN CHUNG</span>
              <h3 className="text-xl font-extrabold text-white mt-1">Điều Tra Viên & Đối Tượng Khảo Sát</h3>
              <p className="text-xs text-slate-400">Khai báo thông tin người thực hiện và đối tượng phỏng vấn</p>
            </div>

            {/* Thông tin ĐTV */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-xs font-extrabold text-sky-400 uppercase tracking-wider">
                <User className="w-4 h-4" />
                <span>1. Thông tin người đi khảo sát (ĐTV)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">
                    Họ tên ĐTV <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={auditorName}
                    onChange={(e) => setAuditorName(e.target.value)}
                    placeholder="VD: Nguyễn Văn An"
                    className="w-full p-3 rounded-xl border border-slate-700 bg-slate-900 text-white font-bold text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">
                    Mã ĐTV / MSSV <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="VD: 21IT001"
                    className="w-full p-3 rounded-xl border border-slate-700 bg-slate-900 text-white font-bold text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">Đội / Đơn vị</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="VD: Đội Khảo Sát Số 1 - Khoa CNTT"
                    className="w-full p-3 rounded-xl border border-slate-700 bg-slate-900 text-white font-medium text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">Số điện thoại ĐTV</label>
                  <input
                    type="text"
                    value={auditorPhone}
                    onChange={(e) => setAuditorPhone(e.target.value)}
                    placeholder="VD: 0905123456"
                    className="w-full p-3 rounded-xl border border-slate-700 bg-slate-900 text-white font-medium text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Thông tin Đối tượng khảo sát */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-400 uppercase tracking-wider">
                <User className="w-4 h-4" />
                <span>2. Đối tượng được khảo sát (Tùy chọn)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">Họ tên đối tượng</label>
                  <input
                    type="text"
                    value={targetName}
                    onChange={(e) => setTargetName(e.target.value)}
                    placeholder="VD: Trần Thị Mai / ThS. Hoàng Minh Đức"
                    className="w-full p-3 rounded-xl border border-slate-700 bg-slate-900 text-white font-semibold text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">Loại đối tượng</label>
                  <select
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-700 bg-slate-900 text-white font-semibold text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                  >
                    <option value="Sinh viên VKU">Sinh viên VKU</option>
                    <option value="Giảng viên / Cán bộ">Giảng viên / Cán bộ VKU</option>
                    <option value="Chủ nhà trọ / Dân cư">Chủ nhà trọ / Dân cư xung quanh</option>
                    <option value="Doanh nghiệp tuyển dụng">Doanh nghiệp tuyển dụng</option>
                    <option value="Khác">Đối tượng khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">Mã SV / CCCD đối tượng</label>
                  <input
                    type="text"
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    placeholder="VD: 22IT045 / 048099xxxxxx"
                    className="w-full p-3 rounded-xl border border-slate-700 bg-slate-900 text-white font-medium text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">SĐT đối tượng</label>
                  <input
                    type="text"
                    value={targetPhone}
                    onChange={(e) => setTargetPhone(e.target.value)}
                    placeholder="VD: 0914xxxxxx"
                    className="w-full p-3 rounded-xl border border-slate-700 bg-slate-900 text-white font-medium text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BƯỚC 2: NỘI DUNG & ĐÁNH GIÁ */}
        {step === 2 && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <span className="text-[11px] font-mono font-bold text-sky-400 uppercase tracking-wider">BƯỚC 02 / NỘI DUNG KHẢO SÁT</span>
              <h3 className="text-xl font-extrabold text-white mt-1">Địa Điểm & Nội Dung Đánh Giá</h3>
              <p className="text-xs text-slate-400">Chọn vị trí khảo sát tại trường VKU và nhập nội dung ghi nhận</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">
                  Tòa nhà / Khu vực <span className="text-rose-500">*</span>
                </label>
                <select
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-700 bg-slate-950 text-white font-bold text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                >
                  <option value="Khu A">Khu A — Hiệu bộ & Giảng đường</option>
                  <option value="Khu B">Khu B — Khoa học Máy tính</option>
                  <option value="Khu C">Khu C — Thực hành & Lab</option>
                  <option value="Khu K">Khu K — Giảng đường Lớn</option>
                  <option value="Khu V">Khu V — Đa năng & Tầng hầm</option>
                  <option value="Khuôn viên VKU">Khuôn viên ngoài trời</option>
                  <option value="Khu vực ngoài trường">Khu vực ngoại vi trường</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">Tầng</label>
                <select
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-700 bg-slate-950 text-white font-bold text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                >
                  <option value="Tầng hầm">Tầng hầm</option>
                  <option value="Tầng 1">Tầng 1</option>
                  <option value="Tầng 2">Tầng 2</option>
                  <option value="Tầng 3">Tầng 3</option>
                  <option value="Tầng 4">Tầng 4</option>
                  <option value="Tầng 5">Tầng 5</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">
                  Phòng / Vị trí cụ thể <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="VD: A.204, Lab B.301, V.B02"
                  className="w-full p-3 rounded-xl border border-slate-700 bg-slate-950 text-white font-bold text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">Chuyên đề khảo sát</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="VD: Cơ sở vật chất & Thiết bị phòng học"
                className="w-full p-3.5 rounded-xl border border-slate-700 bg-slate-950 text-white font-semibold text-sm focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            {/* Mức độ Đánh Giá (Star Rating) */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2 uppercase">Đánh giá chất lượng hiện trường</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => {
                      setRatingStars(star);
                      if (star >= 4) setCondition('GOOD');
                      else if (star === 3) setCondition('NEEDS_ATTENTION');
                      else setCondition('DAMAGED');
                    }}
                    className={`p-3 rounded-xl border transition-all ${
                      ratingStars >= star
                        ? 'bg-amber-500/20 border-amber-400 text-amber-400 scale-105'
                        : 'bg-slate-950 border-slate-800 text-slate-600 hover:border-slate-700'
                    }`}
                  >
                    <Star className={`w-6 h-6 ${ratingStars >= star ? 'fill-current' : ''}`} />
                  </button>
                ))}
                <span className="ml-3 text-xs font-extrabold text-amber-400 font-mono">
                  {ratingStars} / 5 SAO ({condition})
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">
                Ý kiến phỏng vấn / Nội dung ghi nhận thực tế
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Ghi lại chi tiết phản ánh của đối tượng hoặc mô tả chi tiết hư hỏng tại hiện trường..."
                className="w-full p-3.5 rounded-xl border border-slate-700 bg-slate-950 text-white font-medium text-sm focus:ring-2 focus:ring-sky-500 outline-none leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* BƯỚC 3: GPS & MINH CHỨNG ẢNH */}
        {step === 3 && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <span className="text-[11px] font-mono font-bold text-sky-400 uppercase tracking-wider">BƯỚC 03 / MINH CHỨNG THỰC ĐỊA</span>
              <h3 className="text-xl font-extrabold text-white mt-1">Ảnh Chụp & Định Vị GPS Vệ Tinh</h3>
              <p className="text-xs text-slate-400">Chụp ảnh xác thực hiện trường và cập nhật tọa độ GPS thực tế</p>
            </div>

            {/* Photo Capture Section */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-sky-400" />
                  <span className="text-xs font-bold text-white uppercase">Ảnh minh chứng hiện trường ({photos.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCameraOpen(true)}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-2 shadow-md"
                >
                  <Camera className="w-4 h-4" />
                  <span>Chụp Ảnh Native</span>
                </button>
              </div>

              {photos.length === 0 ? (
                <div
                  onClick={() => setIsCameraOpen(true)}
                  className="p-8 rounded-xl border-2 border-dashed border-slate-800 text-center cursor-pointer hover:border-sky-500 transition-colors"
                >
                  <Camera className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                  <p className="font-bold text-xs text-slate-300">Chưa đính kèm ảnh minh chứng nào</p>
                  <p className="text-[11px] text-slate-500 mt-1">Bấm để bật Máy ảnh Native (Tự đóng dấu Watermark Tọa độ & Thời gian)</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photos.map((p, index) => (
                    <div key={p.id} className="relative rounded-xl overflow-hidden border border-slate-800 group">
                      <img src={p.base64} alt={`Evidence ${index + 1}`} className="w-full h-32 object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(p.id)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md hover:bg-rose-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 text-[10px] text-sky-300 font-mono p-1 text-center">
                        ẢNH #{index + 1} (WATERMARK)
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* GPS Telemetry Box */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white font-mono">
                    {gps ? `GPS: ${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)}` : 'Chưa có tọa độ'}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Độ chính xác: ±{gps?.accuracy || 10}m | {gps?.source || 'Capacitor Native GPS'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGetLocation}
                disabled={isLocating}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 hover:border-sky-400 flex items-center gap-1.5 shadow-sm transition-all"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                <span>📍 Định Vị Lại</span>
              </button>
            </div>
          </div>
        )}

        {/* BƯỚC 4: RÀ SOÁT & LƯU */}
        {step === 4 && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <span className="text-[11px] font-mono font-bold text-sky-400 uppercase tracking-wider">BƯỚC 04 / RÀ SOÁT & LƯU PHIẾU</span>
              <h3 className="text-xl font-extrabold text-white mt-1">Xác Nhận & Lưu Phiếu Offline</h3>
              <p className="text-xs text-slate-400">Rà soát lại toàn bộ dữ liệu trước khi ghi nhận vào bộ nhớ thiết bị</p>
            </div>

            {/* Summary Review Sheet Card */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Mã khảo sát:</span>
                <span className="font-mono font-black text-sky-400">#{surveyId}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Điều tra viên:</span>
                <span className="font-bold text-white">{auditorName} ({studentId})</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Đối tượng khảo sát:</span>
                <span className="font-bold text-white">{targetName || 'Chưa ghi tên'} ({targetType})</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Vị trí hiện trường:</span>
                <span className="font-extrabold text-white">{building} — {floor} — Phòng {room}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Chuyên đề & Đánh giá:</span>
                <span className="font-bold text-amber-400">{topic} ({ratingStars} Star)</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Minh chứng & GPS:</span>
                <span className="font-bold text-emerald-400">{photos.length} ảnh chụp | GPS OK</span>
              </div>
            </div>

            {/* Explanation box */}
            <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-500/30 text-xs text-slate-300 space-y-1">
              <div className="font-bold text-sky-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Cơ chế bảo vệ dữ liệu Offline-First</span>
              </div>
              <p>
                Phiếu điều tra sẽ được <strong>lưu ngay vào IndexedDB trên máy của bạn</strong> (hoạt động 100% không cần mạng). Khi thiết bị có Internet, dữ liệu sẽ tự động đẩy lên Google Sheets.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Sticky Bottom Actions Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 z-30">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrevStep}
            className="px-5 py-3 rounded-xl border border-slate-700 font-bold text-xs text-slate-300 hover:bg-slate-800"
          >
            {step === 1 ? 'Hủy' : '← Quay lại'}
          </button>

          {step < totalSteps ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="flex-1 sm:flex-none px-7 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30"
            >
              <span>Tiếp tục bước {step + 1}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isSaving}
              className="flex-1 sm:flex-none px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
            >
              {syncService.isOnline() ? (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>☁️ LƯU & ĐỒNG BỘ GOOGLE SHEETS</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>💾 LƯU PHIẾU OFFLINE (VÀO MÁY)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Native Camera Modal */}
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
