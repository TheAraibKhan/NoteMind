# NoteMind - AI-Powered Active Learning Platform

> **From Notes to Mastery** — Transform the way students learn through intelligent note generation, adaptive quizzes, and data-driven insights.

## 🎯 Project Overview

NoteMind is a production-grade EdTech platform that revolutionizes how students approach learning. Unlike generic AI chat systems, NoteMind creates a complete learning ecosystem by:

- **AI-Generated Structured Notes** - Converts topics into comprehensive, well-organized study material
- **Adaptive Quiz System** - Auto-generates quizzes from notes and adapts based on performance
- **Interactive Flashcards** - Creates spaced-repetition flashcards for efficient memorization
- **Learning Dashboard** - Tracks progress, identifies weak topics, and recommends revision
- **Smart Analytics** - Monitors quiz accuracy, learning streaks, and performance trends

## 📋 Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Frontend Structure](#frontend-structure)
- [Backend Structure](#backend-structure)
- [Database Schema](#database-schema)
- [API Routes](#api-routes)
- [Setup & Installation](#setup--installation)
- [Environment Configuration](#environment-configuration)
- [Development Guide](#development-guide)
- [Deployment Guide](#deployment-guide)
- [Features & Implementation](#features--implementation)
- [Scalability Strategies](#scalability-strategies)

---

## 🛠️ Tech Stack

### Frontend

- **Framework**: Next.js 14 (React)
- **Styling**: TailwindCSS
- **Animations**: Framer Motion
- **Charts**: Recharts
- **HTTP Client**: Axios
- **State Management**: Zustand
- **Notifications**: React Hot Toast

### Backend

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB Atlas (Cloud)
- **Authentication**: JWT
- **AI Integration**: OpenAI GPT-4 / Google Gemini
- **Password Hashing**: bcryptjs
- **Security**: Helmet, CORS

### DevOps & Deployment

- **Frontend Hosting**: Vercel
- **Backend Hosting**: Render / Railway / Cloud Run
- **Database**: MongoDB Atlas
- **CI/CD**: GitHub Actions
- **Package Manager**: npm / yarn

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│          Browser / Client Layer                  │
│  (Next.js Frontend - SPA with animations)        │
└────────────────┬────────────────────────────────┘
                 │
                 │ HTTP/REST
                 │
┌────────────────▼────────────────────────────────┐
│      API Gateway & Express.js Server             │
│  (Authentication, Rate Limiting, CORS)           │
└────────────────┬────────────────────────────────┘
                 │
       ┌─────────┴─────────┐
       │                   │
┌──────▼──────┐    ┌──────▼──────┐
│  Controllers │    │  AI Service  │
│  & Routes    │    │  Layer       │
└──────┬──────┘    └──────┬──────┘
       │                   │
┌──────▼──────────────────▼──────┐
│    Business Logic Layer         │
│  (Progress Tracking, Notes      │
│   Generation, Quiz Creation)    │
└──────┬──────────────────────────┘
       │
┌──────▼──────────────────────────┐
│    MongoDB Database              │
│  (Users, Notes, Quizzes,        │
│   Progress, Flashcards)         │
└─────────────────────────────────┘
```

---

## 📁 Frontend Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ParticleBackground.tsx      # Animated particle effect
│   │   ├── CursorGlow.tsx              # Custom cursor glow
│   │   ├── ScrollProgress.tsx          # Top progress bar
│   │   ├── Navbar.tsx                  # Navigation bar
│   │   ├── GlassCard.tsx               # Reusable glass card component
│   │   ├── GradientButton.tsx          # Animated gradient button
│   │   ├── TopicInput.tsx              # Topic search/input component
│   │   ├── QuizCard.tsx                # Quiz question card
│   │   ├── Flashcard.tsx               # 3D flip flashcard
│   │   └── DashboardWidget.tsx         # Dashboard stat widget
│   │
│   ├── pages/
│   │   ├── index.tsx                   # Landing page (Hero)
│   │   ├── notebook.tsx                # Notes generation page
│   │   ├── quiz.tsx                    # Quiz interface
│   │   ├── flashcards.tsx              # Flashcard study
│   │   ├── dashboard.tsx               # Learning dashboard
│   │   ├── library.tsx                 # Saved notes library
│   │   ├── _app.tsx                    # App wrapper
│   │   └── _document.tsx               # HTML document
│   │
│   ├── styles/
│   │   └── globals.css                 # Global styles & animations
│   │
│   └── utils/
│       ├── api.ts                      # Axios API client
│       └── hooks/                      # Custom React hooks
│
├── public/
│   └── favicon.ico
├── tailwind.config.js
├── next.config.js
├── tsconfig.json
└── package.json
```

### Key Frontend Features

| Component          | Purpose                         | Tech                    |
| ------------------ | ------------------------------- | ----------------------- |
| ParticleBackground | Animated particles using Canvas | HTML5 Canvas            |
| Quiz Card          | Interactive MCQ with feedback   | Framer Motion           |
| Flashcard          | 3D flip animation               | Framer Motion (rotateY) |
| Dashboard          | Analytics with charts           | Recharts                |
| Navbar             | Responsive navigation           | TailwindCSS             |

---

## 📦 Backend Structure

```
backend/
├── src/
│   ├── index.ts                        # Express server setup
│   │
│   ├── controllers/
│   │   ├── auth.ts                    # Auth logic (register, login, verify)
│   │   ├── notes.ts                   # Notes CRUD & generation
│   │   ├── quiz.ts                    # Quiz creation & submission
│   │   ├── progress.ts                # Progress tracking & analytics
│   │   └── flashcards.ts              # Flashcard management
│   │
│   ├── routes/
│   │   ├── auth.ts                    # Auth endpoints
│   │   ├── notes.ts                   # Notes endpoints
│   │   ├── quiz.ts                    # Quiz endpoints
│   │   ├── progress.ts                # Progress endpoints
│   │   └── flashcards.ts              # Flashcard endpoints
│   │
│   ├── models/
│   │   ├── User.ts                    # User schema + password hashing
│   │   ├── Note.ts                    # Notes schema
│   │   ├── Quiz.ts                    # Quiz questions schema
│   │   ├── Progress.ts                # User progress tracking
│   │   └── Flashcard.ts               # Flashcard sets schema
│   │
│   ├── middleware/
│   │   └── auth.ts                    # JWT verification
│   │
│   ├── services/
│   │   └── aiService.ts               # OpenAI integration
│   │
│   └── config/
│       └── database.ts                # MongoDB connection
│
├── .env.example                        # Environment template
├── tsconfig.json
├── package.json
└── README.md
```

---

## 🗄️ Database Schema

### Users Collection

```json
{
  "_id": ObjectId,
  "name": "John Doe",
  "email": "john@example.com",
  "password": "hashed_password",
  "createdAt": ISODate,
  "updatedAt": ISODate
}
```

### Notes Collection

```json
{
  "_id": ObjectId,
  "topic": "Database Normalization",
  "userId": ObjectId,
  "content": {
    "definition": "...",
    "keyConcepts": ["...", "..."],
    "importantPoints": ["...", "..."],
    "examples": ["...", "..."],
    "examHighlights": ["...", "..."]
  },
  "sections": 5,
  "createdAt": ISODate,
  "updatedAt": ISODate
}
```

### Quiz Collection

```json
{
  "_id": ObjectId,
  "topic": "Database Normalization",
  "userId": ObjectId,
  "noteId": ObjectId,
  "questions": [
    {
      "question": "What is normalization?",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "..."
    }
  ],
  "createdAt": ISODate
}
```

### Progress Collection

```json
{
  "_id": ObjectId,
  "userId": ObjectId,
  "topic": "Database Normalization",
  "quizzesTaken": 3,
  "averageAccuracy": 85.5,
  "attempts": [
    {
      "score": 8,
      "totalQuestions": 10,
      "date": ISODate,
      "accuracy": 80
    }
  ],
  "lastAttemptDate": ISODate,
  "weakTopic": false,
  "createdAt": ISODate
}
```

### Flashcards Collection

```json
{
  "_id": ObjectId,
  "topic": "Database Normalization",
  "userId": ObjectId,
  "noteId": ObjectId,
  "cards": [
    {
      "front": "What is 1NF?",
      "back": "First Normal Form...",
      "mastered": false
    }
  ],
  "createdAt": ISODate
}
```

---

## 🔌 API Routes

### Authentication

```
POST   /api/auth/register          - Register new user
POST   /api/auth/login             - Login user
GET    /api/auth/verify            - Verify token (protected)
```

### Notes

```
POST   /api/notes/generate         - Generate notes from topic (protected)
GET    /api/notes                  - Get all notes (protected)
GET    /api/notes/:id              - Get specific note (protected)
DELETE /api/notes/:id              - Delete note (protected)
```

### Quiz

```
POST   /api/quiz/generate          - Generate quiz (protected)
POST   /api/quiz/:quizId/submit    - Submit quiz answers (protected)
GET    /api/quiz/:id               - Get quiz (protected)
```

### Progress

```
GET    /api/progress               - Get all progress (protected)
GET    /api/progress/topic/:topic  - Get specific topic progress (protected)
GET    /api/progress/weak-topics   - Get weak topics (protected)
GET    /api/progress/streak        - Get learning streak (protected)
```

### Flashcards

```
POST   /api/flashcards/generate    - Generate flashcards (protected)
GET    /api/flashcards             - Get all flashcards (protected)
PATCH  /api/flashcards/:id/card/:idx - Update card mastery (protected)
```

---

## 🚀 Setup & Installation

### Prerequisites

- Node.js 18+
- MongoDB Atlas account
- OpenAI API key
- npm or yarn

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_NAME=NoteMind
EOF

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

The frontend will run on `http://localhost:3000`

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/notemind
JWT_SECRET=your_super_secret_key_here_change_this_in_production
OPENAI_API_KEY=sk-xxxxxx...
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
EOF

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

The backend will run on `http://localhost:5000`

---

## 🔐 Environment Configuration

### Frontend (.env.local)

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_NAME=NoteMind
```

### Backend (.env)

```
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/notemind

# Authentication
JWT_SECRET=change_this_to_secure_random_string

# AI Service
OPENAI_API_KEY=sk-xxxxxxxx

# CORS
CORS_ORIGIN=http://localhost:3000
```

---

## 👨‍💻 Development Guide

### Running Full Stack

**Terminal 1 - Backend:**

```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000`

### Code Standards

- **TypeScript**: Strict typing enabled
- **Naming**: camelCase for variables, PascalCase for components/classes
- **Components**: Functional components with hooks
- **Error Handling**: Try-catch with meaningful messages
- **Comments**: JSDoc for complex logic

### Git Workflow

```bash
git checkout -b feature/feature-name
git add .
git commit -m "feat: description of change"
git push origin feature/feature-name
```

---

## 🌐 Deployment Guide

### Deploy Frontend to Vercel

```bash
cd frontend

# Connect to Vercel
vercel login
vercel link

# Configure environment variables in Vercel dashboard
# NEXT_PUBLIC_API_URL=https://api.noteMind.com

# Deploy
vercel deploy --prod
```

### Deploy Backend to Render/Railway

**Using Render:**

1. Push code to GitHub
2. Create new Web Service on Render
3. Connect GitHub repository
4. Set environment variables
5. Deploy

**Environment Variables for Production:**

```
PORT=10000
MONGODB_URI=mongodb+srv://prod:pass@prod-cluster.mongodb.net/notemind
JWT_SECRET=your_production_secret_key
OPENAI_API_KEY=sk-prod-xxxxx
NODE_ENV=production
CORS_ORIGIN=https://your-frontend.vercel.app
```

---

## ✨ Features & Implementation

### 1. AI Notes Generator

**Flow:**

```
User Input (Topic)
    ↓
API Request to /api/notes/generate
    ↓
OpenAI GPT-4 Response
    ↓
Parse & Structure Content
    ↓
Save to MongoDB
    ↓
Display in React Components
```

**Prompt Engineering:**

```typescript
const notePrompt = `Create comprehensive study notes on ${topic}.
Include:
1. Definition (150 words max)
2. Key Concepts (5-7 points)
3. Important Points (5-7 bullet points)
4. Examples (3-4 real-world examples)
5. Exam-Oriented Highlights

Return as JSON.`;
```

### 2. Quiz Generation & Tracking

**Questions Generated:** 5-10 MCQs per topic
**Feedback:** Immediate correctness indication + explanation
**Progress Tracking:** Accuracy stored → Weak topic identification

**Weak Topic Logic:**

```typescript
if (averageAccuracy < 70) {
  topic.weakTopic = true;
  // Recommend additional revision
}
```

### 3. Flashcard System

**Features:**

- Front/Back card design
- 3D flip animation
- Mastery tracking
- Spaced repetition ready

**Spaced Repetition Algorithm (Future):**

```
Show card immediately
Review after 1 day (if not mastered)
Review after 3 days
Review after 7 days
Review after 15 days
```

### 4. Learning Dashboard

**Metrics:**

- Total topics studied
- Average quiz accuracy across all topics
- Learning streak (consecutive days practicing)
- Weak topics requiring revision
- Weekly progress chart
- Accuracy per topic bar chart

### 5. Adaptive Learning

**System Logic:**

1. Track performance on each topic
2. If accuracy < 70% → Mark as weak
3. Recommend revision quizzes
4. Generate additional focused flashcards

---

## 📊 Scalability Strategies

### Database Optimization

1. **Indexing:**

```typescript
// Added to models
noteSchema.index({ userId: 1, topic: 1 });
progressSchema.index({ userId: 1, weakTopic: 1 });
```

2. **Pagination:**

```typescript
router.get("/notes", async (req, res) => {
  const page = req.query.page || 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const notes = await Note.find({ userId }).skip(skip).limit(limit);
});
```

3. **Caching (Redis):**

```typescript
// Cache frequently accessed data
const cacheKey = `user_${userId}_progress`;
let progress = await redis.get(cacheKey);
if (!progress) {
  progress = await Progress.find({ userId });
  await redis.set(cacheKey, progress, "EX", 3600);
}
```

### API Scalability

1. **Rate Limiting:**

```typescript
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use("/api/", limiter);
```

2. **Load Balancing:**

- Use Nginx for load distribution
- Deploy multiple backend instances
- Use MongoDB connection pooling

3. **CDN for Static Assets:**

- Serve images/fonts via Cloudflare
- Next.js static optimization
- Image optimization via Vercel

### Cloud Infrastructure

1. **Horizontal Scaling:**

```
Docker Container Orchestration
├─ Multiple Express instances
├─ Load Balancer
├─ MongoDB Atlas (auto-sharding)
└─ Redis Cluster for caching
```

2. **Microservices Architecture (Future):**

```
API Gateway
├─ Auth Service
├─ Notes Service
├─ Quiz Service
├─ Analytics Service
└─ AI Service
```

---

## 🎓 Learning Experience Improvements

### 1. Smart Content Sequencing

- Suggest topics based on difficulty
- Connect related concepts
- Build learning paths

### 2. Spaced Repetition

- Auto-schedule reviews
- Adjust frequency based on performance
- Optimize long-term retention

### 3. Interleaving

- Mix different topics in quizzes
- Prevents over-specialization
- Improves transfer learning

### 4. Knowledge Linking

```
[Database Design]
    ↓
[Normalization] → [ACID Properties] → [Indexing]
    ↓
[Query Optimization]
```

---

## 📝 API Response Examples

### Generate Notes Response

```json
{
  "id": "507f1f77bcf86cd799439011",
  "topic": "Database Normalization",
  "content": {
    "definition": "...",
    "keyConcepts": ["1NF", "2NF", "3NF"],
    "importantPoints": [...],
    "examples": [...],
    "examHighlights": [...]
  },
  "sections": 5
}
```

### Quiz Submission Response

```json
{
  "score": 8,
  "totalQuestions": 10,
  "accuracy": 80,
  "strengths": ["Normalization concepts"],
  "improvements": ["ACID properties"]
}
```

### Progress Response

```json
{
  "stats": {
    "totalTopics": 12,
    "averageAccuracy": 82.5,
    "totalQuizzes": 47,
    "weakTopics": ["OS Deadlock", "Network Protocols"]
  },
  "progress": [...]
}
```

---

## 🐛 Debugging & Monitoring

### Logging Best Practices

```typescript
console.log(`[${new Date().toISOString()}] Info: User login`);
console.error(`[ERROR] Database connection failed:`, err);
```

### Health Monitoring

```bash
GET /api/health
{
  "status": "OK",
  "timestamp": "2024-03-10T10:30:00Z",
  "database": "connected",
  "ai_service": "available"
}
```

---

## 📞 Support & Maintenance

### Regular Tasks

- Update dependencies monthly
- Monitor MongoDB storage
- Review error logs
- Analyze user behavior

### Security Updates

- Keep Node.js updated
- Update auth tokens
- Monitor for vulnerabilities
- Regular security audits

---

## 📄 License & Credits

**NoteMind** - AI-Powered Learning Platform
Created as a production-grade EdTech solution.

---

**Happy Learning! 🎓**

From Notes to Mastery.
