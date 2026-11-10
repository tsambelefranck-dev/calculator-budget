import { AdminForm } from '@/components/admin/admin-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page-header';
import { SubmitButton } from '@/components/ui/submit-button';
import { adminUserAction } from '@/server/actions/admin';
import { listUsersForAdmin } from '@/server/services/admin';

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { q, page } = await searchParams;
  const pageNumber = Math.max(0, Number(page) || 0);
  const { rows, hasMore } = await listUsersForAdmin(q?.trim().slice(0, 80) || undefined, pageNumber);
  return (
    <>
      <PageHeader title="Utilisateurs" description="Gestion des comptes, des rôles et des abonnements. Les données financières des utilisateurs ne sont pas affichées." />
      <form className="flex gap-2"><Input name="q" defaultValue={q} placeholder="Rechercher par e-mail ou nom" aria-label="Rechercher" /><Button type="submit" variant="outline">Rechercher</Button></form>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-xs text-muted"><th className="px-4 py-2">Utilisateur</th><th className="px-2">Statut</th><th className="px-2">Inscription</th><th className="px-2">Dernière connexion</th><th className="px-4">Action</th></tr></thead>
            <tbody>
              {rows.map((u) => {
                const premium = u.plan === 'premium' && (!u.premiumUntil || u.premiumUntil > new Date());
                return (
                  <tr key={u.id} className="border-b last:border-0 align-top">
                    <td className="px-4 py-3"><p className="font-medium">{u.name}</p><p className="text-xs text-muted">{u.email}</p></td>
                    <td className="space-x-1 px-2 py-3">
                      {premium ? <Badge tone="gold">Premium{u.premiumUntil ? ` → ${u.premiumUntil.toLocaleDateString('fr-FR')}` : ''}</Badge> : <Badge>Gratuit</Badge>}
                      {u.role === 'admin' ? <Badge tone="info">Admin</Badge> : null}
                      {u.isDemo ? <Badge tone="warning">Démo</Badge> : null}
                      {u.disabledAt ? <Badge tone="critical">Désactivé</Badge> : null}
                      {!u.onboarded ? <Badge>Sans diagnostic</Badge> : null}
                    </td>
                    <td className="px-2 py-3 text-xs">{u.createdAt.toLocaleDateString('fr-FR')}</td>
                    <td className="px-2 py-3 text-xs">{u.lastLoginAt ? u.lastLoginAt.toLocaleDateString('fr-FR') : '—'}</td>
                    <td className="px-4 py-3">
                      <AdminForm action={adminUserAction} className="flex gap-2">
                        <input type="hidden" name="userId" value={u.id} />
                        <Select name="op" aria-label="Action" className="h-9 py-1 text-sm" defaultValue="premium30">
                          <option value="premium30">Premium 30 jours</option>
                          <option value="premium365">Premium 1 an</option>
                          <option value="free">Repasser en gratuit</option>
                          <option value="admin">Rôle administrateur</option>
                          <option value="user">Rôle utilisateur</option>
                          <option value={u.disabledAt ? 'enable' : 'disable'}>{u.disabledAt ? 'Réactiver' : 'Désactiver'}</option>
                        </Select>
                        <SubmitButton size="sm" variant="outline">OK</SubmitButton>
                      </AdminForm>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <div className="flex gap-2">
        {pageNumber > 0 ? <a className="text-sm text-primary-ink underline" href={`/admin/users?page=${pageNumber - 1}${q ? `&q=${encodeURIComponent(q)}` : ''}`}>Page précédente</a> : null}
        {hasMore ? <a className="text-sm text-primary-ink underline" href={`/admin/users?page=${pageNumber + 1}${q ? `&q=${encodeURIComponent(q)}` : ''}`}>Page suivante</a> : null}
      </div>
    </>
  );
}
