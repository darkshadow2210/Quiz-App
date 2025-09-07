import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useEffect, useMemo, useState } from "react";
import { AdminAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Leaderboard } from "@/components/quiz/Leaderboard";
import { Timer } from "@/components/quiz/Timer";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { LiveEvent, LiveState, Quiz } from "@shared/api";
import { ParticipantAPI } from "@/lib/api";
import { useParams } from "react-router-dom";

export default function HostLobby() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [state, setState] = useState<LiveState | null>(null);
  const [es, setEs] = useState<EventSource | null>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const q = await AdminAPI.getQuiz(id);
      setQuiz(q);
      const st = await ParticipantAPI.state(id);
      setState(st);
      const _es = ParticipantAPI.stream(id, (ev: LiveEvent) => {
        if (ev.type === "leaderboard" || ev.type === "question" || ev.type === "quiz_started" || ev.type === "result" || ev.type === "quiz_stopped") {
          setState(ev.state);
        }
      });
      setEs(_es);
      return () => _es.close();
    })();
  }, [id]);

  async function start() { if (id) setState(await AdminAPI.start(id)); }
  async function next() { if (id) setState(await AdminAPI.next(id)); }
  async function stop() { if (id) setState(await AdminAPI.stop(id)); }

  const shareUrl = useMemo(() => (quiz ? `${window.location.origin}/play/${quiz.code}` : ""), [quiz]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto py-8">
        {quiz && (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <div className="rounded-xl border p-4 bg-card">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold">{quiz.title}</h1>
                    <p className="text-sm text-muted-foreground">Code <span className="font-mono font-semibold">{quiz.code}</span> • <a className="underline" href={shareUrl} target="_blank">{shareUrl}</a></p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={start}>Start</Button>
                    <Button variant="secondary" onClick={next}>Next</Button>
                    <Button variant="destructive" onClick={stop}>Stop</Button>
                  </div>
                </div>
              </div>

              {state?.deadline && <Timer deadline={state.deadline} />}

              {state?.question && (
                <QuestionCard state={state} disabled onAnswer={() => {}} />
              )}

              {state?.status === "ended" && (
                <div className="rounded-xl border p-6 bg-card">
                  <h3 className="font-semibold mb-2">Results</h3>
                  <p className="text-muted-foreground text-sm">Quiz ended. Share results with participants.</p>
                </div>
              )}
            </div>

            <div className="w-full lg:w-80 shrink-0">
              {state && <Leaderboard entries={state.leaderboard} />}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
