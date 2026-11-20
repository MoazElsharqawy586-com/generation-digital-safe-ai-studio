export function normalizeExternalUrl(raw?: string | null): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed || trimmed === '/' || trimmed === '#') return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (trimmed.includes('.') && !trimmed.startsWith('/')) {
    return `https://${trimmed}`;
  }
  return '';
}
