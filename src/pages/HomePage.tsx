import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  Cpu,
  ExternalLink,
  GraduationCap,
  Layers,
  Lock,
  MapPin,
  ShieldCheck,
  Users,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SafeImage } from '../components/SafeImage';
import { PartnerMarquee } from '../components/PartnerMarquee';
import type { EventItem, GalleryItem, NewsItem, ProjectItem, TrainingItem } from '../types';

export const HomePage: React.FC = () => {
  const { t, lang, navigate, settings, stats, committees } = useApp();
  const [homeData, setHomeData] = useState<{
    news: NewsItem[];
    events: EventItem[];
    trainings: TrainingItem[];
    projects: ProjectItem[];
    gallery: GalleryItem[];
  }>({ news: [], events: [], trainings: [], projects: [], gallery: [] });
  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);

  useEffect(() => {
    fetch('/api/public/home')
      .then((r) => r.json())
      .then((d) => setHomeData(d))
      .catch(() => {});
  }, []);

  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight;

  let goalsList: { title_ar: string; title_en: string }[] = [];
  try {
    goalsList = JSON.parse(settings.goals_json || '[]');
  } catch {
    goalsList = [];
  }

  const workFields = [
    { icon: ShieldCheck, title_ar: 'الأمن السيبراني وحماية البيانات', title_en: 'Cybersecurity & Data Protection', desc_ar: 'توعية عملية لحماية الحسابات والشبكات ومواجهة الاختراق والتصيد الإلكتروني.' },
    { icon: Lock, title_ar: 'مكافحة العنف والتنمر الرقمي', title_en: 'Anti-Cyberbullying & Online Safety', desc_ar: 'برامج حماية للنشء والشباب والأسر للتصدي للابتزاز والتنمر الإلكتروني.' },
    { icon: Cpu, title_ar: 'الذكاء الاصطناعي والتقنيات الحديثة', title_en: 'AI Literacy & Emerging Tech', desc_ar: 'توظيف أدوات الذكاء الاصطناعي بمسؤولية والوعي بمخاطر التزييف العميق.' },
    { icon: Layers, title_ar: 'تعلم البرمجة وبناء المشروعات', title_en: 'Coding & Software Innovation', desc_ar: 'مسارات تدريبية تأسيسية ومتقدمة في البرمجة وتطوير التطبيقات الآمنة.' },
    { icon: Users, title_ar: 'المواطنة الرقمية والقيادة الشبابية', title_en: 'Digital Citizenship & Youth Leadership', desc_ar: 'إعداد سفراء وعي رقمي بالجامعات ومراكز الشباب عبر 9 لجان متخصصة.' },
    { icon: BookOpen, title_ar: 'التأهيل الرقمي لسوق العمل', title_en: 'Digital Workforce Readiness', desc_ar: 'تنمية المهارات التقنية والمهنية وريادة الأعمال لتأهيل الشباب لسوق العمل.' }
  ];

  const heroImage = settings.hero_image_url || '/assets/images/hero_digital_safety_1795097420204.jpg';
  const homeLogo = settings.home_logo_url || settings.logo_url || '/assets/aistudio/FB_IMG_1789831319399_ac126220.jpg';

  return (
    <div>
      {/* 1. Institutional Hero Section */}
      <section className="relative bg-slate-950 text-white overflow-hidden" style={{ backgroundColor: 'var(--sdg-navy, #0a192f)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
              <div className="text-xs sm:text-sm font-medium text-cyan-300 leading-relaxed">
                {t(
                  settings.umbrella_text_ar ||
                    'تحت مظلة الاتحاد النوعي للجمعيات العاملة في مجال التنمية المجتمعية (حكاية وطن) — المشهر برقم 1279 لسنة 2025 بوزارة التضامن الاجتماعي',
                  settings.umbrella_text_en ||
                    'Under Hikayat Watan Community Development Union — Reg. No. 1279/2025, Ministry of Social Solidarity'
                )}
              </div>

              <h1
                className="font-display font-extrabold tracking-tight text-white leading-[1.2] max-w-2xl"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.6rem)', textWrap: 'balance' }}
              >
                {t(settings.site_slogan_ar || 'معًا لمستقبل رقمي آمن', settings.site_slogan_en || 'Together for a Safe Digital Future')}
              </h1>

              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
                {t(
                  settings.about_summary_ar ||
                    'مبادرة جيل رقمي آمن هي منصة شبابية تكنولوجية تعمل على نشر الوعي بالأمن الرقمي، مكافحة العنف الإلكتروني، وتمكين الشباب في البرمجة والذكاء الاصطناعي والأمن السيبراني.',
                  settings.about_summary_en ||
                    'Safe Digital Generation is a youth tech initiative advancing digital safety awareness, combating cyber violence, and empowering youth in coding, AI, and cybersecurity.'
                )}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/join')}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white rounded-xl transition-colors whitespace-nowrap"
                  style={{ backgroundColor: 'var(--sdg-primary, #1d4ed8)' }}
                >
                  <span>{t('انضم إلى المبادرة الآن', 'Join the Initiative')}</span>
                  <ArrowIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/trainings')}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-slate-100 border border-slate-700 hover:border-cyan-400 rounded-xl transition-colors whitespace-nowrap"
                >
                  <span>{t('استكشف البرامج التدريبية', 'Explore Training Tracks')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/verify')}
                  className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-cyan-300 hover:text-cyan-200 transition-colors whitespace-nowrap"
                >
                  <span>{t('التحقق من الكارنيه والشهادة', 'Verify Card / Certificate')}</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="h-full min-h-[280px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
                <SafeImage
                  src={heroImage}
                  alt={t('شباب مبادرة جيل رقمي آمن', 'Safe Digital Generation Youth')}
                  fallbackTitle="جيل رقمي آمن"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                <div className="absolute top-4 end-4 bg-white/95 rounded-xl p-1.5 border border-slate-200 shadow-lg">
                  <img
                    src={homeLogo}
                    alt={settings.site_name_ar || 'شعار مبادرة جيل رقمي آمن'}
                    className="w-12 h-12 object-contain rounded-lg"
                  />
                </div>
                <div className="absolute bottom-4 inset-x-4 flex items-center justify-between gap-3 text-xs text-slate-200">
                  <span className="font-semibold">{t('جيل رقمي آمن — SAFE DIGITAL GENERATION', 'SAFE DIGITAL GENERATION')}</span>
                  <span className="font-mono-num text-cyan-300">{t('إشهار 1279 / 2025', 'Reg. 1279 / 2025')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Continuous Horizontal Partner Marquee */}
      <PartnerMarquee />

      {/* 3. Live Achievement Statistics Bar */}
      <section className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { value: stats.committeesCount, label: t('لجان تخصصية فعالة', 'Specialized Committees') },
              { value: stats.trainingsCount, label: t('برامج ومسارات تدريبية', 'Training Programs') },
              { value: stats.eventsCount + stats.projectsCount, label: t('فعاليات ومشروعات مجتمعية', 'Events & Projects') },
              { value: stats.membersCount || stats.partnersCount, label: stats.membersCount > 0 ? t('أعضاء معتمدون بالمنصة', 'Verified Members') : t('جهات رسمية وشريكة', 'Official Entities') }
            ].map((item, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-3xl font-extrabold text-slate-950 font-mono-num">{item.value}</p>
                <p className="text-sm text-slate-600 mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Work Fields & Core Capabilities */}
      <section className="bg-white py-16 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-semibold text-blue-700 mb-2">{t('محاور العمل الاستراتيجية', 'Strategic Work Fields')}</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 font-display">
                {t('مجالات عمل مبادرة جيل رقمي آمن', 'Core Work Fields of the Initiative')}
              </h2>
            </div>
            <button type="button" onClick={() => navigate('/about')} className="text-sm font-medium text-blue-700 hover:underline inline-flex items-center gap-1.5">
              <span>{t('اقرأ المزيد عن رسالتنا', 'Read about our mission')}</span>
              <ArrowIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workFields.map((f, idx) => {
              const Icon = f.icon;
              return (
                <div key={idx} className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50 hover:bg-white hover:border-blue-300 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 font-display mb-2">{t(f.title_ar, f.title_en)}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{f.desc_ar}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. Initiative Goals (12 Goals Editorial Grid) */}
      <section className="bg-slate-50 py-16 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-semibold text-blue-700 mb-2">{t('الأهداف الرسمية', 'Official Objectives')}</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 font-display">
                {t('أهداف مبادرة جيل رقمي آمن', 'Initiative Goals')}
              </h2>
            </div>
            <button type="button" onClick={() => navigate('/goals')} className="text-sm font-medium text-blue-700 hover:underline inline-flex items-center gap-1.5">
              <span>{t('عرض صفحة الأهداف الكاملة', 'View full goals')}</span>
              <ArrowIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {goalsList.slice(0, 12).map((goal, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3">
                <span className="font-mono-num text-xs font-bold text-blue-700 pt-0.5">{String(idx + 1).padStart(2, '0')}.</span>
                <p className="text-sm font-semibold text-slate-900 leading-snug">{t(goal.title_ar, goal.title_en)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Latest News */}
      <section className="bg-white py-16 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-semibold text-blue-700 mb-2">{t('المركز الإعلامي', 'Media Center')}</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 font-display">{t('أحدث الأخبار والبيانات', 'Latest News & Updates')}</h2>
            </div>
            <button type="button" onClick={() => navigate('/news')} className="text-sm font-medium text-blue-700 hover:underline inline-flex items-center gap-1.5">
              <span>{t('جميع الأخبار', 'All News')}</span>
              <ArrowIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {homeData.news.slice(0, 3).map((item) => (
              <article
                key={item.id}
                onClick={() => navigate(`/news/${item.slug}`)}
                className="group cursor-pointer border border-slate-200 rounded-2xl overflow-hidden bg-white hover:border-blue-300 transition-colors flex flex-col"
              >
                <div className="aspect-[4/3] overflow-hidden bg-slate-100 relative">
                  <SafeImage
                    src={item.cover_image}
                    alt={item.cover_alt || t(item.title_ar, item.title_en)}
                    fallbackTitle={item.title_ar}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  />
                  {item.logo_url && (
                    <div className="absolute top-2.5 end-2.5 bg-white/95 p-1 rounded-lg border border-slate-200 shadow-sm">
                      <img src={item.logo_url} alt={item.department_ar || item.title_ar} className="w-7 h-7 object-contain rounded" />
                    </div>
                  )}
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-2">
                      <span>{item.category}</span>
                      {item.department_ar && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{item.department_ar}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-num">{(item.published_at || '').slice(0, 10)}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-950 font-display leading-snug group-hover:text-blue-700 transition-colors">
                      {t(item.title_ar, item.title_en)}
                    </h3>
                    <p className="text-sm text-slate-600 mt-2 line-clamp-2">{t(item.excerpt_ar, item.excerpt_en)}</p>
                  </div>
                  <span className="text-xs font-semibold text-blue-700 inline-flex items-center gap-1">
                    {t('قراءة التفاصيل', 'Read more')}
                    <ArrowIcon className="w-3.5 h-3.5" />
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Trainings & Events Split */}
      <section className="bg-slate-50 py-16 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Training Programs */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-950 font-display">{t('البرامج التدريبية', 'Training Programs')}</h2>
              <button type="button" onClick={() => navigate('/trainings')} className="text-xs font-semibold text-blue-700 hover:underline">
                {t('عرض الكل', 'View all')}
              </button>
            </div>
            <div className="space-y-4">
              {homeData.trainings.slice(0, 3).map((tr) => (
                <div
                  key={tr.id}
                  onClick={() => navigate('/trainings')}
                  className="cursor-pointer bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-4 flex items-center gap-4 transition-colors"
                >
                  <div className="w-20 h-16 rounded-lg overflow-hidden shrink-0 bg-slate-100">
                    <SafeImage src={tr.cover_image} alt={tr.title_ar} fallbackTitle={tr.title_ar} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                      <GraduationCap className="w-3.5 h-3.5 text-blue-700" />
                      <span>{tr.hours} {t('ساعة تدريبية', 'hrs')}</span>
                      <span aria-hidden="true">·</span>
                      <span>{tr.delivery_mode === 'online' ? t('أونلاين', 'Online') : tr.delivery_mode === 'onsite' ? t('حضوري', 'Onsite') : t('هجين', 'Hybrid')}</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 truncate">{t(tr.title_ar, tr.title_en)}</h3>
                    <p className="text-xs text-slate-600 truncate mt-0.5">{tr.trainer_name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Events */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-950 font-display">{t('الأنشطة والفعاليات', 'Events & Activities')}</h2>
              <button type="button" onClick={() => navigate('/events')} className="text-xs font-semibold text-blue-700 hover:underline">
                {t('عرض الكل', 'View all')}
              </button>
            </div>
            <div className="space-y-4">
              {homeData.events.slice(0, 3).map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => navigate('/events')}
                  className="cursor-pointer bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-4 flex items-center gap-4 transition-colors"
                >
                  <div className="w-20 h-16 rounded-lg overflow-hidden shrink-0 bg-slate-100">
                    <SafeImage src={ev.cover_image} alt={ev.title_ar} fallbackTitle={ev.title_ar} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-700" />
                      <span className="font-mono-num">{ev.event_date}</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 truncate">{t(ev.title_ar, ev.title_en)}</h3>
                    <p className="text-xs text-slate-600 truncate mt-0.5 inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span>{ev.location}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 8. Projects & Committees Preview */}
      <section className="bg-white py-16 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
          <div>
            <div className="flex items-end justify-between gap-4 mb-8">
              <div>
                <p className="text-xs font-semibold text-blue-700 mb-1">{t('الأثر المجتمعي', 'Community Impact')}</p>
                <h2 className="text-2xl font-bold text-slate-950 font-display">{t('المبادرات والمشروعات', 'Initiatives & Projects')}</h2>
              </div>
              <button type="button" onClick={() => navigate('/projects')} className="text-sm font-medium text-blue-700 hover:underline">
                {t('عرض المشروعات', 'View Projects')}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {homeData.projects.slice(0, 2).map((p) => (
                <div key={p.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50 grid grid-cols-1 sm:grid-cols-5">
                  <div className="sm:col-span-2 aspect-[4/3] sm:aspect-auto relative">
                    <SafeImage src={p.cover_image} alt={p.cover_alt || p.title_ar} fallbackTitle={p.title_ar} className="w-full h-full object-cover" />
                    {p.logo_url && (
                      <div className="absolute top-2 end-2 bg-white/95 p-1 rounded-lg border border-slate-200 shadow-sm">
                        <img src={p.logo_url} alt={p.title_ar} className="w-7 h-7 object-contain rounded" />
                      </div>
                    )}
                  </div>
                  <div className="sm:col-span-3 p-5 flex flex-col justify-between space-y-3">
                    <div>
                      <p className="text-xs text-slate-500 mb-1 font-mono-num">{p.execution_date}</p>
                      <h3 className="text-base font-bold text-slate-950 font-display">{t(p.title_ar, p.title_en)}</h3>
                      <p className="text-sm text-slate-600 mt-2 line-clamp-3">{t(p.description_ar, p.description_en)}</p>
                    </div>
                    <button type="button" onClick={() => navigate('/projects')} className="text-xs font-semibold text-blue-700 hover:underline self-start">
                      {t('تفاصيل المشروع', 'Project details')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 9 Committees Strip */}
          <div>
            <div className="flex items-end justify-between gap-4 mb-6">
              <div>
                <p className="text-xs font-semibold text-blue-700 mb-1">{t('الهيكل التنظيمي', 'Organizational Structure')}</p>
                <h2 className="text-2xl font-bold text-slate-950 font-display">{t('اللجان المتخصصة بالمبادرة', 'Specialized Committees')}</h2>
              </div>
              <button type="button" onClick={() => navigate('/committees')} className="text-sm font-medium text-blue-700 hover:underline">
                {t('استعراض اللجان', 'Explore Committees')}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {committees.slice(0, 9).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => navigate(`/committees/${c.slug}`)}
                  className="text-start border border-slate-200 hover:border-blue-400 bg-white rounded-xl p-4 transition-colors flex items-start justify-between gap-3"
                >
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-display">{t(c.name_ar, c.name_en)}</h3>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{t(c.description_ar, c.description_en)}</p>
                  </div>
                  <ArrowIcon className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 9. Gallery Preview + Lightbox */}
      {homeData.gallery.length > 0 && (
        <section className="bg-slate-50 py-16 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between gap-4 mb-8">
              <div>
                <p className="text-xs font-semibold text-blue-700 mb-1">{t('التوثيق البصري', 'Visual Archive')}</p>
                <h2 className="text-2xl font-bold text-slate-950 font-display">{t('معرض الصور والفعاليات', 'Photo & Media Gallery')}</h2>
              </div>
              <button type="button" onClick={() => navigate('/gallery')} className="text-sm font-medium text-blue-700 hover:underline">
                {t('المعرض الكامل', 'Full Gallery')}
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {homeData.gallery.slice(0, 4).map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setLightboxItem(g)}
                  className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-slate-200 text-start"
                >
                  <SafeImage src={g.thumbnail_url || g.url} alt={g.title_ar} fallbackTitle={g.title_ar} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <span className="text-xs font-medium text-white line-clamp-1">{t(g.title_ar, g.title_en)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 10. Join & Social CTA */}
      <section className="bg-slate-950 text-white py-14" style={{ backgroundColor: 'var(--sdg-navy, #0a192f)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold font-display">{t('كن جزءًا من صناعة مستقبل رقمي آمن', 'Be Part of Building a Safe Digital Future')}</h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto">
            {t(
              'انضم كمتطوع أو عضو فعال في إحدى لجان المبادرة، أو تابع قنواتنا الرسمية للمشاركة في الفعاليات والبرامج التدريبية المجانية.',
              'Join as an active member or volunteer across our 9 specialized committees, and follow our official channels.'
            )}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/join')}
              className="px-6 py-3 text-sm font-semibold text-white rounded-xl transition-colors"
              style={{ backgroundColor: 'var(--sdg-primary, #1d4ed8)' }}
            >
              {t('تقديم طلب العضوية والتطوع', 'Apply for Membership')}
            </button>
            <a
              href={settings.facebook_url || 'https://www.facebook.com/generation.digital.safe'}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-3 text-sm font-medium text-slate-200 border border-slate-700 hover:border-cyan-400 rounded-xl inline-flex items-center gap-1.5"
            >
              <span>Facebook</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href={settings.instagram_url || 'https://www.instagram.com/generation.digital.safe/'}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-3 text-sm font-medium text-slate-200 border border-slate-700 hover:border-cyan-400 rounded-xl inline-flex items-center gap-1.5"
            >
              <span>Instagram</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href={settings.tiktok_url || 'https://www.tiktok.com/@generation.digital.safe'}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-3 text-sm font-medium text-slate-200 border border-slate-700 hover:border-cyan-400 rounded-xl inline-flex items-center gap-1.5"
            >
              <span>TikTok</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightboxItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4" onClick={() => setLightboxItem(null)}>
          <div className="max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 text-white">
              <span className="text-sm font-semibold">{t(lightboxItem.title_ar, lightboxItem.title_en)}</span>
              <button type="button" onClick={() => setLightboxItem(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-hidden flex items-center justify-center bg-black">
              <SafeImage src={lightboxItem.url} alt={lightboxItem.title_ar} className="max-h-[75vh] w-auto object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
