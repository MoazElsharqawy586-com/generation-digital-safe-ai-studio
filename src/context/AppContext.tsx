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
    const baseTitle = settings.seo_title || 'جيل رقمي آمن — معًا لمستقبل رقمي آمن';
    const routeTitles: Record<string, [string, string]> = {
      '/': [baseTitle, 'Safe Digital Generation — Together for a Safe Digital Future'],
      '/about': ['من نحن | جيل رقمي آمن', 'About Us | Safe Digital Generation'],
      '/goals': ['أهداف المبادرة | جيل رقمي آمن', 'Initiative Goals | Safe Digital Generation'],
      '/leadership': ['قيادات المبادرة | جيل رقمي آمن', 'Leadership | Safe Digital Generation'],
      '/committees': ['اللجان المتخصصة | جيل رقمي آمن', 'Committees | Safe Digital Generation'],
      '/events': ['الأنشطة والفعاليات | جيل رقمي آمن', 'Events & Activities | Safe Digital Generation'],
      '/trainings': ['البرامج التدريبية | جيل رقمي آمن', 'Training Programs | Safe Digital Generation'],
      '/news': ['الأخبار والبيانات | جيل رقمي آمن', 'News & Updates | Safe Digital Generation'],
      '/news-and-events': ['الأخبار والأنشطة والفعاليات | جيل رقمي آمن', 'News & Events | Safe Digital Generation'],
      '/projects': ['المبادرات والمشروعات | جيل رقمي آمن', 'Projects | Safe Digital Generation'],
      '/gallery': ['معرض الصور والفيديوهات | جيل رقمي آمن', 'Media Gallery | Safe Digital Generation'],
      '/join': ['العضوية والتطوع | جيل رقمي آمن', 'Join & Volunteer | Safe Digital Generation'],
      '/partners': ['شركاء المبادرة | جيل رقمي آمن', 'Partners | Safe Digital Generation'],
      '/library': ['المكتبة الرقمية | جيل رقمي آمن', 'Digital Library | Safe Digital Generation'],
      '/contact': ['تواصل معنا | جيل رقمي آمن', 'Contact Us | Safe Digital Generation'],
      '/verify': ['التحقق من العضوية والشهادات | جيل رقمي آمن', 'Verify Card & Certificate | Safe Digital Generation'],
      '/member': ['بوابة العضو والكارنيه الإلكتروني | جيل رقمي آمن', 'Member Portal | Safe Digital Generation'],
      '/admin': ['لوحة الإدارة | جيل رقمي آمن', 'Admin Dashboard | Safe Digital Generation'],
      '/login': ['تسجيل الدخول | جيل رقمي آمن', 'Login | Safe Digital Generation']
    };
    const match = routeTitles[currentPath];
    const resolvedTitle = match ? (lang === 'ar' ? match[0] : match[1]) : baseTitle;
    if (match) {
      document.title = resolvedTitle;
    }

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.origin + currentPath;

    const favSrc = settings.favicon_url || settings.logo_url || '/assets/aistudio/FB_IMG_1789831319399_ac126220.jpg';
    const iconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (iconLink) iconLink.href = favSrc;
    const appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null;
    if (appleIcon) appleIcon.href = favSrc;

    const descValue = settings.seo_description || '';
    if (descValue) {
      const descEl = document.querySelector('meta[name="description"]');
      if (descEl) descEl.setAttribute('content', descValue);
    }

    if (!currentPath.startsWith('/news/')) {
      const rawOgImg = settings.og_image_url || settings.logo_url || '/assets/aistudio/FB_IMG_1789831319399_ac126220.jpg';
      const absOgImg = rawOgImg.startsWith('http') ? rawOgImg : window.location.origin + (rawOgImg.startsWith('/') ? rawOgImg : `/${rawOgImg}`);
      const setMeta = (selector: string, content: string) => {
        const el = document.querySelector(selector);
        if (el && content) el.setAttribute('content', content);
      };
      setMeta('meta[property="og:title"]', resolvedTitle);
      setMeta('meta[property="og:description"]', descValue);
      setMeta('meta[property="og:image"]', absOgImg);
      setMeta('meta[property="og:url"]', window.location.origin + currentPath);
      setMeta('meta[name="twitter:title"]', resolvedTitle);
      setMeta('meta[name="twitter:description"]', descValue);
      setMeta('meta[name="twitter:image"]', absOgImg);
    }
  }, [currentPath, lang, settings.seo_title, settings.seo_description, settings.favicon_url, settings.logo_url, settings.og_image_url]);

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
