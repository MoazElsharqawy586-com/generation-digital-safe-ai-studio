import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Upload, Users, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { uploadAdminFile } from './adminHelpers';
import { apiFetch } from '../../lib/authFetch';

export const AdminLeadershipTab: React.FC = () => {
  const { committees } = useApp();
  const [items, setItems] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name_ar: '', name_en: '', role_ar: '', role_en: '', tier: 'board', committee_id: '', avatar_url: '', bio_ar: '', joined_at: '', sort_order: 0 });

  const load = () => apiFetch('/api/admin/leadership').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []));
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editing ? `/api/admin/leadership/${editing.id}` : '/api/admin/leadership';
    await apiFetch(url, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setModal(false);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white border border-slate-200 rounded-xl p-4">
        <h3 className="font-bold text-slate-900">إدارة قيادات المبادرة ({items.length})</h3>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setForm({ name_ar: '', name_en: '', role_ar: '', role_en: '', tier: 'board', committee_id: '', avatar_url: '', bio_ar: '', joined_at: '', sort_order: 0 });
            setModal(true);
          }}
          className="px-3.5 py-2 text-xs font-semibold bg-blue-700 text-white rounded-lg inline-flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> إضافة قيادي
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((l) => (
          <div key={l.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 min-w-0">
              <img src={l.avatar_url || '/assets/aistudio/FB_IMG_1789831319399_ac126220.jpg'} alt={l.name_ar} className="w-12 h-12 rounded-full object-cover border border-slate-200 shrink-0" />
              <div className="min-w-0">
                <p className="font-bold text-slate-900 truncate">{l.name_ar}</p>
                <p className="text-blue-700 truncate">{l.role_ar}</p>
                <p className="text-slate-400">{l.tier}</p>
              </div>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEditing(l);
                  setForm({ ...l, committee_id: String(l.committee_id || '') });
                  setModal(true);
                }}
                className="text-blue-700 font-semibold hover:underline"
              >
                تعديل
              </button>
              <button type="button" onClick={async () => { await apiFetch(`/api/admin/leadership/${l.id}`, { method: 'DELETE' }); load(); }} className="text-red-600 hover:underline">
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold">{editing ? 'تعديل قيادي' : 'إضافة قيادي جديد'}</h3>
              <button type="button" onClick={() => setModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={save} className="space-y-3 text-xs">
              <input required placeholder="الاسم بالعربية" value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              <input required placeholder="المنصب (مثال: رئيس المبادرة / رئيس لجنة...)" value={form.role_ar} onChange={(e) => setForm({ ...form, role_ar: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg">
                  <option value="president">رئيس المبادرة</option>
                  <option value="vice_president">نائب رئيس المبادرة</option>
                  <option value="board">عضو مجلس إدارة</option>
                  <option value="committee_head">رئيس لجنة</option>
                  <option value="committee_member">عضو لجنة</option>
                </select>
                <select value={form.committee_id} onChange={(e) => setForm({ ...form, committee_id: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg">
                  <option value="">-- بدون لجنة محددة --</option>
                  {committees.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                </select>
              </div>
              <textarea rows={2} placeholder="نبذة مختصرة" value={form.bio_ar} onChange={(e) => setForm({ ...form, bio_ar: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={form.joined_at} onChange={(e) => setForm({ ...form, joined_at: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
                <label className="flex items-center justify-center gap-1.5 border border-dashed border-slate-300 rounded-lg cursor-pointer py-2">
                  <Upload className="w-3.5 h-3.5 text-blue-700" />
                  <span>{form.avatar_url ? 'تم رفع الصورة ✓' : 'رفع الصورة الشخصية'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setForm({ ...form, avatar_url: await uploadAdminFile(f, 'avatars') }); }} />
                </label>
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-700 text-white rounded-xl font-semibold">حفظ</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const AdminCommitteesTab: React.FC = () => {
  const { refreshBootstrap } = useApp();
  const [committees, setCommittees] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name_ar: '', name_en: '', slug: '', description_ar: '', head_name: '', tasksText: '', logo_url: '' });
  const [memberAdd, setMemberAdd] = useState<{ committeeId: number; person_name: string; role_title: string; is_head: boolean } | null>(null);

  const load = () => apiFetch('/api/admin/committees').then((r) => r.json()).then((d) => setCommittees(Array.isArray(d) ? d : []));
  useEffect(() => { load(); }, []);

  const saveCommittee = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      tasks_ar: form.tasksText.split('\n').map((s) => s.trim()).filter(Boolean)
    };
    const url = editing ? `/api/admin/committees/${editing.id}` : '/api/admin/committees';
    await apiFetch(url, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setModal(false);
    load();
    refreshBootstrap();
  };

  const addCommitteeMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberAdd) return;
    await apiFetch(`/api/admin/committees/${memberAdd.committeeId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memberAdd)
    });
    setMemberAdd(null);
    load();
  };

  const moveMember = async (cmId: number, newCommitteeId: number) => {
    await apiFetch(`/api/admin/committee-members/${cmId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ committee_id: newCommitteeId })
    });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white border border-slate-200 rounded-xl p-4">
        <h3 className="font-bold text-slate-900">إدارة اللجان المتخصصة ({committees.length})</h3>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setForm({ name_ar: '', name_en: '', slug: '', description_ar: '', head_name: '', tasksText: '', logo_url: '/assets/aistudio/FB_IMG_1789831319399_ac126220.jpg' });
            setModal(true);
          }}
          className="px-3.5 py-2 text-xs font-semibold bg-blue-700 text-white rounded-lg inline-flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> إضافة لجنة جديدة
        </button>
      </div>

      <div className="space-y-4">
        {committees.map((c) => (
          <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-bold text-slate-950 font-display">{c.name_ar}</h4>
                <p className="text-xs text-slate-500">رئيس اللجنة: {c.head_name || '-'} · عدد الأعضاء: {c.members?.length || 0}</p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setMemberAdd({ committeeId: c.id, person_name: '', role_title: 'عضو لجنة', is_head: false })}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold"
                >
                  + عضو للجنة
                </button>
                <button
                  type="button"
                  onClick={() => {
                    let tasks: string[] = [];
                    try { tasks = JSON.parse(c.tasks_ar || '[]'); } catch { tasks = []; }
                    setEditing(c);
                    setForm({ name_ar: c.name_ar, name_en: c.name_en, slug: c.slug, description_ar: c.description_ar, head_name: c.head_name, tasksText: tasks.join('\n'), logo_url: c.logo_url });
                    setModal(true);
                  }}
                  className="px-3 py-1.5 bg-blue-700 text-white rounded-lg font-semibold"
                >
                  تعديل
                </button>
                <button
                  type="button"
                  onClick={async () => { await apiFetch(`/api/admin/committees/${c.id}`, { method: 'DELETE' }); load(); refreshBootstrap(); }}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {c.members?.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
                {c.members.map((m: any) => (
                  <div key={m.id} className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{m.person_name}</p>
                      <p className="text-[11px] text-slate-500">{m.role_title}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <select
                        value={c.id}
                        onChange={(e) => moveMember(m.id, Number(e.target.value))}
                        className="px-1.5 py-1 border border-slate-200 rounded text-[11px] bg-white max-w-[110px]"
                        title="نقل إلى لجنة أخرى"
                      >
                        {committees.map((other) => <option key={other.id} value={other.id}>{other.name_ar}</option>)}
                      </select>
                      <button type="button" onClick={async () => { await apiFetch(`/api/admin/committee-members/${m.id}`, { method: 'DELETE' }); load(); }} className="text-red-600 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold">{editing ? 'تعديل اللجنة' : 'إضافة لجنة جديدة'}</h3>
              <button type="button" onClick={() => setModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={saveCommittee} className="space-y-3 text-xs">
              <input required placeholder="اسم اللجنة بالعربية" value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="الاسم بالإنجليزية" value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
                <input placeholder="اسم رئيس اللجنة" value={form.head_name} onChange={(e) => setForm({ ...form, head_name: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <textarea rows={2} placeholder="تعريف اللجنة" value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              <textarea rows={4} placeholder="مهام اللجنة (مهمة في كل سطر)" value={form.tasksText} onChange={(e) => setForm({ ...form, tasksText: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              <label className="flex items-center justify-center gap-2 border border-dashed border-slate-300 rounded-lg py-2 cursor-pointer">
                <Upload className="w-4 h-4 text-blue-700" />
                <span>{form.logo_url ? 'تغيير شعار اللجنة' : 'رفع شعار اللجنة'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setForm({ ...form, logo_url: await uploadAdminFile(f, 'logos') }); }} />
              </label>
              <button type="submit" className="w-full py-2.5 bg-blue-700 text-white rounded-xl font-semibold">حفظ اللجنة</button>
            </form>
          </div>
        </div>
      )}

      {memberAdd && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex justify-between items-center"><h3 className="font-bold">إضافة عضو للجنة</h3><button type="button" onClick={() => setMemberAdd(null)}><X className="w-5 h-5" /></button></div>
            <form onSubmit={addCommitteeMember} className="space-y-3 text-xs">
              <input required placeholder="الاسم" value={memberAdd.person_name} onChange={(e) => setMemberAdd({ ...memberAdd, person_name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              <input placeholder="المسمى داخل اللجنة" value={memberAdd.role_title} onChange={(e) => setMemberAdd({ ...memberAdd, role_title: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              <label className="flex items-center gap-2"><input type="checkbox" checked={memberAdd.is_head} onChange={(e) => setMemberAdd({ ...memberAdd, is_head: e.target.checked })} /><span>تعيين كرئيس للجنة</span></label>
              <button type="submit" className="w-full py-2.5 bg-blue-700 text-white rounded-xl font-semibold">إضافة</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

interface MediaGalleryEntry {
  url: string;
  alt?: string;
  caption?: string;
}

function parseGalleryEntries(raw: unknown): MediaGalleryEntry[] {
  if (Array.isArray(raw)) {
    return raw
      .map((item) =>
        typeof item === 'string'
          ? { url: item, alt: '', caption: '' }
          : { url: String(item?.url || ''), alt: String(item?.alt || ''), caption: String(item?.caption || '') }
      )
      .filter((x) => x.url);
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return parseGalleryEntries(parsed);
    } catch {
      return [];
    }
  }
  return [];
}

const EntityMediaEditor: React.FC<{
  coverImage: string;
  coverAlt: string;
  shareImageUrl: string;
  logoUrl: string;
  gallery: MediaGalleryEntry[];
  brandLogos: { id: number; title_ar: string; logo_url: string }[];
  onChange: (patch: {
    cover_image?: string;
    cover_alt?: string;
    share_image_url?: string;
    logo_url?: string;
    gallery?: MediaGalleryEntry[];
  }) => void;
}> = ({ coverImage, coverAlt, shareImageUrl, logoUrl, gallery, brandLogos, onChange }) => {
  return (
    <div className="space-y-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
      <p className="font-bold text-slate-900">إدارة الصور والشعار الخاص بالمحتوى</p>

      {/* Main Cover */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-white border border-slate-200 rounded-xl p-3">
        <div className="sm:col-span-4 aspect-[16/10] bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center">
          {coverImage ? (
            <img src={coverImage} alt={coverAlt || 'الصورة الرئيسية'} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[11px] text-slate-400">لا توجد صورة رئيسية</span>
          )}
        </div>
        <div className="sm:col-span-8 space-y-2">
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white rounded-lg cursor-pointer font-semibold">
              <Upload className="w-3.5 h-3.5" />
              <span>{coverImage ? 'استبدال الصورة الرئيسية' : 'رفع الصورة الرئيسية'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) onChange({ cover_image: await uploadAdminFile(f, 'images') });
                }}
              />
            </label>
            {coverImage && (
              <button
                type="button"
                onClick={() => onChange({ cover_image: '' })}
                className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg font-semibold"
              >
                حذف الصورة
              </button>
            )}
          </div>
          <input
            placeholder="النص البديل للصورة الرئيسية (Alt Text) لمحركات البحث..."
            value={coverAlt}
            onChange={(e) => onChange({ cover_alt: e.target.value })}
            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
          />
        </div>
      </div>

      {/* Custom Share Image & Per-Article/Initiative Logo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
          <p className="font-semibold text-slate-800">شعار مخصص للخبر / المبادرة (اختياري)</p>
          <select
            value={logoUrl}
            onChange={(e) => onChange({ logo_url: e.target.value })}
            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
          >
            <option value="">-- استخدام الشعار الافتراضي للمبادرة --</option>
            {brandLogos.map((bl) => (
              <option key={bl.id} value={bl.logo_url}>
                {bl.title_ar}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-1.5 text-blue-700 font-semibold cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>أو رفع شعار مخصص</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) onChange({ logo_url: await uploadAdminFile(f, 'logos') });
              }}
            />
          </label>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
          <p className="font-semibold text-slate-800">صورة المشاركة المخصصة (OG Image) اختياري</p>
          <div className="flex items-center gap-2">
            <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 font-semibold text-slate-700">
              <Upload className="w-3.5 h-3.5 text-blue-700" />
              <span>{shareImageUrl ? 'تغيير صورة المشاركة ✓' : 'رفع صورة مشاركة مخصصة'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) onChange({ share_image_url: await uploadAdminFile(f, 'images') });
                }}
              />
            </label>
            {shareImageUrl && (
              <button type="button" onClick={() => onChange({ share_image_url: '' })} className="text-red-600 px-2 py-1">
                حذف
              </button>
            )}
          </div>
          <p className="text-[10px] text-slate-500">إذا تُرك فارغًا تُستخدم الصورة الرئيسية تلقائيًا عند المشاركة على واتساب وفيسبوك.</p>
        </div>
      </div>

      {/* Additional Multi-Images Gallery */}
      <div className="space-y-2.5 pt-2 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-slate-800">صور إضافية داخل المقال / المبادرة ({gallery.length})</p>
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg cursor-pointer font-semibold">
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة صور من الجهاز</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                if (!files.length) return;
                const uploaded: MediaGalleryEntry[] = [];
                for (const file of files) {
                  const url = await uploadAdminFile(file, 'images');
                  uploaded.push({ url, alt: '', caption: '' });
                }
                onChange({ gallery: [...gallery, ...uploaded] });
              }}
            />
          </label>
        </div>

        {gallery.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {gallery.map((g, idx) => (
              <div key={`${g.url}-${idx}`} className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-2">
                <div className="flex items-center gap-2.5">
                  <img src={g.url} alt={g.alt || `صورة ${idx + 1}`} className="w-16 h-12 rounded object-cover border shrink-0" />
                  <div className="flex-1 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => onChange({ cover_image: g.url, cover_alt: g.alt || coverAlt })}
                      className="px-2 py-1 bg-blue-50 text-blue-700 rounded font-semibold text-[10px]"
                    >
                      تعيين كرئيسية
                    </button>
                    <label className="px-2 py-1 bg-slate-100 text-slate-700 rounded font-semibold text-[10px] cursor-pointer">
                      استبدال
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const url = await uploadAdminFile(f, 'images');
                          const copy = [...gallery];
                          copy[idx] = { ...copy[idx], url };
                          onChange({ gallery: copy });
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => onChange({ gallery: gallery.filter((_, i) => i !== idx) })}
                      className="px-2 py-1 bg-red-50 text-red-600 rounded font-semibold text-[10px]"
                    >
                      حذف
                    </button>
                  </div>
                </div>
                <input
                  placeholder="وصف / تعليق الصورة (Caption)"
                  value={g.caption || ''}
                  onChange={(e) => {
                    const copy = [...gallery];
                    copy[idx] = { ...copy[idx], caption: e.target.value };
                    onChange({ gallery: copy });
                  }}
                  className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded"
                />
                <input
                  placeholder="النص البديل (Alt Text)"
                  value={g.alt || ''}
                  onChange={(e) => {
                    const copy = [...gallery];
                    copy[idx] = { ...copy[idx], alt: e.target.value };
                    onChange({ gallery: copy });
                  }}
                  className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const AdminNewsTab: React.FC = () => {
  const { brandLogos } = useApp();
  const [items, setItems] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({
    title_ar: '',
    excerpt_ar: '',
    content_ar: '',
    cover_image: '',
    cover_alt: '',
    share_image_url: '',
    logo_url: '',
    author_name: 'المكتب الإعلامي',
    department_ar: 'مبادرة جيل رقمي آمن',
    category: 'أخبار المبادرة',
    keywords: '',
    published_at: new Date().toISOString().slice(0, 10),
    status: 'published',
    gallery: [] as MediaGalleryEntry[]
  });

  const load = () => apiFetch('/api/admin/news').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []));
  useEffect(() => {
    load();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editing ? `/api/admin/news/${editing.id}` : '/api/admin/news';
    await apiFetch(url, {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    setModal(false);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white border border-slate-200 rounded-xl p-4">
        <h3 className="font-bold text-slate-900">إدارة الأخبار والمقالات ({items.length})</h3>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setForm({
              title_ar: '',
              excerpt_ar: '',
              content_ar: '',
              cover_image: '',
              cover_alt: '',
              share_image_url: '',
              logo_url: '',
              author_name: 'المكتب الإعلامي',
              department_ar: 'مبادرة جيل رقمي آمن',
              category: 'أخبار المبادرة',
              keywords: '',
              published_at: new Date().toISOString().slice(0, 10),
              status: 'published',
              gallery: []
            });
            setModal(true);
          }}
          className="px-3.5 py-2 text-xs font-semibold bg-blue-700 text-white rounded-lg inline-flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> إضافة خبر
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-xs text-start">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3 text-start">الصورة</th>
              <th className="py-2.5 px-3 text-start">العنوان</th>
              <th className="py-2.5 px-3 text-start">الجهة / القسم</th>
              <th className="py-2.5 px-3 text-start">الحالة</th>
              <th className="py-2.5 px-3 text-start">التاريخ</th>
              <th className="py-2.5 px-3 text-start">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((n) => (
              <tr key={n.id}>
                <td className="py-2 px-3">
                  {n.cover_image ? (
                    <img src={n.cover_image} alt={n.cover_alt || n.title_ar} className="w-12 h-9 object-cover rounded border" />
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="py-2.5 px-3 font-semibold text-slate-900">{n.title_ar}</td>
                <td className="py-2.5 px-3 text-slate-600">{n.department_ar || n.category}</td>
                <td className="py-2.5 px-3">{n.status === 'published' ? 'منشور' : n.status === 'draft' ? 'مسودة' : 'مخفي'}</td>
                <td className="py-2.5 px-3 font-mono-num">{(n.published_at || '').slice(0, 10)}</td>
                <td className="py-2.5 px-3 flex items-center gap-2">
                  <a href={`/news/${n.slug}`} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:underline">
                    معاينة
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(n);
                      setForm({
                        ...n,
                        published_at: (n.published_at || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
                        cover_alt: n.cover_alt || '',
                        department_ar: n.department_ar || '',
                        share_image_url: n.share_image_url || '',
                        logo_url: n.logo_url || '',
                        gallery: parseGalleryEntries(n.gallery_json)
                      });
                      setModal(true);
                    }}
                    className="text-blue-700 font-semibold hover:underline"
                  >
                    تعديل
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await apiFetch(`/api/admin/news/${n.id}`, { method: 'DELETE' });
                      load();
                    }}
                    className="text-red-600 hover:underline"
                  >
                    حذف
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-bold">{editing ? 'تعديل خبر' : 'نشر خبر جديد'}</h3>
              <button type="button" onClick={() => setModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={save} className="space-y-3 text-xs">
              <input
                required
                placeholder="عنوان الخبر"
                value={form.title_ar}
                onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
              <input
                placeholder="وصف مختصر للخبر (يظهر عند مشاركة الرابط عبر واتساب وفيسبوك وتيليجرام)"
                value={form.excerpt_ar}
                onChange={(e) => setForm({ ...form, excerpt_ar: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
              <textarea
                required
                rows={5}
                placeholder="محتوى الخبر الكامل"
                value={form.content_ar}
                onChange={(e) => setForm({ ...form, content_ar: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <input
                  placeholder="اسم الجهة / القسم"
                  value={form.department_ar || ''}
                  onChange={(e) => setForm({ ...form, department_ar: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                />
                <input
                  placeholder="التصنيف"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                />
                <input
                  placeholder="الكاتب / المحرر"
                  value={form.author_name}
                  onChange={(e) => setForm({ ...form, author_name: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                />
                <input
                  type="date"
                  value={(form.published_at || '').slice(0, 10)}
                  onChange={(e) => setForm({ ...form, published_at: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                />
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="published">منشور</option>
                  <option value="draft">مسودة</option>
                  <option value="hidden">مخفي</option>
                </select>
                <input
                  placeholder="كلمات مفتاحية"
                  value={form.keywords || ''}
                  onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <EntityMediaEditor
                coverImage={form.cover_image || ''}
                coverAlt={form.cover_alt || ''}
                shareImageUrl={form.share_image_url || ''}
                logoUrl={form.logo_url || ''}
                gallery={Array.isArray(form.gallery) ? form.gallery : []}
                brandLogos={brandLogos}
                onChange={(patch) => setForm((prev: any) => ({ ...prev, ...patch }))}
              />

              <button type="submit" className="w-full py-2.5 bg-blue-700 text-white rounded-xl font-semibold">
                حفظ الخبر
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const AdminEventsTab: React.FC = () => {
  const { brandLogos } = useApp();
  const [items, setItems] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [regs, setRegs] = useState<{ title: string; list: any[] } | null>(null);
  const [form, setForm] = useState<any>({
    title_ar: '',
    event_type: 'workshop',
    description_ar: '',
    cover_image: '',
    cover_alt: '',
    share_image_url: '',
    logo_url: '',
    event_date: '',
    location: '',
    organizer: 'مبادرة جيل رقمي آمن',
    partners_text: '',
    status: 'upcoming',
    gallery: []
  });

  const load = () => apiFetch('/api/admin/events').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []));
  useEffect(() => {
    load();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editing ? `/api/admin/events/${editing.id}` : '/api/admin/events';
    await apiFetch(url, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setModal(false);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white border border-slate-200 rounded-xl p-4">
        <h3 className="font-bold text-slate-900">إدارة الأنشطة والفعاليات ({items.length})</h3>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setForm({
              title_ar: '',
              event_type: 'workshop',
              description_ar: '',
              cover_image: '',
              cover_alt: '',
              share_image_url: '',
              logo_url: '',
              event_date: '',
              location: '',
              organizer: 'مبادرة جيل رقمي آمن',
              partners_text: '',
              status: 'upcoming',
              gallery: []
            });
            setModal(true);
          }}
          className="px-3.5 py-2 text-xs font-semibold bg-blue-700 text-white rounded-lg inline-flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> إضافة نشاط
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((ev) => (
          <div key={ev.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
            <div className="flex justify-between items-start gap-2">
              <div className="flex items-center gap-3 min-w-0">
                {ev.cover_image && <img src={ev.cover_image} alt={ev.cover_alt || ev.title_ar} className="w-14 h-11 rounded object-cover border shrink-0" />}
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-slate-950 truncate">{ev.title_ar}</h4>
                  <p className="text-slate-500 font-mono-num truncate">
                    {ev.event_date} · {ev.location}
                  </p>
                </div>
              </div>
              <span className="font-semibold text-blue-700 shrink-0">{ev.status}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={async () => {
                  const list = await apiFetch(`/api/admin/events/${ev.id}/registrations`).then((r) => r.json());
                  setRegs({ title: ev.title_ar, list: Array.isArray(list) ? list : [] });
                }}
                className="inline-flex items-center gap-1 text-slate-700 hover:underline font-semibold"
              >
                <Users className="w-3.5 h-3.5" /> المسجلون ({ev.registrations_count || 0})
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(ev);
                    setForm({ ...ev, cover_alt: ev.cover_alt || '', share_image_url: ev.share_image_url || '', logo_url: ev.logo_url || '', gallery: parseGalleryEntries(ev.gallery_json) });
                    setModal(true);
                  }}
                  className="text-blue-700 font-semibold"
                >
                  تعديل
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await apiFetch(`/api/admin/events/${ev.id}`, { method: 'DELETE' });
                    load();
                  }}
                  className="text-red-600"
                >
                  حذف
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-bold">{editing ? 'تعديل نشاط' : 'إضافة نشاط جديد'}</h3>
              <button type="button" onClick={() => setModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={save} className="space-y-3 text-xs">
              <input required placeholder="عنوان النشاط" value={form.title_ar} onChange={(e) => setForm({ ...form, title_ar: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg">
                  <option value="workshop">ورشة عمل</option>
                  <option value="seminar">ندوة</option>
                  <option value="conference">مؤتمر</option>
                  <option value="campaign">حملة توعوية</option>
                  <option value="competition">مسابقة</option>
                  <option value="community">مبادرة مجتمعية</option>
                </select>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg">
                  <option value="upcoming">قادم</option>
                  <option value="ongoing">جاري</option>
                  <option value="completed">منتهي</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input required placeholder="التاريخ والوقت (مثال: 2026-12-12 10:00)" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
                <input placeholder="المكان" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <textarea required rows={3} placeholder="وصف النشاط" value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />

              <EntityMediaEditor
                coverImage={form.cover_image || ''}
                coverAlt={form.cover_alt || ''}
                shareImageUrl={form.share_image_url || ''}
                logoUrl={form.logo_url || ''}
                gallery={Array.isArray(form.gallery) ? form.gallery : []}
                brandLogos={brandLogos}
                onChange={(patch) => setForm((prev: any) => ({ ...prev, ...patch }))}
              />

              <button type="submit" className="w-full py-2.5 bg-blue-700 text-white rounded-xl font-semibold">
                حفظ النشاط
              </button>
            </form>
          </div>
        </div>
      )}

      {regs && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm">المسجلون في: {regs.title}</h3>
              <button type="button" onClick={() => setRegs(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            {regs.list.length === 0 ? (
              <p className="text-xs text-slate-500">لا يوجد مسجلون بعد</p>
            ) : (
              regs.list.map((r) => (
                <div key={r.id} className="p-2.5 border border-slate-200 rounded-lg text-xs">
                  <p className="font-bold">{r.full_name}</p>
                  <p className="font-mono-num text-slate-600">
                    {r.phone} · {r.email}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const AdminTrainingsProjectsTab: React.FC<{ mode: 'trainings' | 'projects' }> = ({ mode }) => {
  const { brandLogos } = useApp();
  const [items, setItems] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [traineesModal, setTraineesModal] = useState<{ title: string; list: any[] } | null>(null);
  const [form, setForm] = useState<any>({});

  const endpoint = mode === 'trainings' ? '/api/admin/trainings' : '/api/admin/projects';
  const load = () => apiFetch(endpoint).then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []));
  useEffect(() => {
    load();
  }, [mode]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editing ? `${endpoint}/${editing.id}` : endpoint;
    await apiFetch(url, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setModal(false);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white border border-slate-200 rounded-xl p-4">
        <h3 className="font-bold text-slate-900">
          {mode === 'trainings' ? 'إدارة البرامج التدريبية' : 'إدارة المبادرات والمشروعات'} ({items.length})
        </h3>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setForm(
              mode === 'trainings'
                ? { title_ar: '', track: 'cybersecurity', trainer_name: '', description_ar: '', cover_image: '', start_date: '', hours: 16, delivery_mode: 'hybrid', seats_total: 50, registration_status: 'open' }
                : { title_ar: '', description_ar: '', objectives_ar: '', target_audience_ar: '', cover_image: '', cover_alt: '', share_image_url: '', logo_url: '', execution_date: '2026', partners_text: '', results_ar: '', status: 'active', gallery: [] }
            );
            setModal(true);
          }}
          className="px-3.5 py-2 text-xs font-semibold bg-blue-700 text-white rounded-lg inline-flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> {mode === 'trainings' ? 'إضافة دورة' : 'إضافة مشروع / مبادرة'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => (
          <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
            <div className="flex items-start gap-3">
              {item.cover_image && <img src={item.cover_image} alt={item.cover_alt || item.title_ar} className="w-16 h-12 rounded object-cover border shrink-0" />}
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm text-slate-950 truncate">{item.title_ar}</h4>
                <p className="text-slate-600 line-clamp-2 mt-0.5">{item.description_ar}</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              {mode === 'trainings' ? (
                <button
                  type="button"
                  onClick={async () => {
                    const list = await apiFetch(`/api/admin/trainings/${item.id}/registrations`).then((r) => r.json());
                    setTraineesModal({ title: item.title_ar, list: Array.isArray(list) ? list : [] });
                  }}
                  className="text-slate-700 font-semibold hover:underline"
                >
                  المتدربون ({item.seats_taken}/{item.seats_total})
                </button>
              ) : (
                <span className="text-slate-500 font-mono-num">{item.execution_date}</span>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(item);
                    setForm({ ...item, cover_alt: item.cover_alt || '', share_image_url: item.share_image_url || '', logo_url: item.logo_url || '', gallery: parseGalleryEntries(item.gallery_json) });
                    setModal(true);
                  }}
                  className="text-blue-700 font-semibold"
                >
                  تعديل
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await apiFetch(`${endpoint}/${item.id}`, { method: 'DELETE' });
                    load();
                  }}
                  className="text-red-600"
                >
                  حذف
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-bold">{editing ? 'تعديل' : 'إضافة جديد'}</h3>
              <button type="button" onClick={() => setModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={save} className="space-y-3 text-xs">
              <input required placeholder="العنوان" value={form.title_ar || ''} onChange={(e) => setForm({ ...form, title_ar: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              {mode === 'trainings' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <select value={form.track} onChange={(e) => setForm({ ...form, track: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg">
                      <option value="cybersecurity">الأمن السيبراني</option>
                      <option value="programming">البرمجة</option>
                      <option value="ai">الذكاء الاصطناعي</option>
                      <option value="digital_transformation">التحول الرقمي</option>
                      <option value="digital_safety">السلامة الرقمية</option>
                      <option value="anti_cyber_violence">مكافحة العنف الرقمي</option>
                      <option value="job_market">مهارات سوق العمل</option>
                      <option value="design_media">التصميم والميديا</option>
                      <option value="entrepreneurship">ريادة الأعمال</option>
                    </select>
                    <input placeholder="اسم المدرب" value={form.trainer_name || ''} onChange={(e) => setForm({ ...form, trainer_name: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="date" value={form.start_date || ''} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
                    <input type="number" placeholder="الساعات" value={form.hours || 12} onChange={(e) => setForm({ ...form, hours: Number(e.target.value) })} className="px-3 py-2 border border-slate-300 rounded-lg" />
                    <input type="number" placeholder="المقاعد" value={form.seats_total || 50} onChange={(e) => setForm({ ...form, seats_total: Number(e.target.value) })} className="px-3 py-2 border border-slate-300 rounded-lg" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <select value={form.delivery_mode} onChange={(e) => setForm({ ...form, delivery_mode: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg">
                      <option value="online">أونلاين</option>
                      <option value="onsite">حضوري</option>
                      <option value="hybrid">هجين</option>
                    </select>
                    <select value={form.registration_status} onChange={(e) => setForm({ ...form, registration_status: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg">
                      <option value="open">التسجيل مفتوح</option>
                      <option value="closed">التسجيل مغلق</option>
                    </select>
                  </div>
                  <textarea required rows={3} placeholder="الوصف" value={form.description_ar || ''} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  <label className="flex items-center justify-center gap-2 border border-dashed border-slate-300 rounded-lg py-2 cursor-pointer">
                    <Upload className="w-4 h-4 text-blue-700" />
                    <span>{form.cover_image ? 'تم رفع الصورة ✓' : 'رفع صورة الغلاف'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setForm({ ...form, cover_image: await uploadAdminFile(f, 'images') }); }} />
                  </label>
                </>
              ) : (
                <>
                  <input placeholder="الأهداف" value={form.objectives_ar || ''} onChange={(e) => setForm({ ...form, objectives_ar: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  <input placeholder="الفئة المستهدفة" value={form.target_audience_ar || ''} onChange={(e) => setForm({ ...form, target_audience_ar: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  <input placeholder="النتائج" value={form.results_ar || ''} onChange={(e) => setForm({ ...form, results_ar: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  <textarea required rows={3} placeholder="الوصف" value={form.description_ar || ''} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  <EntityMediaEditor
                    coverImage={form.cover_image || ''}
                    coverAlt={form.cover_alt || ''}
                    shareImageUrl={form.share_image_url || ''}
                    logoUrl={form.logo_url || ''}
                    gallery={Array.isArray(form.gallery) ? form.gallery : []}
                    brandLogos={brandLogos}
                    onChange={(patch) => setForm((prev: any) => ({ ...prev, ...patch }))}
                  />
                </>
              )}
              <button type="submit" className="w-full py-2.5 bg-blue-700 text-white rounded-xl font-semibold">
                حفظ
              </button>
            </form>
          </div>
        </div>
      )}

      {traineesModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-3 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center"><h3 className="font-bold text-sm">متدربو: {traineesModal.title}</h3><button type="button" onClick={() => setTraineesModal(null)}><X className="w-5 h-5" /></button></div>
            {traineesModal.list.length === 0 ? <p className="text-xs text-slate-500">لا يوجد متدربون مسجلون بعد</p> : traineesModal.list.map((tr) => (
              <div key={tr.id} className="p-2.5 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold">{tr.full_name}</p>
                  <p className="font-mono-num text-slate-500">{tr.phone} · {tr.email}</p>
                </div>
                <select
                  value={tr.status}
                  onChange={async (e) => {
                    await apiFetch(`/api/admin/training-registrations/${tr.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: e.target.value })
                    });
                    setTraineesModal((prev) => prev ? { ...prev, list: prev.list.map((x) => x.id === tr.id ? { ...x, status: e.target.value } : x) } : null);
                  }}
                  className="px-2 py-1 border border-slate-200 rounded"
                >
                  <option value="pending">قيد الانتظار</option>
                  <option value="confirmed">مقبول</option>
                  <option value="completed">أتم الدورة</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
