// Dashboard Analytics JavaScript
// Using backend API instead of Firebase
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
    userActivity: []
};

// Wait for Firebase to be ready
function waitForAuth() {
    return new Promise((resolve) => {
        if (auth.isLoggedIn()) return resolve();
        auth.onAuthReady(resolve);
    });
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📊 Dashboard initializing...');
    
    await waitForAuth();
    
    // Initialize charts
    initializeCharts();
    
    // Start polling backend
    startBackendListener();
    
    // Load historical data
    loadHistoricalData();
    
    // Update data every 30 seconds
    setInterval(updateDashboard, 30000);
    
    console.log('✅ Dashboard ready');
});

// Initialize all charts
function initializeCharts() {
    // Usage Chart
    const usageCtx = document.getElementById('usageChart').getContext('2d');
    usageChart = new Chart(usageCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Lần mở/giờ',
                data: [],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Status Distribution Chart
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    statusChart = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
            labels: ['Mở', 'Đóng', 'Đang mở', 'Đang đóng'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: [
                    '#48bb78',
                    '#f56565',
                    '#ed8936',
                    '#ed8936'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });

    // Peak Hours Chart
    const peakCtx = document.getElementById('peakChart').getContext('2d');
    peakChart = new Chart(peakCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Sử dụng',
                data: [],
                backgroundColor: '#667eea'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // User Activity Chart
    const userCtx = document.getElementById('userChart').getContext('2d');
    userChart = new Chart(userCtx, {
        type: 'area',
        data: {
            labels: [],
            datasets: [{
                label: 'Hoạt động',
                data: [],
                borderColor: '#48bb78',
                backgroundColor: 'rgba(72, 187, 120, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Start Firebase listener
function startBackendListener() {
    console.log('📡 Starting backend polling...');
    const poll = async () => {
        try {
            const status = await auth.apiFetch('/locker/status');
            updateAnalytics({ current_status: status.status });
            const activity = await auth.apiFetch('/locker/activity');
            updateRecentActivity(Object.fromEntries((activity.activity || []).map((a, i) => [i, a])));
        } catch (e) {
            console.error('Backend polling error:', e);
        }
    };
    poll();
    setInterval(poll, 5000);
}

// Update analytics data
function updateAnalytics(data) {
    const currentStatus = data.current_status || 'closed';
    const timestamp = Date.now();
    
    // Update status distribution
    analyticsData.statusDistribution[currentStatus] = (analyticsData.statusDistribution[currentStatus] || 0) + 1;
    
    // Update hourly usage
    const hour = new Date().getHours();
    analyticsData.hourlyUsage[hour] = (analyticsData.hourlyUsage[hour] || 0) + 1;
    
    // Update peak hours
    analyticsData.peakHours[hour] = (analyticsData.peakHours[hour] || 0) + 1;
    
    // Log activity
    logActivity({
        action: currentStatus,
        timestamp: timestamp,
        user: 'system',
        type: 'status_change'
    });
    
    // Update dashboard
    updateDashboard();
}

// Log activity
function logActivity(activity) {
    // Optionally send to backend in future
}

// Update dashboard display
function updateDashboard() {
    // Update stats cards
    document.getElementById('totalOpens').textContent = analyticsData.totalOpens;
    document.getElementById('avgUsageTime').textContent = analyticsData.avgUsageTime + 'm';
    document.getElementById('activeUsers').textContent = analyticsData.activeUsers;
    document.getElementById('systemErrors').textContent = analyticsData.systemErrors;
    
    // Update charts
    updateUsageChart();
    updateStatusChart();
    updatePeakChart();
    updateUserChart();
    
    // Update system status
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
        analyticsData.statusDistribution.closing || 0
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

// Update user activity chart
function updateUserChart() {
    const labels = [];
    const data = [];
    
    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('vi-VN'));
        data.push(Math.floor(Math.random() * 20) + 5); // Mock data
    }
    
    userChart.data.labels = labels;
    userChart.data.datasets[0].data = data;
    userChart.update();
}

// Update recent activity
function updateRecentActivity(activities) {
    const activityList = document.getElementById('recentActivity');
    activityList.innerHTML = '';
    
    // Sort activities by timestamp
    const sortedActivities = Object.values(activities).sort((a, b) => b.timestamp - a.timestamp);
    
    // Show last 10 activities
    sortedActivities.slice(0, 10).forEach(activity => {
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

// Get activity icon
function getActivityIcon(type) {
    switch(type) {
        case 'status_change': return '🔄';
        case 'user_action': return '👤';
        case 'system': return '⚙️';
        case 'error': return '❌';
        default: return 'ℹ️';
    }
}

// Update system status
function updateSystemStatus() {
    // Mock system status - in real app, this would check actual system health
    document.getElementById('firebaseStatus').textContent = 'Online';
    document.getElementById('firebaseStatus').className = 'status-value online';
    
    document.getElementById('esp32Status').textContent = 'Online';
    document.getElementById('esp32Status').className = 'status-value online';
    
    document.getElementById('servoStatus').textContent = 'OK';
    document.getElementById('servoStatus').className = 'status-value online';
    
    document.getElementById('ledStatus').textContent = 'OK';
    document.getElementById('ledStatus').className = 'status-value online';
}

// Load historical data
function loadHistoricalData() {
    console.log('📊 Loading historical data...');
    
    // Mock historical data
    analyticsData.totalOpens = 156;
    analyticsData.avgUsageTime = 8.5;
    analyticsData.activeUsers = 12;
    analyticsData.systemErrors = 3;
    
    // Generate mock hourly data
    for (let i = 0; i < 24; i++) {
        analyticsData.hourlyUsage[i] = Math.floor(Math.random() * 20) + 5;
        analyticsData.peakHours[i] = Math.floor(Math.random() * 15) + 3;
    }
    
    // Generate mock status distribution
    analyticsData.statusDistribution = {
        open: 45,
        closed: 120,
        opening: 8,
        closing: 7
    };
    
    updateDashboard();
}

// Export report
function exportReport() {
    console.log('📄 Exporting report...');
    
    const reportData = {
        timestamp: new Date().toISOString(),
        stats: {
            totalOpens: analyticsData.totalOpens,
            avgUsageTime: analyticsData.avgUsageTime,
            activeUsers: analyticsData.activeUsers,
            systemErrors: analyticsData.systemErrors
        },
        hourlyUsage: analyticsData.hourlyUsage,
        statusDistribution: analyticsData.statusDistribution,
        peakHours: analyticsData.peakHours
    };
    
    // Create and download JSON file
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `locker-report-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    
    // Log export activity
    logActivity({
        action: 'Report exported',
        timestamp: Date.now(),
        user: 'admin',
        type: 'user_action'
    });
}

// Refresh data
function refreshData() {
    console.log('🔄 Refreshing data...');
    loadHistoricalData();
    
    // Log refresh activity
    logActivity({
        action: 'Data refreshed',
        timestamp: Date.now(),
        user: 'admin',
        type: 'user_action'
    });
}

// Clear activity
function clearActivity() {
    if (!auth.isLoggedIn()) return alert('Vui lòng đăng nhập');
    if (confirm('Bạn có chắc muốn xóa tất cả hoạt động?')) {
        auth.apiFetch('/locker/activity', { method: 'DELETE' })
          .then(() => {
            document.getElementById('recentActivity').innerHTML = '';
          })
          .catch((e) => alert('Xóa thất bại: ' + (e.message || 'Lỗi')));
    }
}

// Update charts when time range changes
function updateCharts() {
    updateUsageChart();
}

