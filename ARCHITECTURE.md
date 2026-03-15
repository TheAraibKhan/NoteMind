# NoteMind - System Architecture & Design

## 🏗️ Complete System Diagram

```
┌─────────────────────────────────────────────────────┐
│              CLIENT LAYER (Browser)                  │
│  ┌──────────────────────────────────────────────┐  │
│  │  Next.js React Application (SPA)             │  │
│  │  • Pages: Home, Notebook, Quiz, Flashcards   │  │
│  │  • Components: GlassCard, Buttons, Navbar   │  │
│  │  • Animations: Framer Motion, Canvas          │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS/REST
                     │
┌────────────────────▼────────────────────────────────┐
│            API GATEWAY & MIDDLEWARE                  │
│  ┌──────────────────────────────────────────────┐  │
│  │  • CORS Handling                             │  │
│  │  • Request Logging                           │  │
│  │  • Rate Limiting (Ready)                     │  │
│  │  • Body Parser                               │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
┌──────▼──┐  ┌──────▼──┐  ┌──────▼──┐
│  Auth   │  │  Notes  │  │  Quiz   │
│ Routes  │  │ Routes  │  │ Routes  │
└──────┬──┘  └──────┬──┘  └──────┬──┘
       │            │            │
┌──────▼─────────────▼────────────▼──────┐
│         MIDDLEWARE LAYER               │
│  ┌──────────────────────────────────┐  │
│  │  Auth Middleware (JWT Verify)    │  │
│  │  Error Handling                  │  │
│  │  Type Validation                 │  │
│  └──────────────────────────────────┘  │
└──────────────────┬─────────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
┌──────▼──┐  ┌────▼──┐  ┌───▼───┐
│ Auth    │  │ Notes │  │ Quiz  │
│Controller│  │Controller│Controller│
└──────┬──┘  └────┬──┘  └───┬───┘
       │         │         │
┌──────▼─────────▼─────────▼────┐
│   SERVICE LAYER               │
│  ┌──────────────────────────┐ │
│  │  AI Service              │ │
│  │  • generateNotesContent  │ │
│  │  • generateQuizQuestions │ │
│  │  • generateFlashcards    │ │
│  │  (OpenAI Integration)    │ │
│  └──────────────────────────┘ │
└──────────────────┬─────────────┘
                   │
┌──────────────────▼─────────────────┐
│    DATA ACCESS LAYER (Mongoose)    │
│  ┌─────────────────────────────┐  │
│  │  • User Model               │  │
│  │  • Note Model               │  │
│  │  • Quiz Model               │  │
│  │  • Progress Model           │  │
│  │  • Flashcard Model          │  │
│  └─────────────────────────────┘  │
└──────────────────┬──────────────────┘
                   │
┌──────────────────▼──────────────────┐
│    DATABASE LAYER (MongoDB Atlas)   │
│  ┌─────────────────────────────┐   │
│  │  Collections:               │   │
│  │  • users (indexes: email)   │   │
│  │  • notes (indexes: userId)  │   │
│  │  • quizzes (indexes: topic) │   │
│  │  • progress (indexes: weak) │   │
│  │  • flashcards               │   │
│  └─────────────────────────────┘   │
└───────────────────────────────────┘
```

---

## 📊 Data Flow Diagrams

### Note Generation Flow

```
User Input (Topic)
    ↓
POST /api/notes/generate
    ↓
[Auth Middleware] ← Verify JWT Token
    ↓
[Notes Controller] ← Extract topic
    ↓
[AI Service] ← Call generateNotesContent(topic)
    ↓
[Mock/OpenAI] ← Generate structured notes
    ↓
[Note Model] ← Create new document
    ↓
MongoDB ← Save to database
    ↓
Response to Client ← Return note object
    ↓
Frontend ← Display notes in React components
```

### Quiz Generation & Submission Flow

```
┌─── Generate Quiz ───┐
│                     │
User selects topic    │
    ↓                 │
POST→generate      ┌──┴──┐
    │              │     │
    ├─→Controller─┴─→AI Service─→Mock Questions
    │              │
    ├─→Save Quiz─→MongoDB
    │              │
    └──→Response──→Frontend


┌─── Submit Quiz Answers ───┐
│                           │
User submits answers        │
    ↓                       │
POST→submit              ┌──┴──┐
    │                    │     │
    ├─→Get Quiz────────→Validate
    │                    │
    ├─→Calculate Score──┤
    │                    │
    ├─→Update Progress──┤─→MongoDB
    │                    │
    └──→Response────────→Frontend
        (score, accuracy, feedback)
```

### Learning Analytics Flow

```
Quiz Submission
    ↓
[Progress Service]
    ├→ Add attempt record
    ├→ Recalculate averageAccuracy
    ├→ Check if weakTopic (< 70%)
    ├→ Update streak
    └→ Save to MongoDB
    ↓
Dashboard Request
    ├→ getProgress() → Get all topics
    ├→ getWeakTopics() → Filter weak
    ├→ getStreak() → Calculate consecutive days
    └→ Return analytics
    ↓
Frontend Charts
    ├→ Accuracy by Topic (Bar chart)
    ├→ Weekly Progress (Line chart)
    └→ Weak Topics List
```

---

## 🔒 Security Architecture

### Authentication Flow

```
┌─ REGISTRATION ─┐
│                │
User submits     │
(name, email,    │
password)        │
    ↓            │
Hash Password    │
(bcrypt)         │
    ↓            │
Save User        │
    ↓            │
Generate JWT     │
    ↓            │
Token Response   │
│                │
└────────────────┘

┌─ SUBSEQUENT REQUESTS ─┐
│                       │
Client sends           │
Authorization header   │
with JWT token         │
    ↓                  │
Middleware verifies    │
token signature        │
    ↓                  │
Extract userId         │
from token payload     │
    ↓                  │
Attach to req.userId   │
    ↓                  │
Continue to route      │
│                      │
└──────────────────────┘
```

### CORS Policy

```
Frontend Origin: http://localhost:3000
Backend CORS_ORIGIN: http://localhost:3000

Production:
Frontend: https://notemind.vercel.app
Backend: https://api.notemind.com
```

---

## 💾 Database Relationships

```
users (1) ──────────────────── (many) notes
  │id                           │userId
  │                             │topic
  │                             │content
  │
  ├──────────────────── (many) quizzes
  │                      │userId
  │                      │topic
  │                      │questions
  │
  ├──────────────────── (many) progress
  │                      │userId
  │                      │topic
  │                      │accuracy
  │
  └──────────────────── (many) flashcards
                         │userId
                         │topic
                         │cards[]
```

---

## 🚀 Deployment Architecture

### Development Environment

```
Localhost:3000        Localhost:5000
(Frontend)            (Backend)
    ↓                     ↓
Next.js Dev          Express Dev
    ├─ Hot reload    ├─ Auto restart
    └─ Source maps   └─ Debug logs
        ↓                ↓
    MongoDB Local (or Atlas)
```

### Production Environment

```
┌─────────────────────────────────┐
│      CDN (Cloudflare)           │
│  (Static assets, caching)       │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│  Frontend on Vercel             │
│  ├─ notemind.vercel.app         │
│  ├─ Build optimization          │
│  ├─ Automatic deployments       │
│  └─ Global edge caching         │
└────────────┬────────────────────┘
             │ HTTPS
┌────────────▼────────────────────┐
│  Backend on Render/Railway      │
│  ├─ api.notemind.com            │
│  ├─ Load balancing              │
│  ├─ Auto-scaling (with Docker)  │
│  └─ Health checks               │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│  MongoDB Atlas (Sharded)        │
│  ├─ Automated backups           │
│  ├─ Replica sets                │
│  ├─ Performance monitoring       │
│  └─ 99.99% uptime SLA           │
└─────────────────────────────────┘
```

---

## 📈 Scalability Considerations

### Horizontal Scaling

```
Load Balancer (Nginx)
    ├─ Backend Instance 1
    ├─ Backend Instance 2
    ├─ Backend Instance 3
    └─ Backend Instance N
         ↓
    MongoDB Connection Pool
    (Shared database)
```

### Caching Strategy

```
Frontend Cache:
└─ Browser Cache (Static assets)
└─ LocalStorage (User tokens, preferences)

Backend Cache (Future Redis):
├─ Notes (TTL: 1 hour)
├─ Quizzes (TTL: 30 minutes)
├─ Progress (TTL: 5 minutes)
└─ User sessions (TTL: 7 days)
```

### Database Indexing

```
Quick lookups:
├─ users (email) - unique index
├─ notes (userId, topic) - compound index
├─ quizzes (userId, createdAt) - compound index
├─ progress (userId, weakTopic) - compound index
└─ flashcards (userId, topic) - compound index
```

---

## 🔄 CI/CD Pipeline (GitHub Actions)

```
Code Push
    ↓
├─ Run Tests
├─ Lint Code
├─ Type Check (TypeScript)
├─ Build
├─ Deploy Frontend (Vercel)
└─ Deploy Backend (Render)
    ↓
Automated Notifications
```

---

## 🎯 Performance Optimization

### Frontend Optimization

```
1. Image Optimization
   ├─ WebP format
   ├─ Responsive images
   └─ Lazy loading

2. Code Splitting
   ├─ Per-route splitting
   ├─ Dynamic imports
   └─ Chunk optimization

3. CSS Optimization
   ├─ Tailwind purging
   ├─ Critical CSS inlining
   └─ CSS-in-JS minification
```

### Backend Optimization

```
1. Database Queries
   ├─ Use indexes
   ├─ Projection (select fields)
   ├─ Pagination
   └─ Connection pooling

2. API Response
   ├─ Gzip compression
   ├─ Response caching
   └─ Query optimization

3. Async Processing
   ├─ Queue long tasks
   ├─ Worker processes
   └─ Background jobs
```

---

## 📊 Monitoring & Observability

### Logging

```
Backend Logs:
├─ Request logs (method, path, status)
├─ Error logs (stack traces)
├─ Performance logs (query times)
└─ Auth logs (login/logout)

Frontend Logs:
├─ Error tracking (Sentry)
├─ User analytics (Mixpanel)
└─ Performance metrics (Web Vitals)
```

### Health Checks

```
GET /api/health
{
  "status": "OK",
  "database": "connected",
  "ai_service": "available",
  "uptime": "324h",
  "memory": "45%"
}
```

---

## 🔐 Security Best Practices

```
1. Authentication
   ✓ JWT tokens with 7-day expiry
   ✓ Password hashing (bcrypt)
   ✓ HTTPS only in production

2. Authorization
   ✓ User isolation (userId checks)
   ✓ Resource ownership validation
   ✓ CORS whitelisting

3. Input Validation
   ✓ Schema validation (Mongoose)
   ✓ Rate limiting (Ready)
   ✓ XSS prevention (React escaping)

4. Data Protection
   ✓ HTTPS/TLS encryption
   ✓ Database SSL connections
   ✓ Secure headers (Helmet)
```

---

This architecture is designed for:

- ✅ **Scalability** - Handle thousands of concurrent users
- ✅ **Reliability** - 99.9% uptime
- ✅ **Maintainability** - Clean, modular code
- ✅ **Security** - Best practices implemented
- ✅ **Performance** - Optimized at every layer
