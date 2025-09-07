import "dotenv/config";
import express from "express";
import cors from "cors";
import { randomBytes } from "crypto";
import { EventEmitter } from "events";
import {
  AnswerInput,
  CreateQuizInput,
  ID,
  JoinQuizInput,
  JoinQuizResponse,
  LeaderboardEntry,
  LiveEvent,
  LiveState,
  Player,
  Quiz,
  QuizQuestion,
  QuizStatus,
  QuizSummary,
  StartQuizResponse,
  UpdateQuizInput,
} from "@shared/api";

// In-memory store
const quizzes = new Map<ID, Quiz>();
const quizCodeToId = new Map<string, ID>();
const playersByQuiz = new Map<ID, Map<ID, Player>>();
const currentIndexByQuiz = new Map<ID, number>();
const deadlinesByQuiz = new Map<ID, number>();
const correctAnswersByQuestion = new Map<string, Set<ID>>(); // key: `${quizId}:${questionId}` -> set of playerIds answered correctly
const questionStartByQuiz = new Map<ID, number>();
const sseChannels = new Map<ID, Set<express.Response>>(); // by quizId
const adminKey = process.env.ADMIN_KEY || "";

function genId(len = 16): ID {
  return randomBytes(Math.ceil(len / 2)).toString("hex").slice(0, len);
}
function genCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function getPublicQuestion(q: QuizQuestion, reveal = false): QuizQuestion {
  return {
    ...q,
    options: q.options.map((o) => ({ id: o.id, text: o.text, ...(reveal ? { correct: !!o.correct } : {}) })),
  } as any;
}

function toSummary(qz: Quiz): QuizSummary {
  return {
    id: qz.id,
    code: qz.code,
    title: qz.title,
    status: getStatus(qz.id),
    createdAt: qz.createdAt,
    updatedAt: qz.updatedAt,
    questionCount: qz.questions.length,
  };
}

function getStatus(quizId: ID): QuizStatus {
  const idx = currentIndexByQuiz.get(quizId);
  if (idx == null) return "draft";
  if (idx === -1) return "draft";
  const qz = quizzes.get(quizId);
  if (!qz) return "draft";
  if (idx >= qz.questions.length) return "ended";
  return "live";
}

function computeLeaderboard(quizId: ID): LeaderboardEntry[] {
  const players = playersByQuiz.get(quizId) || new Map();
  const entries = Array.from(players.values()).map((p) => ({
    playerId: p.id,
    name: p.name,
    score: p.score,
    correctCount: p.correctCount,
  }));
  entries.sort((a, b) => b.score - a.score || b.correctCount - a.correctCount || (players.get(a.playerId)?.lastAnswerAt || 0) - (players.get(b.playerId)?.lastAnswerAt || 0));
  return entries;
}

function currentState(quizId: ID, revealAnswers = false): LiveState {
  const qz = quizzes.get(quizId)!;
  const idx = currentIndexByQuiz.get(quizId) ?? -1;
  const question = idx >= 0 && idx < qz.questions.length ? qz.questions[idx] : undefined;
  const deadline = deadlinesByQuiz.get(quizId) || undefined;
  return {
    quizId,
    code: qz.code,
    status: getStatus(quizId),
    currentQuestionIndex: idx,
    question: question ? (getPublicQuestion(question, revealAnswers) as any) : undefined,
    revealAnswers: revealAnswers,
    deadline,
    leaderboard: computeLeaderboard(quizId),
  };
}

function broadcast(quizId: ID, event: LiveEvent) {
  const clients = sseChannels.get(quizId);
  if (!clients) return;
  const data = `event: ${event.type}\n` + `data: ${JSON.stringify(event)}\n\n`;
  for (const res of clients) {
    try {
      res.write(data);
    } catch (e) {
      // ignore
    }
  }
}

function ensureChannel(quizId: ID) {
  if (!sseChannels.has(quizId)) sseChannels.set(quizId, new Set());
  return sseChannels.get(quizId)!;
}

function startQuestionTimer(quizId: ID) {
  const qz = quizzes.get(quizId)!;
  const idx = currentIndexByQuiz.get(quizId)!;
  if (idx < 0 || idx >= qz.questions.length) return;
  const q = qz.questions[idx];
  const deadline = Date.now() + q.timerSec * 1000;
  deadlinesByQuiz.set(quizId, deadline);
  questionStartByQuiz.set(quizId, Date.now());
  correctAnswersByQuestion.set(`${quizId}:${q.id}`, new Set());
  broadcast(quizId, { type: "question", state: currentState(quizId) });
  // schedule end
  setTimeout(() => {
    // close question if still current
    const nowIdx = currentIndexByQuiz.get(quizId) ?? -1;
    if (nowIdx !== idx) return;
    deadlinesByQuiz.delete(quizId);
    // reveal answers when broadcasting end-of-question leaderboard
    broadcast(quizId, { type: "leaderboard", state: currentState(quizId, true) });
  }, q.timerSec * 1000 + 50);
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!adminKey) return next(); // allow if no key set
  const key = (req.header("x-admin-key") || req.query.adminKey || req.body?.adminKey) as string | undefined;
  if (key && key === adminKey) return next();
  res.status(401).json({ error: "Unauthorized" });
}

export function createServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  // Admin login check (simple)
  app.post("/api/admin/login", (req, res) => {
    const { key } = req.body as { key?: string };
    if (!adminKey || key === adminKey) return res.json({ ok: true });
    res.status(401).json({ ok: false, error: "Invalid key" });
  });

  // Create quiz
  app.post("/api/quizzes", requireAdmin, (req, res) => {
    const input = req.body as CreateQuizInput;
    if (!input?.title || !Array.isArray(input.questions)) return res.status(400).json({ error: "Invalid payload" });
    const id = genId();
    const code = genCode();
    const quiz: Quiz = {
      id,
      code,
      title: input.title,
      questions: input.questions.map((q) => ({
        id: genId(),
        text: q.text,
        timerSec: Math.max(5, Math.min(300, Math.floor(q.timerSec || 30))),
        options: q.options.map((o) => ({ id: genId(), text: o.text, correct: !!o.correct })),
      })),
      status: "draft",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      questionCount: input.questions.length,
    } as any;
    quizzes.set(id, quiz);
    quizCodeToId.set(code, id);
    playersByQuiz.set(id, new Map());
    currentIndexByQuiz.set(id, -1);
    ensureChannel(id);
    res.json(quiz);
  });

  // List quizzes
  app.get("/api/quizzes", requireAdmin, (_req, res) => {
    const list = Array.from(quizzes.values()).map(toSummary);
    res.json(list);
  });

  // Get quiz (admin)
  app.get("/api/quizzes/:id", requireAdmin, (req, res) => {
    const q = quizzes.get(req.params.id);
    if (!q) return res.status(404).json({ error: "Not found" });
    res.json(q);
  });

  // Update quiz
  app.put("/api/quizzes/:id", requireAdmin, (req, res) => {
    const q = quizzes.get(req.params.id);
    if (!q) return res.status(404).json({ error: "Not found" });
    const input = req.body as UpdateQuizInput;
    q.title = input.title;
    q.questions = input.questions.map((qq) => ({ id: genId(), text: qq.text, timerSec: Math.max(5, Math.min(300, Math.floor(qq.timerSec || 30))), options: qq.options.map((o) => ({ id: genId(), text: o.text, correct: !!o.correct })) }));
    q.updatedAt = Date.now();
    quizzes.set(q.id, q);
    currentIndexByQuiz.set(q.id, -1);
    res.json(q);
  });

  // Duplicate quiz
  app.post("/api/quizzes/:id/duplicate", requireAdmin, (req, res) => {
    const q = quizzes.get(req.params.id);
    if (!q) return res.status(404).json({ error: "Not found" });
    const copy: Quiz = {
      ...q,
      id: genId(),
      code: genCode(),
      title: q.title + " (Copy)",
      questions: q.questions.map((qq) => ({
        id: genId(),
        text: qq.text,
        timerSec: qq.timerSec,
        options: qq.options.map((o) => ({ id: genId(), text: o.text, correct: o.correct }))
      })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as any;
    quizzes.set(copy.id, copy);
    quizCodeToId.set(copy.code, copy.id);
    playersByQuiz.set(copy.id, new Map());
    currentIndexByQuiz.set(copy.id, -1);
    ensureChannel(copy.id);
    res.json(copy);
  });

  // Delete quiz
  app.delete("/api/quizzes/:id", requireAdmin, (req, res) => {
    const id = req.params.id;
    const q = quizzes.get(id);
    if (!q) return res.status(404).json({ error: "Not found" });
    quizzes.delete(id);
    quizCodeToId.delete(q.code);
    playersByQuiz.delete(id);
    currentIndexByQuiz.delete(id);
    deadlinesByQuiz.delete(id);
    correctAnswersByQuestion.forEach((_v, k) => { if (k.startsWith(`${id}:`)) correctAnswersByQuestion.delete(k); });
    sseChannels.delete(id);
    res.json({ ok: true });
  });

  // Host controls
  app.post("/api/quizzes/:id/start", requireAdmin, (req, res) => {
    const id = req.params.id;
    const qz = quizzes.get(id);
    if (!qz) return res.status(404).json({ error: "Not found" });
    currentIndexByQuiz.set(id, 0);
    playersByQuiz.set(id, playersByQuiz.get(id) || new Map());
    startQuestionTimer(id);
    const payload: StartQuizResponse = currentState(id);
    broadcast(id, { type: "quiz_started", state: payload });
    res.json(payload);
  });

  app.post("/api/quizzes/:id/next", requireAdmin, (req, res) => {
    const id = req.params.id;
    const qz = quizzes.get(id);
    if (!qz) return res.status(404).json({ error: "Not found" });
    const idx = (currentIndexByQuiz.get(id) ?? -1) + 1;
    currentIndexByQuiz.set(id, idx);
    if (idx >= qz.questions.length) {
      deadlinesByQuiz.delete(id);
      broadcast(id, { type: "result", state: currentState(id, true) });
      return res.json(currentState(id, true));
    }
    startQuestionTimer(id);
    res.json(currentState(id));
  });

  app.post("/api/quizzes/:id/stop", requireAdmin, (req, res) => {
    const id = req.params.id;
    if (!quizzes.has(id)) return res.status(404).json({ error: "Not found" });
    currentIndexByQuiz.set(id, quizzes.get(id)!.questions.length);
    deadlinesByQuiz.delete(id);
    const state = currentState(id, true);
    broadcast(id, { type: "quiz_stopped", state });
    res.json(state);
  });

  // Participant: join via code
  app.post("/api/join/:code", (req, res) => {
    const code = req.params.code.toUpperCase();
    const quizId = quizCodeToId.get(code);
    if (!quizId) return res.status(404).json({ error: "Quiz not found" });
    const qz = quizzes.get(quizId)!;
    const { name } = req.body as JoinQuizInput;
    if (!name || !name.trim()) return res.status(400).json({ error: "Name required" });
    const playerId = genId();
    const player: Player = { id: playerId, name: name.trim().slice(0, 40), score: 0, correctCount: 0 };
    const map = playersByQuiz.get(quizId) || new Map();
    map.set(playerId, player);
    playersByQuiz.set(quizId, map);
    const resp: JoinQuizResponse = { quizId, playerId, code, title: qz.title };
    broadcast(quizId, { type: "leaderboard", state: currentState(quizId) });
    res.json(resp);
  });

  // Participant: stream live updates via SSE
  app.get("/api/stream/:quizId", (req, res) => {
    const quizId = req.params.quizId;
    if (!quizzes.has(quizId)) return res.status(404).json({ error: "Not found" });
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const ch = ensureChannel(quizId);
    ch.add(res);

    // initial state
    const init = currentState(quizId);
    res.write(`event: heartbeat\n` + `data: ${JSON.stringify({ type: "heartbeat", now: Date.now() })}\n\n`);
    res.write(`event: leaderboard\n` + `data: ${JSON.stringify({ type: "leaderboard", state: init })}\n\n`);
    if (init.status !== "draft") {
      res.write(`event: question\n` + `data: ${JSON.stringify({ type: "question", state: init })}\n\n`);
    }

    req.on("close", () => {
      ch.delete(res);
    });
  });

  // Participant: submit answer
  app.post("/api/answer/:quizId", (req, res) => {
    const quizId = req.params.quizId;
    const input = req.body as AnswerInput;
    const qz = quizzes.get(quizId);
    if (!qz) return res.status(404).json({ error: "Not found" });
    const idx = currentIndexByQuiz.get(quizId) ?? -1;
    if (idx < 0 || idx >= qz.questions.length) return res.status(400).json({ error: "Quiz not active" });
    const q = qz.questions[idx];
    if (q.id !== input.questionId) return res.status(400).json({ error: "Not current question" });
    const deadline = deadlinesByQuiz.get(quizId) || 0;
    const now = Date.now();
    if (now > deadline) return res.status(400).json({ error: "Time over" });

    const players = playersByQuiz.get(quizId) || new Map();
    const player = players.get(input.playerId);
    if (!player) return res.status(404).json({ error: "Player not found" });

    // Ensure one answer per question per player
    const key = `${quizId}:${q.id}`;
    const answeredCorrect = correctAnswersByQuestion.get(key) || new Set<ID>();

    const opt = q.options.find((o) => o.id === input.optionId);
    if (!opt) return res.status(400).json({ error: "Invalid option" });

    const elapsed = (now - (questionStartByQuiz.get(quizId) || now)) / 1000;
    const duration = Math.max(1, q.timerSec);

    if (opt.correct) {
      if (!answeredCorrect.has(player.id)) {
        // scoring: base + speed + fastest bonus for first correct
        const speedScore = Math.max(0, Math.round((1 - elapsed / duration) * 500));
        const base = 1000;
        const first = answeredCorrect.size === 0 ? 300 : 0;
        const gained = base + speedScore + first;
        player.score += gained;
        player.correctCount += 1;
        player.lastAnswerAt = now;
        answeredCorrect.add(player.id);
        correctAnswersByQuestion.set(key, answeredCorrect);
        broadcast(quizId, { type: "leaderboard", state: currentState(quizId) });
        return res.json({ ok: true, correct: true, gained });
      } else {
        return res.json({ ok: true, correct: true, gained: 0 });
      }
    } else {
      player.lastAnswerAt = now;
      broadcast(quizId, { type: "leaderboard", state: currentState(quizId) });
      return res.json({ ok: true, correct: false, gained: 0 });
    }
  });

  // Host/participant: get current live state snapshot
  app.get("/api/state/:quizId", (req, res) => {
    const quizId = req.params.quizId;
    if (!quizzes.has(quizId)) return res.status(404).json({ error: "Not found" });
    res.json(currentState(quizId));
  });

  return app;
}
