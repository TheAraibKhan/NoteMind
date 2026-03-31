# NoteMind

An AI-powered study app that turns a topic into notes, quizzes, flashcards, and progress tracking.

## What it does

- 📝 Generates structured notes for a topic
- 🎯 Builds quiz questions to test understanding
- 🔁 Creates flashcards for revision
- 📊 Tracks accuracy, weak areas, and study streaks
- 🔐 Supports JWT-based authentication

## Stack

- Frontend: Next.js, TypeScript, Tailwind CSS, Framer Motion
- Backend: Express, TypeScript, MongoDB, Mongoose
- AI: OpenAI with a Wikipedia fallback when AI is unavailable

## Project structure

```text
frontend/   Next.js client app
backend/    Express API and database layer
```

Helpful docs:

- 📘 [QUICK_START.md](./QUICK_START.md)
- 🧱 [ARCHITECTURE.md](./ARCHITECTURE.md)
- 📚 [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md)
- 🗂️ [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)

## Local setup

### Backend

```bash
cd backend
npm install
npm run dev
```

Create `backend/.env` with values like:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.0-flash
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Main flows

- `/notebook` generates and saves notes
- `/quiz` generates quizzes and stores results in progress
- `/flashcards` creates card sets and tracks mastery
- `/dashboard` shows learning stats
- `/library` helps users revisit saved material

## API overview

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/verify`
- `POST /notes/generate`
- `GET /notes`
- `POST /quiz/generate`
- `POST /quiz/:quizId/submit`
- `GET /progress`
- `POST /flashcards/generate`

## Behavior notes

- 🤖 If OpenAI is configured and available, the app uses structured AI responses.
- 🆓 If OpenAI fails or quota is unavailable, the app falls back to free reference-based generation.
- ✅ User-owned content is protected with auth checks on read, update, and delete flows.

## Good next improvements

- add automated controller and service tests
- paginate notes and flashcards
- expand quiz review with question-by-question feedback
- refine analytics visuals on the dashboard

## License

Use this as a learning project, portfolio piece, or base for a fuller EdTech app.
