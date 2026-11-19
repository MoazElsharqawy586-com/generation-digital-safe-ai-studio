import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SafeImage } from '../components/SafeImage';
import type { Committee, CommitteeMember, EventItem, LeadershipItem, NewsItem } from '../types';

export const LeadershipPage: React.FC = () => {
  const { t, navigate } = useApp();
  const [leaders, setLeaders] = useState<LeadershipItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/public/leadership')
      .then((r) => r.json())
      .then((d) => setLeaders(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  const tiers: { key: LeadershipItem['tier']; label_ar: string; label_en: string }[] = [
    { key: 'president', label_ar: 'رئيس المبادرة', label_en: 'Initiative President' },
    { key: 'vice_president', label_ar: 'نائب رئيس المبادرة', label_en: 'Vice President' },
    { key: 'board', label_ar: 'أعضاء مجلس الإدارة', label_en: 'Board Members' },
    { key: 'committee_head', label_ar: 'رؤساء اللجان', label_en: 'Committee Heads' },
    { key: 'committee_member', label_ar: 'أعضاء اللجان القياديون', label_en: 'Committee Members' }
  ];

  return (
    <div className="bg-slate-50 min-h-screen">
      <section className="bg-slate-950 text-white py-14" style={{ backgroundColor: 'var(--sdg-navy, #0a192f)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <p className="text-xs font-semibold text-cyan-400">{t('الهيكل القيادي', 'Leadership Structure')}</p>
          <h1 className="text-3xl sm:text-4xl font-bold font-display">{t('قيادات مبادرة جيل رقمي آمن', 'Initiative Leadership')}</h1>
          <p className="text-slate-300 max-w-2xl">
            {t('فريق القيادة التنفيذية ومجلس الإدارة ورؤساء اللجان المتخصصة بالمبادرة.', 'Executive leadership, board members, and heads of specialized committees.')}
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {loading ? (
          <div className="text-center py-12 text-slate-500">{t('جارٍ التحميل...', 'Loading...')}</div>
        ) : leaders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-4">
            <Users className="w-10 h-10 text-blue-700 mx-auto" />
            <h2 className="text-xl font-bold text-slate-900 font-display">{t('سجل القيادات قيد التحديث من لوحة الإدارة', 'Leadership Directory Managed via Admin')}</h2>
            <p className="text-sm text-slate-600 max-w-lg mx-auto">
              {t('يمكن لمسؤولي المبادرة إضافة رئيس المبادرة ونائبه وأعضاء الإدارة ورؤساء اللجان مباشرة من لوحة التحكم.', 'Initiative administrators can add leadership profiles directly from the Admin Dashboard.')}
            </p>
            <button type="button" onClick={() => navigate('/committees')} className="px-5 py-2.5 text-sm font-semibold bg-blue-700 text-white rounded-xl">
              {t('استعراض اللجان التسع', 'Explore the 9 Committees')}
            </button>
          </div>
        ) : (
          tiers.map((tier) => {
            const list = leaders.filter((l) => l.tier === tier.key);
            if (list.length === 0) return null;
            return (
              <div key={tier.key} className="space-y-5">
                <h2 className="text-xl font-bold text-slate-950 font-display border-b border-slate-200 pb-3">
                  {t(tier.label_ar, tier.label_en)}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {list.map((person) => (
                    <div key={person.id} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                          <SafeImage src={person.avatar_url} alt={person.name_ar} fallbackTitle={person.name_ar} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-slate-950 font-display truncate">{t(person.name_ar, person.name_en)}</h3>
                          <p className="text-xs font-semibold text-blue-700 truncate">{t(person.role_ar, person.role_en)}</p>
                          {person.committee_name && <p className="text-xs text-slate-500 truncate mt-0.5">{person.committee_name}</p>}
                        </div>
                      </div>
                      {person.bio_ar && <p className="text-sm text-slate-600 leading-relaxed">{t(person.bio_ar, person.bio_en)}</p>}
                      {person.joined_at && (
                        <p className="text-xs text-slate-400 font-mono-num">
                          {t('تاريخ الانضمام:', 'Joined:')} {person.joined_at}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export const CommitteesPage: React.FC<{ slug?: string }> = ({ slug }) => {
  const { committees, t, lang, navigate, settings } = useApp();
  const [detail, setDetail] = useState<{
    committee: Committee;
    members: CommitteeMember[];
    events: EventItem[];
    news: NewsItem[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight;

  useEffect(() => {
    if (!slug) {
      setDetail(null);
      return;
    }
    setLoading(true);
    fetch(`/api/public/committees/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setDetail(d);
        if (d?.committee) {
          const com = d.committee as Committee;
          const siteTitle = settings.site_name_ar || 'جيل رقمي آمن';
          const pageTitle = `${com.name_ar} | ${siteTitle}`;
          const pageDesc = (com.description_ar || settings.seo_description || com.name_ar).slice(0, 165);
          const canonicalOrigin = (settings.site_url || window.location.origin).replace(/\/+$/, '');
          const canonicalUrl = `${canonicalOrigin}/committees/${encodeURIComponent(com.slug)}`;
          document.title = pageTitle;
          const canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
          if (canonicalEl) canonicalEl.href = canonicalUrl;
          const rawImg = com.logo_url || settings.og_image_url || settings.logo_url || '';
          const fullImg = rawImg ? (rawImg.startsWith('http') ? rawImg : `${canonicalOrigin}${rawImg.startsWith('/') ? rawImg : `/${rawImg}`}`) : '';
          const updateMeta = (attr: 'name' | 'property', key: string, content: string) => {
            if (!content) return;
            const el = document.querySelector(`meta[${attr}="${key}"]`);
            if (el) el.setAttribute('content', content);
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
            updateMeta('name', 'twitter:image', fullImg);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [slug, settings]);

  if (slug) {
    if (loading) {
      return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-500">{t('جارٍ التحميل...', 'Loading...')}</div>;
    }
    if (!detail) {
      return (
        <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
          <p className="text-slate-600">{t('اللجنة غير موجودة', 'Committee not found')}</p>
          <button type="button" onClick={() => navigate('/committees')} className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm">
            {t('العودة إلى اللجان', 'Back to Committees')}
          </button>
        </div>
      );
    }

    const { committee, members, events, news } = detail;
    let tasks: string[] = [];
    try {
      tasks = JSON.parse(committee.tasks_ar || '[]');
    } catch {
      tasks = [];
    }

    return (
      <div className="bg-slate-50 min-h-screen">
        <section className="bg-slate-950 text-white py-14" style={{ backgroundColor: 'var(--sdg-navy, #0a192f)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <SafeImage
                src={committee.logo_url}
                alt={committee.name_ar}
                className="w-20 h-20 rounded-2xl object-contain bg-white p-1.5 border border-slate-700 shrink-0"
              />
              <div className="space-y-2">
                <button type="button" onClick={() => navigate('/committees')} className="text-xs text-cyan-400 hover:underline">
                  {t('جميع اللجان ←', '← All Committees')}
                </button>
                <h1 className="text-2xl sm:text-4xl font-bold font-display">{t(committee.name_ar, committee.name_en)}</h1>
                <p className="text-sm text-slate-300 max-w-2xl">{t(committee.description_ar, committee.description_en)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/join')}
              className="px-5 py-3 text-sm font-semibold text-white rounded-xl shrink-0"
              style={{ backgroundColor: 'var(--sdg-primary, #1d4ed8)' }}
            >
              {t('انضم لهذه اللجنة', 'Join This Committee')}
            </button>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Tasks & Head */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
              <h2 className="text-xl font-bold text-slate-950 font-display">{t('مهام واختصاصات اللجنة', 'Committee Responsibilities')}</h2>
              <ul className="space-y-3">
                {tasks.map((task, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                    <span>{task}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-950 font-display">{t('رئاسة اللجنة', 'Committee Head')}</h2>
              <p className="text-base font-bold text-blue-800">{committee.head_name || t('يُحدَّث عبر الإدارة', 'Updated by Admin')}</p>
              <p className="text-xs text-slate-500">{committee.head_title}</p>
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500">{t('إجمالي الأعضاء المسجلين:', 'Registered Members:')}</p>
                <p className="text-2xl font-bold font-mono-num text-slate-900 mt-1">{members.length}</p>
              </div>
            </div>
          </div>

          {/* Committee Members */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-950 font-display">{t('أعضاء اللجنة', 'Committee Members')}</h2>
            {members.length === 0 ? (
              <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-xl p-6">
                {t('يتم إدراج الأعضاء المقبولين تلقائيًا في هذا القسم فور اعتماد عضويتهم.', 'Approved committee members appear here automatically.')}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {members.map((m) => (
                  <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                    <SafeImage src={m.avatar_url} alt={m.person_name} fallbackTitle={m.person_name} className="w-12 h-12 rounded-full object-cover border border-slate-200 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{m.person_name}</p>
                      <p className="text-xs text-blue-700 truncate">{m.role_title}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Related Events & News */}
          {(events.length > 0 || news.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {events.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
                  <h3 className="font-bold text-slate-950 font-display">{t('أنشطة اللجنة', 'Committee Events')}</h3>
                  {events.map((ev) => (
                    <div key={ev.id} className="py-2 border-b border-slate-100 last:border-0">
                      <p className="text-sm font-semibold text-slate-900">{ev.title_ar}</p>
                      <p className="text-xs text-slate-500 font-mono-num">{ev.event_date}</p>
                    </div>
                  ))}
                </div>
              )}
              {news.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
                  <h3 className="font-bold text-slate-950 font-display">{t('أخبار اللجنة', 'Committee News')}</h3>
                  {news.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => navigate(`/news/${n.slug}`)}
                      className="w-full text-start py-2 border-b border-slate-100 last:border-0 hover:text-blue-700"
                    >
                      <p className="text-sm font-semibold">{n.title_ar}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <section className="bg-slate-950 text-white py-14" style={{ backgroundColor: 'var(--sdg-navy, #0a192f)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <p className="text-xs font-semibold text-cyan-400">{t('الهيكل التنظيمي والتخصصي', 'Organizational Committees')}</p>
          <h1 className="text-3xl sm:text-4xl font-bold font-display">{t('اللجان المتخصصة بالمبادرة', 'Specialized Committees')}</h1>
          <p className="text-slate-300 max-w-2xl">
            {t('تعمل مبادرة جيل رقمي آمن عبر 9 لجان نوعية متكاملة لتحقيق أهداف التوعية والتدريب والتحول الرقمي.', 'Nine specialized committees driving awareness, training, technology, and community engagement.')}
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {committees.map((c, idx) => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-5 hover:border-blue-400 transition-colors">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <SafeImage src={c.logo_url} alt={c.name_ar} className="w-12 h-12 rounded-xl object-contain border border-slate-100 p-1" />
                  <span className="font-mono-num text-xs font-bold text-slate-400">{String(idx + 1).padStart(2, '0')}</span>
                </div>
                <h2 className="text-lg font-bold text-slate-950 font-display">{t(c.name_ar, c.name_en)}</h2>
                <p className="text-sm text-slate-600 leading-relaxed">{t(c.description_ar, c.description_en)}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/committees/${c.slug}`)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline self-start"
              >
                <span>{t('عرض صفحة اللجنة والمهام', 'View Committee & Tasks')}</span>
                <ArrowIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
