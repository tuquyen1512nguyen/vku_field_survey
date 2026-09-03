// Quản trị Giao diện (UI Manager)
// Thông báo Toast, Banner mạng thời gian thực, Render danh sách khảo sát, Modal chi tiết

import { getAllSurveys, getSyncQueue, getStorageStats, clearAllDatabase, saveSurvey, enqueueSync, getSyncLogs } from './db.js';
import { syncManager } from './sync-manager.js';

export function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = {
    success: '✅',
    warning: '⚠️',
    danger: '❌',
    info: 'ℹ️'
  };

  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || '🔔'}</span>
    <span class="toast-msg">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export class UIManager {
  constructor() {
    this.initNetworkStatusBanner();
    this.bindGlobalControls();
    this.refreshAllViews();
  }

  initNetworkStatusBanner() {
    const banner = document.getElementById('network-status-banner');
    const statusText = document.getElementById('network-status-text');
    const btnSimulate = document.getElementById('btn-toggle-simulate-offline');

    const updateUI = () => {
      const isOnline = syncManager.isOnline();
      const isSimulated = syncManager.simulatedOffline;

      if (!banner || !statusText) return;

      if (isOnline) {
        banner.className = 'network-banner banner-online';
        statusText.innerHTML = `🟢 <strong>Trực tuyến</strong> — Dữ liệu được đồng bộ tự động lên máy chủ VKU`;
      } else {
        banner.className = 'network-banner banner-offline';
        const simNote = isSimulated ? ' (Đang bật Mô phỏng ngoại tuyến)' : '';
        statusText.innerHTML = `🔴 <strong>Ngoại tuyến${simNote}</strong> — Không có kết nối mạng. Phiếu được lưu vào IndexedDB và chờ đồng bộ`;
      }

      if (btnSimulate) {
        btnSimulate.innerHTML = isSimulated
          ? '📶 Tắt mô phỏng (Khôi phục Online)'
          : '🔌 Mô phỏng Mất mạng (Offline)';
        btnSimulate.classList.toggle('active', isSimulated);
      }
    };

    updateUI();

    syncManager.subscribe((event, data) => {
      if (event === 'network-changed' || event === 'sync-started' || event === 'sync-completed') {
        updateUI();
        this.refreshAllViews();
      }
    });

    btnSimulate?.addEventListener('click', () => {
      const sim = syncManager.toggleSimulatedOffline();
      showToast(
        sim
          ? 'Đã bật chế độ Mô phỏng Ngoại tuyến để thử nghiệm!'
          : 'Đã khôi phục trạng thái Trực tuyến! Bắt đầu đồng bộ tự động...',
        sim ? 'warning' : 'success'
      );
    });
  }

  bindGlobalControls() {
    // Nút đồng bộ thủ công trên thanh điều hướng
    const btnManualSync = document.getElementById('btn-manual-sync');
    btnManualSync?.addEventListener('click', async () => {
      if (!syncManager.isOnline()) {
        showToast('Thiết bị đang ngoại tuyến, không thể đồng bộ!', 'warning');
        return;
      }
      showToast('Đang tiến hành đồng bộ các phiếu trong hàng đợi...', 'info');
      await syncManager.triggerSync('Người dùng bấm nút đồng bộ');
      this.refreshAllViews();
    });

    // Nút nạp dữ liệu mẫu thực địa (Seed Sample Data)
    const btnSeedData = document.getElementById('btn-seed-sample-data');
    btnSeedData?.addEventListener('click', () => this.seedSampleSurveys());

    // Nút xóa sạch dữ liệu IndexedDB
    const btnClearDb = document.getElementById('btn-clear-database');
    btnClearDb?.addEventListener('click', async () => {
      if (confirm('Bạn có chắc chắn muốn xóa sạch toàn bộ dữ liệu khảo sát và hàng đợi trong IndexedDB?')) {
        await clearAllDatabase();
        showToast('Đã dọn dẹp cơ sở dữ liệu IndexedDB!', 'info');
        this.refreshAllViews();
      }
    });

    // Lắng nghe sự kiện nộp phiếu thành công
    window.addEventListener('survey-submitted', () => {
      this.refreshAllViews();
    });

    // Bộ lọc danh sách
    const filterCategory = document.getElementById('filter-category');
    const filterStatus = document.getElementById('filter-status');
    filterCategory?.addEventListener('change', () => this.renderSurveysList());
    filterStatus?.addEventListener('change', () => this.renderSurveysList());

    // Nút xem nhật ký đồng bộ
    const btnViewLogs = document.getElementById('btn-view-sync-logs');
    btnViewLogs?.addEventListener('click', () => this.openSyncLogsModal());
  }

  async refreshAllViews() {
    await Promise.all([
      this.renderSurveysList(),
      this.renderSyncQueue(),
      this.updateStorageStatsBadge()
    ]);
  }

  async updateStorageStatsBadge() {
    const stats = await getStorageStats();

    const countAllEl = document.getElementById('stat-total-surveys');
    const countPendingEl = document.getElementById('stat-pending-surveys');
    const countSyncedEl = document.getElementById('stat-synced-surveys');
    const queueBadge = document.getElementById('nav-queue-badge');
    const storageEstEl = document.getElementById('stat-storage-estimate');

    if (countAllEl) countAllEl.textContent = stats.totalSurveys;
    if (countPendingEl) countPendingEl.textContent = stats.pendingSync;
    if (countSyncedEl) countSyncedEl.textContent = stats.syncedSurveys;
    if (storageEstEl) storageEstEl.textContent = stats.storageEstimate;

    if (queueBadge) {
      queueBadge.textContent = stats.queueLength;
      queueBadge.style.display = stats.queueLength > 0 ? 'inline-flex' : 'none';
    }
  }

  async renderSurveysList() {
    const container = document.getElementById('surveys-list-container');
    if (!container) return;

    const surveys = await getAllSurveys();
    const filterCategory = document.getElementById('filter-category')?.value || 'ALL';
    const filterStatus = document.getElementById('filter-status')?.value || 'ALL';

    const filtered = surveys.filter((s) => {
      const matchCat = filterCategory === 'ALL' || s.category === filterCategory;
      const matchStatus = filterStatus === 'ALL' || s.status === filterStatus;
      return matchCat && matchStatus;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <h4>Chưa có phiếu khảo sát nào</h4>
          <p class="text-sm text-gray-500">Bắt đầu thanh tra tại chỗ hoặc bấm "Nạp 3 dữ liệu mẫu VKU" để thử nghiệm tính năng.</p>
        </div>
      `;
      return;
    }

    const statusBadge = (status) => {
      switch (status) {
        case 'SYNCED':
          return '<span class="status-pill pill-success">🟢 Đã đồng bộ máy chủ</span>';
        case 'SYNCING':
          return '<span class="status-pill pill-info"><span class="spinner-inline"></span> Đang đồng bộ...</span>';
        case 'FAILED':
          return '<span class="status-pill pill-danger">⚠️ Lỗi đồng bộ</span>';
        case 'PENDING_SYNC':
        default:
          return '<span class="status-pill pill-warning">🟡 Chờ đồng bộ (PENDING_SYNC)</span>';
      }
    };

    container.innerHTML = filtered
      .map((s) => {
        const dateStr = new Date(s.timestamp).toLocaleString('vi-VN');
        const stars = '★'.repeat(s.rating) + '☆'.repeat(5 - s.rating);
        const hasPhoto = !!s.photo;

        return `
        <div class="survey-item-card" data-id="${s.id}">
          <div class="survey-card-header">
            <div>
              <h4 class="survey-title">${s.building} — Phòng ${s.room}</h4>
              <div class="survey-subtitle">${s.floor} | ${s.areaType} | <span class="text-xs text-muted">${dateStr}</span></div>
            </div>
            <div>${statusBadge(s.status)}</div>
          </div>

          <div class="survey-card-body">
            <div class="survey-badge-row">
              <span class="category-tag">🔧 ${s.category}</span>
              <span class="rating-stars" title="${s.rating}/5 sao">${stars}</span>
              ${s.urgency === 'URGENT' ? '<span class="badge badge-danger">Khẩn cấp</span>' : ''}
            </div>
            
            ${s.notes ? `<p class="survey-notes-snippet">"${s.notes}"</p>` : ''}
            
            <div class="survey-footer-row">
              <div class="gps-snippet">📍 ${s.gps?.latitude?.toFixed(5)}, ${s.gps?.longitude?.toFixed(5)}</div>
              ${hasPhoto ? `<span class="photo-attached-tag">📷 Có ảnh thực địa</span>` : ''}
              <button class="btn btn-sm btn-outline btn-view-detail" data-id="${s.id}">Chi tiết</button>
            </div>
          </div>
        </div>
      `;
      })
      .join('');

    // Gắn sự kiện xem chi tiết
    container.querySelectorAll('.btn-view-detail').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = btn.dataset.id;
        this.openSurveyDetailModal(id);
      });
    });
  }

  async renderSyncQueue() {
    const container = document.getElementById('sync-queue-list');
    if (!container) return;

    const queue = await getSyncQueue();
    const countEl = document.getElementById('queue-total-count');
    if (countEl) countEl.textContent = queue.length;

    if (queue.length === 0) {
      container.innerHTML = `
        <div class="empty-state queue-empty">
          <div class="empty-icon">✨</div>
          <p>Hàng đợi đồng bộ trống. Tất cả phiếu khảo sát đã được cập nhật an toàn!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = queue
      .map((item) => {
        const survey = item.surveyData;
        const timeStr = new Date(item.createdAt).toLocaleTimeString('vi-VN');
        return `
        <div class="queue-card">
          <div class="queue-card-left">
            <div class="queue-title">${survey.building} - Phòng ${survey.room} (${survey.category})</div>
            <div class="queue-meta text-xs text-muted">
              Lưu lúc: ${timeStr} | Số lần thử: ${item.attempts || 0} | Trạng thái: <strong>${item.status}</strong>
            </div>
            ${item.errorMsg ? `<div class="queue-error text-xs text-danger">Lỗi: ${item.errorMsg}</div>` : ''}
          </div>
          <div class="queue-card-right">
            <span class="queue-pill">${item.status}</span>
          </div>
        </div>
      `;
      })
      .join('');
  }

  async openSurveyDetailModal(id) {
    const surveys = await getAllSurveys();
    const s = surveys.find((x) => x.id === id);
    if (!s) return;

    const modal = document.getElementById('survey-detail-modal');
    const content = document.getElementById('survey-modal-content');
    if (!modal || !content) return;

    content.innerHTML = `
      <div class="modal-header">
        <h3>Chi tiết Phiếu Khảo sát VKU</h3>
        <button class="modal-close-btn" id="modal-close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <div class="modal-info-grid">
          <div><strong>Mã UUID:</strong> <span class="font-mono text-xs">${s.id}</span></div>
          <div><strong>Thời gian nộp:</strong> ${new Date(s.timestamp).toLocaleString('vi-VN')}</div>
          <div><strong>Vị trí kiểm tra:</strong> ${s.building}, ${s.floor}, Phòng ${s.room}</div>
          <div><strong>Loại khu vực:</strong> ${s.areaType}</div>
          <div><strong>Hạng mục:</strong> ${s.category}</div>
          <div><strong>Đánh giá tình trạng:</strong> ${'⭐'.repeat(s.rating)} (${s.rating}/5)</div>
          <div><strong>Mức độ khẩn cấp:</strong> ${s.urgency}</div>
          <div><strong>Trạng thái đồng bộ:</strong> <span class="badge ${s.status === 'SYNCED' ? 'badge-success' : 'badge-warning'}">${s.status}</span></div>
          <div><strong>Thiết bị thực hiện:</strong> ${s.devicePlatform || 'PWA Client'}</div>
          <div><strong>Tọa độ GPS:</strong> ${s.gps?.latitude?.toFixed(6)}, ${s.gps?.longitude?.toFixed(6)} (sai số ±${s.gps?.accuracy || 10}m)</div>
        </div>

        <div class="modal-section mt-3">
          <h4>Ghi chú sự cố / Lỗi kỹ thuật:</h4>
          <p class="notes-box">${s.notes || 'Không có ghi chú'}</p>
        </div>

        ${
          s.photo
            ? `<div class="modal-section mt-3">
                <h4>Ảnh chụp bằng chứng thực địa:</h4>
                <div class="modal-photo-wrapper">
                  <img src="${s.photo}" alt="Ảnh chụp hiện trường" class="modal-photo" />
                </div>
              </div>`
            : '<p class="text-sm text-gray-500 mt-2">Không đính kèm ảnh hiện trường.</p>'
        }
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="modal-btn-close">Đóng</button>
      </div>
    `;

    modal.style.display = 'flex';

    const closeHandler = () => {
      modal.style.display = 'none';
    };
    content.querySelector('#modal-close-btn')?.addEventListener('click', closeHandler);
    content.querySelector('#modal-btn-close')?.addEventListener('click', closeHandler);
    modal.onclick = (e) => {
      if (e.target === modal) closeHandler();
    };
  }

  async openSyncLogsModal() {
    const logs = await getSyncLogs(30);
    const modal = document.getElementById('survey-detail-modal');
    const content = document.getElementById('survey-modal-content');
    if (!modal || !content) return;

    content.innerHTML = `
      <div class="modal-header">
        <h3>Nhật ký Đồng bộ Hệ thống (Audit Logs)</h3>
        <button class="modal-close-btn" id="modal-close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <p class="text-sm text-gray-500 mb-3">Ghi nhận chi tiết các lần Service Worker hoặc trình duyệt gửi dữ liệu lên máy chủ:</p>
        <div class="logs-container">
          ${
            logs.length === 0
              ? '<p class="text-sm italic">Chưa có nhật ký đồng bộ.</p>'
              : logs
                  .map(
                    (l) => `
              <div class="log-entry log-${l.action.toLowerCase()}">
                <span class="log-time text-xs font-mono">${new Date(l.timestamp).toLocaleTimeString('vi-VN')}</span>
                <span class="log-action font-semibold">${l.action}</span>
                <span class="log-id text-xs font-mono">${l.surveyId || ''}</span>
                <div class="log-detail text-xs">${JSON.stringify(l.details || {})}</div>
              </div>
            `
                  )
                  .join('')
          }
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="modal-btn-close">Đóng</button>
      </div>
    `;

    modal.style.display = 'flex';
    const closeHandler = () => {
      modal.style.display = 'none';
    };
    content.querySelector('#modal-close-btn')?.addEventListener('click', closeHandler);
    content.querySelector('#modal-btn-close')?.addEventListener('click', closeHandler);
  }

  /**
   * Tạo 3 dữ liệu mẫu thực tế tại khuôn viên VKU để kiểm thử nhanh
   */
  async seedSampleSurveys() {
    showToast('Đang nạp 3 dữ liệu kiểm tra mẫu tại khuôn viên VKU...', 'info');

    // Tạo ảnh mẫu chất lượng cao thông qua Canvas
    const createSampleCanvasImage = (title, color) => {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 600, 400);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(title, 300, 180);

      ctx.font = '16px Inter, sans-serif';
      ctx.fillText('Ảnh chụp minh chứng kiểm toán VKU Campus', 300, 220);
      ctx.fillText(new Date().toLocaleString('vi-VN'), 300, 250);

      return canvas.toDataURL('image/jpeg', 0.8);
    };

    const samples = [
      {
        id: 'vku-sample-01-' + Date.now(),
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        building: 'Khu A',
        floor: 'Tầng 1',
        room: 'A.102',
        areaType: 'Phòng Lab máy tính',
        category: 'Máy chiếu & Màn chiếu',
        rating: 2,
        urgency: 'NORMAL',
        notes: 'Bóng đèn máy chiếu Panasonic bị mờ và nhấp nháy liên tục sau 15 phút mở máy, cần thay thế cụm đèn.',
        photo: createSampleCanvasImage('PHÒNG LAB A.102 - MÁY CHIẾU MỜ', '#0369a1'),
        photoSource: 'VKU Sample Seed',
        gps: { latitude: 15.975412, longitude: 108.25221, accuracy: 5, source: 'GPS Lab A' },
        status: 'SYNCED',
        syncedAt: new Date().toISOString()
      },
      {
        id: 'vku-sample-02-' + Date.now(),
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        building: 'Khu K',
        floor: 'Tầng 3',
        room: 'K.301',
        areaType: 'Giảng đường lý thuyết',
        category: 'Điều hòa không khí',
        rating: 1,
        urgency: 'URGENT',
        notes: 'Máy lạnh chảy nước nhỏ giọt xuống hàng ghế sinh viên số 3, quạt gió kêu to rung lắc mạnh.',
        photo: createSampleCanvasImage('KHU K.301 - ĐIỀU HÒA CHẢY NƯỚC', '#b91c1c'),
        photoSource: 'VKU Sample Seed',
        gps: { latitude: 15.97489, longitude: 108.253102, accuracy: 8, source: 'GPS Khu K' },
        status: 'PENDING_SYNC'
      },
      {
        id: 'vku-sample-03-' + Date.now(),
        timestamp: new Date(Date.now() - 600000).toISOString(),
        building: 'Khu V',
        floor: 'Tầng hầm',
        room: 'V.B02',
        areaType: 'Phòng hội thảo',
        category: 'Hệ thống điện & Đèn chiếu sáng',
        rating: 4,
        urgency: 'LOW',
        notes: 'Hệ thống điện tầng hầm hoạt động ổn định, có 1 bóng tuýp LED cửa ngách chập chờn cần vặn lại chân cắm.',
        photo: createSampleCanvasImage('TẦNG HẦM KHU V - ĐÈN LED CHẬP CHỜN', '#047857'),
        photoSource: 'VKU Sample Seed',
        gps: { latitude: 15.976105, longitude: 108.251944, accuracy: 12, source: 'GPS Tầng Hầm Khu V' },
        status: 'PENDING_SYNC'
      }
    ];

    for (const sample of samples) {
      await saveSurvey(sample);
      if (sample.status === 'PENDING_SYNC') {
        await enqueueSync(sample);
      }
    }

    showToast('Đã nạp 3 phiếu khảo sát thực địa mẫu thành công!', 'success');
    this.refreshAllViews();
  }
}
