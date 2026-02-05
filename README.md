# WorkLoop - Remote Team Work Tracking MVP

**Tech Stack**: Next.js 14 + Node.js + Express + MongoDB + TypeScript

## Project Structure

```
workloop/
├── frontend/          # Next.js 14 application (App Router)
├── backend/           # Express API server
└── README.md
```

## Setup Instructions

### 1. Install Dependencies

**Frontend**:
```bash
cd frontend
npm install
```

**Backend**:
```bash
cd backend
npm install
```

### 2. Environment Variables

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Backend** (`backend/.env`):
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/workloop-dev
JWT_SECRET=your-super-secret-jwt-key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:3000
```

### 3. Run Development Servers

**Backend** (Terminal 1):
```bash
cd backend
npm run dev
```
Server runs on `http://localhost:5000`

**Frontend** (Terminal 2):
```bash
cd frontend
npm run dev
```
App runs on `http://localhost:3000`

### 4. Verify Setup

- Backend health check: `http://localhost:5000/health`
- Frontend: `http://localhost:3000`

## Current Status

✅ **Phase 1 Complete**: Project Setup & Foundation
- Next.js 14 frontend initialized
- Express backend initialized
- MongoDB models created (Organization, User)
- Development environment configured

⏳ **Next**: Phase 2 - Authentication System (JWT)

## Database Models

- **Organization**: Multi-tenant organization data
- **User**: Team members with embedded integrations (GitHub, Google Calendar)

## Tech Decisions

- **Monorepo**: Frontend + Backend in same repo
- **TypeScript**: Type safety across stack
- **MongoDB**: Flexible schema for integrations
- **JWT**: Access + refresh token authentication
- **BullMQ**: Background job queue (GitHub sync, PDF generation)
