import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Join() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const nav = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto py-10 max-w-lg">
        <h1 className="text-2xl font-bold mb-6">Join a Quiz</h1>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Join Code</label>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="mt-1 w-full h-11 px-3 rounded-md border" placeholder="e.g., 4YQ2K9" />
          </div>
          <div>
            <label className="text-sm font-medium">Your Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full h-11 px-3 rounded-md border" placeholder="Jane" />
          </div>
          <Button className="w-full" onClick={() => code && name && nav(`/play/${code}?name=${encodeURIComponent(name)}`)}>Join</Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
