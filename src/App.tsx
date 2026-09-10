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
    darkMode: false,
    autoSync: true,
    highAccuracyGPS: true,
    auditorName: 'Nguyễn Văn An',
    studentId: '21IT001',
    department: 'Khoa Kỹ thuật Máy tính & Điện tử'
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

      // Nếu chưa có dữ liệu, tự động nạp 3 dữ liệu khảo sát thực địa mẫu của VKU
      if (all.length === 0) {
        await seedSampleSurveys();
        return;
      }

      setSurveys(all);
      setPendingCount(queue.length);
      setActiveDraft(draft);
      setSettings(userSets);

      // Đếm số lượng hoàn thành hôm nay
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

    // Lắng nghe sự kiện đồng bộ
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

    // Bắt sự kiện trước khi cài đặt PWA
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    return unsubscribe;
  }, []);

  // 2. Nạp dữ liệu thực địa mẫu của trường VKU
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
        ctx.fillText('VKU FIELD MISSION // AUDIT PHOTO', 300, 220);
        ctx.fillText(new Date().toLocaleString('vi-VN'), 300, 250);
      }
      return canvas.toDataURL('image/jpeg', 0.8);
    };

    const samples: Survey[] = [
      {
        id: 'SUR-00101',
        building: 'Khu A',
        floor: 'Tầng 1',
        room: 'A.102',
        facilityType: 'Classroom',
        condition: 'NEEDS_ATTENTION',
        notes: 'Máy chiếu Panasonic bị mờ và nhấp nháy liên tục sau 15 phút mở máy, cần bảo dưỡng hoặc thay cụm đèn.',
        photos: [{ id: 'p-1', base64: createSamplePhoto('PHÒNG A.102 - MÁY CHIẾU MỜ', '#0369a1'), timestamp: Date.now() - 7200000 }],
        latitude: 15.975412,
        longitude: 108.25221,
        accuracy: 5,
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        updatedAt: new Date(Date.now() - 7200000).toISOString(),
        syncStatus: 'synced',
      },
      {
        id: 'SUR-00102',
        building: 'Khu K',
        floor: 'Tầng 3',
        room: 'K.301',
        facilityType: 'Laboratory',
        condition: 'DAMAGED',
        notes: 'Máy điều hòa chảy nước nhỏ giọt xuống dãy bàn máy tính số 3, quạt gió rung lắc mạnh gây ồn.',
        photos: [{ id: 'p-2', base64: createSamplePhoto('KHU K.301 - ĐIỀU HÒA HỎNG', '#b91c1c'), timestamp: Date.now() - 3600000 }],
        latitude: 15.97489,
        longitude: 108.253102,
        accuracy: 8,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
        syncStatus: 'pending',
      },
      {
        id: 'SUR-00103',
        building: 'Khu V',
        floor: 'Tầng hầm',
        room: 'V.B02',
        facilityType: 'Other',
        condition: 'GOOD',
        notes: 'Hệ thống điện và tủ biến áp tầng hầm Khu V hoạt động rất ổn định, nhiệt độ phòng kỹ thuật đạt chuẩn.',
        photos: [{ id: 'p-3', base64: createSamplePhoto('TẦNG HẦM KHU V - HẠ TẦNG ĐIỆN TỐT', '#047857'), timestamp: Date.now() - 1200000 }],
        latitude: 15.976105,
        longitude: 108.251944,
        accuracy: 12,
        createdAt: new Date(Date.now() - 1200000).toISOString(),
        updatedAt: new Date(Date.now() - 1200000).toISOString(),
        syncStatus: 'pending',
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
    if (confirm('Bạn có chắc chắn muốn dọn sạch cơ sở dữ liệu IndexedDB?')) {
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
    <div className={`min-h-screen bg-canvas text-navy-900 ${settings.darkMode ? 'dark bg-navy-900 text-white' : ''}`}>
      {/* Navigation (Desktop Sidebar & Mobile Bottom Tabs) */}
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        pendingCount={pendingCount}
      />

      {/* Main Content Area (Desktop Offset by 64 Tailwind w-64) */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        {/* Offline Status Badge & Floating Chip Bar */}
        <OfflineBadge
          isOnline={isOnline}
          isSyncing={isSyncing}
          pendingCount={pendingCount}
          isSimulatedOffline={isSimulatedOffline}
          onToggleSimulate={handleToggleSimulate}
          onOpenSyncCenter={() => setIsSyncCenterOpen(true)}
        />

        {/* View Pages (max-width ~1400px as per specification) */}
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
              onSelectSurvey={(s) => setSelectedDetailSurvey(s)}
            />
          )}

          {activeTab === 'survey' && (
            <SurveyForm
              onBack={() => setActiveTab('home')}
              initialDraft={activeDraft}
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
              onSelectSurvey={(s) => setSelectedDetailSurvey(s)}
              onOpenSyncCenter={() => setIsSyncCenterOpen(true)}
              pendingCount={pendingCount}
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

