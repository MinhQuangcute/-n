// Node.js backend integration with JWT auth
import { login, logout, isAuthenticated, getCurrentUser, authFetch } from './auth.js';

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

    // Wire auth controls
    setupAuthUI();

    // Try fetch initial status if authenticated
    if (isAuthenticated()) {
        await refreshStatus();
        isConnected = true;
        updateConnectionStatus(true);
    } else {
        updateConnectionStatus(false);
    }
    
    // Update time every second
    setInterval(updateTime, 1000);
    
    // Check connection status
    setInterval(checkConnectionStatus, 5000);
});

// Backend: fetch current status
async function refreshStatus() {
    try {
        const res = await authFetch('/api/locker/status');
        if (!res.ok) throw new Error('Network error');
        const data = await res.json();
        updateLockerStatus(data);
    } catch (e) {
        console.error('❌ Lỗi tải trạng thái:', e);
        addActivityLog('Lỗi tải trạng thái: ' + e.message, 'error');
        isConnected = false;
        updateConnectionStatus(false);
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
async function controlLocker(action) {
    console.log(`🎮 Gửi lệnh: ${action}`);
    
    if (!isAuthenticated()) {
        alert('⚠️ Vui lòng đăng nhập để điều khiển tủ.');
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
    
    try {
        const res = await authFetch('/api/locker/command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Không thể gửi lệnh');
        }
        const data = await res.json();
        console.log(`✅ Đã gửi lệnh ${action} thành công`);
        addActivityLog(`Gửi lệnh: ${action}`, 'user');
        updateLockerStatus(data.status);
    } catch (error) {
        console.error('❌ Lỗi gửi lệnh:', error);
        alert('❌ ' + error.message);
        addActivityLog('Lỗi gửi lệnh: ' + error.message, 'error');
    } finally {
        // Reset button after 3 seconds
        setTimeout(() => {
            resetButtons();
        }, 3000);
    }
}

// Expose functions used by inline HTML handlers
window.controlLocker = controlLocker;

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
        connectionText.textContent = 'Đã kết nối server';
        wifiStatus.textContent = 'Kết nối server tốt';
        wifiStatus.style.color = '#2f855a';
    } else {
        connectionStatus.className = 'status-dot offline';
        connectionText.textContent = 'Mất kết nối server';
        wifiStatus.textContent = 'Mất kết nối server';
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
async function debugServer() {
    if (!isAuthenticated()) return;
    try {
        await refreshStatus();
        addActivityLog('Kết nối server thành công', 'success');
    } catch (e) {
        // already handled
    }
}
// Chạy debug sau 3 giây
setTimeout(debugServer, 3000);

function setupAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const usernameInput = document.getElementById('usernameInput');
    const passwordInput = document.getElementById('passwordInput');
    const currentUser = document.getElementById('currentUser');

    function renderAuth() {
        if (isAuthenticated()) {
            const user = getCurrentUser();
            currentUser.textContent = user ? `${user.username} (${user.role})` : 'Đã đăng nhập';
            logoutBtn.style.display = 'inline-block';
            usernameInput.style.display = 'none';
            passwordInput.style.display = 'none';
            loginBtn.style.display = 'none';
        } else {
            currentUser.textContent = '';
            logoutBtn.style.display = 'none';
            usernameInput.style.display = 'inline-block';
            passwordInput.style.display = 'inline-block';
            loginBtn.style.display = 'inline-block';
        }
    }

    renderAuth();

    loginBtn.addEventListener('click', async () => {
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        if (!username || !password) {
            alert('Vui lòng nhập tài khoản và mật khẩu');
            return;
        }
        try {
            await login(username, password);
            renderAuth();
            await refreshStatus();
            isConnected = true;
            updateConnectionStatus(true);
            addActivityLog('Đăng nhập thành công', 'success');
        } catch (e) {
            alert('Đăng nhập thất bại: ' + e.message);
        }
    });

    logoutBtn.addEventListener('click', () => {
        logout();
        renderAuth();
        isConnected = false;
        updateConnectionStatus(false);
        addActivityLog('Đã đăng xuất', 'system');
    });
}
