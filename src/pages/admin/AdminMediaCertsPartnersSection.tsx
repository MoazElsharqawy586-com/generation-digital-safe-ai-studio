import React, { useEffect, useState } from 'react';
import { CheckCircle2, Edit3, Image as ImageIcon, Plus, Save, Star, Trash2, Upload, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { uploadAdminFile } from './adminHelpers';
import { apiFetch } from '../../lib/authFetch';

interface LinkedEntities {
  news: { id: number; title_ar: string }[];
  projects: { id: number; title_ar: string }[];
  events: { id: number; title_ar: string }[];
}

export const AdminMediaLibraryTab: React.FC = () => {
  const { refreshBootstrap } = useApp();
  const [media, setMedia] = useState<{ albums: any[]; items: any[]; entities: LinkedEntities }>({
    albums: [],
    items: [],
    entities: { news: [], projects: [], events: [] }
  });
  const [library, setLibrary] = useState<any[]>([]);
  const [albumForm, setAlbumForm] = useState({ title_ar: '', category: 'events' });
  const [mediaForm, setMediaForm] = useState({
    album_id: '',
    media_type: 'image',
    title_ar: '',
    caption_ar: '',
    alt_text: '',
    url: '',
    event_date: '',
    entity_type: 'none',
    entity_id: ''
  });
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [libForm, setLibForm] = useState({ title_ar: '', category: 'pdf_guide', description_ar: '', file_url: '', external_url: '' });
  const [notice, setNotice] = useState('');

  const load = async () => {
    const [m, l] = await Promise.all([
      apiFetch('/api/admin/media').then((r) => r.json()),
      apiFetch('/api/admin/library').then((r) => r.json())
    ]);
    setMedia({
      albums: m.albums || [],
      items: m.items || [],
      entities: m.entities || { news: [], projects: [], events: [] }
    });
    setLibrary(Array.isArray(l) ? l : []);
  };
  useEffect(() => { load(); }, []);

  const flashNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3000);
  };

  const getTargetOptions = (entityType: string) => {
    if (entityType === 'news') return media.entities.news || [];
    if (entityType === 'project') return media.entities.projects || [];
    if (entityType === 'event') return media.entities.events || [];
    return [];
  };

  const getLinkedLabel = (entityType?: string, entityId?: number | null) => {
    if (!entityType || entityType === 'none' || !entityId) return '';
    const list = getTargetOptions(entityType);
    const found = list.find((x) => Number(x.id) === Number(entityId));
    const typeName = entityType === 'news' ? 'خبر' : entityType === 'project' ? 'مبادرة/مشروع' : 'فعالية';
    return found ? `${typeName}: ${found.title_ar}` : `${typeName} #${entityId}`;
  };

  const setAsMainCover = async (item: any) => {
    const res = await apiFetch(`/api/admin/gallery/${item.id}/set-cover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity_type: item.entity_type,
        entity_id: item.entity_id
      })
    });
    if (res.ok) {
      flashNotice('تم تعيين الصورة كصورة رئيسية وحفظها بنجاح ✓');
      load();
      refreshBootstrap();
    }
  };

  return (
    <div className="space-y-8">
      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Albums & Unified Media Manager */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-950 font-display flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-blue-700" />
              <span>إدارة صور الأخبار والمبادرات وألبومات المعرض</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              ارفع صورًا من الهاتف أو الكمبيوتر، عدّل النصوص البديلة والوصف، اربط الصورة بأي خبر أو مبادرة أو فعالية، وعيّنها كصورة رئيسية بضغطة واحدة.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await apiFetch('/api/admin/albums', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(albumForm) });
              setAlbumForm({ title_ar: '', category: 'events' });
              flashNotice('تم إنشاء الألبوم ✓');
              load();
            }}
            className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3"
          >
            <p className="font-bold text-slate-900">إنشاء ألبوم جديد</p>
            <input required placeholder="اسم الألبوم" value={albumForm.title_ar} onChange={(e) => setAlbumForm({ ...albumForm, title_ar: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white" />
            <select value={albumForm.category} onChange={(e) => setAlbumForm({ ...albumForm, category: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white">
              <option value="events">صور الفعاليات</option>
              <option value="workshops">صور الورش</option>
              <option value="participation">صور المشاركات</option>
            </select>
            <button type="submit" className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold">إنشاء ألبوم</button>
          </form>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await apiFetch('/api/admin/gallery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...mediaForm,
                  album_id: mediaForm.album_id ? Number(mediaForm.album_id) : null,
                  entity_id: mediaForm.entity_id ? Number(mediaForm.entity_id) : null
                })
              });
              setMediaForm({
                album_id: '',
                media_type: 'image',
                title_ar: '',
                caption_ar: '',
                alt_text: '',
                url: '',
                event_date: '',
                entity_type: 'none',
                entity_id: ''
              });
              flashNotice('تمت إضافة الوسائط إلى قاعدة البيانات ✓');
              load();
            }}
            className="lg:col-span-8 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3"
          >
            <p className="font-bold text-slate-900">رفع صورة أو فيديو جديد وربطه بمحتوى المنصة</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input required placeholder="عنوان الصورة / الفيديو *" value={mediaForm.title_ar} onChange={(e) => setMediaForm({ ...mediaForm, title_ar: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg bg-white" />
              <input placeholder="النص البديل (Alt Text لمحركات البحث)" value={mediaForm.alt_text} onChange={(e) => setMediaForm({ ...mediaForm, alt_text: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg bg-white" />
              <input placeholder="توضيح أو وصف قصير للصورة" value={mediaForm.caption_ar} onChange={(e) => setMediaForm({ ...mediaForm, caption_ar: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg bg-white" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select value={mediaForm.album_id} onChange={(e) => setMediaForm({ ...mediaForm, album_id: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg bg-white">
                <option value="">-- الألبوم (اختياري) --</option>
                {media.albums.map((a) => <option key={a.id} value={a.id}>{a.title_ar}</option>)}
              </select>
              <select
                value={mediaForm.entity_type}
                onChange={(e) => setMediaForm({ ...mediaForm, entity_type: e.target.value, entity_id: '' })}
                className="px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="none">غير مرتبط بمحتوى محدد</option>
                <option value="news">ربط بخبر</option>
                <option value="project">ربط بمبادرة / مشروع</option>
                <option value="event">ربط بفعالية / نشاط</option>
              </select>
              {mediaForm.entity_type !== 'none' ? (
                <select value={mediaForm.entity_id} onChange={(e) => setMediaForm({ ...mediaForm, entity_id: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg bg-white">
                  <option value="">-- اختر العنصر --</option>
                  {getTargetOptions(mediaForm.entity_type).map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.title_ar}</option>
                  ))}
                </select>
              ) : (
                <input type="date" value={mediaForm.event_date} onChange={(e) => setMediaForm({ ...mediaForm, event_date: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg bg-white" />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select value={mediaForm.media_type} onChange={(e) => setMediaForm({ ...mediaForm, media_type: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg bg-white">
                <option value="image">صورة</option>
                <option value="video">فيديو</option>
              </select>
              <label className="flex items-center justify-center gap-1.5 border border-dashed border-blue-400 rounded-lg bg-white cursor-pointer py-2 px-3 hover:bg-blue-50">
                <Upload className="w-3.5 h-3.5 text-blue-700" />
                <span className="font-semibold text-blue-800">{mediaForm.url ? 'تم رفع الملف ✓' : 'رفع من الهاتف / الكمبيوتر'}</span>
                <input type="file" accept="image/*,video/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setMediaForm({ ...mediaForm, url: await uploadAdminFile(f, 'media') }); }} />
              </label>
              <input required placeholder="أو أدخل رابط الصورة / الفيديو مباشرة" value={mediaForm.url} onChange={(e) => setMediaForm({ ...mediaForm, url: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg bg-white" />
            </div>

            <button type="submit" disabled={!mediaForm.url} className="px-5 py-2 bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50">
              حفظ وإضافة للمعرض
            </button>
          </form>
        </div>

        {/* Media Edit Modal */}
        {editingItem && (
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-950">تعديل واستبدال الصورة: {editingItem.title_ar}</h4>
              <button type="button" onClick={() => setEditingItem(null)} className="text-slate-500 hover:text-slate-900"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              <div className="md:col-span-3 space-y-2">
                <img src={editingItem.url} alt={editingItem.alt_text || editingItem.title_ar} className="w-full h-32 object-cover rounded-xl border border-slate-200 bg-white" />
                <label className="flex items-center justify-center gap-1.5 border border-dashed border-blue-400 rounded-lg bg-white cursor-pointer py-2 font-semibold text-blue-800">
                  <Upload className="w-3.5 h-3.5" />
                  <span>استبدال الصورة الحالية</span>
                  <input type="file" accept="image/*,video/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setEditingItem({ ...editingItem, url: await uploadAdminFile(f, 'media') }); }} />
                </label>
              </div>
              <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={editingItem.title_ar || ''} onChange={(e) => setEditingItem({ ...editingItem, title_ar: e.target.value })} placeholder="العنوان" className="px-3 py-2 border border-slate-300 rounded-lg bg-white" />
                <input value={editingItem.alt_text || ''} onChange={(e) => setEditingItem({ ...editingItem, alt_text: e.target.value })} placeholder="النص البديل (Alt Text)" className="px-3 py-2 border border-slate-300 rounded-lg bg-white" />
                <input value={editingItem.caption_ar || ''} onChange={(e) => setEditingItem({ ...editingItem, caption_ar: e.target.value })} placeholder="الوصف / التوضيح" className="px-3 py-2 border border-slate-300 rounded-lg bg-white" />
                <input value={editingItem.url || ''} onChange={(e) => setEditingItem({ ...editingItem, url: e.target.value })} placeholder="رابط الصورة المباشر" className="px-3 py-2 border border-slate-300 rounded-lg bg-white" />
                <select
                  value={editingItem.entity_type || 'none'}
                  onChange={(e) => setEditingItem({ ...editingItem, entity_type: e.target.value, entity_id: '' })}
                  className="px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="none">غير مرتبط بمحتوى محدد</option>
                  <option value="news">ربط بخبر</option>
                  <option value="project">ربط بمبادرة / مشروع</option>
                  <option value="event">ربط بفعالية / نشاط</option>
                </select>
                {editingItem.entity_type && editingItem.entity_type !== 'none' && (
                  <select
                    value={editingItem.entity_id || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, entity_id: e.target.value })}
                    className="px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">-- اختر العنصر المرتبط --</option>
                    {getTargetOptions(editingItem.entity_type).map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.title_ar}</option>
                    ))}
                  </select>
                )}
                <div className="sm:col-span-2 flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      await apiFetch(`/api/admin/gallery/${editingItem.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          title_ar: editingItem.title_ar,
                          caption_ar: editingItem.caption_ar,
                          alt_text: editingItem.alt_text,
                          url: editingItem.url,
                          thumbnail_url: editingItem.url,
                          entity_type: editingItem.entity_type || 'none',
                          entity_id: editingItem.entity_id ? Number(editingItem.entity_id) : null
                        })
                      });
                      setEditingItem(null);
                      flashNotice('تم تحديث بيانات الصورة ✓');
                      load();
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 text-white rounded-lg font-semibold"
                  >
                    <Save className="w-3.5 h-3.5" /> حفظ التعديلات
                  </button>
                  {editingItem.entity_type && editingItem.entity_type !== 'none' && editingItem.entity_id && (
                    <button
                      type="button"
                      onClick={() => setAsMainCover(editingItem)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-lg font-semibold"
                    >
                      <Star className="w-3.5 h-3.5" /> تعيين كصورة رئيسية للعنصر المرتبط
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Media Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {media.items.map((item) => {
            const linkedLabel = getLinkedLabel(item.entity_type, item.entity_id);
            return (
              <div key={item.id} className="border border-slate-200 rounded-xl overflow-hidden text-xs bg-white flex flex-col justify-between">
                <div>
                  <img src={item.thumbnail_url || item.url} alt={item.alt_text || item.title_ar} className="w-full h-32 object-cover bg-slate-100" />
                  <div className="p-3 space-y-1">
                    <p className="font-bold text-slate-900 truncate">{item.title_ar}</p>
                    {item.caption_ar && <p className="text-[11px] text-slate-500 line-clamp-1">{item.caption_ar}</p>}
                    {item.alt_text && <p className="text-[10px] text-slate-400 truncate">ALT: {item.alt_text}</p>}
                    {linkedLabel && (
                      <p className="text-[11px] font-semibold text-blue-700 truncate pt-0.5">{linkedLabel}</p>
                    )}
                  </div>
                </div>
                <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...item })}
                      className="inline-flex items-center gap-1 px-2 py-1 border border-slate-300 bg-white rounded-md font-semibold text-slate-700 hover:border-blue-400"
                    >
                      <Edit3 className="w-3 h-3" /> تعديل
                    </button>
                    {item.entity_type && item.entity_type !== 'none' && item.entity_id && (
                      <button
                        type="button"
                        onClick={() => setAsMainCover(item)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-300 text-amber-800 rounded-md font-semibold"
                        title="تعيين كصورة رئيسية"
                      >
                        <Star className="w-3 h-3" /> رئيسية
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await apiFetch(`/api/admin/gallery/${item.id}`, { method: 'DELETE' });
                      load();
                    }}
                    className="text-red-600 p-1 hover:bg-red-50 rounded"
                    title="حذف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Digital Library */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <h3 className="text-base font-bold text-slate-950 font-display">إدارة المكتبة الرقمية</h3>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await apiFetch('/api/admin/library', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(libForm) });
            setLibForm({ title_ar: '', category: 'pdf_guide', description_ar: '', file_url: '', external_url: '' });
            load();
          }}
          className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs"
        >
          <input required placeholder="عنوان الملف / الدليل" value={libForm.title_ar} onChange={(e) => setLibForm({ ...libForm, title_ar: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg bg-white" />
          <select value={libForm.category} onChange={(e) => setLibForm({ ...libForm, category: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg bg-white">
            <option value="pdf_guide">ملفات PDF</option>
            <option value="awareness_kit">أدلة توعوية</option>
            <option value="training_material">مواد تدريبية</option>
            <option value="ebook">كتب إلكترونية</option>
            <option value="useful_link">روابط مفيدة</option>
            <option value="educational_video">فيديوهات تعليمية</option>
            <option value="security_tool">أدوات الأمن الرقمي</option>
          </select>
          <input placeholder="رابط خارجي (اختياري)" value={libForm.external_url} onChange={(e) => setLibForm({ ...libForm, external_url: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg bg-white" />
          <label className="flex items-center justify-center gap-1.5 border border-dashed border-slate-300 rounded-lg bg-white cursor-pointer py-2">
            <Upload className="w-3.5 h-3.5 text-blue-700" />
            <span>{libForm.file_url ? 'تم رفع PDF ✓' : 'رفع ملف PDF'}</span>
            <input type="file" accept=".pdf" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setLibForm({ ...libForm, file_url: await uploadAdminFile(f, 'documents') }); }} />
          </label>
          <textarea rows={2} placeholder="وصف مختصر" value={libForm.description_ar} onChange={(e) => setLibForm({ ...libForm, description_ar: e.target.value })} className="sm:col-span-2 px-3 py-2 border border-slate-300 rounded-lg bg-white" />
          <button type="submit" className="sm:col-span-2 py-2 bg-blue-700 text-white rounded-lg font-semibold">إضافة للمكتبة</button>
        </form>

        <div className="divide-y divide-slate-100 text-xs">
          {library.map((item) => (
            <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
              <div>
                <p className="font-bold text-slate-900">{item.title_ar}</p>
                <p className="text-slate-500">{item.category} · {item.downloads_count} تحميل</p>
              </div>
              <button type="button" onClick={async () => { await apiFetch(`/api/admin/library/${item.id}`, { method: 'DELETE' }); load(); }} className="text-red-600"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const AdminCertificatesTab: React.FC = () => {
  const [certs, setCerts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ recipient_name: '', recipient_email: '', course_title: '', issue_date: new Date().toISOString().slice(0, 10), trainer_name: 'لجنة التدريب والتثقيف' });

  const load = () => apiFetch(`/api/admin/certificates?search=${encodeURIComponent(search)}`).then((r) => r.json()).then((d) => setCerts(Array.isArray(d) ? d : []));
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await apiFetch('/api/admin/certificates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
          setForm({ recipient_name: '', recipient_email: '', course_title: '', issue_date: new Date().toISOString().slice(0, 10), trainer_name: 'لجنة التدريب والتثقيف' });
          load();
        }}
        className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 text-xs"
      >
        <h3 className="text-base font-bold text-slate-950 font-display">إصدار شهادة إلكترونية جديدة (مع QR Code)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input required placeholder="اسم العضو / المتدرب" value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
          <input placeholder="البريد الإلكتروني (اختياري)" value={form.recipient_email} onChange={(e) => setForm({ ...form, recipient_email: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
          <input required placeholder="اسم الدورة أو المشاركة" value={form.course_title} onChange={(e) => setForm({ ...form, course_title: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
          <input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
          <input placeholder="المدرب / الجهة المانحة" value={form.trainer_name} onChange={(e) => setForm({ ...form, trainer_name: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
          <button type="submit" className="px-4 py-2 bg-blue-700 text-white rounded-lg font-semibold inline-flex items-center justify-center gap-1.5">
            <Plus className="w-4 h-4" /> إصدار الشهادة
          </button>
        </div>
      </form>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-bold font-display">سجل الشهادات الصادرة ({certs.length})</h3>
          <div className="flex gap-2">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث برقم الشهادة أو الاسم..." className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg" />
            <button type="button" onClick={load} className="px-3 py-1.5 text-xs bg-slate-900 text-white rounded-lg">بحث</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-2 px-3 text-start">رقم الشهادة</th>
                <th className="py-2 px-3 text-start">المستفيد</th>
                <th className="py-2 px-3 text-start">الدورة</th>
                <th className="py-2 px-3 text-start">التاريخ</th>
                <th className="py-2 px-3 text-start">الحالة</th>
                <th className="py-2 px-3 text-start">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {certs.map((c) => (
                <tr key={c.id}>
                  <td className="py-2 px-3 font-mono-num font-bold text-blue-700">{c.certificate_number}</td>
                  <td className="py-2 px-3 font-semibold">{c.recipient_name}</td>
                  <td className="py-2 px-3">{c.course_title}</td>
                  <td className="py-2 px-3 font-mono-num">{c.issue_date}</td>
                  <td className="py-2 px-3 font-semibold">{c.status === 'valid' ? 'سارية' : 'ملغاة'}</td>
                  <td className="py-2 px-3 flex gap-2">
                    <a href={`/verify?cert=${c.certificate_number}`} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">عرض / PDF</a>
                    <button
                      type="button"
                      onClick={async () => {
                        await apiFetch(`/api/admin/certificates/${c.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: c.status === 'valid' ? 'revoked' : 'valid' })
                        });
                        load();
                      }}
                      className="text-amber-700 hover:underline"
                    >
                      {c.status === 'valid' ? 'إلغاء' : 'تفعيل'}
                    </button>
                    <button type="button" onClick={async () => { await apiFetch(`/api/admin/certificates/${c.id}`, { method: 'DELETE' }); load(); }} className="text-red-600 hover:underline">حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const AdminPartnersTab: React.FC = () => {
  const { settings, refreshBootstrap } = useApp();
  const [partners, setPartners] = useState<any[]>([]);
  const [marquee, setMarquee] = useState({
    marquee_enabled: settings.marquee_enabled !== 'false',
    marquee_speed: Number(settings.marquee_speed || 28),
    marquee_direction: settings.marquee_direction === 'ltr' ? 'ltr' : 'rtl',
    marquee_color_mode: settings.marquee_color_mode === 'white' ? 'white' : 'color'
  });
  const [form, setForm] = useState({
    name_ar: '',
    name_en: '',
    partner_type: 'partner',
    description_ar: '',
    logo_url: '',
    website_url: '',
    show_in_marquee: true,
    marquee_order: 10
  });

  const load = () => apiFetch('/api/admin/partners').then((r) => r.json()).then((d) => setPartners(Array.isArray(d) ? d : []));
  useEffect(() => { load(); }, []);

  const saveMarquee = async () => {
    await apiFetch('/api/admin/marquee-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(marquee)
    });
    refreshBootstrap();
  };

  return (
    <div className="space-y-6">
      {/* Marquee Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-bold text-slate-950 font-display">إعدادات شريط الشعارات المتحرك بالصفحة الرئيسية</h3>
          <button type="button" onClick={saveMarquee} className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 text-white rounded-lg font-semibold">
            <Save className="w-3.5 h-3.5" /> حفظ إعدادات الشريط
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
          <label className="flex items-center gap-2 font-semibold">
            <input type="checkbox" checked={marquee.marquee_enabled} onChange={(e) => setMarquee({ ...marquee, marquee_enabled: e.target.checked })} />
            <span>تفعيل وإظهار الشريط المتحرك</span>
          </label>
          <label className="space-y-1 block">
            <span className="font-semibold">سرعة الحركة ({marquee.marquee_speed} ثانية للدورة)</span>
            <input type="range" min={10} max={70} value={marquee.marquee_speed} onChange={(e) => setMarquee({ ...marquee, marquee_speed: Number(e.target.value) })} className="w-full" />
          </label>
          <label className="space-y-1 block">
            <span className="font-semibold">اتجاه الحركة</span>
            <select value={marquee.marquee_direction} onChange={(e) => setMarquee({ ...marquee, marquee_direction: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
              <option value="rtl">من اليمين لليسار (RTL)</option>
              <option value="ltr">من اليسار لليمين (LTR)</option>
            </select>
          </label>
          <label className="space-y-1 block">
            <span className="font-semibold">عرض الشعارات</span>
            <select value={marquee.marquee_color_mode} onChange={(e) => setMarquee({ ...marquee, marquee_color_mode: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
              <option value="color">الألوان الأصلية</option>
              <option value="white">شعارات بيضاء على خلفية داكنة</option>
            </select>
          </label>
        </div>
      </div>

      {/* Add Partner */}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await apiFetch('/api/admin/partners', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
          setForm({ name_ar: '', name_en: '', partner_type: 'partner', description_ar: '', logo_url: '', website_url: '', show_in_marquee: true, marquee_order: 10 });
          load();
          refreshBootstrap();
        }}
        className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 text-xs"
      >
        <h3 className="text-base font-bold text-slate-950 font-display">إضافة جهة / شركة / شريك / داعم جديد</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input required placeholder="اسم الجهة بالعربية" value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
          <select value={form.partner_type} onChange={(e) => setForm({ ...form, partner_type: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg">
            <option value="partner">شريك استراتيجي</option>
            <option value="corporate">شركة</option>
            <option value="civil_society">مؤسسة / جمعية</option>
            <option value="government">جهة حكومية</option>
            <option value="academic">جهة تعليمية</option>
            <option value="supporter">داعم</option>
          </select>
          <input placeholder="رابط الموقع الرسمي" value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
          <input type="number" placeholder="ترتيب الظهور" value={form.marquee_order} onChange={(e) => setForm({ ...form, marquee_order: Number(e.target.value) })} className="px-3 py-2 border border-slate-300 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          <label className="flex items-center justify-center gap-2 border border-dashed border-slate-300 rounded-lg py-2.5 cursor-pointer">
            <Upload className="w-4 h-4 text-blue-700" />
            <span>{form.logo_url ? 'تم رفع الشعار ✓' : 'رفع شعار الجهة *'}</span>
            <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setForm({ ...form, logo_url: await uploadAdminFile(f, 'logos') }); }} />
          </label>
          <label className="flex items-center gap-2 font-semibold">
            <input type="checkbox" checked={form.show_in_marquee} onChange={(e) => setForm({ ...form, show_in_marquee: e.target.checked })} />
            <span>إظهار الشعار تلقائيًا في الشريط المتحرك</span>
          </label>
        </div>
        <button type="submit" disabled={!form.logo_url} className="px-5 py-2 bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50">
          إضافة الشريك
        </button>
      </form>

      {/* Partners List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {partners.map((p) => (
          <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 min-w-0">
              <img src={p.logo_url} alt={p.name_ar} className="w-12 h-12 object-contain border border-slate-100 rounded-lg p-1 shrink-0" />
              <div className="min-w-0">
                <p className="font-bold text-slate-900 truncate">{p.name_ar}</p>
                <p className="text-slate-500">ترتيب: {p.marquee_order} · {p.show_in_marquee ? 'ظاهر بالشريط' : 'مخفي من الشريط'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={async () => {
                  await apiFetch(`/api/admin/partners/${p.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ show_in_marquee: !p.show_in_marquee })
                  });
                  load();
                  refreshBootstrap();
                }}
                className="px-2.5 py-1 border border-slate-300 rounded-md"
              >
                {p.show_in_marquee ? 'إخفاء بالشريط' : 'إظهار بالشريط'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await apiFetch(`/api/admin/partners/${p.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ is_visible: !p.is_visible })
                  });
                  load();
                  refreshBootstrap();
                }}
                className="px-2.5 py-1 border border-slate-300 rounded-md"
              >
                {p.is_visible ? 'إخفاء' : 'تفعيل'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await apiFetch(`/api/admin/partners/${p.id}`, { method: 'DELETE' });
                  load();
                  refreshBootstrap();
                }}
                className="p-1 text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
