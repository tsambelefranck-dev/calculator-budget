import type { ReactNode } from 'react';

/** Vue tableau d'un graphique (accessibilité : les valeurs ne dépendent jamais de la couleur seule). */
export function ChartDataTable({ caption, headers, rows }: { caption: string; headers: string[]; rows: ReactNode[][] }) {
  return (
    <details className="group mt-3 text-sm">
      <summary className="cursor-pointer text-xs font-medium text-muted hover:text-ink">Voir les données</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b text-muted">
              {headers.map((h) => (
                <th key={h} className="py-1.5 pr-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b last:border-0">
                {row.map((cell, j) => (
                  <td key={j} className="py-1.5 pr-3 tabular">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
