import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function signToken(payload, options = {}) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '12h', ...options });
}

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function authorize(...allowedRoles) {
  return function (req, res, next) {
    const role = req.user?.role;
    if (!role) return res.status(403).json({ error: 'Forbidden' });
    if (!allowedRoles.includes(role)) return res.status(403).json({ error: 'Insufficient role' });
    next();
  };
}
