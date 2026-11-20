import React, { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, Clock, ExternalLink, GraduationCap, MapPin, Users, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SafeImage } from '../components/SafeImage';
import { normalizeExternalUrl } from '../lib/url';
import { OFFICIAL_SITE_ORIGIN, trackEvent, trackPageView } from '../lib/analytics';
import type { EventItem, ProjectItem, TrainingItem } from '../types';

function normalizeMediaGallery(raw?: string): { url: string; alt: string; caption: string }[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) =>
        typeof item === 'string'
          ? { url: item, alt: '', caption: '' }
          : item && typeof item === 'object' && item.url
          ? { url: String(item.url), alt: String(item.alt || ''), caption: String(item.caption || '') }
          : null
      )
      .filter((x): x is { url: string; alt: string; caption: string } => Boolean(x && x.url));
  } catch {
    return [];
  }
}

export const EventsPage: React.FC<{ eventId?: number }> = ({ eventId }) => {
  const { t, navigate, settings } = useApp();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [singleEvent, setSingleEvent] = useState<EventItem | null>(null);
  const [loadingSingle, setLoadingSingle] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', governorate: '', notes: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (eventId) {
      setLoadingSingle(true);
      fetch(`/api/public/events/${eventId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((ev: EventItem | null) => {
          setSingleEvent(ev);
          if (ev) {
            const siteTitle = settings.site_name_ar || 'جيل رقمي آمن';
            const pageTitle = `${ev.title_ar} | ${siteTitle}`;
            const pageDesc = (ev.description_ar || settings.seo_description || ev.title_ar).replace(/\s+/g, ' ').trim().slice(0, 165);
            const rawSiteUrl = (settings.site_url || '').trim().replace(/\/+$/, '');
            const isInternal = /(localhost|127\.0\.0\.1|ais-dev-|ais-pre-)/i.test(rawSiteUrl);
            const canonicalOrigin = rawSiteUrl && !isInternal ? rawSiteUrl : OFFICIAL_SITE_ORIGIN;
            const canonicalUrl = `${canonicalOrigin}/events/${ev.id}`;
            document.title = pageTitle;
            const canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
            if (canonicalEl) canonicalEl.href = canonicalUrl;
            const rawImg = ev.share_image_url || ev.cover_image || ev.logo_url || settings.og_image_url || settings.logo_url || '';
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
            updateMeta('name', 'description', pageDesc);
            updateMeta('name', 'robots', 'index, follow');
            updateMeta('property', 'og:title', pageTitle);
            updateMeta('property', 'og:description', pageDesc);
            updateMeta('property', 'og:url', canonicalUrl);
            updateMeta('name', 'twitter:title', pageTitle);
            updateMeta('name', 'twitter:description', pageDesc);
            if (fullImg) {
              updateMeta('property', 'og:image', fullImg);
              updateMeta('property', 'og:image:secure_url', fullImg);
              updateMeta('name', 'twitter:image', fullImg);
            }
            trackPageView(`/events/${ev.id}`, pageTitle);
            trackEvent('event_view', { event_id: ev.id, event_type: ev.event_type || '' });
          }
        })
        .finally(() => setLoadingSingle(false));
    } else {
      setSingleEvent(null);
      fetch('/api/public/events')
        .then((r) => r.json())
        .then((d) => setEvents(Array.isArray(d) ? d : []));
    }
  }, [eventId, settings]);

  const filtered = events.filter((e) => {
    if (filter !== 'all' && e.status !== filter) return false;
    if (typeFilter !== 'all' && e.event_type !== typeFilter) return false;
    return true;
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    const res = await fetch(`/api/public/events/${selectedEvent.id}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const data = await res.json();
    if (res.ok) {
      trackEvent('event_register', { event_id: selectedEvent.id, source: 'events' });
      setMsg(data.message);
      setForm({ full_name: '', email: '', phone: '', governorate: '', notes: '' });
    } else {
      setMsg(data.error || 'تعذر التسجيل');
    }
  };

  if (eventId) {
    if (loadingSingle) {
      return <div className="max-w-4xl mx-auto px-4 py-20 text-center text-slate-500">{t('جارٍ التحميل...', 'Loading...')}</div>;
    }
    if (!singleEvent) {
      return (
        <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
          <p className="text-slate-600">{t('الفعالية غير موجودة', 'Event not found')}</p>
          <button type="button" onClick={() => navigate('/events')} className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm">
            {t('العودة إلى الأنشطة والفعاليات', 'Back to Events')}
          </button>
        </div>
      );
    }
    const extraImgs = normalizeMediaGallery(singleEvent.gallery_json);
    return (
      <div className="bg-slate-50 min-h-screen py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
          <button type="button" onClick={() => navigate('/events')} className="text-sm font-medium text-blue-700 hover:underline">
            {t('← العودة إلى جميع الأنشطة والفعاليات', '← Back to all events')}
          </button>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            {singleEvent.cover_image && (
              <div className="aspect-[16/9] bg-slate-100 relative">
                <SafeImage src={singleEvent.cover_image} alt={singleEvent.cover_alt || singleEvent.title_ar} fallbackTitle={singleEvent.title_ar} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-6 sm:p-10 space-y-5">
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="font-mono-num inline-flex items-center gap-1"><Calendar className="w-4 h-4 text-blue-700" /> {singleEvent.event_date}</span>
                <span aria-hidden="true">·</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                  {singleEvent.attendance_mode === 'online' ? t('أونلاين', 'Online') : singleEvent.attendance_mode === 'hybrid' ? t('هجين', 'Hybrid') : t('حضوري / أوفلاين', 'Offline / Onsite')}
                </span>
                {singleEvent.location && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1"><MapPin className="w-4 h-4 text-rose-600" /> {singleEvent.location}</span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span>{singleEvent.organizer}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 font-display">{t(singleEvent.title_ar, singleEvent.title_en)}</h1>
              <p className="text-slate-700 leading-relaxed whitespace-pre-line">{t(singleEvent.description_ar, singleEvent.description_en)}</p>
              {(singleEvent.location_url || singleEvent.registration_url) && (
                <div className="flex flex-wrap gap-3 pt-1">
                  {normalizeExternalUrl(singleEvent.location_url) && (
                    <a
                      href={normalizeExternalUrl(singleEvent.location_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors"
                    >
                      <MapPin className="w-4 h-4" />
                      <span>{t('عرض اللوكيشن على خرائط جوجل', 'View Location on Google Maps')}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {normalizeExternalUrl(singleEvent.registration_url) && (
                    <a
                      href={normalizeExternalUrl(singleEvent.registration_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-cyan-50 text-cyan-800 hover:bg-cyan-100 border border-cyan-200 rounded-xl transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>{t('رابط الفعالية / التسجيل', 'Event / Registration Link')}</span>
                    </a>
                  )}
                </div>
              )}
              {singleEvent.partners_text && (
                <p className="text-sm text-slate-600"><strong>{t('الشركاء:', 'Partners:')}</strong> {singleEvent.partners_text}</p>
              )}
              {extraImgs.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  {extraImgs.map((g, gi) => (
                    <div key={gi} className="aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                      <SafeImage src={g.url} alt={g.alt || singleEvent.title_ar} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEvent(singleEvent);
                    setMsg('');
                  }}
                  className="px-6 py-2.5 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-xl"
                >
                  {t('سجل حضورك في الفعالية', 'Register for Event')}
                </button>
              </div>
            </div>
          </div>
        </div>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold font-display text-slate-950">{t('التسجيل في الفعالية', 'Event Registration')}</h3>
                <button type="button" onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-sm font-medium text-blue-700">{selectedEvent.title_ar}</p>
              {msg ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>{msg}</span>
                </div>
              ) : (
                <form onSubmit={handleRegister} className="space-y-3">
                  <input required placeholder={t('الاسم بالكامل', 'Full Name')} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl" />
                  <input required type="email" placeholder={t('البريد الإلكتروني', 'Email')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl" />
                  <input required placeholder={t('رقم الهاتف / واتساب', 'Phone / WhatsApp')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl" />
                  <input placeholder={t('المحافظة', 'Governorate')} value={form.governorate} onChange={(e) => setForm({ ...form, governorate: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl" />
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
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <section className="bg-slate-950 text-white py-14" style={{ backgroundColor: 'var(--sdg-navy, #0a192f)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <p className="text-xs font-semibold text-cyan-400">{t('الجدول الميداني والرقمي', 'Events Calendar')}</p>
          <h1 className="text-3xl sm:text-4xl font-bold font-display">{t('الأنشطة والفعاليات', 'Events & Activities')}</h1>
          <p className="text-slate-300 max-w-2xl">{t('ورش العمل، الندوات، المؤتمرات، الحملات التوعوية، والمسابقات والمبادرات المجتمعية.', 'Workshops, seminars, conferences, awareness campaigns, and competitions.')}</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl">
            {(['all', 'upcoming', 'completed'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilter(st)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  filter === st ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                {st === 'all' ? t('الكل', 'All') : st === 'upcoming' ? t('الأنشطة القادمة', 'Upcoming') : t('الأنشطة السابقة', 'Completed')}
              </button>
            ))}
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-700"
          >
            <option value="all">{t('جميع الأنواع', 'All Types')}</option>
            <option value="workshop">{t('ورش العمل', 'Workshops')}</option>
            <option value="seminar">{t('الندوات', 'Seminars')}</option>
            <option value="conference">{t('المؤتمرات', 'Conferences')}</option>
            <option value="campaign">{t('الحملات التوعوية', 'Campaigns')}</option>
            <option value="competition">{t('المسابقات', 'Competitions')}</option>
            <option value="community">{t('المبادرات المجتمعية', 'Community')}</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((ev) => {
            const extraImgs = normalizeMediaGallery(ev.gallery_json);
            return (
              <div key={ev.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
                <div className="aspect-[16/9] bg-slate-100 relative">
                  <SafeImage src={ev.cover_image} alt={ev.cover_alt || ev.title_ar} fallbackTitle={ev.title_ar} className="w-full h-full object-cover" />
                  {ev.logo_url && (
                    <div className="absolute top-3 end-3 bg-white/95 p-1 rounded-lg border border-slate-200 shadow-sm">
                      <img src={ev.logo_url} alt={ev.title_ar} className="w-9 h-9 object-contain rounded" />
                    </div>
                  )}
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono-num inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-blue-700" /> {ev.event_date}</span>
                      <span aria-hidden="true">·</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                        {ev.attendance_mode === 'online' ? t('أونلاين', 'Online') : ev.attendance_mode === 'hybrid' ? t('هجين', 'Hybrid') : t('حضوري / أوفلاين', 'Offline')}
                      </span>
                      {ev.location && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-rose-600" /> {ev.location}</span>
                        </>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-slate-950 font-display">
                      <a
                        href={`/events/${ev.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/events/${ev.id}`);
                        }}
                        className="hover:text-blue-700 transition-colors"
                      >
                        {t(ev.title_ar, ev.title_en)}
                      </a>
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed">{t(ev.description_ar, ev.description_en)}</p>
                    {(normalizeExternalUrl(ev.location_url) || normalizeExternalUrl(ev.registration_url)) && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {normalizeExternalUrl(ev.location_url) && (
                          <a
                            href={normalizeExternalUrl(ev.location_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{t('اللوكيشن على الخرائط', 'Location Map')}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {normalizeExternalUrl(ev.registration_url) && (
                          <a
                            href={normalizeExternalUrl(ev.registration_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-cyan-50 text-cyan-800 hover:bg-cyan-100 border border-cyan-200 rounded-lg"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>{t('رابط الفعالية', 'Event Link')}</span>
                          </a>
                        )}
                      </div>
                    )}
                    {ev.partners_text && <p className="text-xs text-slate-500">{t('الشركاء:', 'Partners:')} {ev.partners_text}</p>}
                    {extraImgs.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 pt-2">
                        {extraImgs.slice(0, 4).map((g, gi) => (
                          <div key={gi} className="aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                            <SafeImage src={g.url} alt={g.alt || ev.title_ar} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">{ev.organizer}</span>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/events/${ev.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/events/${ev.id}`);
                        }}
                        className="px-3 py-2 text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg"
                      >
                        {t('التفاصيل', 'Details')}
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEvent(ev);
                          setMsg('');
                        }}
                        className="px-4 py-2 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-lg"
                      >
                        {t('سجل حضورك الآن', 'Register Now')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold font-display text-slate-950">{t('التسجيل في الفعالية', 'Event Registration')}</h3>
              <button type="button" onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm font-medium text-blue-700">{selectedEvent.title_ar}</p>
            {msg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>{msg}</span>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3">
                <input required placeholder={t('الاسم بالكامل', 'Full Name')} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl" />
                <input required type="email" placeholder={t('البريد الإلكتروني', 'Email')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl" />
                <input required placeholder={t('رقم الهاتف / واتساب', 'Phone / WhatsApp')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl" />
                <input placeholder={t('المحافظة', 'Governorate')} value={form.governorate} onChange={(e) => setForm({ ...form, governorate: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl" />
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

export const TrainingsPage: React.FC = () => {
  const { t } = useApp();
  const [trainings, setTrainings] = useState<TrainingItem[]>([]);
  const [track, setTrack] = useState('all');
  const [selected, setSelected] = useState<TrainingItem | null>(null);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', governorate: '', member_number: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/public/trainings')
      .then((r) => r.json())
      .then((d) => setTrainings(Array.isArray(d) ? d : []));
  }, []);

  const tracks = [
    ['all', t('جميع المسارات', 'All Tracks')],
    ['cybersecurity', t('الأمن السيبراني', 'Cybersecurity')],
    ['programming', t('البرمجة', 'Programming')],
    ['ai', t('الذكاء الاصطناعي', 'Artificial Intelligence')],
    ['digital_transformation', t('التحول الرقمي', 'Digital Transformation')],
    ['digital_safety', t('السلامة الرقمية', 'Digital Safety')],
    ['anti_cyber_violence', t('مكافحة العنف الرقمي', 'Anti-Cyber Violence')],
    ['job_market', t('مهارات سوق العمل', 'Job Market Skills')],
    ['design_media', t('التصميم والميديا', 'Design & Media')],
    ['entrepreneurship', t('ريادة الأعمال', 'Entrepreneurship')]
  ];

  const filtered = track === 'all' ? trainings : trainings.filter((tr) => tr.track === track);

  const submitReg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const res = await fetch(`/api/public/trainings/${selected.id}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const data = await res.json();
    if (res.ok) {
      trackEvent('training_enroll', { training_id: selected.id, track: selected.track });
      setMsg(data.message);
      setTrainings((prev) => prev.map((x) => (x.id === selected.id ? { ...x, seats_taken: x.seats_taken + 1 } : x)));
      setForm({ full_name: '', email: '', phone: '', governorate: '', member_number: '' });
    } else {
      setMsg(data.error || 'تعذر التسجيل');
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <section className="bg-slate-950 text-white py-14" style={{ backgroundColor: 'var(--sdg-navy, #0a192f)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <p className="text-xs font-semibold text-cyan-400">{t('التأهيل وبناء القدرات', 'Training & Capacity Building')}</p>
          <h1 className="text-3xl sm:text-4xl font-bold font-display">{t('البرامج التدريبية المتخصصة', 'Specialized Training Programs')}</h1>
          <p className="text-slate-300 max-w-2xl">
            {t('مسارات تدريبية عملية في الأمن السيبراني، البرمجة، الذكاء الاصطناعي، والسلامة الرقمية بشهادات معتمدة.', 'Practical tracks in cybersecurity, programming, AI, and digital safety with verified certificates.')}
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex flex-wrap gap-2">
          {tracks.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTrack(key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                track === key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((tr) => (
            <div key={tr.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
              <div className="aspect-[16/9] bg-slate-100">
                <SafeImage src={tr.cover_image} alt={tr.title_ar} fallbackTitle={tr.title_ar} className="w-full h-full object-cover" />
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5 text-blue-700" /> {tr.trainer_name}</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 font-mono-num"><Clock className="w-3.5 h-3.5" /> {tr.hours} {t('ساعة', 'hrs')}</span>
                    <span aria-hidden="true">·</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                      {tr.delivery_mode === 'online' ? t('أونلاين', 'Online') : tr.delivery_mode === 'onsite' ? t('حضوري / أوفلاين', 'Offline / Onsite') : t('هجين', 'Hybrid')}
                    </span>
                    {tr.start_date && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-num">{tr.start_date}</span>
                      </>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-slate-950 font-display">{t(tr.title_ar, tr.title_en)}</h2>
                  <p className="text-sm text-slate-600 leading-relaxed">{t(tr.description_ar, tr.description_en)}</p>
                  {(tr.location || normalizeExternalUrl(tr.location_url) || normalizeExternalUrl(tr.external_registration_url)) && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {tr.location && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                          <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>{tr.location}</span>
                        </span>
                      )}
                      {normalizeExternalUrl(tr.location_url) && (
                        <a
                          href={normalizeExternalUrl(tr.location_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{t('اللوكيشن على الخرائط', 'Location Map')}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {normalizeExternalUrl(tr.external_registration_url) && (
                        <a
                          href={normalizeExternalUrl(tr.external_registration_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-cyan-50 text-cyan-800 hover:bg-cyan-100 border border-cyan-200 rounded-lg"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>{t('رابط التدريب / التسجيل', 'Course Link')}</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-600 font-mono-num flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-700" />
                    <span>{tr.seats_taken} / {tr.seats_total} {t('مقعد', 'seats')}</span>
                  </div>
                  {tr.registration_status === 'open' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(tr);
                        setMsg('');
                      }}
                      className="px-4 py-2 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-lg"
                    >
                      {t('التسجيل في الدورة', 'Enroll Now')}
                    </button>
                  ) : (
                    <span className="text-xs font-medium text-slate-500">{t('التسجيل مغلق', 'Closed')}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold font-display text-slate-950">{t('التسجيل في البرنامج التدريبي', 'Training Registration')}</h3>
              <button type="button" onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm font-medium text-blue-700">{selected.title_ar}</p>
            {msg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>{msg}</span>
              </div>
            ) : (
              <form onSubmit={submitReg} className="space-y-3">
                <input required placeholder={t('الاسم بالكامل', 'Full Name')} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl" />
                <input required type="email" placeholder={t('البريد الإلكتروني', 'Email')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl" />
                <input required placeholder={t('رقم الهاتف / واتساب', 'Phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl" />
                <input placeholder={t('المحافظة', 'Governorate')} value={form.governorate} onChange={(e) => setForm({ ...form, governorate: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl" />
                <input placeholder={t('رقم العضوية (إن وجد)', 'Member ID (Optional)')} value={form.member_number} onChange={(e) => setForm({ ...form, member_number: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl" />
                <button type="submit" className="w-full py-2.5 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-xl">
                  {t('إرسال طلب التسجيل', 'Submit Enrollment')}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const ProjectsPage: React.FC = () => {
  const { t } = useApp();
  const [projects, setProjects] = useState<ProjectItem[]>([]);

  useEffect(() => {
    fetch('/api/public/projects')
      .then((r) => r.json())
      .then((d) => setProjects(Array.isArray(d) ? d : []));
  }, []);

  return (
    <div className="bg-slate-50 min-h-screen">
      <section className="bg-slate-950 text-white py-14" style={{ backgroundColor: 'var(--sdg-navy, #0a192f)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <p className="text-xs font-semibold text-cyan-400">{t('المبادرات الميدانية والرقمية', 'Impact Initiatives')}</p>
          <h1 className="text-3xl sm:text-4xl font-bold font-display">{t('المبادرات والمشروعات', 'Initiatives & Projects')}</h1>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        {projects.map((p) => {
          const extraImgs = normalizeMediaGallery(p.gallery_json);
          return (
            <div key={p.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
              <div className="lg:col-span-5 aspect-[4/3] lg:aspect-auto bg-slate-100 relative">
                <SafeImage src={p.cover_image} alt={p.cover_alt || p.title_ar} fallbackTitle={p.title_ar} className="w-full h-full object-cover" />
                {p.logo_url && (
                  <div className="absolute top-3 end-3 bg-white/95 p-1.5 rounded-xl border border-slate-200 shadow-sm">
                    <img src={p.logo_url} alt={p.title_ar} className="w-10 h-10 object-contain rounded" />
                  </div>
                )}
              </div>
              <div className="lg:col-span-7 p-6 sm:p-8 space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono-num">{p.execution_date}</span>
                  <span aria-hidden="true">·</span>
                  <span>{p.status === 'active' ? t('مشروع قيد التنفيذ', 'Active') : p.status === 'completed' ? t('مكتمل', 'Completed') : t('مخطط', 'Planned')}</span>
                  {p.attendance_mode && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                        {p.attendance_mode === 'online' ? t('أونلاين', 'Online') : p.attendance_mode === 'hybrid' ? t('هجين', 'Hybrid') : t('حضوري / أوفلاين', 'Offline')}
                      </span>
                    </>
                  )}
                  {p.location && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-rose-600" /> {p.location}</span>
                    </>
                  )}
                  {p.partners_text && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{p.partners_text}</span>
                    </>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-slate-950 font-display">{t(p.title_ar, p.title_en)}</h2>
                <p className="text-sm text-slate-700 leading-relaxed">{t(p.description_ar, p.description_en)}</p>
                {(normalizeExternalUrl(p.location_url) || normalizeExternalUrl(p.external_url)) && (
                  <div className="flex flex-wrap gap-2">
                    {normalizeExternalUrl(p.location_url) && (
                      <a
                        href={normalizeExternalUrl(p.location_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{t('اللوكيشن على الخرائط', 'Location Map')}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {normalizeExternalUrl(p.external_url) && (
                      <a
                        href={normalizeExternalUrl(p.external_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-cyan-50 text-cyan-800 hover:bg-cyan-100 border border-cyan-200 rounded-lg"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{t('رابط المبادرة', 'Initiative Link')}</span>
                      </a>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <p className="font-bold text-slate-900 mb-1">{t('الأهداف:', 'Objectives:')}</p>
                    <p className="text-slate-600 leading-relaxed">{p.objectives_ar}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 mb-1">{t('الفئة المستهدفة والنتائج:', 'Target Audience & Results:')}</p>
                    <p className="text-slate-600 leading-relaxed">{p.target_audience_ar} {p.results_ar ? `— ${p.results_ar}` : ''}</p>
                  </div>
                </div>
                {extraImgs.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
                    {extraImgs.slice(0, 4).map((g, gi) => (
                      <div key={gi} className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                        <div className="aspect-[4/3]">
                          <SafeImage src={g.url} alt={g.alt || p.title_ar} className="w-full h-full object-cover" />
                        </div>
                        {g.caption && <p className="p-1 text-[10px] text-slate-600 truncate">{g.caption}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
