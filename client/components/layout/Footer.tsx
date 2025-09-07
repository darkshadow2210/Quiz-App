export default function Footer() {
  return (
    <footer className="border-t mt-20">
      <div className="container mx-auto py-8 text-sm text-muted-foreground flex items-center justify-between">
        <p>© {new Date().getFullYear()} PulseQuiz Developed By Vikhyath</p>
        <p className="hidden sm:block">Real-time quizzes with fastest-finger scoring.</p>
      </div>
    </footer>
  );
}
