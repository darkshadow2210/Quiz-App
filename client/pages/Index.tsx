import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function Index() {
  const [code, setCode] = useState("");
  const nav = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 brand-gradient" />
          <div className="container mx-auto py-20 relative">
            <div className="max-w-3xl">
              <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight">
                Live quizzes with
                <span className="block text-gradient">Fastest Finger First</span>
              </h1>
              <p className="mt-5 text-lg text-muted-foreground max-w-2xl">
                Create interactive multiple-choice quizzes, share a join code, and watch the real-time leaderboard update with speed-based scoring.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link to="/admin/dashboard"><Button size="lg">Create a quiz</Button></Link>
                <div className="flex items-center gap-2">
                  <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Enter code" className="h-11 px-4 rounded-md border bg-background" />
                  <Button size="lg" variant="secondary" onClick={() => code && nav(`/play/${code}`)}>Join</Button>
                </div>
              </div>
              <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Feature title="Create & host" desc="Build quizzes in minutes, control the flow, and set timers per question." />
                <Feature title="Fastest gets bonus" desc="Correct answers score points; the quickest earns extra bonus." />
                <Feature title="Live leaderboard" desc="Real-time ranks keep the energy high and the game competitive." />
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto py-16">
          <h2 className="text-2xl font-bold mb-6">How it works</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <Step n={1} title="Create" desc="Add questions, options, and timers." />
            <Step n={2} title="Share" desc="Send the join code or link to participants." />
            <Step n={3} title="Play" desc="Start, track the leaderboard, and view results." />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border p-4 bg-card">
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="rounded-xl border p-5 bg-card">
      <div className="w-8 h-8 rounded-full brand-gradient text-white grid place-items-center font-bold">{n}</div>
      <h3 className="font-semibold mt-3">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
