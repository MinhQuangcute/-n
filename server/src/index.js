import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import lockerRouter from './routes/locker.js';

const app = express();
// Bind to a fixed dev port and ignore hosting-provided PORT to avoid conflicts
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/locker', lockerRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Smart Locker backend listening on :${PORT}`);
});
