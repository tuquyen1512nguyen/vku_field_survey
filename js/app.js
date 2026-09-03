// Điểm khởi tạo ứng dụng chính (App Core Coordinator)
// Khởi chạy Service Worker, IndexedDB, Form Wizard, UI Manager, và Trình tạo báo cáo

import { initDB } from './db.js';
import { FormWizard } from './form-wizard.js';
import { UIManager, showToast } from './ui.js';
import { ReportGenerator } from './report-generator.js';
import { syncManager } from './sync-manager.js';
import { NativeBridge } from './native-bridge.js';

class App {
  constructor() {
    this.deferredPrompt = null;
    this.init();
  }

  async init() {
    console.log('%c[VKU Field Survey] Khởi động ứng dụng PWA Ngoại Tuyến...', 'color: #0284c7; font-weight: bold; font-size: 14px;');

    try {
      // 1. Khởi tạo IndexedDB
      await initDB();

      // 2. Khởi tạo các module
      this.uiManager = new UIManager();
      this.formWizard = new FormWizard();
      this.reportGenerator = new ReportGenerator();

      // 3. Đăng ký Service Worker cho PWA
      this.registerServiceWorker();

      // 4. Quản lý điều hướng tab/view
      this.setupNavigation();

      // 5. Bắt sự kiện cài đặt PWA (Install prompt)
      this.setupInstallPrompt();

      // 6. Hiển thị thông tin nền tảng đang chạy
      const platformBadge = document.getElementById('app-platform-indicator');
      if (platformBadge) {
        platformBadge.textContent = NativeBridge.getPlatformName();
      }

      console.log('[App] Khởi động hoàn tất thành công!');
    } catch (err) {
      console.error('[App] Lỗi khởi động:', err);
      showToast('Lỗi khởi động ứng dụng: ' + err.message, 'danger');
    }
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', async () => {
        try {
          const registration = await navigator.serviceWorker.register('./sw.js', {
            scope: './'
          });
          console.log('[App] Service Worker đã đăng ký thành công với scope:', registration.scope);

          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  showToast('Có phiên bản cập nhật mới của VKU Survey! Tải lại trang để áp dụng.', 'info');
                }
              };
            }
          };
        } catch (error) {
          console.warn('[App] Không thể đăng ký Service Worker (có thể do mở tệp trực tiếp qua file:// thay vì http):', error);
        }
      });
    }
  }

  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-tab-btn, .bottom-nav-item');
    const views = document.querySelectorAll('.app-view');

    const switchView = (targetViewId) => {
      // Cập nhật trạng thái active của nút điều hướng
      navItems.forEach((btn) => {
        if (btn.dataset.target === targetViewId) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      // Hiển thị view tương ứng
      views.forEach((v) => {
        if (v.id === targetViewId) {
          v.classList.add('active-view');
        } else {
          v.classList.remove('active-view');
        }
      });

      // Nếu chuyển sang tab báo cáo, tự động vẽ lại báo cáo mới nhất
      if (targetViewId === 'view-report') {
        this.reportGenerator.renderReport();
      }

      // Làm mới danh sách và hàng đợi
      this.uiManager.refreshAllViews();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    navItems.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const target = btn.dataset.target;
        if (target) switchView(target);
      });
    });

    // Nút tắt chuyển nhanh từ view khác về form tạo mới
    document.querySelectorAll('.btn-goto-survey').forEach((btn) => {
      btn.addEventListener('click', () => switchView('view-new-survey'));
    });
  }

  setupInstallPrompt() {
    const btnInstall = document.getElementById('btn-pwa-install');
    if (!btnInstall) return;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      btnInstall.style.display = 'inline-flex';
      console.log('[App] PWA trước điều kiện cài đặt đã sẵn sàng');
    });

    btnInstall.addEventListener('click', async () => {
      if (!this.deferredPrompt) {
        showToast('Ứng dụng đã được cài đặt hoặc trình duyệt không hỗ trợ popup cài đặt.', 'info');
        return;
      }
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      console.log(`[App] Người dùng chọn: ${outcome}`);
      if (outcome === 'accepted') {
        showToast('Cảm ơn bạn đã cài đặt ứng dụng VKU Survey!', 'success');
      }
      this.deferredPrompt = null;
      btnInstall.style.display = 'none';
    });

    window.addEventListener('appinstalled', () => {
      console.log('[App] VKU Survey đã được cài đặt làm ứng dụng độc lập (Standalone PWA)');
      btnInstall.style.display = 'none';
      showToast('VKU Survey đã được cài đặt vào màn hình chính!', 'success');
    });
  }
}

// Khởi chạy ứng dụng khi DOM đã nạp
document.addEventListener('DOMContentLoaded', () => {
  window.vkuApp = new App();
});
