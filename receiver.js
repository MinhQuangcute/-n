// Receiver Mode JavaScript
// Gọi backend API thay vì Firebase trực tiếp

const BACKEND_BASE = 'http://localhost:3000';

// DOM elements
const startScanBtn = document.getElementById('startScanBtn');
const phoneForm = document.getElementById('phoneForm');
const requestOtpBtn = document.getElementById('requestOtpBtn');
const verifyOtpBtn = document.getElementById('verifyOtpBtn');
const resendOtpBtn = document.getElementById('resendOtpBtn');
const statusMessage = document.getElementById('statusMessage');

// Step elements
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const step3 = document.getElementById('step3');

// Global variables
let currentLockerId = null;
let currentPhone = null;
let otpExpiryTime = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Receiver mode initialized');
    setupEventListeners();
});

function setupEventListeners() {
    // QR Scanner button
    startScanBtn.addEventListener('click', startQRScan);
    
    // Phone form submission
    phoneForm.addEventListener('submit', handlePhoneSubmit);
    
    // OTP verification
    verifyOtpBtn.addEventListener('click', handleOtpVerification);
    
    // Resend OTP
    resendOtpBtn.addEventListener('click', handleResendOtp);
    
    // OTP input formatting
    const otpInput = document.getElementById('otp');
    otpInput.addEventListener('input', function(e) {
        // Only allow numbers
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });
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
    
    // Move to step 2
    step1.classList.remove('active');
    step1.classList.add('completed');
    step2.classList.add('active');
    
    showStatus(`Đã quét thành công! Mã tủ: ${lockerId}`, 'success');
}

async function handlePhoneSubmit(event) {
    event.preventDefault();
    
    const phone = document.getElementById('phone').value.trim();
    
    if (!phone) {
        showStatus('Vui lòng nhập số điện thoại', 'error');
        return;
    }

    // Validate phone number
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone)) {
        showStatus('Số điện thoại không hợp lệ', 'error');
        return;
    }

    currentPhone = phone;
    await requestOTP();
}

async function requestOTP() {
    try {
        requestOtpBtn.disabled = true;
        requestOtpBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi OTP...';

        const response = await fetch(`${BACKEND_BASE}/api/request-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                lockerId: currentLockerId,
                phone: currentPhone
            })
        });

        const data = await response.json();

        if (response.ok) {
            showStatus(
                `OTP đã được gửi đến số ${currentPhone}. 
                Mã có hiệu lực trong ${Math.floor(data.expiresIn / 60)} phút.`, 
                'success'
            );
            
            // Move to step 3
            step2.classList.remove('active');
            step2.classList.add('completed');
            step3.classList.add('active');
            step3.style.display = 'block';
            
            // Set expiry time
            otpExpiryTime = Date.now() + (data.expiresIn * 1000);
            
            // Focus on OTP input
            document.getElementById('otp').focus();
        } else {
            showStatus(data.error || 'Gửi OTP thất bại', 'error');
        }
    } catch (error) {
        console.error('Request OTP error:', error);
        showStatus('Lỗi kết nối server', 'error');
    } finally {
        requestOtpBtn.disabled = false;
        requestOtpBtn.innerHTML = '<i class="fas fa-sms"></i> Gửi mã OTP';
    }
}

async function handleOtpVerification() {
    const otp = document.getElementById('otp').value.trim();
    
    if (!otp || otp.length !== 6) {
        showStatus('Vui lòng nhập đầy đủ 6 chữ số OTP', 'error');
        return;
    }

    // Check if OTP is expired
    if (otpExpiryTime && Date.now() > otpExpiryTime) {
        showStatus('Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.', 'error');
        return;
    }

    try {
        verifyOtpBtn.disabled = true;
        verifyOtpBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xác thực...';

        const response = await fetch(`${BACKEND_BASE}/api/verify-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                lockerId: currentLockerId,
                phone: currentPhone,
                otp: otp
            })
        });

        const data = await response.json();

        if (response.ok) {
            showStatus(
                `Xác thực thành công! Tủ khóa sẽ mở trong giây lát. 
                Mã lệnh: ${data.commandId}`, 
                'success'
            );
            
            // Mark step 3 as completed
            step3.classList.remove('active');
            step3.classList.add('completed');
            
            // Show success message
            setTimeout(() => {
                showStatus('🎉 Lấy hàng thành công! Cảm ơn bạn đã sử dụng dịch vụ.', 'success');
            }, 2000);
            
        } else {
            showStatus(data.error || 'Xác thực OTP thất bại', 'error');
            
            // Clear OTP input on failure
            document.getElementById('otp').value = '';
        }
    } catch (error) {
        console.error('Verify OTP error:', error);
        showStatus('Lỗi kết nối server', 'error');
    } finally {
        verifyOtpBtn.disabled = false;
        verifyOtpBtn.innerHTML = '<i class="fas fa-check"></i> Xác thực OTP';
    }
}

async function handleResendOtp() {
    if (!currentLockerId || !currentPhone) {
        showStatus('Vui lòng quét QR và nhập số điện thoại trước', 'error');
        return;
    }

    await requestOTP();
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

// Reset function
function resetProcess() {
    currentLockerId = null;
    currentPhone = null;
    otpExpiryTime = null;
    
    // Reset steps
    step1.classList.remove('completed');
    step1.classList.add('active');
    step2.classList.remove('active', 'completed');
    step3.classList.remove('active', 'completed');
    step3.style.display = 'none';
    
    // Reset forms
    phoneForm.reset();
    document.getElementById('otp').value = '';
    
    showStatus('Đã reset quy trình. Bạn có thể bắt đầu lại.', 'info');
}

// Add reset button
document.addEventListener('DOMContentLoaded', function() {
    const resetBtn = document.createElement('button');
    resetBtn.innerHTML = '<i class="fas fa-redo"></i> Bắt đầu lại';
    resetBtn.className = 'btn';
    resetBtn.style.background = '#6c757d';
    resetBtn.style.marginTop = '10px';
    resetBtn.onclick = resetProcess;
    
    const container = document.querySelector('.receiver-container');
    container.appendChild(resetBtn);
});



