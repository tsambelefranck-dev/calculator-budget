import 'server-only';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Envoi d'e-mails : Resend si RESEND_API_KEY est défini.
 * Sans fournisseur, l'e-mail est écrit dans les logs serveur en développement uniquement
 * (jamais en production, pour ne pas exposer de lien sensible dans les journaux).
 */
export async function sendMail(message: MailMessage): Promise<{ delivered: boolean; channel: 'resend' | 'console' | 'none' }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? 'NexaFi <no-reply@example.com>',
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
    });
    if (!response.ok) {
      console.error('[mailer] Resend a refusé l’envoi', response.status);
      return { delivered: false, channel: 'resend' };
    }
    return { delivered: true, channel: 'resend' };
  }
  if (process.env.NODE_ENV !== 'production') {
    console.info(`\n[mailer:dev] À : ${message.to}\nObjet : ${message.subject}\n\n${message.text}\n`);
    return { delivered: true, channel: 'console' };
  }
  console.warn('[mailer] Aucun fournisseur d’e-mail configuré (RESEND_API_KEY) : message non envoyé.');
  return { delivered: false, channel: 'none' };
}

export function appUrl(path = ''): string {
  const base = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  return `${base}${path}`;
}
