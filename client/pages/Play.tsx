import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useEffect, useMemo, useState } from "react";
import { ParticipantAPI } from "@/lib/api";
import { LiveEvent, LiveState } from "@shared/api";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { Timer } from "@/components/quiz/Timer";
import { Leaderboard } from "@/components/quiz/Leaderboard";
import { Button } from "@/components/ui/button";
import { useParams, useSearchParams } from "react-router-dom";

export default function Play() {
  const { code } = useParams();
  const [params] = useSearchParams();
  const [name, setName] = useState<string>(params.get("name") || localStorage.getItem("player_name") || "");
  const [playerId, setPlayerId] = useState<string | null>(localStorage.getItem(`player_${code}_id`));
  const [quizId, setQuizId] = useState<string | null>(localStorage.getItem(`quiz_${code}_id`));
  const [state, setState] = useState<LiveState | null>(null);
  const [answered, setAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answersRecord, setAnswersRecord] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      if (!code) return;
      if (!playerId || !quizId) {
        if (!name) return;
        const r = await ParticipantAPI.join(code, { name });
        setPlayerId(r.playerId); setQuizId(r.quizId);
        localStorage.setItem("player_name", name);
        localStorage.setItem(`player_${code}_id`, r.playerId);
        localStorage.setItem(`quiz_${code}_id`, r.quizId);
      }
    })();
  }, [code, name]);

  useEffect(() => {
    if (!quizId) return;
    let close: (() => void) | undefined;
    (async () => {
      const st = await ParticipantAPI.state(quizId);
      setState(st);
      const es = ParticipantAPI.stream(quizId, (ev: LiveEvent) => {
        if (ev.type === "leaderboard" || ev.type === "question" || ev.type === "quiz_started" || ev.type === "quiz_stopped" || ev.type === "result") {
          setState(ev.state);
          if (ev.type === "question") {
            setAnswered(false);
            setSelectedOption(null);
          }
          if ((ev.type === "leaderboard" || ev.type === "result") && ev.state.question) {
            // question ended and answers revealed
            // ev.state.question.options may include .correct
          }
        }
      });
      close = () => es.close();
    })();
    return () => { if (close) close(); };
  }, [quizId]);

  const canAnswer = useMemo(() => !!state?.question && !!state?.deadline && !answered, [state, answered]);

  async function onAnswer(optionId: string) {
    if (!quizId || !playerId || !state?.question) return;
    setAnswered(true);
    setSelectedOption(optionId);
    try {
      const res = await ParticipantAPI.answer(quizId, { playerId, questionId: state.question.id, optionId });
      setAnswersRecord((r) => ({ ...r, [state.question!.id]: !!res.correct }));
    } catch {
      setAnswered(false);
      setSelectedOption(null);
    }
  }

  const finalSummary = (() => {
    const entries = Object.values(answersRecord);
    const right = entries.filter(Boolean).length;
    const wrong = entries.length - right;
    return { right, wrong, total: entries.length };
  })();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto py-8">
        {!playerId || !quizId ? (
          <div className="max-w-md"><h1 className="text-2xl font-bold mb-3">Enter your name</h1>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-11 px-3 rounded-md border" placeholder="Your name" />
            <Button className="mt-3" onClick={() => setName(name.trim())}>Continue</Button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              {state?.deadline && <Timer deadline={state.deadline} />}
              {state?.question ? (
                <QuestionCard state={state} disabled={!canAnswer} onAnswer={onAnswer} selected={selectedOption} />
              ) : (
                <div className="rounded-xl border p-6 bg-card text-center text-muted-foreground">Waiting for the host to start…</div>
              )}

              {state?.status === "ended" && (
                <div className="rounded-xl border p-6 bg-card">
                  <h3 className="text-xl font-semibold">Quiz Complete</h3>
                  <p className="mt-2">You answered {finalSummary.total} questions: <span className="font-semibold text-green-600">{finalSummary.right} correct</span>, <span className="font-semibold text-red-600">{finalSummary.wrong} wrong</span>.</p>
                  <div className="mt-4">
                    <Button onClick={() => window.location.href = `/results/${state.quizId}`}>View full results</Button>
                  </div>
                </div>
              )}
            </div>
            <div>
              {state && <Leaderboard entries={state.leaderboard} compact />}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
