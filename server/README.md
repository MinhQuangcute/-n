## Smart Locker Backend

Node.js Express backend that proxies and secures access to Firebase Realtime Database.

### Features
- Express + Firebase Admin SDK (server-side)
- Verifies Firebase ID tokens (Authorization: Bearer <idToken>)
- Optional shared `x-api-key` for extra protection
- CORS, Helmet, basic rate limiting
- Endpoints for locker command and analytics

### Setup
1. Copy `.env.example` to `.env` and configure:

```
PORT=8080
FIREBASE_DATABASE_URL=https://<your-project-id>-default-rtdb.firebaseio.com
# Provide service account in one of two ways:
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
# or inline JSON (single line)
FIREBASE_SERVICE_ACCOUNT_JSON=

# Allowed frontend origins
CORS_ORIGINS=http://localhost:5500

# Optional extra protection
API_KEY=your-strong-random-key
```

2. Place your Firebase service account JSON at `server/serviceAccountKey.json` (if using file path), or paste JSON into `FIREBASE_SERVICE_ACCOUNT_JSON`.

3. Install and run:

```
cd server
npm install
npm run dev
```

### API
- `GET /health`
- `GET /api/locker` -> returns locker node
- `POST /api/locker/command { action: 'open' | 'close' }`
- `GET /api/analytics/activity`
- `POST /api/analytics/activity` -> body: free-form analytics item
- `DELETE /api/analytics/activity`

Include headers when applicable:
- `Authorization: Bearer <Firebase ID token>` (recommended)
- `x-api-key: <API_KEY>` (if configured)
