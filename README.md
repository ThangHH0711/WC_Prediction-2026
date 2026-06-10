# Chương Trình Dự Đoán World Cup 2026

Ứng dụng web cao cấp hỗ trợ cài đặt trên điện thoại dạng PWA (Progressive Web App), phục vụ nhóm khoảng 20 người chơi dự đoán tỷ số 104 trận đấu World Cup 2026. Tự động tính điểm phạt và chia quỹ thưởng 40% dựa trên tỉ số chính thức cập nhật tự động từ Livescore.com.

---

## Các thành phần chính của dự án

1. **`/frontend`**: Mã nguồn giao diện Web PWA (HTML, Vanilla JS, CSS) - có thể host miễn phí trên GitHub Pages hoặc Vercel.
2. **`/supabase`**: Chứa file cấu trúc cơ sở dữ liệu (`schema.sql`) và dữ liệu danh sách 14 người chơi kèm lịch thi đấu (`seed_data.sql`).
3. **`/scraper`**: Kịch bản cào tỷ số tự động bằng Python từ Livescore.com (`scraper.py`).
4. **`.github/workflows`**: File cấu hình tự động chạy kịch bản cào tỷ số trên GitHub Actions 10 phút/lần (`scrape.yml`).

---

## Hướng dẫn cài đặt & Triển khai (5 Bước)

### Bước 1: Tạo dự án Supabase (Cơ sở dữ liệu)
1. Đăng nhập/Đăng ký tài khoản miễn phí trên [Supabase](https://supabase.com).
2. Tạo một dự án mới (New Project).
3. Đợi dự án khởi tạo xong, truy cập vào mục **SQL Editor** trong thanh công cụ bên trái.
4. Tạo một truy vấn mới (New Query):
   - Mở file [supabase/schema.sql](file:///g:/Dropbox/Chuyen%20de%20AI/6.%20WC_Prediction/supabase/schema.sql), sao chép toàn bộ nội dung và dán vào SQL Editor của Supabase $\rightarrow$ Nhấn **Run**.
5. Tạo tiếp một truy vấn mới khác:
   - Mở file [supabase/seed_data.sql](file:///g:/Dropbox/Chuyen%20de%20AI/6.%20WC_Prediction/supabase/seed_data.sql), sao chép toàn bộ nội dung và dán vào SQL Editor $\rightarrow$ Nhấn **Run** để nạp danh sách 14 người chơi (mật khẩu mặc định `123456`) và 104 trận đấu World Cup 2026.
6. Tạo tiếp một truy vấn mới khác:
   - Mở file [supabase/champion_schema.sql](file:///g:/Dropbox/Chuyen%20de%20AI/6.%20WC_Prediction/supabase/champion_schema.sql), sao chép toàn bộ nội dung và dán vào SQL Editor $\rightarrow$ Nhấn **Run** để cài đặt tính năng cược Đội vô địch (Bet Champion).

### Bước 2: Lấy thông tin kết nối Supabase
1. Vào phần **Project Settings** (biểu tượng bánh răng ở góc dưới bên trái).
2. Chọn mục **API**.
3. Sao chép 2 thông tin sau:
   - **Project URL** (Ví dụ: `https://xxxx.supabase.co`)
   - **Anon Public API Key** (Khóa công khai)

### Bước 3: Đăng nhập và trải nghiệm cục bộ (Local Testing)
1. Mở file [frontend/index.html](file:///g:/Dropbox/Chuyen%20de%20AI/6.%20WC_Prediction/frontend/index.html) bằng trình duyệt web.
2. Hệ thống sẽ tự động chuyển bạn đến trang **Cấu hình (🔑 Configuration)**.
3. Dán **Project URL** và **Anon Public API Key** bạn vừa lấy ở Bước 2 vào biểu mẫu $\rightarrow$ Nhấn **Lưu cấu hình**.
4. Ứng dụng sẽ tự động tải lại và chuyển đến trang đăng nhập.
5. Chọn tên của bạn (Ví dụ: **Hoàng Hữu Thắng**) $\rightarrow$ Nhập mật khẩu mặc định: `123456` $\rightarrow$ Nhấn **Đăng nhập** để bắt đầu dự đoán!
   *Lưu ý: Admin (Hoàng Hữu Thắng) có quyền đổi mật khẩu cho người chơi khác ở mục Admin Panel trong App.*

### Bước 4: Đẩy dự án lên GitHub & Bật GitHub Pages
1. Đăng tải toàn bộ thư mục này lên một kho lưu trữ (Repository) trên tài khoản GitHub của bạn.
2. Trên GitHub, vào mục **Settings** của Repository $\rightarrow$ **Pages**.
3. Tại phần **Build and deployment**, chọn **Source** là `Deploy from a branch`.
4. Chọn nhánh chính (ví dụ: `main`) và thư mục gốc hoặc thư mục `/frontend` $\rightarrow$ Nhấn **Save**.
5. Đợi 1-2 phút, GitHub sẽ cung cấp link trang web hoạt động trực tuyến (Ví dụ: `https://username.github.io/wc-prediction/`). 
6. Khi người chơi truy cập trang web này lần đầu, họ chỉ cần vào mục **Cấu hình** và dán 2 thông tin Supabase ở Bước 2 là có thể đăng nhập chơi chung. (Thông tin cấu hình lưu an toàn trên trình duyệt của từng người chơi).

### Bước 5: Cấu hình Tự động cào tỉ số (GitHub Actions Scraper)
Để tỉ số tự động cập nhật và tính điểm phạt/thưởng sau khi trận đấu kết thúc:
1. Trên Repository GitHub của bạn, truy cập vào mục **Settings** $\rightarrow$ **Secrets and variables** $\rightarrow$ **Actions**.
2. Nhấp vào **New repository secret** để tạo 2 secret sau:
   - Tên: `SUPABASE_URL` | Giá trị: URL Supabase của bạn.
   - Tên: `SUPABASE_KEY` | Giá trị: Khóa Anon Public của bạn.
3. Vào mục **Actions** trên thanh menu của Repository $\rightarrow$ Chọn workflow **Auto-Sync Livescore WC 2026** ở cột bên trái $\rightarrow$ Nhấp **Run workflow** để chạy thử nghiệm cào tỷ số lần đầu tiên.
4. Từ nay về sau, GitHub Actions sẽ tự động chạy kịch bản này mỗi 10 phút để cập nhật tỉ số cho bạn mà không tốn chi phí host máy chủ!

---

## Luật tính điểm tự động trong Cơ sở dữ liệu (PostgreSQL)

Mọi phép tính điểm phạt/thưởng đều được xử lý bằng cơ chế **Trigger & Stored Procedure** ngay trong cơ sở dữ liệu Supabase để đảm bảo tính đồng bộ và bảo mật tuyệt đối.

- **Vòng bảng**: Sai xu thế phạt **-5 điểm**, Sai tỉ số phạt **-2 điểm / 1 bàn chênh lệch**, Không dự đoán phạt **-15 điểm**.
- **Vòng 1/16**: Sai xu thế phạt **-10 điểm**, Sai tỉ số phạt **-4 điểm / 1 bàn chênh lệch**, Không dự đoán phạt **-20 điểm**.
- **Vòng 1/8**: Sai xu thế phạt **-12 điểm**, Sai tỉ số phạt **-5 điểm / 1 bàn chênh lệch**, Không dự đoán phạt **-25 điểm**.
- **Tứ kết**: Sai xu thế phạt **-15 điểm**, Sai tỉ số phạt **-6 điểm / 1 bàn chênh lệch**, Không dự đoán phạt **-30 điểm**.
- **Bán kết**: Sai xu thế phạt **-20 điểm**, Sai tỉ số phạt **-8 điểm / 1 bàn chênh lệch**, Không dự đoán phạt **-50 điểm**.
- **Tranh hạng 3 / Chung kết**: Sai xu thế phạt **-30 điểm**, Sai tỉ số phạt **-12 điểm / 1 bàn chênh lệch**, Không dự đoán phạt **-70 điểm**.
- **Điểm Thưởng Đúng Tỉ Số Chính Xác**: Những người dự đoán đúng tỷ số chính xác sẽ không bị trừ điểm phạt, đồng thời nhận được phần chia đều từ **40% tổng quỹ điểm phạt** của tất cả những người đoán sai trong trận đấu đó.
- **Tính điểm Cộng dồn**: Người đoán sai xu thế sẽ bị phạt đồng thời cả điểm sai xu thế cố định + điểm chênh lệch bàn thắng chênh lệch so với tỷ số thực tế.
- **Quy tắc 90 phút**: Chỉ tính kết quả trận đấu trong 90 phút thi đấu chính thức.
