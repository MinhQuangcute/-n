// Firebase v12 - Database functions are imported in HTML
// Wait for Firebase to be initialized
let database, ref, onValue, set, get;

// Wait for Firebase to be ready
function waitForFirebase() {
    return new Promise((resolve) => {
        const checkFirebase = () => {
            if (window.database && window.ref && window.onValue && window.set && window.get) {
                database = window.database;
                ref = window.ref;
                onValue = window.onValue;
                set = window.set;
                get = window.get;
                console.log('✅ Firebase v12 đã sẵn sàng');
                resolve();
            } else {
                setTimeout(checkFirebase, 100);
            }
        };
        checkFirebase();
    });
}

// Global variables
let isConnected = false;
let currentLockerStatus = 'closed';
let lastUpdateTime = null;

// DOM elements
const connectionStatus = document.getElementById('connectionStatus');
const connectionText = document.getElementById('connectionText');
const lockerStatus = document.getElementById('lockerStatus');
const lastUpdate = document.getElementById('lastUpdate');
const wifiStatus = document.getElementById('wifiStatus');
const activityList = document.getElementById('activityList');
const openBtn = document.getElementById('openBtn');
const closeBtn = document.getElementById('closeBtn');

// Initialize the app
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Hệ thống tủ khóa đã khởi động');
    
    // Add initial activity log
    addActivityLog('Hệ thống khởi động', 'system');
    
    // Wait for Firebase to be ready
    await waitForFirebase();
    
    // Start listening to Firebase
    startFirebaseListener();
    
    // Update time every second
    setInterval(updateTime, 1000);
    
    // Check connection status
    setInterval(checkConnectionStatus, 5000);
});

// Firebase listener
function startFirebaseListener() {
    console.log('📡 Bắt đầu lắng nghe Firebase...');
    
    try {
        // Listen to locker status changes
        const lockerRef = ref(database, '/Locker1');
        
        onValue(lockerRef, (snapshot) => {
            const data = snapshot.val();
            console.log('📨 Nhận dữ liệu từ Firebase:', data);
            if (data) {
                updateLockerStatus(data);
                isConnected = true;
                updateConnectionStatus(true);
                addActivityLog('Kết nối Firebase thành công', 'success');
            } else {
                console.log('⚠️ Không có dữ liệu từ Firebase');
                addActivityLog('Không có dữ liệu từ Firebase', 'error');
            }
        }, (error) => {
            console.error('❌ Lỗi Firebase:', error);
            isConnected = false;
            updateConnectionStatus(false);
            addActivityLog('Lỗi kết nối Firebase: ' + error.message, 'error');
        });
        
        // Test connection
        const connectedRef = ref(database, '.info/connected');
        onValue(connectedRef, (snapshot) => {
            const connected = snapshot.val();
            console.log('🔗 Trạng thái kết nối Firebase:', connected);
            if (connected) {
                addActivityLog('Firebase đã kết nối', 'success');
            } else {
                addActivityLog('Firebase mất kết nối', 'error');
            }
        });
        
        // Listen to status changes specifically
        const statusRef = ref(database, '/Locker1/status');
        onValue(statusRef, (snapshot) => {
            const status = snapshot.val();
            if (status && status !== currentLockerStatus) {
                console.log('📨 Nhận lệnh mới:', status);
                addActivityLog(`Nhận lệnh: ${status}`, 'command');
            }
        });
        
    } catch (error) {
        console.error('❌ Lỗi khởi tạo listener:', error);
        addActivityLog('Lỗi khởi tạo listener: ' + error.message, 'error');
    }
}

// Update locker status display
function updateLockerStatus(data) {
    const currentStatus = data.current_status || 'closed';
    const lastUpdate = data.last_update || Date.now();
    
    currentLockerStatus = currentStatus;
    lastUpdateTime = new Date(parseInt(lastUpdate));
    
    // Update status display
    const statusElement = lockerStatus.querySelector('.status-text');
    const statusIcon = lockerStatus.querySelector('.status-icon');
    
    lockerStatus.className = 'locker-status ' + currentStatus;
    
    switch(currentStatus) {
        case 'open':
            statusElement.textContent = 'Mở';
            statusIcon.textContent = '🔓';
            break;
        case 'closed':
            statusElement.textContent = 'Đóng';
            statusIcon.textContent = '🔒';
            break;
        case 'opening':
            statusElement.textContent = 'Đang mở...';
            statusIcon.textContent = '🔄';
            break;
        case 'closing':
            statusElement.textContent = 'Đang đóng...';
            statusIcon.textContent = '🔄';
            break;
    }
    
    // Update buttons
    updateButtonStates(currentStatus);
    
    // Update last update time
    updateLastUpdateTime();
}

// Update button states
function updateButtonStates(status) {
    if (status === 'opening' || status === 'closing') {
        openBtn.disabled = true;
        closeBtn.disabled = true;
    } else {
        openBtn.disabled = false;
        closeBtn.disabled = false;
    }
}

// Control locker function
function controlLocker(action) {
    console.log(`🎮 Gửi lệnh: ${action}`);
    
    // Check if Firebase is ready
    if (!database || !ref || !set) {
        console.error('❌ Firebase chưa sẵn sàng');
        alert('⚠️ Firebase chưa sẵn sàng! Vui lòng đợi và thử lại.');
        addActivityLog('Firebase chưa sẵn sàng', 'error');
        return;
    }
    
    // Show loading state
    if (action === 'open') {
        openBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
        openBtn.disabled = true;
    } else {
        closeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
        closeBtn.disabled = true;
    }
    
    // Send command to Firebase
    try {
        const statusRef = ref(database, '/Locker1/status');
        set(statusRef, action)
            .then(() => {
                console.log(`✅ Đã gửi lệnh ${action} thành công`);
                addActivityLog(`Gửi lệnh: ${action}`, 'user');
                
                // Reset button after 3 seconds
                setTimeout(() => {
                    resetButtons();
                }, 3000);
            })
            .catch((error) => {
                console.error('❌ Lỗi gửi lệnh:', error);
                let errorMessage = 'Không thể gửi lệnh!';
                
                if (error.code === 'PERMISSION_DENIED') {
                    errorMessage = 'Lỗi quyền truy cập! Kiểm tra Firebase Rules.';
                } else if (error.code === 'NETWORK_ERROR') {
                    errorMessage = 'Lỗi mạng! Kiểm tra kết nối internet.';
                } else if (error.code === 'UNAVAILABLE') {
                    errorMessage = 'Firebase không khả dụng! Thử lại sau.';
                }
                
                alert('❌ ' + errorMessage);
                addActivityLog('Lỗi gửi lệnh: ' + error.message, 'error');
                resetButtons();
            });
    } catch (error) {
        console.error('❌ Lỗi khởi tạo gửi lệnh:', error);
        alert('❌ Lỗi khởi tạo gửi lệnh! Vui lòng thử lại.');
        addActivityLog('Lỗi khởi tạo gửi lệnh: ' + error.message, 'error');
        resetButtons();
    }
}

// Reset buttons
function resetButtons() {
    openBtn.innerHTML = '<i class="fas fa-unlock"></i> Mở Tủ';
    closeBtn.innerHTML = '<i class="fas fa-lock"></i> Đóng Tủ';
    openBtn.disabled = false;
    closeBtn.disabled = false;
}

// Update connection status
function updateConnectionStatus(connected) {
    if (connected) {
        connectionStatus.className = 'status-dot online';
        connectionText.textContent = 'Đã kết nối';
        wifiStatus.textContent = 'Kết nối tốt';
        wifiStatus.style.color = '#2f855a';
    } else {
        connectionStatus.className = 'status-dot offline';
        connectionText.textContent = 'Mất kết nối';
        wifiStatus.textContent = 'Mất kết nối';
        wifiStatus.style.color = '#c53030';
    }
}

// Check connection status
function checkConnectionStatus() {
    const connected = navigator.onLine && isConnected;
    updateConnectionStatus(connected);
}

// Add activity log
function addActivityLog(message, type = 'info') {
    const now = new Date();
    const timeString = now.toLocaleTimeString('vi-VN');
    
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    
    const icon = getActivityIcon(type);
    activityItem.innerHTML = `
        <span class="time">${timeString}</span>
        <span class="action">${icon} ${message}</span>
    `;
    
    // Add to top of list
    activityList.insertBefore(activityItem, activityList.firstChild);
    
    // Keep only last 20 items
    while (activityList.children.length > 20) {
        activityList.removeChild(activityList.lastChild);
    }
}

// Get activity icon
function getActivityIcon(type) {
    switch(type) {
        case 'user': return '👤';
        case 'command': return '📨';
        case 'system': return '⚙️';
        case 'error': return '❌';
        case 'success': return '✅';
        default: return 'ℹ️';
    }
}

// Update time display
function updateTime() {
    if (lastUpdateTime) {
        const now = new Date();
        const diff = Math.floor((now - lastUpdateTime) / 1000);
        
        if (diff < 60) {
            lastUpdate.textContent = `${diff}s trước`;
        } else if (diff < 3600) {
            lastUpdate.textContent = `${Math.floor(diff / 60)}m trước`;
        } else {
            lastUpdate.textContent = lastUpdateTime.toLocaleTimeString('vi-VN');
        }
    }
}

// Update last update time
function updateLastUpdateTime() {
    if (lastUpdateTime) {
        lastUpdate.textContent = lastUpdateTime.toLocaleTimeString('vi-VN');
    }
}

// Handle online/offline events
window.addEventListener('online', () => {
    console.log('🌐 Kết nối internet đã được khôi phục');
    addActivityLog('Kết nối internet đã được khôi phục', 'success');
});

window.addEventListener('offline', () => {
    console.log('🌐 Mất kết nối internet');
    addActivityLog('Mất kết nối internet', 'error');
    updateConnectionStatus(false);
});

// Settings functions
document.getElementById('autoCloseTime').addEventListener('change', function() {
    const value = this.value;
    console.log(`⚙️ Thời gian tự đóng: ${value}s`);
    addActivityLog(`Cập nhật thời gian tự đóng: ${value}s`, 'system');
});

document.getElementById('checkInterval').addEventListener('change', function() {
    const value = this.value;
    console.log(`⚙️ Tần suất kiểm tra: ${value}s`);
    addActivityLog(`Cập nhật tần suất kiểm tra: ${value}s`, 'system');
});

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    if (event.ctrlKey || event.metaKey) {
        switch(event.key) {
            case 'o':
                event.preventDefault();
                if (!openBtn.disabled) controlLocker('open');
                break;
            case 'c':
                event.preventDefault();
                if (!closeBtn.disabled) controlLocker('close');
                break;
        }
    }
});

// Add keyboard shortcut info
addActivityLog('Phím tắt: Ctrl+O (Mở), Ctrl+C (Đóng)', 'system');

// Debug function
function debugFirebase() {
    console.log('🔍 Debug Firebase...');
    console.log('Database:', database);
    console.log('Ref function:', ref);
    console.log('Set function:', set);
    console.log('OnValue function:', onValue);
    
    // Test simple write
    try {
        const debugRef = ref(database, '/debug');
        set(debugRef, { 
            test: true, 
            time: Date.now(),
            message: 'Debug test from web'
        })
        .then(() => {
            console.log('✅ Debug write OK');
            addActivityLog('Debug write thành công', 'success');
        })
        .catch(err => {
            console.error('❌ Debug write failed:', err);
            addActivityLog('Debug write thất bại: ' + err.message, 'error');
        });
    } catch (error) {
        console.error('❌ Debug error:', error);
        addActivityLog('Debug error: ' + error.message, 'error');
    }
}

// Chạy debug sau 3 giây
setTimeout(debugFirebase, 3000);
