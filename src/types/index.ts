// VKU Field Survey — Comprehensive Type Definitions

export type FacilityType =
  | 'Classroom'
  | 'Laboratory'
  | 'Library'
  | 'Parking'
  | 'Restroom'
  | 'Canteen'
  | 'Outdoor Area'
  | 'Other';

export type ConditionRating =
  | 'GOOD'
  | 'NEEDS_ATTENTION'
  | 'DAMAGED'
  | 'NOT_AVAILABLE';

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  source?: string;
}

export interface SurveyPhoto {
  id: string;
  base64: string;
  timestamp: number;
  surveyId?: string;
  gps?: {
    latitude: number;
    longitude: number;
  };
}

export interface Survey {
  id: string; // e.g. "SUR-00128"
  // Auditor Info
  auditorName: string;
  studentId: string;
  department: string;
  auditorPhone?: string;
  // Target Info
  targetName?: string;
  targetId?: string;
  targetPhone?: string;
  targetType?: string; // 'Sinh viên', 'Giảng viên', 'Cán bộ', 'Doanh nghiệp', 'Khác'
  // Survey Details
  building: string;
  floor: string;
  room: string;
  facilityType: FacilityType;
  topic?: string; // Chuyên đề khảo sát
  condition: ConditionRating;
  ratingStars?: number; // 1 - 5 stars
  notes: string;
  photos: SurveyPhoto[];
  latitude: number;
  longitude: number;
  accuracy: number;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
  syncError?: string;
  syncedAt?: string;
}

export interface SurveyDraft {
  id?: string;
  step: number;
  // Auditor Info
  auditorName: string;
  studentId: string;
  department: string;
  auditorPhone?: string;
  // Target Info
  targetName?: string;
  targetId?: string;
  targetPhone?: string;
  targetType?: string;
  // Survey Details
  building: string;
  floor: string;
  room: string;
  facilityType: FacilityType;
  topic?: string;
  condition: ConditionRating;
  ratingStars?: number;
  notes: string;
  photos: SurveyPhoto[];
  gps?: GPSCoordinates;
  lastUpdated: string;
}

export interface SyncQueueItem {
  id: string;
  surveyData: Survey;
  attempts: number;
  status: SyncStatus;
  createdAt: string;
  lastAttempt?: string;
  errorMsg?: string;
}

export interface UserSettings {
  darkMode: boolean;
  autoSync: boolean;
  highAccuracyGPS: boolean;
  auditorName: string;
  studentId: string;
  department: string;
  auditorPhone: string;
  googleScriptUrl: string;
  publicSheetUrl: string;
  autoSyncGoogleSheet: boolean;
}

export interface CampusLocation {
  id: string;
  name: string;
  code: string;
  x: number;
  y: number;
  lat: number;
  lng: number;
  description: string;
}

export type TabType = 'home' | 'survey' | 'map' | 'records' | 'profile';
