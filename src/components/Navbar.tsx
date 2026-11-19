import React, { useState } from 'react';
import { ChevronDown, Globe, LogIn, Menu, Shield, UserCheck, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SafeImage } from './SafeImage';

export const Navbar: React.FC = () => {
  const { lang, setLang, t, currentPath, navigate, settings, user } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const brandName = t(settings.site_name_ar || 'جيل رقمي آمن', settings.site_name_en || 'SAFE DIGITAL GENERATION');
  const logoUrl = settings.logo_url || '/assets/aistudio/FB_IMG_1789831319399_ac126220.jpg';

  const navGroups = [
    {
      id: 'about',
      label: t('عن المبادرة', 'Initiative'),
      items: [
        { label: t('من نحن', 'About Us'), path: '/about' },
        { label: t('أهداف المبادرة', 'Our Goals'), path: '/goals' },
        { label: t('قيادات المبادرة', 'Leadership'), path: '/leadership' },
        { label: t('اللجان المتخصصة', 'Committees'), path: '/committees' }
      ]
    },
    {
      id: 'programs',
      label: t('البرامج والتدريب', 'Programs'),
      items: [
        { label: t('الأنشطة والفعاليات', 'Events & Activities'), path: '/events' },
        { label: t('البرامج التدريبية', 'Training Tracks'), path: '/trainings' },
        { label: t('المبادرات والمشروعات', 'Projects'), path: '/projects' }
      ]
    },
    {
      id: 'media',
      label: t('المركز الإعلامي', 'Media'),
      items: [
        { label: t('الأخبار والأنشطة والفعاليات', 'News & Events'), path: '/news-and-events' },
        { label: t('الأخبار والبيانات', 'News'), path: '/news' },
        { label: t('معرض الصور والفيديو', 'Gallery'), path: '/gallery' },
        { label: t('المكتبة الرقمية', 'Digital Library'), path: '/library' },
        { label: t('شركاء المبادرة', 'Partners'), path: '/partners' }
      ]
    }
  ];

  const handleLink = (path: string) => {
    setOpenMenu(null);
    setMobileOpen(false);
    navigate(path);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Single-line Brand */}
        <button
          type="button"
          onClick={() => handleLink('/')}
          className="flex items-center gap-2.5 text-slate-900 font-display font-bold text-base sm:text-lg tracking-tight whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg"
        >
          <SafeImage src={logoUrl} alt={brandName} className="w-9 h-9 rounded-lg object-contain border border-slate-200 bg-white p-0.5 shrink-0" />
          <span>{brandName}</span>
        </button>

        {/* Zone 2: Clean Navigation */}
        <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-slate-700" aria-label={t('القائمة الرئيسية', 'Main Navigation')}>
          <button
            type="button"
            onClick={() => handleLink('/')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
              currentPath === '/' ? 'border-blue-700 text-blue-800 font-semibold' : 'border-transparent hover:text-slate-950'
            }`}
          >
            {t('الرئيسية', 'Home')}
          </button>

          {navGroups.map((grp) => (
            <div
              key={grp.id}
              className="relative"
              onMouseEnter={() => setOpenMenu(grp.id)}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <button
                type="button"
                onClick={() => setOpenMenu((m) => (m === grp.id ? null : grp.id))}
                className="inline-flex items-center gap-1 whitespace-nowrap shrink-0 py-1 text-slate-700 hover:text-slate-950 transition-colors"
              >
                <span>{grp.label}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>
              {openMenu === grp.id && (
                <div className="absolute top-full start-0 pt-2 w-60 z-50">
                  <div className="bg-white border border-slate-200 rounded-xl shadow-lg py-1.5">
                    {grp.items.map((item) => (
                      <button
                        key={item.path}
                        type="button"
                        onClick={() => handleLink(item.path)}
                        className={`w-full text-start px-4 py-2 text-sm transition-colors ${
                          currentPath === item.path ? 'bg-blue-50 text-blue-800 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={() => handleLink('/news-and-events')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
              currentPath === '/news-and-events' ? 'border-blue-700 text-blue-800 font-semibold' : 'border-transparent hover:text-slate-950'
            }`}
          >
            {t('الأخبار والفعاليات', 'News & Events')}
          </button>

          <button
            type="button"
            onClick={() => handleLink('/verify')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
              currentPath === '/verify' ? 'border-blue-700 text-blue-800 font-semibold' : 'border-transparent hover:text-slate-950'
            }`}
          >
            {t('التحقق', 'Verify')}
          </button>

          <button
            type="button"
            onClick={() => handleLink('/contact')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
              currentPath === '/contact' ? 'border-blue-700 text-blue-800 font-semibold' : 'border-transparent hover:text-slate-950'
            }`}
          >
            {t('تواصل معنا', 'Contact')}
          </button>
        </nav>

        {/* Zone 3: Actions (Login Icon always visible on mobile & desktop) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            title={t('تغيير اللغة', 'Switch language')}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'EN' : 'AR'}</span>
          </button>

          {user ? (
            <button
              type="button"
              onClick={() => handleLink(user.adminRole ? '/admin' : '/member')}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
              title={user.adminRole ? t('لوحة الإدارة', 'Admin') : t('بوابة العضو', 'Portal')}
            >
              {user.adminRole ? <Shield className="w-4 h-4 text-blue-700" /> : <UserCheck className="w-4 h-4 text-blue-700" />}
              <span className="hidden sm:inline">{user.adminRole ? t('لوحة الإدارة', 'Admin') : t('بوابة العضو', 'Portal')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleLink('/login')}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-200 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50/60 rounded-lg transition-colors whitespace-nowrap shrink-0"
              title={t('تسجيل الدخول', 'Login')}
              aria-label={t('تسجيل الدخول', 'Login')}
            >
              <LogIn className="w-4 h-4 text-blue-700" />
              <span className="hidden sm:inline">{t('تسجيل الدخول', 'Login')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleLink('/join')}
            className="hidden sm:inline-flex items-center px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
            style={{ backgroundColor: 'var(--sdg-primary, #1d4ed8)' }}
          >
            {t('انضم للمبادرة', 'Join Initiative')}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="lg:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg"
            aria-label={t('القائمة', 'Menu')}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleLink('/join')}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-lg text-center"
              style={{ backgroundColor: 'var(--sdg-primary, #1d4ed8)' }}
            >
              {t('انضم إلى المبادرة', 'Join Initiative')}
            </button>
            <button
              type="button"
              onClick={() => handleLink(user ? (user.adminRole ? '/admin' : '/member') : '/login')}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-800 border border-slate-200 rounded-lg"
            >
              <LogIn className="w-4 h-4 text-blue-700" />
              <span>{user ? (user.adminRole ? t('لوحة الإدارة', 'Admin') : t('بوابة العضو', 'Member Portal')) : t('تسجيل الدخول', 'Login')}</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              ['/', t('الرئيسية', 'Home')],
              ['/news-and-events', t('الأخبار والفعاليات', 'News & Events')],
              ['/about', t('من نحن', 'About Us')],
              ['/goals', t('الأهداف', 'Goals')],
              ['/leadership', t('القيادات', 'Leadership')],
              ['/committees', t('اللجان', 'Committees')],
              ['/events', t('الفعاليات', 'Events')],
              ['/trainings', t('التدريب', 'Trainings')],
              ['/news', t('الأخبار', 'News')],
              ['/projects', t('المشروعات', 'Projects')],
              ['/gallery', t('المعرض', 'Gallery')],
              ['/library', t('المكتبة الرقمية', 'Library')],
              ['/partners', t('الشركاء', 'Partners')],
              ['/verify', t('التحقق QR', 'Verify QR')],
              ['/contact', t('تواصل معنا', 'Contact')]
            ].map(([p, label]) => (
              <button
                key={p}
                type="button"
                onClick={() => handleLink(p)}
                className={`text-start px-3 py-2 rounded-lg border ${
                  currentPath === p ? 'border-blue-600 bg-blue-50 text-blue-800 font-semibold' : 'border-slate-100 text-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};
