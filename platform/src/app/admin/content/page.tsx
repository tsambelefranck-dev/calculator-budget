import { AdminForm } from '@/components/admin/admin-form';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Select, Textarea } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page-header';
import { SubmitButton } from '@/components/ui/submit-button';
import { PLANNER_BUCKETS, PLANNER_BUCKET_LABELS } from '@/lib/constants';
import { adminCategoryAction, adminDomainAction, adminLessonAction, adminPublicationAction } from '@/server/actions/admin';
import { listAllCategories, listAllDomains, listAllLessons, listAllPublications } from '@/server/services/admin';

export default async function AdminContent() {
  const [lessons, domains, publications, categories] = await Promise.all([listAllLessons(), listAllDomains(), listAllPublications(), listAllCategories()]);
  return (
    <>
      <PageHeader title="Contenus" description="Leçons, fiches d’investissement, informations financières publiées et catégories de dépenses." />
      <Card>
        <CardHeader><CardTitle>Publier une information financière</CardTitle><CardDescription>Toujours avec une source vérifiable et sa date de consultation.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <AdminForm action={adminPublicationAction} className="grid gap-3 sm:grid-cols-2">
            <Input name="title" placeholder="Titre" required className="sm:col-span-2" />
            <Textarea name="body" placeholder="Texte" required className="sm:col-span-2" />
            <Input name="sourceName" placeholder="Nom de la source (ex. BCEAO)" required />
            <Input name="sourceUrl" type="url" placeholder="https://…" required />
            <Input name="consultedAt" type="date" required aria-label="Date de consultation" />
            <SubmitButton>Publier</SubmitButton>
          </AdminForm>
          <ul className="divide-y">
            {publications.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="flex-1">{p.title} <span className="text-xs text-muted">· {p.sourceName}, {p.consultedAt}</span></span>
                <AdminForm action={adminPublicationAction}><input type="hidden" name="deleteId" value={p.id} /><SubmitButton size="sm" variant="ghost">Supprimer</SubmitButton></AdminForm>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Fiches d’investissement</CardTitle><CardDescription>Publication et date de vérification des sources.</CardDescription></CardHeader>
        <CardContent className="divide-y">
          {domains.map((d) => (
            <AdminForm key={d.id} action={adminDomainAction} className="flex flex-wrap items-center gap-3 py-3 text-sm">
              <input type="hidden" name="id" value={d.id} />
              <span className="min-w-48 flex-1 font-medium">{d.name}</span>
              <span className="text-xs text-muted">Sources vérifiées : {d.sources.find((s) => s.consultedAt)?.consultedAt ?? 'non'}</span>
              <Input name="consultedAt" type="date" aria-label="Sources consultées le" className="h-9 w-40 py-1" />
              <label className="flex items-center gap-1.5"><input type="checkbox" name="isPublished" defaultChecked={d.isPublished} /> Publiée</label>
              <SubmitButton size="sm" variant="outline">Enregistrer</SubmitButton>
            </AdminForm>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Leçons</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {lessons.map((l) => (
            <details key={l.id} className="rounded-xl border p-3">
              <summary className="cursor-pointer text-sm font-medium">{l.title} {l.isPublished ? null : <Badge>Brouillon</Badge>} {l.isPremium ? <Badge tone="gold">Premium</Badge> : null}</summary>
              <AdminForm action={adminLessonAction} className="mt-3 space-y-2">
                <input type="hidden" name="id" value={l.id} />
                <Input name="title" defaultValue={l.title} aria-label="Titre" />
                <Input name="summary" defaultValue={l.summary} aria-label="Résumé" />
                <Textarea name="body" defaultValue={l.body} className="min-h-60 font-mono text-xs" aria-label="Contenu (Markdown)" />
                <div className="flex items-center gap-4 text-sm">
                  <label className="flex items-center gap-1.5"><input type="checkbox" name="isPublished" defaultChecked={l.isPublished} /> Publiée</label>
                  <label className="flex items-center gap-1.5"><input type="checkbox" name="isPremium" defaultChecked={l.isPremium} /> Premium</label>
                  <SubmitButton size="sm">Enregistrer</SubmitButton>
                </div>
              </AdminForm>
            </details>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Catégories de dépenses</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {[...categories, null].map((c) => (
            <AdminForm key={c?.id ?? 'new'} action={adminCategoryAction} className="flex flex-wrap items-center gap-2 text-sm">
              <input type="hidden" name="id" value={c?.id ?? ''} />
              <Input name="code" defaultValue={c?.code} placeholder="code" readOnly={Boolean(c)} className="h-9 w-32 py-1" aria-label="Code" />
              <Input name="nameFr" defaultValue={c?.nameFr} placeholder="Nom FR" className="h-9 w-36 py-1" aria-label="Nom français" />
              <Input name="nameEn" defaultValue={c?.nameEn} placeholder="Nom EN" className="h-9 w-32 py-1" aria-label="Nom anglais" />
              <Input name="color" type="color" defaultValue={c?.color ?? '#78716c'} className="h-9 w-14 p-1" aria-label="Couleur" />
              <Select name="plannerBucket" defaultValue={c?.plannerBucket ?? 'marge'} className="h-9 w-48 py-1" aria-label="Enveloppe du planificateur">
                {PLANNER_BUCKETS.map((b) => <option key={b} value={b}>{PLANNER_BUCKET_LABELS[b]}</option>)}
              </Select>
              <label className="flex items-center gap-1"><input type="checkbox" name="isEssential" defaultChecked={c?.isEssential ?? false} /> Essentielle</label>
              <label className="flex items-center gap-1"><input type="checkbox" name="isActive" defaultChecked={c?.isActive ?? true} /> Active</label>
              <SubmitButton size="sm" variant="outline">{c ? 'Enregistrer' : 'Ajouter'}</SubmitButton>
            </AdminForm>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
