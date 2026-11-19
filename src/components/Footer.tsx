import React from 'react';
import { Mail, Phone, ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SafeImage } from './SafeImage';

export const Footer: React.FC = () => {
  const { t, navigate, settings } = useApp();

  const logoUrl = settings.logo_url || '/assets/aistudio/FB_IMG_1789831319399_ac126220.jpg';
  const umbrellaLogo = settings.umbrella_logo_url || '/assets/aistudio/FB_IMG_1790438684231_64912c2d.jpg';
  const ministryLogo = settings.ministry_logo_url || '/assets/aistudio/FB_IMG_1792797530698_77e851bd.jpg';
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
                <SafeImage src={umbrellaLogo} alt="اتحاد حكاية وطن" className="w-10 h-10 rounded-xl object-contain bg-white p-1 border border-slate-700" />
                <SafeImage src={ministryLogo} alt="وزارة التضامن الاجتماعي" className="w-10 h-10 rounded-xl object-contain bg-white p-1 border border-slate-700" />
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
            <div className="flex items-center gap-3 pt-2">
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
