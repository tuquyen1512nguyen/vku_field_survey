// Dịch vụ lưu trữ cục bộ an toàn và bền vững IndexedDB (Field Mission Edition)
import { Survey, SurveyDraft, SyncQueueItem, UserSettings, SurveyPhoto } from '../types';

const DB_NAME = 'VKU_FieldMission_DB';
const DB_VERSION = 2;

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Kho lưu toàn bộ bản ghi khảo sát
      if (!db.objectStoreNames.contains('surveys')) {
        const surveyStore = db.createObjectStore('surveys', { keyPath: 'id' });
        surveyStore.createIndex('createdAt', 'createdAt', { unique: false });
        surveyStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        surveyStore.createIndex('building', 'building', { unique: false });
        surveyStore.createIndex('condition', 'condition', { unique: false });
      }

      // 2. Kho lưu ảnh hiện trường
      if (!db.objectStoreNames.contains('photos')) {
        const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
        photoStore.createIndex('surveyId', 'surveyId', { unique: false });
      }

      // 3. Kho lưu hàng đợi đồng bộ ngoại tuyến
      if (!db.objectStoreNames.contains('syncQueue')) {
        const queueStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
        queueStore.createIndex('status', 'status', { unique: false });
        queueStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // 4. Kho lưu cấu hình & bản nháp
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

// ==========================================
// 1. BẢN NHÁP (DRAFTS - REAL-TIME SAVE)
// ==========================================

export async function saveDraft(draft: SurveyDraft): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    const req = store.put({ key: 'active_draft', value: draft });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getDraft(): Promise<SurveyDraft | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const req = store.get('active_draft');
    req.onsuccess = () => resolve(req.result ? req.result.value : null);
    req.onerror = () => reject(req.error);
  });
}

export async function clearDraft(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    const req = store.delete('active_draft');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ==========================================
// 2. KHẢO SÁT (SURVEYS)
// ==========================================

export async function saveSurvey(survey: Survey): Promise<Survey> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['surveys', 'photos'], 'readwrite');
    const surveyStore = tx.objectStore('surveys');
    const photoStore = tx.objectStore('photos');

    // Lưu từng ảnh vào photos store để quản lý độc lập
    if (survey.photos && survey.photos.length > 0) {
      survey.photos.forEach((photo) => {
        photoStore.put({ ...photo, surveyId: survey.id });
      });
    }

    const req = surveyStore.put(survey);
    req.onsuccess = () => resolve(survey);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllSurveys(): Promise<Survey[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('surveys', 'readonly');
    const store = tx.objectStore('surveys');
    const req = store.getAll();
    req.onsuccess = () => {
      const list = (req.result || []) as Survey[];
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function updateSurveyStatus(id: string, syncStatus: Survey['syncStatus'], syncError?: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('surveys', 'readwrite');
    const store = tx.objectStore('surveys');
    const req = store.get(id);
    req.onsuccess = () => {
      const item = req.result;
      if (item) {
        item.syncStatus = syncStatus;
        item.updatedAt = new Date().toISOString();
        if (syncError !== undefined) item.syncError = syncError;
        store.put(item);
      }
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

// ==========================================
// 3. HÀNG ĐỢI ĐỒNG BỘ (SYNC QUEUE)
// ==========================================

export async function addToSyncQueue(survey: Survey): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    const queueItem: SyncQueueItem = {
      id: survey.id,
      surveyData: survey,
      attempts: 0,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    const req = store.put(queueItem);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('syncQueue', 'readonly');
    const store = tx.objectStore('syncQueue');
    const req = store.getAll();
    req.onsuccess = () => {
      const list = (req.result || []) as SyncQueueItem[];
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function removeFromSyncQueue(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteSurvey(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['surveys', 'photos'], 'readwrite');
    tx.objectStore('surveys').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ==========================================
// 4. CÀI ĐẶT & THỐNG KÊ (SETTINGS & STATS)
// ==========================================

export const DEFAULT_SETTINGS: UserSettings = {
  darkMode: true,
  autoSync: true,
  highAccuracyGPS: true,
  auditorName: 'Nguyễn Văn An',
  studentId: '21IT001',
  department: 'Khoa Kỹ thuật Máy tính & Điện tử',
  auditorPhone: '0905123456',
  googleScriptUrl: '',
  publicSheetUrl: '',
  autoSyncGoogleSheet: true
};

export async function getSettings(): Promise<UserSettings> {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const req = store.get('user_settings');
    req.onsuccess = () => resolve(req.result ? req.result.value : DEFAULT_SETTINGS);
    req.onerror = () => resolve(DEFAULT_SETTINGS);
  });
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    const req = store.put({ key: 'user_settings', value: settings });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getStorageEstimate(): Promise<string> {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const est = await navigator.storage.estimate();
      const usedMB = ((est.usage || 0) / (1024 * 1024)).toFixed(2);
      const quotaMB = ((est.quota || 0) / (1024 * 1024)).toFixed(0);
      return `${usedMB} MB / ${quotaMB} MB`;
    } catch {
      return '1.4 MB / 1024 MB';
    }
  }
  return 'Khả dụng';
}

export async function clearAllDatabase(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['surveys', 'photos', 'syncQueue', 'settings'], 'readwrite');
    tx.objectStore('surveys').clear();
    tx.objectStore('photos').clear();
    tx.objectStore('syncQueue').clear();
    tx.objectStore('settings').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

