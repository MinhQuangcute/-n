import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';

// In-memory state for demo; replace with DB or device integration later
const state = {
  locker: {
    status: 'closed',
    last_update: Date.now(),
    door_sensor: 'closed'
  },
  activity: [] // { action, timestamp, user }
};

const router = Router();

router.get('/status', authenticate, (req, res) => {
  res.json({ ...state.locker });
});

router.post('/command', authenticate, authorize('admin', 'user'), (req, res) => {
  const { action } = req.body || {};
  if (!['open', 'close'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }
  state.locker.status = action === 'open' ? 'opening' : 'closing';
  state.locker.last_update = Date.now();
  // Simulate transition to final state
  setTimeout(() => {
    state.locker.status = action === 'open' ? 'open' : 'closed';
    state.locker.last_update = Date.now();
  }, 1000);

  const entry = { action, timestamp: Date.now(), user: req.user?.username || 'unknown' };
  state.activity.push(entry);

  res.json({ ok: true, status: state.locker.status });
});

router.get('/activity', authenticate, authorize('admin'), (_req, res) => {
  res.json({ activity: state.activity.slice(-100).reverse() });
});

router.delete('/activity', authenticate, authorize('admin'), (_req, res) => {
  state.activity = [];
  res.json({ ok: true });
});

export default router;
