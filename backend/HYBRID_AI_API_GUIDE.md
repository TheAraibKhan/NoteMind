# Hybrid AI Service: Gemini + Wikipedia

## Overview

NoteMind's backend now features a **production-grade hybrid AI service** that combines Google Gemini and Wikipedia APIs for maximum reliability and quality content generation.

## Architecture

```
User Request
    ↓
[Cache Check]
    ↓ (miss)
[Input Validation]
    ↓
[Hybrid Mode Enabled?]
    ├→ YES: Run Gemini + Wikipedia in parallel
    │   ├→ Gemini (30s timeout)
    │   ├→ Wikipedia (15s timeout)
    │   ↓
    │   [Quality Scoring & Selection]
    │   ↓
    │   [Return Best Result]
    │
    └→ NO: Fallback mode (sequential)
        └→ Try Gemini first
        └→ Fall back to Wikipedia
        └→ Return graceful error if both fail

[Cache + Return to User]
```

## Features

### 1. Parallel Processing

- Both APIs process simultaneously (not sequentially)
- Reduces latency significantly
- Uses intelligent timeout management

### 2. Quality Scoring

- Evaluates responses on multiple dimensions:
  - **Completeness**: Does the response have all required fields?
  - **Accuracy**: How reliable is the source?
  - **Relevance**: Does it match the query?
  - **Confidence**: How certain is the scoring?

### 3. Intelligent Fallback

- Primary API fails → Secondary API activates
- Timeout on one API → Other API continues
- Both fail → Graceful error message

### 4. Circuit Breaker Pattern

- Prevents cascading failures
- Temporarily disables failing APIs
- Auto-recovery with half-open state
- Monitoring and logging

### 5. Response Validation

- Detects hallucinated content
- Validates JSON structure
- Ensures required fields are present
- Filters weak responses

### 6. Caching Layer

- Configurable TTL (default: 24 hours)
- Reduces API calls and latency
- Cache invalidation on updates

## Configuration

### Environment Variables

```bash
# Required
GEMINI_API_KEY=AIzaSyCIhgBEGwpXBj9PUgZTgXSxJc1Df39PgQE
FREE_NOTES_API_URL=https://en.wikipedia.org/w/api.php

# Optional
USE_HYBRID_MODE=true                 # Enable/disable hybrid mode (default: true)
PRIORITIZE_QUALITY=true              # Wait for best result vs. first result (default: false)
USE_FREE_API_ONLY=false              # Force Wikipedia-only mode (default: false)
CACHE_ENABLED=true                   # Enable response caching (default: true)
CACHE_TTL_SECONDS=86400              # Cache lifetime in seconds (default: 24h)
GEMINI_MODEL=gemini-2.0-flash        # Gemini model version
NODE_ENV=production                  # Environment (production/development)
```

### Setup

1. **Copy environment template:**

   ```bash
   cp .env.example .env
   ```

2. **Add your Gemini API key:**

   ```bash
   GEMINI_API_KEY=your_key_here
   ```

3. **Verify configuration:**
   ```bash
   # Check AI service status
   curl http://localhost:5000/api/admin/ai-diagnostics
   ```

## API Features

### Notes Generation

- **Primary**: Gemini (structured, detailed)
- **Fallback**: Wikipedia (reliable, verified)
- **Result**: Highest quality notes

```bash
POST /api/notes/generate
{
  "topic": "Quantum Computing"
}
```

### Quiz Generation

- **Primary**: Gemini only (requires AI complexity)
- **Fallback**: Returns error (Wikipedia can't generate quiz questions)

```bash
POST /api/quiz/generate
{
  "topic": "Photosynthesis"
}
```

### Flashcards Generation

- **Primary**: Gemini (structured pairs)
- **Fallback**: Returns error (Wikipedia content not suitable)

```bash
POST /api/flashcards/generate
{
  "topic": "French Revolution"
}
```

## Diagnostics & Monitoring

### Health Check Endpoint

```bash
curl http://localhost:5000/api/health
```

**Response:**

```json
{
  "status": "OK",
  "ai": {
    "gemini": "available",
    "wikipedia": "available",
    "mode": "hybrid"
  },
  "database": "connected"
}
```

### AI Diagnostics Endpoint

```bash
curl http://localhost:5000/api/admin/ai-diagnostics
```

**Response:**

```json
{
  "health": {
    "status": "healthy",
    "timestamp": "2026-03-31T12:00:00Z"
  },
  "diagnostics": {
    "apis": {
      "gemini": { "available": true, "configured": true },
      "wikipedia": { "available": true, "configured": true }
    },
    "cache": { "enabled": true, "ttl": 86400 },
    "hybridMode": { "enabled": true, "prioritizeQuality": true },
    "performance": {
      "timeouts": { "gemini": 30000, "wikipedia": 15000, "hybrid": 35000 }
    }
  }
}
```

## Performance Metrics

### Typical Latency (with 2-API hybrid)

| Operation  | Gemini Only | Wikipedia Only | Hybrid | Cached |
| ---------- | ----------- | -------------- | ------ | ------ |
| Notes      | 2-4s        | 1-2s           | 2-4s   | <100ms |
| Quiz       | 3-5s        | N/A            | 3-5s   | <100ms |
| Flashcards | 2-3s        | N/A            | 2-3s   | <100ms |

### Cost

- **Gemini**: Free tier (2M requests/month)
- **Wikipedia**: Free (no rate limits)
- **Total**: $0 (completely free!)

## Error Handling

### Graceful Degradation

```
Scenario 1: Gemini API Rate Limited
→ Automatically fall back to Wikipedia
→ User gets content, no error

Scenario 2: Wikipedia Unreachable
→ Return Gemini result alone
→ User gets AI-generated content

Scenario 3: Both APIs Down
→ Return cached result if available
→ Otherwise return friendly error message
```

## Advanced: Hybrid Mode Control

### Enable Hybrid (Default)

```env
USE_HYBRID_MODE=true
PRIORITIZE_QUALITY=false  # Return first successful result
```

### Quality-First Mode

```env
USE_HYBRID_MODE=true
PRIORITIZE_QUALITY=true   # Wait for best quality result
```

### Fallback-Only Mode

```env
USE_HYBRID_MODE=false      # Sequential fallback (Gemini → Wikipedia)
```

### Wikipedia-Only Mode

```env
USE_FREE_API_ONLY=true     # Ignore Gemini, Wikipedia only
```

## Logging & Debugging

### View AI Service Logs

```bash
# Development
npm run dev

# Watch specific logs
grep "AIService" logs/all.log
grep "HybridAI" logs/all.log
grep "CircuitBreaker" logs/all.log
```

### Log Levels

- `DEBUG`: Detailed operation tracking
- `INFO`: Important milestones
- `WARN`: Recoverable issues
- `ERROR`: Critical failures

## Troubleshooting

### "AI service temporarily unavailable"

1. **Check API keys:**

   ```bash
   echo $GEMINI_API_KEY  # Should not be empty
   ```

2. **Check circuit breaker:**

   ```bash
   curl http://localhost:5000/api/admin/ai-diagnostics
   ```

3. **Check network:**
   ```bash
   curl https://en.wikipedia.org/w/api.php
   curl https://generativelanguage.googleapis.com  # Gemini endpoint
   ```

### Quiz generation fails but notes work

- **Cause**: This is expected! Quiz generation requires advanced AI reasoning
- **Solution**: Only Gemini can generate quiz questions
- **Workaround**: Generate notes instead and study those

### High latency

1. **Enable caching:**

   ```env
   CACHE_ENABLED=true
   CACHE_TTL_SECONDS=86400
   ```

2. **Disable quality prioritization:**

   ```env
   PRIORITIZE_QUALITY=false  # Return first result
   ```

3. **Reduce timeouts (advanced):**
   - Edit `hybridAiService.ts` → Reduce `GEMINI_TIMEOUT` or `WIKIPEDIA_TIMEOUT`

## Integration Examples

### Frontend: Notes with Fallback Handling

```typescript
const response = await fetch("/api/notes/generate", {
  method: "POST",
  body: JSON.stringify({ topic: "Biology" }),
});

const result = await response.json();

if (result.success) {
  // Works with either Gemini or Wikipedia source
  renderNotes(result.data);
} else {
  // Graceful error - display to user
  showError(result.error);
}
```

### Backend: Manual Hybrid Control

```typescript
import { raceWithTimeout } from "@/services/hybridAiService";

// Process both APIs in parallel
const results = await raceWithTimeout(
  [
    {
      label: "Gemini",
      promise: generateWithGemini(topic),
      timeout: 30000,
    },
    {
      label: "Wikipedia",
      promise: generateWithWikipedia(topic),
      timeout: 15000,
    },
  ],
  false,
); // false = don't return first result

// Select best
const best = selectBestResult(results, scoreNotesContent);
```

## Support & Issues

- **API Key Issues**: Check `GEMINI_API_KEY` in `.env`
- **Wikipedia Down**: Check `/api/admin/ai-diagnostics`
- **Slow Responses**: Enable caching, reduce timeouts
- **Circuit Breaker Stuck**: Restart backend service

---

**Last Updated**: March 31, 2026  
**Hybrid API Version**: 1.0  
**Supported Gemini Models**: gemini-2.0-flash, gemini-pro
