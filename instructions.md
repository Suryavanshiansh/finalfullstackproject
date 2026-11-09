# Faculty Performance Intelligence System (FPIS)
## Installation, Setup, and Operational Run Guide

> **Document Version:** 1.0.0  
> **Target Environment:** Development, Testing, and Production  
> **Last Updated:** 2026-11-09  
> **Project Root Directory:** `fpis/`

---

## Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Project Folder Structure](#2-project-folder-structure)
3. [Initial Installation](#3-initial-installation)
4. [Environment Configuration](#4-environment-configuration)
5. [Database Setup](#5-database-setup)
6. [Redis Setup & Background Queue](#6-redis-setup--background-queue)
7. [Terminal Commands (Quick Reference)](#7-terminal-commands-quick-reference)
8. [Running the Complete Project (Step-by-Step)](#8-running-the-complete-project-step-by-step)
9. [Terminal Split (Recommended Workflow)](#9-terminal-split-recommended-workflow)
10. [Application URLs](#10-application-urls)
11. [Demo Login Credentials](#11-demo-login-credentials)
12. [Troubleshooting Guide](#12-troubleshooting-guide)
13. [Development Commands](#13-development-commands)
14. [Shutting Down the Application](#14-shutting-down-the-application)
15. [Production Deployment (High-Level Overview)](#15-production-deployment-high-level-overview)

---

## 1. Prerequisites

Before installing and launching the Faculty Performance Intelligence System (FPIS), verify that your local development machine satisfies the following prerequisites:

| Component | Minimum Version | Recommended Version | Verification Command | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Node.js** | `v18.18.0` LTS | `v20.x` or `v22.x`+ | `node -v` | Active runtime tested up to Node `v24.x`. |
| **npm** | `v9.0.0` | `v10.x` or `v11.x` | `npm -v` | Ships bundled with Node.js. |
| **Git** | `v2.30.0` | Latest | `git --version` | For source control and submodules. |
| **Database** | SQLite 3 / PostgreSQL 14+ | PostgreSQL 16+ (Docker or Local) | `psql --version` | SQLite is included out-of-the-box for instant zero-config dev. |
| **Redis** *(Optional)* | `v6.2.0` | `v7.2+` (Docker or Local) | `redis-cli --version` | Optional. If absent, FPIS uses an automatic in-process fallback. |
| **Docker** *(Optional)* | `v24.0.0` | Latest Docker Desktop | `docker --version` | Simplifies running PostgreSQL and Redis containers. |

---

## 2. Project Folder Structure

FPIS is structured as a full-stack monorepo featuring an Express/Prisma TypeScript backend and a React/Vite/Tailwind TypeScript frontend.

```text
fpis/
├── client/                               # Frontend Single-Page Application (React 18 + Vite)
│   ├── index.html                        # HTML entry point with metadata and fonts
│   ├── package.json                      # Client dependencies (React, Lucide, Recharts, FullCalendar)
│   ├── postcss.config.js                 # PostCSS configuration for Tailwind CSS
│   ├── tailwind.config.js                # Custom design system colors, border radii, shadows
│   ├── tsconfig.json                     # Client TypeScript compilation settings
│   ├── tsconfig.node.json                # TypeScript settings for Vite build tools
│   ├── vite.config.ts                    # Vite config with reverse-proxy rules (/api, /uploads)
│   └── src/
│       ├── App.tsx                       # Main client router, React Query provider, Auth provider
│       ├── index.css                     # Tailwind utility directives and custom scrollbar styles
│       ├── main.tsx                      # DOM mount and root React application bootstrap
│       ├── components/                   # Reusable UI component library (shadcn/ui style)
│       │   ├── ActivityFormModal.tsx     # 7-category dynamic activity creation and editing modal
│       │   ├── EvidenceUploader.tsx      # File upload handler with preview and size validation
│       │   ├── Navbar.tsx                # Top navigation bar with notifications and user profile
│       │   ├── ProtectedRoute.tsx        # Client route guard enforcing role-based permissions
│       │   └── Sidebar.tsx               # Collapsible navigation drawer tailored per user role
│       ├── context/                      # Global React context providers
│       │   └── AuthContext.tsx           # Authentication state, session persistence, role switcher
│       ├── hooks/                        # Custom React lifecycle and state hooks
│       │   └── useDebounce.ts            # Input debounce helper for search and filtering
│       ├── pages/                        # Role-specific application views
│       │   ├── ActivitiesPage.tsx        # Activity management and submission view
│       │   ├── AdminDashboard.tsx        # Institutional oversight and workload metrics
│       │   ├── ApprovalsPage.tsx         # Reviewer submission queue and decision modal
│       │   ├── AuditLogsPage.tsx         # Tamper-evident administrative audit log viewer
│       │   ├── FacultyDashboard.tsx      # Faculty workload, score radar, and activity summary
│       │   ├── LoginPage.tsx             # Secure login screen with 1-click demo role switcher
│       │   ├── ProfilePage.tsx           # User profile and password management
│       │   ├── ReportsPage.tsx           # Institutional analytics and CSV export engine
│       │   ├── ReviewerDashboard.tsx     # Departmental oversight and pending review queues
│       │   ├── SchedulingPage.tsx        # Interactive FullCalendar smart scheduling workbench
│       │   ├── UsersManagementPage.tsx   # Admin user CRUD and department assignment
│       │   └── WorkloadPoliciesPage.tsx  # Workload threshold and scoring weights configurator
│       ├── services/                     # Axios/Fetch API client abstractions
│       │   └── api.ts                    # Typed API client handling JWT tokens and errors
│       └── types/                        # Client-side TypeScript interfaces and domain types
│           └── index.ts                  # Shared types for users, activities, approvals, scores
│
├── server/                               # Backend REST API Service (Node.js + Express + Prisma)
│   ├── package.json                      # Backend dependencies (Express, Prisma, Zod, BullMQ, ioredis)
│   ├── tsconfig.json                     # Server TypeScript compiler configuration
│   ├── vitest.config.ts                  # Backend automated unit and integration test runner
│   ├── .env.example                      # Environment variable template with documentation
│   ├── .env                              # Active server environment variables (generated on setup)
│   ├── prisma/                           # Database schemas, migrations, and seed scripts
│   │   ├── schema.prisma                 # Primary Prisma schema (SQLite dev engine)
│   │   ├── schema.postgresql.prisma      # Enterprise PostgreSQL production schema
│   │   ├── seed.ts                       # Database seeder with realistic faculty, scores, and schedules
│   │   └── dev.db                        # SQLite local database file (automatically created)
│   ├── uploads/                          # Local evidence document storage directory
│   │   └── evidence/                     # Uploaded PDF and image files for submitted activities
│   └── src/
│       ├── index.ts                      # Express server entry point, middleware stack, route mounts
│       ├── controllers/                  # HTTP request handlers and response formatters
│       │   ├── activityController.ts     # Activity CRUD, evidence attachments, submit workflow
│       │   ├── adminController.ts        # System analytics, user administration, policy controls
│       │   ├── approvalController.ts     # Reviewer queue, decision handling, remark enforcement
│       │   ├── authController.ts         # User login, profile inspection, password change
│       │   ├── reportController.ts       # Performance summaries and CSV report generation
│       │   ├── scheduleController.ts     # Timetable CRUD, conflict detection, auto-solver
│       │   ├── scoreController.ts        # Score breakdown, category totals, benchmark calculation
│       │   └── workloadController.ts     # Workload aggregation against policy thresholds
│       ├── middlewares/                  # Intercepting Express middlewares
│       │   ├── auditLogger.ts            # Automatic request auditing for administrative operations
│       │   ├── authMiddleware.ts         # JWT token verification and user context hydration
│       │   ├── errorHandler.ts           # Centralized exception logging and JSON response formatting
│       │   ├── roleGuard.ts              # Strict role-based authorization gate (FACULTY/REVIEWER/ADMIN)
│       │   └── uploadMiddleware.ts       # Multer multipart form-data handler with file validation
│       ├── routes/                       # Express router definitions
│       │   ├── activityRoutes.ts         # /api/activities endpoints
│       │   ├── adminRoutes.ts            # /api/admin endpoints
│       │   ├── approvalRoutes.ts         # /api/approvals endpoints
│       │   ├── authRoutes.ts             # /api/auth endpoints
│       │   ├── reportRoutes.ts           # /api/reports endpoints
│       │   ├── scheduleRoutes.ts         # /api/schedules endpoints
│       │   ├── scoreRoutes.ts            # /api/scores endpoints
│       │   └── workloadRoutes.ts         # /api/workload endpoints
│       ├── services/                     # Core domain business logic engines
│       │   ├── auditService.ts           # Persistent audit record writer
│       │   ├── eventService.ts           # BullMQ + Redis event queue with in-memory fallback
│       │   ├── notificationService.ts    # In-app notification dispatcher and read tracker
│       │   ├── schedulingService.ts      # Constraint satisfaction engine and conflict detector
│       │   ├── scoringService.ts         # Transparent, explainable contribution score calculator
│       │   └── workloadService.ts        # Teaching + administrative workload calculator
│       ├── types/                        # Backend domain types and Express request augmentations
│       │   └── index.ts                  # Type definitions for auth, filters, scoring payloads
│       └── utils/                        # Shared utility functions
│           ├── db.ts                     # Prisma client singleton instance
│           └── validators.ts             # Zod input validation schemas for all API payloads
│
├── explanation.md                        # Complete technical and architectural explanation document
├── instructions.md                       # This installation, configuration, and execution guide
├── package.json                          # Monorepo root scripts orchestrating client and server
├── README.md                             # High-level repository overview and quickstart summary
└── start-services.bat                    # Windows double-click dual-service launcher
```

---

## 3. Initial Installation

Follow these steps sequentially to set up the project on your machine.

### Step 3.1: Navigate to Project Directory
Open your terminal (PowerShell, CMD, or Bash) and navigate to the root directory of the project:
```bash
cd fpis
```

### Step 3.2: Install Backend Dependencies
Navigate to the `server` folder and install all required Node.js packages:
```bash
cd server
npm install
```

### Step 3.3: Install Frontend Dependencies
Navigate to the `client` folder and install the frontend packages:
```bash
cd ../client
npm install
```

### Step 3.4: Configure Backend Environment Variables
Return to the `server` folder and create an active `.env` file from the provided template:

**On Windows (PowerShell):**
```powershell
cd ../server
Copy-Item .env.example .env
```

**On Linux / macOS / Git Bash:**
```bash
cd ../server
cp .env.example .env
```

### Step 3.5: Generate Prisma Client
Generate the type-safe Prisma database client code inside `server/node_modules/@prisma/client`:
```bash
npm run prisma:generate
```

### Step 3.6: Push Database Schema
Create the database tables and relations directly from `schema.prisma`:
```bash
npm run prisma:push
```

### Step 3.7: Seed Initial Demonstration Data
Populate the database with university departments, faculty profiles, mock activities, evidence attachments, workload policies, and timetable slots:
```bash
npm run prisma:seed
```

---

## 4. Environment Configuration

### Backend Environment Variables (`server/.env`)
The server uses `dotenv` to load runtime configuration from `server/.env`. Below is a breakdown of every variable:

| Variable Name | Default Value | Required? | Description & Purpose |
| :--- | :--- | :--- | :--- |
| `PORT` | `5000` | Yes | Network port on which the Express REST API listens. |
| `NODE_ENV` | `development` | Yes | Runtime environment (`development`, `test`, or `production`). |
| `DATABASE_URL` | `file:./dev.db` | Yes | Database connection string. Supports SQLite (`file:./dev.db`) or PostgreSQL (`postgresql://...`). |
| `JWT_SECRET` | `fpis-super-secure-jwt-secret...` | Yes | Cryptographic secret key used to sign and verify JSON Web Tokens. |
| `JWT_EXPIRES_IN` | `7d` | Yes | Lifespan of issued JWT tokens (e.g., `24h`, `7d`). |
| `REDIS_HOST` | `127.0.0.1` | No | Host address of Redis server for BullMQ background queues. |
| `REDIS_PORT` | `6379` | No | Port number of Redis server (standard default: `6379`). |
| `UPLOAD_DIR` | `./uploads` | Yes | Relative or absolute path where submitted evidence files are stored. |
| `MAX_FILE_SIZE` | `10485760` | Yes | Maximum permissible upload size in bytes (10485760 = 10 Megabytes). |

#### Sample Complete `server/.env` File
```env
# ====================================================================
# FPIS Backend Server Environment Configuration
# ====================================================================
PORT=5000
NODE_ENV=development

# Database Connection (Default: Local Zero-Config SQLite)
DATABASE_URL="file:./dev.db"

# For PostgreSQL (Uncomment and update when using PostgreSQL):
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fpis?schema=public"

# Authentication & Security
JWT_SECRET="fpis-super-secure-jwt-secret-key-2025-university-accreditation"
JWT_EXPIRES_IN="7d"

# Redis & Background Queue (Optional: In-memory fallback is active if unavailable)
REDIS_HOST="127.0.0.1"
REDIS_PORT=6379

# Evidence File Storage
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=10485760
```

### Frontend Configuration (`client/vite.config.ts`)
The React application running under Vite does not require mandatory client `.env` files during standard local development.

The development server includes built-in reverse-proxy forwarding inside [vite.config.ts](file:///client/vite.config.ts):
- Any request starting with `/api` is automatically proxied to `http://localhost:5000`.
- Any request starting with `/uploads` is automatically proxied to `http://localhost:5000`.

This eliminates Cross-Origin Resource Sharing (CORS) complications during development. If you wish to specify an explicit API endpoint, create `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 5. Database Setup

FPIS supports two database configurations:
1. **SQLite (Default):** Zero configuration, instantaneous setup, perfect for local development and grading.
2. **PostgreSQL:** High-concurrency enterprise setup, perfect for production and Docker deployments.

---

### Option A: SQLite Setup (Recommended for Immediate Local Use)
The repository is pre-configured to use SQLite out-of-the-box. No external database server needs to be installed or started.

1. Ensure `server/.env` contains:
   ```env
   DATABASE_URL="file:./dev.db"
   ```
2. Navigate to `server` and run:
   ```bash
   cd server
   npm run prisma:generate
   npm run prisma:push
   npm run prisma:seed
   ```
3. SQLite creates `server/prisma/dev.db` automatically.

---

### Option B: PostgreSQL Setup

If you prefer to run against a real PostgreSQL instance:

#### 1. Start PostgreSQL
You can run PostgreSQL locally or using Docker:

**Using Docker (Fastest):**
```bash
docker run --name fpis-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=fpis -p 5432:5432 -d postgres:16-alpine
```

**Using Local PostgreSQL Installation:**
Open `psql` or pgAdmin and create the database:
```sql
CREATE DATABASE fpis;
```

#### 2. Configure Database Connection String
Edit `server/.env` and set `DATABASE_URL`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fpis?schema=public"
```

#### 3. Switch Prisma to PostgreSQL Schema
The repository includes a dedicated PostgreSQL schema at `server/prisma/schema.postgresql.prisma`.

Copy the PostgreSQL schema over the active `schema.prisma`:
**Windows (PowerShell):**
```powershell
Copy-Item server/prisma/schema.postgresql.prisma server/prisma/schema.prisma
```
**Linux / macOS:**
```bash
cp server/prisma/schema.postgresql.prisma server/prisma/schema.prisma
```

#### 4. Run Migrations and Seed
```bash
cd server
npm run prisma:generate
npx prisma db push
npm run prisma:seed
```

---

### Verifying Database Setup with Prisma Studio
Prisma Studio provides a graphical interface in your browser to inspect database records:
```bash
cd server
npx prisma studio
```
Open **`http://localhost:5555`** to browse `User`, `FacultyProfile`, `Activity`, `ApprovalHistory`, `EvidenceAttachment`, and `WorkloadPolicy` tables.

---

## 6. Redis Setup & Background Queue

FPIS uses Redis alongside BullMQ for asynchronous background event processing (e.g., automated contribution score recalculations, email alerts, audit log archiving).

### Built-in Zero-Dependency Fallback
> [!NOTE]
> **Redis is NOT strictly mandatory for local development!**  
> The backend features an intelligent fallback mechanism implemented in `server/src/services/eventService.ts`. If Redis is not detected at `REDIS_HOST:REDIS_PORT`, the application outputs an informative notice and automatically routes events through a high-performance in-process `EventEmitter`. All features, including score recalculations and notifications, continue functioning seamlessly.

### Running Redis (Optional)

If you wish to test the production BullMQ queue with a real Redis server:

**Using Docker:**
```bash
docker run --name fpis-redis -p 6379:6379 -d redis:7-alpine
```

**Using Native Redis / WSL (Ubuntu):**
```bash
sudo service redis-server start
```

**Verify Redis is Running:**
```bash
redis-cli ping
# Expected response: PONG
```

---

## 7. Terminal Commands (Quick Reference)

Use these commands for specific tasks:

### Running Frontend Only
```bash
cd client
npm run dev
# Starts Vite dev server on http://localhost:5173
```

### Running Backend Only
**In Development Mode (TypeScript execution via `ts-node`):**
```bash
cd server
npm run dev
# Starts Express API on http://localhost:5000 with hot restart
```

**In Compiled Production Mode:**
```bash
cd server
npm run build
npm start
# Runs node dist/index.js on http://localhost:5000
```

### Running Database Services
**Prisma Studio (Web DB Inspector):**
```bash
cd server
npx prisma studio
```

**Re-push Database Schema:**
```bash
cd server
npm run prisma:push
```

**Re-seed Database:**
```bash
cd server
npm run prisma:seed
```

### Running Background Redis Queue
```bash
docker start fpis-redis
```

### Running Tests
**Backend Unit & Integration Tests (Vitest):**
```bash
cd server
npm test
```

**Frontend Component & Hook Tests (Vitest):**
```bash
cd client
npm test
```

**Run All Tests Across the Monorepo:**
```bash
# From project root:
npm test
```

### Building the Entire Application
```bash
# From project root:
npm run build
```

---

## 8. Running the Complete Project (Step-by-Step)

Follow this 12-step beginner-friendly walkthrough to get the complete system running from scratch:

```mermaid
flowchart TD
    S1["Step 1: Check Node.js (v18+)"] --> S2["Step 2: Open Terminal in fpis/"]
    S2 --> S3["Step 3: Install Server Packages (cd server && npm i)"]
    S3 --> S4["Step 4: Install Client Packages (cd client && npm i)"]
    S4 --> S5["Step 5: Setup server/.env"]
    S5 --> S6["Step 6: Generate Prisma Client (npm run prisma:generate)"]
    S6 --> S7["Step 7: Push DB Schema (npm run prisma:push)"]
    S7 --> S8["Step 8: Seed Mock Data (npm run prisma:seed)"]
    S8 --> S9["Step 9: Start Backend (cd server && npm run dev)"]
    S9 --> S10["Step 10: Start Frontend (cd client && npm run dev)"]
    S10 --> S11["Step 11: Open http://localhost:5173"]
    S11 --> S12["Step 12: Login with 1-Click Demo Accounts"]
```

### Step 1: Check Prerequisites
Verify that Node.js and npm are available:
```bash
node -v
npm -v
```

### Step 2: Open Project Root
```bash
cd fpis
```

### Step 3: Install Server Dependencies
```bash
cd server
npm install
```

### Step 4: Install Client Dependencies
```bash
cd ../client
npm install
```

### Step 5: Verify Environment File
```bash
cd ../server
# If .env does not exist:
copy .env.example .env
```

### Step 6: Generate Prisma Code
```bash
npm run prisma:generate
```

### Step 7: Push Database Schema
```bash
npm run prisma:push
```

### Step 8: Seed Initial University Data
```bash
npm run prisma:seed
```
*You will see terminal output indicating that departments, users, faculty profiles, activities, approvals, and schedules have been created.*

### Step 9: Start Backend Server
```bash
npm run dev
```
*Wait until you see:*
```text
[FPIS Server] REST API listening on port 5000
[FPIS Server] Environment: development
[FPIS Server] Event Bus: In-Memory / BullMQ Active
```

### Step 10: Start Frontend Client (in a New Terminal)
Open a second terminal window:
```bash
cd fpis/client
npm run dev
```
*Wait until you see:*
```text
  VITE v5.4.10  ready in 320 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Step 11: Open Application in Web Browser
Open your browser and navigate to:
**`http://localhost:5173`**

### Step 12: Log In & Verify Features
- Click any of the **Demo User Buttons** on the login screen (Faculty, Reviewer/HOD, Administrator).
- Verify the real-time dashboard calculations.
- Test creating an activity as Faculty, then switch to Reviewer to approve it, and observe the faculty score update instantly.

---

## 9. Terminal Split (Recommended Workflow)

For an organized local developer experience, we recommend dividing your work across **4 dedicated terminals**:

```text
┌──────────────────────────────────────┬──────────────────────────────────────┐
│  TERMINAL 1: Backend Server          │  TERMINAL 2: Frontend Client         │
│  cd server                           │  cd client                           │
│  npm run dev                         │  npm run dev                         │
│                                      │                                      │
│  > Express listening on port 5000    │  > Vite ready at http://localhost:5173│
├──────────────────────────────────────┼──────────────────────────────────────┤
│  TERMINAL 3: Redis / Docker          │  TERMINAL 4: DB & Tests Workspace    │
│  docker run -p 6379:6379 redis:7-alp │  cd server                           │
│  (Or monitor background event logs)  │  npx prisma studio                   │
│                                      │  npm test                            │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

### Exact Terminal Commands

#### Terminal 1: Backend Server (Port 5000)
```powershell
cd C:\Users\badmosh\.gemini\antigravity\scratch\fpis\server
npm run dev
```

#### Terminal 2: Frontend Client (Port 5173)
```powershell
cd C:\Users\badmosh\.gemini\antigravity\scratch\fpis\client
npm run dev
```

#### Terminal 3: Redis Queue (Port 6379) *(Optional)*
```powershell
docker run --name fpis-redis -p 6379:6379 redis:7-alpine
```

#### Terminal 4: Database Inspector & Testing Terminal
```powershell
cd C:\Users\badmosh\.gemini\antigravity\scratch\fpis\server
npx prisma studio
```

---

## 10. Application URLs

| Service / Interface | URL | Purpose / Description |
| :--- | :--- | :--- |
| **Frontend Web Application** | [http://localhost:5173](http://localhost:5173) | Primary user interface for Faculty, Reviewers, and Administrators. |
| **Backend REST API** | [http://localhost:5000/api](http://localhost:5000/api) | Root API base endpoint. |
| **API Health Check** | [http://localhost:5000/api/health](http://localhost:5000/api/health) | Returns JSON `{ status: "ok", timestamp: "..." }`. |
| **Prisma Studio** | [http://localhost:5555](http://localhost:5555) | Web GUI to view and edit database records directly. |
| **Uploaded Evidence Files** | [http://localhost:5000/uploads/evidence/...](http://localhost:5000/uploads) | Direct URL to access uploaded PDF and image documents. |

---

## 11. Demo Login Credentials

The database seeder initializes the system with realistic university personnel spanning multiple departments and roles. All pre-seeded accounts share the same password for testing convenience.

**Master Password for All Seeded Users:**  
```text
Password@123
```

### Seeded User Directory

| Role | Name & Title | Email Address | Department | Suggested Verification Workflow |
| :--- | :--- | :--- | :--- | :--- |
| **Faculty** | Dr. Sarah Jenkins<br>*(Associate Professor)* | `faculty.cs@fpis.edu` | Computer Science & Engineering | • View current workload (14 hrs/week)<br>• Review contribution score radar (78.5/100)<br>• Create an FDP or Mentoring activity<br>• Upload evidence file and submit for approval |
| **Faculty** | Dr. Alex Rivera<br>*(Assistant Professor)* | `faculty.alex@fpis.edu` | Computer Science & Engineering | • Inspect correction-requested activity<br>• Edit remarks and resubmit for review<br>• Check workload warnings and upcoming schedule |
| **Faculty** | Dr. Priya Sharma<br>*(Assistant Professor)* | `faculty.ece@fpis.edu` | Electronics & Communication Eng. | • Cross-department faculty verification<br>• Test isolation of departmental activities |
| **Reviewer** *(HOD)* | Dr. Robert Chen<br>*(Professor & HOD)* | `reviewer.cs@fpis.edu` | Computer Science & Engineering | • Open Reviewer Approvals Queue<br>• Filter submissions by category & status<br>• Approve with remarks or request corrections<br>• View departmental faculty performance roster |
| **Reviewer** *(HOD)* | Dr. Maria Santos<br>*(Professor & HOD)* | `reviewer.ece@fpis.edu` | Electronics & Communication Eng. | • Verify ECE department review isolation<br>• Confirm CSE submissions are not visible |
| **Administrator** | Dr. Eleanor Vance<br>*(Dean of Academic Affairs)* | `admin@fpis.edu` | Academic Affairs / University-Wide | • Open Admin Institutional Dashboard<br>• Configure Workload & Scoring Policies<br>• Run Smart Scheduling Conflict Auto-Solver<br>• Inspect Tamper-Evident Audit Logs<br>• Export institutional accreditation CSV reports |

> [!TIP]
> **1-Click Quick Login:**  
> The login screen at `http://localhost:5173/login` features quick-login buttons at the bottom. Clicking **"Faculty"**, **"Reviewer / HOD"**, or **"Administrator"** automatically fills in the credentials and logs you in instantly!

---

## 12. Troubleshooting Guide

### 1. `npm install` Fails or Shows Dependency Errors
- **Cause:** Corrupted npm cache, network timeouts, or Node version incompatibility.
- **Solution:**
  ```bash
  npm cache clean --force
  rm -rf node_modules package-lock.json
  npm install
  ```
  Ensure you are running Node.js 18.18.0 or newer (`node -v`).

---

### 2. Port 5000 or Port 5173 is Already in Use (`EADDRINUSE`)
- **Cause:** A previous instance of the server or client is still running in the background.
- **Solution (Windows PowerShell):**
  ```powershell
  # Find process running on port 5000:
  netstat -ano | findstr :5000
  # Stop the process by PID:
  Stop-Process -Id <PID> -Force

  # Or find and stop process on port 5173:
  netstat -ano | findstr :5173
  Stop-Process -Id <PID> -Force
  ```
- **Alternative:** Change `PORT=5001` in `server/.env` and update the proxy target in `client/vite.config.ts`.

---

### 3. PostgreSQL Connection Errors (`ECONNREFUSED` or `P1001`)
- **Cause:** PostgreSQL server is not running, credentials in `DATABASE_URL` are incorrect, or the target database does not exist.
- **Solution:**
  1. Verify the PostgreSQL service or Docker container is active:
     ```bash
     docker ps
     ```
  2. Verify your connection string in `server/.env`:
     ```env
     DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fpis?schema=public"
     ```
  3. Ensure the database `fpis` exists in PostgreSQL:
     ```bash
     psql -U postgres -c "CREATE DATABASE fpis;"
     ```
  4. If troubleshooting persists, switch back to SQLite in `server/.env`:
     ```env
     DATABASE_URL="file:./dev.db"
     ```

---

### 4. Redis Connection Errors (`ECONNREFUSED 127.0.0.1:6379`)
- **Cause:** Redis server is not installed or running.
- **Solution:**  
  You do **not** need to do anything! The FPIS server detects this condition and automatically switches to the in-memory event bus. You can safely ignore the Redis warning during development.  
  If you want to use Redis, launch the container:
  ```bash
  docker run -p 6379:6379 -d redis:7-alpine
  ```

---

### 5. Prisma Errors: "Table does not exist" or "Schema mismatch"
- **Cause:** Database schema has not been pushed, or the Prisma Client is out of sync with `schema.prisma`.
- **Solution:**
  ```bash
  cd server
  npx prisma generate
  npx prisma db push --accept-data-loss
  npm run prisma:seed
  ```

---

### 6. Missing Environment Variables Error
- **Cause:** The `server/.env` file was not created or `JWT_SECRET` is undefined.
- **Solution:**
  Ensure `server/.env` exists and contains at minimum:
  ```env
  PORT=5000
  NODE_ENV=development
  DATABASE_URL="file:./dev.db"
  JWT_SECRET="fpis-super-secure-jwt-secret-key-2025-university-accreditation"
  JWT_EXPIRES_IN="7d"
  ```

---

### 7. CORS or API Connection Issues in Browser
- **Cause:** Browsing to `http://localhost:5000` directly instead of the Vite client at `http://localhost:5173`, or the backend server is not running.
- **Solution:**
  1. Verify the backend is responding at `http://localhost:5000/api/health`.
  2. Ensure you access the application through Vite at `http://localhost:5173`.
  3. Ensure `client/vite.config.ts` includes proxy settings forwarding `/api` and `/uploads` to `http://localhost:5000`.

---

### 8. Backend TypeScript Compilation Errors
- **Cause:** Outdated build artifacts in `server/dist`.
- **Solution:**
  ```bash
  cd server
  # Clean build artifacts:
  rm -rf dist
  # Recompile TypeScript:
  npm run build
  ```

---

### 9. Login Fails with "Invalid credentials"
- **Cause:** Database was not seeded, or password was typed incorrectly.
- **Solution:**
  1. Remember all passwords are case-sensitive: `Password@123`.
  2. Re-run the seed script to reset all demo accounts:
     ```bash
     cd server
     npm run prisma:seed
     ```
  3. Use the 1-click demo login buttons on the login screen.

---

## 13. Development Commands

### Monorepo Root Scripts (`package.json`)
Run these from the root `fpis/` directory:

| Command | Action |
| :--- | :--- |
| `npm run dev:server` | Start backend in development mode with `ts-node`. |
| `npm run dev:client` | Start frontend in development mode with Vite. |
| `npm run build:server` | Compile server TypeScript code into `server/dist`. |
| `npm run build:client` | Compile and bundle frontend React code into `client/dist`. |
| `npm run build` | Compile both backend and frontend for production. |
| `npm run test:server` | Execute backend Vitest test suite. |
| `npm run test:client` | Execute frontend Vitest test suite. |
| `npm test` | Execute all test suites across the monorepo. |
| `npm run prisma:generate` | Generate Prisma client bindings in `server/`. |
| `npm run prisma:push` | Push Prisma schema changes directly to the active database. |
| `npm run prisma:seed` | Seed initial database records from `server/prisma/seed.ts`. |
| `npm start` | Launch compiled production server (`node server/dist/index.js`). |

### Windows Convenience Script (`start-services.bat`)
Double-click `start-services.bat` in the project root to open two command prompt windows that build and start both the backend API and frontend client simultaneously.

---

## 14. Shutting Down the Application

To cleanly stop the FPIS system:

### 1. Stopping Interactive Terminals
In each open terminal window (Backend, Frontend, Prisma Studio):
- Press **`Ctrl + C`** (or `Cmd + C` on macOS).
- When prompted `Terminate batch job (Y/N)?`, type **`Y`** and press **Enter**.

### 2. Stopping Background Docker Containers
If you ran PostgreSQL or Redis via Docker:
```bash
# Stop containers:
docker stop fpis-postgres fpis-redis

# Optional: Remove containers (data in volumes remains intact):
docker rm fpis-postgres fpis-redis
```

### 3. Killing Orphaned Background Processes (Windows)
If a process failed to close and continues holding port 5000 or 5173:
```powershell
# Terminate Node processes:
taskkill /F /IM node.exe
```

---

## 15. Production Deployment (High-Level Overview)

To deploy FPIS to a production server (Ubuntu Linux / AWS EC2 / DigitalOcean / Docker):

### 1. Build Both Applications
```bash
# In server directory:
cd server
npm ci --only=production=false
npm run build

# In client directory:
cd ../client
npm ci
npm run build
```

### 2. Configure Production Environment Variables
Create a production `.env` in `server/`:
```env
PORT=5000
NODE_ENV=production
DATABASE_URL="postgresql://fpis_user:StrongPassword123!@db-host:5432/fpis_prod?schema=public&sslmode=prefer"
JWT_SECRET="a-very-long-cryptographically-secure-random-string-at-least-64-chars"
JWT_EXPIRES_IN="1d"
REDIS_HOST="redis-host"
REDIS_PORT=6379
UPLOAD_DIR="/var/www/fpis/uploads"
MAX_FILE_SIZE=10485760
```

### 3. Run Database Migrations in Production
```bash
cd server
npx prisma migrate deploy
```

### 4. Process Management with PM2
Use PM2 to run the backend as a reliable, auto-restarting daemon:
```bash
# Install PM2 globally:
npm install -g pm2

# Start server:
pm2 start dist/index.js --name "fpis-api" --instances max --exec-mode cluster
pm2 save
pm2 startup
```

### 5. Reverse Proxy Configuration with Nginx
Configure Nginx to serve the compiled frontend static files from `client/dist`, route API requests to PM2, and manage SSL certificates:

```nginx
server {
    listen 80;
    server_name fpis.your-institution.edu;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name fpis.your-institution.edu;

    ssl_certificate /etc/letsencrypt/live/fpis.your-institution.edu/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fpis.your-institution.edu/privkey.pem;

    # Client Single-Page Application (SPA)
    location / {
        root /var/www/fpis/client/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend REST API Reverse Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Uploaded Evidence File Serving
    location /uploads/ {
        proxy_pass http://127.0.0.1:5000/uploads/;
        proxy_set_header Host $host;
        proxy_cache_valid 200 1d;
        client_max_body_size 15M;
    }
}
```

---

*End of FPIS Installation and Execution Guide.*
