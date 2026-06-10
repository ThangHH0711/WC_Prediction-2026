# TÀI LIỆU YÊU CẦU SẢN PHẨM (PRD)
## DỰ ÁN: WEBSITE DỰ ĐOÁN BÓNG ĐÁ WORLD CUP 2026 (WC 2026 PREDICTION)

Tài liệu này xác định các yêu cầu kỹ thuật và chức năng để xây dựng hệ thống website dự đoán tỉ số World Cup 2026 dành cho nhóm khoảng 20 người chơi (hiện tại có 14 người chơi theo danh sách thực tế). Điểm đặc biệt của hệ thống là áp dụng cơ chế tính điểm phạt/thưởng động theo tài liệu `Rule.docx` và tự động cập nhật tỉ số từ Livescore.

---

## 1. TỔNG QUAN DỰ ÁN & MỤC TIÊU
- **Tên dự án**: World Cup 2026 Prediction Web App
- **Đối tượng sử dụng**: Nhóm khoảng 20 người chơi giao lưu (danh sách khởi tạo gồm 14 người từ file `User.xlsx`).
- **Mục tiêu**: 
  - Tạo sân chơi trực tuyến trực quan, hiện đại, giúp người chơi dễ dàng nhập dự đoán tỉ số cho 104 trận đấu của World Cup 2026.
  - Tự động cập nhật tỉ số các trận đấu từ livescore.com ngay sau khi kết thúc 90 phút thi đấu chính thức.
  - Tự động tính toán điểm số phạt và chia thưởng động cho người chơi theo thời gian thực.
  - Hiển thị bảng xếp hạng trực quan, dashboard thống kê và lịch sử dự đoán của từng người chơi.

---

## 2. DANH SÁCH NGƯỜI CHƠI (USER PROFILES)
Dữ liệu người chơi được khởi tạo dựa trên file `User.xlsx`, gồm 14 thành viên chính thức:

| STT | Họ và tên | Vai trò đề xuất |
|---|---|---|
| 1 | Hoàng Hữu Thắng | Người chơi / Admin |
| 2 | Nguyễn Thanh Sơn | Người chơi |
| 3 | Phạm Thị Thu Hằng | Người chơi |
| 4 | Trần Minh Đức | Người chơi |
| 5 | Nguyễn Văn Trường | Người chơi |
| 6 | Nguyễn Trí Dũng | Người chơi |
| 7 | Hà Hải Ninh | Người chơi |
| 8 | Lưu Văn Huyên | Người chơi |
| 9 | Hoàng Thị Thu Hà | Người chơi |
| 10 | Trần Đức Việt | Người chơi |
| 11 | Đặng Trung Kiên | Người chơi |
| 12 | Phan Võ Thành Long | Người chơi |
| 13 | Hoàng Văn Lâm | Người chơi |
| 14 | Trương Hoàng Nam | Người chơi |

*Hệ thống sẽ cho phép Admin tạo thêm tài khoản người chơi mới trực tiếp trên giao diện quản trị để đạt quy mô khoảng 20 người.*

---

## 3. QUY TẮC TÍNH ĐIỂM (SCORING LOGIC)
Luật tính điểm được thiết lập chặt chẽ theo file `Rule.docx`. Đây là hệ thống tính điểm **dựa trên điểm phạt** (trừ điểm khi đoán sai) và **chia sẻ quỹ điểm phạt** (thưởng cho người đoán đúng tỉ số chính xác).

### 3.1. Các tham số điểm phạt theo vòng đấu
Chỉ tính kết quả trong **90 phút thi đấu chính thức** (bao gồm cả bù giờ hiệp 1 và hiệp 2, không tính hiệp phụ và luân lưu).

| Vòng đấu | Điểm phạt Sai xu thế ($P_{xt}$) | Điểm phạt Sai tỷ số ($P_{ts}$ / 1 bàn chênh) | Điểm phạt Không dự đoán ($P_{kdd}$) |
|---|---|---|---|
| **Vòng bảng** (72 trận) | -5 điểm | -2 điểm / bàn | -15 điểm |
| **Vòng 1/16 (R32)** (16 trận) | -10 điểm | -4 điểm / bàn | -20 điểm |
| **Vòng 1/8 (R16)** (8 trận) | -12 điểm | -5 điểm / bàn | -25 điểm |
| **Tứ kết** (4 trận) | -15 điểm | -6 điểm / bàn | -30 điểm |
| **Bán kết** (2 trận) | -20 điểm | -8 điểm / bàn | -50 điểm |
| **Tranh hạng 3** (1 trận) | -30 điểm | -12 điểm / bàn | -70 điểm |
| **Chung kết** (1 trận) | -30 điểm | -12 điểm / bàn | -70 điểm |

### 3.2. Cách tính điểm phạt chi tiết cho từng người chơi
Giả sử tỉ số thực tế là $A - B$. Người chơi dự đoán tỉ số là $A' - B'$.
- **Trường hợp 1: Không dự đoán**
  - Người chơi bị trừ thẳng số điểm $P_{kdd}$ tương ứng với vòng đấu đó.
- **Trường hợp 2: Dự đoán sai xu thế (Sai kết quả thắng/hòa/thua)**
  - Người chơi bị trừ cả điểm sai xu thế $P_{xt}$ **VÀ** bị cộng dồn điểm phạt sai lệch tỷ số (tính chênh lệch bàn thắng chênh lệch $\Delta \times P_{ts}$).
  - Ví dụ: Ở Vòng bảng, nếu thực tế là 2-1 mà dự đoán 0-3, người chơi bị trừ $5 \text{ (sai xu thế)} + (|2-0| + |1-3|) \times 2 = 5 + 8 = 13$ điểm.
- **Trường hợp 3: Dự đoán đúng xu thế nhưng sai tỷ số chính xác**
  - Người chơi bị trừ điểm sai tỷ số dựa trên tổng bàn thắng chênh lệch:
    $$\text{Số bàn chênh lệch } (\Delta) = |A - A'| + |B - B'|$$
    $$\text{Điểm phạt} = \Delta \times P_{ts}$$
- **Trường hợp 4: Dự đoán đúng chính xác tỷ số ($A' = A$ và $B' = B$)**
  - Người chơi **không bị trừ điểm** (0 điểm phạt).
  - Người chơi được nhận thêm điểm thưởng từ Quỹ thưởng của trận đấu đó.

### 3.3. Cơ chế Quỹ thưởng trận đấu (Bonus Pool)
Để khuyến khích dự đoán chính xác, hệ thống áp dụng cơ chế chia thưởng độc đáo:
1. Mỗi trận đấu kết thúc, hệ thống tính tổng số điểm bị trừ của tất cả những người chơi đoán sai hoặc không đoán trong trận đấu đó. Gọi tổng điểm này là **Quỹ điểm phạt của trận** ($Pool$).
2. **Quỹ thưởng** được trích ra bằng **40%** của $Pool$:
   $$\text{Quỹ thưởng } (BonusPool) = Pool \times 40\%$$
3. Số điểm này được chia đều cho tất cả những người chơi dự đoán **đúng tỷ số chính xác** trong trận đấu đó:
   $$\text{Điểm thưởng mỗi người} = \frac{BonusPool}{\text{Số người đoán đúng}}$$
4. Nếu không có ai đoán đúng tỷ số chính xác, Quỹ thưởng của trận đó sẽ không được phát (hoặc cộng dồn vào quỹ chung tùy cấu hình).

### 3.4. Các quyết định thiết kế đã được chốt (Design Decisions)

> [!NOTE]
> **Quyết định 1: Luật tính điểm phạt cho Vòng 1/8 (Round of 16)**
> Thống nhất áp dụng mức phạt trung gian như đề xuất:
> - Sai xu thế: **-12 điểm**
> - Sai tỷ số: **-5 điểm / 1 bàn chênh lệch**
> - Không dự đoán: **-25 điểm**

> [!NOTE]
> **Quyết định 2: Tính điểm phạt cộng dồn khi sai xu thế**
> Thống nhất áp dụng cơ chế **Cộng dồn** điểm phạt. 
> Khi người chơi đoán sai xu thế (không trúng thắng/hòa/thua), người chơi sẽ bị trừ đồng thời cả điểm phạt sai xu thế ($P_{xt}$) **và** điểm phạt chênh lệch bàn thắng ($\Delta \times P_{ts}$).

---

## 4. TỰ ĐỘNG CẬP NHẬT TỈ SỐ (LIVESCORE SCRAPER ENGINE)
Hệ thống cần tích hợp một dịch vụ thu thập dữ liệu (Scraper) để cập nhật tỉ số tự động từ trang web:
`https://www.livescore.com/en/football/international/world-cup-2026/`

### Yêu cầu kỹ thuật cho Scraper:
1. **Tần suất quét**:
   - Khi không có trận đấu: Quét 1 giờ/lần để cập nhật lịch thi đấu hoặc trạng thái.
   - Khi đang có trận đấu (dựa trên giờ thi đấu): Quét 5 phút/lần bắt đầu từ phút thứ 85 của trận đấu cho đến khi trận đấu kết thúc.
2. **Nhận diện trạng thái trận đấu**:
   - Chỉ ghi nhận tỉ số khi trạng thái trận đấu chuyển sang **FT** (Full Time - Kết thúc) hoặc **AET** (Sau hiệp phụ) hoặc **AP** (Sau luân lưu).
3. **Thu thập tỉ số 90 phút chính thức**:
   - Đây là điểm tối quan trọng. Nếu trận đấu có hiệp phụ/luân lưu, hệ thống **chỉ được lấy tỉ số hòa sau 90 phút thi đấu chính thức**.
   - *Giải pháp*: Cần phân tích cấu trúc HTML/JSON của Livescore để bóc tách chính xác phần tỉ số chính thức (thường hiển thị riêng biệt hoặc nằm trong thẻ chi tiết trận đấu).
4. **Cơ chế dự phòng (Fallback)**:
   - Do Livescore sử dụng Cloudflare bảo vệ và render dynamic bằng JS (Next.js), việc cào dữ liệu trực tiếp bằng thư viện đơn giản như BeautifulSoup có thể bị chặn.
   - *Giải pháp*: Sử dụng API nội bộ của Livescore (nếu tìm được endpoint công khai qua Network Tab) hoặc dùng công cụ giả lập trình duyệt (Playwright/Puppeteer) kèm proxy/user-agent xoay vòng.
   - **Bắt buộc**: Phải có chức năng nhập tỉ số thủ công bởi Admin trong trường hợp cơ chế tự động bị lỗi hoặc livescore thay đổi giao diện.

---

## 5. THIẾT KẾ GIAO DIỆN & CHỨC NĂNG HỆ THỐNG (SYSTEM FEATURES)

Hệ thống web sẽ được thiết kế với giao diện cao cấp, hiện đại, tối ưu hiển thị trên cả máy tính và điện thoại di động (Responsive UI).

### 5.1. Trang chủ & Bảng xếp hạng (Dashboard & Leaderboard)
- **Giao diện**: Nền tối (Dark Mode) thể thao, hiệu ứng kính mờ (Glassmorphism), màu sắc chủ đạo là xanh cỏ sân vận động và vàng cúp vàng.
- **Bảng xếp hạng tổng**:
   - Thứ hạng (hỗ trợ đồng hạng).
   - Tên người chơi.
   - Tổng điểm hiện tại.
   - Số trận đã dự đoán.
   - Các chỉ số chi tiết: Số trận đoán đúng tỉ số chính xác, Số trận đúng xu thế, Tổng điểm thưởng nhận được.
- **Biểu đồ xu hướng**: Biểu đồ đường thể hiện sự thay đổi thứ hạng của Top 5 người chơi qua từng ngày thi đấu.

### 5.2. Cổng dự đoán dành cho người chơi (Player Portal)
- **Đăng nhập**: Đăng nhập nhanh bằng mã PIN cá nhân hoặc liên kết Google Account (dựa trên Email trong danh sách).
- **Trang dự đoán lịch thi đấu**:
   - Hiển thị danh sách 104 trận đấu chia theo ngày hoặc theo vòng đấu.
   - Mỗi trận đấu hiển thị: Quốc kỳ, Tên hai đội tuyển, Thời gian đá (giờ Việt Nam GMT+7), Sân vận động.
   - Ô nhập tỷ số dự đoán (Đội A - Đội B).
   - **Cơ chế Khóa dự đoán**:
     - Hệ thống tự động khóa ô dự đoán của trận đấu **15 phút trước giờ bóng lăn** (kick-off). Sau thời gian này, người chơi không thể chỉnh sửa dự đoán.
     - Sau khi khóa, tỉ số dự đoán của tất cả người chơi cho trận đó sẽ được công khai để mọi người cùng theo dõi và đối chiếu.

### 5.3. Bảng điểm chi tiết (Detailed Matrix)
- Một bảng ma trận lớn (giống sheet `DIEM CHI TIET` trong Excel) hiển thị:
  - Các dòng: 104 trận đấu.
  - Các cột: Dự đoán và điểm số của từng người chơi trong tổng số 20 người.
  - Giúp người chơi dễ dàng click vào xem ai đoán tỉ số bao nhiêu, được bao nhiêu điểm ở từng trận cụ thể.

### 5.4. Trang quản trị (Admin Dashboard)
- **Quản lý trận đấu**: Thay đổi thời gian đá, cập nhật tỉ số thủ công (nếu cần thiết).
- **Quản lý người chơi**: Thêm/Sửa/Xóa tài khoản người chơi (email, tên hiển thị, ghi chú).
- **Lịch sử Email Log**: Theo dõi lịch sử hệ thống gửi email nhắc nhở người chơi nhập dự đoán trước mỗi ngày thi đấu (nếu tích hợp dịch vụ gửi mail).

---

## 6. ĐỀ XUẤT CÔNG NGHỆ (TECH STACK)
Để đảm bảo ứng dụng chạy mượt mà, dễ bảo trì và triển khai nhanh chóng:
1. **Frontend**: React.js hoặc Next.js (để tối ưu hóa SEO và render phía máy chủ), Tailwind CSS để tùy biến giao diện thể thao đẹp mắt, Framer Motion cho các micro-animation mượt mà.
2. **Backend**: Node.js (Express/NestJS) hoặc Python (FastAPI) - rất thích hợp để viết scraper.
3. **Database**: PostgreSQL hoặc SQLite (đủ tốt cho quy mô 20 người chơi và dữ liệu 104 trận đấu).
4. **Hosting**: Triển khai dễ dàng trên Vercel (Frontend) và Render/Railway (Backend & Database) với chi phí tối thiểu hoặc miễn phí.
