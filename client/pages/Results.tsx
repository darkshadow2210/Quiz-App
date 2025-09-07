import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useEffect, useState } from "react";
import { ParticipantAPI } from "@/lib/api";
import { Leaderboard } from "@/components/quiz/Leaderboard";
import { LiveState } from "@shared/api";
import { useParams } from "react-router-dom";

export default function Results() {
  const { id } = useParams();
  const [state, setState] = useState<LiveState | null>(null);

  useEffect(() => {
    (async () => { if (id) setState(await ParticipantAPI.state(id)); })();
  }, [id]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-6">Results</h1>
        {state && <Leaderboard entries={state.leaderboard} />}
      </main>
      <Footer />
    </div>
  );
}
