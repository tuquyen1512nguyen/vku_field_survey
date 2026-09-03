// Định nghĩa kiểu dữ liệu TypeScript (Type Definitions) cho VKU Field Survey

export type BuildingType = 'Khu A' | 'Khu B' | 'Khu C' | 'Khu K' | 'Khu V';

export type CategoryType =
  | 'Máy chiếu & Màn chiếu'
  | 'Điều hòa không khí'
  | 'Hệ thống điện & Đèn chiếu sáng'
  | 'Máy tính & Phần cứng Lab'
  | 'Bàn ghế & Nội thất'
  | 'Cửa & Kính an toàn'
  | 'Thiết bị PCCC';

export type UrgencyLevel = 'LOW' | 'NORMAL' | 'URGENT';

export type SyncStatus = 'PENDING_SYNC' | 'SYNCING' | 'SYNCED' | 'FAILED';

export interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  source?: string;
}

export interface SurveyRecord {
  id: string; // UUID v4
  timestamp: string; // ISO 8601 string
  building: BuildingType;
  floor: string;
  room: string;
  areaType: string;
  category: CategoryType;
  rating: number; // 1 - 5
  urgency: UrgencyLevel;
  notes: string;
  photo: string | null; // Base64 JPEG
  photoSource: string | null;
  gps: GPSCoordinates;
  status: SyncStatus;
  devicePlatform?: string;
  syncedAt?: string;
  syncError?: string;
}

export interface SurveyDraft {
  building: BuildingType;
  floor: string;
  room: string;
  areaType: string;
  category: CategoryType;
  rating: number;
  urgency: UrgencyLevel;
  notes: string;
  photo: string | null;
  photoSource: string | null;
  gps: GPSCoordinates;
}

export interface SyncQueueItem {
  id: string; // UUID matches survey.id
  surveyData: SurveyRecord;
  status: SyncStatus;
  attempts: number;
  createdAt: string;
  lastAttempt: string | null;
  errorMsg: string | null;
}

export interface SyncLogEntry {
  id?: number;
  timestamp: string;
  action: 'SYNC_SUCCESS' | 'SYNC_FAILED' | 'ENQUEUE' | 'RETRIED';
  surveyId: string;
  details?: Record<string, unknown>;
}

export interface StorageStats {
  totalSurveys: number;
  pendingSync: number;
  syncedSurveys: number;
  queueLength: number;
  hasDraft: boolean;
  storageEstimate: string;
}

export interface NativePhotoResult {
  success: boolean;
  base64?: string;
  fileName?: string;
  format?: string;
  source?: string;
  error?: string;
}

export interface NativeLocationResult {
  success: boolean;
  latitude: number | null;
  longitude: number | null;
  accuracy?: number;
  timestamp?: number;
  source?: string;
  error?: string;
}

export interface NetworkStatusResult {
  connected: boolean;
  connectionType?: string;
}
