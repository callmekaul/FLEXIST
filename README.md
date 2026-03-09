# Flexist

A fitness tracking and gym management platform that helps you plan workouts, track progress, and stay consistent.

## What You Can Do

### As a Client

- **Weekly Workout Plans** — Create or AI-generate personalized 7-day workout plans tailored to your skill level and goals. Every new account gets a beginner-friendly starter plan.
- **Log Workouts** — Tap "Log Workout" on any day of your plan, track sets, reps, and weight in real time. Your logged history is independent of the plan — edit exercises freely during a session.
- **Weekly Diet Plans** — AI-generate meal plans based on your body stats, activity level, calorie targets, and dietary restrictions. Optionally link a workout plan for smarter recommendations.
- **Track Progress** — Log body measurements (weight, height, bicep, chest, waist, hip, thigh, and more) and visualize trends over time with charts.
- **AI Analysis** — Get an AI-powered breakdown of your progress including strength trends, body composition changes, and injury-aware recommendations.
- **Muscle Map** — Visual front/back body map highlighting which muscles you've trained recently and how intensely.
- **Leaderboard** — Compete globally or within your gym. Filter by exercise, category (max weight, total volume, total reps), and time period.
- **Gym Membership** — Join a gym to access gym-specific leaderboards, see available equipment, and connect with other members.

### As a Gym Owner

- **Register Your Gym** — Set up your gym with name, location, and contact details.
- **Custom Branding** — Personalize your gym's theme with custom colors that your members see.
- **Equipment Management** — List all your gym's equipment with quantities so members know what's available.
- **Member Management** — View and manage your gym's member list.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, Tailwind CSS, shadcn/ui |
| Backend | FastAPI, SQLModel, PostgreSQL |
| Auth | Supabase |
| AI | OpenAI (via LangChain) |
| Hosting | Vercel (frontend), Render (backend) |

## Setup

1. Clone the repo
2. Copy `.env.example` and create:
   - `backend/.env.local` with your database, Supabase, and OpenAI keys
   - `frontend/.env.local` with your API URL and Supabase public keys
3. Start the backend:
   ```
   cd backend
   pip install .
   alembic upgrade head
   uvicorn app.main:app --reload
   ```
4. Start the frontend:
   ```
   cd frontend
   npm install
   npm run dev
   ```
5. Open `http://localhost:3000`
