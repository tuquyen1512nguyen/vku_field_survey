# VKU Field Survey — Khảo Sát Thực Địa Ngoại Tuyến (PWA & Capacitor)

> **Tiểu dự án 1:** Ứng dụng Web Tiến Bộ (PWA) ưu tiên ngoại tuyến (**Offline-First**) và ứng dụng di động gốc Android (Capacitor) phục vụ thanh tra cơ sở vật chất, thiết bị phòng học tại khuôn viên Trường Đại học Công nghệ Thông tin và Truyền thông Việt - Hàn (VKU).

---

## 📌 1. Bối Cảnh & Vấn Đề Thực Tế

Các cán bộ kiểm tra cơ sở vật chất và thanh tra sinh viên tại **Đại học Việt - Hàn (VKU)** thường xuyên phải kiểm toán hiện trường các thiết bị (máy chiếu, máy lạnh, dàn máy tính thực hành Lab, hệ thống chiếu sáng và thiết bị điện) tại các khu vực xa xôi hoặc tầng hầm (như Tầng hầm Khu V, Giảng đường Khu K...) nơi hoàn toàn **không có sóng Wi-Fi hoặc 4G/5G**.

**VKU Field Survey** giải quyết bài toán trên thông qua kiến trúc **Offline-First**:
- Ứng dụng khởi động ngay lập tức (<1s) dù hoàn toàn ngắt mạng nhờ **Service Worker (Cache-First)**.
- Dữ liệu nhập liệu và bản nháp được lưu trữ thời gian thực vào **IndexedDB**, không sợ mất mát khi vô tình tắt ứng dụng hoặc tải lại trình duyệt.
- Phiếu khảo sát thực địa được gán mã UUID, đóng gói kèm ảnh chụp nén và tọa độ GPS, đưa vào **Hàng đợi ngoại tuyến (Sync Queue)** với trạng thái `PENDING_SYNC`.
- Hệ thống tự động lắng nghe `window.ononline` và Service Worker Background Sync API để đồng bộ tuần tự lên máy chủ trường khi có kết nối trở lại.
- Dễ dàng đóng gói thành tệp APK Android độc lập thông qua **Capacitor**.

---

## 🏛️ 2. Kiến Trúc Hệ Thống (Architecture)

```
+-------------------------------------------------------------------------+
|                  GIAO DIỆN NGƯỜI DÙNG (HTML5 / CSS3 / JS ES6)           |
|  - Stepper 4 bước: Vị trí -> Thiết bị & Sao -> Minh chứng -> Xác nhận   |
|  - Hệ thống màu nhận diện VKU (#0284c7, Navy, Slate)                     |
|  - Tự động lưu bản nháp theo thời gian thực (Debounced Auto-Save)        |
+------------------------------------+------------------------------------+
                                     |
              +----------------------+----------------------+
              |                                             |
              v                                             v
+-----------------------------+               +---------------------------+
|    CAPACITOR NATIVE BRIDGE  |               |  SERVICE WORKER (sw.js)   |
|  - @capacitor/camera        |               |  - App Shell Pre-caching  |
|    (Fallback HTML5 Canvas)  |               |  - Chiến lược Cache-First |
|  - @capacitor/geolocation   |               |  - Khởi động offline <1s  |
|  - @capacitor/network       |               |  - Background Sync API    |
+--------------+--------------+               +-------------+-------------+
               |                                            |
               +----------------------+---------------------+
                                      |
                                      v
+-------------------------------------------------------------------------+
|                      BỘ NHỚ CỤC BỘ INDEXEDDB                            |
|  - ObjectStore "drafts":     Lưu nháp thời gian thực (phòng ngừa F5)    |
|  - ObjectStore "surveys":    Lưu trữ toàn bộ phiếu kiểm tra tại chỗ     |
|  - ObjectStore "sync_queue": Hàng đợi ngoại tuyến (PENDING_SYNC)        |
|  - ObjectStore "sync_logs":  Nhật ký kiểm toán đồng bộ hệ thống         |
+-------------------------------------+-----------------------------------+
                                      | (Khi mạng khôi phục / online)
                                      v
+-------------------------------------------------------------------------+
|                    ĐỒNG BỘ TUẦN TỰ LÊN MÁY CHỦ (API)                    |
|  - Endpoint: /api/surveys/sync                                          |
|  - Chuyển trạng thái từ PENDING_SYNC sang SYNCED                        |
+-------------------------------------------------------------------------+
```

---

## 🚀 3. Hướng Dẫn Cài Đặt & Chạy Ứng Dụng

### Yêu cầu tiên quyết:
- Trình duyệt hiện đại (Chrome, Edge, Safari, Firefox).
- [Node.js](https://nodejs.org/) (phiên bản 18+ khuyến nghị).

### Bước 1: Khởi chạy máy chủ cục bộ (Local Server)
Do Service Worker và PWA yêu cầu ngữ cảnh bảo mật (`https://` hoặc `http://localhost`), bạn cần chạy ứng dụng qua một máy chủ tĩnh:

```bash
# Cách 1: Sử dụng npx serve (nhanh nhất)
npx serve -l 3000 .

# Cách 2: Sử dụng Live Server trong VS Code hoặc Python HTTP
python -m http.server 3000
```

Truy cập trình duyệt tại: `http://localhost:3000`

### Bước 2: Cài đặt PWA trên máy tính / điện thoại
1. Mở trang web trên trình duyệt Chrome hoặc Edge.
2. Nhấn nút **"⬇️ Cài đặt App"** trên thanh tiêu đề (hoặc biểu tượng Install trên thanh địa chỉ URL).
3. Ứng dụng sẽ chạy trong cửa sổ độc lập (**Standalone Window**) không có thanh công cụ trình duyệt.

---

## 📱 4. Đóng Gói Ứng Dụng Thành Tệp APK Android (Capacitor)

Dự án đã được tích hợp sẵn cấu hình `capacitor.config.json` và cầu nối `NativeBridge`. Để xuất file APK:

```bash
# 1. Cài đặt các thư viện Capacitor
npm install

# 2. Thêm nền tảng Android vào dự án
npx cap add android

# 3. Sao chép tài nguyên web vào thư mục native Android
npx cap sync

# 4. Mở dự án trong Android Studio
npx cap open android

# 5. Build file APK trực tiếp qua dòng lệnh (hoặc bấm Build APK trong Android Studio)
cd android
./gradlew assembleDebug
```
*Tệp APK thành phẩm nằm tại:* `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 📋 5. Kịch Bản Kiểm Thử Ngoại Tuyến (Offline Test Flow)

Bạn có thể dễ dàng kiểm thử quy trình hoạt động ngoại tuyến mà không cần rút dây mạng:

1. **Khởi động ngoại tuyến (Cache-First):**
   - Mở ứng dụng lần đầu để nạp App Shell.
   - Nhấn nút **"🔌 Mô phỏng Mất mạng (Offline)"** trên banner tiêu đề (hoặc ngắt mạng trong tab Network DevTools).
   - Tải lại trang (F5) ➔ Ứng dụng vẫn khởi động mượt mà trong chưa đầy 1 giây.

2. **Lưu bản nháp tự động (IndexedDB Anti-Data-Loss):**
   - Chọn Tòa nhà, Tầng, nhập Số phòng (VD: `A.102`), chấm 2 sao.
   - F5 tải lại trang ➔ Toàn bộ thông tin vừa nhập được tự động khôi phục nguyên vẹn từ bảng `drafts` của IndexedDB.

3. **Hàng đợi đồng bộ & Tự động gửi dữ liệu:**
   - Khi đang ở chế độ Ngoại tuyến, hoàn thành nộp 1 phiếu khảo sát.
   - Phiếu khảo sát được đánh dấu `PENDING_SYNC` và đưa vào danh sách **Hàng đợi đồng bộ**.
   - Bấm **"📶 Tắt mô phỏng (Khôi phục Online)"** ➔ Hệ thống tự động kích hoạt đồng bộ tuần tự, gửi phiếu lên máy chủ và chuyển trạng thái thành `🟢 Đã đồng bộ (SYNCED)`.

4. **Xuất Báo Cáo Kỹ Thuật PDF (2-4 trang):**
   - Chuyển sang tab **"📊 Báo Cáo Kỹ Thuật (PDF)"**.
   - Bấm nút **"🖨️ In / Xuất Báo Cáo PDF (A4)"** để in hoặc lưu thành tệp PDF chuẩn học thuật hoàn chỉnh.

---

## 🌐 6. Hướng Dẫn Triển Khai Trực Tiếp (Live Demo Deployment)

Ứng dụng hoàn toàn là tĩnh (Static PWA), có thể triển khai miễn phí 100% lên Cloudflare Pages hoặc Vercel:

### Triển khai lên Vercel:
```bash
npm install -g vercel
vercel deploy --prod
```

### Triển khai lên Cloudflare Pages:
1. Đẩy mã nguồn lên GitHub.
2. Vào Cloudflare Dashboard ➔ **Workers & Pages** ➔ **Create application** ➔ **Pages** ➔ **Connect to Git**.
3. Chọn thư mục gốc `.` và nhấn **Deploy**.

---

## 📄 7. Cấu Trúc Mã Nguồn

```text
├── index.html                   # Giao diện chính (Mobile-first App Shell, VKU Theme)
├── manifest.json                # Web App Manifest PWA Standalone
├── sw.js                        # Service Worker (Cache-First, Background Sync)
├── css/
│   ├── main.css                 # Hệ thống màu VKU (#0284c7), typography, biến giao diện
│   ├── components.css           # Thẻ khảo sát, stepper, rating sao, camera preview, badges
│   └── responsive.css           # Tối ưu hiển thị di động và định dạng in ấn A4 chuẩn PDF
├── js/
│   ├── app.js                   # Điểm khởi tạo ứng dụng & chuyển đổi tab
│   ├── db.js                    # Quản trị cơ sở dữ liệu IndexedDB (bản nháp, khảo sát, hàng đợi)
│   ├── form-wizard.js           # Logic form 4 bước, validation, auto-draft
│   ├── sync-manager.js          # Quản lý hàng đợi đồng bộ, tự động retry, mock API
│   ├── native-bridge.js         # Cầu nối Camera/GPS/Network giữa Web và Capacitor
│   ├── ui.js                    # Thông báo toast, banner trạng thái mạng, modal
│   └── report-generator.js      # Giao diện báo cáo kỹ thuật tóm tắt 2-4 trang & In PDF
├── icons/
│   ├── icon-192.svg             # Biểu tượng PWA chuẩn 192x192
│   └── icon-512.svg             # Biểu tượng PWA chuẩn 512x512
├── capacitor.config.json        # Cấu hình Capacitor Android
├── package.json                 # Cấu hình dự án & script đóng gói Capacitor
└── README.md                    # Hướng dẫn chi tiết dự án
```

---
*Dự án phát triển bởi Nhóm Sinh viên Kiểm toán Cơ sở vật chất VKU.*
