# DESIGN.md — Yume Studio (app quản lý sau đăng nhập)

Thế giới thị giác: **"Trang sách kỷ yếu"**. App được "in" như cuốn kỷ yếu của chính lớp học: mỗi lớp, mỗi buổi chụp được chú thích như chú thích ảnh tập thể. Không phải admin SaaS chung chung.

Phạm vi: mọi trang sau đăng nhập. Trang portfolio công khai (`/portfolio`, scope `.yume-v2`) có hệ riêng, không áp dụng file này.
Chế độ: Operate. Ưu tiên điện thoại, mọi vai trò. Chỉ tiếng Việt. Sáng + tối.

## 1. Màu (token trong `src/index.css`, dùng qua Tailwind)

| Vai trò | Token / class | Sáng | Tối | Dùng cho |
|---|---|---|---|---|
| Nền giấy | `bg-background` | #F6F4EF | xanh rất tối | Nền trang |
| Tờ làm việc | `bg-card` | trắng | xanh tối | Bảng, thẻ, form, sheet |
| Mực | `text-foreground` | #1C1A17 | giấy ấm | Chữ chính, gạch dưới tiêu đề |
| Chữ phụ | `text-muted-foreground` | nâu xám đủ tương phản AA | | Meta, nhãn |
| Bìa sách | `bg-book` / `text-book-foreground` / `bg-book-line` | #1E3B33 | | Sidebar, pill mùa. Không dùng trong vùng nội dung |
| Nhũ vàng (foil) | `bg-primary`, `text-foil` | amber #F59E0B | | Chỉ: logo, nút chính, hôm nay, mục nav đang chọn |
| Đường kẻ | `border-border` | hairline ấm | | Mọi viền 1px |
| Lỗi/phá huỷ | `destructive` | đỏ đậm (hsl 4 77% 40%) | | Lỗi, xoá |

Màu trạng thái cố định (qua `Badge`): chưa bắt đầu = xám (`neutral`), đang xử lý = xanh xám (`info`), chờ tiền/ảnh = vàng nâu (`warning`), xong = xanh lá (`success`), thiếu/lỗi/mất = đỏ (`danger`), huỷ = xám + gạch ngang. Không tự chế màu trạng thái mới trong trang.

Trạng thái lớp → màu (`CUSTOMER_STATUS_VARIANT`): Chưa làm việc xám · Bắt đầu liên hệ / Đã liên hệ / Chưa chụp xanh xám · Đã cọc / Chưa trả ảnh in vàng nâu · Đã chụp / Hoàn thành xanh lá · Không chốt đỏ. Nhãn chữ luôn đi kèm màu.

Amber là foil: nếu một màn có quá 1 khối amber lớn (ngoài nút chính), là sai.

## 2. Chữ

- **Literata** (`font-display`): tiêu đề trang (`PageHeader`), tên lớp trong chú thích, tiêu đề sheet/dialog, và tiêu đề khối nội dung (`text-lg`, ví dụ "Quy trình chăm sóc", "Khoản thu"). Không dùng cho số liệu, nút, nhãn, tiêu đề cột.
- **Be Vietnam Pro** (`font-sans`, mặc định): mọi chữ UI và số.
- Số liệu (tiền, giờ, sĩ số, KPI): class `tabular` (chữ số lining + đều cột).
- Cỡ tối thiểu 12px cho nhãn, 14px cho nội dung. Không dùng 10–11px.
- Nhãn cột bảng: 12px chữ hoa, tracking 0.05em, `text-muted-foreground` (không làm mờ thêm).
- Không dùng kicker tiếng Anh/eyebrow trên tiêu đề.

## 3. Hình khối

- Bo góc: `rounded-md` (6px) cho điều khiển, `rounded-lg` (8px) cho thẻ/bảng/sheet. Không dùng 14px+ (trừ góc trên bottom sheet `rounded-t-2xl`).
- Viền 1px hairline; không đổ bóng thẻ. Bóng chỉ cho lớp nổi (menu, dialog, sheet).
- Gạch mực: `border-b border-foreground/80` dưới tiêu đề trang và tiêu đề sheet — chữ ký "chú thích kỷ yếu".

## 4. Định dạng (`src/utils/format.ts`)

| Hàm | Ra | Dùng khi |
|---|---|---|
| `formatCurrency(n)` | `1.200.000 ₫` | Mọi số tiền đầy đủ |
| `formatCompactCurrency(n)` | `1,2 tr ₫`, `3,4 tỷ ₫` | KPI, biểu đồ, nơi chật |
| `formatDate(s)` | `03/11/2026` | Ngày |
| `formatDateTime(s)` | `14:30 · 03/11/2026` | Thời điểm (không bao giờ hiện giây) |
| `formatVnd` (packageProfit) | `1.200.000 ₫` | Đồng bộ với `formatCurrency` |

Không gọi `toLocaleString('vi-VN')` trực tiếp trong trang mới; thêm hàm vào `format.ts` nếu thiếu. Thu dùng dấu `+` và xanh lá, chi dùng `−` và đỏ.

## 5. Thành phần dùng chung (`src/components/ui`)

- **Khung app** (`Layout/Sidebar`, `Topbar`): sidebar bìa xanh, nhãn nhóm "Công việc"/"Quản trị"; topbar có tên trang (mobile) + pill mùa bìa xanh. Mobile có tab bar dưới.
- **`PageHeader`**: tiêu đề serif + 1 dòng mô tả/đếm + gạch mực; hành động chính bên phải. Trên mobile tiêu đề ẩn (topbar đã có).
- **`DataTable`** = danh sách chuẩn:
  - `mobileCard={(row) => …}` → mobile hiện thẻ, desktop hiện bảng, cùng một nguồn dữ liệu.
  - `loading` → khung xương; `error` + `onRetry` → thông báo lỗi có "Thử lại" (không bao giờ hiện như danh sách rỗng); `emptyTitle/emptyAction` cho trạng thái rỗng.
- **`RowActions`**: một nút icon chính (sửa) + menu "…". Hành động phá huỷ luôn ở trong menu, tách vạch, chữ đỏ. Không đặt thùng rác trần cạnh bút chì.
- **`FilterSheet` / `FilterSection` / `FilterChip`**: bộ lọc mobile dạng sheet đáy; nút "Xem N {đơn vị}". Desktop: bộ lọc một hàng trên bảng.
- **`StatCard`**: ô KPI có `loading` (khung xương) và `error` ("Không tải được"); không bao giờ hiện `0 ₫` khi chưa có dữ liệu thật.
- **`Modal`**: mặc định thành bottom sheet trên mobile (`mobileSheet`).
- **`Button`**: chính = amber phẳng; outline = viền hairline; link = gạch chân amber.
- **`Badge`**: màu trạng thái cố định (mục 1).

## 6. Bố cục & tương tác

- Một hành động chính mỗi trang; trên mobile nằm trong vùng ngón cái.
- Vùng chạm ≥ 36px (điều khiển trong sheet 44px).
- Không cuộn ngang bảng trên mobile khi đã có `mobileCard`.
- Trạng thái cần có ở mọi danh sách: đang tải, rỗng, lỗi, và không có quyền.
- Lịch chụp: có cả dạng danh sách và dạng lịch tháng. Hôm nay = một vòng amber duy nhất. Trùng ekip vẽ bằng gạch chéo.

## 7. Chuyển động

150–200ms ease-out cho hover/mở menu; sheet trượt 300ms. Không hoạt ảnh trang trí. Tôn trọng `prefers-reduced-motion`.

## 8. Lộ trình áp dụng

Đợt 0 nền chung (xong) → 1 Thợ ngoài + Lịch chụp → 2 Khách hàng + Chi tiết lớp + Thông tin HS → 3 Tài chính + Danh mục + Tính lãi gói → 4 Người dùng + Phản hồi → 5 Trang phục + Gói + Mùa → 6 Dashboard + Hồ sơ.
Hợp đồng hướng đi: `.impeccable/surfaces/src-components-layout-layout-tsx.md`. Phác thảo tham chiếu: `.impeccable/mocks/decision/y-yearbook.html`.
