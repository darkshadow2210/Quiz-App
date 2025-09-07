import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useEffect, useState } from "react";
import { AdminAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import type { QuizSummary } from "@shared/api";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { listQuizDocs } from "@/lib/firestore";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [quizzes, setQuizzes] = useState<QuizSummary[] | null>(null);
  const nav = useNavigate();

  async function load() {
    try {
      const list = await listQuizDocs();
      setQuizzes(list as any);
    } catch (e) {
      setQuizzes([]);
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) load();
      else setQuizzes(null);
    });
    return () => unsub();
  }, []);

  async function onLogin(email: string, password: string) {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      if (e.code === "auth/user-not-found") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        // bubble up other errors
        throw e;
      }
    }
  }

  if (loading) return <div className="min-h-screen">Loading…</div>;

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto py-10">
          <h1 className="text-2xl font-bold mb-4">Account</h1>
          <p className="text-sm text-muted-foreground mb-4">Sign in or sign up to manage and create quizzes.</p>
          <LoginForm onLogin={onLogin} />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-2">
            <Link to="/admin/quizzes/new"><Button>Create Quiz</Button></Link>
            <Button variant="ghost" onClick={() => { signOut(auth); }}>Sign out</Button>
          </div>
        </div>
        {quizzes && quizzes.length === 0 && <p className="text-muted-foreground">No quizzes yet. Create one to get started.</p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes?.map((q) => (
            <div key={(q as any).id} className="rounded-xl border p-4 bg-card flex flex-col gap-3">
              <div>
                <h3 className="font-semibold">{(q as any).title}</h3>
                <p className="text-xs text-muted-foreground">{(q as any).questions?.length || 0} questions • Code {(q as any).code}</p>
              </div>
              <div className="mt-auto flex gap-2">
                <Button variant="secondary" onClick={() => nav(`/host/${(q as any).id}`)}>Host</Button>
                <Link to={`/admin/quizzes/${(q as any).id}/edit`}><Button variant="outline">Edit</Button></Link>
                <Button variant="ghost" onClick={async () => { const created = await AdminAPI.duplicateQuiz((q as any).id); try { await import("@/lib/firestore").then((m) => m.saveQuizDoc(created)); } catch (e) {} load(); }}>Duplicate</Button>
                <Button variant="ghost" onClick={async () => { await AdminAPI.deleteQuiz((q as any).id); try { await import("@/lib/firestore").then((m) => m.deleteQuizDoc((q as any).id)); } catch (e) {} load(); }}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function LoginForm({ onLogin }: { onLogin?: (e: string, p: string) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [signUp, setSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setErr("");
    setLoading(true);
    try {
      if (signUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (onLogin) await onLogin(email, password);
        else await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (e: any) {
      // friendly error messages
      if (e?.code === "auth/network-request-failed") setErr("Network error — please check your connection and try again.");
      else if (e?.code === "auth/invalid-email") setErr("Invalid email address.");
      else if (e?.code === "auth/weak-password") setErr("Password is too weak (min 6 chars).");
      else setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md">
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full h-11 px-3 rounded-md border mb-2" />
      <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" className="w-full h-11 px-3 rounded-md border mb-2" />
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button onClick={submit} disabled={loading}>{signUp ? "Sign up" : "Sign in"}</Button>
        </div>
        <button className="text-sm text-muted-foreground underline" onClick={() => setSignUp((s) => !s)}>{signUp ? "Have an account? Sign in" : "No account? Sign up"}</button>
      </div>
      {err && <p className="text-destructive mt-2">{err}</p>}
    </div>
  );
}
