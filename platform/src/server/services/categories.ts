import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { cache } from 'react';
import { db } from '@/server/db';
import { categories } from '@/server/db/schema';

export type Category = typeof categories.$inferSelect;

/** Catégories (actives et inactives : les anciennes dépenses doivent rester lisibles). */
export const listCategories = cache(async (): Promise<Category[]> => {
  return db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.nameFr));
});

export async function listActiveCategories(): Promise<Category[]> {
  return (await listCategories()).filter((c) => c.isActive);
}

export async function getCategoryMap(): Promise<Map<string, Category>> {
  return new Map((await listCategories()).map((c) => [c.id, c]));
}

export async function getActiveCategory(id: string): Promise<Category | null> {
  const rows = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  const category = rows[0];
  return category && category.isActive ? category : null;
}
