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
  const { currentPath } = useApp();
  const path = currentPath.replace(/\/+$/, '') || '/';

  if (path === '/admin') {
    return <AdminDashboard />;
  }

  let content: React.ReactNode = <HomePage />;

  if (path === '/') content = <HomePage />;
  else if (path === '/about') content = <AboutPage />;
  else if (path === '/goals') content = <GoalsPage />;
  else if (path === '/leadership') content = <LeadershipPage />;
  else if (path === '/committees') content = <CommitteesPage />;
  else if (path.startsWith('/committees/')) content = <CommitteesPage slug={decodeURIComponent(path.replace('/committees/', ''))} />;
  else if (path === '/events') content = <EventsPage />;
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
