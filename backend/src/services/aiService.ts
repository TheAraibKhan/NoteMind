import OpenAI from "openai";

interface NotesContent {
  definition: string;
  keyConcepts: string[];
  importantPoints: string[];
  examples: string[];
  examHighlights: string[];
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface FlashcardContent {
  front: string;
  back: string;
}

interface WikipediaSearchResponse {
  query?: {
    search?: Array<{
      title: string;
      snippet: string;
    }>;
  };
}

interface WikipediaExtractResponse {
  query?: {
    pages?: Record<
      string,
      {
        title?: string;
        extract?: string;
      }
    >;
  };
}

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const WIKIPEDIA_API_URL =
  process.env.FREE_NOTES_API_URL || "https://en.wikipedia.org/w/api.php";
const USE_FREE_API_ONLY = process.env.USE_FREE_API_ONLY === "true";

let openAIQuotaUnavailable = false;

const splitIntoSentences = (text: string): string[] =>
  text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const cleanSnippet = (text: string): string =>
  text
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

const truncate = (text: string, maxLength: number): string =>
  text.length <= maxLength ? text : `${text.slice(0, maxLength - 3).trimEnd()}...`;

const normalizeTopic = (topic: string): string => topic.trim().replace(/\s+/g, " ");

const getClient = (): OpenAI | null => {
  if (!process.env.OPENAI_API_KEY || USE_FREE_API_ONLY || openAIQuotaUnavailable) {
    return null;
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 8_000,
    maxRetries: 0,
  });
};

const createStructuredResponse = async <T>(
  name: string,
  schema: Record<string, unknown>,
  instructions: string,
  input: string,
): Promise<T> => {
  const client = getClient();

  if (!client) {
    throw new Error("OpenAI is unavailable for this process");
  }

  try {
    const response = await client.responses.parse({
      model: OPENAI_MODEL,
      instructions,
      input,
      text: {
        format: {
          type: "json_schema",
          name,
          strict: true,
          schema,
        },
        verbosity: "medium",
      },
    });

    if (!response.output_parsed) {
      throw new Error(
        `OpenAI returned no structured output${response._request_id ? ` (request ${response._request_id})` : ""}`,
      );
    }

    return response.output_parsed as T;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "insufficient_quota"
    ) {
      openAIQuotaUnavailable = true;
    }

    throw error;
  }
};

const fetchWikipediaNotes = async (topic: string): Promise<NotesContent> => {
  const normalizedTopic = normalizeTopic(topic);
  const searchUrl =
    `${WIKIPEDIA_API_URL}?action=query&list=search&srsearch=${encodeURIComponent(normalizedTopic)}` +
    "&utf8=1&format=json&origin=*";

  const searchResponse = await fetch(searchUrl);
  if (!searchResponse.ok) {
    throw new Error(`Wikipedia search failed with status ${searchResponse.status}`);
  }

  const searchData = (await searchResponse.json()) as WikipediaSearchResponse;
  const bestMatch = searchData.query?.search?.[0];

  if (!bestMatch?.title) {
    throw new Error(`No free reference content found for "${topic}"`);
  }

  const extractUrl =
    `${WIKIPEDIA_API_URL}?action=query&prop=extracts&explaintext=1&exintro=0&titles=${encodeURIComponent(bestMatch.title)}` +
    "&format=json&origin=*";

  const extractResponse = await fetch(extractUrl);
  if (!extractResponse.ok) {
    throw new Error(
      `Wikipedia extract failed with status ${extractResponse.status}`,
    );
  }

  const extractData = (await extractResponse.json()) as WikipediaExtractResponse;
  const page = Object.values(extractData.query?.pages || {})[0];
  const extract = cleanSnippet(page?.extract || "");
  const sentences = splitIntoSentences(extract);
  const searchSnippet = cleanSnippet(bestMatch.snippet || "");

  const definition =
    sentences[0] ||
    searchSnippet ||
    `${bestMatch.title} is a topic related to ${normalizedTopic}.`;

  const keyConcepts =
    sentences.slice(1, 4).map((sentence) => truncate(sentence, 180)) || [];
  const importantPoints =
    sentences.slice(4, 7).map((sentence) => truncate(sentence, 180)) || [];
  const examples =
    sentences.slice(7, 9).map((sentence) => truncate(sentence, 180)) || [];

  const fallbackSentence = `Study the core definition, context, and related concepts of ${bestMatch.title}.`;

  return {
    definition: truncate(definition, 260),
    keyConcepts:
      keyConcepts.length > 0
        ? keyConcepts
        : [
            truncate(searchSnippet || fallbackSentence, 180),
            `Identify the main ideas associated with ${bestMatch.title}.`,
            `Connect ${bestMatch.title} to the broader topic of ${normalizedTopic}.`,
          ],
    importantPoints:
      importantPoints.length > 0
        ? importantPoints
        : [
            `Focus on the core meaning of ${bestMatch.title}.`,
            `Review why ${bestMatch.title} matters in context.`,
            `Use the topic title and article summary as quick revision anchors.`,
          ],
    examples:
      examples.length > 0
        ? examples
        : [
            `Look up practical or historical cases related to ${bestMatch.title}.`,
            `Compare ${bestMatch.title} with similar concepts for revision.`,
          ],
    examHighlights: [
      `Remember the definition of ${bestMatch.title}.`,
      `Be ready to explain key features of ${bestMatch.title}.`,
      `Revise how ${bestMatch.title} connects to ${normalizedTopic}.`,
    ],
  };
};

const getNotesWithFallback = async (topic: string): Promise<NotesContent> => {
  try {
    return await createStructuredResponse<NotesContent>(
      "study_notes",
      {
        type: "object",
        additionalProperties: false,
        properties: {
          definition: { type: "string" },
          keyConcepts: {
            type: "array",
            items: { type: "string" },
            minItems: 3,
            maxItems: 6,
          },
          importantPoints: {
            type: "array",
            items: { type: "string" },
            minItems: 3,
            maxItems: 6,
          },
          examples: {
            type: "array",
            items: { type: "string" },
            minItems: 2,
            maxItems: 5,
          },
          examHighlights: {
            type: "array",
            items: { type: "string" },
            minItems: 3,
            maxItems: 6,
          },
        },
        required: [
          "definition",
          "keyConcepts",
          "importantPoints",
          "examples",
          "examHighlights",
        ],
      },
      "You create concise, accurate study notes for students. Return only schema-compliant JSON with practical, specific academic content.",
      `Create structured study notes for the topic "${topic}". Keep the content clear, factual, and useful for revision.`,
    );
  } catch (error) {
    console.warn("OpenAI unavailable, falling back to free Wikipedia notes:", error);
    return fetchWikipediaNotes(topic);
  }
};

const buildQuizQuestionsFromNotes = (
  topic: string,
  notes: NotesContent,
): QuizQuestion[] => {
  const keyConcepts = notes.keyConcepts.slice(0, 3);
  const importantPoints = notes.importantPoints.slice(0, 2);
  const examples = notes.examples.slice(0, 2);

  return [
    {
      question: `Which option best defines ${topic}?`,
      options: [
        notes.definition,
        `An unrelated explanation of ${topic}`,
        `A purely fictional description of ${topic}`,
        `A definition for a different topic`,
      ],
      correctAnswer: 0,
      explanation: notes.definition,
    },
    {
      question: `Which of the following is listed as a key concept of ${topic}?`,
      options: [
        keyConcepts[0] || `A core concept connected to ${topic}`,
        `A random idea not related to ${topic}`,
        `A topic from a different subject area`,
        `An intentionally incorrect concept`,
      ],
      correctAnswer: 0,
      explanation:
        keyConcepts[0] || `This is one of the core ideas tied to ${topic}.`,
    },
    {
      question: `What is an important point to remember about ${topic}?`,
      options: [
        importantPoints[0] || `A major revision point about ${topic}`,
        `An unverified claim with no connection to ${topic}`,
        `A point that contradicts the main topic`,
        `A detail unrelated to the subject`,
      ],
      correctAnswer: 0,
      explanation:
        importantPoints[0] ||
        `This captures an important revision point for ${topic}.`,
    },
    {
      question: `Which example best fits ${topic}?`,
      options: [
        examples[0] || `A relevant example or application of ${topic}`,
        `An example from an unrelated field`,
        `A misleading example with no clear connection`,
        `A non-example designed to confuse the learner`,
      ],
      correctAnswer: 0,
      explanation:
        examples[0] || `This option is the most relevant example for ${topic}.`,
    },
    {
      question: `What should you prioritize when revising ${topic}?`,
      options: [
        notes.examHighlights[0] || `Review the core definition and concepts`,
        `Memorize unrelated trivia`,
        `Ignore the main ideas and only focus on side details`,
        `Skip examples and context entirely`,
      ],
      correctAnswer: 0,
      explanation:
        notes.examHighlights[0] ||
        `This is the most useful exam-oriented focus area for ${topic}.`,
    },
  ];
};

const buildFlashcardsFromNotes = (notes: NotesContent): FlashcardContent[] => [
  {
    front: "What is the core definition?",
    back: notes.definition,
  },
  ...notes.keyConcepts.slice(0, 2).map((concept, index) => ({
    front: `Key concept ${index + 1}`,
    back: concept,
  })),
  ...notes.importantPoints.slice(0, 2).map((point, index) => ({
    front: `Important point ${index + 1}`,
    back: point,
  })),
  ...notes.examples.slice(0, 1).map((example) => ({
    front: "Give one example or application.",
    back: example,
  })),
];

export const generateNotesContent = async (
  topic: string,
): Promise<NotesContent> => getNotesWithFallback(topic);

export const generateQuizQuestions = async (
  topic: string,
): Promise<QuizQuestion[]> => {
  try {
    const result = await createStructuredResponse<{ questions: QuizQuestion[] }>(
      "quiz_questions",
      {
        type: "object",
        additionalProperties: false,
        properties: {
          questions: {
            type: "array",
            minItems: 5,
            maxItems: 5,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                question: { type: "string" },
                options: {
                  type: "array",
                  minItems: 4,
                  maxItems: 4,
                  items: { type: "string" },
                },
                correctAnswer: {
                  type: "integer",
                  minimum: 0,
                  maximum: 3,
                },
                explanation: { type: "string" },
              },
              required: [
                "question",
                "options",
                "correctAnswer",
                "explanation",
              ],
            },
          },
        },
        required: ["questions"],
      },
      "You create fair multiple-choice quiz questions for students. Return only schema-compliant JSON. Each question must have exactly one correct option.",
      `Create 5 multiple-choice quiz questions for the topic "${topic}". Make them useful for studying, varied in difficulty, and academically accurate.`,
    );

    return result.questions;
  } catch (error) {
    console.warn("OpenAI unavailable, falling back to free quiz generation:", error);
    const notes = await getNotesWithFallback(topic);
    return buildQuizQuestionsFromNotes(topic, notes);
  }
};

export const generateFlashcards = async (
  topic: string,
): Promise<FlashcardContent[]> => {
  try {
    const result = await createStructuredResponse<{ cards: FlashcardContent[] }>(
      "flashcards",
      {
        type: "object",
        additionalProperties: false,
        properties: {
          cards: {
            type: "array",
            minItems: 5,
            maxItems: 8,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                front: { type: "string" },
                back: { type: "string" },
              },
              required: ["front", "back"],
            },
          },
        },
        required: ["cards"],
      },
      "You create effective flashcards for revision. Return only schema-compliant JSON. Keep each front concise and each back informative.",
      `Create revision flashcards for the topic "${topic}". Focus on definitions, mechanisms, examples, and common exam-style recall points.`,
    );

    return result.cards;
  } catch (error) {
    console.warn(
      "OpenAI unavailable, falling back to free flashcard generation:",
      error,
    );
    const notes = await getNotesWithFallback(topic);
    return buildFlashcardsFromNotes(notes);
  }
};
