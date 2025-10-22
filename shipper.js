// Shipper Mode JavaScript
// Gọi backend API thay vì Firebase trực tiếp

const BACKEND_BASE = 'http://localhost:3000';

// DOM elements
const startScanBtn = document.getElementById('startScanBtn');
const reservationForm = document.getElementById('reservationForm');
const loginSection = document.getElementById('loginSection');
const statusMessage = document.getElementById('statusMessage');
const reserveBtn = document.getElementById('reserveBtn');
const loginBtn = document.getElementById('loginBtn');

// Global variables
let authToken = null;
let currentLockerId = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Shipper mode initialized');
    
    // Check if user is already logged in
    checkAuthStatus();
    
    // Setup event listeners
    setupEventListeners();
});

function setupEventListeners() {
    // QR Scanner button
    startScanBtn.addEventListener('click', startQRScan);
    
    // Login button
    loginBtn.addEventListener('click', handleLogin);
    
    // Reservation form
    reservationForm.addEventListener('submit', handleReservation);
}

function checkAuthStatus() {
    const token = localStorage.getItem('shipper_token');
    if (token) {
        authToken = token;
        showReservationForm();
    } else {
        showLoginForm();
    }
}

function showLoginForm() {
    loginSection.style.display = 'block';
    reservationForm.style.display = 'none';
}

function showReservationForm() {
    loginSection.style.display = 'none';
    reservationForm.style.display = 'block';
}

async function handleLogin() {
    const username = document.getElementById('username').value.trim();
    
    if (!username) {
        showStatus('Vui lòng nhập tên đăng nhập', 'error');
        return;
    }

    try {
        const response = await fetch(`${BACKEND_BASE}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            localStorage.setItem('shipper_token', authToken);
            showStatus('Đăng nhập thành công!', 'success');
            showReservationForm();
        } else {
            showStatus(data.error || 'Đăng nhập thất bại', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showStatus('Lỗi kết nối server', 'error');
    }
}

function startQRScan() {
    // Simulate QR scanning (in real implementation, use a QR scanner library)
    showStatus('Đang quét QR code...', 'info');
    
    // Simulate scanning delay
    setTimeout(() => {
        // For demo purposes, use a mock locker ID
        const mockLockerId = 'Locker' + Math.floor(Math.random() * 10 + 1);
        handleQRScanResult(mockLockerId);
    }, 2000);
}

function handleQRScanResult(lockerId) {
    currentLockerId = lockerId;
    document.getElementById('lockerId').value = lockerId;
    showStatus(`Đã quét thành công! Mã tủ: ${lockerId}`, 'success');
}

async function handleReservation(event) {
    event.preventDefault();
    
    if (!authToken) {
        showStatus('Vui lòng đăng nhập trước', 'error');
        return;
    }

    const lockerId = document.getElementById('lockerId').value;
    const receiverPhone = document.getElementById('receiverPhone').value;

    if (!lockerId || !receiverPhone) {
        showStatus('Vui lòng điền đầy đủ thông tin', 'error');
        return;
    }

    // Validate phone number
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(receiverPhone)) {
        showStatus('Số điện thoại không hợp lệ', 'error');
        return;
    }

    try {
        reserveBtn.disabled = true;
        reserveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';

        const response = await fetch(`${BACKEND_BASE}/api/reserve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                lockerId,
                receiverPhone
            })
        });

        const data = await response.json();

        if (response.ok) {
            showStatus(
                `Đặt trước thành công! Mã đặt trước: ${data.reservationId}. 
                Tủ sẽ hết hạn vào: ${new Date(data.expiresAt).toLocaleString('vi-VN')}`, 
                'success'
            );
            
            // Reset form
            reservationForm.reset();
            currentLockerId = null;
        } else {
            showStatus(data.error || 'Đặt trước thất bại', 'error');
        }
    } catch (error) {
        console.error('Reservation error:', error);
        showStatus('Lỗi kết nối server', 'error');
    } finally {
        reserveBtn.disabled = false;
        reserveBtn.innerHTML = '<i class="fas fa-lock"></i> Đặt trước tủ khóa';
    }
}

function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message status-${type}`;
    statusMessage.style.display = 'block';
    
    // Auto hide after 5 seconds for success messages
    if (type === 'success') {
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 5000);
    }
}

// Logout function
function logout() {
    localStorage.removeItem('shipper_token');
    authToken = null;
    showLoginForm();
    showStatus('Đã đăng xuất', 'info');
}

// Add logout button functionality
document.addEventListener('DOMContentLoaded', function() {
    // Add logout button if user is logged in
    if (authToken) {
        const logoutBtn = document.createElement('button');
        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Đăng xuất';
        logoutBtn.className = 'btn';
        logoutBtn.style.background = '#dc3545';
        logoutBtn.style.marginTop = '10px';
        logoutBtn.onclick = logout;
        
        const container = document.querySelector('.shipper-container');
        container.appendChild(logoutBtn);
    }
});



