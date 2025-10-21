import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { signToken } from '../middleware/auth.js';

const router = Router();

// In-memory users for demo; replace with DB later
const users = [
  {
    id: '1',
    username: 'admin',
    passwordHash: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    permissions: ['locker:open', 'locker:close', 'analytics:read']
  },
  {
    id: '2',
    username: 'user',
    passwordHash: bcrypt.hashSync('user123', 10),
    role: 'user',
    permissions: ['locker:open', 'locker:close']
  },
  {
    id: '3',
    username: 'guest',
    passwordHash: bcrypt.hashSync('guest123', 10),
    role: 'guest',
    permissions: ['locker:open']
  }
];

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const found = users.find(u => u.username === username);
  if (!found) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = bcrypt.compareSync(password || '', found.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken({ userId: found.id, role: found.role, username: found.username, permissions: found.permissions });
  res.json({ token, user: { id: found.id, username: found.username, role: found.role, permissions: found.permissions } });
});

export default router;
