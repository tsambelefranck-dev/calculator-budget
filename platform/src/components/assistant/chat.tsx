'use client';

import { Bot, Database, LoaderCircle, Send, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Markdown } from '@/components/markdown';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tools: string[];
  status?: string;
}

const SUGGESTIONS = [
  'Analyse mes dépenses du mois et dis-moi ce qui ne va pas.',
  'Je gagne 250 000 FCFA par mois. Comment organiser mon salaire ?',
  'Comment économiser 1 million de FCFA en 12 mois ?',
  'Comment sortir de mes dettes ?',
  'Comment constituer un fonds d’urgence ?',
  'J’ai 200 000 FCFA disponibles. Quelles options d’investissement étudier ?',
  'Vaut-il mieux créer un petit commerce ou investir dans l’immobilier ?',
];

export function Chat({
  conversationId,
  initialMessages,
  enabled,
  remaining,
  toolLabels,
}: {
  conversationId: string | null;
  initialMessages: ChatMessage[];
  enabled: boolean;
  remaining: number;
  toolLabels: Record<string, string>;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [convId, setConvId] = useState<string | null>(conversationId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, activeTool]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || pending) return;
    setError(null);
    setInput('');
    setPending(true);
    const assistantId = `a-${Date.now()}`;
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: 'user', content: message, tools: [] }, { id: assistantId, role: 'assistant', content: '', tools: [] }]);
    const update = (fn: (msg: ChatMessage) => ChatMessage) => setMessages((list) => list.map((m) => (m.id === assistantId ? fn(m) : m)));
    let newConversation: string | null = null;
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convId, message }),
      });
      if (!response.ok || !response.body) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? 'Le service ne répond pas.');
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const raw of events) {
          const line = raw.trim();
          if (!line.startsWith('data:')) continue;
          const event = JSON.parse(line.slice(5)) as { type: string; delta?: string; name?: string; label?: string; conversationId?: string; message?: string; status?: string };
          if (event.type === 'start' && event.conversationId && !convId) newConversation = event.conversationId;
          if (event.type === 'text' && event.delta) {
            setActiveTool(null);
            update((m) => ({ ...m, content: m.content + event.delta }));
          }
          if (event.type === 'tool' && event.name) {
            setActiveTool(event.label ?? event.name);
            update((m) => ({ ...m, tools: m.tools.includes(event.name!) ? m.tools : [...m.tools, event.name!] }));
          }
          if (event.type === 'error') setError(event.message ?? 'Erreur.');
          if (event.type === 'done') update((m) => ({ ...m, status: event.status }));
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inattendue.');
      setMessages((list) => list.filter((m) => m.id !== assistantId || m.content));
    } finally {
      setPending(false);
      setActiveTool(null);
      if (newConversation) {
        setConvId(newConversation);
        router.replace(`/app/assistant?c=${newConversation}`, { scroll: false });
      }
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-[60dvh] flex-col rounded-2xl border bg-surface shadow-card">
      <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6" aria-live="polite">
        {messages.length === 0 ? (
          <div className="space-y-4 py-6 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary-ink"><Bot className="size-6" aria-hidden /></div>
            <div>
              <p className="font-semibold">Bonjour, je suis ton coach financier.</p>
              <p className="text-sm text-ink-2">Je m’appuie sur tes chiffres et sur des calculs vérifiés. Pose-moi une question :</p>
            </div>
            <div className="mx-auto flex max-w-2xl flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" disabled={!enabled || pending} onClick={() => send(s)} className="rounded-full border px-3 py-1.5 text-left text-sm text-ink-2 hover:bg-surface-2 disabled:opacity-50">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={cn('flex gap-3', m.role === 'user' && 'flex-row-reverse')}>
              <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', m.role === 'user' ? 'bg-surface-3 text-ink-2' : 'bg-primary text-on-primary')}>
                {m.role === 'user' ? <User className="size-4" aria-hidden /> : <Bot className="size-4" aria-hidden />}
              </div>
              <div className={cn('max-w-[85%] space-y-2 rounded-2xl px-4 py-3', m.role === 'user' ? 'bg-primary-soft text-ink' : 'bg-surface-2')}>
                {m.role === 'user' ? <p className="text-[15px] whitespace-pre-wrap">{m.content}</p> : m.content ? <Markdown text={m.content} /> : <p className="flex items-center gap-2 text-sm text-muted"><LoaderCircle className="size-4 animate-spin" aria-hidden /> {activeTool ? `Consultation : ${activeTool}…` : 'Réflexion…'}</p>}
                {m.tools.length ? (
                  <p className="flex flex-wrap items-center gap-1.5 border-t pt-2 text-xs text-muted">
                    <Database className="size-3.5" aria-hidden /> Données et calculs utilisés :
                    {m.tools.map((t) => <span key={t} className="rounded-full bg-surface px-2 py-0.5">{toolLabels[t] ?? t}</span>)}
                  </p>
                ) : null}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      {error ? <p className="border-t px-4 py-2 text-sm text-critical-ink" role="alert">{error}</p> : null}
      <form
        className="flex items-end gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <label htmlFor="chat-input" className="sr-only">Ta question</label>
        <textarea
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          rows={1}
          maxLength={2000}
          disabled={!enabled || pending}
          placeholder={enabled ? 'Pose ta question… (Entrée pour envoyer)' : 'Assistant indisponible'}
          className="max-h-40 min-h-11 flex-1 resize-none rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-[15px] focus:border-ring focus:ring-2 focus:ring-ring/25 focus:outline-none disabled:opacity-60"
        />
        <Button type="submit" size="icon" disabled={!enabled || pending || !input.trim()} aria-label="Envoyer">
          {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
        </Button>
      </form>
      <p className="px-4 pb-3 text-[11px] text-muted">{remaining} message(s) restant(s) ce mois-ci · Éducation financière, pas un conseil en investissement personnalisé. Ne partage jamais de code PIN ni de mot de passe.</p>
    </div>
  );
}
