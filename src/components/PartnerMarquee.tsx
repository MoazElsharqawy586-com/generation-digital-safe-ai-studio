import React from 'react';
import { ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SafeImage } from './SafeImage';
import { normalizeExternalUrl } from '../lib/url';

export const PartnerMarquee: React.FC = () => {
  const { marqueePartners, settings, t, navigate } = useApp();

  const enabled = settings.marquee_enabled !== 'false';
  if (!enabled || marqueePartners.length === 0) return null;

  const speed = Number(settings.marquee_speed || 22);
  const direction = settings.marquee_direction === 'ltr' ? 'ltr' : 'rtl';
  const colorMode = settings.marquee_color_mode === 'white' ? 'white' : 'color';

  // Repeat logos generously so both halves exceed any viewport width and glide continuously back-to-back
  const minCopies = Math.max(6, Math.ceil(18 / marqueePartners.length));
  const halfSet = Array.from({ length: minCopies }, () => marqueePartners).flat();

  const renderGroup = (groupKey: string) => (
    <div key={groupKey} aria-hidden={groupKey === 'b' ? true : undefined} className="flex shrink-0 items-center gap-3 pr-3">
      {halfSet.map((partner, idx) => {
        const externalUrl = normalizeExternalUrl(partner.website_url);
        const content = (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-slate-200/90 bg-slate-50/80 hover:bg-white hover:border-blue-300 transition-colors shrink-0">
            <div
              className={`w-11 h-11 rounded-lg overflow-hidden flex items-center justify-center shrink-0 ${
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
            <div className="text-start max-w-[190px]">
              <p className="text-xs font-semibold text-slate-900 truncate flex items-center gap-1">
                <span className="truncate">{t(partner.name_ar, partner.name_en)}</span>
                {externalUrl && <ExternalLink className="w-3 h-3 text-blue-600 shrink-0" />}
              </p>
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

        if (externalUrl) {
          return (
            <a
              key={`${groupKey}-${partner.id}-${idx}`}
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={t(`زيارة موقع ${partner.name_ar}`, `Visit ${partner.name_en || partner.name_ar}`)}
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
      className="border-y border-slate-200 bg-white py-5 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-3.5 flex items-center justify-between gap-4">
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
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent z-10" />

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
