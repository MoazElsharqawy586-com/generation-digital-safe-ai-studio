import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { AboutPage, GoalsPage } from './pages/AboutGoalsPages';
import { CommitteesPage, LeadershipPage } from './pages/LeadershipCommitteesPages';
import { EventsPage, ProjectsPage, TrainingsPage } from './pages/ProgramsPages';
import { GalleryPage, LibraryPage, NewsAndEventsPage, NewsPage } from './pages/MediaPages';
import { ContactPage, JoinPage, PartnersPage } from './pages/JoinPartnersContactPages';
import { LoginPage, MemberPortalPage, VerifyPage } from './pages/VerifyMemberLoginPages';
import { AdminDashboard } from './pages/AdminDashboard';

const RouterView: React.FC = () => {
  const { currentPath, settings, t } = useApp();
  const path = currentPath.replace(/\/+$/, '') || '/';

  if (path === '/admin' || path === '/dashboard') {
    return <AdminDashboard />;
  }

  const whatsappPhone = (settings.phone || '01277714301').trim();
  const whatsappUrl = `https://wa.me/${whatsappPhone.replace(/\D/g, '').replace(/^0/, '20')}`;

  let content: React.ReactNode = <HomePage />;

  if (path === '/') content = <HomePage />;
  else if (path === '/about') content = <AboutPage />;
  else if (path === '/goals') content = <GoalsPage />;
  else if (path === '/leadership') content = <LeadershipPage />;
  else if (path === '/committees') content = <CommitteesPage />;
  else if (path.startsWith('/committees/')) content = <CommitteesPage slug={decodeURIComponent(path.replace('/committees/', ''))} />;
  else if (path === '/events') content = <EventsPage />;
  else if (/^\/events\/\d+$/.test(path)) content = <EventsPage eventId={Number(path.replace('/events/', ''))} />;
  else if (path === '/trainings') content = <TrainingsPage />;
  else if (path === '/news') content = <NewsPage />;
  else if (path === '/news-and-events') content = <NewsAndEventsPage />;
  else if (path.startsWith('/news/')) content = <NewsPage slug={decodeURIComponent(path.replace('/news/', ''))} />;
  else if (path === '/projects') content = <ProjectsPage />;
  else if (path === '/gallery') content = <GalleryPage />;
  else if (path === '/join') content = <JoinPage />;
  else if (path === '/partners') content = <PartnersPage />;
  else if (path === '/library') content = <LibraryPage />;
  else if (path === '/contact') content = <ContactPage />;
  else if (path === '/verify') content = <VerifyPage />;
  else if (path === '/member') content = <MemberPortalPage />;
  else if (path === '/login') content = <LoginPage />;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />
      <main className="flex-1">{content}</main>
      <Footer />

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={`${t('تواصل واتساب:', 'WhatsApp:')} ${whatsappPhone}`}
        aria-label={`${t('تواصل عبر واتساب', 'Contact via WhatsApp')} ${whatsappPhone}`}
        className="no-print fixed bottom-5 left-5 z-40 inline-flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 shadow-lg border border-emerald-400/50 transition-transform hover:scale-105"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 fill-current" aria-hidden="true">
          <path d="M12.03 2C6.5 2 2 6.46 2 11.96c0 1.77.47 3.5 1.36 5.02L2 22l5.17-1.35a10.04 10.04 0 0 0 4.86 1.24h.01c5.52 0 10.02-4.46 10.02-9.96A9.93 9.93 0 0 0 12.03 2Zm5.83 14.12c-.25.7-1.44 1.33-1.99 1.41-.51.08-1.15.11-1.86-.11-.43-.14-.98-.32-1.69-.63-2.97-1.28-4.91-4.27-5.06-4.47-.15-.2-1.21-1.61-1.21-3.07 0-1.46.76-2.18 1.03-2.48.27-.3.59-.37.79-.37.2 0 .39 0 .56.01.18.01.42-.07.66.5.25.6.85 2.07.92 2.22.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.18-.31.4-.45.54-.15.15-.3.31-.13.61.17.3.77 1.27 1.65 2.05 1.13 1.01 2.09 1.32 2.39 1.47.3.15.47.12.64-.07.17-.2.74-.86.94-1.16.2-.3.4-.25.67-.15.27.1 1.74.82 2.04.97.3.15.5.22.57.35.08.13.08.74-.17 1.44Z" />
        </svg>
        <span className="hidden sm:inline text-xs font-bold font-mono-num" dir="ltr">
          {whatsappPhone}
        </span>
      </a>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <RouterView />
    </AppProvider>
  );
}
