# NextZen Learner

AI-powered student improvement platform with:
- React (Vite) + Tailwind UI
- Node + Express + MongoDB (Mongoose)
- Simple session-based auth (no JWT)

## Folder Structure
- `client/` - frontend
- `server/` - backend

## Prerequisites
- Node.js 18+
- MongoDB running

## Backend Setup (`server/`)
1. Create an environment file:
   - Copy `server/env.example` → `server/.env`
   - Update `MONGODB_URI` and `SESSION_SECRET`
2. Install deps:
   - `cd server && npm install`
3. Start server:
   - `npm run dev`
4. Server runs on:
   - `http://localhost:5000`

## Frontend Setup (`client/`)
1. Install deps:
   - `cd client && npm install`
2. Start Vite dev server:
   - `npm run dev`
3. Frontend runs on:
   - `http://localhost:5173`

## How to Use
1. Open `http://localhost:5173`
2. Click **Get Started** (multi-step onboarding)
3. You’ll be redirected to the dashboard
4. Explore:
   - **Roadmaps** (predefined + custom generator)
   - **AI Teacher** (simulated chatbot)
   - **Tasks** (daily checklist)
   - **Community** (static join buttons)
   - **Profile**

## API Quick Notes
Authentication uses cookies/sessions:
- `POST /api/auth/register` (creates a user + starts session)
- `POST /api/auth/login` (starts session)
- `GET /api/auth/me` (fetch profile)

Protected routes require being logged in:
- Roadmaps, Tasks, AI Teacher

