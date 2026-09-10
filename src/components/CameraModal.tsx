import React, { useRef, useState, useEffect } from 'react';
import { Camera as CameraIcon, X, RefreshCw, Check, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { CameraSource } from '@capacitor/camera';
import { CameraService } from '../services/cameraService';
import { GPSCoordinates, SurveyPhoto } from '../types';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoCaptured: (photo: SurveyPhoto) => void;
  gps?: GPSCoordinates;
  surveyId?: string;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onPhotoCaptured,
  gps,
  surveyId,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<SurveyPhoto | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !previewPhoto) {
      // Auto trigger native camera when modal opens
      handleNativeCapture(CameraSource.Camera);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const handleNativeCapture = async (source: CameraSource = CameraSource.Camera) => {
    setIsProcessing(true);
    setCameraError(null);
    try {
      const processed = await CameraService.captureNativePhoto(
        { surveyId, gps },
        source
      );
      stopCamera();
      setPreviewPhoto(processed);
    } catch (err: unknown) {
      console.warn('[CameraModal] Lỗi mở Native Camera, thử fallback Web:', err);
      // Fallback to web getUserMedia if Capacitor native camera wasn't completed
      if (!previewPhoto) {
        startWebCamera();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const startWebCamera = async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } else {
        setCameraError('Thiết bị không hỗ trợ truy cập Camera trực tiếp');
      }
    } catch (err: unknown) {
      console.warn('[CameraModal] Lỗi mở Web camera:', err);
      setCameraError('Không thể mở camera. Vui lòng cấp quyền truy cập máy ảnh.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const captureFrame = async () => {
    if (!videoRef.current) return;
    setIsProcessing(true);

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(async (blob) => {
          if (blob) {
            const processed = await CameraService.processPhotoWithMetadata(blob, {
              surveyId,
              gps,
            });
            stopCamera();
            setPreviewPhoto(processed);
          }
          setIsProcessing(false);
        }, 'image/jpeg', 0.85);
      }
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (previewPhoto) {
      onPhotoCaptured(previewPhoto);
      setPreviewPhoto(null);
      onClose();
    }
  };

  const handleRetake = () => {
    setPreviewPhoto(null);
    handleNativeCapture(CameraSource.Camera);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-navy-900/95 flex flex-col justify-between p-4 backdrop-blur-md">
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between text-white py-2">
        <div className="flex items-center gap-2">
          <CameraIcon className="w-5 h-5 text-electric-400" />
          <span className="font-mono text-xs tracking-wider text-slate-300">
            VKU NATIVE CAMERA HUD // {surveyId || 'SUR-NEW'}
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* 2. Main Viewport */}
      <div className="relative flex-1 flex items-center justify-center my-2 rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl">
        {previewPhoto ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={previewPhoto.base64}
              alt="Preview"
              className="max-h-full max-w-full object-contain rounded-lg"
            />
            <div className="absolute top-4 left-4 bg-emerald-500/90 text-white text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
              <Check className="w-3.5 h-3.5" />
              <span>ẢNH ĐÃ ĐÓNG DẤU TỌA ĐỘ (CAPACITOR NATIVE)</span>
            </div>
          </div>
        ) : (
          <>
            {cameraError ? (
              <div className="flex flex-col items-center justify-center text-center p-6 text-slate-300 max-w-xs">
                <AlertCircle className="w-12 h-12 text-amber-400 mb-3" />
                <p className="text-sm font-semibold mb-4">{cameraError}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleNativeCapture(CameraSource.Camera)}
                    className="px-4 py-2.5 rounded-xl bg-electric-500 text-white font-bold text-xs shadow-md hover:bg-electric-600 transition-colors"
                  >
                    Mở Máy ảnh Native
                  </button>
                  <button
                    onClick={() => handleNativeCapture(CameraSource.Photos)}
                    className="px-4 py-2.5 rounded-xl bg-white/20 text-white font-bold text-xs hover:bg-white/30 transition-colors"
                  >
                    Chọn từ Thư viện
                  </button>
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* HUD Corner Brackets */}
                <div className="absolute inset-8 pointer-events-none border border-white/20 rounded-xl">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-electric-400" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-electric-400" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-electric-400" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-electric-400" />
                </div>
                {/* Overlay Telemetry Readout */}
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center text-[10px] font-mono text-electric-300 bg-navy-900/60 backdrop-blur-sm p-2 rounded-lg pointer-events-none">
                  <span>GPS: {gps ? `${gps.latitude.toFixed(5)}, ${gps.longitude.toFixed(5)}` : 'Đang tìm...'}</span>
                  <span>ACC: ±{gps?.accuracy || 10}m</span>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* 3. Bottom Action Controls */}
      <div className="py-3 flex items-center justify-around">
        {previewPhoto ? (
          <div className="flex gap-4 w-full max-w-sm">
            <button
              onClick={handleRetake}
              className="flex-1 py-3.5 rounded-xl bg-white/15 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/25 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Chụp lại</span>
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-3.5 rounded-xl bg-field-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-field-glow hover:bg-field-600 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Dùng ảnh này</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full max-w-xs">
            <button
              onClick={() => handleNativeCapture(CameraSource.Photos)}
              className="p-3 rounded-full bg-white/10 text-white text-xs font-semibold hover:bg-white/20 flex items-center gap-1"
              title="Chọn từ thư viện"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Thư viện</span>
            </button>
            <button
              onClick={() => handleNativeCapture(CameraSource.Camera)}
              disabled={isProcessing}
              className="w-18 h-18 rounded-full border-4 border-white p-1.5 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
              title="Chụp ảnh Native"
            >
              <div className="w-14 h-14 rounded-full bg-electric-400 shadow-hud" />
            </button>
            <div className="w-12" />
          </div>
        )}
      </div>
    </div>
  );
};

