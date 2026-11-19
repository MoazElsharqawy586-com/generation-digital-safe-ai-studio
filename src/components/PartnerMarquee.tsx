import React from 'react';
import { useApp } from '../context/AppContext';
import { SafeImage } from './SafeImage';

export const PartnerMarquee: React.FC = () => {
  const { marqueePartners, settings, t, navigate } = useApp();

  const enabled = settings.marquee_enabled !== 'false';
  if (!enabled || marqueePartners.length === 0) return null;

  const speed = Number(settings.marquee_speed || 28);
  const direction = settings.marquee_direction === 'ltr' ? 'ltr' : 'rtl';
  const colorMode = settings.marquee_color_mode === 'white' ? 'white' : 'color';

  // Repeat logos enough times so each half seamlessly spans ultra-wide screens with zero gaps
  const minCopies = Math.max(4, Math.ceil(14 / marqueePartners.length));
  const halfSet = Array.from({ length: minCopies }, () => marqueePartners).flat();

  const renderGroup = (groupKey: string) => (
    <div key={groupKey} className="flex shrink-0 items-center">
      {halfSet.map((partner, idx) => {
        const content = (
          <div className="flex items-center gap-3 px-6 py-2.5 mx-2 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-white hover:border-blue-300 transition-colors shrink-0">
            <div
              className={`w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center shrink-0 ${
                colorMode === 'white' ? 'bg-slate-900 p-1.5' : 'bg-white border border-slate-100 p-1'
              }`}
            >
              <SafeImage
                src={partner.logo_url}
                alt={t(partner.name_ar, partner.name_en)}
                fallbackTitle={partner.name_ar}
                className={`w-full h-full object-contain ${colorMode === 'white' ? 'brightness-0 invert' : ''}`}
              />
            </div>
            <div className="text-start max-w-[200px]">
              <p className="text-xs font-semibold text-slate-900 truncate">{t(partner.name_ar, partner.name_en)}</p>
              <p className="text-[11px] text-slate-500 truncate">
                {partner.partner_type === 'umbrella'
                  ? t('المظلة الرسمية', 'Official Umbrella')
                  : partner.partner_type === 'government'
                    ? t('جهة إشراف رسمية', 'Government Oversight')
                    : t('شريك وداعم', 'Official Partner')}
              </p>
            </div>
          </div>
        );

        if (partner.website_url && partner.website_url !== '/') {
          return (
            <a
              key={`${groupKey}-${partner.id}-${idx}`}
              href={partner.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-xl shrink-0"
            >
              {content}
            </a>
          );
        }
        return (
          <div key={`${groupKey}-${partner.id}-${idx}`} onClick={() => navigate('/partners')} className="cursor-pointer shrink-0">
            {content}
          </div>
        );
      })}
    </div>
  );

  return (
    <section
      aria-label={t('الجهات والشركاء والداعمون', 'Partners & Supporting Entities')}
      className="border-y border-slate-200 bg-white py-6 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-slate-700">
            {t('المظلة الرسمية والشركاء والداعمون', 'Official Umbrella, Partners & Supporters')}
          </h2>
          <span className="text-xs text-slate-400">·</span>
          <button
            type="button"
            onClick={() => navigate('/partners')}
            className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap shrink-0"
          >
            {t('عرض جميع الجهات', 'View all partners')}
          </button>
        </div>
      </div>

      <div className="sdg-marquee-wrapper relative w-full overflow-hidden" dir="ltr">
        {/* Subtle edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent z-10" />

        <div
          className={`sdg-marquee-track ${direction === 'ltr' ? 'dir-ltr' : 'dir-rtl'}`}
          style={{ ['--marquee-duration' as string]: `${speed}s` }}
        >
          {renderGroup('a')}
          {renderGroup('b')}
        </div>
      </div>
    </section>
  );
};
