import { ID, LiveState } from "@shared/api";
import { Check, X } from "lucide-react";

export function QuestionCard({ state, disabled, onAnswer, selected }: { state: LiveState; disabled?: boolean; onAnswer: (optionId: ID) => void; selected?: ID | null }) {
  const q = state.question!;
  const reveal = !!state.revealAnswers;

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="font-semibold text-lg mb-4 leading-snug">{q.text}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {q.options.map((o, idx) => {
          const isCorrect = !!(o as any).correct;
          const isSelected = selected === o.id;
          const base = "min-h-[56px] text-base w-full text-left px-4 rounded-md border transition-all duration-150 flex items-center justify-between gap-3";
          let extra = idx % 2 ? "bg-secondary" : "bg-background";

          if (!reveal && isSelected) {
            // immediate selection highlight
            extra = "bg-primary text-primary-foreground border-primary ring-2 ring-offset-2 ring-primary/30";
          }

          if (reveal) {
            if (isCorrect) extra = "bg-green-50 border-green-400";
            else if (isSelected && !isCorrect) extra = "bg-red-50 border-red-400";
            else extra = "bg-background";
          }

          return (
            <button
              key={o.id}
              role="button"
              aria-pressed={isSelected}
              aria-disabled={disabled || reveal}
              disabled={disabled || reveal}
              onClick={() => onAnswer(o.id)}
              className={`${base} ${extra}`}
            >
              <span className="flex-1 truncate">{o.text}</span>
              <span className="flex items-center gap-2">
                {reveal && isCorrect && <Check className="w-4 h-4 text-green-600" aria-hidden />}
                {reveal && isSelected && !isCorrect && <X className="w-4 h-4 text-red-600" aria-hidden />}
                {!reveal && isSelected && <span className="ml-1 text-sm text-primary-foreground">Selected</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
