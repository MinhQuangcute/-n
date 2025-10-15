#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"
#include <ESP32Servo.h>

// Cấu hình WiFi
#define WIFI_SSID "Quang Chu"
#define WIFI_PASSWORD "03102003"

// Cấu hình Firebase
#define API_KEY "AIzaSyBqfcOprdE5MT6m1yfXmRDtCzngtX86-7U"
#define DATABASE_URL "https://minhquang-36ee2-default-rtdb.firebaseio.com/"

// Cấu hình Servo
#define SERVO_PIN 2  // Chân GPIO2 điều khiển servo
#define LOCKER_ID "Locker1"  // ID của tủ

// Cấu hình LED
#define LED_RED_PIN 4     // LED đỏ - Tủ đóng
#define LED_GREEN_PIN 5   // LED xanh - Tủ mở
#define LED_BLUE_PIN 18   // LED xanh dương - Kết nối WiFi/Firebase

// Cấu hình Solenoid (kích qua transistor/MOSFET)
#define SOLENOID_PIN 12   // Chân điều khiển cuộn hút khoá điện (LOW=off, HIGH=on)

// Cảm biến cửa (Reed/Magnetic), dùng kéo lên nội
#define REED_PIN 13       // Đóng: thường là LOW (tuỳ wiring); Mở: HIGH

// Tạo các đối tượng
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
Servo lockerServo;

// Biến trạng thái
String currentStatus = "closed";
String lastStatus = "";
unsigned long lastCheckTime = 0;
const unsigned long checkInterval = 1000; // Kiểm tra mỗi 1 giây

void setup() {
  Serial.begin(115200);

  // ---- WiFi ----
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("🔌 Kết nối WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }
  Serial.println("\n✅ WiFi đã kết nối!");
  Serial.println("📡 IP: " + WiFi.localIP().toString());

  // ---- Firebase ----
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  Serial.println("🔗 Kết nối Firebase thành công!");

  // ---- LED ----
  pinMode(LED_RED_PIN, OUTPUT);
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(LED_BLUE_PIN, OUTPUT);
  
  // Hiệu ứng khởi động LED
  startupLEDEffect();
  Serial.println("💡 LED đã khởi tạo");

  // ---- Servo ----
  lockerServo.attach(SERVO_PIN);
  lockerServo.write(0); // Vị trí đóng (0 độ)
  delay(1000);
  Serial.println("🔒 Servo đã khởi tạo - Tủ đang đóng");

  // ---- Solenoid ----
  pinMode(SOLENOID_PIN, OUTPUT);
  digitalWrite(SOLENOID_PIN, LOW); // Mặc định tắt cuộn hút
  Serial.println("🔩 Solenoid đã khởi tạo - OFF");

  // ---- Reed Switch ----
  pinMode(REED_PIN, INPUT_PULLUP);
  Serial.println("🧲 Cảm biến cửa (Reed) đã khởi tạo");

  // Gửi trạng thái ban đầu lên Firebase
  sendStatusToFirebase("closed");
  
  // Bật LED đỏ (tủ đóng)
  setLEDStatus("closed");
  
  Serial.println("🚀 Hệ thống tủ khóa đã sẵn sàng!");
  Serial.println("📋 Đang theo dõi lệnh từ Firebase...");
}

void loop() {
  // Kiểm tra kết nối WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ Mất kết nối WiFi, đang thử kết nối lại...");
    setLEDStatus("disconnected");
    WiFi.reconnect();
    return;
  } else {
    // WiFi đã kết nối, bật LED xanh dương
    digitalWrite(LED_BLUE_PIN, HIGH);
  }

  // Đọc trạng thái từ Firebase theo chu kỳ
  if (millis() - lastCheckTime >= checkInterval) {
    readStatusFromFirebase();
    lastCheckTime = millis();
    // Cập nhật trạng thái cảm biến cửa định kỳ
    sendDoorSensorToFirebase();
  }

  delay(100); // Tránh quá tải CPU
}

// Hàm đọc trạng thái từ Firebase
void readStatusFromFirebase() {
  String path = "/" + String(LOCKER_ID) + "/status";
  
  if (Firebase.RTDB.getString(&fbdo, path)) {
    String newStatus = fbdo.stringData();
    
    // Chỉ xử lý khi có thay đổi trạng thái
    if (newStatus != lastStatus) {
      Serial.println("📨 Nhận lệnh mới: " + newStatus);
      // Đọc cảm biến trước khi thực thi để tránh thao tác dư thừa
      bool doorClosedBefore = (digitalRead(REED_PIN) == LOW);
      if (newStatus == "open") {
        if (!doorClosedBefore) {
          Serial.println("ℹ️ Cửa đang mở sẵn (theo cảm biến). Bỏ qua lệnh mở.");
          sendDoorSensorToFirebase();
          sendStatusToFirebase("open");
        } else {
          openLocker();
        }
      } else if (newStatus == "close") {
        if (doorClosedBefore) {
          Serial.println("ℹ️ Cửa đang đóng sẵn (theo cảm biến). Bỏ qua lệnh đóng.");
          sendDoorSensorToFirebase();
          sendStatusToFirebase("closed");
        } else {
          closeLocker();
        }
      } else {
        Serial.println("⚠️ Lệnh không hợp lệ: " + newStatus);
      }
      
      lastStatus = newStatus;
    }
  } else {
    Serial.println("❌ Lỗi đọc Firebase: " + fbdo.errorReason());
  }
}

// Hàm mở tủ
void openLocker() {
  Serial.println("🔓 Đang mở tủ...");
  
  // Hiệu ứng LED khi mở
  setLEDStatus("opening");

  // Kích solenoid trong thời gian ngắn để nhả chốt
  triggerSolenoid(300); // 300ms tuỳ lực khoá
  
  // Xoay servo 90 độ để mở
  for (int pos = 0; pos <= 90; pos += 1) {
    lockerServo.write(pos);
    delay(15);
  }

  // Đọc cảm biến sau khi servo mở
  bool doorClosed = (digitalRead(REED_PIN) == LOW); // tuỳ wiring
  if (doorClosed) {
    Serial.println("🧲 Cửa vẫn đang đóng theo cảm biến, kích lại solenoid hỗ trợ mở...");
    triggerSolenoid(300);
  }
  
  currentStatus = "open";
  setLEDStatus("open");
  sendStatusToFirebase("open");
  sendDoorSensorToFirebase();
  Serial.println("✅ Tủ đã mở!");
  
  // Tự động đóng sau 10 giây
  delay(10000);
  closeLocker();
}

// Hàm đóng tủ
void closeLocker() {
  Serial.println("🔒 Đang đóng tủ...");
  
  // Hiệu ứng LED khi đóng
  setLEDStatus("closing");
  
  // Xoay servo về 0 độ để đóng
  for (int pos = 90; pos >= 0; pos -= 1) {
    lockerServo.write(pos);
    delay(15);
  }

  // Đảm bảo solenoid tắt sau khi đóng
  digitalWrite(SOLENOID_PIN, LOW);

  // Kiểm tra reed xác nhận đã đóng
  bool doorClosed = (digitalRead(REED_PIN) == LOW);
  if (!doorClosed) {
    Serial.println("🧲 Cửa chưa đóng khít theo cảm biến, kích solenoid để chốt...");
    triggerSolenoid(200);
  }
  
  currentStatus = "closed";
  setLEDStatus("closed");
  sendStatusToFirebase("closed");
  sendDoorSensorToFirebase();
  Serial.println("✅ Tủ đã đóng!");
}

// Hàm gửi trạng thái lên Firebase
void sendStatusToFirebase(String status) {
  String path = "/" + String(LOCKER_ID) + "/current_status";
  
  if (Firebase.RTDB.setString(&fbdo, path, status)) {
    Serial.println("📤 Đã gửi trạng thái: " + status);
  } else {
    Serial.println("❌ Lỗi gửi trạng thái: " + fbdo.errorReason());
  }
  
  // Gửi thêm timestamp
  String timePath = "/" + String(LOCKER_ID) + "/last_update";
  String timestamp = String(millis());
  Firebase.RTDB.setString(&fbdo, timePath, timestamp);
}

// Gửi trạng thái cảm biến cửa lên Firebase (mở/đóng)
void sendDoorSensorToFirebase() {
  bool doorClosed = (digitalRead(REED_PIN) == LOW);
  String path = "/" + String(LOCKER_ID) + "/door_sensor";
  Firebase.RTDB.setString(&fbdo, path, doorClosed ? "closed" : "open");
}

// Hàm điều khiển LED theo trạng thái
void setLEDStatus(String status) {
  // Tắt tất cả LED trước
  digitalWrite(LED_RED_PIN, LOW);
  digitalWrite(LED_GREEN_PIN, LOW);
  
  if (status == "closed") {
    digitalWrite(LED_RED_PIN, HIGH);      // Đỏ - Tủ đóng
    digitalWrite(LED_GREEN_PIN, LOW);
    Serial.println("🔴 LED: Tủ đóng");
  }
  else if (status == "open") {
    digitalWrite(LED_RED_PIN, LOW);
    digitalWrite(LED_GREEN_PIN, HIGH);    // Xanh - Tủ mở
    Serial.println("🟢 LED: Tủ mở");
  }
  else if (status == "opening") {
    // Nhấp nháy xanh khi đang mở
    for (int i = 0; i < 3; i++) {
      digitalWrite(LED_GREEN_PIN, HIGH);
      delay(200);
      digitalWrite(LED_GREEN_PIN, LOW);
      delay(200);
    }
    Serial.println("🟡 LED: Đang mở tủ");
  }
  else if (status == "closing") {
    // Nhấp nháy đỏ khi đang đóng
    for (int i = 0; i < 3; i++) {
      digitalWrite(LED_RED_PIN, HIGH);
      delay(200);
      digitalWrite(LED_RED_PIN, LOW);
      delay(200);
    }
    Serial.println("🟡 LED: Đang đóng tủ");
  }
  else if (status == "disconnected") {
    // Nhấp nháy tất cả LED khi mất kết nối
    for (int i = 0; i < 5; i++) {
      digitalWrite(LED_RED_PIN, HIGH);
      digitalWrite(LED_GREEN_PIN, HIGH);
      digitalWrite(LED_BLUE_PIN, HIGH);
      delay(100);
      digitalWrite(LED_RED_PIN, LOW);
      digitalWrite(LED_GREEN_PIN, LOW);
      digitalWrite(LED_BLUE_PIN, LOW);
      delay(100);
    }
    Serial.println("⚠️ LED: Mất kết nối");
  }
}

// Hiệu ứng LED khởi động
void startupLEDEffect() {
  Serial.println("🎆 Hiệu ứng khởi động LED...");
  
  // Tắt tất cả LED
  digitalWrite(LED_RED_PIN, LOW);
  digitalWrite(LED_GREEN_PIN, LOW);
  digitalWrite(LED_BLUE_PIN, LOW);
  delay(500);
  
  // Bật từng LED theo thứ tự
  digitalWrite(LED_RED_PIN, HIGH);
  delay(300);
  digitalWrite(LED_GREEN_PIN, HIGH);
  delay(300);
  digitalWrite(LED_BLUE_PIN, HIGH);
  delay(500);
  
  // Nhấp nháy tất cả 3 lần
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_RED_PIN, LOW);
    digitalWrite(LED_GREEN_PIN, LOW);
    digitalWrite(LED_BLUE_PIN, LOW);
    delay(200);
    digitalWrite(LED_RED_PIN, HIGH);
    digitalWrite(LED_GREEN_PIN, HIGH);
    digitalWrite(LED_BLUE_PIN, HIGH);
    delay(200);
  }
  
  // Tắt tất cả
  digitalWrite(LED_RED_PIN, LOW);
  digitalWrite(LED_GREEN_PIN, LOW);
  digitalWrite(LED_BLUE_PIN, LOW);
  delay(300);
}

// Kích solenoid an toàn trong khoảng thời gian ms
void triggerSolenoid(unsigned int pulseMs) {
  if (pulseMs == 0) return;
  Serial.println("🔩 Kích solenoid...");
  digitalWrite(SOLENOID_PIN, HIGH);
  delay(pulseMs);
  digitalWrite(SOLENOID_PIN, LOW);
  Serial.println("🔩 Solenoid OFF");
}
