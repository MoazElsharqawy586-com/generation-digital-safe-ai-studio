import React from 'react';
import { Award, Compass, Eye, ShieldCheck, Target } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SafeImage } from '../components/SafeImage';

export const AboutPage: React.FC = () => {
  const { settings, t, navigate, marqueePartners } = useApp();

  let values: { title_ar: string; title_en: string; desc_ar: string }[] = [];
  let goals: { title_ar: string; title_en: string }[] = [];
  try {
    values = JSON.parse(settings.values_json || '[]');
  } catch {
    values = [];
  }
  try {
    goals = JSON.parse(settings.goals_json || '[]');
  } catch {
    goals = [];
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header Banner */}
      <section className="bg-slate-950 text-white py-14" style={{ backgroundColor: 'var(--sdg-navy, #0a192f)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <p className="text-xs font-semibold text-cyan-400">{t('الهوية المؤسسية والرسالة', 'Institutional Identity & Mission')}</p>
          <h1 className="text-3xl sm:text-4xl font-bold font-display">{t('من نحن — مبادرة جيل رقمي آمن', 'About Us — Safe Digital Generation')}</h1>
          <p className="text-slate-300 max-w-3xl leading-relaxed">
            {t(settings.about_summary_ar || '', settings.about_summary_en || '')}
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* Official Umbrella & Founding History */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center gap-2 text-blue-700 text-sm font-semibold">
              <Award className="w-4 h-4" />
              <span>{t('المظلة الرسمية وتاريخ التأسيس', 'Official Umbrella & Founding')}</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-950 font-display">
              {t('تحت مظلة الاتحاد النوعي للجمعيات العاملة في مجال التنمية المجتمعية (حكاية وطن)', 'Under Hikayat Watan Community Development Union')}
            </h2>
            <p className="text-slate-700 leading-relaxed">
              {t(
                settings.umbrella_text_ar || 'المشهر برقم 1279 لسنة 2025 بوزارة التضامن الاجتماعي.',
                settings.umbrella_text_en || 'Registered under No. 1279 of 2025 at the Ministry of Social Solidarity.'
              )}
            </p>
            <div className="flex flex-wrap gap-6 pt-2 text-sm text-slate-600">
              <div>
                <span className="text-slate-400">{t('سنة التأسيس:', 'Founded:')}</span>{' '}
                <strong className="font-mono-num text-slate-900">{settings.founded_year || '2025'}</strong>
              </div>
              <div>
                <span className="text-slate-400">{t('رقم الإشهار الرسمي:', 'Official Reg. No:')}</span>{' '}
                <strong className="font-mono-num text-slate-900">1279 / 2025</strong>
              </div>
            </div>
          </div>
          <div className="lg:col-span-4 flex items-center justify-center gap-4">
            <SafeImage src={settings.logo_url || '/assets/aistudio/FB_IMG_1789831319399_ac126220.jpg'} alt="جيل رقمي آمن" className="w-24 h-24 object-contain border border-slate-200 rounded-xl p-1.5 bg-white" />
            <SafeImage src={settings.umbrella_logo_url || '/assets/aistudio/FB_IMG_1790438684231_64912c2d.jpg'} alt="حكاية وطن" className="w-24 h-24 object-contain border border-slate-200 rounded-xl p-1.5 bg-white" />
            <SafeImage src={settings.ministry_logo_url || '/assets/aistudio/FB_IMG_1792797530698_77e851bd.jpg'} alt="وزارة التضامن الاجتماعي" className="w-24 h-24 object-contain border border-slate-200 rounded-xl p-1.5 bg-white" />
          </div>
        </div>

        {/* Vision & Mission */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-950 font-display">{t('الرؤية', 'Our Vision')}</h2>
            <p className="text-slate-700 leading-relaxed">{t(settings.vision_ar || '', settings.vision_en || '')}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-950 font-display">{t('الرسالة', 'Our Mission')}</h2>
            <p className="text-slate-700 leading-relaxed">{t(settings.mission_ar || '', settings.mission_en || '')}</p>
          </div>
        </div>

        {/* Core Values */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-950 font-display">{t('قيمنا المؤسسية', 'Our Core Values')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {values.map((v, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
                <span className="font-mono-num text-xs font-bold text-blue-700">0{idx + 1}.</span>
                <h3 className="font-bold text-slate-900 font-display">{t(v.title_ar, v.title_en)}</h3>
                <p className="text-sm text-slate-600">{v.desc_ar}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Goals summary */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-slate-950 font-display">{t('الأهداف الاستراتيجية', 'Strategic Goals')}</h2>
            <button type="button" onClick={() => navigate('/goals')} className="text-sm font-semibold text-blue-700 hover:underline">
              {t('عرض التفاصيل', 'View details')}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map((g, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-slate-800">
                <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <span>{t(g.title_ar, g.title_en)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Supporting Entities */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-950 font-display">{t('الجهات الداعمة والشريكة', 'Supporting & Partner Entities')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {marqueePartners.map((p) => (
              <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4">
                <SafeImage src={p.logo_url} alt={p.name_ar} className="w-16 h-16 object-contain rounded-lg border border-slate-100 p-1 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{t(p.name_ar, p.name_en)}</h3>
                  <button type="button" onClick={() => navigate('/partners')} className="text-xs text-blue-700 hover:underline mt-1">
                    {t('صفحة الشركاء', 'Partners page')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const GoalsPage: React.FC = () => {
  const { settings, t, navigate } = useApp();
  let goals: { title_ar: string; title_en: string }[] = [];
  try {
    goals = JSON.parse(settings.goals_json || '[]');
  } catch {
    goals = [];
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <section className="bg-slate-950 text-white py-14" style={{ backgroundColor: 'var(--sdg-navy, #0a192f)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <div className="inline-flex items-center gap-2 text-cyan-400 text-xs font-semibold">
            <Target className="w-4 h-4" />
            <span>{t('رسالة وأهداف المبادرة', 'Initiative Mission & Goals')}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-display">{t('أهداف مبادرة جيل رقمي آمن', 'Goals of Safe Digital Generation')}</h1>
          <p className="text-slate-300 max-w-2xl">
            {t('اثنا عشر هدفًا استراتيجيًا لبناء جيل شبابي واعٍ بالأمن السيبراني ومؤهل للمستقبل الرقمي.', 'Twelve strategic goals building a cyber-aware and tech-empowered generation.')}
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal, idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 hover:border-blue-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-mono-num text-sm font-bold text-blue-700">{String(idx + 1).padStart(2, '0')}</span>
                <ShieldCheck className="w-5 h-5 text-cyan-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-950 font-display">{t(goal.title_ar, goal.title_en)}</h2>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-white border border-slate-200 rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-950 font-display">{t('هل تشاركنا نفس الرؤية؟', 'Share our vision?')}</h3>
            <p className="text-sm text-slate-600">{t('انضم إلى فرق العمل التطوعية في المبادرة وساهم في تحقيق هذه الأهداف.', 'Join our volunteer teams and help achieve these goals.')}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/join')}
            className="px-6 py-3 text-sm font-semibold text-white rounded-xl shrink-0"
            style={{ backgroundColor: 'var(--sdg-primary, #1d4ed8)' }}
          >
            {t('انضم إلى المبادرة', 'Join Initiative')}
          </button>
        </div>
      </div>
    </div>
  );
};
