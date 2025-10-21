// QR Code Scanner JavaScript with backend
import { isAuthenticated, authFetch } from './auth.js';

let qrScanner = null;
let currentCamera = 'environment';
let flashEnabled = false;
let lastScannedData = null;

// Initialize QR Scanner page
document.addEventListener('DOMContentLoaded', async function () {
  console.log('📱 QR Scanner initializing...');
  if (!QrScanner.hasCamera()) {
    alert('❌ Camera không khả dụng trên thiết bị này!');
    return;
  }
  loadQRActivity();
  console.log('✅ QR Scanner ready');
});

async function startScanner() {
  try {
    const video = document.getElementById('qr-video');
    qrScanner = new QrScanner(
      video,
      (result) => {
        console.log('📱 QR Code detected:', result.data);
        handleQRResult(result.data);
      },
      { highlightScanRegion: true, highlightCodeOutline: true, preferredCamera: currentCamera }
    );
    await qrScanner.start();
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('stopBtn').style.display = 'inline-block';
    console.log('✅ QR Scanner started');
  } catch (error) {
    console.error('❌ Error starting QR Scanner:', error);
    alert('❌ Không thể khởi động camera: ' + error.message);
  }
}

function stopScanner() {
  if (qrScanner) {
    qrScanner.stop();
    qrScanner.destroy();
    qrScanner = null;
  }
  document.getElementById('startBtn').style.display = 'inline-block';
  document.getElementById('stopBtn').style.display = 'none';
  console.log('✅ QR Scanner stopped');
}

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

function handleQRResult(data) {
  lastScannedData = data;
  const qrInfo = parseQRData(data);
  document.getElementById('scannedData').textContent = data;
  document.getElementById('scannedType').textContent = qrInfo.type;
  document.getElementById('scanTime').textContent = new Date().toLocaleString('vi-VN');
  document.getElementById('scanResults').style.display = 'block';
  logQRActivity({ action: 'QR Code scanned', data, type: qrInfo.type });
  if (qrInfo.type === 'Mã truy cập' || qrInfo.type === 'Mã người dùng') {
    setTimeout(() => processQRCode(), 1000);
  }
}

function parseQRData(data) {
  if (data.startsWith('LOCKER_ACCESS_')) return { type: 'Mã truy cập', valid: true };
  if (data.startsWith('USER_')) return { type: 'Mã người dùng', valid: true };
  if (data.startsWith('ADMIN_')) return { type: 'Mã admin', valid: true };
  if (data.startsWith('GUEST_')) return { type: 'Mã khách', valid: true };
  if (data.startsWith('http://') || data.startsWith('https://')) return { type: 'URL', valid: false };
  return { type: 'Dữ liệu khác', valid: false };
}

function processQRCode() {
  if (!lastScannedData) return;
  const qrInfo = parseQRData(lastScannedData);
  if (!qrInfo.valid) {
    alert('❌ QR Code không hợp lệ cho hệ thống tủ khóa!');
    return;
  }
  showAccessControl(qrInfo);
  logQRActivity({ action: 'QR Code processed', data: lastScannedData, type: qrInfo.type });
}

function showAccessControl(qrInfo) {
  const userInfo = getUserInfoFromQR(qrInfo.type);
  document.getElementById('userName').textContent = userInfo.name;
  document.getElementById('userRole').textContent = userInfo.role;
  document.getElementById('userPermissions').textContent = userInfo.permissions;
  document.getElementById('accessControl').style.display = 'block';
}

function getUserInfoFromQR(type) {
  const userInfo = {
    'Mã truy cập': { name: 'Người dùng thường', role: 'User', permissions: 'Mở/đóng tủ' },
    'Mã người dùng': { name: 'Người dùng đã đăng ký', role: 'Registered User', permissions: 'Mở/đóng tủ, Xem lịch sử' },
    'Mã admin': { name: 'Quản trị viên', role: 'Administrator', permissions: 'Toàn quyền hệ thống' },
    'Mã khách': { name: 'Khách mời', role: 'Guest', permissions: 'Mở tủ 1 lần' },
  };
  return userInfo[type] || userInfo['Mã truy cập'];
}

async function grantAccess() {
  console.log('✅ Access granted for:', lastScannedData);
  if (!isAuthenticated()) {
    alert('Vui lòng đăng nhập để cấp quyền.');
    return;
  }
  try {
    const res = await authFetch('/api/qr/grant', { method: 'POST' });
    if (!res.ok) throw new Error('Không thể cấp quyền');
    alert('✅ Đã cấp quyền truy cập! Tủ sẽ mở trong giây lát.');
    logQRActivity({ action: 'Access granted', data: lastScannedData });
  } catch (e) {
    console.error('❌ Error granting access:', e);
    alert('❌ Lỗi khi cấp quyền truy cập!');
  }
  document.getElementById('accessControl').style.display = 'none';
}

function denyAccess() {
  console.log('❌ Access denied for:', lastScannedData);
  alert('❌ Quyền truy cập đã bị từ chối!');
  logQRActivity({ action: 'Access denied', data: lastScannedData });
  document.getElementById('accessControl').style.display = 'none';
}

function generateQR() {
  const data = document.getElementById('qrData').value;
  const type = document.getElementById('qrType').value;
  if (!data.trim()) {
    alert('❌ Vui lòng nhập dữ liệu QR Code!');
    return;
  }
  const qrDisplay = document.getElementById('qrDisplay');
  const qrDataURL = generateQRDataURL(data);
  qrDisplay.innerHTML = `
    <div class="qr-code">
      <img src="${qrDataURL}" alt="QR Code" />
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
  logQRActivity({ action: 'QR Code generated', data, type });
}

function generateQRDataURL(data) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 200;
  canvas.height = 200;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 200, 200);
  ctx.fillStyle = '#fff';
  ctx.fillRect(20, 20, 160, 160);
  ctx.fillStyle = '#000';
  ctx.fillRect(40, 40, 120, 120);
  ctx.fillStyle = '#fff';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('QR Code', 100, 100);
  ctx.fillText(data.substring(0, 10), 100, 120);
  return canvas.toDataURL();
}

function downloadQR() {
  const qrImg = document.querySelector('.qr-code img');
  if (qrImg) {
    const link = document.createElement('a');
    link.href = qrImg.src;
    link.download = `qr-code-${Date.now()}.png`;
    link.click();
  }
}

function clearResults() {
  document.getElementById('scanResults').style.display = 'none';
  document.getElementById('accessControl').style.display = 'none';
  lastScannedData = null;
}

function goBack() {
  if (qrScanner) stopScanner();
  window.location.href = 'index.html';
}

async function logQRActivity(activity) {
  try {
    if (!isAuthenticated()) return;
    await authFetch('/api/qr/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...activity, timestamp: Date.now(), user: 'client' }),
    });
  } catch {}
}

async function loadQRActivity() {
  try {
    if (!isAuthenticated()) return;
    const res = await authFetch('/api/qr/activity');
    if (!res.ok) return;
    const activities = await res.json();
    updateQRActivityList(activities);
  } catch {}
}

function updateQRActivityList(activitiesArray) {
  const activityList = document.getElementById('qrActivityList');
  activityList.innerHTML = '';
  const items = activitiesArray.slice(0, 10);
  items.forEach((activity) => {
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

function getQRActivityIcon(action) {
  switch (action) {
    case 'QR Code scanned':
      return '📱';
    case 'QR Code processed':
      return '⚙️';
    case 'Access granted':
      return '✅';
    case 'Access denied':
      return '❌';
    case 'QR Code generated':
      return '🎨';
    default:
      return 'ℹ️';
  }
}

// Expose functions for inline handlers in HTML
window.startScanner = startScanner;
window.stopScanner = stopScanner;
window.switchCamera = switchCamera;
window.toggleFlash = toggleFlash;
window.processQRCode = processQRCode;
window.generateQR = generateQR;
window.downloadQR = downloadQR;
window.clearResults = clearResults;
window.goBack = goBack;
window.grantAccess = grantAccess;
window.denyAccess = denyAccess;
