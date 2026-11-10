'use client';

import { CircleCheck, CircleX } from 'lucide-react';
import { useActionState } from 'react';
import { SubmitButton } from '@/components/ui/submit-button';
import { useActionFeedback } from '@/components/ui/use-action-feedback';
import { cn } from '@/lib/utils';
import { submitQuizAction } from '@/server/actions/learn';

export function Quiz({ slug, questions }: { slug: string; questions: { question: string; options: string[] }[] }) {
  const [state, action] = useActionState(submitQuizAction.bind(null, slug), {});
  useActionFeedback(state);
  const results = state.results;
  return (
    <form action={action} className="space-y-5">
      {questions.map((q, i) => (
        <fieldset key={q.question} className="space-y-2">
          <legend className="text-sm font-semibold">{i + 1}. {q.question}</legend>
          {q.options.map((option, j) => {
            const r = results?.[i];
            return (
              <label key={option} className={cn('flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 text-sm hover:bg-surface-2', r && j === r.answer && 'border-good bg-good-soft')}>
                <input type="radio" name={`q${i}`} value={j} required className="size-4 accent-[var(--primary)]" disabled={Boolean(results)} />
                {option}
              </label>
            );
          })}
          {results?.[i] ? (
            <p className={cn('flex gap-2 text-sm', results[i]!.correct ? 'text-good-ink' : 'text-critical-ink')}>
              {results[i]!.correct ? <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CircleX className="mt-0.5 size-4 shrink-0" aria-hidden />}
              <span>{results[i]!.correct ? 'Bonne réponse. ' : 'Pas tout à fait. '}<span className="text-ink-2">{results[i]!.explanation}</span></span>
            </p>
          ) : null}
        </fieldset>
      ))}
      {!results ? <SubmitButton>Valider mes réponses</SubmitButton> : <p className="font-semibold">Ton score : {state.score} %</p>}
    </form>
  );
}
