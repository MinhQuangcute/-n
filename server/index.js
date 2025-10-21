const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

// In-memory data store (replace with real database later)
const state = {
  locker: {
    current_status: 'closed',
    last_update: Date.now(),
  },
  activities: [],
  qr_activity: [],
};

// Seed users (passwords: admin123, user123, guest123)
const users = [
  { id: '1', username: 'admin', passwordHash: bcrypt.hashSync('admin123', 10), role: 'admin' },
  { id: '2', username: 'user', passwordHash: bcrypt.hashSync('user123', 10), role: 'user' },
  { id: '3', username: 'guest', passwordHash: bcrypt.hashSync('guest123', 10), role: 'guest' },
];

function createToken(user) {
  return jwt.sign({ sub: user.id, username: user.username, role: user.role }, JWT_SECRET, {
    expiresIn: '8h',
  });
}

function authenticateJWT(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

function logActivity({ action, type = 'system', user = 'system', metadata = {} }) {
  const entry = {
    id: String(Date.now()) + Math.random().toString(36).slice(2),
    action,
    type,
    user,
    timestamp: Date.now(),
    metadata,
  };
  state.activities.push(entry);
  if (state.activities.length > 1000) state.activities.shift();
  return entry;
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = users.find((u) => u.username === username);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = bcrypt.compareSync(password || '', user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = createToken(user);
  logActivity({ action: 'User login', type: 'user_action', user: user.username });
  res.json({ token, user: { username: user.username, role: user.role } });
});

app.get('/api/auth/me', authenticateJWT, (req, res) => {
  const user = users.find((u) => u.id === req.user.sub);
  if (!user) return res.status(401).json({ error: 'Invalid token' });
  res.json({ username: user.username, role: user.role });
});

// Locker routes
app.get('/api/locker/status', authenticateJWT, (req, res) => {
  res.json({ ...state.locker });
});

app.post('/api/locker/command', authenticateJWT, authorize('admin', 'user'), (req, res) => {
  const { action } = req.body || {};
  if (!['open', 'close', 'opening', 'closing'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }
  state.locker.current_status = action === 'open' || action === 'opening' ? 'open' : action === 'close' || action === 'closing' ? 'closed' : action;
  state.locker.last_update = Date.now();
  const entry = logActivity({ action: `Locker ${action}`, type: 'status_change', user: req.user.username });
  res.json({ ok: true, status: { ...state.locker }, activity: entry });
});

// Activity routes
app.get('/api/activity', authenticateJWT, (req, res) => {
  res.json(state.activities.slice().reverse());
});

app.post('/api/activity', authenticateJWT, (req, res) => {
  const { action, type = 'user_action', metadata = {} } = req.body || {};
  if (!action) return res.status(400).json({ error: 'Missing action' });
  const entry = logActivity({ action, type, user: req.user.username, metadata });
  res.json(entry);
});

app.post('/api/activity/clear', authenticateJWT, authorize('admin'), (req, res) => {
  state.activities = [];
  logActivity({ action: 'Activity cleared', type: 'system', user: req.user.username });
  res.json({ ok: true });
});

// QR activity
app.get('/api/qr/activity', authenticateJWT, (req, res) => {
  res.json(state.qr_activity.slice().reverse());
});

app.post('/api/qr/activity', authenticateJWT, (req, res) => {
  const { action, data, type = 'info' } = req.body || {};
  const entry = {
    id: String(Date.now()) + Math.random().toString(36).slice(2),
    action,
    data,
    type,
    user: req.user.username,
    timestamp: Date.now(),
  };
  state.qr_activity.push(entry);
  if (state.qr_activity.length > 1000) state.qr_activity.shift();
  res.json(entry);
});

app.post('/api/qr/grant', authenticateJWT, authorize('admin', 'user'), (req, res) => {
  // Grant access translates to opening the locker
  state.locker.current_status = 'open';
  state.locker.last_update = Date.now();
  const activity = logActivity({ action: 'Access granted via QR', type: 'user_action', user: req.user.username });
  res.json({ ok: true, status: state.locker, activity });
});

// Analytics (simple aggregation from activity)
app.get('/api/analytics', authenticateJWT, (req, res) => {
  const stats = {
    totalOpens: state.activities.filter((a) => /open/i.test(a.action)).length,
    totalCloses: state.activities.filter((a) => /close/i.test(a.action)).length,
    activeUsers: new Set(state.activities.map((a) => a.user)).size,
    systemErrors: state.activities.filter((a) => a.type === 'error').length,
  };
  // Hourly usage (last 24h)
  const now = Date.now();
  const hourlyUsage = {};
  for (let i = 0; i < 24; i++) hourlyUsage[i] = 0;
  state.activities.forEach((a) => {
    if (now - a.timestamp < 24 * 60 * 60 * 1000) {
      const h = new Date(a.timestamp).getHours();
      hourlyUsage[h] = (hourlyUsage[h] || 0) + 1;
    }
  });
  const statusDistribution = { open: 0, closed: 0, opening: 0, closing: 0 };
  state.activities.forEach((a) => {
    if (/open/i.test(a.action)) statusDistribution.open++;
    if (/closed|close/i.test(a.action)) statusDistribution.closed++;
  });
  const peakHours = { ...hourlyUsage };
  res.json({ stats, hourlyUsage, statusDistribution, peakHours, userActivity: state.activities });
});

// Serve frontend static files (from repo root)
const rootStatic = path.resolve(__dirname, '..');
app.use(express.static(rootStatic));

// Fallback to index.html for top-level pages if needed
app.get('/', (req, res) => {
  res.sendFile(path.join(rootStatic, 'index.html'));
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${PORT}`);
});
