// Quản trị Cơ sở Dữ liệu Ngoại Tuyến IndexedDB cho VKU Field Survey
// Lưu trữ bản nháp thời gian thực, phiếu khảo sát và hàng đợi đồng bộ

const DB_NAME = 'VKU_FieldSurvey_DB';
const DB_VERSION = 1;

let dbInstance = null;

/**
 * Khởi tạo hoặc lấy kết nối IndexedDB
 */
export async function initDB() {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. Kho lưu bản nháp theo thời gian thực (Key-Value)
      if (!db.objectStoreNames.contains('drafts')) {
        db.createObjectStore('drafts', { keyPath: 'key' });
      }

      // 2. Kho lưu phiếu khảo sát đã hoàn tất
      if (!db.objectStoreNames.contains('surveys')) {
        const surveyStore = db.createObjectStore('surveys', { keyPath: 'id' });
        surveyStore.createIndex('timestamp', 'timestamp', { unique: false });
        surveyStore.createIndex('status', 'status', { unique: false });
        surveyStore.createIndex('building', 'building', { unique: false });
        surveyStore.createIndex('category', 'category', { unique: false });
      }

      // 3. Kho lưu hàng đợi đồng bộ ngoại tuyến (Sync Queue)
      if (!db.objectStoreNames.contains('sync_queue')) {
        const queueStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
        queueStore.createIndex('status', 'status', { unique: false });
        queueStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // 4. Kho nhật ký đồng bộ (Audit Logs)
      if (!db.objectStoreNames.contains('sync_logs')) {
        const logStore = db.createObjectStore('sync_logs', { keyPath: 'id', autoIncrement: true });
        logStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      console.log('[IndexedDB] Đã kết nối cơ sở dữ liệu VKU thành công');
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('[IndexedDB] Lỗi khởi tạo DB:', event.target.error);
      reject(event.target.error);
    };
  });
}

// ==========================================
// 1. QUẢN LÝ BẢN NHÁP (DRAFT - REAL-TIME SAVE)
// ==========================================

export async function saveDraft(data) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('drafts', 'readwrite');
    const store = tx.objectStore('drafts');
    const record = {
      key: 'active_draft',
      updatedAt: new Date().toISOString(),
      data: data
    };
    const req = store.put(record);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

export async function getDraft() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('drafts', 'readonly');
    const store = tx.objectStore('drafts');
    const req = store.get('active_draft');
    req.onsuccess = () => resolve(req.result ? req.result.data : null);
    req.onerror = () => reject(req.error);
  });
}

export async function clearDraft() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('drafts', 'readwrite');
    const store = tx.objectStore('drafts');
    const req = store.delete('active_draft');
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

// ==========================================
// 2. QUẢN LÝ PHIẾU KHẢO SÁT (SURVEYS)
// ==========================================

export async function saveSurvey(survey) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('surveys', 'readwrite');
    const store = tx.objectStore('surveys');
    const req = store.put(survey);
    req.onsuccess = () => resolve(survey);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllSurveys() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('surveys', 'readonly');
    const store = tx.objectStore('surveys');
    const req = store.getAll();
    req.onsuccess = () => {
      // Sắp xếp thời gian mới nhất lên đầu
      const list = req.result || [];
      list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getSurveyById(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('surveys', 'readonly');
    const store = tx.objectStore('surveys');
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function updateSurveyStatus(id, newStatus, extra = {}) {
  const db = await initDB();
  const survey = await getSurveyById(id);
  if (!survey) return null;

  return new Promise((resolve, reject) => {
    const tx = db.transaction('surveys', 'readwrite');
    const store = tx.objectStore('surveys');
    const updated = {
      ...survey,
      status: newStatus,
      ...extra,
      lastUpdated: new Date().toISOString()
    };
    const req = store.put(updated);
    req.onsuccess = () => resolve(updated);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteSurvey(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['surveys', 'sync_queue'], 'readwrite');
    tx.objectStore('surveys').delete(id);
    tx.objectStore('sync_queue').delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

// ==========================================
// 3. HÀNG ĐỢI ĐỒNG BỘ NGOẠI TUYẾN (SYNC QUEUE)
// ==========================================

export async function enqueueSync(survey) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sync_queue', 'readwrite');
    const store = tx.objectStore('sync_queue');
    const queueItem = {
      id: survey.id,
      surveyData: survey,
      status: 'PENDING_SYNC',
      attempts: 0,
      createdAt: new Date().toISOString(),
      lastAttempt: null,
      errorMsg: null
    };
    const req = store.put(queueItem);
    req.onsuccess = () => resolve(queueItem);
    req.onerror = () => reject(req.error);
  });
}

export async function getSyncQueue() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sync_queue', 'readonly');
    const store = tx.objectStore('sync_queue');
    const req = store.getAll();
    req.onsuccess = () => {
      const items = req.result || [];
      // Ưu tiên theo thời gian nộp
      items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function updateQueueItem(item) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sync_queue', 'readwrite');
    const store = tx.objectStore('sync_queue');
    const req = store.put(item);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

export async function dequeueSync(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sync_queue', 'readwrite');
    const store = tx.objectStore('sync_queue');
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

// ==========================================
// 4. NHẬT KÝ ĐỒNG BỘ (AUDIT LOGS)
// ==========================================

export async function logSyncActivity(action, surveyId, details = {}) {
  const db = await initDB();
  return new Promise((resolve) => {
    const tx = db.transaction('sync_logs', 'readwrite');
    const store = tx.objectStore('sync_logs');
    store.add({
      timestamp: new Date().toISOString(),
      action,
      surveyId,
      details
    });
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
  });
}

export async function getSyncLogs(limit = 50) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sync_logs', 'readonly');
    const store = tx.objectStore('sync_logs');
    const req = store.getAll();
    req.onsuccess = () => {
      const logs = req.result || [];
      logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      resolve(logs.slice(0, limit));
    };
    req.onerror = () => reject(req.error);
  });
}

// ==========================================
// 5. THỐNG KÊ VÀ BỘ NHỚ
// ==========================================

export async function getStorageStats() {
  const db = await initDB();
  const surveys = await getAllSurveys();
  const queue = await getSyncQueue();
  const draft = await getDraft();

  const total = surveys.length;
  const pending = surveys.filter((s) => s.status === 'PENDING_SYNC').length;
  const synced = surveys.filter((s) => s.status === 'SYNCED').length;

  let estimateStorage = 'Chưa xác định';
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usedMB = (estimate.usage / (1024 * 1024)).toFixed(2);
      const quotaMB = (estimate.quota / (1024 * 1024)).toFixed(0);
      estimateStorage = `${usedMB} MB / ${quotaMB} MB`;
    } catch (e) {
      console.warn(e);
    }
  }

  return {
    totalSurveys: total,
    pendingSync: pending,
    syncedSurveys: synced,
    queueLength: queue.length,
    hasDraft: !!draft,
    storageEstimate: estimateStorage
  };
}

export async function clearAllDatabase() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['drafts', 'surveys', 'sync_queue', 'sync_logs'], 'readwrite');
    tx.objectStore('drafts').clear();
    tx.objectStore('surveys').clear();
    tx.objectStore('sync_queue').clear();
    tx.objectStore('sync_logs').clear();
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
