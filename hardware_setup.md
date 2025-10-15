# Hướng dẫn kết nối phần cứng - Hệ thống tủ khóa thông minh

## 🔌 Kết nối phần cứng

### ESP32 với Servo Motor
```
ESP32          Servo Motor
GPIO2    →     Signal (Vàng/Cam)
3.3V     →     VCC (Đỏ)
GND      →     GND (Đen)
```

### ESP32 với LED
```
ESP32          LED
GPIO4    →     LED Đỏ (Tủ đóng)
GPIO5    →     LED Xanh (Tủ mở)
GPIO18   →     LED Xanh dương (Kết nối WiFi/Firebase)
GND      →     Cực âm LED (qua điện trở 220Ω)
```

### ESP32 với Solenoid Lock (qua MOSFET/Transistor)
```
ESP32            Driver           Solenoid Lock
GPIO12   →       Gate/Base  →     
GND      →       Source/Emitter   →   GND
5-12V +  →       Solenoid +       →   +V (nguồn riêng)
Solenoid -  →    Drain/Collector  →   MOSFET/Transistor
Diode (1N5819/1N4007) song song cuộn solenoid (cực âm vào +V, cực dương vào chân solenoid -) để chống sụt áp ngược
```

Khuyến nghị:
- Dùng MOSFET kênh N logic-level (VD: IRLZ44N, AO3400) hoặc module driver relay/MOSFET sẵn có
- Nguồn solenoid độc lập 5-12V (tùy loại), chung mass với ESP32
- Bắt buộc có diode chống ngược (flyback) song song cuộn
- Có thể thêm điện trở 100Ω ở gate và 10kΩ pull-down về GND

### ESP32 với Reed/Magnetic Door Sensor
```
ESP32          Reed Switch
GPIO13  →      Một đầu reed (qua chế độ INPUT_PULLUP)
GND     →      Đầu còn lại reed
```

Lưu ý:
- Dùng `INPUT_PULLUP` → logic ngược: Đóng cửa = LOW, Mở cửa = HIGH (tuỳ wiring)
- Dùng dây xoắn đôi, tránh nhiễu, đặt reed cố định, nam châm trên cánh tủ

### Nguồn điện
- **ESP32**: Cấp nguồn 5V qua USB hoặc pin
- **Servo**: Cấp nguồn riêng 5V-6V (khuyến nghị dùng nguồn ngoài)

## ⚙️ Cấu hình

### 1. Thư viện cần cài đặt
```
- Firebase ESP Client
- ESP32Servo
```

### 2. Cài đặt trong Arduino IDE
1. Vào **Tools** → **Manage Libraries**
2. Tìm và cài đặt:
   - `Firebase ESP Client` by Mobizt
   - `ESP32Servo` by Kevin Harrington
  
> Nếu dùng solenoid: KHÔNG cần thêm thư viện, chỉ điều khiển `digitalWrite(SOLENOID_PIN, HIGH/LOW)`

### 3. Cấu hình Board
- Board: **ESP32 Dev Module**
- Upload Speed: **115200**
- CPU Frequency: **240MHz**

## 🔧 Tùy chỉnh

### Thay đổi chân servo
```cpp
#define SERVO_PIN 2  // Thay đổi số chân GPIO
```

### Thay đổi chân LED
```cpp
#define LED_RED_PIN 4     // LED đỏ - Tủ đóng
#define LED_GREEN_PIN 5   // LED xanh - Tủ mở
#define LED_BLUE_PIN 18   // LED xanh dương - Kết nối
```

### Thay đổi chân solenoid
```cpp
#define SOLENOID_PIN 12   // Chân điều khiển khoá điện
```

### Thay đổi chân cảm biến reed
```cpp
#define REED_PIN 13       // Cảm biến cửa
```

### Thay đổi ID tủ
```cpp
#define LOCKER_ID "Locker1"  // Thay đổi tên tủ
```

### Điều chỉnh góc servo
```cpp
// Trong hàm openLocker()
lockerServo.write(90);  // Góc mở (0-180 độ)

// Trong hàm closeLocker()  
lockerServo.write(0);   // Góc đóng
```

### Điều chỉnh thời gian kích solenoid
```cpp
// Kích trong 300ms khi mở (tuỳ lực khoá và điện áp)
triggerSolenoid(300);
```

## 🔁 Chuỗi hoạt động hoàn chỉnh (hardware flow)

1. Web gửi lệnh lên Firebase `/Locker1/status`
2. ESP32 nhận lệnh, kích solenoid ngắn để nhả chốt, quay servo mở
3. Đọc `REED_PIN`:
   - Nếu còn đóng → kích solenoid thêm để hỗ trợ mở
4. Khi đóng: quay servo về vị trí đóng, tắt solenoid
5. Đọc reed xác nhận đã đóng; nếu chưa khít → kích solenoid chốt nhẹ
6. Cập nhật `current_status` và `door_sensor` lên Firebase

## 📱 Cấu trúc dữ liệu Firebase

### Đường dẫn dữ liệu
```
/Locker1/
├── status: "open" hoặc "close"     // Lệnh từ web
├── current_status: "open"/"closed" // Trạng thái thực tế
└── last_update: "timestamp"        // Thời gian cập nhật
```

### Gửi lệnh từ web
```javascript
// Mở tủ
firebase.database().ref('/Locker1/status').set('open');

// Đóng tủ  
firebase.database().ref('/Locker1/status').set('close');
```

## 💡 Hiệu ứng LED

### Trạng thái LED
- **🔴 LED Đỏ**: Tủ đóng
- **🟢 LED Xanh**: Tủ mở  
- **🔵 LED Xanh dương**: Kết nối WiFi/Firebase
- **🟡 Nhấp nháy**: Đang mở/đóng tủ
- **⚠️ Nhấp nháy tất cả**: Mất kết nối

### Hiệu ứng khởi động
- LED bật theo thứ tự: Đỏ → Xanh → Xanh dương
- Nhấp nháy tất cả 3 lần
- Tắt tất cả và sẵn sàng hoạt động

## 🚨 Xử lý sự cố

### Servo không hoạt động
- Kiểm tra kết nối dây
- Đảm bảo nguồn điện đủ mạnh
- Kiểm tra chân GPIO

### LED không sáng
- Kiểm tra kết nối dây
- Đảm bảo có điện trở 220Ω
- Kiểm tra cực âm dương LED

### Không kết nối Firebase
- Kiểm tra WiFi
- Xác nhận API Key và Database URL
- Kiểm tra quyền truy cập Firebase

### Tủ không tự động đóng
- Kiểm tra hàm `closeLocker()`
- Điều chỉnh thời gian delay trong `openLocker()`
