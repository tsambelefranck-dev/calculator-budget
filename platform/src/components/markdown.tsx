import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Rendu Markdown minimal et sûr (aucun HTML injecté) : titres, listes, citations, tableaux,
 * gras, italique, code en ligne et liens internes.
 */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let index = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > last) nodes.push(text.slice(last, start));
    const token = match[0];
    const key = `${keyPrefix}-${index++}`;
    if (token.startsWith('**')) nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith('`')) nodes.push(<code key={key} className="rounded bg-surface-2 px-1 text-[0.9em]">{token.slice(1, -1)}</code>);
    else if (token.startsWith('[')) {
      const [, label, href] = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token) ?? [];
      const safe = href && (href.startsWith('/') || href.startsWith('https://'));
      nodes.push(
        safe ? (
          <a key={key} href={href} className="font-medium text-primary-ink underline" {...(href.startsWith('https://') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
            {label}
          </a>
        ) : (
          label
        ),
      );
    } else nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    last = start + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const key = `b${k++}`;
    if (!line.trim()) {
      i += 1;
      continue;
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1]!.length;
      blocks.push(level <= 2 ? <h2 key={key}>{inline(heading[2]!, key)}</h2> : <h3 key={key}>{inline(heading[2]!, key)}</h3>);
      i += 1;
      continue;
    }
    if (/^\s*([-*]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*]|\d+[.)])\s+/.test(lines[i]!)) {
        items.push(lines[i]!.replace(/^\s*([-*]|\d+[.)])\s+/, ''));
        i += 1;
      }
      const children = items.map((item, j) => <li key={j}>{inline(item, `${key}-${j}`)}</li>);
      blocks.push(ordered ? <ol key={key}>{children}</ol> : <ul key={key}>{children}</ul>);
      continue;
    }
    if (line.startsWith('>')) {
      const quote: string[] = [];
      while (i < lines.length && lines[i]!.startsWith('>')) {
        quote.push(lines[i]!.replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push(<blockquote key={key}>{inline(quote.join(' '), key)}</blockquote>);
      continue;
    }
    if (line.trim().startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.trim().startsWith('|')) {
        const cells = lines[i]!.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i += 1;
      }
      const [head, ...body] = rows;
      blocks.push(
        <div key={key} className="overflow-x-auto">
          <table>
            {head ? <thead><tr>{head.map((c, j) => <th key={j}>{inline(c, `${key}-h${j}`)}</th>)}</tr></thead> : null}
            <tbody>{body.map((r, j) => <tr key={j}>{r.map((c, n) => <td key={n}>{inline(c, `${key}-${j}-${n}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }
    const paragraph: string[] = [];
    while (i < lines.length && lines[i]!.trim() && !/^(#{1,4}\s|>|\s*([-*]|\d+[.)])\s|\s*\|)/.test(lines[i]!)) {
      paragraph.push(lines[i]!);
      i += 1;
    }
    blocks.push(<p key={key}>{inline(paragraph.join(' '), key)}</p>);
  }
  return <div className={cn('prose-nexafi text-[15px]', className)}>{blocks}</div>;
}
