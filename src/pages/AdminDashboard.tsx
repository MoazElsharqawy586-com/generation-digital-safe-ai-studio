import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  FolderKanban,
  GraduationCap,
  History,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Mail,
  Settings,
  Shield,
  UserCheck,
  Users
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiFetch } from '../lib/authFetch';
import { AdminOverviewSection } from './admin/AdminOverviewSection';
import { AdminApplicationsTab, AdminMembersTab } from './admin/AdminMembershipSection';
import { AdminCardDesignerSection } from './admin/AdminCardDesignerSection';
import {
  AdminCommitteesTab,
  AdminEventsTab,
  AdminLeadershipTab,
  AdminNewsTab,
  AdminTrainingsProjectsTab
} from './admin/AdminOrgContentSection';
import {
  AdminCertificatesTab,
  AdminMediaLibraryTab,
  AdminPartnersTab
} from './admin/AdminMediaCertsPartnersSection';
import {
  AdminAuditLogsTab,
  AdminContactsTab,
  AdminSettingsTab,
  AdminUsersRbacTab
} from './admin/AdminSettingsRbacSection';
import { AdminLogosIdentitySection } from './admin/AdminLogosIdentitySection';

const AdminLoginGate: React.FC = () => {
  const { user, applyAuthSession, logout, navigate } = useApp();
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const [form, setForm] = useState({ name: 'المدير العام — جيل رقمي آمن', email: 'generationdigitalsafe@gmail.com', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    apiFetch('/api/auth/setup-status')
      .then((r) => r.json())
      .then((d) => {
        if (d.needsAdminSetup) {
          setNeedsSetup(true);
          setForm((prev) => ({ ...prev, email: d.officialAdminEmail || 'generationdigitalsafe@gmail.com' }));
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const endpoint = setupMode ? '/api/auth/bootstrap-admin' : '/api/auth/login';
      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'بيانات الدخول غير صحيحة');
      if (!data.user?.adminRole) {
        applyAuthSession(data.user || null, data.token || null);
        throw new Error('هذا الحساب لا يملك صلاحية إدارية للوصول إلى لوحة التحكم.');
      }
      applyAuthSession(data.user, data.token || null);
    } catch (err: any) {
      setError(err.message || 'تعذر تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] bg-slate-50 flex items-center justify-center px-4 py-12" dir="rtl">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5 shadow-sm">
        <div className="text-center space-y-2">
          <Shield className="w-11 h-11 text-blue-700 mx-auto" />
          <h1 className="text-xl font-bold text-slate-950 font-display">
            {setupMode ? 'تفعيل حساب المدير العام' : 'دخول لوحة الإدارة'}
          </h1>
          <p className="text-xs text-slate-600">
            سجّل الدخول بحساب إداري مصرح له للوصول إلى أدوات إدارة مبادرة جيل رقمي آمن.
          </p>
        </div>

        {user && !user.adminRole && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-2">
            <span>أنت مسجل حاليًا بحساب عضو ({user.email}) بدون صلاحيات إدارية.</span>
            <button type="button" onClick={logout} className="font-semibold underline shrink-0">
              خروج
            </button>
          </div>
        )}

        {needsSetup && !setupMode && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-2">
            <p className="font-semibold">لم يتم تفعيل حساب المدير العام بعد.</p>
            <button
              type="button"
              onClick={() => setSetupMode(true)}
              className="px-3 py-1.5 bg-blue-700 text-white rounded-lg font-semibold"
            >
              تفعيل حساب المدير العام الآن
            </button>
          </div>
        )}

        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {setupMode && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">الاسم</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">البريد الإداري</label>
            <input
              required
              type="email"
              readOnly={setupMode}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="generationdigitalsafe@gmail.com"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl read-only:bg-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">كلمة المرور</label>
            <input
              required
              type="password"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="********"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-700 text-white rounded-xl text-sm font-semibold hover:bg-blue-800 transition-colors"
          >
            {loading ? 'جارٍ التحقق...' : setupMode ? 'تفعيل والدخول للوحة الإدارة' : 'دخول لوحة الإدارة'}
          </button>
        </form>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          {setupMode ? (
            <button type="button" onClick={() => setSetupMode(false)} className="text-blue-700 font-medium hover:underline">
              العودة لتسجيل الدخول
            </button>
          ) : (
            <button type="button" onClick={() => navigate('/login')} className="text-slate-600 hover:underline">
              صفحة تسجيل الدخول العامة
            </button>
          )}
          <button type="button" onClick={() => navigate('/')} className="text-slate-600 hover:underline">
            العودة للرئيسية
          </button>
        </div>
      </div>
    </div>
  );
};

export const AdminDashboard: React.FC = () => {
  const { user, authLoading, hasPermission, navigate, logout } = useApp();
  const [activeTab, setActiveTab] = useState('overview');

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">جارٍ التحقق من الجلسة...</div>;
  }

  if (!user || !user.adminRole) {
    return <AdminLoginGate />;
  }

  const navItems = [
    { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard, perm: 'dashboard' },
    { id: 'logos', label: 'إدارة الشعارات والهوية البصرية', icon: ImageIcon, perm: 'logos' },
    { id: 'applications', label: 'طلبات العضوية', icon: UserCheck, perm: 'applications' },
    { id: 'members', label: 'إدارة الأعضاء', icon: Users, perm: 'members' },
    { id: 'cards', label: 'الكارنيهات والشعارات', icon: CreditCard, perm: 'cards' },
    { id: 'leadership', label: 'القيادات', icon: Shield, perm: 'leadership' },
    { id: 'committees', label: 'اللجان', icon: Building2, perm: 'committees' },
    { id: 'news', label: 'الأخبار', icon: FileText, perm: 'news' },
    { id: 'events', label: 'الأنشطة والفعاليات', icon: Calendar, perm: 'events' },
    { id: 'trainings', label: 'البرامج التدريبية', icon: GraduationCap, perm: 'trainings' },
    { id: 'projects', label: 'المشروعات', icon: FolderKanban, perm: 'projects' },
    { id: 'media', label: 'المعرض والمكتبة', icon: ImageIcon, perm: 'media' },
    { id: 'certificates', label: 'الشهادات الإلكترونية', icon: Award, perm: 'certificates' },
    { id: 'partners', label: 'الشركاء والشريط المتحرك', icon: BookOpen, perm: 'partners' },
    { id: 'contacts', label: 'رسائل التواصل', icon: Mail, perm: 'contacts' },
    { id: 'settings', label: 'إعدادات الموقع و SEO', icon: Settings, perm: 'settings' },
    { id: 'admins', label: 'المشرفون والصلاحيات', icon: Shield, perm: 'admins' },
    { id: 'audit', label: 'سجل العمليات', icon: History, perm: 'audit' }
  ].filter((item) => (item.id === 'logos' ? hasPermission('logos') || hasPermission('settings') : hasPermission(item.perm)));

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row" dir="rtl">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 bg-slate-950 text-slate-200 shrink-0 border-e border-slate-800 flex flex-col justify-between">
        <div>
          <div className="p-5 border-b border-slate-800 space-y-1">
            <p className="text-sm font-bold text-white font-display">لوحة إدارة جيل رقمي آمن</p>
            <p className="text-[11px] text-cyan-400 font-mono-num truncate">{user.email}</p>
            <p className="text-[11px] text-slate-400">الصلاحية: {user.adminRole}</p>
          </div>
          <nav className="p-3 space-y-1 flex lg:flex-col overflow-x-auto lg:overflow-visible gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                    active ? 'bg-blue-700 text-white' : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
        <div className="p-4 border-t border-slate-800 hidden lg:flex flex-col gap-2">
          <button type="button" onClick={() => navigate('/news-and-events')} className="w-full py-2 text-xs text-cyan-300 border border-slate-700 rounded-lg hover:bg-slate-900">
            صفحة الأخبار والفعاليات
          </button>
          <button type="button" onClick={() => navigate('/')} className="w-full py-2 text-xs text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-900">
            عرض الموقع العام
          </button>
          <button type="button" onClick={logout} className="w-full py-2 text-xs text-red-300 border border-slate-800 rounded-lg hover:bg-slate-900 inline-flex items-center justify-center gap-1.5">
            <LogOut className="w-3.5 h-3.5" /> تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-950 font-display">
            {navItems.find((i) => i.id === activeTab)?.label || 'لوحة الإدارة'}
          </h1>
          <div className="flex items-center gap-2 lg:hidden">
            <button type="button" onClick={() => navigate('/')} className="px-3 py-1.5 text-xs border border-slate-300 bg-white rounded-lg">الموقع</button>
            <button type="button" onClick={logout} className="px-3 py-1.5 text-xs bg-slate-900 text-white rounded-lg">خروج</button>
          </div>
        </div>

        {activeTab === 'overview' && <AdminOverviewSection onJump={setActiveTab} />}
        {activeTab === 'logos' && <AdminLogosIdentitySection />}
        {activeTab === 'applications' && <AdminApplicationsTab />}
        {activeTab === 'members' && <AdminMembersTab />}
        {activeTab === 'cards' && <AdminCardDesignerSection />}
        {activeTab === 'leadership' && <AdminLeadershipTab />}
        {activeTab === 'committees' && <AdminCommitteesTab />}
        {activeTab === 'news' && <AdminNewsTab />}
        {activeTab === 'events' && <AdminEventsTab />}
        {activeTab === 'trainings' && <AdminTrainingsProjectsTab mode="trainings" />}
        {activeTab === 'projects' && <AdminTrainingsProjectsTab mode="projects" />}
        {activeTab === 'media' && <AdminMediaLibraryTab />}
        {activeTab === 'certificates' && <AdminCertificatesTab />}
        {activeTab === 'partners' && <AdminPartnersTab />}
        {activeTab === 'contacts' && <AdminContactsTab />}
        {activeTab === 'settings' && <AdminSettingsTab />}
        {activeTab === 'admins' && <AdminUsersRbacTab />}
        {activeTab === 'audit' && <AdminAuditLogsTab />}
      </main>
    </div>
  );
};
