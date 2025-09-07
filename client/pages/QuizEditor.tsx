import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useEffect, useState } from "react";
import { AdminAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import { Quiz } from "@shared/api";

interface DraftOption { text: string; correct?: boolean }
interface DraftQuestion { text: string; timerSec: number; options: DraftOption[] }

export default function QuizEditor() {
  const { id } = useParams();
  const isNew = id === undefined;
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([{ text: "", timerSec: 20, options: [{ text: "", correct: true }, { text: "" }] }]);
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      if (!isNew && id) {
        const q = await AdminAPI.getQuiz(id);
        setTitle(q.title);
        setQuestions(q.questions.map((qq) => ({ text: qq.text, timerSec: qq.timerSec, options: qq.options.map((o) => ({ text: o.text, correct: o.correct })) })));
      }
    })();
  }, [id, isNew]);

  async function save() {
    const payload = { title, questions };
    if (isNew) {
      const created = await AdminAPI.createQuiz(payload);
      // persist to Firestore
      try { await import("@/lib/firestore").then((m) => m.saveQuizDoc(created)); } catch (e) {}
      nav(`/host/${created.id}`);
    } else if (id) {
      const updated = await AdminAPI.updateQuiz(id, payload);
      try { await import("@/lib/firestore").then((m) => m.saveQuizDoc(updated)); } catch (e) {}
      nav(`/host/${id}`);
    }
  }

  function addQuestion() {
    setQuestions((qs) => [...qs, { text: "", timerSec: 20, options: [{ text: "", correct: true }, { text: "" }] }]);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-6">{isNew ? "Create Quiz" : "Edit Quiz"}</h1>
        <div className="max-w-3xl space-y-6">
          <div>
            <label className="text-sm font-medium">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full h-11 px-3 rounded-md border" placeholder="Quiz title" />
          </div>

          {questions.map((q, qi) => (
            <div key={qi} className="rounded-xl border p-4 bg-card space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Question {qi + 1}</h3>
                <Button variant="ghost" onClick={() => setQuestions((qs) => qs.filter((_, i) => i !== qi))}>Remove</Button>
              </div>
              <input value={q.text} onChange={(e) => setQuestions((qs) => { const c = [...qs]; c[qi] = { ...c[qi], text: e.target.value }; return c; })} placeholder="Question text" className="w-full h-11 px-3 rounded-md border" />
              <div className="flex items-center gap-3">
                <label className="text-sm text-muted-foreground">Timer (sec)</label>
                <input type="number" min={5} max={300} value={q.timerSec} onChange={(e) => setQuestions((qs) => { const c = [...qs]; c[qi] = { ...c[qi], timerSec: Number(e.target.value) }; return c; })} className="h-10 w-24 px-3 rounded-md border" />
              </div>
              <div className="space-y-2">
                {q.options.map((o, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input value={o.text} onChange={(e) => setQuestions((qs) => { const c = [...qs]; const opts = [...c[qi].options]; opts[oi] = { ...opts[oi], text: e.target.value }; c[qi] = { ...c[qi], options: opts }; return c; })} placeholder={`Option ${oi + 1}`} className="h-10 px-3 rounded-md border w-full" />
                    <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={!!o.correct} onChange={(e) => setQuestions((qs) => { const c = [...qs]; const opts = [...c[qi].options]; opts[oi] = { ...opts[oi], correct: e.target.checked }; c[qi] = { ...c[qi], options: opts }; return c; })} /> Correct</label>
                    <Button variant="ghost" onClick={() => setQuestions((qs) => { const c = [...qs]; c[qi] = { ...c[qi], options: c[qi].options.filter((_, i) => i !== oi) }; return c; })}>Remove</Button>
                  </div>
                ))}
                <Button variant="secondary" onClick={() => setQuestions((qs) => { const c = [...qs]; c[qi] = { ...c[qi], options: [...c[qi].options, { text: "" }] }; return c; })}>Add Option</Button>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={addQuestion}>Add Question</Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
