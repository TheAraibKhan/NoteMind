# Backend README

## Node.js + Express.js + MongoDB

RESTful API for NoteMind - AI-Powered Learning Platform

### Features

🔐 **Authentication & Security**

- JWT-based authentication
- Bcrypt password hashing
- CORS protection
- Helmet for secure headers
- Rate limiting ready

📚 **Core Functionality**

- AI notes generation
- Quiz creation and submission
- Flashcard management
- Progress tracking
- Weak topic detection
- Learning analytics

🤖 **AI Integration**

- OpenAI GPT-4 integration (ready)
- Content generation pipeline
- Quiz question creation
- Flashcard automation

### Tech Stack

- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - ODM
- **TypeScript** - Type safety
- **JWT** - Authentication
- **Bcryptjs** - Password hashing

### Getting Started

```bash
npm install

# Create .env file with credentials
cp .env.example .env

# Run development server
npm run dev
```

Server runs on `http://localhost:5000`

### API Routes

```
Authentication:
  POST   /api/auth/register
  POST   /api/auth/login
  GET    /api/auth/verify

Notes:
  POST   /api/notes/generate
  GET    /api/notes
  GET    /api/notes/:id
  DELETE /api/notes/:id

Quiz:
  POST   /api/quiz/generate
  POST   /api/quiz/:id/submit
  GET    /api/quiz/:id

Progress:
  GET    /api/progress
  GET    /api/progress/topic/:topic
  GET    /api/progress/weak-topics
  GET    /api/progress/streak

Flashcards:
  POST   /api/flashcards/generate
  GET    /api/flashcards
  PATCH  /api/flashcards/:id/card/:idx
```

### Database Schema

- **Users** - Student accounts with auth
- **Notes** - Generated study notes
- **Quizzes** - Quiz questions and metadata
- **Progress** - Learning analytics per topic
- **Flashcards** - Interactive revision cards

### Project Structure

```
src/
├── controllers/       # Business logic
├── routes/           # API endpoints
├── models/           # MongoDB schemas
├── middleware/       # Auth & validation
├── services/         # AI integration
└── index.ts          # Server setup
```

### Authentication

Pass JWT token in header:

```
Authorization: Bearer <token>
```

Token from `/api/auth/login` or `/api/auth/register`

### AI Service

Uses the OpenAI API from `src/services/aiService.ts`.
If OpenAI is unavailable or out of quota, the backend falls back to Wikipedia-based notes and derives quiz/flashcards from that free source.

Required env:

1. `OPENAI_API_KEY=sk-...`
2. Optional: `OPENAI_MODEL=gpt-4.1-mini`
3. Optional free fallback override: `FREE_NOTES_API_URL=https://en.wikipedia.org/w/api.php`
4. Optional free-only mode: `USE_FREE_API_ONLY=true`

### Error Handling

All endpoints return consistent error format:

```json
{
  "error": "Error message description"
}
```

### Development

```bash
# Watch mode
npm run dev

# Build
npm run build

# Production
npm start

# Type check
npx tsc --noEmit
```

### Database Setup

Uses MongoDB Atlas cloud database. Connection via:

```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/notemind
```

Automatic schema creation via Mongoose.

### Security

- ✓ Password hashing with bcrypt
- ✓ JWT token validation
- ✓ CORS whitelisting
- ✓ Security headers with Helmet
- ✓ Input validation ready

### Scalability

- Database indexing on frequently queried fields
- Pagination support
- API rate limiting ready
- Redis caching compatible
- Microservices ready

### Deployment

Deploy to Render, Railway, or Vercel:

```bash
npm run build
npm start
```

Set production environment variables on hosting platform.

### Environment Variables

```
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=secure_random_string
OPENAI_API_KEY=sk-...
NODE_ENV=production
CORS_ORIGIN=https://frontend-domain.com
```

### Testing API

Use Postman or curl:

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com","password":"pass123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"pass123"}'

# Generate notes (with token)
curl -X POST http://localhost:5000/api/notes/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"topic":"Databases"}'
```

---

**NoteMind** - From Notes to Mastery

For full documentation, see [PROJECT_DOCUMENTATION.md](../PROJECT_DOCUMENTATION.md)
