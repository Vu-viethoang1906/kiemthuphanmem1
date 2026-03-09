# Kiểm thử hiệu năng với JMeter (KEN)

## 1. Mục tiêu
- Sử dụng JMeter để kiểm thử hiệu năng website của dự án KEN.
- Thiết kế 3 kịch bản kiểm thử (3 Thread Group) với tham số khác nhau.
- Thu thập và phân tích: Response Time, Throughput, Error Rate.
- Trình bày kết quả trong báo cáo ngắn gọn.

## 2. Mục tiêu kiểm thử (Website)
- **Base URL**: `http://localhost:3000`

## 3. Chuẩn bị môi trường
- Cài JMeter: https://jmeter.apache.org/download_jmeter.cgi
- Mở JMeter:
  - Windows: chạy `bin/jmeter.bat`

## 4. File bài làm
- `test-plan-ken-web.jmx`: Test plan JMeter có 3 Thread Group theo yêu cầu.
- `results/`: nơi lưu file CSV và/hoặc ảnh chụp kết quả.

## 5. Mô tả kịch bản kiểm thử
### Thread Group 1: Kịch bản cơ bản
- Threads (Users): 10
- Loop Count: 5
- Hành vi:
  - GET `/` (trang chủ)

### Thread Group 2: Kịch bản tải nặng
- Threads (Users): 50
- Ramp-up: 30s
- Loop Count: 5
- Hành vi:
  - GET `/` (trang chủ)
  - GET `/login` (trang con)

### Thread Group 3: Kịch bản tùy chỉnh
- Threads (Users): 20
- Duration: 60s
- Hành vi:
  - GET `/dashboard` (trang con 1)
  - GET `/admin` (trang con 2)

## 6. Hướng dẫn chạy từng Thread Group (từng bước)
1. Chạy website KEN (FE) tại `http://localhost:3000`.
2. Mở JMeter.
3. Vào **File > Open** và chọn file: `jmeter/test-plan-ken-web.jmx`.
4. Ở cây bên trái, trong từng Thread Group:
   - Chạy **từng Thread Group một** bằng cách:
     - Click phải vào Thread Group cần chạy
     - Chọn **Start**
5. Quan sát kết quả tại các Listener:
   - **View Results Tree** (xem chi tiết request/response)
   - **Summary Report** (tổng hợp số liệu)
6. Xuất kết quả:
   - Trong **Summary Report**:
     - Click phải > **Save Table Data**
     - Lưu vào `jmeter/results/summary_tgX.csv`
   - Hoặc chụp màn hình Summary Report và lưu vào `jmeter/results/`.

## 7. Các chỉ số cần thu thập (điền vào báo cáo)
> Bạn chạy xong 3 Thread Group rồi điền vào bảng dưới.

| Kịch bản | Threads | Ramp-up | Loop/Duration | Avg Response Time (ms) | Throughput (req/s) | Error % |
|---|---:|---:|---|---:|---:|---:|
| TG1 - Cơ bản | 10 | - | Loop 5 |  |  |  |
| TG2 - Tải nặng | 50 | 30s | Loop 5 |  |  |  |
| TG3 - Tùy chỉnh | 20 | - | 60s |  |  |  |

## 8. Nhận xét & kết luận
- Nhận xét 1: (ví dụ) TG2 có Avg Response Time tăng, Throughput tăng nhưng Error% có/không tăng.
- Nhận xét 2: (ví dụ) Endpoint/trang nào chậm nhất.
- Đề xuất: (ví dụ) tối ưu cache, giảm tài nguyên tải, tối ưu truy vấn.

## 9. Minh chứng
- CSV kết quả: `jmeter/results/*.csv`
- Ảnh chụp: `jmeter/results/*.png`
