import React, { useEffect, useState } from 'react';
import { BookOpen, Calendar, CheckCircle2, Copy, Download, ExternalLink, Film, Image as ImageIcon, MapPin, Search, Share2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SafeImage } from '../components/SafeImage';
import type { AlbumItem, EventItem, GalleryItem, LibraryItem, NewsItem } from '../types';

interface NormalizedGalleryItem {
  url: string;
  alt: string;
  caption: string;
}

function normalizeGallery(raw?: string): NormalizedGalleryItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (typeof item === 'string') return { url: item, alt: '', caption: '' };
        if (item && typeof item === 'object' && item.url) {
          return {
            url: String(item.url),
            alt: String(item.alt || ''),
            caption: String(item.caption || '')
          };
        }
        return null;
      })
      .filter((x): x is NormalizedGalleryItem => Boolean(x && x.url));
  } catch {
    return [];
  }
}

export const NewsPage: React.FC<{ slug?: string }> = ({ slug }) => {
  const { t, navigate, settings } = useApp();
  const [list, setList] = useState<NewsItem[]>([]);
  const [article, setArticle] = useState<NewsItem | null>(null);
  const [category, setCategory] = useState('all');
  const [copied, setCopied] = useState(false);
  const [articleLightbox, setArticleLightbox] = useState<NormalizedGalleryItem | null>(null);

  useEffect(() => {
    if (slug) {
      fetch(`/api/public/news/${encodeURIComponent(slug)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d: NewsItem | null) => {
          setArticle(d);
          if (d) {
            const siteTitle = settings.site_name_ar || 'جيل رقمي آمن';
            const pageTitle = `${d.title_ar} | ${siteTitle}`;
            const pageDesc = (d.excerpt_ar || d.content_ar || d.title_ar || '').replace(/\s+/g, ' ').trim().slice(0, 165);
            const canonicalOrigin = (settings.site_url || window.location.origin).replace(/\/+$/, '');
            const canonicalUrl = `${canonicalOrigin}/news/${encodeURIComponent(d.slug)}`;
            document.title = pageTitle;
            const rawImg = d.share_image_url || d.cover_image || d.logo_url || settings.og_image_url || settings.logo_url || '';
            const fullImg = rawImg ? (rawImg.startsWith('http') ? rawImg : `${canonicalOrigin}${rawImg.startsWith('/') ? rawImg : `/${rawImg}`}`) : '';
            const updateMeta = (attr: 'name' | 'property', key: string, content: string) => {
              if (!content) return;
              let el = document.querySelector(`meta[${attr}="${key}"]`);
              if (!el) {
                el = document.createElement('meta');
                el.setAttribute(attr, key);
                document.head.appendChild(el);
              }
              el.setAttribute('content', content);
            };
            const canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
            if (canonicalEl) canonicalEl.href = canonicalUrl;
            updateMeta('name', 'description', pageDesc);
            updateMeta('name', 'robots', 'index, follow');
            updateMeta('property', 'og:title', pageTitle);
            updateMeta('property', 'og:description', pageDesc);
            updateMeta('property', 'og:type', 'article');
            updateMeta('property', 'og:url', canonicalUrl);
            updateMeta('name', 'twitter:title', pageTitle);
            updateMeta('name', 'twitter:description', pageDesc);
            if (fullImg) {
              updateMeta('property', 'og:image', fullImg);
              updateMeta('property', 'og:image:secure_url', fullImg);
              updateMeta('name', 'twitter:image', fullImg);
            }
          }
        });
    } else {
      fetch('/api/public/news')
        .then((r) => r.json())
        .then((d) => setList(Array.isArray(d) ? d : []));
    }
  }, [slug, settings]);

  if (slug) {
    if (!article) {
      return (
        <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
          <p className="text-slate-600">{t('جارٍ التحميل أو الخبر غير موجود...', 'Loading or article not found...')}</p>
          <button type="button" onClick={() => navigate('/news')} className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm">
            {t('العودة للأخبار', 'Back to News')}
          </button>
        </div>
      );
    }

    const shareUrl = window.location.href;
    const shareTitle = article.title_ar;
    const extraGallery = normalizeGallery(article.gallery_json);

    const copyLink = () => {
      navigator.clipboard?.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <article className="bg-slate-50 min-h-screen py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          <button type="button" onClick={() => navigate('/news')} className="text-sm font-medium text-blue-700 hover:underline">
            {t('← العودة إلى جميع الأخبار', '← Back to all news')}
          </button>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            {article.cover_image && (
              <div className="aspect-[16/9] bg-slate-100 relative">
                <SafeImage
                  src={article.cover_image}
                  alt={article.cover_alt || article.title_ar}
                  fallbackTitle={article.title_ar}
                  className="w-full h-full object-cover"
                />
                {article.logo_url && (
                  <div className="absolute top-4 end-4 bg-white/95 p-1.5 rounded-xl border border-slate-200 shadow-sm">
                    <img src={article.logo_url} alt={article.department_ar || article.title_ar} className="w-12 h-12 object-contain rounded-lg" />
                  </div>
                )}
              </div>
            )}

            <div className="p-6 sm:p-10 space-y-6">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-blue-700">{article.category}</span>
                {article.department_ar && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-slate-700">{article.department_ar}</span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span className="font-mono-num">{(article.published_at || '').slice(0, 10)}</span>
                <span aria-hidden="true">·</span>
                <span>{t('بقلم:', 'By:')} {article.author_name}</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-bold text-slate-950 font-display leading-snug">
                {t(article.title_ar, article.title_en)}
              </h1>

              {article.excerpt_ar && (
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed border-b border-slate-200 pb-6">
                  {t(article.excerpt_ar, article.excerpt_en)}
                </p>
              )}

              <div className="text-slate-800 leading-loose whitespace-pre-line text-base">
                {t(article.content_ar, article.content_en)}
              </div>

              {extraGallery.length > 0 && (
                <div className="space-y-3 pt-4">
                  <h2 className="text-sm font-bold text-slate-900">{t('صور إضافية للخبر', 'Additional Photos')}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {extraGallery.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setArticleLightbox(img)}
                        className="text-start rounded-xl overflow-hidden border border-slate-200 bg-slate-50 hover:border-blue-400 transition-colors flex flex-col"
                      >
                        <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
                          <SafeImage src={img.url} alt={img.alt || `${article.title_ar} ${i + 1}`} className="w-full h-full object-cover" />
                        </div>
                        {img.caption && <p className="p-2.5 text-xs text-slate-600 leading-snug">{img.caption}</p>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {article.keywords && (
                <div className="pt-4 border-t border-slate-100 text-xs text-slate-500">
                  <span>{t('الكلمات المفتاحية:', 'Keywords:')}</span> {article.keywords}
                </div>
              )}

              {/* Social Share Row (Facebook, WhatsApp, Telegram, Copy) */}
              <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <span className="text-sm font-semibold text-slate-800 inline-flex items-center gap-1.5">
                  <Share2 className="w-4 h-4 text-blue-700" />
                  <span>{t('مشاركة الخبر', 'Share Article')}</span>
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-xs font-semibold bg-blue-700 text-white rounded-lg"
                  >
                    Facebook
                  </a>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`${shareTitle}\n${shareUrl}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg"
                  >
                    WhatsApp
                  </a>
                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-xs font-semibold bg-sky-600 text-white rounded-lg"
                  >
                    Telegram
                  </a>
                  <button
                    type="button"
                    onClick={copyLink}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copied ? t('تم النسخ', 'Copied') : t('نسخ الرابط', 'Copy Link')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {articleLightbox && (
          <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4" onClick={() => setArticleLightbox(null)}>
            <div className="max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 text-white">
                <span className="text-sm font-semibold">{articleLightbox.caption || articleLightbox.alt || article.title_ar}</span>
                <button type="button" onClick={() => setArticleLightbox(null)} className="p-1 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="bg-black flex items-center justify-center max-h-[75vh]">
                <SafeImage src={articleLightbox.url} alt={articleLightbox.alt || article.title_ar} className="max-h-[75vh] w-auto object-contain" />
              </div>
            </div>
          </div>
        )}
      </article>
    );
  }

  const categories = ['all', ...Array.from(new Set(list.map((n) => n.category).filter(Boolean)))];
  const filtered = category === 'all' ? list : list.filter((n) => n.category === category);

  return (
    <div className="bg-slate-50 min-h-screen">
      <section className="bg-slate-950 text-white py-14" style={{ backgroundColor: 'var(--sdg-navy, #0a192f)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <p className="text-xs font-semibold text-cyan-400">{t('التغطيات والبيانات الرسمية', 'Official Press & Updates')}</p>
          <h1 className="text-3xl sm:text-4xl font-bold font-display">{t('أخبار مبادرة جيل رقمي آمن', 'Initiative News')}</h1>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border ${
                category === cat ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              {cat === 'all' ? t('جميع التصنيفات', 'All') : cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filtered.map((item) => (
            <article
              key={item.id}
              onClick={() => navigate(`/news/${item.slug}`)}
              className="cursor-pointer bg-white border border-slate-200 hover:border-blue-400 rounded-2xl overflow-hidden flex flex-col transition-colors"
            >
              <div className="aspect-[4/3] bg-slate-100 relative">
                <SafeImage src={item.cover_image} alt={item.cover_alt || item.title_ar} fallbackTitle={item.title_ar} className="w-full h-full object-cover" />
                {item.logo_url && (
                  <div className="absolute top-2.5 end-2.5 bg-white/95 p-1 rounded-lg border border-slate-200 shadow-sm">
                    <img src={item.logo_url} alt={item.department_ar || item.title_ar} className="w-8 h-8 object-contain rounded" />
                  </div>
                )}
              </div>
              <div className="p-5 space-y-2.5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1.5">
                    <span className="font-semibold text-blue-700">{item.category}</span>
                    {item.department_ar && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{item.department_ar}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-num">{(item.published_at || '').slice(0, 10)}</span>
                  </div>
                  <h2 className="text-base font-bold text-slate-950 font-display leading-snug">{t(item.title_ar, item.title_en)}</h2>
                  <p className="text-sm text-slate-600 mt-2 line-clamp-2">{t(item.excerpt_ar, item.excerpt_en)}</p>
                </div>
                <span className="text-xs font-semibold text-blue-700 pt-2">{t('قراءة الخبر ←', 'Read more →')}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export const GalleryPage: React.FC = () => {
  const { t } = useApp();
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [activeAlbum, setActiveAlbum] = useState<number | 'all'>('all');
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);

  useEffect(() => {
    fetch('/api/public/gallery')
      .then((r) => r.json())
      .then((d) => {
        setAlbums(d.albums || []);
        setItems(d.items || []);
      });
  }, []);

  const filtered = activeAlbum === 'all' ? items : items.filter((i) => i.album_id === activeAlbum);

  return (
    <div className="bg-slate-50 min-h-screen">
      <section className="bg-slate-950 text-white py-14" style={{ backgroundColor: 'var(--sdg-navy, #0a192f)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <p className="text-xs font-semibold text-cyan-400">{t('الأرشيف المرئي', 'Visual Archive')}</p>
          <h1 className="text-3xl sm:text-4xl font-bold font-display">{t('معرض الصور والفيديوهات', 'Photo & Video Gallery')}</h1>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveAlbum('all')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg border ${
              activeAlbum === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            {t('جميع الألبومات', 'All Albums')}
          </button>
          {albums.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setActiveAlbum(a.id)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg border ${
                activeAlbum === a.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              {t(a.title_ar, a.title_en)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => setLightbox(item)}
              className="cursor-pointer group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-blue-400 transition-colors"
            >
              <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                <SafeImage src={item.thumbnail_url || item.url} alt={item.alt_text || item.title_ar} fallbackTitle={item.title_ar} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute top-3 end-3 p-1.5 rounded-lg bg-slate-950/70 text-white">
                  {item.media_type === 'video' ? <Film className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                </div>
              </div>
              <div className="p-4 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900 truncate">{t(item.title_ar, item.title_en)}</h3>
                  <span className="text-xs text-slate-400 font-mono-num shrink-0">{item.event_date}</span>
                </div>
                {item.caption_ar && <p className="text-xs text-slate-500 line-clamp-2">{item.caption_ar}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 text-white">
              <div className="min-w-0">
                <span className="text-sm font-semibold block truncate">{t(lightbox.title_ar, lightbox.title_en)}</span>
                {lightbox.caption_ar && <span className="text-xs text-slate-400 block truncate">{lightbox.caption_ar}</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`${lightbox.title_ar}\n${window.location.href}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-2.5 py-1 bg-emerald-600 rounded-md"
                >
                  {t('مشاركة', 'Share')}
                </a>
                <button type="button" onClick={() => setLightbox(null)} className="p-1 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="bg-black flex items-center justify-center max-h-[75vh]">
              {lightbox.media_type === 'video' ? (
                lightbox.url.includes('youtube') || lightbox.url.includes('youtu.be') ? (
                  <a href={lightbox.url} target="_blank" rel="noopener noreferrer" className="p-10 text-cyan-400 underline">
                    {t('فتح الفيديو', 'Open Video')}
                  </a>
                ) : (
                  <video src={lightbox.url} controls className="max-h-[75vh] w-full" />
                )
              ) : (
                <SafeImage src={lightbox.url} alt={lightbox.alt_text || lightbox.title_ar} className="max-h-[75vh] w-auto object-contain" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const LibraryPage: React.FC = () => {
  const { t } = useApp();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [cat, setCat] = useState('all');

  useEffect(() => {
    fetch('/api/public/library')
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d) ? d : []));
  }, []);

  const cats = [
    ['all', t('الكل', 'All')],
    ['pdf_guide', t('ملفات PDF وأدلة', 'PDF Guides')],
    ['awareness_kit', t('حقائب توعوية', 'Awareness Kits')],
    ['training_material', t('مواد تدريبية', 'Training Materials')],
    ['ebook', t('كتب إلكترونية', 'E-Books')],
    ['useful_link', t('روابط مفيدة', 'Useful Links')],
    ['educational_video', t('فيديوهات تعليمية', 'Educational Videos')],
    ['security_tool', t('أدوات الأمن الرقمي', 'Digital Security Tools')]
  ];

  const filtered = cat === 'all' ? items : items.filter((i) => i.category === cat);

  const handleOpen = async (item: LibraryItem) => {
    await fetch(`/api/public/library/${item.id}/download`, { method: 'POST' });
    setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, downloads_count: x.downloads_count + 1 } : x)));
    const target = item.file_url || item.external_url;
    if (target) window.open(target, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <section className="bg-slate-950 text-white py-14" style={{ backgroundColor: 'var(--sdg-navy, #0a192f)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <p className="text-xs font-semibold text-cyan-400">{t('المعرفة المفتوحة والأدلة التوعوية', 'Open Knowledge Base')}</p>
          <h1 className="text-3xl sm:text-4xl font-bold font-display">{t('المكتبة الرقمية', 'Digital Library')}</h1>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex flex-wrap gap-2">
          {cats.map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setCat(k)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${
                cat === k ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item) => (
            <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5 text-blue-700 font-semibold">
                    <BookOpen className="w-4 h-4" />
                    {cats.find(([k]) => k === item.category)?.[1] || item.category}
                  </span>
                  <span className="font-mono-num">{item.downloads_count} {t('استخدام', 'uses')}</span>
                </div>
                <h2 className="text-lg font-bold text-slate-950 font-display">{t(item.title_ar, item.title_en)}</h2>
                <p className="text-sm text-slate-600 leading-relaxed">{t(item.description_ar, item.description_en)}</p>
              </div>
              <button
                type="button"
                onClick={() => handleOpen(item)}
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-xl transition-colors"
              >
                {item.file_url ? <Download className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
                <span>{item.file_url ? t('تحميل الملف', 'Download File') : t('فتح المورد', 'Open Resource')}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const NewsAndEventsPage: React.FC = () => {
  const { t, navigate } = useApp();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [tab, setTab] = useState<'all' | 'news' | 'events'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [regForm, setRegForm] = useState({ full_name: '', email: '', phone: '', governorate: '', notes: '' });
  const [regMsg, setRegMsg] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/public/news').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/public/events').then((r) => (r.ok ? r.json() : []))
    ])
      .then(([nData, eData]) => {
        setNews(Array.isArray(nData) ? nData : []);
        setEvents(Array.isArray(eData) ? eData : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const q = search.trim().toLowerCase();
  const filteredNews = news.filter(
    (n) => !q || n.title_ar?.toLowerCase().includes(q) || n.excerpt_ar?.toLowerCase().includes(q) || n.category?.toLowerCase().includes(q)
  );
  const filteredEvents = events.filter(
    (e) => !q || e.title_ar?.toLowerCase().includes(q) || e.description_ar?.toLowerCase().includes(q) || e.location?.toLowerCase().includes(q)
  );

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    const res = await fetch(`/api/public/events/${selectedEvent.id}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regForm)
    });
    const data = await res.json();
    if (res.ok) {
      setRegMsg(data.message);
      setRegForm({ full_name: '', email: '', phone: '', governorate: '', notes: '' });
    } else {
      setRegMsg(data.error || 'تعذر التسجيل');
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <section className="bg-slate-950 text-white py-14" style={{ backgroundColor: 'var(--sdg-navy, #0a192f)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <p className="text-xs font-semibold text-cyan-400">{t('المركز الإعلامي والأنشطة الميدانية', 'Media Center & Field Activities')}</p>
          <h1 className="text-3xl sm:text-4xl font-bold font-display">{t('الأخبار والأنشطة والفعاليات', 'News, Activities & Events')}</h1>
          <p className="text-slate-300 max-w-2xl text-sm sm:text-base">
            {t(
              'تابع أحدث بيانات وأخبار مبادرة جيل رقمي آمن، إلى جانب الورش والندوات والفعاليات القادمة وإمكانية تسجيل الحضور مباشرة.',
              'Follow the latest initiative news, announcements, and upcoming workshops and community events.'
            )}
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl">
            {(
              [
                ['all', t('الكل', 'All')],
                ['news', t(`الأخبار (${filteredNews.length})`, `News (${filteredNews.length})`)],
                ['events', t(`الأنشطة والفعاليات (${filteredEvents.length})`, `Events (${filteredEvents.length})`)]
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  tab === key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('بحث في الأخبار والفعاليات...', 'Search news & events...')}
              className="w-full ps-9 pe-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">{t('جارٍ التحميل...', 'Loading...')}</div>
        ) : (
          <div className="space-y-12">
            {(tab === 'all' || tab === 'events') && (
              <section className="space-y-5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-950 font-display">{t('الأنشطة والفعاليات', 'Activities & Events')}</h2>
                  <button type="button" onClick={() => navigate('/events')} className="text-xs font-semibold text-blue-700 hover:underline">
                    {t('عرض صفحة الفعاليات المستقلة', 'Standalone Events View')}
                  </button>
                </div>

                {filteredEvents.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4">{t('لا توجد فعاليات مطابقة حاليًا.', 'No matching events right now.')}</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredEvents.map((ev) => (
                      <div key={ev.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
                        <div className="aspect-[16/9] bg-slate-100 relative">
                          <SafeImage src={ev.cover_image} alt={ev.cover_alt || ev.title_ar} fallbackTitle={ev.title_ar} className="w-full h-full object-cover" />
                          {ev.logo_url && (
                            <div className="absolute top-3 end-3 bg-white/95 p-1 rounded-lg border border-slate-200 shadow-sm">
                              <img src={ev.logo_url} alt={ev.title_ar} className="w-8 h-8 object-contain rounded" />
                            </div>
                          )}
                        </div>
                        <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span className="font-mono-num inline-flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-blue-700" /> {ev.event_date}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-blue-700" /> {ev.location}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold text-blue-700">
                                {ev.status === 'upcoming' ? t('قادم', 'Upcoming') : ev.status === 'ongoing' ? t('جاري', 'Ongoing') : t('منتهي', 'Completed')}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-950 font-display">{t(ev.title_ar, ev.title_en)}</h3>
                            <p className="text-sm text-slate-600 leading-relaxed">{t(ev.description_ar, ev.description_en)}</p>
                          </div>
                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-xs text-slate-500">{ev.organizer}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedEvent(ev);
                                setRegMsg('');
                              }}
                              className="px-4 py-2 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-lg"
                            >
                              {t('سجل حضورك الآن', 'Register Now')}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {(tab === 'all' || tab === 'news') && (
              <section className="space-y-5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-950 font-display">{t('الأخبار والبيانات الرسمية', 'News & Press Releases')}</h2>
                  <button type="button" onClick={() => navigate('/news')} className="text-xs font-semibold text-blue-700 hover:underline">
                    {t('أرشيف الأخبار بالتصنيفات', 'News Archive')}
                  </button>
                </div>

                {filteredNews.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4">{t('لا توجد أخبار منشورة مطابقة حاليًا.', 'No matching news articles right now.')}</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {filteredNews.map((item) => (
                      <article
                        key={item.id}
                        onClick={() => navigate(`/news/${item.slug}`)}
                        className="cursor-pointer bg-white border border-slate-200 hover:border-blue-400 rounded-2xl overflow-hidden flex flex-col transition-colors"
                      >
                        <div className="aspect-[4/3] bg-slate-100 relative">
                          <SafeImage src={item.cover_image} alt={item.cover_alt || item.title_ar} fallbackTitle={item.title_ar} className="w-full h-full object-cover" />
                          {item.logo_url && (
                            <div className="absolute top-2.5 end-2.5 bg-white/95 p-1 rounded-lg border border-slate-200 shadow-sm">
                              <img src={item.logo_url} alt={item.department_ar || item.title_ar} className="w-8 h-8 object-contain rounded" />
                            </div>
                          )}
                        </div>
                        <div className="p-5 space-y-2.5 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1.5">
                              <span className="font-semibold text-blue-700">{item.category}</span>
                              {item.department_ar && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span>{item.department_ar}</span>
                                </>
                              )}
                              <span aria-hidden="true">·</span>
                              <span className="font-mono-num">{(item.published_at || '').slice(0, 10)}</span>
                            </div>
                            <h3 className="text-base font-bold text-slate-950 font-display leading-snug">{t(item.title_ar, item.title_en)}</h3>
                            <p className="text-sm text-slate-600 mt-2 line-clamp-2">{t(item.excerpt_ar, item.excerpt_en)}</p>
                          </div>
                          <span className="text-xs font-semibold text-blue-700 pt-2">{t('قراءة الخبر ←', 'Read more →')}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>

      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold font-display text-slate-950">{t('التسجيل في الفعالية', 'Event Registration')}</h3>
              <button type="button" onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm font-medium text-blue-700">{selectedEvent.title_ar}</p>
            {regMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>{regMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3">
                <input required placeholder={t('الاسم بالكامل', 'Full Name')} value={regForm.full_name} onChange={(e) => setRegForm({ ...regForm, full_name: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl" />
                <input required type="email" placeholder={t('البريد الإلكتروني', 'Email')} value={regForm.email} onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl" />
                <input required placeholder={t('رقم الهاتف / واتساب', 'Phone / WhatsApp')} value={regForm.phone} onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl" />
                <input placeholder={t('المحافظة', 'Governorate')} value={regForm.governorate} onChange={(e) => setRegForm({ ...regForm, governorate: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl" />
                <button type="submit" className="w-full py-2.5 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-xl">
                  {t('تأكيد التسجيل', 'Confirm Registration')}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
