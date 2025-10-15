# 🔧 Hướng dẫn Debug Firebase

## 🚨 Vấn đề: Web không kết nối được Firebase

### 📋 **Bước 1: Kiểm tra Console Browser**

1. **Mở Developer Tools**:
   - Nhấn `F12` hoặc `Ctrl+Shift+I`
   - Chuyển sang tab **Console**

2. **Tìm lỗi**:
   - Tìm các dòng có biểu tượng ❌ hoặc 🔴
   - Copy lỗi và gửi cho tôi

### 📋 **Bước 2: Kiểm tra Firebase Config**

Mở file `script.js` và kiểm tra:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyBqfcOprdE5MT6m1yfXmRDtCzngtX86-7U",
    authDomain: "minhquang-36ee2.firebaseapp.com",
    databaseURL: "https://minhquang-36ee2-default-rtdb.firebaseio.com/",
    projectId: "minhquang-36ee2",
    storageBucket: "minhquang-36ee2.appspot.com",
    messagingSenderId: "123456789012",  // ⚠️ Cần thay đổi
    appId: "1:123456789012:web:abcdef1234567890"  // ⚠️ Cần thay đổi
};
```

### 📋 **Bước 3: Lấy Firebase Config đúng**

1. **Truy cập Firebase Console**:
   - Vào https://console.firebase.google.com/
   - Chọn project `minhquang-36ee2`

2. **Lấy Web App Config**:
   - Nhấn ⚙️ (Settings) → **Project settings**
   - Cuộn xuống **Your apps**
   - Nếu chưa có Web app, nhấn **Add app** → **Web**
   - Copy config object

3. **Cập nhật script.js**:
   - Thay thế `messagingSenderId` và `appId` bằng giá trị thật

### 📋 **Bước 4: Kiểm tra Firebase Rules**

1. **Vào Firebase Console**:
   - Chọn **Realtime Database**
   - Chuyển sang tab **Rules**

2. **Cập nhật Rules** (tạm thời cho test):
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

⚠️ **Cảnh báo**: Rules này cho phép mọi người đọc/ghi. Chỉ dùng để test!

### 📋 **Bước 5: Test kết nối**

1. **Mở web** và kiểm tra Console
2. **Tìm các thông báo**:
   - ✅ `Firebase đã khởi tạo thành công`
   - ✅ `Firebase đã kết nối`
   - ✅ `Kết nối Firebase thành công`

### 📋 **Bước 6: Test gửi dữ liệu**

1. **Mở Console** và chạy lệnh test:
```javascript
// Test gửi dữ liệu
firebase.database().ref('/test').set({
    message: 'Hello Firebase!',
    timestamp: Date.now()
}).then(() => {
    console.log('✅ Gửi dữ liệu thành công');
}).catch((error) => {
    console.error('❌ Lỗi gửi dữ liệu:', error);
});
```

2. **Kiểm tra Firebase Console**:
   - Vào **Realtime Database**
   - Xem có node `/test` không

## 🔍 **Các lỗi thường gặp**

### ❌ `Firebase: No Firebase App '[DEFAULT]' has been created`
**Nguyên nhân**: Firebase chưa được khởi tạo
**Giải pháp**: Kiểm tra Firebase config và thư viện

### ❌ `Firebase: Error (auth/network-request-failed)`
**Nguyên nhân**: Lỗi mạng hoặc config sai
**Giải pháp**: Kiểm tra internet và Firebase config

### ❌ `Firebase: Error (permission-denied)`
**Nguyên nhân**: Rules Firebase không cho phép
**Giải pháp**: Cập nhật Rules như Bước 4

### ❌ `Firebase: Error (invalid-api-key)`
**Nguyên nhân**: API Key sai
**Giải pháp**: Lấy lại API Key từ Firebase Console

## 🛠️ **Script Debug**

Thêm vào cuối file `script.js` để debug:

```javascript
// Debug function
function debugFirebase() {
    console.log('🔍 Debug Firebase...');
    console.log('Config:', firebaseConfig);
    console.log('App:', firebase.app());
    console.log('Database:', firebase.database());
    
    // Test connection
    firebase.database().ref('.info/connected').on('value', (snapshot) => {
        console.log('🔗 Connected:', snapshot.val());
    });
}

// Chạy debug
debugFirebase();
```

## 📞 **Cần hỗ trợ?**

Gửi cho tôi:
1. **Screenshot Console** (F12)
2. **Firebase Config** (ẩn API key)
3. **Firebase Rules** hiện tại
4. **Lỗi cụ thể** bạn gặp phải

Tôi sẽ giúp bạn khắc phục ngay! 🚀

