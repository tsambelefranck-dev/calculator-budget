import { z } from 'zod';

const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'motdepasse', 'azerty123', 'azertyuiop', 'qwerty123', 'qwertyuiop',
  '12345678', '123456789', '1234567890', '00000000', '11111111', 'iloveyou', 'nexafi123',
  'bonjour123', 'soleil123', 'cameroun', 'abidjan123', 'dakar1234', 'admin123', 'welcome1',
]);

export function passwordIssue(password: string, email?: string): string | null {
  if (password.length < 10) return 'Le mot de passe doit contenir au moins 10 caractères.';
  if (password.length > 128) return 'Le mot de passe ne peut pas dépasser 128 caractères.';
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return 'Ce mot de passe est trop courant. Choisis-en un autre.';
  if (/^(.)\1+$/.test(password)) return 'Le mot de passe ne peut pas être un seul caractère répété.';
  if (email && password.toLowerCase().includes(email.split('@')[0]!.toLowerCase()) && email.split('@')[0]!.length >= 4) {
    return 'Le mot de passe ne doit pas contenir ton adresse e-mail.';
  }
  return null;
}

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'Adresse e-mail trop longue')
  .pipe(z.email('Adresse e-mail invalide'));

export const signUpSchema = z
  .object({
    name: z.string().trim().min(2, 'Indique ton prénom (2 caractères minimum)').max(80, '80 caractères maximum'),
    email: emailSchema,
    password: z.string(),
    acceptTerms: z.literal('on', { error: 'Tu dois accepter les conditions d’utilisation' }),
  })
  .superRefine((data, ctx) => {
    const issue = passwordIssue(data.password, data.email);
    if (issue) ctx.addIssue({ code: 'custom', path: ['password'], message: issue });
  });

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Mot de passe requis').max(128),
  next: z.string().optional(),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20).max(100),
    password: z.string(),
    confirm: z.string(),
  })
  .superRefine((data, ctx) => {
    const issue = passwordIssue(data.password);
    if (issue) ctx.addIssue({ code: 'custom', path: ['password'], message: issue });
    if (data.password !== data.confirm) ctx.addIssue({ code: 'custom', path: ['confirm'], message: 'Les mots de passe ne correspondent pas.' });
  });

export const changePasswordSchema = z
  .object({
    current: z.string().min(1, 'Mot de passe actuel requis'),
    password: z.string(),
    confirm: z.string(),
  })
  .superRefine((data, ctx) => {
    const issue = passwordIssue(data.password);
    if (issue) ctx.addIssue({ code: 'custom', path: ['password'], message: issue });
    if (data.password !== data.confirm) ctx.addIssue({ code: 'custom', path: ['confirm'], message: 'Les mots de passe ne correspondent pas.' });
  });
