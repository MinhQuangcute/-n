// Smart Locker Backend Server
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const path = require("path");

// =======================
// 1. Firebase Admin Init
// =======================
const serviceAccount = JSON.parse(
  fs.readFileSync("./serviceAccountKey.json", "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://minhquang-36ee2-default-rtdb.firebaseio.com", // đổi URL theo project Firebase của bạn
});

const db = admin.database();

// =======================
// 2. Express Init
// =======================
const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = 3000;
const JWT_SECRET = "supersecretkey"; // thay bằng process.env.JWT_SECRET trong production

// =======================
// 3. Middleware JWT
// =======================
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token missing" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
}

// =======================
// 4. API: Đăng nhập (demo)
// =======================
app.post("/api/login", (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "Username required" });

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "1h" });
  res.json({ token });
});

// =======================
// 5. API: Gửi lệnh mở/đóng locker
// =======================
app.post("/api/command", authenticateToken, async (req, res) => {
  const { lockerId, action } = req.body;
  const username = req.user.username;

  if (!["open", "close"].includes(action)) {
    return res.status(400).json({ error: "Invalid action" });
  }

  try {
    const lockerRef = db.ref(`/Locker1`);
    await lockerRef.update({
      status: action,
      last_update: Date.now(),
    });

    const logRef = db.ref("/Logs").push();
    await logRef.set({
      user: username,
      locker: lockerId,
      action,
      time: new Date().toISOString(),
      result: "success",
    });

    res.json({ message: `Command '${action}' sent to ${lockerId}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send command" });
  }
});

// =======================
// 6. API: Lấy trạng thái locker
// =======================
app.get("/api/locker/:id/status", authenticateToken, async (req, res) => {
  const lockerId = req.params.id;
  try {
    const lockerSnapshot = await db.ref(`/Locker1`).once("value");
    const lockerData = lockerSnapshot.val();
    res.json(lockerData || { status: "unknown" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get locker status" });
  }
});

// =======================
// 7. Serve Static Files
// =======================
// Serve HTML files from parent directory
app.use(express.static(path.join(__dirname, "..")));

// Route for main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../index.html"));
});

// Route for simple control
app.get("/control", (req, res) => {
  res.sendFile(path.join(__dirname, "../simple_control.html"));
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    message: "Smart Locker Backend is running!"
  });
});
app.get("/shipper", (req, res) => {
  res.sendFile(path.join(__dirname, "../shipper.html"));
});
app.get("/receiver", (req, res) => {
  res.sendFile(path.join(__dirname, "../receiver.html"));
});

// =======================
// 8. Start Server
// =======================
app.listen(PORT, () => {
  console.log(`🚀 Smart Locker Backend running at http://localhost:${PORT}`);
  console.log(`📱 Main page: http://localhost:${PORT}`);
  console.log(`🎮 Control page: http://localhost:${PORT}/control`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔍 Shipper page: http://localhost:${PORT}/shipper`);
  console.log(`🔍 Receiver page: http://localhost:${PORT}/receiver`);
});
