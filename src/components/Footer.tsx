import React from 'react';
import { Mail, Phone, ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SafeImage } from './SafeImage';

import { normalizeExternalUrl } from '../lib/url';

export const Footer: React.FC = () => {
  const { t, navigate, settings } = useApp();

  const logoUrl = settings.logo_url || '/assets/aistudio/FB_IMG_1789831319399_ac126220.jpg';
  const umbrellaLogo = settings.umbrella_logo_url || '/assets/aistudio/FB_IMG_1790438684231_64912c2d.jpg';
  const ministryLogo = settings.ministry_logo_url || '/assets/aistudio/FB_IMG_1792797530698_77e851bd.jpg';
  const ministryWebsite = normalizeExternalUrl(settings.ministry_website_url) || 'https://www.moss.gov.eg';
  const umbrellaWebsite = normalizeExternalUrl(settings.umbrella_website_url);
  const email = settings.email || 'generationdigitalsafe@gmail.com';
  const phone = settings.phone || '01277714301';
  const fb = settings.facebook_url || 'https://www.facebook.com/generation.digital.safe';
  const ig = settings.instagram_url || 'https://www.instagram.com/generation.digital.safe/';
  const tt = settings.tiktok_url || 'https://www.tiktok.com/@generation.digital.safe';

  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Brand & Official Umbrella */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 shrink-0">
                <SafeImage src={logoUrl} alt="جيل رقمي آمن" className="w-12 h-12 rounded-xl object-contain bg-white p-1 border border-slate-700" />
                {umbrellaWebsite ? (
                  <a href={umbrellaWebsite} target="_blank" rel="noopener noreferrer" title="الموقع الرسمي لاتحاد حكاية وطن" className="hover:opacity-90 transition-opacity">
                    <SafeImage src={umbrellaLogo} alt="اتحاد حكاية وطن" className="w-10 h-10 rounded-xl object-contain bg-white p-1 border border-slate-700 hover:border-cyan-400" />
                  </a>
                ) : (
                  <SafeImage src={umbrellaLogo} alt="اتحاد حكاية وطن" className="w-10 h-10 rounded-xl object-contain bg-white p-1 border border-slate-700" />
                )}
                <a
                  href={ministryWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={t('الموقع الرسمي لوزارة التضامن الاجتماعي', 'Ministry of Social Solidarity Official Website')}
                  className="hover:opacity-90 transition-opacity"
                >
                  <SafeImage src={ministryLogo} alt="وزارة التضامن الاجتماعي" className="w-10 h-10 rounded-xl object-contain bg-white p-1 border border-slate-700 hover:border-cyan-400" />
                </a>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-display">
                  {t(settings.site_name_ar || 'جيل رقمي آمن', settings.site_name_en || 'SAFE DIGITAL GENERATION')}
                </h3>
                <p className="text-xs text-cyan-400">{t(settings.site_slogan_ar || 'معًا لمستقبل رقمي آمن', settings.site_slogan_en || 'Together for a Safe Digital Future')}</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              {t(
                settings.umbrella_text_ar ||
                  'تحت مظلة الاتحاد النوعي للجمعيات العاملة في مجال التنمية المجتمعية (حكاية وطن) — المشهر برقم 1279 لسنة 2025 بوزارة التضامن الاجتماعي.',
                settings.umbrella_text_en ||
                  'Under the umbrella of the Specific Union of Associations Working in Community Development (Hikayat Watan) — Reg. No. 1279 of 2025 at the Ministry of Social Solidarity.'
              )}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={ministryWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-300 border border-cyan-500/40 bg-cyan-950/30 hover:border-cyan-300 hover:text-white rounded-lg transition-colors"
              >
                <span>{t('موقع وزارة التضامن الاجتماعي', 'Ministry of Social Solidarity')}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <a
                href={fb}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs font-medium text-slate-200 border border-slate-700 hover:border-cyan-400 hover:text-white rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                <span>Facebook</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={ig}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs font-medium text-slate-200 border border-slate-700 hover:border-cyan-400 hover:text-white rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                <span>Instagram</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={tt}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs font-medium text-slate-200 border border-slate-700 hover:border-cyan-400 hover:text-white rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                <span>TikTok</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-sm font-semibold text-white">{t('روابط المبادرة', 'Initiative Links')}</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              {[
                ['/about', t('من نحن والرؤية', 'About & Vision')],
                ['/goals', t('أهداف المبادرة', 'Initiative Goals')],
                ['/committees', t('اللجان التخصصية', 'Committees')],
                ['/news-and-events', t('الأخبار والأنشطة والفعاليات', 'News & Events')],
                ['/trainings', t('البرامج التدريبية', 'Training Programs')],
                ['/projects', t('المبادرات والمشروعات', 'Projects')]
              ].map(([path, label]) => (
                <li key={path}>
                  <button type="button" onClick={() => navigate(path)} className="hover:text-cyan-300 transition-colors">
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Services & Contact */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-sm font-semibold text-white">{t('الخدمات والتواصل الرسمي', 'Services & Contact')}</h4>
            <ul className="space-y-2 text-sm text-slate-400 mb-4">
              <li>
                <button type="button" onClick={() => navigate('/join')} className="hover:text-cyan-300 transition-colors">
                  {t('نموذج الانضمام والتطوع', 'Membership & Volunteering')}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/verify')} className="hover:text-cyan-300 transition-colors">
                  {t('التحقق من الكارنيه والشهادات', 'Verify Card & Certificate')}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/library')} className="hover:text-cyan-300 transition-colors">
                  {t('المكتبة الرقمية والأدلة', 'Digital Library')}
                </button>
              </li>
            </ul>
            <div className="pt-2 border-t border-slate-800 space-y-2 text-sm">
              <a href={`mailto:${email}`} className="flex items-center gap-2 text-slate-300 hover:text-cyan-300 transition-colors">
                <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="font-mono-num">{email}</span>
              </a>
              <a href={`tel:${phone}`} className="flex items-center gap-2 text-slate-300 hover:text-cyan-300 transition-colors">
                <Phone className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="font-mono-num" dir="ltr">{phone}</span>
              </a>
              <a
                href={`https://wa.me/${phone.replace(/\D/g, '').replace(/^0/, '20')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 fill-current" aria-hidden="true">
                  <path d="M12.03 2C6.5 2 2 6.46 2 11.96c0 1.77.47 3.5 1.36 5.02L2 22l5.17-1.35a10.04 10.04 0 0 0 4.86 1.24h.01c5.52 0 10.02-4.46 10.02-9.96A9.93 9.93 0 0 0 12.03 2Zm5.83 14.12c-.25.7-1.44 1.33-1.99 1.41-.51.08-1.15.11-1.86-.11-.43-.14-.98-.32-1.69-.63-2.97-1.28-4.91-4.27-5.06-4.47-.15-.2-1.21-1.61-1.21-3.07 0-1.46.76-2.18 1.03-2.48.27-.3.59-.37.79-.37.2 0 .39 0 .56.01.18.01.42-.07.66.5.25.6.85 2.07.92 2.22.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.18-.31.4-.45.54-.15.15-.3.31-.13.61.17.3.77 1.27 1.65 2.05 1.13 1.01 2.09 1.32 2.39 1.47.3.15.47.12.64-.07.17-.2.74-.86.94-1.16.2-.3.4-.25.67-.15.27.1 1.74.82 2.04.97.3.15.5.22.57.35.08.13.08.74-.17 1.44Z" />
                </svg>
                <span>{t('واتساب مباشر:', 'WhatsApp:')}</span>
                <span className="font-mono-num" dir="ltr">{phone}</span>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            © {new Date().getFullYear()} {t('مبادرة جيل رقمي آمن — SAFE DIGITAL GENERATION. جميع الحقوق محفوظة.', 'Safe Digital Generation Initiative. All rights reserved.')}
          </p>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => navigate('/contact')} className="hover:text-slate-300">
              {t('تواصل معنا', 'Contact')}
            </button>
            <button type="button" onClick={() => navigate('/login')} className="hover:text-slate-300">
              {t('بوابة الإدارة والأعضاء', 'Admin & Member Portal')}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
