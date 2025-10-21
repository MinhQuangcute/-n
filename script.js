// Backend API client
const API = {
    async getStatus() {
        return await auth.apiFetch('/locker/status');
    },
    async command(action) {
        return await auth.apiFetch('/locker/command', {
            method: 'POST',
            body: JSON.stringify({ action })
        });
    }
};

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
    
    // Wait for auth
    await new Promise((r) => auth.onAuthReady(r));
    
    // Start polling backend
    startBackendPolling();
    
    // Update time every second
    setInterval(updateTime, 1000);
    
    // Check connection status
    setInterval(checkConnectionStatus, 5000);
});

// Backend polling listener
function startBackendPolling() {
    console.log('📡 Bắt đầu truy vấn backend...');
    const fetchAndUpdate = async () => {
        try {
            const data = await API.getStatus();
            updateLockerStatus({
                current_status: data.status,
                last_update: data.last_update
            });
            isConnected = true;
            updateConnectionStatus(true);
        } catch (error) {
            console.error('❌ Backend error:', error);
            isConnected = false;
            updateConnectionStatus(false);
            addActivityLog('Lỗi kết nối backend: ' + error.message, 'error');
        }
    };
    fetchAndUpdate();
    setInterval(fetchAndUpdate, 2000);
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

    if (!auth.isLoggedIn()) {
        alert('⚠️ Vui lòng đăng nhập trước khi điều khiển.');
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
    
    // Send command to backend
    API.command(action)
      .then(() => {
        console.log(`✅ Đã gửi lệnh ${action} thành công`);
        addActivityLog(`Gửi lệnh: ${action}`, 'user');
        setTimeout(() => { resetButtons(); }, 1500);
      })
      .catch((error) => {
        console.error('❌ Lỗi gửi lệnh:', error);
        alert('❌ Không thể gửi lệnh: ' + (error.message || 'Lỗi'));
        addActivityLog('Lỗi gửi lệnh: ' + error.message, 'error');
        resetButtons();
      });
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

// Remove Firebase debug
