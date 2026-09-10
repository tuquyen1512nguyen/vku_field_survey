import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { OfflineBadge } from './components/OfflineBadge';
import { SyncCenterModal } from './components/SyncCenterModal';
import { SurveyDetailModal } from './components/SurveyDetailModal';
import { HomeMission } from './pages/HomeMission';
import { SurveyForm } from './pages/SurveyForm';
import { CampusMap } from './pages/CampusMap';
import { RecordsTimeline } from './pages/RecordsTimeline';
import { ProfileSettings } from './pages/ProfileSettings';
import { syncService } from './services/syncService';
import { NotificationService } from './services/notificationService';
import {
  getAllSurveys,
  getSyncQueue,
  getDraft,
  getSettings,
  saveSettings,
  saveSurvey,
  addToSyncQueue,
  clearAllDatabase
} from './services/indexedDB';
import { Survey, SurveyDraft, TabType, UserSettings } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [completedTodayCount, setCompletedTodayCount] = useState<number>(0);
  const [activeDraft, setActiveDraft] = useState<SurveyDraft | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(syncService.isOnline());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [isSyncCenterOpen, setIsSyncCenterOpen] = useState<boolean>(false);
  const [selectedDetailSurvey, setSelectedDetailSurvey] = useState<Survey | null>(null);
  const [settings, setSettings] = useState<UserSettings>({
    darkMode: true,
    autoSync: true,
    highAccuracyGPS: true,
    auditorName: 'Nguyễn Văn An',
    studentId: '21IT001',
    department: 'Đội Khảo Sát Số 1 - Khoa CNTT',
    auditorPhone: '0905123456',
    googleScriptUrl: '',
    publicSheetUrl: '',
    autoSyncGoogleSheet: true,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // 1. Khởi tạo dữ liệu & Đăng ký sự kiện
  const refreshAllData = async () => {
    try {
      const all = await getAllSurveys();
      const queue = await getSyncQueue();
      const draft = await getDraft();
      const userSets = await getSettings();

      // Nếu chưa có dữ liệu hoặc là dữ liệu v1 cũ (chưa có auditorName), xóa và nạp 4 mẫu mới
      if (all.length === 0 || (all.length > 0 && !all[0].auditorName)) {
        await clearAllDatabase();
        await seedSampleSurveys();
        return;
      }

      setSurveys(all);
      setPendingCount(queue.length);
      setActiveDraft(draft);
      if (userSets) {
        setSettings((prev) => ({ ...prev, ...userSets }));
      }

      const todayStr = new Date().toDateString();
      const todayCount = all.filter((s) => new Date(s.createdAt).toDateString() === todayStr).length;
      setCompletedTodayCount(todayCount);
    } catch (err) {
      console.error('[App] Lỗi khởi tạo dữ liệu:', err);
    }
  };

  useEffect(() => {
    refreshAllData();
    NotificationService.init();

    const unsubscribe = syncService.subscribe((event) => {
      setIsOnline(syncService.isOnline());
      if (event === 'sync-started') {
        setIsSyncing(true);
      } else if (event === 'sync-completed' || event === 'sync-failed') {
        setIsSyncing(false);
        refreshAllData();
      } else if (event === 'status-changed') {
        setIsOnline(syncService.isOnline());
      }
    });

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    return unsubscribe;
  }, []);

  // 2. Nạp dữ liệu thực địa mẫu giống vku-field-survey.pages.dev
  const seedSampleSurveys = async () => {
    const createSamplePhoto = (text: string, color: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 600, 400);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(text, 300, 180);
        ctx.font = '14px "JetBrains Mono", monospace';
        ctx.fillText('VKU FIELD SURVEY // EVIDENCT PHOTO', 300, 220);
        ctx.fillText(new Date().toLocaleString('vi-VN'), 300, 250);
      }
      return canvas.toDataURL('image/jpeg', 0.8);
    };

    const samples: Survey[] = [
      {
        id: 'SUR-00101',
        auditorName: 'Nguyễn Văn An',
        studentId: '21IT001',
        department: 'Đội Khảo Sát Số 1 - Khoa CNTT',
        auditorPhone: '0905123456',
        targetName: 'Trần Thị Mai',
        targetId: '22IT045',
        targetPhone: '0914111222',
        targetType: 'Sinh viên VKU',
        building: 'Khu B',
        floor: 'Tầng 2',
        room: 'B204',
        facilityType: 'Classroom',
        topic: 'Cơ sở vật chất & Thiết bị phòng học',
        condition: 'NEEDS_ATTENTION',
        ratingStars: 2,
        notes: 'Máy chiếu phòng B204 chập chờn, bóng đèn mờ và quạt trần kêu to. Cần bảo trì trước đợt thi cuối kỳ.',
        photos: [{ id: 'p-1', base64: createSamplePhoto('PHÒNG B204 - MÁY CHIẾU CHẬP CHỜN', '#0369a1'), timestamp: Date.now() - 7200000 }],
        latitude: 15.97495,
        longitude: 108.25164,
        accuracy: 5,
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        updatedAt: new Date(Date.now() - 7200000).toISOString(),
        syncStatus: 'synced',
      },
      {
        id: 'SUR-00102',
        auditorName: 'Nguyễn Văn An',
        studentId: '21IT001',
        department: 'Đội Khảo Sát Số 1 - Khoa CNTT',
        auditorPhone: '0905123456',
        targetName: 'ThS. Hoàng Minh Đức',
        targetId: 'GV-0012',
        targetPhone: '0905888999',
        targetType: 'Giảng viên / Cán bộ',
        building: 'Khu C',
        floor: 'Tầng 3',
        room: 'C301',
        facilityType: 'Laboratory',
        topic: 'Thiết bị Lab & Mạng LAN',
        condition: 'GOOD',
        ratingStars: 5,
        notes: 'Mạng WiFi chuyên dụng cho lab hoạt động ổn định, tuy nhiên một số máy tính trạm bàn 14 và 18 bị lỏng dây mạng LAN.',
        photos: [{ id: 'p-2', base64: createSamplePhoto('LAB C301 - MẠNG LAB ỔN ĐỊNH', '#047857'), timestamp: Date.now() - 3600000 }],
        latitude: 15.97582,
        longitude: 108.2531,
        accuracy: 8,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
        syncStatus: 'pending',
      },
      {
        id: 'SUR-00103',
        auditorName: 'Lê Thị Bảo',
        studentId: '22IT099',
        department: 'Đội Khảo Sát Số 2 - Đoàn Hội',
        auditorPhone: '0935333444',
        targetName: 'Bác Nguyễn Thị Hạnh',
        targetId: 'NT-1204',
        targetPhone: '0905777666',
        targetType: 'Chủ nhà trọ / Dân cư',
        building: 'Khu vực ngoài trường',
        floor: 'Tầng 1',
        room: 'Tổ 12 Hòa Quý',
        facilityType: 'Other',
        topic: 'An ninh trật tự khu trọ sinh viên',
        condition: 'GOOD',
        ratingStars: 5,
        notes: 'Sinh viên VKU trọ tại khu vực chấp hành tốt an ninh trật tự, tham gia tích cực hoạt động vệ sinh tuyến đường văn minh đô thị.',
        photos: [{ id: 'p-3', base64: createSamplePhoto('KHU TRỌ KHU VỰC HÒA QUÝ - AN NINH TỐT', '#4338ca'), timestamp: Date.now() - 1200000 }],
        latitude: 15.976105,
        longitude: 108.251944,
        accuracy: 12,
        createdAt: new Date(Date.now() - 1200000).toISOString(),
        updatedAt: new Date(Date.now() - 1200000).toISOString(),
        syncStatus: 'pending',
      },
      {
        id: 'SUR-00104',
        auditorName: 'Trần Minh Tuấn',
        studentId: '20IT088',
        department: 'Đội Khảo Sát Số 3 - Quan Hệ Doanh Nghiệp',
        auditorPhone: '0988666555',
        targetName: 'Công ty CP Công nghệ Enouvo IT',
        targetId: 'DN-ENOUVO',
        targetPhone: '02363111222',
        targetType: 'Doanh nghiệp tuyển dụng',
        building: 'Khu A',
        floor: 'Tầng 1',
        room: 'Hội trường A',
        facilityType: 'Other',
        topic: 'Đánh giá chất lượng thực tập sinh',
        condition: 'GOOD',
        ratingStars: 5,
        notes: 'Đánh giá cao năng lực lập trình và thái độ học hỏi của sinh viên thực tập VKU. Mong muốn tiếp tục tuyển dụng 20 vị trí Frontend/Backend.',
        photos: [{ id: 'p-4', base64: createSamplePhoto('HỘI THẢO DOANH NGHIỆP ENOUVO - VKU', '#b91c1c'), timestamp: Date.now() - 600000 }],
        latitude: 15.975412,
        longitude: 108.25221,
        accuracy: 6,
        createdAt: new Date(Date.now() - 600000).toISOString(),
        updatedAt: new Date(Date.now() - 600000).toISOString(),
        syncStatus: 'synced',
      }
    ];

    for (const s of samples) {
      await saveSurvey(s);
      if (s.syncStatus === 'pending') {
        await addToSyncQueue(s);
      }
    }

    const all = await getAllSurveys();
    const q = await getSyncQueue();
    setSurveys(all);
    setPendingCount(q.length);
    setCompletedTodayCount(all.length);
  };

  const handleToggleSimulate = () => {
    const isSim = syncService.toggleSimulatedOffline();
    setIsSimulatedOffline(isSim);
    setIsOnline(syncService.isOnline());
  };

  const handleClearData = async () => {
    if (confirm('CẢNH BÁO: Bạn có chắc chắn muốn xóa TOÀN BỘ dữ liệu khảo sát trong bộ nhớ máy (IndexedDB)?')) {
      await clearAllDatabase();
      await refreshAllData();
      alert('Đã xóa sạch dữ liệu IndexedDB!');
    }
  };

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        alert('Cảm ơn bạn đã cài đặt VKU Field Survey!');
      }
      setDeferredPrompt(null);
    } else {
      alert('Ứng dụng đã sẵn sàng chạy độc lập (Standalone PWA). Nếu dùng Chrome/Edge, hãy bấm biểu tượng Install trên thanh địa chỉ URL.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 dark">
      {/* Navigation */}
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        pendingCount={pendingCount}
      />

      {/* Main Content */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        {/* Offline Badge Header */}
        <OfflineBadge
          isOnline={isOnline}
          isSyncing={isSyncing}
          pendingCount={pendingCount}
          isSimulatedOffline={isSimulatedOffline}
          googleScriptUrl={settings.googleScriptUrl}
          onToggleSimulate={handleToggleSimulate}
          onOpenSyncCenter={() => setIsSyncCenterOpen(true)}
        />

        <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 sm:p-6 md:p-8">
          {activeTab === 'home' && (
            <HomeMission
              onStartSurvey={() => setActiveTab('survey')}
              onNavigateTab={(tab) => setActiveTab(tab)}
              isOnline={isOnline}
              pendingCount={pendingCount}
              completedTodayCount={completedTodayCount}
              activeDraft={activeDraft}
              recentSurveys={surveys}
              settings={settings}
              onSelectSurvey={(s) => setSelectedDetailSurvey(s)}
            />
          )}

          {activeTab === 'survey' && (
            <SurveyForm
              onBack={() => setActiveTab('home')}
              initialDraft={activeDraft}
              settings={settings}
              onSurveyCompleted={() => {
                refreshAllData();
                setActiveTab('records');
              }}
            />
          )}

          {activeTab === 'map' && (
            <CampusMap
              surveys={surveys}
              onSelectSurvey={(s) => setSelectedDetailSurvey(s)}
            />
          )}

          {activeTab === 'records' && (
            <RecordsTimeline
              surveys={surveys}
              settings={settings}
              onSelectSurvey={(s) => setSelectedDetailSurvey(s)}
              onOpenSyncCenter={() => setIsSyncCenterOpen(true)}
              pendingCount={pendingCount}
              onRefreshData={refreshAllData}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileSettings
              settings={settings}
              onUpdateSettings={async (newSets) => {
                setSettings(newSets);
                await saveSettings(newSets);
              }}
              surveys={surveys}
              onClearData={handleClearData}
              onInstallPWA={handleInstallPWA}
              canInstallPWA={!!deferredPrompt}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <SyncCenterModal
        isOpen={isSyncCenterOpen}
        onClose={() => setIsSyncCenterOpen(false)}
        onSyncCompleted={refreshAllData}
      />

      <SurveyDetailModal
        survey={selectedDetailSurvey}
        onClose={() => setSelectedDetailSurvey(null)}
      />
    </div>
  );
}

export default App;
