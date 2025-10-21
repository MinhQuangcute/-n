// Dashboard Analytics JavaScript with backend APIs
import { login, logout, isAuthenticated, getCurrentUser, authFetch } from './auth.js';

let usageChart, statusChart, peakChart, userChart;
let analyticsData = {
  totalOpens: 0,
  totalCloses: 0,
  avgUsageTime: 0,
  activeUsers: 0,
  systemErrors: 0,
  hourlyUsage: {},
  statusDistribution: { open: 0, closed: 0, opening: 0, closing: 0 },
  peakHours: {},
  userActivity: [],
};

let isConnected = false;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async function () {
  console.log('📊 Dashboard initializing...');
  setupAuthUI();

  // Initialize charts
  initializeCharts();

  // Load data from backend
  if (isAuthenticated()) {
    await loadFromBackend();
    isConnected = true;
    updateSystemStatus();
  }

  // Update UI every 30 seconds
  setInterval(updateDashboard, 30000);

  console.log('✅ Dashboard ready');
});

async function loadFromBackend() {
  try {
    const [statusRes, analyticsRes, activityRes] = await Promise.all([
      authFetch('/api/locker/status'),
      authFetch('/api/analytics'),
      authFetch('/api/activity'),
    ]);
    if (statusRes.ok) {
      const status = await statusRes.json();
      updateAnalytics(status);
    }
    if (analyticsRes.ok) {
      const a = await analyticsRes.json();
      analyticsData.hourlyUsage = a.hourlyUsage || {};
      analyticsData.statusDistribution = a.statusDistribution || analyticsData.statusDistribution;
      analyticsData.totalOpens = (a.stats && a.stats.totalOpens) || analyticsData.totalOpens;
      analyticsData.activeUsers = (a.stats && a.stats.activeUsers) || analyticsData.activeUsers;
      analyticsData.systemErrors = (a.stats && a.stats.systemErrors) || analyticsData.systemErrors;
      analyticsData.peakHours = a.peakHours || {};
    }
    if (activityRes.ok) {
      const activities = await activityRes.json();
      const map = {};
      activities.forEach((item) => (map[item.id || Math.random()] = item));
      updateRecentActivity(map);
    }
    updateDashboard();
  } catch (e) {
    console.error('Failed to load backend data', e);
  }
}

// Initialize all charts
function initializeCharts() {
  // Usage Chart
  const usageCtx = document.getElementById('usageChart').getContext('2d');
  usageChart = new Chart(usageCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Lần mở/giờ',
          data: [],
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });

  // Status Distribution Chart
  const statusCtx = document.getElementById('statusChart').getContext('2d');
  statusChart = new Chart(statusCtx, {
    type: 'doughnut',
    data: {
      labels: ['Mở', 'Đóng', 'Đang mở', 'Đang đóng'],
      datasets: [
        {
          data: [0, 0, 0, 0],
          backgroundColor: ['#48bb78', '#f56565', '#ed8936', '#ed8936'],
        },
      ],
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
  });

  // Peak Hours Chart
  const peakCtx = document.getElementById('peakChart').getContext('2d');
  peakChart = new Chart(peakCtx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Sử dụng',
          data: [],
          backgroundColor: '#667eea',
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });

  // User Activity Chart
  const userCtx = document.getElementById('userChart').getContext('2d');
  userChart = new Chart(userCtx, {
    type: 'area',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Hoạt động',
          data: [],
          borderColor: '#48bb78',
          backgroundColor: 'rgba(72, 187, 120, 0.1)',
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

// Update analytics data
function updateAnalytics(data) {
  const currentStatus = data.current_status || 'closed';
  const hour = new Date().getHours();

  analyticsData.statusDistribution[currentStatus] = (analyticsData.statusDistribution[currentStatus] || 0) + 1;
  analyticsData.hourlyUsage[hour] = (analyticsData.hourlyUsage[hour] || 0) + 1;
  analyticsData.peakHours[hour] = (analyticsData.peakHours[hour] || 0) + 1;

  updateDashboard();
}

// Update dashboard display
function updateDashboard() {
  document.getElementById('totalOpens').textContent = analyticsData.totalOpens;
  document.getElementById('avgUsageTime').textContent = analyticsData.avgUsageTime + 'm';
  document.getElementById('activeUsers').textContent = analyticsData.activeUsers;
  document.getElementById('systemErrors').textContent = analyticsData.systemErrors;

  updateUsageChart();
  updateStatusChart();
  updatePeakChart();
  updateUserChart();

  updateSystemStatus();
}

// Update usage chart
function updateUsageChart() {
  const timeRange = document.getElementById('timeRange').value;
  const hours = [];
  const data = [];

  if (timeRange === '24h') {
    for (let i = 0; i < 24; i++) {
      hours.push(i + ':00');
      data.push(analyticsData.hourlyUsage[i] || 0);
    }
  }

  usageChart.data.labels = hours;
  usageChart.data.datasets[0].data = data;
  usageChart.update();
}

// Update status chart
function updateStatusChart() {
  const statusData = [
    analyticsData.statusDistribution.open || 0,
    analyticsData.statusDistribution.closed || 0,
    analyticsData.statusDistribution.opening || 0,
    analyticsData.statusDistribution.closing || 0,
  ];

  statusChart.data.datasets[0].data = statusData;
  statusChart.update();
}

// Update peak hours chart
function updatePeakChart() {
  const hours = [];
  const data = [];

  for (let i = 0; i < 24; i++) {
    hours.push(i + ':00');
    data.push(analyticsData.peakHours[i] || 0);
  }

  peakChart.data.labels = hours;
  peakChart.data.datasets[0].data = data;
  peakChart.update();
}

// Update user activity chart (mocked visual for now)
function updateUserChart() {
  const labels = [];
  const data = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    labels.push(date.toLocaleDateString('vi-VN'));
    data.push(Math.floor(Math.random() * 20) + 5);
  }
  userChart.data.labels = labels;
  userChart.data.datasets[0].data = data;
  userChart.update();
}

// Update recent activity
function updateRecentActivity(activities) {
  const activityList = document.getElementById('recentActivity');
  activityList.innerHTML = '';
  const sortedActivities = Object.values(activities).sort((a, b) => b.timestamp - a.timestamp);
  sortedActivities.slice(0, 10).forEach((activity) => {
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    const time = new Date(activity.timestamp).toLocaleString('vi-VN');
    const icon = getActivityIcon(activity.type);
    activityItem.innerHTML = `
      <span class="time">${time}</span>
      <span class="action">${icon} ${activity.action}</span>
      <span class="user">${activity.user}</span>
    `;
    activityList.appendChild(activityItem);
  });
}

function getActivityIcon(type) {
  switch (type) {
    case 'status_change':
      return '🔄';
    case 'user_action':
      return '👤';
    case 'system':
      return '⚙️';
    case 'error':
      return '❌';
    default:
      return 'ℹ️';
  }
}

function updateSystemStatus() {
  const el = document.getElementById('firebaseStatus');
  if (el) {
    el.textContent = isAuthenticated() ? 'Online' : 'Offline';
    el.className = 'status-value ' + (isAuthenticated() ? 'online' : 'offline');
  }
  const esp = document.getElementById('esp32Status');
  if (esp) {
    esp.textContent = 'Online';
    esp.className = 'status-value online';
  }
  const servo = document.getElementById('servoStatus');
  if (servo) {
    servo.textContent = 'OK';
    servo.className = 'status-value online';
  }
  const led = document.getElementById('ledStatus');
  if (led) {
    led.textContent = 'OK';
    led.className = 'status-value online';
  }
}

async function exportReport() {
  console.log('📄 Exporting report...');
  try {
    const res = await authFetch('/api/analytics');
    const apiData = res.ok ? await res.json() : null;
    const reportData = {
      timestamp: new Date().toISOString(),
      stats: apiData?.stats || {
        totalOpens: analyticsData.totalOpens,
        avgUsageTime: analyticsData.avgUsageTime,
        activeUsers: analyticsData.activeUsers,
        systemErrors: analyticsData.systemErrors,
      },
      hourlyUsage: apiData?.hourlyUsage || analyticsData.hourlyUsage,
      statusDistribution: apiData?.statusDistribution || analyticsData.statusDistribution,
      peakHours: apiData?.peakHours || analyticsData.peakHours,
    };
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `locker-report-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    try {
      await authFetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'Report exported', type: 'user_action' }),
      });
    } catch {}
  } catch (e) {
    console.error('Export failed', e);
  }
}

async function refreshData() {
  console.log('🔄 Refreshing data...');
  await loadFromBackend();
  try {
    await authFetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'Data refreshed', type: 'user_action' }),
    });
  } catch {}
}

async function clearActivity() {
  if (confirm('Bạn có chắc muốn xóa tất cả hoạt động?')) {
    try {
      await authFetch('/api/activity/clear', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    document.getElementById('recentActivity').innerHTML = '';
    try {
      await authFetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'Activity cleared', type: 'user_action' }),
      });
    } catch {}
  }
}

function updateCharts() {
  updateUsageChart();
}

function setupAuthUI() {
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const usernameInput = document.getElementById('usernameInput');
  const passwordInput = document.getElementById('passwordInput');
  const currentUser = document.getElementById('currentUser');

  function render() {
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
    updateSystemStatus();
  }

  render();

  loginBtn.addEventListener('click', async () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    if (!username || !password) return alert('Nhập tài khoản và mật khẩu');
    try {
      await login(username, password);
      render();
      await loadFromBackend();
    } catch (e) {
      alert('Đăng nhập thất bại: ' + e.message);
    }
  });

  logoutBtn.addEventListener('click', () => {
    logout();
    render();
  });
}

// Expose functions used by inline HTML
window.exportReport = exportReport;
window.refreshData = refreshData;
window.clearActivity = clearActivity;
window.updateCharts = updateCharts;
