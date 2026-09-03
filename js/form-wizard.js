// Trình quản lý Phiếu Khảo Sát Đa Bước (Form Wizard) & Bản Nháp Thời Gian Thực
// Đảm bảo không mất dữ liệu dù tải lại trang (IndexedDB Real-Time Auto-Save)

import { saveDraft, getDraft, clearDraft, saveSurvey, enqueueSync } from './db.js';
import { NativeBridge } from './native-bridge.js';
import { syncManager } from './sync-manager.js';
import { showToast } from './ui.js';

export class FormWizard {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 4;
    this.draftSaveTimeout = null;
    this.formData = {
      id: null,
      building: 'Khu A',
      floor: 'Tầng 2',
      room: 'A.204',
      areaType: 'Phòng Lab máy tính',
      category: 'Máy chiếu & Màn chiếu',
      rating: 3,
      urgency: 'NORMAL',
      notes: '',
      photo: null,
      photoSource: null,
      gps: {
        latitude: 15.975294,
        longitude: 108.252355,
        accuracy: 10,
        timestamp: Date.now(),
        source: 'VKU Campus Default'
      }
    };

    this.initElements();
    this.bindEvents();
    this.restoreDraftIfAny();
  }

  initElements() {
    this.stepIndicators = document.querySelectorAll('.wizard-step');
    this.stepPanels = document.querySelectorAll('.step-panel');
    this.btnPrev = document.getElementById('btn-wizard-prev');
    this.btnNext = document.getElementById('btn-wizard-next');
    this.btnSubmit = document.getElementById('btn-wizard-submit');
    this.btnReset = document.getElementById('btn-reset-draft');

    // Camera & GPS controls
    this.btnCaptureCamera = document.getElementById('btn-capture-camera');
    this.photoPreviewContainer = document.getElementById('photo-preview-box');
    this.photoPreviewImg = document.getElementById('photo-preview-img');
    this.btnRemovePhoto = document.getElementById('btn-remove-photo');
    this.btnGetGps = document.getElementById('btn-get-gps');
    this.gpsDisplay = document.getElementById('gps-display-info');

    // Star rating
    this.starButtons = document.querySelectorAll('.star-btn');
    this.ratingLabel = document.getElementById('rating-description-label');
  }

  bindEvents() {
    // Chuyển bước
    this.btnPrev?.addEventListener('click', () => this.goToStep(this.currentStep - 1));
    this.btnNext?.addEventListener('click', () => {
      if (this.validateCurrentStep()) {
        this.goToStep(this.currentStep + 1);
      }
    });

    // Nộp phiếu
    this.btnSubmit?.addEventListener('click', () => this.submitSurvey());

    // Nút xóa làm mới
    this.btnReset?.addEventListener('click', () => this.confirmResetDraft());

    // Tự động lưu bản nháp theo thời gian thực khi người dùng nhập dữ liệu
    const formFields = document.querySelectorAll('#survey-form input, #survey-form select, #survey-form textarea');
    formFields.forEach((field) => {
      field.addEventListener('input', () => this.handleFieldInput());
      field.addEventListener('change', () => this.handleFieldInput());
    });

    // Đánh giá sao
    this.starButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const ratingVal = parseInt(btn.dataset.value, 10);
        this.setRating(ratingVal);
        this.handleFieldInput();
      });
    });

    // Lưới chọn hạng mục thiết bị trực quan
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach((card) => {
      card.addEventListener('click', () => {
        const cat = card.dataset.category;
        if (!cat) return;
        categoryCards.forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
        this.formData.category = cat;
        const selectEl = document.getElementById('field-category');
        if (selectEl) selectEl.value = cat;
        this.handleFieldInput();
        NativeBridge.vibrate(25);
      });
    });

    // Chụp ảnh
    this.btnCaptureCamera?.addEventListener('click', () => this.handleCapturePhoto());
    this.btnRemovePhoto?.addEventListener('click', () => this.handleRemovePhoto());

    // Lấy GPS
    this.btnGetGps?.addEventListener('click', () => this.handleGetGps());
  }

  /**
   * Khôi phục bản nháp từ IndexedDB nếu có
   */
  async restoreDraftIfAny() {
    try {
      const savedDraft = await getDraft();
      if (savedDraft) {
        this.formData = { ...this.formData, ...savedDraft };
        this.populateFormFromData();
        showToast('Đã khôi phục bản nháp khảo sát từ bộ nhớ cục bộ IndexedDB!', 'info');
        console.log('[FormWizard] Đã tải bản nháp đã lưu:', this.formData);
      }
    } catch (e) {
      console.warn('[FormWizard] Lỗi khi nạp bản nháp:', e);
    }
  }

  /**
   * Đổ dữ liệu vào các ô input trên giao diện
   */
  populateFormFromData() {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el && val !== undefined && val !== null) el.value = val;
    };

    setVal('field-building', this.formData.building);
    setVal('field-floor', this.formData.floor);
    setVal('field-room', this.formData.room);
    setVal('field-area-type', this.formData.areaType);
    setVal('field-category', this.formData.category);
    setVal('field-urgency', this.formData.urgency);
    setVal('field-notes', this.formData.notes);

    // Cập nhật card hạng mục trực quan
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach((card) => {
      if (card.dataset.category === this.formData.category) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    if (this.formData.rating) {
      this.setRating(this.formData.rating);
    }

    if (this.formData.photo) {
      this.renderPhotoPreview(this.formData.photo);
    }

    if (this.formData.gps) {
      this.renderGpsInfo(this.formData.gps);
    }
  }

  /**
   * Lưu nháp tự động với cơ chế Debounce
   */
  handleFieldInput() {
    this.collectFormData();
    clearTimeout(this.draftSaveTimeout);
    this.draftSaveTimeout = setTimeout(async () => {
      try {
        await saveDraft(this.formData);
        const draftIndicator = document.getElementById('draft-status-indicator');
        if (draftIndicator) {
          draftIndicator.textContent = `Đã tự động lưu nháp lúc ${new Date().toLocaleTimeString('vi-VN')}`;
        }
      } catch (err) {
        console.error('[FormWizard] Lỗi lưu nháp IndexedDB:', err);
      }
    }, 400);
  }

  collectFormData() {
    const getVal = (id, defaultVal = '') => {
      const el = document.getElementById(id);
      return el ? el.value : defaultVal;
    };

    this.formData.building = getVal('field-building', 'Khu A');
    this.formData.floor = getVal('field-floor', 'Tầng 1');
    this.formData.room = getVal('field-room', 'A.101').trim();
    this.formData.areaType = getVal('field-area-type', 'Phòng Lab máy tính');
    this.formData.category = getVal('field-category', 'Máy chiếu & Màn chiếu');
    this.formData.urgency = getVal('field-urgency', 'NORMAL');
    this.formData.notes = getVal('field-notes', '').trim();
  }

  setRating(stars) {
    this.formData.rating = stars;
    const ratingLabels = [
      '',
      '★☆☆☆☆ Rất tệ / Thiết bị hỏng hoàn toàn',
      '★★☆☆☆ Kém / Hoạt động chập chờn, có nguy cơ hỏng',
      '★★★☆☆ Trung bình / Còn hoạt động tạm ổn',
      '★★★★☆ Tốt / Hao mòn nhẹ, không ảnh hưởng nhiều',
      '★★★★★ Rất tốt / Hoạt động hoàn hảo, mới và sạch sẽ'
    ];

    this.starButtons.forEach((btn) => {
      const val = parseInt(btn.dataset.value, 10);
      if (val <= stars) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (this.ratingLabel) {
      this.ratingLabel.textContent = ratingLabels[stars] || '';
    }
  }

  async handleCapturePhoto() {
    showToast('Đang mở máy ảnh...', 'info');
    const result = await NativeBridge.capturePhoto();
    if (result.success && result.base64) {
      this.formData.photo = result.base64;
      this.formData.photoSource = result.source || 'Camera';
      this.renderPhotoPreview(result.base64);
      this.handleFieldInput();
      showToast('Đã chụp và nén ảnh thành công!', 'success');
      NativeBridge.vibrate(50);
    } else if (result.error) {
      showToast(result.error, 'warning');
    }
  }

  renderPhotoPreview(base64) {
    if (this.photoPreviewImg && this.photoPreviewContainer) {
      this.photoPreviewImg.src = base64;
      this.photoPreviewContainer.style.display = 'block';
    }
  }

  handleRemovePhoto() {
    this.formData.photo = null;
    this.formData.photoSource = null;
    if (this.photoPreviewContainer) {
      this.photoPreviewContainer.style.display = 'none';
    }
    if (this.photoPreviewImg) {
      this.photoPreviewImg.src = '';
    }
    this.handleFieldInput();
    showToast('Đã xóa ảnh chụp', 'info');
  }

  async handleGetGps() {
    if (this.btnGetGps) {
      this.btnGetGps.disabled = true;
      this.btnGetGps.innerHTML = '<span class="spinner-inline"></span> Đang định vị vệ tinh...';
    }

    const pos = await NativeBridge.getCurrentLocation();
    if (this.btnGetGps) {
      this.btnGetGps.disabled = false;
      this.btnGetGps.innerHTML = '📍 Làm mới Tọa độ GPS';
    }

    if (pos.success) {
      this.formData.gps = {
        latitude: pos.latitude,
        longitude: pos.longitude,
        accuracy: pos.accuracy,
        timestamp: pos.timestamp || Date.now(),
        source: pos.source || 'GPS'
      };
      this.renderGpsInfo(this.formData.gps);
      this.handleFieldInput();
      showToast('Đã ghi nhận tọa độ GPS khuôn viên VKU!', 'success');
      NativeBridge.vibrate(40);
    } else {
      showToast('Không thể lấy GPS: ' + (pos.error || 'Lỗi không xác định'), 'warning');
    }
  }

  renderGpsInfo(gps) {
    if (this.gpsDisplay) {
      this.gpsDisplay.innerHTML = `
        <div class="gps-badge">
          <strong>Vĩ độ:</strong> ${gps.latitude ? gps.latitude.toFixed(6) : 'N/A'} | 
          <strong>Kinh độ:</strong> ${gps.longitude ? gps.longitude.toFixed(6) : 'N/A'} 
          <span class="gps-accuracy">(±${gps.accuracy || 10}m)</span>
        </div>
      `;
    }
  }

  validateCurrentStep() {
    this.collectFormData();
    if (this.currentStep === 1) {
      if (!this.formData.room) {
        showToast('Vui lòng nhập Số phòng / Mã phòng kiểm tra (VD: A.102)', 'warning');
        document.getElementById('field-room')?.focus();
        return false;
      }
    } else if (this.currentStep === 2) {
      if (!this.formData.rating || this.formData.rating < 1) {
        showToast('Vui lòng chọn Đánh giá tình trạng (1 - 5 sao)', 'warning');
        return false;
      }
    }
    return true;
  }

  goToStep(step) {
    if (step < 1 || step > this.totalSteps) return;

    this.currentStep = step;

    // Cập nhật indicators
    this.stepIndicators.forEach((el, index) => {
      const stepNum = index + 1;
      el.classList.remove('active', 'completed');
      if (stepNum === this.currentStep) {
        el.classList.add('active');
      } else if (stepNum < this.currentStep) {
        el.classList.add('completed');
      }
    });

    // Cập nhật panels
    this.stepPanels.forEach((panel) => {
      const panelStep = parseInt(panel.dataset.step, 10);
      if (panelStep === this.currentStep) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });

    // Nút điều hướng
    if (this.btnPrev) {
      this.btnPrev.style.visibility = this.currentStep === 1 ? 'hidden' : 'visible';
    }

    if (this.currentStep === this.totalSteps) {
      if (this.btnNext) this.btnNext.style.display = 'none';
      if (this.btnSubmit) this.btnSubmit.style.display = 'inline-flex';
      this.renderConfirmationStep();
    } else {
      if (this.btnNext) this.btnNext.style.display = 'inline-flex';
      if (this.btnSubmit) this.btnSubmit.style.display = 'none';
    }

    NativeBridge.vibrate(25);
  }

  /**
   * Bước 4: Hiển thị tóm tắt phiếu kiểm tra
   */
  renderConfirmationStep() {
    this.collectFormData();
    const isOnline = syncManager.isOnline();
    const confirmContainer = document.getElementById('confirmation-summary-box');
    if (!confirmContainer) return;

    const urgencyLabels = {
      LOW: '<span class="badge badge-success">Bình thường</span>',
      NORMAL: '<span class="badge badge-info">Cần bảo trì định kỳ</span>',
      URGENT: '<span class="badge badge-danger">Khẩn cấp / Nguy hiểm</span>'
    };

    confirmContainer.innerHTML = `
      <div class="summary-card">
        <div class="summary-header">
          <h4>Thông tin phiếu kiểm tra</h4>
          <span class="network-badge ${isOnline ? 'online' : 'offline'}">
            ${isOnline ? '🟢 Sẵn sàng gửi máy chủ' : '🔴 Lưu ngoại tuyến (PENDING_SYNC)'}
          </span>
        </div>
        <div class="summary-grid">
          <div class="summary-row">
            <span class="label">Vị trí:</span>
            <span class="val"><strong>${this.formData.building}</strong> — ${this.formData.floor} — <strong>Phòng ${this.formData.room}</strong> (${this.formData.areaType})</span>
          </div>
          <div class="summary-row">
            <span class="label">Hạng mục kiểm tra:</span>
            <span class="val font-semibold">${this.formData.category}</span>
          </div>
          <div class="summary-row">
            <span class="label">Đánh giá tình trạng:</span>
            <span class="val">${'⭐'.repeat(this.formData.rating)} (${this.formData.rating}/5 sao)</span>
          </div>
          <div class="summary-row">
            <span class="label">Mức độ ưu tiên:</span>
            <span class="val">${urgencyLabels[this.formData.urgency] || 'Bình thường'}</span>
          </div>
          <div class="summary-row">
            <span class="label">Ghi chú lỗi:</span>
            <span class="val text-muted">${this.formData.notes || 'Không có ghi chú thêm'}</span>
          </div>
          <div class="summary-row">
            <span class="label">Tọa độ GPS:</span>
            <span class="val text-xs font-mono">${this.formData.gps.latitude.toFixed(6)}, ${this.formData.gps.longitude.toFixed(6)}</span>
          </div>
        </div>

        ${
          this.formData.photo
            ? `<div class="summary-photo">
                <span class="label">Ảnh minh chứng thực địa:</span>
                <img src="${this.formData.photo}" alt="Ảnh bằng chứng" class="summary-thumb" />
              </div>`
            : '<p class="text-sm text-gray-500 italic mt-2">Chưa đính kèm ảnh thực địa (tùy chọn).</p>'
        }
      </div>
    `;
  }

  /**
   * Nộp phiếu khảo sát:
   * Nếu Ngoại tuyến -> Gán UUID, PENDING_SYNC, lưu IndexedDB, xếp hàng đợi Sync Queue
   * Nếu Trực tuyến -> Gán UUID, lưu IndexedDB, kích hoạt đồng bộ
   */
  async submitSurvey() {
    this.collectFormData();
    if (!this.formData.room) {
      showToast('Vui lòng nhập Số phòng ở Bước 1!', 'warning');
      this.goToStep(1);
      return;
    }

    if (this.btnSubmit) {
      this.btnSubmit.disabled = true;
      this.btnSubmit.innerHTML = '<span class="spinner-inline"></span> Đang xử lý...';
    }

    try {
      // 1. Sinh UUID v4 cho phiếu khảo sát
      const surveyId = this.generateUUID();
      const now = new Date().toISOString();
      const isOnline = syncManager.isOnline();

      const surveyRecord = {
        id: surveyId,
        timestamp: now,
        building: this.formData.building,
        floor: this.formData.floor,
        room: this.formData.room,
        areaType: this.formData.areaType,
        category: this.formData.category,
        rating: this.formData.rating,
        urgency: this.formData.urgency,
        notes: this.formData.notes,
        photo: this.formData.photo,
        photoSource: this.formData.photoSource,
        gps: this.formData.gps,
        status: isOnline ? 'SYNCING' : 'PENDING_SYNC',
        devicePlatform: NativeBridge.getPlatformName()
      };

      // 2. Lưu vào kho dữ liệu chính IndexedDB
      await saveSurvey(surveyRecord);

      // 3. Xếp vào hàng đợi đồng bộ
      await enqueueSync(surveyRecord);

      // 4. Xóa bản nháp hiện tại
      await clearDraft();

      NativeBridge.vibrate([60, 40, 60]);

      if (isOnline) {
        showToast('Phiếu khảo sát đã lưu! Đang đồng bộ lên máy chủ VKU...', 'success');
        // Kích hoạt đồng bộ ngay lập tức
        syncManager.triggerSync('Gửi trực tiếp khi có mạng');
      } else {
        showToast('Đang Ngoại tuyến! Phiếu đã lưu vào IndexedDB và xếp vào hàng đợi PENDING_SYNC.', 'warning');
      }

      // Reset form
      this.resetFormData();
      this.goToStep(1);

      // Phát sự kiện cập nhật giao diện thống kê
      window.dispatchEvent(new CustomEvent('survey-submitted', { detail: surveyRecord }));
    } catch (err) {
      console.error('[FormWizard] Lỗi khi nộp phiếu:', err);
      showToast('Lỗi khi lưu phiếu khảo sát: ' + err.message, 'danger');
    } finally {
      if (this.btnSubmit) {
        this.btnSubmit.disabled = false;
        this.btnSubmit.innerHTML = '🚀 Xác nhận & Nộp Phiếu';
      }
    }
  }

  resetFormData() {
    this.formData = {
      id: null,
      building: 'Khu A',
      floor: 'Tầng 2',
      room: '',
      areaType: 'Phòng Lab máy tính',
      category: 'Máy chiếu & Màn chiếu',
      rating: 3,
      urgency: 'NORMAL',
      notes: '',
      photo: null,
      photoSource: null,
      gps: {
        latitude: 15.975294,
        longitude: 108.252355,
        accuracy: 10,
        timestamp: Date.now(),
        source: 'VKU Campus Default'
      }
    };
    this.populateFormFromData();
    const draftIndicator = document.getElementById('draft-status-indicator');
    if (draftIndicator) draftIndicator.textContent = 'Biểu mẫu trống sẵn sàng';
  }

  async confirmResetDraft() {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ thông tin đang nhập để làm lại từ đầu?')) {
      await clearDraft();
      this.resetFormData();
      this.goToStep(1);
      showToast('Đã dọn sạch bản nháp!', 'info');
    }
  }

  generateUUID() {
    if (crypto && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'vku-xxxx-4xxx-yxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
