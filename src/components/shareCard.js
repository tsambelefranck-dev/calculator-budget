// Génère une image récap (format story) partageable sur WhatsApp/Instagram,
// avec repli en téléchargement direct si l'API Web Share n'est pas disponible.

export async function generateShareImage(totals, diagnostic) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#0b6e4f');
  gradient.addColorStop(1, '#085239');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';

  ctx.font = '600 42px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillText('Mon diagnostic budget', canvas.width / 2, 160);

  ctx.font = '800 96px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillText(`${Math.round(totals.tauxEpargne * 100)}%`, canvas.width / 2, 330);

  ctx.font = '500 36px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillText('de mon revenu épargné', canvas.width / 2, 390);

  ctx.font = '700 44px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillText(diagnostic.title, canvas.width / 2, 500);

  ctx.font = '500 32px -apple-system, Segoe UI, Roboto, sans-serif';
  wrapText(ctx, diagnostic.message, canvas.width / 2, 570, 880, 44);

  ctx.font = '600 36px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillText('Calculateur Budget Express', canvas.width / 2, canvas.height - 140);
  ctx.font = '400 30px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillText('by NexaFi Academy', canvas.width / 2, canvas.height - 90);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, x, currentY);
}

export async function shareResult(totals, diagnostic) {
  const blob = await generateShareImage(totals, diagnostic);
  const file = new File([blob], 'mon-budget.png', { type: 'image/png' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: 'Mon diagnostic budget',
      text: 'Découvre ton budget en 2 minutes avec le Calculateur Budget Express !',
    });
    return true;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mon-budget.png';
  a.click();
  URL.revokeObjectURL(url);
  return false;
}
