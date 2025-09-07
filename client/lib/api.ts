import { AnswerInput, CreateQuizInput, JoinQuizInput, LiveEvent, LiveState, Quiz, QuizSummary, UpdateQuizInput } from "@shared/api";

const ADMIN_KEY_KEY = "quiz_admin_key";
export const adminKeyStore = {
  get: () => localStorage.getItem(ADMIN_KEY_KEY) || "",
  set: (v: string) => localStorage.setItem(ADMIN_KEY_KEY, v),
  clear: () => localStorage.removeItem(ADMIN_KEY_KEY),
};

async function api<T>(path: string, init?: RequestInit & { admin?: boolean }) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (init?.admin) headers["x-admin-key"] = adminKeyStore.get();
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

export const AdminAPI = {
  login: (key: string) => api<{ ok: boolean }>("/api/admin/login", { method: "POST", body: JSON.stringify({ key }) }),
  listQuizzes: () => api<QuizSummary[]>("/api/quizzes", { admin: true }),
  getQuiz: (id: string) => api<Quiz>(`/api/quizzes/${id}`, { admin: true }),
  createQuiz: (input: CreateQuizInput) => api<Quiz>("/api/quizzes", { method: "POST", body: JSON.stringify(input), admin: true }),
  updateQuiz: (id: string, input: UpdateQuizInput) => api<Quiz>(`/api/quizzes/${id}`, { method: "PUT", body: JSON.stringify(input), admin: true }),
  duplicateQuiz: (id: string) => api<Quiz>(`/api/quizzes/${id}/duplicate`, { method: "POST", admin: true }),
  deleteQuiz: (id: string) => api<{ ok: boolean }>(`/api/quizzes/${id}`, { method: "DELETE", admin: true }),
  start: (id: string) => api<LiveState>(`/api/quizzes/${id}/start`, { method: "POST", admin: true }),
  next: (id: string) => api<LiveState>(`/api/quizzes/${id}/next`, { method: "POST", admin: true }),
  stop: (id: string) => api<LiveState>(`/api/quizzes/${id}/stop`, { method: "POST", admin: true }),
};

export const ParticipantAPI = {
  join: (code: string, input: JoinQuizInput) => api<{ quizId: string; playerId: string; code: string; title: string }>(`/api/join/${code}`, { method: "POST", body: JSON.stringify(input) }),
  state: (quizId: string) => api<LiveState>(`/api/state/${quizId}`),
  answer: (quizId: string, input: AnswerInput) => api<{ ok: boolean; correct: boolean; gained: number }>(`/api/answer/${quizId}`, { method: "POST", body: JSON.stringify(input) }),
  stream: (quizId: string, onEvent: (e: LiveEvent) => void) => {
    const es = new EventSource(`/api/stream/${quizId}`);
    es.addEventListener("heartbeat", () => {});
    ["quiz_started","quiz_stopped","question","leaderboard","result"].forEach((type) => {
      es.addEventListener(type, (ev) => {
        try { onEvent(JSON.parse((ev as MessageEvent).data) as LiveEvent); } catch {}
      });
    });
    return es;
  },
};
