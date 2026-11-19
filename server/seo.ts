import fs from 'fs';
import path from 'path';
import type express from 'express';
import { db } from './db.ts';

const FALLBACK_PUBLIC_ORIGIN = 'https://ais-pre-h6hz4iaks6zvtwrosutdsq-56870909843.europe-west2.run.app';

export function getSettingsMap(): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

function normalizeOrigin(raw: string | undefined | null): string {
  const val = String(raw || '').trim().replace(/\/+$/, '');
  if (!val) return '';
  if (!/^https?:\/\/[^/\s]+$/i.test(val)) {
    try {
      const parsed = new URL(val);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      return '';
    }
  }
  return val;
}

export function resolveStaticBaseUrl(): string {
  const settings = getSettingsMap();
  const configured = normalizeOrigin(settings.site_url || process.env.CANONICAL_URL);
  if (configured) return configured;
  const appUrl = normalizeOrigin(process.env.APP_URL);
  if (appUrl) return appUrl;
  return FALLBACK_PUBLIC_ORIGIN;
}

export function resolveBaseUrl(req?: express.Request): string {
  const settings = getSettingsMap();
  const configured = normalizeOrigin(settings.site_url || process.env.CANONICAL_URL);
  if (configured) return configured;

  if (req) {
    const host = (req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim();
    if (host) {
      const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(host);
      if (!isLocal) {
        const rawProto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https')
          .split(',')[0]
          .trim()
          .toLowerCase();
        const proto = rawProto === 'http' ? 'http' : 'https';
        return `${proto}://${host}`.replace(/\/+$/, '');
      }
    }
  }

  const appUrl = normalizeOrigin(process.env.APP_URL);
  if (appUrl) return appUrl;

  if (req) {
    const host = (req.get('host') || 'localhost:3000').split(',')[0].trim();
    const rawProto = String(req.protocol || 'http').toLowerCase();
    return `${rawProto}://${host}`.replace(/\/+$/, '');
  }

  return FALLBACK_PUBLIC_ORIGIN;
}

export function toPublicUrl(rawUrl: string | undefined | null, baseUrl: string): string {
  const cleaned = String(rawUrl || '').trim().replace('/src/assets/images/', '/assets/images/');
  if (!cleaned) return `${baseUrl}/assets/aistudio/FB_IMG_1789831319399_ac126220.jpg`;
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  return `${baseUrl}${cleaned.startsWith('/') ? cleaned : `/${cleaned}`}`;
}

export function guessImageMime(url: string): string {
  const lower = url.toLowerCase().split('?')[0];
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.ico')) return 'image/x-icon';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

function escapeXml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDateIso(raw: string | undefined | null, fallback: string): string {
  const s = String(raw || '').trim();
  const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : fallback;
}

function getMaxDate(sql: string, fallback: string): string {
  try {
    const row = db.prepare(sql).get() as { d?: string } | undefined;
    return formatDateIso(row?.d, fallback);
  } catch {
    return fallback;
  }
}

export function buildRobotsTxt(baseUrl: string): string {
  const cleanOrigin = baseUrl.replace(/\/+$/, '');
  return `User-agent: *
Allow: /
Allow: /assets/
Allow: /uploads/

Disallow: /admin
Disallow: /dashboard
Disallow: /login
Disallow: /member
Disallow: /api/

Sitemap: ${cleanOrigin}/sitemap.xml
`;
}

export function buildSitemapXml(baseUrl: string): string {
  const cleanOrigin = baseUrl.replace(/\/+$/, '');
  const today = new Date().toISOString().slice(0, 10);

  const settingsLastMod = getMaxDate('SELECT MAX(updated_at) as d FROM settings', today);
  const newsLastMod = getMaxDate("SELECT MAX(COALESCE(updated_at, published_at)) as d FROM news WHERE status = 'published'", today);
  const eventsLastMod = getMaxDate('SELECT MAX(created_at) as d FROM events', today);
  const trainingsLastMod = getMaxDate('SELECT MAX(created_at) as d FROM trainings', today);
  const projectsLastMod = getMaxDate('SELECT MAX(created_at) as d FROM projects', today);
  const galleryLastMod = getMaxDate('SELECT MAX(created_at) as d FROM gallery', today);
  const partnersLastMod = getMaxDate('SELECT MAX(created_at) as d FROM partners WHERE is_visible = 1', today);
  const libraryLastMod = getMaxDate('SELECT MAX(created_at) as d FROM digital_library WHERE is_published = 1', today);
  const committeesLastMod = getMaxDate('SELECT MAX(created_at) as d FROM committees WHERE is_active = 1', today);

  const staticRoutes: { path: string; lastmod: string; changefreq: string; priority: string }[] = [
    { path: '/', lastmod: newsLastMod > settingsLastMod ? newsLastMod : settingsLastMod, changefreq: 'daily', priority: '1.0' },
    { path: '/about', lastmod: settingsLastMod, changefreq: 'monthly', priority: '0.8' },
    { path: '/goals', lastmod: settingsLastMod, changefreq: 'monthly', priority: '0.8' },
    { path: '/leadership', lastmod: settingsLastMod, changefreq: 'weekly', priority: '0.8' },
    { path: '/committees', lastmod: committeesLastMod, changefreq: 'weekly', priority: '0.9' },
    { path: '/events', lastmod: eventsLastMod, changefreq: 'daily', priority: '0.9' },
    { path: '/news-and-events', lastmod: newsLastMod > eventsLastMod ? newsLastMod : eventsLastMod, changefreq: 'daily', priority: '0.9' },
    { path: '/trainings', lastmod: trainingsLastMod, changefreq: 'weekly', priority: '0.9' },
    { path: '/news', lastmod: newsLastMod, changefreq: 'daily', priority: '0.9' },
    { path: '/projects', lastmod: projectsLastMod, changefreq: 'weekly', priority: '0.8' },
    { path: '/gallery', lastmod: galleryLastMod, changefreq: 'weekly', priority: '0.7' },
    { path: '/join', lastmod: settingsLastMod, changefreq: 'monthly', priority: '0.8' },
    { path: '/partners', lastmod: partnersLastMod, changefreq: 'monthly', priority: '0.8' },
    { path: '/library', lastmod: libraryLastMod, changefreq: 'weekly', priority: '0.8' },
    { path: '/contact', lastmod: settingsLastMod, changefreq: 'monthly', priority: '0.7' },
    { path: '/verify', lastmod: settingsLastMod, changefreq: 'monthly', priority: '0.6' }
  ];

  const committees = db
    .prepare('SELECT slug, created_at FROM committees WHERE is_active = 1 ORDER BY sort_order ASC, id ASC')
    .all() as { slug: string; created_at: string }[];

  const newsRows = db
    .prepare("SELECT slug, updated_at, published_at FROM news WHERE status = 'published' ORDER BY published_at DESC, id DESC")
    .all() as { slug: string; updated_at: string; published_at: string }[];

  const eventRows = db
    .prepare('SELECT id, event_date, created_at FROM events ORDER BY event_date DESC, id DESC')
    .all() as { id: number; event_date: string; created_at: string }[];

  const urlNodes: string[] = [];
  const pushUrl = (locPath: string, lastmod: string, changefreq: string, priority: string) => {
    const fullUrl = `${cleanOrigin}${locPath}`;
    urlNodes.push(
      `  <url>\n    <loc>${escapeXml(fullUrl)}</loc>\n    <lastmod>${escapeXml(lastmod)}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
    );
  };

  for (const r of staticRoutes) {
    pushUrl(r.path, r.lastmod, r.changefreq, r.priority);
  }

  for (const c of committees) {
    if (!c.slug) continue;
    pushUrl(`/committees/${encodeURIComponent(c.slug)}`, formatDateIso(c.created_at, today), 'monthly', '0.7');
  }

  for (const n of newsRows) {
    if (!n.slug) continue;
    pushUrl(`/news/${encodeURIComponent(n.slug)}`, formatDateIso(n.updated_at || n.published_at, today), 'weekly', '0.9');
  }

  for (const e of eventRows) {
    pushUrl(`/events/${e.id}`, formatDateIso(e.created_at || e.event_date, today), 'weekly', '0.8');
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlNodes.join('\n')}
</urlset>
`;
}

export function syncPublicSeoFiles(explicitBaseUrl?: string): { baseUrl: string; sitemapPath: string; robotsPath: string } {
  const baseUrl = normalizeOrigin(explicitBaseUrl) || resolveStaticBaseUrl();
  const sitemapXml = buildSitemapXml(baseUrl);
  const robotsTxt = buildRobotsTxt(baseUrl);

  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const publicSitemap = path.join(publicDir, 'sitemap.xml');
  const publicRobots = path.join(publicDir, 'robots.txt');
  fs.writeFileSync(publicSitemap, sitemapXml, 'utf8');
  fs.writeFileSync(publicRobots, robotsTxt, 'utf8');

  const distDir = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapXml, 'utf8');
    fs.writeFileSync(path.join(distDir, 'robots.txt'), robotsTxt, 'utf8');
  }

  return { baseUrl, sitemapPath: publicSitemap, robotsPath: publicRobots };
}
