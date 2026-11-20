import React, { useState } from 'react';
import { MapPin, MessageCircle, Share2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { normalizeExternalUrl } from '../lib/url';

export const FloatingSocialStack: React.FC = () => {
  const { settings, t } = useApp();
  const [open, setOpen] = useState(false);

  const whatsappPhone = (settings.phone || '01277714301').trim();
  const whatsappUrl = `https://wa.me/${whatsappPhone.replace(/\D/g, '').replace(/^0/, '20')}`;

  const locationUrl = normalizeExternalUrl(settings.location_url ?? 'https://maps.app.goo.gl/7YnZ5SLon7hEydpo8');
  const fbUrl = normalizeExternalUrl(settings.facebook_url ?? 'https://www.facebook.com/generation.digital.safe');
  const igUrl = normalizeExternalUrl(settings.instagram_url ?? 'https://www.instagram.com/generation.digital.safe/');
  const ttUrl = normalizeExternalUrl(settings.tiktok_url ?? 'https://www.tiktok.com/@generation.digital.safe');
  const ytUrl = normalizeExternalUrl(settings.youtube_url || '');
  const tgUrl = normalizeExternalUrl(settings.telegram_url || '');
  const xUrl = normalizeExternalUrl(settings.x_url || '');
  const liUrl = normalizeExternalUrl(settings.linkedin_url || '');

  const socialItems: {
    key: string;
    url: string;
    label: string;
    className: string;
    icon: React.ReactNode;
  }[] = [
    ...(locationUrl
      ? [
          {
            key: 'location',
            url: locationUrl,
            label: t('الموقع على خرائط جوجل', 'Location on Google Maps'),
            className: 'bg-rose-600 hover:bg-rose-700 border-rose-300/60',
            icon: <MapPin className="w-5 h-5" />
          }
        ]
      : []),
    ...(ytUrl
      ? [
          {
            key: 'youtube',
            url: ytUrl,
            label: 'YouTube',
            className: 'bg-red-600 hover:bg-red-700 border-red-400/50',
            icon: (
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z" />
              </svg>
            )
          }
        ]
      : []),
    ...(tgUrl
      ? [
          {
            key: 'telegram',
            url: tgUrl,
            label: 'Telegram',
            className: 'bg-sky-500 hover:bg-sky-600 border-sky-300/60',
            icon: (
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0Zm5.8 8.2-1.97 9.28c-.14.66-.53.82-1.08.51l-2.98-2.2-1.44 1.38c-.16.16-.3.3-.6.3l.21-3.03 5.52-4.99c.24-.21-.05-.33-.37-.12l-6.82 4.3-2.94-.92c-.64-.2-.65-.64.13-.95l11.5-4.43c.53-.19 1 .13.85.87Z" />
              </svg>
            )
          }
        ]
      : []),
    ...(xUrl
      ? [
          {
            key: 'x',
            url: xUrl,
            label: 'X',
            className: 'bg-slate-900 hover:bg-black border-slate-600/60',
            icon: (
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117Z" />
              </svg>
            )
          }
        ]
      : []),
    ...(liUrl
      ? [
          {
            key: 'linkedin',
            url: liUrl,
            label: 'LinkedIn',
            className: 'bg-[#0A66C2] hover:bg-[#0855A1] border-blue-300/50',
            icon: (
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77Z" />
              </svg>
            )
          }
        ]
      : []),
    ...(ttUrl
      ? [
          {
            key: 'tiktok',
            url: ttUrl,
            label: 'TikTok',
            className: 'bg-slate-950 hover:bg-black border-cyan-400/50',
            icon: (
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.73a8.19 8.19 0 0 0 4.76 1.52V6.8a4.84 4.84 0 0 1-1-.11Z" />
              </svg>
            )
          }
        ]
      : []),
    ...(igUrl
      ? [
          {
            key: 'instagram',
            url: igUrl,
            label: 'Instagram',
            className: 'bg-gradient-to-tr from-amber-500 via-rose-500 to-fuchsia-600 hover:brightness-110 border-rose-300/50',
            icon: (
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3Z" />
              </svg>
            )
          }
        ]
      : []),
    ...(fbUrl
      ? [
          {
            key: 'facebook',
            url: fbUrl,
            label: 'Facebook',
            className: 'bg-[#1877F2] hover:bg-[#166FE5] border-blue-300/50',
            icon: (
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02Z" />
              </svg>
            )
          }
        ]
      : [])
  ];

  return (
    <div className={`no-print fixed bottom-5 left-5 z-40 flex flex-col items-start ${open ? 'gap-2.5' : 'gap-0'}`} aria-label={t('روابط التواصل الاجتماعي', 'Social Media Links')}>
      {/* Collapsible vertical stack */}
      <div
        aria-hidden={!open}
        className={`flex flex-col items-start gap-2.5 transition-all duration-200 origin-bottom-left ${
          open ? 'opacity-100 translate-y-0 scale-100 max-h-[520px] pointer-events-auto' : 'opacity-0 translate-y-3 scale-95 max-h-0 pointer-events-none overflow-hidden'
        }`}
      >
        {socialItems.map((item) => (
          <a
            key={item.key}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={open ? 0 : -1}
            title={item.label}
            aria-label={item.label}
            className={`w-11 h-11 rounded-full flex items-center justify-center text-white shadow-lg border transition-transform hover:scale-110 ${item.className}`}
          >
            {item.icon}
          </a>
        ))}

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={open ? 0 : -1}
          title={`${t('تواصل واتساب:', 'WhatsApp:')} ${whatsappPhone}`}
          aria-label={`${t('تواصل عبر واتساب', 'Contact via WhatsApp')} ${whatsappPhone}`}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 shadow-lg border border-emerald-400/50 transition-transform hover:scale-105"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 fill-current" aria-hidden="true">
            <path d="M12.03 2C6.5 2 2 6.46 2 11.96c0 1.77.47 3.5 1.36 5.02L2 22l5.17-1.35a10.04 10.04 0 0 0 4.86 1.24h.01c5.52 0 10.02-4.46 10.02-9.96A9.93 9.93 0 0 0 12.03 2Zm5.83 14.12c-.25.7-1.44 1.33-1.99 1.41-.51.08-1.15.11-1.86-.11-.43-.14-.98-.32-1.69-.63-2.97-1.28-4.91-4.27-5.06-4.47-.15-.2-1.21-1.61-1.21-3.07 0-1.46.76-2.18 1.03-2.48.27-.3.59-.37.79-.37.2 0 .39 0 .56.01.18.01.42-.07.66.5.25.6.85 2.07.92 2.22.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.18-.31.4-.45.54-.15.15-.3.31-.13.61.17.3.77 1.27 1.65 2.05 1.13 1.01 2.09 1.32 2.39 1.47.3.15.47.12.64-.07.17-.2.74-.86.94-1.16.2-.3.4-.25.67-.15.27.1 1.74.82 2.04.97.3.15.5.22.57.35.08.13.08.74-.17 1.44Z" />
          </svg>
          <span className="hidden sm:inline text-xs font-bold font-mono-num" dir="ltr">
            {whatsappPhone}
          </span>
        </a>
      </div>

      {/* Main Toggle Button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? t('إغلاق قائمة التواصل', 'Close contact links') : t('فتح روابط التواصل والموقع', 'Open social & location links')}
        title={open ? t('إغلاق', 'Close') : t('التواصل والموقع', 'Social & Location')}
        className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2.5 shadow-xl border font-bold text-xs text-white transition-all hover:scale-105 ${
          open
            ? 'bg-slate-900 hover:bg-slate-800 border-slate-600'
            : 'bg-blue-700 hover:bg-blue-800 border-cyan-400/60'
        }`}
      >
        {open ? <X className="w-5 h-5 shrink-0" /> : <Share2 className="w-4 h-4 shrink-0" />}
        <span className="inline-flex items-center gap-1">
          {!open && <MessageCircle className="w-3.5 h-3.5 text-emerald-300 shrink-0" />}
          <span>{open ? t('إغلاق', 'Close') : t('تواصل معنا', 'Contact')}</span>
        </span>
      </button>
    </div>
  );
};
