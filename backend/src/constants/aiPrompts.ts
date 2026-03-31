/**
 * Centralized AI system prompts, validation rules, and constants
 * Production-grade configuration for NoteMind AI backend
 */

// ============================================================================
// SYSTEM PROMPTS
// ============================================================================

export const AI_PROMPTS = {
  BASE_SYSTEM: `You are NoteMind AI — an expert educational tutor built to help students learn effectively across every subject domain.

YOUR MISSION:
- Teach concepts clearly, accurately, and engagingly
- Break complex ideas into digestible parts with real analogies
- Provide concrete examples grounded in reality
- Adapt explanations to the learner's level
- Foster genuine understanding, not rote memorisation

STRICT BEHAVIORAL RULES:

1. ACCURACY FIRST
   - Provide ONLY factually correct, verifiable information.
   - If you are uncertain about ANY fact, say so explicitly:
     "I'm not fully certain about this detail — please verify with an authoritative source."
   - NEVER fabricate data, statistics, dates, names, citations, or references.
   - NEVER speculate or guess. If you don't know, admit it.

2. STRUCTURED RESPONSES
   - Every answer must follow a clear structure:
     • Title / heading that frames the topic
     • Concise core explanation (2-4 sentences)
     • 3-5 key points as bullet items
     • At least one practical example or analogy
     • A brief takeaway or "why this matters"
   - Use Markdown formatting (headings, bold, bullets) for readability.

3. HUMAN-LIKE TEACHING STYLE
   - Write like a knowledgeable, enthusiastic teacher.
   - Use "we", "let's", "imagine" to engage the reader.
   - NEVER say "As an AI model…", "I am designed to…", or similar self-referential phrases.
   - Keep tone conversational yet professional.

4. ANTI-HALLUCINATION PROTOCOL
   - Never invent references, book titles, paper names, or URLs.
   - If the question is ambiguous, ask for clarification instead of guessing.
   - If a topic is outside your training data, say:
     "This is outside my current knowledge. I'd recommend consulting [type of source]."
   - Prefer shorter, accurate answers over long, padded ones.

5. DOMAIN FLEXIBILITY
   - You can answer questions from ANY academic or professional domain:
     science, math, history, literature, programming, medicine, law, economics,
     philosophy, psychology, engineering, art, music, and more.
   - Frame every answer as a learning opportunity.

6. REJECTION POLICY
   - If a query is clearly nonsensical, spam, or has no learning value, respond:
     "I'm here to help you learn. Please ask a meaningful question about any topic you'd like to study."
   - Do NOT engage with inappropriate, harmful, or off-topic casual chat.

QUALITY CHECKLIST (apply to every response):
✓ Factually accurate and verifiable?
✓ Clearly structured with title, explanation, key points, example?
✓ Would a real teacher explain it this way?
✓ Beginner-friendly yet thorough?
✓ Promotes genuine understanding?`,

  STUDY_NOTES: `You are creating comprehensive, exam-ready study notes.

OUTPUT FORMAT (strict JSON — you MUST return ALL fields populated):
{
  "title": "Clear topic title",
  "definition": "A thorough 2-4 sentence core definition that explains the concept clearly",
  "key_concepts": ["concept1", "concept2", "concept3", "concept4"],     // MUST have 3-6 items, each 15+ words
  "important_points": ["point1", "point2", "point3", "point4"],         // MUST have 3-6 items, each 15+ words
  "examples": ["example1", "example2", "example3"],                     // MUST have 2-4 items, each a real-world example
  "exam_highlights": ["highlight1", "highlight2", "highlight3"]          // MUST have 3-5 items, each exam-relevant
}

CRITICAL RULES — READ THESE CAREFULLY:
- EVERY field MUST be populated with substantive content. NO empty arrays. NO placeholder text.
- "key_concepts" MUST contain 3-6 meaningful concepts, each at least 15 words explaining the concept.
- "important_points" MUST contain 3-6 important points, each at least 15 words explaining why it matters.
- "examples" MUST contain 2-4 concrete, real-world examples with enough detail to be useful.
- "exam_highlights" MUST contain 3-5 exam-relevant highlights explaining what to remember for exams.
- Each array item must be a substantial, useful string (minimum 15 characters).
- Every fact must be verifiable — no fabrication.
- Use clear, concise language without oversimplifying.
- Include WHY each point matters.
- Make content scannable and exam-oriented.
- Provide practical, real-world relevance.
- Return ONLY valid JSON, no extra text, no markdown fences.
- BEFORE returning, verify that NONE of your arrays are empty. If any array has 0 items, add content to it.`,

  QUIZ_QUESTIONS: `You are creating fair, educational multiple-choice quiz questions.

OUTPUT FORMAT (strict JSON):
{
  "questions": [
    {
      "question": "Clear question text",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "Why this answer is correct and others are not"
    }
  ]
}

RULES:
- Create exactly 5 questions.
- Test genuine understanding, not trivia.
- The correct answer MUST be clearly the best option — no ambiguity.
- Distractors should be plausible but definitively wrong.
- Vary difficulty: 2 easy, 2 medium, 1 challenging.
- Each explanation should teach, not just confirm.
- correctAnswer is a 0-based index (0-3).
- No trick questions or double negatives.
- Return ONLY valid JSON, no extra text.`,

  FLASHCARDS: `You are creating effective revision flashcards.

OUTPUT FORMAT (strict JSON):
{
  "cards": [
    {
      "front": "Concise question or prompt (5-15 words)",
      "back": "Complete answer with key detail and example"
    }
  ]
}

RULES:
- Create 6-8 cards.
- Front: triggers active recall — pose as a question.
- Back: complete, memorable answer with a concrete example.
- Mix types: definitions, mechanisms, applications, comparisons.
- Cards should build upon each other logically.
- Include practical examples in at least half the cards.
- Return ONLY valid JSON, no extra text.`,
};

// ============================================================================
// VALIDATION RULES
// ============================================================================

export const VALIDATION_RULES = {
  MIN_QUERY_LENGTH: 3,
  MAX_QUERY_LENGTH: 5000,

  // Patterns that indicate definitely-not-a-question inputs
  SPAM_PATTERNS: [
    /^(.)\1{5,}$/i, // Repeated single character: aaaaaa
    /^(https?:\/\/|www\.|@|#)/i, // URLs, mentions, hashtags
    /^\d{6,}$/i, // Just a long number
    /^[^a-z0-9\s]{10,}$/i, // 10+ consecutive non-alphanumeric symbols
    /^(\w+\s*){1}\1{4,}$/i, // Same word repeated 5+ times
  ],

  // Casual greetings that have no learning value when sent alone
  CASUAL_ONLY_PATTERNS: [
    /^(hi|hello|hey|yo|sup|hola|namaste)\s*[!?.]*$/i,
    /^(ok|okay|yes|no|yeah|yep|nope|nah|sure|fine|cool|nice|great|thanks|thank you|bye|goodbye|lol|lmao|haha|hehe|hmm|idk|wtf|omg|bruh)\s*[!?.]*$/i,
  ],

  // Personal / unanswerable questions — the AI has no access to user data
  // These MUST be checked before meaningful keywords because they contain "what", "my" etc.
  PERSONAL_QUESTION_PATTERNS: [
    /\b(?:what(?:'s| is| are))\s+my\b/i, // "what is my height", "what's my name"
    /\b(?:tell|give)\s+me\s+my\b/i, // "tell me my age"
    /\b(?:do you know)\s+my\b/i, // "do you know my name"
    /\bmy\s+(?:height|weight|age|name|birthday|address|phone|email|location|password|account|ip|score|grade|gpa|rank|salary|income)\b/i,
    /\b(?:how\s+(?:tall|old|heavy)\s+am\s+i)\b/i, // "how tall am i", "how old am i"
    /\b(?:where\s+(?:am|do)\s+i\s+live)\b/i, // "where do i live"
    /\b(?:who\s+am\s+i)\b/i, // "who am i" (personal context)
    /\b(?:what(?:'s| is)\s+(?:my|the)\s+(?:time|date|weather))\b/i, // "what's the time"
    /\b(?:can you|do you)\s+(?:see|hear|feel|touch)\s+me\b/i, // "can you see me"
    /\b(?:remember|recall)\s+(?:me|my|what\s+i)\b/i, // "do you remember me"
  ],

  // Keywords that strongly indicate a meaningful learning query
  MEANINGFUL_KEYWORDS: [
    // Question words
    "what",
    "how",
    "why",
    "when",
    "where",
    "which",
    "who",
    // Action words
    "explain",
    "define",
    "describe",
    "compare",
    "contrast",
    "analyze",
    "evaluate",
    "calculate",
    "solve",
    "derive",
    "prove",
    "demonstrate",
    // Learning words
    "understand",
    "learn",
    "study",
    "teach",
    "help",
    "mean",
    "means",
    "example",
    "examples",
    // Generation words
    "create",
    "generate",
    "make",
    "write",
    "build",
    "design",
    "quiz",
    "flashcard",
    "flashcards",
    "notes",
    "summary",
    "summarize",
    // Domain indicators
    "theory",
    "concept",
    "principle",
    "law",
    "theorem",
    "formula",
    "function",
    "method",
    "process",
    "system",
    "structure",
    "difference",
    "between",
    "versus",
    "vs",
    // Technical
    "algorithm",
    "data",
    "code",
    "program",
    "variable",
    "class",
    "equation",
    "reaction",
    "element",
    "compound",
    "history",
    "geography",
    "biology",
    "physics",
    "chemistry",
    "math",
    "mathematics",
    "economics",
    "psychology",
    "philosophy",
    "literature",
    "grammar",
    "syntax",
    "language",
  ],
};

// ============================================================================
// QUALITY THRESHOLDS
// ============================================================================

export const QUALITY_THRESHOLDS = {
  MIN_RESPONSE_LENGTH: 80,
  MAX_RESPONSE_LENGTH: 15000,
  MIN_SENTENCE_COUNT: 2,
  REQUIRED_STRUCTURE: ["title", "explanation", "key_points", "example"],
  CONFIDENCE_THRESHOLD: 0.6,
};

// ============================================================================
// ERROR MESSAGES (user-facing, never expose internals)
// ============================================================================

export const ERROR_MESSAGES = {
  INVALID_INPUT:
    "Please ask a clear learning question — for example, 'Explain photosynthesis' or 'What is machine learning?'",
  AI_UNAVAILABLE:
    "I couldn't generate a reliable answer right now. Please try again in a moment.",
  WEAK_RESPONSE:
    "I couldn't generate a reliable answer for that. Please try rephrasing your question with more detail.",
  RATE_LIMITED:
    "You're asking questions faster than I can think! Please wait a moment and try again.",
  INTERNAL_ERROR:
    "Something went wrong on our end. Please try again — if the problem persists, try a different question.",
  TOPIC_TOO_BROAD:
    "That topic is very broad. Could you narrow it down? For example, instead of 'science', try 'how do vaccines work?'",
  CASUAL_INPUT:
    "Hey there! I'm your study assistant. Ask me anything you'd like to learn — for example, 'Explain Newton's laws' or 'What causes inflation?'",
  PERSONAL_QUESTION:
    "I don't have access to your personal information. I'm a study assistant — try asking me something you'd like to learn! For example: 'Explain photosynthesis' or 'How does gravity work?'",
};

// ============================================================================
// INTENT DETECTION
// ============================================================================

export enum QueryIntent {
  NOTES = "notes",
  QUIZ = "quiz",
  FLASHCARDS = "flashcards",
  EXPLANATION = "explanation",
  COMPARISON = "comparison",
  SUMMARY = "summary",
  GENERAL_QUESTION = "general_question",
  UNKNOWN = "unknown",
}

export const INTENT_KEYWORDS: Record<QueryIntent, string[]> = {
  [QueryIntent.NOTES]: [
    "notes",
    "study guide",
    "study notes",
    "create notes",
    "generate notes",
    "make notes",
    "write notes",
    "key points",
  ],
  [QueryIntent.QUIZ]: [
    "quiz",
    "test me",
    "test questions",
    "practice questions",
    "generate quiz",
    "mcq",
    "multiple choice",
    "assessment",
  ],
  [QueryIntent.FLASHCARDS]: [
    "flashcard",
    "flashcards",
    "revision cards",
    "flash cards",
    "memorize",
    "recall cards",
    "study cards",
  ],
  [QueryIntent.EXPLANATION]: [
    "explain",
    "how does",
    "what is",
    "what are",
    "describe",
    "clarify",
    "help me understand",
    "break down",
    "elaborate",
    "tell me about",
    "meaning of",
    "define",
  ],
  [QueryIntent.COMPARISON]: [
    "compare",
    "difference between",
    "versus",
    " vs ",
    "contrast",
    "similar to",
    "distinguish",
    "how is.*different",
  ],
  [QueryIntent.SUMMARY]: [
    "summarize",
    "summary",
    "brief overview",
    "overview",
    "tl;dr",
    "in short",
    "quick summary",
    "recap",
  ],
  [QueryIntent.GENERAL_QUESTION]: [
    "answer",
    "tell me",
    "how to",
    "why does",
    "why is",
    "why do",
    "can you",
    "help me",
    "i want to know",
    "i need to understand",
  ],
  [QueryIntent.UNKNOWN]: [],
};

// ============================================================================
// RETRY & CIRCUIT BREAKER CONFIGURATION
// ============================================================================

export const RETRY_CONFIG = {
  MAX_RETRIES: 2,
  BASE_DELAY_MS: 1000,
  MAX_DELAY_MS: 5000,
  BACKOFF_MULTIPLIER: 2,
};

export const CIRCUIT_BREAKER_CONFIG = {
  FAILURE_THRESHOLD: 5, // failures before opening circuit
  RECOVERY_TIMEOUT_MS: 60_000, // 1 minute before trying again
  HALF_OPEN_MAX_CALLS: 2, // test calls in half-open state
};

// ============================================================================
// MULTI-PROVIDER CONFIGURATION
// ============================================================================

export const PROVIDER_CONFIG = {
  /** Provider priority order (lower = higher priority, free providers first) */
  /** Fallback chain: Groq (free) → Gemini (free tier) → OpenAI (paid, optional) → Wikipedia */
  GROQ: {
    priority: 1,
    model: "llama-3.1-8b-instant",
    timeoutMs: 30_000,
    envKey: "GROQ_API_KEY",
    free: true,
  },
  GEMINI: {
    priority: 2,
    model: "gemini-2.0-flash",
    timeoutMs: 30_000,
    envKey: "GEMINI_API_KEY",
    free: true,
  },
  OPENAI: {
    priority: 3,
    model: "gpt-3.5-turbo",
    timeoutMs: 30_000,
    envKey: "OPENAI_API_KEY",
    free: false,
  },
} as const;

/** Rate limit cooldown (ms) applied when a provider returns 429 */
export const RATE_LIMIT_COOLDOWN_MS = 30_000;
