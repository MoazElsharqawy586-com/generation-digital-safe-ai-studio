import React, { useEffect, useState } from 'react';
import { CheckCircle2, CheckSquare, Edit3, KeyRound, Lock, Plus, Save, ShieldCheck, Trash2, Upload, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { uploadAdminFile } from './adminHelpers';
import { apiFetch } from '../../lib/authFetch';
import { AdminSectionSaveBar } from './AdminSectionSaveBar';

export const AdminContactsTab: React.FC = () => {
  const [list, setList] = useState<any[]>([]);
  const [notice, setNotice] = useState('');
  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3000);
  };
  const load = () => apiFetch('/api/admin/contacts').then((r) => r.json()).then((d) => setList(Array.isArray(d) ? d : []));
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <AdminSectionSaveBar
        sectionName="الرسائل والشكاوى"
        notice={notice}
        onSave={async () => {
          await load();
          flash('تم حفظ ومزامنة حالة الرسائل بنجاح ✓');
        }}
      />
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold font-display">رسائل تواصل معنا ({list.length})</h3>
        <div className="divide-y divide-slate-100 text-xs">
          {list.length === 0 ? <p className="py-6 text-center text-slate-500">لا توجد رسائل واردة بعد</p> : list.map((m) => (
            <div key={m.id} className="py-4 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-slate-950">{m.name} — {m.subject}</span>
                <div className="flex items-center gap-2">
                  <select
                    value={m.status}
                    onChange={async (e) => {
                      await apiFetch(`/api/admin/contacts/${m.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: e.target.value }) });
                      await load();
                      flash('تم حفظ حالة الرسالة بنجاح ✓');
                    }}
                    className="px-2 py-1 border border-slate-200 rounded"
                  >
                    <option value="new">جديدة</option>
                    <option value="replied">تم الرد</option>
                    <option value="archived">مؤرشفة</option>
                  </select>
                  <button
                    type="button"
                    onClick={async () => {
                      await apiFetch(`/api/admin/contacts/${m.id}`, { method: 'DELETE' });
                      await load();
                      flash('تم حذف الرسالة بنجاح ✓');
                    }}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                    title="حذف الرسالة"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-slate-500 font-mono-num">{m.email} · {m.phone}</p>
              <p className="text-slate-700 leading-relaxed">{m.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const AdminSettingsTab: React.FC = () => {
  const { refreshBootstrap } = useApp();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => setForm(d || {}));
  }, []);

  const persistSettings = async () => {
    setSaving(true);
    try {
      await apiFetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      await refreshBootstrap();
    } finally {
      setSaving(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await persistSettings();
  };

  return (
    <div className="space-y-4">
      <AdminSectionSaveBar
        sectionName="إعدادات الموقع والهوية البصرية"
        notice={saved ? 'تم حفظ جميع الإعدادات وتحديث الموقع بنجاح ✓' : ''}
        onSave={persistSettings}
        saving={saving}
        saveLabel="حفظ الإعدادات"
      />
      <form onSubmit={save} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 text-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-950 font-display">إعدادات الموقع والهوية البصرية و SEO</h3>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-700 text-white rounded-xl font-semibold disabled:opacity-60">
            <Save className="w-4 h-4" /> {saved ? 'تم الحفظ ✓' : 'حفظ الإعدادات'}
          </button>
        </div>

        {/* Membership Auto Card Toggle */}
        <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-slate-950">إصدار الكارنيه الإلكتروني فور التقديم</p>
            <p className="text-slate-600 mt-0.5">عند التفعيل، يحصل المتقدم في صفحة الانضمام على رقم العضوية والكارنيه الإلكتروني فور إرسال الطلب.</p>
          </div>
          <label className="inline-flex items-center gap-2 font-bold text-blue-800 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={form.auto_issue_card_on_apply !== '0'}
              onChange={(e) => setForm({ ...form, auto_issue_card_on_apply: e.target.checked ? '1' : '0' })}
            />
            <span>مفعل</span>
          </label>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-slate-100 pb-5">
          <label className="space-y-1 block"><span>الكحلي الداكن</span><input type="color" value={form.navy_color || '#0a192f'} onChange={(e) => setForm({ ...form, navy_color: e.target.value })} className="w-full h-9 rounded border" /></label>
          <label className="space-y-1 block"><span>الأزرق التقني الرئيسي</span><input type="color" value={form.primary_color || '#1d4ed8'} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="w-full h-9 rounded border" /></label>
          <label className="space-y-1 block"><span>السماوي</span><input type="color" value={form.cyan_color || '#06b6d4'} onChange={(e) => setForm({ ...form, cyan_color: e.target.value })} className="w-full h-9 rounded border" /></label>
          <label className="space-y-1 block"><span>لون مساعد</span><input type="color" value={form.accent_color || '#0ea5e9'} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} className="w-full h-9 rounded border" /></label>
        </div>

        {/* Logos & Hero */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-slate-300 rounded-xl p-3 cursor-pointer hover:bg-slate-50">
              <img src={form.logo_url || '/assets/aistudio/FB_IMG_1789831319399_ac126220.jpg'} alt="شعار المبادرة" className="w-12 h-12 object-contain rounded" />
              <span className="inline-flex items-center gap-1 font-semibold"><Upload className="w-3.5 h-3.5 text-blue-700" /> شعار جيل رقمي آمن</span>
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setForm({ ...form, logo_url: await uploadAdminFile(f, 'logos') }); }} />
            </label>
            <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-slate-300 rounded-xl p-3 cursor-pointer hover:bg-slate-50">
              <img src={form.umbrella_logo_url || '/assets/aistudio/FB_IMG_1790438684231_64912c2d.jpg'} alt="شعار حكاية وطن" className="w-12 h-12 object-contain rounded" />
              <span className="inline-flex items-center gap-1 font-semibold"><Upload className="w-3.5 h-3.5 text-blue-700" /> شعار اتحاد حكاية وطن</span>
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setForm({ ...form, umbrella_logo_url: await uploadAdminFile(f, 'logos') }); }} />
            </label>
            <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-slate-300 rounded-xl p-3 cursor-pointer hover:bg-slate-50">
              <img src={form.ministry_logo_url || '/assets/aistudio/FB_IMG_1792797530698_77e851bd.jpg'} alt="شعار وزارة التضامن" className="w-12 h-12 object-contain rounded" />
              <span className="inline-flex items-center gap-1 font-semibold"><Upload className="w-3.5 h-3.5 text-blue-700" /> شعار وزارة التضامن</span>
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setForm({ ...form, ministry_logo_url: await uploadAdminFile(f, 'logos') }); }} />
            </label>
            <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-slate-300 rounded-xl p-3 cursor-pointer hover:bg-slate-50">
              {form.hero_image_url ? (
                <img src={form.hero_image_url} alt="صورة الواجهة" className="w-20 h-12 object-cover rounded" />
              ) : (
                <Upload className="w-6 h-6 text-blue-700" />
              )}
              <span className="font-semibold">تغيير صورة الواجهة (Hero)</span>
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setForm({ ...form, hero_image_url: await uploadAdminFile(f, 'images') }); }} />
            </label>
          </div>
          <p className="text-[11px] text-slate-500">
            لإدارة الأيقونة (Favicon)، صورة المشاركة الاجتماعية (Open Graph)، وشعارات الجهات الشريكة وترتيبها، استخدم تبويب <strong>إدارة الشعارات والهوية البصرية</strong>.
          </p>
        </div>

        {/* Texts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="block font-semibold mb-1">اسم المبادرة (عربي)</label><input value={form.site_name_ar || ''} onChange={(e) => setForm({ ...form, site_name_ar: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
          <div><label className="block font-semibold mb-1">الشعار اللفظي (Slogan)</label><input value={form.site_slogan_ar || ''} onChange={(e) => setForm({ ...form, site_slogan_ar: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
          <div className="sm:col-span-2"><label className="block font-semibold mb-1">نص المظلة الرسمية</label><input value={form.umbrella_text_ar || ''} onChange={(e) => setForm({ ...form, umbrella_text_ar: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
          <div className="sm:col-span-2"><label className="block font-semibold mb-1">نبذة من نحن</label><textarea rows={2} value={form.about_summary_ar || ''} onChange={(e) => setForm({ ...form, about_summary_ar: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
          <div><label className="block font-semibold mb-1">الرؤية</label><textarea rows={2} value={form.vision_ar || ''} onChange={(e) => setForm({ ...form, vision_ar: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
          <div><label className="block font-semibold mb-1">الرسالة</label><textarea rows={2} value={form.mission_ar || ''} onChange={(e) => setForm({ ...form, mission_ar: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
        </div>

        {/* Contact & Social & Official Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
          <div><label className="block font-semibold mb-1">البريد الإلكتروني الرسمي</label><input value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
          <div><label className="block font-semibold mb-1">رقم الهاتف والواتساب الرسمي (يظهر في الموقع)</label><input dir="ltr" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono-num" /></div>
          <div>
            <label className="block font-semibold mb-1">رابط الموقع الرسمي لوزارة التضامن الاجتماعي</label>
            <input dir="ltr" placeholder="https://www.moss.gov.eg" value={form.ministry_website_url || ''} onChange={(e) => setForm({ ...form, ministry_website_url: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono-num" />
          </div>
          <div>
            <label className="block font-semibold mb-1">رابط الموقع الرسمي لاتحاد حكاية وطن (اختياري)</label>
            <input dir="ltr" placeholder="https://..." value={form.umbrella_website_url || ''} onChange={(e) => setForm({ ...form, umbrella_website_url: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono-num" />
          </div>
          <div><label className="block font-semibold mb-1">رابط Facebook</label><input dir="ltr" value={form.facebook_url || ''} onChange={(e) => setForm({ ...form, facebook_url: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
          <div><label className="block font-semibold mb-1">رابط Instagram</label><input dir="ltr" value={form.instagram_url || ''} onChange={(e) => setForm({ ...form, instagram_url: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
          <div><label className="block font-semibold mb-1">رابط TikTok</label><input dir="ltr" value={form.tiktok_url || ''} onChange={(e) => setForm({ ...form, tiktok_url: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
          <div><label className="block font-semibold mb-1">رابط YouTube (اختياري)</label><input dir="ltr" placeholder="https://youtube.com/..." value={form.youtube_url || ''} onChange={(e) => setForm({ ...form, youtube_url: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
          <div><label className="block font-semibold mb-1">رابط Telegram (اختياري)</label><input dir="ltr" placeholder="https://t.me/..." value={form.telegram_url || ''} onChange={(e) => setForm({ ...form, telegram_url: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
          <div><label className="block font-semibold mb-1">رابط X / Twitter (اختياري)</label><input dir="ltr" placeholder="https://x.com/..." value={form.x_url || ''} onChange={(e) => setForm({ ...form, x_url: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
          <div><label className="block font-semibold mb-1">رابط LinkedIn (اختياري)</label><input dir="ltr" placeholder="https://linkedin.com/..." value={form.linkedin_url || ''} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
          <div>
            <label className="block font-semibold mb-1">رابط اللوكيشن على خرائط جوجل (Google Maps Link)</label>
            <input dir="ltr" placeholder="https://maps.app.goo.gl/7YnZ5SLon7hEydpo8" value={form.location_url || ''} onChange={(e) => setForm({ ...form, location_url: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono-num" />
          </div>
          <div>
            <label className="block font-semibold mb-1">العنوان / اسم المقر (اختياري)</label>
            <input placeholder="مثال: مقر المبادرة - القاهرة" value={form.location_address || ''} onChange={(e) => setForm({ ...form, location_address: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
          </div>
          <div><label className="block font-semibold mb-1">عنوان SEO الرئيسي</label><input value={form.seo_title || ''} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
          <div className="sm:col-span-2"><label className="block font-semibold mb-1">وصف SEO (Meta Description)</label><input value={form.seo_description || ''} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
          <div className="sm:col-span-2"><label className="block font-semibold mb-1">الدومين الرسمي للموقع (اختياري لروابط Sitemap و Canonical — يُكتشف تلقائيًا عند تركه فارغًا)</label><input dir="ltr" placeholder="https://your-domain.com" value={form.site_url || ''} onChange={(e) => setForm({ ...form, site_url: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono-num" /></div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          {saved ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold">
              <CheckCircle2 className="w-4 h-4" /> تم حفظ جميع الإعدادات بنجاح ✓
            </span>
          ) : (
            <span className="text-slate-500">تأكد من الضغط على حفظ بعد أي تعديل</span>
          )}
          <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold disabled:opacity-60">
            <Save className="w-4 h-4" /> حفظ جميع الإعدادات
          </button>
        </div>
      </form>
    </div>
  );
};

interface PermissionGroup {
  id: string;
  title_ar: string;
  items: { key: string; label_ar: string }[];
}

export const AdminUsersRbacTab: React.FC = () => {
  const { user, hasPermission } = useApp();
  const [admins, setAdmins] = useState<any[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [roleDefaults, setRoleDefaults] = useState<Record<string, string[]>>({});
  const [form, setForm] = useState({ name: '', email: '', password: '', admin_role: 'admin', title_ar: '' });
  const [err, setErr] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [pwdEdit, setPwdEdit] = useState<{ user_id: number; name: string; password: string } | null>(null);
  const [editingAdmin, setEditingAdmin] = useState<{
    user_id: number;
    name: string;
    email: string;
    title_ar: string;
    admin_role: string;
    status: string;
  } | null>(null);
  const [permModal, setPermModal] = useState<{
    user_id: number;
    name: string;
    email: string;
    admin_role: string;
    perms: string[];
  } | null>(null);
  const [savingPerms, setSavingPerms] = useState(false);

  const isSuperAdmin = user?.adminRole === 'super_admin';
  const canCreateAdmin = hasPermission('admins:create');
  const canEditAdmin = hasPermission('admins:edit');
  const canDeleteAdmin = hasPermission('admins:delete');

  const load = () =>
    apiFetch('/api/admin/admins')
      .then((r) => r.json())
      .then((d) => {
        setAdmins(d.admins || []);
        if (Array.isArray(d.permissionGroups)) setPermissionGroups(d.permissionGroups);
        if (d.roleDefaults) setRoleDefaults(d.roleDefaults);
      });
  useEffect(() => {
    load();
  }, []);

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin — مدير عام',
    admin: 'Admin — مدير',
    membership_manager: 'Membership Manager — مسؤول العضوية',
    media_manager: 'Media Manager — مسؤول الإعلام',
    training_manager: 'Training Manager — مسؤول التدريب',
    committee_manager: 'Committee Manager — مسؤول اللجان',
    content_editor: 'Content Editor — محرر محتوى'
  };

  const allowedRoleEntries = Object.entries(roleLabels).filter(
    ([k]) => k !== 'super_admin' || isSuperAdmin
  );

  const parseAdminPerms = (a: any): string[] => {
    if (a.admin_role === 'super_admin') return ['*'];
    try {
      const parsed = JSON.parse(a.permissions_json || '[]');
      if (Array.isArray(parsed)) return parsed.filter((p: string) => p !== '__granular__');
    } catch {
      // ignore
    }
    return roleDefaults[a.admin_role] || [];
  };

  const openPermModal = (a: any) => {
    setPermModal({
      user_id: a.user_id,
      name: a.name,
      email: a.email,
      admin_role: a.admin_role,
      perms: parseAdminPerms(a)
    });
  };

  const togglePermKey = (key: string) => {
    if (!permModal) return;
    const exists = permModal.perms.includes(key);
    const next = exists ? permModal.perms.filter((p) => p !== key) : [...permModal.perms, key];
    setPermModal({ ...permModal, perms: next });
  };

  const savePermissions = async () => {
    if (!permModal) return;
    setSavingPerms(true);
    setErr('');
    setOkMsg('');
    try {
      const res = await apiFetch(`/api/admin/admins/${permModal.user_id}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: permModal.perms })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'تعذر حفظ الصلاحيات');
      setOkMsg(`تم تحديث الصلاحيات التفصيلية لحساب (${permModal.name}) بنجاح.`);
      setPermModal(null);
      load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSavingPerms(false);
    }
  };

  const allPermKeys = permissionGroups.flatMap((g) => g.items.map((i) => i.key));

  return (
    <div className="space-y-6">
      <AdminSectionSaveBar
        sectionName="إدارة المشرفين والصلاحيات"
        notice={okMsg}
        onSave={async () => {
          await load();
          setOkMsg('تم حفظ ومزامنة بيانات المشرفين والصلاحيات بنجاح ✓');
        }}
      />

      {/* Super Admin Governance Banner */}
      <div className={`rounded-2xl p-5 border flex flex-wrap items-center justify-between gap-4 text-xs ${isSuperAdmin ? 'bg-slate-950 text-white border-slate-800' : 'bg-amber-50 text-amber-900 border-amber-200'}`}>
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isSuperAdmin ? 'bg-cyan-500/20 text-cyan-300' : 'bg-amber-100 text-amber-700'}`}>
            {isSuperAdmin ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold font-display">
              {isSuperAdmin ? 'مركز إدارة الصلاحيات للمسؤول الرئيسي (Super Admin)' : 'إدارة المشرفين والصلاحيات'}
            </h3>
            <p className={isSuperAdmin ? 'text-slate-300' : 'text-amber-800'}>
              {isSuperAdmin
                ? 'يمكنك بصفتك المسؤول الرئيسي منح أو سحب صلاحيات إضافة/تعديل المستخدمين والأعضاء وصلاحيات إضافة/تعديل المسؤولين الآخرين لكل مشرف بدقة عبر زر «إدارة الصلاحيات».'
                : 'منح أو سحب الصلاحيات التفصيلية مقتصر على المسؤول الرئيسي (Super Admin) فقط.'}
            </p>
          </div>
        </div>
      </div>

      {canCreateAdmin && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setErr('');
            setOkMsg('');
            const res = await apiFetch('/api/admin/admins', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(form)
            });
            const d = await res.json();
            if (!res.ok) setErr(d.error || 'تعذر الإنشاء');
            else {
              setOkMsg(d.promoted ? 'تمت ترقية الحساب المسجل مسبقًا إلى مشرف بنجاح.' : 'تم إنشاء حساب المشرف الجديد بنجاح.');
              setForm({ name: '', email: '', password: '', admin_role: 'admin', title_ar: '' });
              load();
            }
          }}
          className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 text-xs"
        >
          <div>
            <h3 className="text-base font-bold text-slate-950 font-display">إضافة مشرف جديد أو ترقية عضو للإدارة (RBAC)</h3>
            <p className="text-slate-500 mt-0.5">
              أدخل بريدًا جديدًا لإنشاء حساب مشرف، أو أدخل بريد عضو مسجل مسبقًا لترقيته وتحديد صلاحياته (كلمة المرور اختيارية عند الترقية).
            </p>
          </div>
          {err && <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg">{err}</div>}
          {okMsg && <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg">{okMsg}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <input required placeholder="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
            <input required type="email" placeholder="البريد الإلكتروني" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
            <input type="password" minLength={8} placeholder="كلمة المرور (8+ أو فارغة للترقية)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
            <select value={form.admin_role} onChange={(e) => setForm({ ...form, admin_role: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg">
              {allowedRoleEntries.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button type="submit" className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold inline-flex items-center justify-center gap-1">
              <Save className="w-3.5 h-3.5" /> حفظ وإضافة / ترقية مشرف
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
        <table className="w-full text-xs text-start">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3 text-start">الاسم والبريد</th>
              <th className="py-2.5 px-3 text-start">الدور الرئيسي</th>
              <th className="py-2.5 px-3 text-start">صلاحيات المستخدمين والمسؤولين</th>
              <th className="py-2.5 px-3 text-start">الحالة</th>
              <th className="py-2.5 px-3 text-start">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {admins.map((a) => {
              const perms = parseAdminPerms(a);
              const isTargetSuper = a.admin_role === 'super_admin';
              const hasAdminCreateEdit = isTargetSuper || perms.includes('admins:create') || perms.includes('admins:edit');
              const hasMemberCreateEdit = isTargetSuper || perms.includes('members:create') || perms.includes('members:edit');

              return (
                <tr key={a.user_id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-3">
                    <p className="font-bold text-slate-950">{a.name}</p>
                    <p className="font-mono-num text-[11px] text-slate-500">{a.email}</p>
                  </td>
                  <td className="py-3 px-3">
                    <select
                      value={a.admin_role}
                      disabled={!canEditAdmin || (isTargetSuper && !isSuperAdmin)}
                      onChange={async (e) => {
                        await apiFetch(`/api/admin/admins/${a.user_id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ admin_role: e.target.value })
                        });
                        load();
                      }}
                      className="px-2 py-1 border border-slate-200 rounded disabled:opacity-60"
                    >
                      {Object.entries(roleLabels).map(([k, v]) => (
                        <option key={k} value={k} disabled={k === 'super_admin' && !isSuperAdmin}>{v}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-3">
                    {isTargetSuper ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 text-cyan-300 font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5" /> جميع الصلاحيات (*)
                      </span>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded font-semibold ${hasMemberCreateEdit ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                          {hasMemberCreateEdit ? 'إدارة الأعضاء ✓' : 'الأعضاء مقيد'}
                        </span>
                        <span className={`px-2 py-0.5 rounded font-semibold ${hasAdminCreateEdit ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-slate-100 text-slate-500'}`}>
                          {hasAdminCreateEdit ? 'إدارة المسؤولين ✓' : 'المسؤولون مقيد'}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono-num">({perms.length} صلاحية)</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <button
                      type="button"
                      disabled={!canEditAdmin || (isTargetSuper && !isSuperAdmin)}
                      onClick={async () => {
                        await apiFetch(`/api/admin/admins/${a.user_id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: a.status === 'active' ? 'suspended' : 'active' })
                        });
                        load();
                      }}
                      className={`font-semibold ${a.status === 'active' ? 'text-emerald-700' : 'text-red-600'} disabled:opacity-50`}
                    >
                      {a.status === 'active' ? 'نشط' : 'موقوف'}
                    </button>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {isSuperAdmin && !isTargetSuper && (
                        <button
                          type="button"
                          onClick={() => openPermModal(a)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-semibold"
                        >
                          <CheckSquare className="w-3.5 h-3.5 text-cyan-300" /> إدارة الصلاحيات
                        </button>
                      )}
                      {canEditAdmin && (!isTargetSuper || isSuperAdmin) && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setEditingAdmin({
                                user_id: a.user_id,
                                name: a.name || '',
                                email: a.email || '',
                                title_ar: a.title_ar || '',
                                admin_role: a.admin_role || 'admin',
                                status: a.status || 'active'
                              })
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 border border-blue-200 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-semibold"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> تعديل بيانات
                          </button>
                          <button
                            type="button"
                            onClick={() => setPwdEdit({ user_id: a.user_id, name: a.name, password: '' })}
                            className="inline-flex items-center gap-1 px-2 py-1 border border-slate-200 rounded-md text-slate-700 hover:text-blue-700 font-semibold"
                          >
                            <KeyRound className="w-3.5 h-3.5" /> كلمة المرور
                          </button>
                        </>
                      )}
                      {canDeleteAdmin && !isTargetSuper && (
                        <button
                          type="button"
                          onClick={async () => {
                            await apiFetch(`/api/admin/admins/${a.user_id}`, { method: 'DELETE' });
                            load();
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Granular Permissions Management Modal (Super Admin Only) */}
      {permModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-5 border border-slate-200 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-bold font-display text-slate-950">
                  إدارة صلاحيات الحساب: {permModal.name}
                </h3>
                <p className="text-slate-500 font-mono-num mt-0.5">
                  {permModal.email} · {roleLabels[permModal.admin_role] || permModal.admin_role}
                </p>
              </div>
              <button type="button" onClick={() => setPermModal(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Quick Bulk Helpers */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPermModal({ ...permModal, perms: allPermKeys })}
                className="px-3 py-1.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg font-semibold hover:bg-blue-100"
              >
                منح جميع الصلاحيات
              </button>
              <button
                type="button"
                onClick={() =>
                  setPermModal({
                    ...permModal,
                    perms: roleDefaults[permModal.admin_role] || []
                  })
                }
                className="px-3 py-1.5 bg-slate-100 text-slate-800 border border-slate-200 rounded-lg font-semibold hover:bg-slate-200"
              >
                استعادة افتراضيات الدور
              </button>
              <button
                type="button"
                onClick={() =>
                  setPermModal({
                    ...permModal,
                    perms: permModal.perms.filter(
                      (p) => !p.startsWith('admins') && p !== 'members:create' && p !== 'members:edit' && p !== 'members:delete'
                    )
                  })
                }
                className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg font-semibold hover:bg-red-100"
              >
                سحب صلاحيات إضافة/تعديل المستخدمين والمسؤولين
              </button>
            </div>

            {/* Permission Groups Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {permissionGroups.map((group) => {
                const isHighlight = group.id === 'admins_group' || group.id === 'members_group';
                return (
                  <div
                    key={group.id}
                    className={`rounded-xl p-4 border space-y-2.5 ${
                      isHighlight ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <h4 className="font-bold text-slate-950 flex items-center justify-between">
                      <span>{group.title_ar}</span>
                      {isHighlight && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-700 text-white">صلاحيات حساسة</span>
                      )}
                    </h4>
                    <div className="space-y-2">
                      {group.items.map((item) => {
                        const checked = permModal.perms.includes(item.key);
                        return (
                          <label
                            key={item.key}
                            className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg px-3 py-2 cursor-pointer hover:border-blue-400"
                          >
                            <span className="font-medium text-slate-800">{item.label_ar}</span>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePermKey(item.key)}
                              className="w-4 h-4 accent-blue-700"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setPermModal(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={savingPerms}
                onClick={savePermissions}
                className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-semibold inline-flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{savingPerms ? 'جارٍ الحفظ...' : 'حفظ واعتماد الصلاحيات'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {pwdEdit && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 border border-slate-200 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-display">تغيير كلمة مرور المشرف: {pwdEdit.name}</h3>
              <button type="button" onClick={() => setPwdEdit(null)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await apiFetch(`/api/admin/admins/${pwdEdit.user_id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ password: pwdEdit.password })
                });
                if (res.ok) {
                  setPwdEdit(null);
                  setOkMsg('تم تحديث كلمة مرور المشرف بنجاح.');
                } else {
                  const d = await res.json();
                  setErr(d.error || 'تعذر تغيير كلمة المرور');
                }
              }}
              className="space-y-3"
            >
              <input
                required
                type="password"
                minLength={8}
                placeholder="كلمة المرور الجديدة (8 أحرف على الأقل)"
                value={pwdEdit.password}
                onChange={(e) => setPwdEdit({ ...pwdEdit, password: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
              <button type="submit" className="w-full py-2.5 bg-blue-700 text-white rounded-xl font-semibold">حفظ كلمة المرور</button>
            </form>
          </div>
        </div>
      )}

      {editingAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold font-display">تعديل بيانات المشرف: {editingAdmin.name}</h3>
              <button type="button" onClick={() => setEditingAdmin(null)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setErr('');
                const res = await apiFetch(`/api/admin/admins/${editingAdmin.user_id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(editingAdmin)
                });
                const d = await res.json();
                if (!res.ok) {
                  setErr(d.error || 'تعذر حفظ تعديل البيانات');
                  return;
                }
                setEditingAdmin(null);
                setOkMsg(`تم حفظ تعديلات بيانات المشرف (${editingAdmin.name}) بنجاح ✓`);
                load();
              }}
              className="space-y-3"
            >
              <div>
                <label className="block font-semibold mb-1">الاسم بالكامل *</label>
                <input required value={editingAdmin.name} onChange={(e) => setEditingAdmin({ ...editingAdmin, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold mb-1">البريد الإلكتروني *</label>
                <input required type="email" value={editingAdmin.email} onChange={(e) => setEditingAdmin({ ...editingAdmin, email: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold mb-1">المسمى الوظيفي / اللقب</label>
                <input value={editingAdmin.title_ar} onChange={(e) => setEditingAdmin({ ...editingAdmin, title_ar: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">الدور الرئيسي</label>
                  <select
                    value={editingAdmin.admin_role}
                    disabled={editingAdmin.admin_role === 'super_admin' && !isSuperAdmin}
                    onChange={(e) => setEditingAdmin({ ...editingAdmin, admin_role: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {allowedRoleEntries.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">الحالة</label>
                  <select value={editingAdmin.status} onChange={(e) => setEditingAdmin({ ...editingAdmin, status: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white">
                    <option value="active">نشط</option>
                    <option value="suspended">موقوف</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-semibold inline-flex items-center justify-center gap-1.5">
                <Save className="w-4 h-4" /> حفظ التعديلات
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const AdminAuditLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [notice, setNotice] = useState('');
  const load = () => apiFetch('/api/admin/audit-logs').then((r) => r.json()).then((d) => setLogs(Array.isArray(d) ? d : []));
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <AdminSectionSaveBar
        sectionName="سجل النشاط والمراجعة"
        notice={notice}
        saveLabel="حفظ وتحديث السجل"
        onSave={async () => {
          await load();
          setNotice('تم تحديث وحفظ عرض سجل النشاط بنجاح ✓');
          setTimeout(() => setNotice(''), 3000);
        }}
      />
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
        <table className="w-full text-xs text-start">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3 text-start">المشرف</th>
              <th className="py-2.5 px-3 text-start">الإجراء</th>
              <th className="py-2.5 px-3 text-start">الكيان</th>
              <th className="py-2.5 px-3 text-start">التفاصيل</th>
              <th className="py-2.5 px-3 text-start">التاريخ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="py-2 px-3 font-mono-num">{l.admin_email}</td>
                <td className="py-2 px-3 font-semibold">{l.action}</td>
                <td className="py-2 px-3">{l.entity_type} #{l.entity_id}</td>
                <td className="py-2 px-3 font-mono-num text-slate-500 max-w-xs truncate">{l.details_json}</td>
                <td className="py-2 px-3 font-mono-num text-slate-500">{l.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
