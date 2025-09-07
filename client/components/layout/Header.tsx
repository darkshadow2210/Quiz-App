import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { Menu, X } from "lucide-react";

export default function Header() {
  const loc = useLocation();
  const isActive = (p: string) => loc.pathname.startsWith(p);
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto flex items-center justify-between py-3">
        <Link to="/" className="flex items-center gap-2 font-extrabold text-xl">
          <span className="w-7 h-7 rounded-md brand-gradient shadow-sm" />
          <span className="text-gradient">PulseQuiz</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm" role="navigation" aria-label="Main navigation">
          <Link className={`hover:text-primary ${isActive("/join") ? "text-primary" : "text-muted-foreground"}`} to="/join">Join</Link>
          <Link className={`hover:text-primary ${isActive("/admin") ? "text-primary" : "text-muted-foreground"}`} to="/admin/dashboard">Dashboard</Link>
          <Link className={`hover:text-primary ${isActive("/docs") ? "text-primary" : "text-muted-foreground"}`} to="/">Features</Link>
        </nav>

        {/* Mobile actions */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2">
            <Link to="/join"><Button variant="secondary">Enter Code</Button></Link>
            <Link to="/admin/dashboard"><Button>Create Quiz</Button></Link>
            <ThemeToggle />
          </div>

          <button aria-label="menu" aria-expanded={open} onClick={() => setOpen((s) => !s)} className="md:hidden p-2 rounded-md border">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile panel */}
      <div className={`${open ? "max-h-screen" : "max-h-0"} overflow-hidden transition-all md:hidden border-t bg-card`}>
        <div className="container mx-auto py-4 flex flex-col gap-3">
          <Link to="/join" onClick={() => setOpen(false)} className="text-base">Join</Link>
          <Link to="/admin/dashboard" onClick={() => setOpen(false)} className="text-base">Dashboard</Link>
          <Link to="/" onClick={() => setOpen(false)} className="text-base">Features</Link>
          <div className="flex gap-2 pt-2">
            <Link to="/join" onClick={() => setOpen(false)} className="w-full"><Button variant="secondary" className="w-full">Enter Code</Button></Link>
            <Link to="/admin/dashboard" onClick={() => setOpen(false)} className="w-full"><Button className="w-full">Create Quiz</Button></Link>
          </div>
          <div className="pt-2"><ThemeToggle /></div>
        </div>
      </div>
    </header>
  );
}
