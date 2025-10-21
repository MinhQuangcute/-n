// QR Code Scanner JavaScript
// Switch to backend for commands and logging
let qrScanner = null;
let currentCamera = 'environment'; // 'environment' for back camera, 'user' for front camera
let flashEnabled = false;
let lastScannedData = null;

// Wait for Firebase to be ready
function waitForFirebase() {
    return new Promise((resolve) => {
        const checkFirebase = () => {
            if (window.database && window.ref && window.onValue && window.set && window.get && window.push) {
                database = window.database;
                ref = window.ref;
                onValue = window.onValue;
                set = window.set;
                get = window.get;
                push = window.push;
                console.log('✅ QR Scanner Firebase ready');
                resolve();
            } else {
                setTimeout(checkFirebase, 100);
            }
        };
        checkFirebase();
    });
}

// Initialize QR Scanner
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📱 QR Scanner initializing...');
    
    // Check if QR Scanner is supported
    if (!QrScanner.hasCamera()) {
        alert('❌ Camera không khả dụng trên thiết bị này!');
        return;
    }
    
    // Load QR activity history
    loadQRActivity();
    
    console.log('✅ QR Scanner ready');
});

// Start QR Scanner
async function startScanner() {
    try {
        const video = document.getElementById('qr-video');
        
        qrScanner = new QrScanner(
            video,
            result => {
                console.log('📱 QR Code detected:', result.data);
                handleQRResult(result.data);
            },
            {
                highlightScanRegion: true,
                highlightCodeOutline: true,
                preferredCamera: currentCamera
            }
        );
        
        await qrScanner.start();
        
        // Update UI
        document.getElementById('startBtn').style.display = 'none';
        document.getElementById('stopBtn').style.display = 'inline-block';
        
        console.log('✅ QR Scanner started');
        
    } catch (error) {
        console.error('❌ Error starting QR Scanner:', error);
        alert('❌ Không thể khởi động camera: ' + error.message);
    }
}

// Stop QR Scanner
function stopScanner() {
    if (qrScanner) {
        qrScanner.stop();
        qrScanner.destroy();
        qrScanner = null;
    }
    
    // Update UI
    document.getElementById('startBtn').style.display = 'inline-block';
    document.getElementById('stopBtn').style.display = 'none';
    
    console.log('✅ QR Scanner stopped');
}

// Switch camera
async function switchCamera() {
    if (qrScanner) {
        currentCamera = currentCamera === 'environment' ? 'user' : 'environment';
        
        try {
            await qrScanner.setCamera(currentCamera);
            console.log('✅ Camera switched to:', currentCamera);
        } catch (error) {
            console.error('❌ Error switching camera:', error);
        }
    }
}

// Toggle flash
function toggleFlash() {
    if (qrScanner) {
        flashEnabled = !flashEnabled;
        qrScanner.toggleFlash();
        
        const flashBtn = document.getElementById('flashBtn');
        if (flashEnabled) {
            flashBtn.innerHTML = '<i class="fas fa-flashlight"></i> Tắt Flash';
            flashBtn.classList.add('active');
        } else {
            flashBtn.innerHTML = '<i class="fas fa-flashlight"></i> Flash';
            flashBtn.classList.remove('active');
        }
    }
}

// Handle QR scan result
function handleQRResult(data) {
    lastScannedData = data;
    
    // Parse QR data
    const qrInfo = parseQRData(data);
    
    // Display results
    document.getElementById('scannedData').textContent = data;
    document.getElementById('scannedType').textContent = qrInfo.type;
    document.getElementById('scanTime').textContent = new Date().toLocaleString('vi-VN');
    
    // Show results section
    document.getElementById('scanResults').style.display = 'block';
    
    // Log activity via backend
    window.Backend.postAnalyticsActivity({
      action: 'QR Code scanned',
      data: data,
      type: qrInfo.type,
      timestamp: Date.now(),
      user: 'scanner'
    }).catch(() => {});
    
    // Auto-process if it's a valid access code
    if (qrInfo.type === 'access' || qrInfo.type === 'user') {
        setTimeout(() => {
            processQRCode();
        }, 1000);
    }
}

// Parse QR data to determine type
function parseQRData(data) {
    if (data.startsWith('LOCKER_ACCESS_')) {
        return { type: 'Mã truy cập', valid: true };
    } else if (data.startsWith('USER_')) {
        return { type: 'Mã người dùng', valid: true };
    } else if (data.startsWith('ADMIN_')) {
        return { type: 'Mã admin', valid: true };
    } else if (data.startsWith('GUEST_')) {
        return { type: 'Mã khách', valid: true };
    } else if (data.startsWith('http://') || data.startsWith('https://')) {
        return { type: 'URL', valid: false };
    } else {
        return { type: 'Dữ liệu khác', valid: false };
    }
}

// Process QR Code
function processQRCode() {
    if (!lastScannedData) return;
    
    const qrInfo = parseQRData(lastScannedData);
    
    if (!qrInfo.valid) {
        alert('❌ QR Code không hợp lệ cho hệ thống tủ khóa!');
        return;
    }
    
    // Show access control
    showAccessControl(qrInfo);
    
    // Log processing
    window.Backend.postAnalyticsActivity({
      action: 'QR Code processed',
      data: lastScannedData,
      type: qrInfo.type,
      timestamp: Date.now(),
      user: 'system'
    }).catch(() => {});
}

// Show access control interface
function showAccessControl(qrInfo) {
    // Mock user info based on QR type
    const userInfo = getUserInfoFromQR(qrInfo.type);
    
    document.getElementById('userName').textContent = userInfo.name;
    document.getElementById('userRole').textContent = userInfo.role;
    document.getElementById('userPermissions').textContent = userInfo.permissions;
    
    document.getElementById('accessControl').style.display = 'block';
}

// Get user info from QR type
function getUserInfoFromQR(type) {
    const userInfo = {
        'Mã truy cập': {
            name: 'Người dùng thường',
            role: 'User',
            permissions: 'Mở/đóng tủ'
        },
        'Mã người dùng': {
            name: 'Người dùng đã đăng ký',
            role: 'Registered User',
            permissions: 'Mở/đóng tủ, Xem lịch sử'
        },
        'Mã admin': {
            name: 'Quản trị viên',
            role: 'Administrator',
            permissions: 'Toàn quyền hệ thống'
        },
        'Mã khách': {
            name: 'Khách mời',
            role: 'Guest',
            permissions: 'Mở tủ 1 lần'
        }
    };
    
    return userInfo[type] || userInfo['Mã truy cập'];
}

// Grant access
function grantAccess() {
    console.log('✅ Access granted for:', lastScannedData);
    
    // Send command to open locker
    window.Backend.commandLocker('open')
      .then(() => {
        console.log('✅ Locker access granted');
        alert('✅ Đã cấp quyền truy cập! Tủ sẽ mở trong giây lát.');
        window.Backend.postAnalyticsActivity({
          action: 'Access granted',
          data: lastScannedData,
          timestamp: Date.now(),
          user: 'admin'
        }).catch(() => {});
      })
      .catch(error => {
        console.error('❌ Error granting access:', error);
        alert('❌ Lỗi khi cấp quyền truy cập!');
      });
    
    // Hide access control
    document.getElementById('accessControl').style.display = 'none';
}

// Deny access
function denyAccess() {
    console.log('❌ Access denied for:', lastScannedData);
    
    alert('❌ Quyền truy cập đã bị từ chối!');
    
    // Log access denied
    window.Backend.postAnalyticsActivity({
      action: 'Access denied',
      data: lastScannedData,
      timestamp: Date.now(),
      user: 'admin'
    }).catch(() => {});
    
    // Hide access control
    document.getElementById('accessControl').style.display = 'none';
}

// Generate QR Code
function generateQR() {
    const data = document.getElementById('qrData').value;
    const type = document.getElementById('qrType').value;
    
    if (!data.trim()) {
        alert('❌ Vui lòng nhập dữ liệu QR Code!');
        return;
    }
    
    // Create QR Code using a simple method (in real app, use a proper QR library)
    const qrDisplay = document.getElementById('qrDisplay');
    
    // Generate QR code data URL (simplified)
    const qrData = generateQRDataURL(data);
    
    qrDisplay.innerHTML = `
        <div class="qr-code">
            <img src="${qrData}" alt="QR Code" />
            <div class="qr-info">
                <p><strong>Dữ liệu:</strong> ${data}</p>
                <p><strong>Loại:</strong> ${type}</p>
                <p><strong>Thời gian tạo:</strong> ${new Date().toLocaleString('vi-VN')}</p>
            </div>
            <button onclick="downloadQR()" class="btn btn-download">
                <i class="fas fa-download"></i> Tải xuống
            </button>
        </div>
    `;
    
    // Log QR generation
    logQRActivity({
        action: 'QR Code generated',
        data: data,
        type: type,
        timestamp: Date.now(),
        user: 'admin'
    });
}

// Generate QR Code data URL (simplified)
function generateQRDataURL(data) {
    // This is a simplified version. In a real app, use a proper QR code library
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 200;
    
    // Draw a simple pattern (replace with actual QR code generation)
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = '#fff';
    ctx.fillRect(20, 20, 160, 160);
    ctx.fillStyle = '#000';
    ctx.fillRect(40, 40, 120, 120);
    
    // Add text
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('QR Code', 100, 100);
    ctx.fillText(data.substring(0, 10), 100, 120);
    
    return canvas.toDataURL();
}

// Download QR Code
function downloadQR() {
    const qrImg = document.querySelector('.qr-code img');
    if (qrImg) {
        const link = document.createElement('a');
        link.href = qrImg.src;
        link.download = `qr-code-${Date.now()}.png`;
        link.click();
    }
}

// Clear scan results
function clearResults() {
    document.getElementById('scanResults').style.display = 'none';
    document.getElementById('accessControl').style.display = 'none';
    lastScannedData = null;
}

// Go back to main page
function goBack() {
    if (qrScanner) {
        stopScanner();
    }
    window.location.href = 'index.html';
}

// Log QR activity
function logQRActivity(activity) {
    if (database && push) {
        const activityRef = ref(database, '/analytics/qr_activity');
        push(activityRef, activity);
    }
}

// Load QR activity history
async function loadQRActivity() {
  try {
    const acts = await window.Backend.getAnalyticsActivity();
    updateQRActivityList(acts);
  } catch (_) {}
}

// Update QR activity list
function updateQRActivityList(activities) {
    const activityList = document.getElementById('qrActivityList');
    activityList.innerHTML = '';
    
    // Sort activities by timestamp
    const sortedActivities = Object.values(activities).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    // Show last 10 activities
    sortedActivities.slice(0, 10).forEach(activity => {
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        
        const time = new Date(activity.timestamp).toLocaleString('vi-VN');
        const icon = getQRActivityIcon(activity.action);
        
        activityItem.innerHTML = `
            <span class="time">${time}</span>
            <span class="action">${icon} ${activity.action}</span>
            <span class="data">${activity.data ? activity.data.substring(0, 20) + '...' : ''}</span>
        `;
        
        activityList.appendChild(activityItem);
    });
}

// Get QR activity icon
function getQRActivityIcon(action) {
    switch(action) {
        case 'QR Code scanned': return '📱';
        case 'QR Code processed': return '⚙️';
        case 'Access granted': return '✅';
        case 'Access denied': return '❌';
        case 'QR Code generated': return '🎨';
        default: return 'ℹ️';
    }
}

// Handle page visibility change
document.addEventListener('visibilitychange', function() {
    if (document.hidden && qrScanner) {
        stopScanner();
    }
});

// Handle page unload
window.addEventListener('beforeunload', function() {
    if (qrScanner) {
        stopScanner();
    }
});

