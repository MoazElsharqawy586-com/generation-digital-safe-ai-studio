import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { BrandLogo, Committee, JoinQuestion, PartnerItem, SiteStats, UserSession } from '../types';
import { apiFetch, setStoredAuthToken } from '../lib/authFetch';

export type Lang = 'ar' | 'en';

interface AppContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (ar: string, en: string) => string;
  currentPath: string;
  navigate: (to: string) => void;
  settings: Record<string, string>;
  committees: Committee[];
  marqueePartners: PartnerItem[];
  brandLogos: BrandLogo[];
  joinQuestions: JoinQuestion[];
  stats: SiteStats;
  user: UserSession | null;
  authLoading: boolean;
  refreshBootstrap: () => Promise<void>;
  refreshUser: () => Promise<void>;
  applyAuthSession: (nextUser: UserSession | null, token?: string | null) => void;
  logout: () => Promise<void>;
  hasPermission: (perm: string) => boolean;
}

const defaultStats: SiteStats = {
  membersCount: 0,
  committeesCount: 9,
  trainingsCount: 4,
  eventsCount: 2,
  projectsCount: 2,
  partnersCount: 3,
  certificatesCount: 0
};

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem('sdg_lang') === 'en' ? 'en' : 'ar'));
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [marqueePartners, setMarqueePartners] = useState<PartnerItem[]>([]);
  const [brandLogos, setBrandLogos] = useState<BrandLogo[]>([]);
  const [joinQuestions, setJoinQuestions] = useState<JoinQuestion[]>([]);
  const [stats, setStats] = useState<SiteStats>(defaultStats);
  const [user, setUser] = useState<UserSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    localStorage.setItem('sdg_lang', next);
    document.documentElement.lang = next;
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const applyThemeColors = useCallback((s: Record<string, string>) => {
    const root = document.documentElement;
    if (s.navy_color) root.style.setProperty('--sdg-navy', s.navy_color);
    if (s.primary_color) root.style.setProperty('--sdg-primary', s.primary_color);
    if (s.cyan_color) root.style.setProperty('--sdg-cyan', s.cyan_color);
    if (s.accent_color) root.style.setProperty('--sdg-accent', s.accent_color);
  }, []);

  const refreshBootstrap = useCallback(async () => {
    try {
      const res = await fetch('/api/public/bootstrap');
      if (!res.ok) return;
      const data = await res.json();
      setSettings(data.settings || {});
      setCommittees(data.committees || []);
      setMarqueePartners(data.marqueePartners || []);
      setBrandLogos(data.brandLogos || []);
      setJoinQuestions(data.joinQuestions || []);
      setStats(data.stats || defaultStats);
      applyThemeColors(data.settings || {});
    } catch (e) {
      console.error('Bootstrap error:', e);
    }
  }, [applyThemeColors]);

  const applyAuthSession = useCallback((nextUser: UserSession | null, token?: string | null) => {
    if (token !== undefined) {
      setStoredAuthToken(token || null);
    }
    setUser(nextUser);
    setAuthLoading(false);
  }, []);

  const refreshUser = useCallback(async () => {
    setAuthLoading(true);
    try {
      const res = await apiFetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (!data.user) {
          setStoredAuthToken(null);
        }
        setUser(data.user || null);
      } else {
        setStoredAuthToken(null);
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshBootstrap();
    refreshUser();
  }, [refreshBootstrap, refreshUser]);

  useEffect(() => {
    const onPop = () => setCurrentPath(window.location.pathname || '/');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to: string) => {
    if (to.startsWith('http')) {
      window.open(to, '_blank', 'noopener,noreferrer');
      return;
    }
    const targetUrl = new URL(to, window.location.origin);
    window.history.pushState({}, '', targetUrl.pathname + targetUrl.search);
    setCurrentPath(targetUrl.pathname);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Update SEO metadata on route change
  useEffect(() => {
    const cleanPath = currentPath.replace(/\/+$/, '') || '/';
    const baseTitle = settings.seo_title || 'جيل رقمي آمن — معًا لمستقبل رقمي آمن';
    const baseDesc =
      settings.seo_description ||
      'المنصة الرسمية لمبادرة جيل رقمي آمن تحت مظلة الاتحاد النوعي حكاية وطن (1279 لسنة 2025) بوزارة التضامن الاجتماعي.';

    const routeMeta: Record<string, { titleAr: string; titleEn: string; descAr: string; descEn: string; noindex?: boolean }> = {
      '/': {
        titleAr: baseTitle,
        titleEn: 'Safe Digital Generation — Together for a Safe Digital Future',
        descAr: baseDesc,
        descEn: 'Official platform of Safe Digital Generation initiative for cybersecurity, AI, programming, and youth digital safety.'
      },
      '/about': {
        titleAr: 'من نحن | جيل رقمي آمن',
        titleEn: 'About Us | Safe Digital Generation',
        descAr: settings.about_summary_ar || 'تعرف على مبادرة جيل رقمي آمن ورؤيتها ورسالتها تحت مظلة الاتحاد النوعي حكاية وطن المشهر برقم 1279 لسنة 2025.',
        descEn: 'Learn about Safe Digital Generation initiative, its vision, mission, and institutional umbrella.'
      },
      '/goals': {
        titleAr: 'أهداف المبادرة | جيل رقمي آمن',
        titleEn: 'Initiative Goals | Safe Digital Generation',
        descAr: 'الأهداف الاستراتيجية لمبادرة جيل رقمي آمن في التوعية بالأمن الرقمي، البرمجة، الذكاء الاصطناعي، والمواطنة الرقمية.',
        descEn: 'Strategic goals of Safe Digital Generation in digital safety, coding, AI literacy, and digital citizenship.'
      },
      '/leadership': {
        titleAr: 'قيادات المبادرة والهيكل التنظيمي | جيل رقمي آمن',
        titleEn: 'Leadership | Safe Digital Generation',
        descAr: 'تعرف على القيادات التنفيذية ومجلس الإدارة ورؤساء اللجان التخصصية في مبادرة جيل رقمي آمن.',
        descEn: 'Meet the executive leadership, board members, and specialized committee heads.'
      },
      '/committees': {
        titleAr: 'اللجان المتخصصة | جيل رقمي آمن',
        titleEn: 'Committees | Safe Digital Generation',
        descAr: 'استكشف اللجان التخصصية التسع في مبادرة جيل رقمي آمن ومهامها وفرق العمل التطوعية.',
        descEn: 'Explore the 9 specialized committees of Safe Digital Generation and their missions.'
      },
      '/events': {
        titleAr: 'الأنشطة والفعاليات | جيل رقمي آمن',
        titleEn: 'Events & Activities | Safe Digital Generation',
        descAr: 'جدول الندوات وورش العمل والمؤتمرات والحملات التوعوية لمبادرة جيل رقمي آمن وسجل حضورك الآن.',
        descEn: 'Schedule of seminars, workshops, conferences, and awareness campaigns by Safe Digital Generation.'
      },
      '/news-and-events': {
        titleAr: 'الأخبار والأنشطة والفعاليات | جيل رقمي آمن',
        titleEn: 'News & Events | Safe Digital Generation',
        descAr: 'تابع أحدث أخبار وبيانات مبادرة جيل رقمي آمن والفعاليات والأنشطة القادمة في مختلف المحافظات.',
        descEn: 'Follow the latest news, announcements, and upcoming events from Safe Digital Generation.'
      },
      '/trainings': {
        titleAr: 'البرامج التدريبية المتخصصة | جيل رقمي آمن',
        titleEn: 'Training Programs | Safe Digital Generation',
        descAr: 'دورات ومسارات تدريبية مجانية في الأمن السيبراني والبرمجة والذكاء الاصطناعي بشهادات إلكترونية معتمدة.',
        descEn: 'Free specialized training tracks in cybersecurity, programming, and AI with verified certificates.'
      },
      '/news': {
        titleAr: 'الأخبار والبيانات الإعلامية | جيل رقمي آمن',
        titleEn: 'News & Updates | Safe Digital Generation',
        descAr: 'المركز الإعلامي والتغطيات الإخبارية والبيانات الرسمية لمبادرة جيل رقمي آمن.',
        descEn: 'Official media center, news coverage, and press statements from Safe Digital Generation.'
      },
      '/projects': {
        titleAr: 'المبادرات والمشروعات المجتمعية | جيل رقمي آمن',
        titleEn: 'Projects | Safe Digital Generation',
        descAr: 'المشروعات التنموية والرقمية لمبادرة جيل رقمي آمن في الجامعات والمدارس والمجتمع المدني.',
        descEn: 'Community and technological projects led by Safe Digital Generation across Egypt.'
      },
      '/gallery': {
        titleAr: 'معرض الصور والفيديوهات | جيل رقمي آمن',
        titleEn: 'Media Gallery | Safe Digital Generation',
        descAr: 'التوثيق البصري والصور والفيديوهات لفعاليات وورش عمل ومشاركات مبادرة جيل رقمي آمن.',
        descEn: 'Photo and video documentation of Safe Digital Generation events and workshops.'
      },
      '/join': {
        titleAr: 'العضوية والتطوع | جيل رقمي آمن',
        titleEn: 'Join & Volunteer | Safe Digital Generation',
        descAr: 'قدّم طلب الانضمام والتطوع في مبادرة جيل رقمي آمن واحصل على رقم العضوية والكارنيه الإلكتروني.',
        descEn: 'Apply for membership and volunteering at Safe Digital Generation.'
      },
      '/partners': {
        titleAr: 'شركاؤنا والمظلة الرسمية | جيل رقمي آمن',
        titleEn: 'Partners | Safe Digital Generation',
        descAr: 'الجهات الرسمية والشركاء والداعمون لمبادرة جيل رقمي آمن تحت مظلة الاتحاد النوعي حكاية وطن.',
        descEn: 'Official partners, institutions, and supporters of Safe Digital Generation.'
      },
      '/library': {
        titleAr: 'المكتبة الرقمية والأدلة التوعوية | جيل رقمي آمن',
        titleEn: 'Digital Library | Safe Digital Generation',
        descAr: 'أدلة السلامة الرقمية، مكافحة التنمر الإلكتروني، ومصادر تعلم البرمجة والذكاء الاصطناعي للشباب.',
        descEn: 'Digital safety guides, anti-cyberbullying toolkits, and tech learning resources.'
      },
      '/contact': {
        titleAr: 'تواصل معنا | جيل رقمي آمن',
        titleEn: 'Contact Us | Safe Digital Generation',
        descAr: 'تواصل مع إدارة مبادرة جيل رقمي آمن للاستفسارات والشراكات المؤسسية والتعاون التدريبي.',
        descEn: 'Contact Safe Digital Generation for inquiries, partnerships, and training collaborations.'
      },
      '/verify': {
        titleAr: 'التحقق من العضوية والشهادات | جيل رقمي آمن',
        titleEn: 'Verify Card & Certificate | Safe Digital Generation',
        descAr: 'بوابة التحقق الرقمي الفوري من صحة كارنيه العضوية والشهادات الصادرة عن مبادرة جيل رقمي آمن.',
        descEn: 'Instant digital verification portal for membership cards and training certificates.'
      },
      '/member': {
        titleAr: 'بوابة العضو والكارنيه الإلكتروني | جيل رقمي آمن',
        titleEn: 'Member Portal | Safe Digital Generation',
        descAr: baseDesc,
        descEn: baseDesc,
        noindex: true
      },
      '/admin': {
        titleAr: 'لوحة الإدارة | جيل رقمي آمن',
        titleEn: 'Admin Dashboard | Safe Digital Generation',
        descAr: baseDesc,
        descEn: baseDesc,
        noindex: true
      },
      '/dashboard': {
        titleAr: 'لوحة التحكم | جيل رقمي آمن',
        titleEn: 'Dashboard | Safe Digital Generation',
        descAr: baseDesc,
        descEn: baseDesc,
        noindex: true
      },
      '/login': {
        titleAr: 'تسجيل الدخول | جيل رقمي آمن',
        titleEn: 'Login | Safe Digital Generation',
        descAr: baseDesc,
        descEn: baseDesc,
        noindex: true
      }
    };

    const match = routeMeta[cleanPath];
    const resolvedTitle = match ? (lang === 'ar' ? match.titleAr : match.titleEn) : baseTitle;
    const resolvedDesc = match ? (lang === 'ar' ? match.descAr : match.descEn) : baseDesc;
    const isDetailRoute = cleanPath.startsWith('/news/') || cleanPath.startsWith('/committees/') || /^\/events\/\d+$/.test(cleanPath);

    if (!isDetailRoute) {
      document.title = resolvedTitle;
    }

    const canonicalOrigin = (settings.site_url || window.location.origin).replace(/\/+$/, '');
    const canonicalUrl = `${canonicalOrigin}${cleanPath}`;

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    const favSrc = settings.favicon_url || settings.logo_url || '/assets/aistudio/FB_IMG_1789831319399_ac126220.jpg';
    const iconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (iconLink) iconLink.href = favSrc;
    const appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null;
    if (appleIcon) appleIcon.href = favSrc;

    const upsertMeta = (attr: 'name' | 'property', key: string, content: string) => {
      if (!content) return;
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    upsertMeta('name', 'robots', match?.noindex ? 'noindex, nofollow' : 'index, follow');

    if (!isDetailRoute) {
      const rawOgImg = settings.og_image_url || settings.logo_url || '/assets/aistudio/FB_IMG_1789831319399_ac126220.jpg';
      const absOgImg = rawOgImg.startsWith('http') ? rawOgImg : canonicalOrigin + (rawOgImg.startsWith('/') ? rawOgImg : `/${rawOgImg}`);
      upsertMeta('name', 'description', resolvedDesc);
      upsertMeta('property', 'og:type', 'website');
      upsertMeta('property', 'og:title', resolvedTitle);
      upsertMeta('property', 'og:description', resolvedDesc);
      upsertMeta('property', 'og:image', absOgImg);
      upsertMeta('property', 'og:url', canonicalUrl);
      upsertMeta('name', 'twitter:title', resolvedTitle);
      upsertMeta('name', 'twitter:description', resolvedDesc);
      upsertMeta('name', 'twitter:image', absOgImg);
    }
  }, [currentPath, lang, settings.seo_title, settings.seo_description, settings.about_summary_ar, settings.site_url, settings.favicon_url, settings.logo_url, settings.og_image_url]);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setStoredAuthToken(null);
      setUser(null);
      navigate('/');
    }
  }, [navigate]);

  const t = useCallback((ar: string, en: string) => (lang === 'ar' ? ar : en || ar), [lang]);

  const hasPermission = useCallback(
    (perm: string) => {
      if (!user || !user.adminRole) return false;
      const perms = user.permissions || [];
      return perms.includes('*') || perms.includes(perm) || (perm.endsWith(':read') && perms.includes(perm.replace(':read', '')));
    },
    [user]
  );

  return (
    <AppContext.Provider
      value={{
        lang,
        setLang,
        t,
        currentPath,
        navigate,
        settings,
        committees,
        marqueePartners,
        brandLogos,
        joinQuestions,
        stats,
        user,
        authLoading,
        refreshBootstrap,
        refreshUser,
        applyAuthSession,
        logout,
        hasPermission
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
