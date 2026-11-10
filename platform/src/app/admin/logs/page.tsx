import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { listAuditLogs, listErrorLogs } from '@/server/services/admin';

export default async function AdminLogs() {
  const [errors, audits] = await Promise.all([listErrorLogs(50), listAuditLogs(100)]);
  return (
    <>
      <PageHeader title="Erreurs et journal d’audit" description="Erreurs serveur capturées et événements sensibles (connexions, exports, suppressions, actions d’administration)." />
      <Card>
        <CardHeader><CardTitle>Erreurs techniques ({errors.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {errors.length === 0 ? <p className="text-sm text-ink-2">Aucune erreur enregistrée.</p> : errors.map((e) => (
            <details key={e.id} className="rounded-xl border p-3 text-sm">
              <summary className="cursor-pointer"><span className="text-xs text-muted">{e.createdAt.toLocaleString('fr-FR')} · {e.method} {e.path}</span> — {e.message.slice(0, 160)}</summary>
              <pre className="mt-2 max-h-60 overflow-auto rounded-lg bg-surface-2 p-2 text-xs whitespace-pre-wrap">{e.stack ?? 'Pas de trace'}{e.digest ? `\ndigest: ${e.digest}` : ''}</pre>
            </details>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Journal d’audit</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b text-left text-muted"><th className="py-2 pr-3">Date</th><th className="pr-3">Action</th><th className="pr-3">Compte</th><th className="pr-3">IP</th><th>Détails</th></tr></thead>
            <tbody>
              {audits.map((a) => (
                <tr key={a.id} className="border-b last:border-0"><td className="py-1.5 pr-3 whitespace-nowrap">{a.createdAt.toLocaleString('fr-FR')}</td><td className="pr-3 font-medium">{a.action}</td><td className="pr-3">{a.email ?? '—'}</td><td className="pr-3">{a.ip ?? '—'}</td><td className="font-mono">{JSON.stringify(a.metadata).slice(0, 120)}</td></tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}
