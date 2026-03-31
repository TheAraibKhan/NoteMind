import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  retryCount?: number;
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests
api.interceptors.request.use((config: ExtendedAxiosRequestConfig) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors with retry logic for 429 (rate limit)
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as ExtendedAxiosRequestConfig;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      const currentPath = window.location.pathname;
      if (currentPath !== "/login" && currentPath !== "/register") {
        window.location.href = "/login";
      }
    }

    // Handle 429 Too Many Requests with exponential backoff retry
    if (error.response?.status === 429 && config) {
      const retryCount = config.retryCount || 0;
      const maxRetries = 3;

      if (retryCount < maxRetries) {
        config.retryCount = retryCount + 1;
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s

        await new Promise((resolve) => setTimeout(resolve, delay));
        return api(config);
      }
    }

    return Promise.reject(error);
  },
);

// Auth API
export const authAPI = {
  register: (email: string, password: string, name: string) =>
    api.post("/auth/register", { email, password, name }),
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  verify: () => api.get("/auth/verify"),
};

// Notes API
export const notesAPI = {
  generate: (topic: string) => api.post("/notes/generate", { topic }),
  getAll: (search?: string) => api.get("/notes", { params: { topic: search } }),
  getById: (id: string) => api.get(`/notes/${id}`),
  delete: (id: string) => api.delete(`/notes/${id}`),
};

// Quiz API
export const quizAPI = {
  generate: (topic: string, noteId?: string) =>
    api.post("/quiz/generate", { topic, noteId }),
  submit: (quizId: string, answers: number[]) =>
    api.post(`/quiz/${quizId}/submit`, { answers }),
  getById: (id: string) => api.get(`/quiz/${id}`),
};

// Progress API
export const progressAPI = {
  getAll: () => api.get("/progress"),
  getTopic: (topic: string) => api.get(`/progress/topic/${topic}`),
  getWeakTopics: () => api.get("/progress/weak-topics"),
  getStreak: () => api.get("/progress/streak"),
};

// Flashcards API
export const flashcardsAPI = {
  generate: (topic: string, noteId?: string) =>
    api.post("/flashcards/generate", { topic, noteId }),
  getAll: (search?: string) =>
    api.get("/flashcards", { params: { topic: search } }),
  updateMastery: (flashcardId: string, cardIndex: number, mastered: boolean) =>
    api.patch(`/flashcards/${flashcardId}/card/${cardIndex}`, { mastered }),
};

export default api;
