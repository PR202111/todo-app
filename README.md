# TodoFlow 2.0 — Coding Command Center

TodoFlow 2.0 is an advanced Competitive Programming & Productivity Dashboard combining task management (Kanban, categories, due dates, drag-and-drop) with competitive programming workflows (Codeforces & LeetCode tracking, contest preparation, problem library with spaced repetition, rating analytics, and achievement unlocks).

---

## Architecture Overview

```
                      ┌────────────────────────────────────────────────────────┐
                      │                   Docker Host / Client                 │
                      └───────────────────────────┬────────────────────────────┘
                                                  │
                                  Port 8080       │  Port 8000 (Optional Direct)
                                      ▼           ▼
                      ┌────────────────────────────────────────────────────────┐
                      │              Docker Compose Network                    │
                      │                                                        │
                      │   ┌────────────────────┐    /api/*    ┌────────────┐   │
                      │   │  todoflow-frontend │ ───────────► │  todoflow- │   │
                      │   │  (Nginx 1.27 +     │  (internal)  │   backend  │   │
                      │   │   React 18 SPA)    │              │  (FastAPI) │   │
                      │   └────────────────────┘              └──────┬─────┘   │
                      │                                              │         │
                      │                                              │ Mount   │
                      │                                              ▼         │
                      │                                   ┌────────────────────┤
                      │                                   │ Named Volume:      │
                      │                                   │ todoflow-db-data   │
                      │                                   │ (/app/data/        │
                      │                                   │  todoapp.db)       │
                      └───────────────────────────────────┴────────────────────┘
```

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide icons.
- **Service Worker & PWA:** App shell caching, Web App Manifest, offline connectivity monitoring, and cross-platform installation prompts.
- **Web Server:** Nginx 1.27 Alpine serving static SPA bundles and reverse-proxying `/api/` to the backend container over an isolated internal network.
- **Backend:** FastAPI (Python 3.11), SQLAlchemy, SQLite, passlib/bcrypt, python-jose (JWT auth).
- **Persistence:** Docker named volume `todoflow-db-data` mounting to `/app/data/todoapp.db`.

---

## PART A — Progressive Web App (PWA)

### 1. Installation on Supported Platforms
- **Chromium / Chrome / Edge (Desktop & Android):** When visiting the application, an unobtrusive install card appears in the bottom right corner. Clicking **Install** triggers the native browser installation prompt. Once installed, TodoFlow launches in a dedicated, distraction-free standalone window.
- **iOS Safari (iPhone & iPad):** iOS does not support the `beforeinstallprompt` API. TodoFlow automatically detects iOS Safari and presents a guided installation helper:
  1. Tap the **Share** button in the Safari toolbar.
  2. Scroll down and tap **Add to Home Screen**.
  3. Confirm the app name and tap **Add**.
- **Installed State Detection:** When running in standalone mode (`display-mode: standalone` or `navigator.standalone`), install banners are automatically suppressed. Dismissing a prompt stores a 7-day cooldown in `localStorage`.

### 2. Service Worker & Caching Strategy
- **App Shell Caching:** Static assets (HTML shell, versioned CSS/JS bundles, web fonts, SVG icons, and PNG icons) are pre-cached and updated using versioned caches (`todoflow-v1-shell` and `todoflow-v1-static`).
- **Private Data Protection:** The service worker **strictly bypasses** all requests targeting `/api/*`. Authenticated endpoints and private user data are never cached in the service worker.
- **Offline Indicator:** When network connectivity is lost, an accessible `OfflineBanner` alerts the user that they are in offline mode viewing cached application assets, complete with a manual **Retry** connectivity button.

---

## PART B — Quick Start & Local Development

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+ with `venv`

### Option 1: One-Click Local Development
Run the existing startup script:
```bash
./start.sh
```
- Frontend: `http://localhost:5173`
- Backend API & Docs: `http://localhost:8000/docs`

### Option 2: Manual Local Startup
1. **Backend:**
   ```bash
   cd backend
   source venv/bin/activate
   pip install -r requirements.txt
   pytest
   uvicorn main:app --reload --port 8000
   ```
2. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run build
   npm run dev
   ```

---

## PART C — Production Deployment with Docker Compose

### 1. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Update values as needed:
```ini
# Production JWT Secret
SECRET_KEY=generate_a_secure_random_key_for_production

# Ports
FRONTEND_PORT=8080
BACKEND_PORT=8000

# CORS Origins
CORS_ORIGINS=http://localhost:8080,http://127.0.0.1:8080

# Database URL
DATABASE_URL=sqlite:////app/data/todoapp.db
```

### 2. Build & Launch Containers
```bash
# Build multi-stage images
docker compose build

# Start services in detached mode
docker compose up -d
```

### 3. Verify Container Health
Check container status:
```bash
docker compose ps
```
Both containers should report `Up (healthy)`.

Verify endpoints:
```bash
# Frontend SPA & PWA Shell
curl -I http://localhost:8080/

# PWA Manifest
curl -s http://localhost:8080/manifest.json | head -n 10

# Backend Health Check (proxied via Nginx)
curl -s http://localhost:8080/api/health
# Output: {"status":"healthy","database":"connected","version":"2.0.0"}

# Direct Backend Health Check
curl -s http://localhost:8000/api/health
```

---

## PART D — Database Persistence, Backup & Restore

### 1. Persistent Storage Architecture
In Docker mode, the SQLite database is stored on the named volume `todoflow-db-data` mounted to `/app/data/todoapp.db`.
Even if containers are destroyed (`docker compose down`), data persists indefinitely in the volume.

### 2. Optional: Seeding Volume with Existing Local Database
If you have an existing local database (`backend/todoapp.db`) that you want to import into Docker:
```bash
# 1. Ensure containers are running
docker compose up -d

# 2. Copy the local database into the persistent volume directory
docker cp backend/todoapp.db todoflow-backend:/app/data/todoapp.db

# 3. Ensure proper file ownership
docker compose exec -u root backend chown appuser:appuser /app/data/todoapp.db

# 4. Restart backend container to apply
docker compose restart backend
```

### 3. Creating a Database Backup
To create a live, safe backup of the database from the running container:
```bash
# Method 1: Using sqlite3 safe backup via python
docker compose exec backend python -c "
import sqlite3
src = sqlite3.connect('/app/data/todoapp.db')
dst = sqlite3.connect('/app/data/backup_live.db')
src.backup(dst)
dst.close()
src.close()
print('Backup created.')
"

# Method 2: Copy backup to host
docker cp todoflow-backend:/app/data/todoapp.db ./todoapp_backup_$(date +%Y%m%d_%H%M%S).db
```

### 4. Restoring Database from Backup
To restore a backup into the container:
```bash
# 1. Stop backend service
docker compose stop backend

# 2. Copy backup file to volume
docker cp ./my_backup.db todoflow-backend:/app/data/todoapp.db

# 3. Ensure permissions
docker compose run --rm -u root backend chown appuser:appuser /app/data/todoapp.db

# 4. Start backend
docker compose up -d backend
```

---

## PART E — Running Automated Tests

Run the backend test suite:
```bash
./backend/venv/bin/pytest backend
```
Result: 15 passed tests covering:
- Authentication & baseline CRUD
- Healthcheck endpoints (`/health`, `/api/health`)
- Coding profile integration & rating history
- Contest tracking and prep workspaces
- Problem library & spaced repetition intervals
- Goals, analytics, reports, notifications, and achievements

Run the frontend TypeScript & Vite build verification:
```bash
npm --prefix frontend run build
```
Result: 0 errors, output generated in `frontend/dist`.
