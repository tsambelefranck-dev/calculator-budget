import { expect, test, type Page } from '@playwright/test';

async function signUpAndOnboard(page: Page) {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  await page.goto('/signup');
  await page.fill('#name', 'Awa');
  await page.fill('#email', email);
  await page.fill('#password', 'une phrase solide 2026');
  await page.check('input[name=acceptTerms]');
  await page.getByRole('button', { name: 'Créer mon compte gratuitement' }).click();
  await page.waitForURL('**/onboarding');
  await page.selectOption('#ageRange', '25-34');
  await page.selectOption('#country', 'CI');
  await page.selectOption('#employmentStatus', 'commercant');
  await page.selectOption('#incomeType', 'variable');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.fill('#monthlyIncome', '250000');
  await page.fill('#fixedCharges', '90000');
  await page.fill('#variableExpenses', '80000');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.fill('#debtTotal', '0');
  await page.fill('#debtMonthlyPayment', '0');
  await page.fill('#currentSavings', '50000');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.selectOption('#investmentHorizon', 'long');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.check('input[name=lossReaction][value="1"]');
  await page.check('input[name=experience][value="0"]');
  await page.check('input[name=riskShare][value="1"]');
  await page.getByRole('button', { name: 'Voir mon diagnostic' }).click();
  await expect(page.getByRole('heading', { name: /Entrepreneur à revenus irréguliers/ })).toBeVisible();
  await page.getByRole('link', { name: /Accéder à mon tableau de bord/ }).click();
  await page.waitForURL('**/app');
}

test('parcours complet : inscription, diagnostic, revenu, planification, dépense', async ({ page }) => {
  await signUpAndOnboard(page);
  await expect(page.getByRole('heading', { name: 'Ton tableau de bord' })).toBeVisible();

  await page.goto('/app/income');
  await page.getByRole('button', { name: 'Source de revenu' }).click();
  await page.fill('#source-name', 'Recettes boutique');
  await page.fill('#source-amount', '250000');
  await page.fill('#source-day', '1');
  await page.getByRole('button', { name: 'Ajouter la source' }).click();
  await page.getByRole('button', { name: 'Marquer comme reçu' }).first().click();
  await page.waitForURL('**/app/planner?income=*');
  await expect(page.getByText('Chaque franc a une destination')).toBeVisible();
  await page.getByRole('button', { name: 'Valider mon plan' }).click();
  await page.waitForURL('**/app/planner?saved=1');

  await page.goto('/app/budgets');
  await expect(page.getByRole('heading', { name: 'Catégories budgétées' })).toBeVisible();
  await expect(page.getByText(/dans les clous/)).toBeVisible();

  await page.goto('/app/expenses');
  await page.getByRole('button', { name: 'Ajouter une dépense', exact: true }).first().click();
  await page.fill('#expense-amount', '12500');
  await page.locator('label', { hasText: 'Transport' }).first().click();
  await page.fill('#expense-label', 'Taxi');
  await page.getByRole('button', { name: 'Enregistrer la dépense' }).click();
  await expect(page.getByText('Dépense enregistrée.')).toBeVisible();
  await expect(page.getByText('Taxi').first()).toBeVisible();

  await page.goto('/app/assistant');
  await expect(page.getByText(/Assistant IA non configuré|Coach financier IA/).first()).toBeVisible();
});

test('les pages privées exigent une connexion', async ({ page }) => {
  await page.goto('/app/expenses');
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fexpenses/);
  const response = await page.request.get('/api/account/export');
  expect(response.status()).toBe(401);
  const chat = await page.request.post('/api/ai/chat', { data: { message: 'test' } });
  expect([401, 403]).toContain(chat.status());
});

test('un utilisateur standard ne voit pas l’administration', async ({ page }) => {
  await signUpAndOnboard(page);
  const response = await page.goto('/admin');
  expect(response?.status()).toBe(404);
});

test('la démo crée un compte isolé avec des données fictives', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Lancer la démo' }).click();
  await page.waitForURL('**/app');
  await expect(page.getByText('Mode démo')).toBeVisible();
  await expect(page.getByText('Terrain à Yaoundé')).toBeVisible();
});
