import fs from 'fs';
import path from 'path';
import type express from 'express';
import { db } from './db.ts';

export const OFFICIAL_SITE_ORIGIN = 'https://generation-digital-safe.ai.studio';

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

function isInternalOrLocalOrigin(origin: string): boolean {
  if (!origin) return true;
  return /(^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)|ais-dev-|ais-pre-|\.europe-west\d*\.run\.app)/i.test(origin);
}

export function resolveStaticBaseUrl(): string {
  const settings = getSettingsMap();
  const configured = normalizeOrigin(settings.site_url || process.env.CANONICAL_URL);
  if (configured && !isInternalOrLocalOrigin(configured)) return configured;
  return OFFICIAL_SITE_ORIGIN;
}

export function resolveBaseUrl(req?: express.Request): string {
  const settings = getSettingsMap();
  const configured = normalizeOrigin(settings.site_url || process.env.CANONICAL_URL);
  if (configured && !isInternalOrLocalOrigin(configured)) return configured;

  if (req) {
    const host = (req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim();
    if (host && !/(^localhost|^127\.0\.0\.1|^0\.0\.0\.0|ais-dev-|ais-pre-|\.run\.app)/i.test(host)) {
      const rawProto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https')
        .split(',')[0]
        .trim()
        .toLowerCase();
      const proto = rawProto === 'http' ? 'http' : 'https';
      return `${proto}://${host}`.replace(/\/+$/, '');
    }
  }

  return OFFICIAL_SITE_ORIGIN;
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

function escHtmlText(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateIso(raw: string | undefined | null, fallback: string): string {
  const s = String(raw || '').trim();
  const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match) return fallback;
  return match[1] > fallback ? fallback : match[1];
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
  const cleanOrigin = (baseUrl || OFFICIAL_SITE_ORIGIN).replace(/\/+$/, '');
  return `User-agent: *
Allow: /
Allow: /icons/
Allow: /assets/
Allow: /favicon.ico
Allow: /manifest.webmanifest
Allow: /sitemap.xml
Allow: /sitemap_index.xml

Disallow: /admin
Disallow: /dashboard
Disallow: /login
Disallow: /member
Disallow: /api/admin/

Sitemap: ${cleanOrigin}/sitemap.xml
`;
}

export function buildSitemapIndexXml(baseUrl: string): string {
  const cleanOrigin = (baseUrl || OFFICIAL_SITE_ORIGIN).replace(/\/+$/, '');
  const today = new Date().toISOString().slice(0, 10);
  const newsLastMod = getMaxDate("SELECT MAX(COALESCE(updated_at, published_at)) as d FROM news WHERE status = 'published'", today);
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${escapeXml(`${cleanOrigin}/sitemap.xml`)}</loc>
    <lastmod>${escapeXml(newsLastMod)}</lastmod>
  </sitemap>
</sitemapindex>
`;
}

export function buildSitemapXml(baseUrl: string): string {
  const cleanOrigin = (baseUrl || OFFICIAL_SITE_ORIGIN).replace(/\/+$/, '');
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
  const seenUrls = new Set<string>();
  const pushUrl = (locPath: string, lastmod: string, changefreq: string, priority: string) => {
    const fullUrl = `${cleanOrigin}${locPath}`;
    if (seenUrls.has(fullUrl)) return;
    seenUrls.add(fullUrl);
    urlNodes.push(
      `  <url>\n    <loc>${escapeXml(fullUrl)}</loc>\n    <lastmod>${escapeXml(lastmod)}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
    );
  };

  for (const r of staticRoutes) {
    pushUrl(r.path, r.lastmod, r.changefreq, r.priority);
  }

  for (const c of committees) {
    if (!c.slug || !String(c.slug).trim()) continue;
    pushUrl(`/committees/${encodeURIComponent(c.slug.trim())}`, formatDateIso(c.created_at, today), 'monthly', '0.7');
  }

  for (const n of newsRows) {
    if (!n.slug || !String(n.slug).trim()) continue;
    pushUrl(`/news/${encodeURIComponent(n.slug.trim())}`, formatDateIso(n.updated_at || n.published_at, today), 'weekly', '0.9');
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

export function buildSsrFallbackHtml(
  cleanPath: string,
  pageTitle: string,
  pageDesc: string,
  settings: Record<string, string>
): string {
  const siteNameAr = settings.site_name_ar || 'جيل رقمي آمن';
  const siteNameEn = settings.site_name_en || 'SAFE DIGITAL GENERATION';
  const slogan = settings.site_slogan_ar || 'معًا لمستقبل رقمي آمن';

  const navLinks: { href: string; label: string }[] = [
    { href: '/', label: 'الرئيسية' },
    { href: '/about', label: 'من نحن والرؤية' },
    { href: '/goals', label: 'أهداف المبادرة' },
    { href: '/leadership', label: 'القيادات والهيكل التنظيمي' },
    { href: '/committees', label: 'اللجان المتخصصة' },
    { href: '/events', label: 'الأنشطة والفعاليات' },
    { href: '/news', label: 'الأخبار والبيانات الإعلامية' },
    { href: '/trainings', label: 'البرامج التدريبية' },
    { href: '/projects', label: 'المبادرات والمشروعات' },
    { href: '/gallery', label: 'معرض الصور والفيديوهات' },
    { href: '/partners', label: 'الشركاء والمظلة الرسمية' },
    { href: '/library', label: 'المكتبة الرقمية' },
    { href: '/join', label: 'انضم إلى المبادرة' },
    { href: '/verify', label: 'التحقق من الكارنيه والشهادات' },
    { href: '/contact', label: 'تواصل معنا' }
  ];

  let bodySections = '';

  try {
    const newsMatch = cleanPath.match(/^\/news\/([^/]+)$/);
    const committeeMatch = cleanPath.match(/^\/committees\/([^/]+)$/);
    const eventMatch = cleanPath.match(/^\/events\/(\d+)$/);

    if (newsMatch) {
      let slug = newsMatch[1];
      try {
        slug = decodeURIComponent(slug);
      } catch {
        // fallback raw slug
      }
      const item = db.prepare("SELECT * FROM news WHERE slug = ? AND status = 'published'").get(slug) as any;
      if (item) {
        bodySections = `
          <article>
            <h2>${escHtmlText(item.title_ar)}</h2>
            <p>${escHtmlText(item.category || '')} — ${escHtmlText(item.published_at || '')} — ${escHtmlText(item.department_ar || siteNameAr)}</p>
            ${item.excerpt_ar ? `<p>${escHtmlText(item.excerpt_ar)}</p>` : ''}
            <div>${escHtmlText(item.content_ar || '')}</div>
          </article>`;
      }
    } else if (committeeMatch) {
      let slug = committeeMatch[1];
      try {
        slug = decodeURIComponent(slug);
      } catch {
        // fallback raw slug
      }
      const com = db.prepare('SELECT * FROM committees WHERE slug = ? AND is_active = 1').get(slug) as any;
      if (com) {
        bodySections = `
          <section>
            <h2>${escHtmlText(com.name_ar)}</h2>
            <p>${escHtmlText(com.description_ar || '')}</p>
            ${com.head_name ? `<p>${escHtmlText(com.head_title || 'رئيس اللجنة')}: ${escHtmlText(com.head_name)}</p>` : ''}
            ${com.deputy_head_name ? `<p>نائب رئيس اللجنة: ${escHtmlText(com.deputy_head_name)}</p>` : ''}
            ${com.coordinator_name ? `<p>منسق اللجنة: ${escHtmlText(com.coordinator_name)}</p>` : ''}
          </section>`;
      }
    } else if (eventMatch) {
      const ev = db.prepare('SELECT * FROM events WHERE id = ?').get(Number(eventMatch[1])) as any;
      if (ev) {
        bodySections = `
          <article>
            <h2>${escHtmlText(ev.title_ar)}</h2>
            <p>التاريخ: ${escHtmlText(ev.event_date || '')} | المكان: ${escHtmlText(ev.location || '')}</p>
            <p>${escHtmlText(ev.description_ar || '')}</p>
          </article>`;
      }
    } else if (cleanPath === '/committees') {
      const rows = db.prepare('SELECT slug, name_ar, description_ar FROM committees WHERE is_active = 1 ORDER BY sort_order ASC').all() as any[];
      bodySections = `<ul>${rows
        .map(
          (c) =>
            `<li><a href="/committees/${encodeURIComponent(c.slug)}">${escHtmlText(c.name_ar)}</a> — ${escHtmlText(c.description_ar || '')}</li>`
        )
        .join('')}</ul>`;
    } else if (cleanPath === '/news' || cleanPath === '/news-and-events') {
      const rows = db.prepare("SELECT slug, title_ar, excerpt_ar FROM news WHERE status = 'published' ORDER BY published_at DESC LIMIT 20").all() as any[];
      bodySections = `<ul>${rows
        .map(
          (n) =>
            `<li><a href="/news/${encodeURIComponent(n.slug)}">${escHtmlText(n.title_ar)}</a> — ${escHtmlText(n.excerpt_ar || '')}</li>`
        )
        .join('')}</ul>`;
    } else if (cleanPath === '/events') {
      const rows = db.prepare('SELECT id, title_ar, event_date, location FROM events ORDER BY event_date DESC LIMIT 20').all() as any[];
      bodySections = `<ul>${rows
        .map(
          (e) =>
            `<li><a href="/events/${e.id}">${escHtmlText(e.title_ar)}</a> (${escHtmlText(e.event_date || '')} — ${escHtmlText(e.location || '')})</li>`
        )
        .join('')}</ul>`;
    } else if (cleanPath === '/leadership') {
      const rows = db.prepare('SELECT name_ar, role_ar, governorate FROM leadership WHERE is_active = 1 ORDER BY sort_order ASC').all() as any[];
      bodySections = `<ul>${rows
        .map((l) => `<li>${escHtmlText(l.name_ar)} — ${escHtmlText(l.role_ar)}${l.governorate ? ` (${escHtmlText(l.governorate)})` : ''}</li>`)
        .join('')}</ul>`;
    } else if (cleanPath === '/trainings') {
      const rows = db.prepare('SELECT title_ar, description_ar FROM trainings ORDER BY created_at DESC LIMIT 20').all() as any[];
      bodySections = `<ul>${rows.map((t) => `<li>${escHtmlText(t.title_ar)} — ${escHtmlText(t.description_ar || '')}</li>`).join('')}</ul>`;
    } else if (cleanPath === '/projects') {
      const rows = db.prepare('SELECT title_ar, description_ar FROM projects ORDER BY created_at DESC LIMIT 20').all() as any[];
      bodySections = `<ul>${rows.map((p) => `<li>${escHtmlText(p.title_ar)} — ${escHtmlText(p.description_ar || '')}</li>`).join('')}</ul>`;
    } else if (cleanPath === '/partners') {
      const rows = db.prepare('SELECT name_ar, description_ar FROM partners WHERE is_visible = 1 ORDER BY marquee_order ASC').all() as any[];
      bodySections = `<ul>${rows.map((p) => `<li>${escHtmlText(p.name_ar)} — ${escHtmlText(p.description_ar || '')}</li>`).join('')}</ul>`;
    } else if (cleanPath === '/library') {
      const rows = db.prepare('SELECT title_ar, description_ar FROM digital_library WHERE is_published = 1 ORDER BY created_at DESC').all() as any[];
      bodySections = `<ul>${rows.map((d) => `<li>${escHtmlText(d.title_ar)} — ${escHtmlText(d.description_ar || '')}</li>`).join('')}</ul>`;
    } else {
      const latestNews = db.prepare("SELECT slug, title_ar FROM news WHERE status = 'published' ORDER BY published_at DESC LIMIT 6").all() as any[];
      const latestComs = db.prepare('SELECT slug, name_ar FROM committees WHERE is_active = 1 ORDER BY sort_order ASC LIMIT 10').all() as any[];
      bodySections = `
        <section>
          <h2>عن المبادرة</h2>
          <p>${escHtmlText(settings.about_summary_ar || pageDesc)}</p>
          <p>تحت مظلة الاتحاد النوعي للجمعيات العاملة في مجال التنمية المجتمعية (حكاية وطن) المشهر برقم 1279 لسنة 2025 بوزارة التضامن الاجتماعي.</p>
        </section>
        ${
          latestComs.length > 0
            ? `<section><h2>اللجان التخصصية</h2><ul>${latestComs
                .map((c) => `<li><a href="/committees/${encodeURIComponent(c.slug)}">${escHtmlText(c.name_ar)}</a></li>`)
                .join('')}</ul></section>`
            : ''
        }
        ${
          latestNews.length > 0
            ? `<section><h2>أحدث الأخبار</h2><ul>${latestNews
                .map((n) => `<li><a href="/news/${encodeURIComponent(n.slug)}">${escHtmlText(n.title_ar)}</a></li>`)
                .join('')}</ul></section>`
            : ''
        }`;
    }
  } catch {
    bodySections = '';
  }

  return `<div dir="rtl" lang="ar" style="max-width:960px;margin:0 auto;padding:24px;font-family:Cairo,sans-serif;color:#0f172a">
      <header>
        <p><strong>${escHtmlText(siteNameAr)} — ${escHtmlText(siteNameEn)}</strong> | ${escHtmlText(slogan)}</p>
        <nav aria-label="التنقل الرئيسي">
          <ul style="display:flex;flex-wrap:wrap;gap:12px;list-style:none;padding:0">
            ${navLinks.map((lnk) => `<li><a href="${escHtmlText(lnk.href)}">${escHtmlText(lnk.label)}</a></li>`).join('')}
          </ul>
        </nav>
      </header>
      <main>
        <h1>${escHtmlText(pageTitle)}</h1>
        <p>${escHtmlText(pageDesc)}</p>
        ${bodySections}
      </main>
      <footer>
        <p>${escHtmlText(siteNameAr)} · ${escHtmlText(settings.email || 'generationdigitalsafe@gmail.com')} · ${escHtmlText(settings.phone || '01277714301')}</p>
        <p><a href="/sitemap.xml">خريطة الموقع XML Sitemap</a> | <a href="/robots.txt">robots.txt</a></p>
      </footer>
    </div>`;
}

export function syncPublicSeoFiles(explicitBaseUrl?: string): { baseUrl: string; sitemapPath: string; robotsPath: string } {
  const candidate = normalizeOrigin(explicitBaseUrl);
  const baseUrl = candidate && !isInternalOrLocalOrigin(candidate) ? candidate : resolveStaticBaseUrl();
  const sitemapXml = buildSitemapXml(baseUrl);
  const sitemapIndexXml = buildSitemapIndexXml(baseUrl);
  const robotsTxt = buildRobotsTxt(baseUrl);

  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const publicSitemap = path.join(publicDir, 'sitemap.xml');
  const publicSitemapIndex = path.join(publicDir, 'sitemap_index.xml');
  const publicRobots = path.join(publicDir, 'robots.txt');
  fs.writeFileSync(publicSitemap, sitemapXml, 'utf8');
  fs.writeFileSync(publicSitemapIndex, sitemapIndexXml, 'utf8');
  fs.writeFileSync(publicRobots, robotsTxt, 'utf8');

  const distDir = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapXml, 'utf8');
    fs.writeFileSync(path.join(distDir, 'sitemap_index.xml'), sitemapIndexXml, 'utf8');
    fs.writeFileSync(path.join(distDir, 'robots.txt'), robotsTxt, 'utf8');
  }

  return { baseUrl, sitemapPath: publicSitemap, robotsPath: publicRobots };
}
