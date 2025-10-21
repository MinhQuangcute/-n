import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import admin from 'firebase-admin';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Env
const PORT = process.env.PORT || 8080;
const DATABASE_URL = process.env.FIREBASE_DATABASE_URL;
const SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const GOOGLE_CREDS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const API_KEY = process.env.API_KEY;

// Initialize Firebase Admin
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) return;

  let credential;
  if (SERVICE_ACCOUNT_JSON && SERVICE_ACCOUNT_JSON.trim()) {
    try {
      const json = JSON.parse(SERVICE_ACCOUNT_JSON);
      credential = admin.credential.cert(json);
    } catch (e) {
      console.error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON:', e.message);
      process.exit(1);
    }
  } else if (GOOGLE_CREDS_PATH) {
    credential = admin.credential.cert(GOOGLE_CREDS_PATH);
  } else {
    console.error('Missing service account credentials. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON');
    process.exit(1);
  }

  admin.initializeApp({
    credential,
    databaseURL: DATABASE_URL,
  });
}

initializeFirebaseAdmin();

const app = express();

// Security & middleware
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(morgan('combined'));

// CORS
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // allow same-origin/non-browser
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('CORS not allowed'), false);
    },
    credentials: false,
  })
);

// Rate limiting
const limiter = new RateLimiterMemory({ points: 100, duration: 60 });
async function rateLimit(req, res, next) {
  try {
    const key = `${req.ip}`;
    await limiter.consume(key);
    next();
  } catch {
    res.status(429).json({ error: 'Too many requests' });
  }
}
app.use(rateLimit);

// Optional API key layer
function requireApiKey(req, res, next) {
  if (!API_KEY) return next();
  const headerKey = req.header('x-api-key');
  if (headerKey && headerKey === API_KEY) return next();
  return res.status(401).json({ error: 'Invalid API key' });
}

// Auth: verify Firebase ID token if provided
async function verifyIdToken(req, res, next) {
  const authHeader = req.header('Authorization') || '';
  const match = authHeader.match(/^Bearer (.*)$/i);
  if (!match) return next(); // allow public but limited endpoints; tighten later

  try {
    const decoded = await admin.auth().verifyIdToken(match[1], true);
    req.user = decoded;
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  next();
}

app.get('/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// RBAC helper
function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const roles = req.user.roles || req.user.role || req.user.claims || {};
    const roleList = Array.isArray(roles) ? roles : Object.keys(roles).filter(k => roles[k]);
    if (roleList.includes(requiredRole)) return next();
    return res.status(403).json({ error: 'Forbidden' });
  };
}

// Database helpers (Realtime Database)
function db() {
  return admin.database();
}

// Routes
const router = express.Router();
router.use(requireApiKey);
router.use(verifyIdToken);

// Read locker state (public read optional)
router.get('/locker', async (req, res) => {
  try {
    const snap = await db().ref('/Locker1').get();
    res.json({ data: snap.exists() ? snap.val() : null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Command locker (protected)
router.post('/locker/command', async (req, res) => {
  const { action } = req.body || {};
  if (!['open', 'close', 'opening', 'closing'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  // Require admin or writer role if token provided; if no token, require API key
  if (!req.user && !API_KEY) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user) {
    const roles = req.user.roles || req.user.role || req.user.claims || {};
    const roleList = Array.isArray(roles) ? roles : Object.keys(roles).filter(k => roles[k]);
    const allowed = roleList.includes('admin') || roleList.includes('writer');
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    await db().ref('/Locker1/status').set(action);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Analytics endpoints (protected read/write)
router.get('/analytics/activity', async (req, res) => {
  try {
    const snap = await db().ref('/analytics/activity').get();
    res.json({ data: snap.exists() ? snap.val() : {} });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/analytics/activity', async (req, res) => {
  try {
    const ref = db().ref('/analytics/activity').push();
    await ref.set({ ...(req.body || {}), serverTime: Date.now() });
    res.json({ ok: true, key: ref.key });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/analytics/activity', async (req, res) => {
  try {
    await db().ref('/analytics/activity').set(null);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.use('/api', router);

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
