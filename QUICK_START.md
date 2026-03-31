# NoteMind - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Clone & Setup

```bash
# Frontend
cd frontend
npm install
echo 'NEXT_PUBLIC_API_URL=http://localhost:5000/api' > .env.local

# Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
```

### Step 2: Start Development Servers

**Terminal 1 - Backend:**

```bash
cd backend
npm run dev
# Runs on http://localhost:5000
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

### Step 3: Access Application

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Essential Environment Variables

### Backend (.env)

```
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/notemind
JWT_SECRET=your_secure_key_here
GEMINI_API_KEY=AIzaSy...
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env.local)

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## 📚 Key Features to Try

### 1. Generate Notes

- Click on home page input
- Type a topic: "Database Normalization"
- Click "Generate Notes"
- See structured study notes

### 2. Take a Quiz

- Navigate to Quiz page
- Start quiz
- Answer 10 questions
- View your accuracy

### 3. Flashcard Study

- Go to Flashcards page
- Click cards to flip
- Mark as mastered
- Track progress

### 4. View Dashboard

- Dashboard shows analytics
- See weak topics
- Track learning streak
- View accuracy charts

### 5. Save Notes

- All generated notes auto-save
- Access via Library
- Search and filter
- Download for later

---

## 🛠️ Common Tasks

### Add a New API Endpoint

**1. Backend - Create Route:**

```typescript
// src/routes/example.ts
import express from "express";
import * as controller from "@/controllers/example";
import { authMiddleware } from "@/middleware/auth";

const router = express.Router();
router.post("/create", authMiddleware, controller.create);
export default router;
```

**2. Add to Server:**

```typescript
import exampleRoutes from "./routes/example";
app.use("/api/example", exampleRoutes);
```

**3. Frontend - Use API:**

```typescript
import { api } from "@/utils/api";

const { data } = await api.post("/example/create", { data });
```

### Deploy to Production

**Frontend (Vercel):**

```bash
cd frontend
vercel deploy --prod
```

**Backend (Render):**

1. Push to GitHub
2. Create Web Service on Render
3. Connect repo
4. Set environment variables
5. Deploy

---

## 🐛 Troubleshooting

### MongoDB Connection Error

```
Error: connect ECONNREFUSED
```

**Solution:** Check MONGODB_URI in .env is correct

### CORS Error

```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution:** Ensure CORS_ORIGIN matches frontend URL

### Port Already in Use

```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9
```

### Token Expired

Log in again to get a new token

---

## 📁 Project Structure at a Glance

```
NoteMind/
├── frontend/          # Next.js React app
│   ├── src/
│   │   ├── pages/    # Routes
│   │   ├── components/ # React components
│   │   └── utils/    # Helpers
│   └── package.json
│
└── backend/          # Express API
    ├── src/
    │   ├── routes/   # API endpoints
    │   ├── models/   # MongoDB schemas
    │   ├── controllers/ # Business logic
    │   └── services/ # AI integration
    └── package.json
```

---

## 🎯 Next Steps

1. **Integrate OpenAI API**
   - Get API key from openai.com
   - Add to .env
   - Uncomment OpenAI service code

2. **Deploy**
   - Deploy frontend to Vercel
   - Deploy backend to Render
   - Add production env vars

3. **Add Features**
   - Email notifications
   - User profiles
   - Study groups
   - Mobile app

4. **Optimize**
   - Add caching (Redis)
   - Implement CDN
   - Database indexing
   - API rate limiting

---

## 🔗 Useful Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Express Docs](https://expressjs.com/)
- [MongoDB Docs](https://docs.mongodb.com/)
- [OpenAI API](https://platform.openai.com/)
- [TailwindCSS](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)

---

## ✅ Deployment Checklist

- [ ] All environment variables set
- [ ] Database migration completed
- [ ] API keys configured
- [ ] Error handling tested
- [ ] CORS configured
- [ ] Rate limiting enabled
- [ ] Security headers added
- [ ] Logging configured
- [ ] Backup strategy planned
- [ ] Monitoring alerts set

---

Happy Learning! 🎓
