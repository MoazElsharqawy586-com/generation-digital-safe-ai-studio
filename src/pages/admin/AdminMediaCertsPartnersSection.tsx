import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2, Edit3, ExternalLink, Globe, GraduationCap, Image as ImageIcon, Plus, Save, Sparkles, Star, Trash2, Upload, Users, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { uploadAdminFile } from './adminHelpers';
import { AdminSectionSaveBar } from './AdminSectionSaveBar';
import { apiFetch } from '../../lib/authFetch';
import { normalizeExternalUrl } from '../../lib/url';
import { ACTIVITY_TYPE_LABELS, CertificateView } from '../../components/CertificateView';

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
  const [albumForm, setAlbumForm] = useState({ title_ar: '', category: 'events', description_ar: '' });
  const [editingAlbum, setEditingAlbum] = useState<any | null>(null);
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
  const [editingLib, setEditingLib] = useState<any | null>(null);
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
      <AdminSectionSaveBar
        sectionName="المعرض والمكتبة الرقمية"
        notice={notice}
        saveLabel="حفظ وتحديث المعرض والمكتبة"
        onSave={async () => {
          await load();
          await refreshBootstrap();
          flashNotice('تم حفظ كافة التغييرات وتحديث المعرض والمكتبة الرقمية ✓');
        }}
      />

      {/* Albums & Unified Media Manager */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-950 font-display flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-blue-700" />
              <span>إدارة صور الأخبار والمبادرات وألبومات المعرض</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              ارفع صورًا من الهاتف أو الكمبيوتر، عدّل النصوص البديلة والوصف والألبومات، واربط الصورة بأي خبر أو مبادرة أو فعالية.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await apiFetch('/api/admin/albums', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(albumForm) });
              setAlbumForm({ title_ar: '', category: 'events', description_ar: '' });
              flashNotice('تم إنشاء وحفظ الألبوم ✓');
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
            <input placeholder="وصف مختصر (اختياري)" value={albumForm.description_ar} onChange={(e) => setAlbumForm({ ...albumForm, description_ar: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white" />
            <button type="submit" className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold inline-flex items-center justify-center gap-1.5">
              <Save className="w-3.5 h-3.5" /> حفظ وإنشاء ألبوم
            </button>
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
              flashNotice('تم حفظ وإضافة الوسائط إلى قاعدة البيانات ✓');
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

            <button type="submit" disabled={!mediaForm.url} className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50">
              <Save className="w-3.5 h-3.5" /> حفظ وإضافة للمعرض
            </button>
          </form>
        </div>

        {/* Albums List (Edit / Delete) */}
        {media.albums.length > 0 && (
          <div className="space-y-2 text-xs">
            <p className="font-bold text-slate-900">الألبومات الحالية ({media.albums.length})</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {media.albums.map((alb) => (
                <div key={alb.id} className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{alb.title_ar}</p>
                    <p className="text-[11px] text-slate-500">{alb.category}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingAlbum({ ...alb })}
                      className="inline-flex items-center gap-1 px-2 py-1 border border-slate-300 bg-white rounded-md font-semibold text-blue-700 hover:border-blue-400"
                    >
                      <Edit3 className="w-3 h-3" /> تعديل
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await apiFetch(`/api/admin/albums/${alb.id}`, { method: 'DELETE' });
                        flashNotice('تم حذف الألبوم وحفظ التغييرات ✓');
                        load();
                      }}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title="حذف الألبوم"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Edit Album Inline Card */}
        {editingAlbum && (
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-950">تعديل بيانات الألبوم: {editingAlbum.title_ar}</h4>
              <button type="button" onClick={() => setEditingAlbum(null)}><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input value={editingAlbum.title_ar || ''} onChange={(e) => setEditingAlbum({ ...editingAlbum, title_ar: e.target.value })} placeholder="اسم الألبوم" className="px-3 py-2 border border-slate-300 rounded-lg bg-white" />
              <select value={editingAlbum.category || 'events'} onChange={(e) => setEditingAlbum({ ...editingAlbum, category: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg bg-white">
                <option value="events">صور الفعاليات</option>
                <option value="workshops">صور الورش</option>
                <option value="participation">صور المشاركات</option>
              </select>
              <input value={editingAlbum.description_ar || ''} onChange={(e) => setEditingAlbum({ ...editingAlbum, description_ar: e.target.value })} placeholder="وصف الألبوم" className="px-3 py-2 border border-slate-300 rounded-lg bg-white" />
            </div>
            <button
              type="button"
              onClick={async () => {
                await apiFetch(`/api/admin/albums/${editingAlbum.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(editingAlbum)
                });
                setEditingAlbum(null);
                flashNotice('تم حفظ تعديلات الألبوم بنجاح ✓');
                load();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 text-white rounded-lg font-semibold"
            >
              <Save className="w-3.5 h-3.5" /> حفظ تعديلات الألبوم
            </button>
          </div>
        )}

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
                      flashNotice('تم حفظ وتحديث بيانات الصورة ✓');
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
                      flashNotice('تم حذف العنصر وحفظ التغييرات ✓');
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-bold text-slate-950 font-display">إدارة المكتبة الرقمية ({library.length})</h3>
          <button
            type="button"
            onClick={async () => {
              await load();
              flashNotice('تم حفظ بيانات المكتبة الرقمية بنجاح ✓');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
          >
            <Save className="w-3.5 h-3.5" /> حفظ المكتبة
          </button>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await apiFetch('/api/admin/library', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(libForm) });
            setLibForm({ title_ar: '', category: 'pdf_guide', description_ar: '', file_url: '', external_url: '' });
            flashNotice('تم حفظ وإضافة العنصر إلى المكتبة الرقمية ✓');
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
          <button type="submit" className="sm:col-span-2 py-2 bg-blue-700 text-white rounded-lg font-semibold inline-flex items-center justify-center gap-1.5">
            <Save className="w-3.5 h-3.5" /> حفظ وإضافة للمكتبة
          </button>
        </form>

        <div className="divide-y divide-slate-100 text-xs">
          {library.map((item) => (
            <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-slate-900">{item.title_ar}</p>
                <p className="text-slate-500">{item.category} · {item.downloads_count} تحميل</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingLib({ ...item, is_published: item.is_published !== 0 })}
                  className="inline-flex items-center gap-1 px-2.5 py-1 border border-slate-300 rounded-md font-semibold text-blue-700 hover:border-blue-400"
                >
                  <Edit3 className="w-3 h-3" /> تعديل
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await apiFetch(`/api/admin/library/${item.id}`, { method: 'DELETE' });
                    flashNotice('تم حذف العنصر من المكتبة وحفظ التغييرات ✓');
                    load();
                  }}
                  className="text-red-600 p-1 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Edit Digital Library Modal */}
        {editingLib && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-950 font-display">تعديل عنصر المكتبة الرقمية</h3>
                <button type="button" onClick={() => setEditingLib(null)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await apiFetch(`/api/admin/library/${editingLib.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(editingLib)
                  });
                  setEditingLib(null);
                  flashNotice('تم حفظ تعديلات المكتبة الرقمية ✓');
                  load();
                }}
                className="space-y-3"
              >
                <input required placeholder="عنوان الملف / الدليل" value={editingLib.title_ar || ''} onChange={(e) => setEditingLib({ ...editingLib, title_ar: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                <select value={editingLib.category || 'pdf_guide'} onChange={(e) => setEditingLib({ ...editingLib, category: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white">
                  <option value="pdf_guide">ملفات PDF</option>
                  <option value="awareness_kit">أدلة توعوية</option>
                  <option value="training_material">مواد تدريبية</option>
                  <option value="ebook">كتب إلكترونية</option>
                  <option value="useful_link">روابط مفيدة</option>
                  <option value="educational_video">فيديوهات تعليمية</option>
                  <option value="security_tool">أدوات الأمن الرقمي</option>
                </select>
                <input placeholder="رابط خارجي" value={editingLib.external_url || ''} onChange={(e) => setEditingLib({ ...editingLib, external_url: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                <label className="flex items-center justify-center gap-1.5 border border-dashed border-slate-300 rounded-lg cursor-pointer py-2">
                  <Upload className="w-3.5 h-3.5 text-blue-700" />
                  <span>{editingLib.file_url ? 'استبدال ملف PDF ✓' : 'رفع ملف PDF'}</span>
                  <input type="file" accept=".pdf" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setEditingLib({ ...editingLib, file_url: await uploadAdminFile(f, 'documents') }); }} />
                </label>
                <textarea rows={2} placeholder="الوصف" value={editingLib.description_ar || ''} onChange={(e) => setEditingLib({ ...editingLib, description_ar: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                <label className="flex items-center gap-2 font-semibold">
                  <input type="checkbox" checked={Boolean(editingLib.is_published)} onChange={(e) => setEditingLib({ ...editingLib, is_published: e.target.checked })} />
                  <span>منشور للجمهور</span>
                </label>
                <button type="submit" className="w-full py-2.5 bg-blue-700 text-white rounded-xl font-semibold inline-flex items-center justify-center gap-1.5">
                  <Save className="w-4 h-4" /> حفظ التعديلات
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CERT_STYLE_OPTIONS = [
  { id: 'official_navy', label: 'كحلي وسماوي رسمي', primary: '#0A192F', accent: '#06B6D4' },
  { id: 'cyber_cyan', label: 'أزرق سيبراني تقني', primary: '#0F172A', accent: '#0284C7' },
  { id: 'royal_gold', label: 'ملكي ذهبي فاخر', primary: '#451A03', accent: '#D97706' },
  { id: 'emerald_honor', label: 'زمردي تقديري', primary: '#064E3B', accent: '#10B981' }
];

export const AdminCertificatesTab: React.FC = () => {
  const [certs, setCerts] = useState<any[]>([]);
  const [options, setOptions] = useState<{ members: any[]; trainings: any[]; events: any[] }>({
    members: [],
    trainings: [],
    events: []
  });
  const [search, setSearch] = useState('');
  const [recipientMode, setRecipientMode] = useState<'members' | 'program' | 'manual'>('members');
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [manualRecipient, setManualRecipient] = useState({ recipient_name: '', recipient_email: '' });

  // Program registrants for training / workshop / event awarding
  const [programSource, setProgramSource] = useState<{ type: 'training' | 'event'; id: string }>({ type: 'training', id: '' });
  const [registrants, setRegistrants] = useState<any[]>([]);
  const [selectedRegIds, setSelectedRegIds] = useState<number[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(false);

  // Studio fields (editable manually or generated by AI)
  const [studio, setStudio] = useState({
    activity_type: 'training' as 'training' | 'workshop' | 'periodic' | 'honor',
    training_id: '',
    event_id: '',
    title_ar: 'شهادة إتمام وتقدير رسمية',
    subtitle_ar: 'SAFE DIGITAL GENERATION — شهادة معتمدة',
    course_title: '',
    body_text_ar: 'تشهد إدارة مبادرة جيل رقمي آمن بأن المشارك / المتدرب قد أتم بنجاح جميع المتطلبات والمهارات العملية المقررة في:',
    issue_date: new Date().toISOString().slice(0, 10),
    trainer_name: 'لجنة التدريب والتثقيف',
    hours_count: 0,
    grade_ar: 'اجتياز بنجاح',
    template_style: 'official_navy',
    primary_color: '#0A192F',
    accent_color: '#06B6D4'
  });

  // AI Tool State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');

  const [issuing, setIssuing] = useState(false);
  const [editingCert, setEditingCert] = useState<any | null>(null);
  const [notice, setNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const flashNotice = (msg: string) => {
    setErrorMsg('');
    setNotice(msg);
    setTimeout(() => setNotice(''), 4000);
  };

  const flashError = (msg: string) => {
    setNotice('');
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 5000);
  };

  const load = async () => {
    const [certsData, optsData] = await Promise.all([
      apiFetch(`/api/admin/certificates?search=${encodeURIComponent(search)}`).then((r) => r.json()),
      apiFetch('/api/admin/certificates/options').then((r) => (r.ok ? r.json() : { members: [], trainings: [], events: [] }))
    ]);
    setCerts(Array.isArray(certsData) ? certsData : []);
    setOptions({
      members: Array.isArray(optsData?.members) ? optsData.members : [],
      trainings: Array.isArray(optsData?.trainings) ? optsData.trainings : [],
      events: Array.isArray(optsData?.events) ? optsData.events : []
    });
  };

  useEffect(() => {
    load();
  }, []);

  const loadProgramRegistrants = async (type: 'training' | 'event', id: string) => {
    if (!id) {
      setRegistrants([]);
      setSelectedRegIds([]);
      return;
    }
    setLoadingRegs(true);
    try {
      const res = await apiFetch(`/api/admin/certificates/program-registrants?source_type=${type}&source_id=${id}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setRegistrants(list);
      setSelectedRegIds(list.filter((r) => !r.already_certified && (type === 'event' || r.status !== 'pending')).map((r) => r.id));
    } finally {
      setLoadingRegs(false);
    }
  };

  const selectProgramForStudio = (type: 'training' | 'event', id: string) => {
    setProgramSource({ type, id });
    if (type === 'training') {
      const tr = options.trainings.find((t) => String(t.id) === id);
      if (tr) {
        setStudio((prev) => ({
          ...prev,
          activity_type: 'training',
          training_id: id,
          event_id: '',
          course_title: tr.title_ar || prev.course_title,
          trainer_name: tr.trainer_name || prev.trainer_name,
          hours_count: Number(tr.hours || 0),
          title_ar: 'شهادة إتمام برنامج تدريبي معتمد'
        }));
      }
    } else {
      const ev = options.events.find((e) => String(e.id) === id);
      if (ev) {
        const isPeriodic = ev.event_type === 'competition';
        setStudio((prev) => ({
          ...prev,
          activity_type: isPeriodic ? 'periodic' : 'workshop',
          event_id: id,
          training_id: '',
          course_title: ev.title_ar || prev.course_title,
          trainer_name: ev.organizer || prev.trainer_name,
          title_ar: isPeriodic ? 'شهادة مشاركة وتميز في الدوري التوعوي' : 'شهادة حضور ومشاركة في ورشة عمل'
        }));
      }
    }
    loadProgramRegistrants(type, id);
  };

  const runAiCertificateGenerator = async () => {
    if (!aiPrompt.trim() && !studio.course_title.trim()) {
      setAiError('اكتب وصفًا للشهادة أو اختر/أدخل اسم التدريب أو الورشة أو الدوري أولاً.');
      return;
    }
    setAiGenerating(true);
    setAiError('');
    try {
      const res = await apiFetch('/api/admin/certificates/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
          activity_type: studio.activity_type,
          program_title: studio.course_title.trim(),
          trainer_name: studio.trainer_name.trim(),
          hours_count: studio.hours_count,
          style_preference: CERT_STYLE_OPTIONS.find((s) => s.id === studio.template_style)?.label || ''
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || 'تعذر إنشاء الشهادة بالذكاء الاصطناعي');
        return;
      }
      setStudio((prev) => ({
        ...prev,
        title_ar: data.title_ar || prev.title_ar,
        subtitle_ar: data.subtitle_ar || prev.subtitle_ar,
        course_title: data.course_title || prev.course_title,
        body_text_ar: data.body_text_ar || prev.body_text_ar,
        hours_count: data.suggested_hours !== undefined ? Number(data.suggested_hours) : prev.hours_count,
        grade_ar: data.suggested_grade || prev.grade_ar,
        template_style: data.template_style || prev.template_style,
        primary_color: data.primary_color || prev.primary_color,
        accent_color: data.accent_color || prev.accent_color
      }));
      flashNotice('تم إنشاء محتوى وتصميم الشهادة بالذكاء الاصطناعي بنجاح ✨ يمكنك المراجعة ثم إصدارها للأعضاء.');
    } catch {
      setAiError('حدث خطأ في الاتصال بخادم الذكاء الاصطناعي.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleIssueCertificates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studio.course_title.trim()) {
      flashError('يرجى إدخال اسم التدريب أو الورشة أو الدوري');
      return;
    }

    setIssuing(true);
    try {
      if (recipientMode === 'program') {
        if (!programSource.id) {
          flashError('اختر التدريب أو الورشة/الفعالية المراد منح الشهادات لمشاركيها');
          return;
        }
        if (selectedRegIds.length === 0) {
          flashError('حدد مشاركًا واحدًا على الأقل لإصدار الشهادة');
          return;
        }
        const res = await apiFetch('/api/admin/certificates/award-from-program', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_type: programSource.type,
            source_id: Number(programSource.id),
            registration_ids: selectedRegIds,
            ...studio
          })
        });
        const data = await res.json();
        if (!res.ok) {
          flashError(data.error || 'تعذر إصدار الشهادات');
          return;
        }
        flashNotice(`تم منح وإصدار ${data.count} شهادة بنجاح ✓${data.skipped ? ` (تم تخطي ${data.skipped} لديه شهادة مسبقة)` : ''}`);
        await Promise.all([load(), loadProgramRegistrants(programSource.type, programSource.id)]);
        return;
      }

      if (recipientMode === 'members') {
        if (selectedMemberIds.length === 0) {
          flashError('حدد عضوًا واحدًا على الأقل من القائمة لإضافة الشهادة له');
          return;
        }
        const res = await apiFetch('/api/admin/certificates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...studio,
            training_id: studio.training_id ? Number(studio.training_id) : null,
            event_id: studio.event_id ? Number(studio.event_id) : null,
            member_ids: selectedMemberIds
          })
        });
        const data = await res.json();
        if (!res.ok) {
          flashError(data.error || 'تعذر إصدار الشهادات للأعضاء');
          return;
        }
        setSelectedMemberIds([]);
        flashNotice(`تمت إضافة وإصدار ${data.count} شهادة للأعضاء المحددين وحفظها في بواباتهم ✓`);
        await load();
        return;
      }

      if (!manualRecipient.recipient_name.trim()) {
        flashError('أدخل اسم المستفيد لإصدار الشهادة');
        return;
      }
      const res = await apiFetch('/api/admin/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...studio,
          training_id: studio.training_id ? Number(studio.training_id) : null,
          event_id: studio.event_id ? Number(studio.event_id) : null,
          recipient_name: manualRecipient.recipient_name.trim(),
          recipient_email: manualRecipient.recipient_email.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        flashError(data.error || 'تعذر إصدار الشهادة');
        return;
      }
      setManualRecipient({ recipient_name: '', recipient_email: '' });
      flashNotice('تم إصدار الشهادة وحفظها بنجاح ✓');
      await load();
    } finally {
      setIssuing(false);
    }
  };

  const filteredMembers = options.members.filter((m) => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      String(m.full_name || '').toLowerCase().includes(q) ||
      String(m.member_number || '').toLowerCase().includes(q) ||
      String(m.email || '').toLowerCase().includes(q) ||
      String(m.committee_name || '').toLowerCase().includes(q)
    );
  });

  const previewRecipientName =
    recipientMode === 'members' && selectedMemberIds.length > 0
      ? options.members.find((m) => m.id === selectedMemberIds[0])?.full_name || 'اسم العضو المختار'
      : recipientMode === 'program' && selectedRegIds.length > 0
        ? registrants.find((r) => r.id === selectedRegIds[0])?.full_name || 'اسم المشارك'
        : manualRecipient.recipient_name.trim() || 'اسم العضو / المتدرب (معاينة)';

  return (
    <div className="space-y-6">
      <AdminSectionSaveBar
        sectionName="الشهادات الإلكترونية واستوديو الذكاء الاصطناعي"
        notice={notice}
        saveLabel="تحديث ومزامنة الشهادات"
        onSave={async () => {
          await load();
          flashNotice('تم تحديث سجل الشهادات الإلكترونية بنجاح ✓');
        }}
      />

      {errorMsg && (
        <div className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded-xl">
          {errorMsg}
        </div>
      )}

      {/* AI Certificate Generator Studio */}
      <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white rounded-2xl p-6 space-y-4 border border-blue-800/50 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-cyan-300 text-xs font-bold">
              <Sparkles className="w-4 h-4" />
              <span>أداة الذكاء الاصطناعي لعمل وتصميم الشهادات (AI Studio)</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold font-display">
              صمّم وصُغ شهادة رسمية للتدريبات والورش والدوريات بضغطة زر
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {[
              { id: 'training', label: 'بعد تدريب' },
              { id: 'workshop', label: 'بعد ورشة عمل' },
              { id: 'periodic', label: 'دورة / دوري' },
              { id: 'honor', label: 'تكريم عضو' }
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setStudio((p) => ({ ...p, activity_type: item.id as any }))}
                className={`px-3 py-1.5 rounded-lg font-bold border transition-colors ${
                  studio.activity_type === item.id
                    ? 'bg-cyan-400 text-slate-950 border-cyan-300'
                    : 'bg-white/10 text-slate-200 border-white/15 hover:bg-white/20'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 text-xs">
          <div className="lg:col-span-8">
            <textarea
              rows={2}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="صف الشهادة للذكاء الاصطناعي (مثال: شهادة اجتياز ورشة عمل الأمن السيبراني وحماية البيانات لمدة 8 ساعات بتقدير امتياز بطابع ملكي ذهبي)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-slate-300 focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div className="lg:col-span-4 flex flex-col justify-between gap-2">
            <select
              value={studio.template_style}
              onChange={(e) => {
                const chosen = CERT_STYLE_OPTIONS.find((s) => s.id === e.target.value) || CERT_STYLE_OPTIONS[0];
                setStudio((p) => ({
                  ...p,
                  template_style: chosen.id,
                  primary_color: chosen.primary,
                  accent_color: chosen.accent
                }));
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/20 text-white font-semibold"
            >
              {CERT_STYLE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  قالب التصميم: {opt.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={aiGenerating}
              onClick={runAiCertificateGenerator}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4" />
              <span>{aiGenerating ? 'جارٍ التصميم والصياغة بالذكاء الاصطناعي...' : 'إنشاء الشهادة بالذكاء الاصطناعي'}</span>
            </button>
          </div>
        </div>

        {aiError && (
          <div className="text-xs font-bold text-red-200 bg-red-950/60 border border-red-400/40 px-3.5 py-2.5 rounded-xl">
            {aiError}
          </div>
        )}
      </div>

      {/* Live Preview + Customization & Member Assignment */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Form & Member Picker */}
        <form onSubmit={handleIssueCertificates} className="xl:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-950 font-display">
              تخصيص الشهادة وإصدارها للأعضاء أو بعد التدريبات والورش والدوريات
            </h3>
          </div>

          {/* Link with Trainings / Workshops & Events */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <p className="font-bold text-slate-900 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-blue-700" />
              <span>ربط الشهادة ببرنامج تدريبي أو ورشة عمل أو دوري (اختياري)</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={studio.training_id}
                onChange={(e) => {
                  const id = e.target.value;
                  if (id) selectProgramForStudio('training', id);
                  else setStudio((p) => ({ ...p, training_id: '' }));
                }}
                className="px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="">-- اختيار من البرامج التدريبية ({options.trainings.length}) --</option>
                {options.trainings.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title_ar} ({t.hours} ساعة)
                  </option>
                ))}
              </select>
              <select
                value={studio.event_id}
                onChange={(e) => {
                  const id = e.target.value;
                  if (id) selectProgramForStudio('event', id);
                  else setStudio((p) => ({ ...p, event_id: '' }));
                }}
                className="px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="">-- اختيار من الورش والندوات والدوريات ({options.events.length}) --</option>
                {options.events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title_ar}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Certificate Content Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="font-semibold text-slate-700">عنوان الشهادة الرئيسي *</span>
              <input
                required
                value={studio.title_ar}
                onChange={(e) => setStudio((p) => ({ ...p, title_ar: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-semibold text-slate-700">العنوان الفرعي / الشارة</span>
              <input
                value={studio.subtitle_ar}
                onChange={(e) => setStudio((p) => ({ ...p, subtitle_ar: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </label>
            <label className="block space-y-1 sm:col-span-2">
              <span className="font-semibold text-slate-700">اسم التدريب / الورشة / الدوري *</span>
              <input
                required
                placeholder="مثال: معسكر الأمن السيبراني التطبيقي / ورشة الحماية الرقمية / دوري الوعي التقني"
                value={studio.course_title}
                onChange={(e) => setStudio((p) => ({ ...p, course_title: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </label>
            <label className="block space-y-1 sm:col-span-2">
              <span className="font-semibold text-slate-700">نص الاعتماد على الشهادة</span>
              <textarea
                rows={2}
                value={studio.body_text_ar}
                onChange={(e) => setStudio((p) => ({ ...p, body_text_ar: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-semibold text-slate-700">المدرب / الجهة المانحة</span>
              <input
                value={studio.trainer_name}
                onChange={(e) => setStudio((p) => ({ ...p, trainer_name: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-semibold text-slate-700">تاريخ الإصدار</span>
              <input
                type="date"
                value={studio.issue_date}
                onChange={(e) => setStudio((p) => ({ ...p, issue_date: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-semibold text-slate-700">عدد الساعات (اختياري)</span>
              <input
                type="number"
                min={0}
                value={studio.hours_count}
                onChange={(e) => setStudio((p) => ({ ...p, hours_count: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono-num"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-semibold text-slate-700">التقدير / النتيجة (اختياري)</span>
              <input
                placeholder="مثال: امتياز / اجتياز بنجاح"
                value={studio.grade_ar}
                onChange={(e) => setStudio((p) => ({ ...p, grade_ar: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-semibold text-slate-700">لون الإطار الرئيسي</span>
              <input
                type="color"
                value={studio.primary_color}
                onChange={(e) => setStudio((p) => ({ ...p, primary_color: e.target.value }))}
                className="w-full h-9 rounded border border-slate-300"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-semibold text-slate-700">اللون التمييزي</span>
              <input
                type="color"
                value={studio.accent_color}
                onChange={(e) => setStudio((p) => ({ ...p, accent_color: e.target.value }))}
                className="w-full h-9 rounded border border-slate-300"
              />
            </label>
          </div>

          {/* Recipient Selector Tabs */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold text-slate-900">لمن تُمنح الشهادة؟</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setRecipientMode('members')}
                  className={`px-3 py-1.5 rounded-lg font-bold border ${
                    recipientMode === 'members' ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  اختيار من الأعضاء ({options.members.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientMode('program')}
                  className={`px-3 py-1.5 rounded-lg font-bold border ${
                    recipientMode === 'program' ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  مسجلو التدريب / الورشة
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientMode('manual')}
                  className={`px-3 py-1.5 rounded-lg font-bold border ${
                    recipientMode === 'manual' ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  إدخال يدوي
                </button>
              </div>
            </div>

            {recipientMode === 'members' && (
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="ابحث بالاسم أو رقم العضوية (000001) أو البريد أو اللجنة..."
                    className="flex-1 min-w-[200px] px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedMemberIds(filteredMembers.map((m) => m.id))}
                    className="px-2.5 py-2 border border-slate-300 bg-white hover:bg-slate-100 rounded-lg font-semibold"
                  >
                    تحديد الكل ({filteredMembers.length})
                  </button>
                  {selectedMemberIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedMemberIds([])}
                      className="px-2.5 py-2 border border-red-200 bg-white text-red-600 hover:bg-red-50 rounded-lg font-semibold"
                    >
                      إلغاء ({selectedMemberIds.length})
                    </button>
                  )}
                </div>
                <div className="max-h-52 overflow-y-auto bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {filteredMembers.length === 0 ? (
                    <p className="p-4 text-center text-slate-500">لا يوجد أعضاء مسجلون مطابقون للبحث.</p>
                  ) : (
                    filteredMembers.map((m) => {
                      const checked = selectedMemberIds.includes(m.id);
                      return (
                        <label key={m.id} className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer hover:bg-blue-50/40">
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                setSelectedMemberIds((prev) =>
                                  e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id)
                                )
                              }
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">
                                {m.full_name} <span className="font-mono-num text-blue-700">#{m.member_number}</span>
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {m.committee_name || 'عام'} {m.email ? `· ${m.email}` : ''}
                              </p>
                            </div>
                          </div>
                          {checked && <span className="text-[10px] font-bold text-emerald-700 shrink-0">محدد ✓</span>}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {recipientMode === 'program' && (
              <div className="space-y-2.5">
                {!programSource.id ? (
                  <p className="text-slate-600 bg-white border border-slate-200 rounded-lg p-3">
                    اختر برنامجًا تدريبيًا أو ورشة/فعالية من القسم أعلاه لعرض المشاركين ومنحهم الشهادات دفعة واحدة.
                  </p>
                ) : loadingRegs ? (
                  <p className="text-slate-500 p-3">جارٍ تحميل المشاركين...</p>
                ) : registrants.length === 0 ? (
                  <p className="text-slate-500 bg-white border border-slate-200 rounded-lg p-3">لا يوجد مسجلون في هذا البرنامج حتى الآن.</p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-700">المسجلون ({registrants.length})</span>
                      <button
                        type="button"
                        onClick={() => setSelectedRegIds(registrants.filter((r) => !r.already_certified).map((r) => r.id))}
                        className="px-2.5 py-1 border border-slate-300 bg-white rounded font-semibold"
                      >
                        تحديد غير الممنوحين
                      </button>
                    </div>
                    <div className="max-h-52 overflow-y-auto bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
                      {registrants.map((r) => {
                        const checked = selectedRegIds.includes(r.id);
                        return (
                          <label key={r.id} className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer hover:bg-blue-50/40">
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) =>
                                  setSelectedRegIds((prev) =>
                                    e.target.checked ? [...prev, r.id] : prev.filter((id) => id !== r.id)
                                  )
                                }
                              />
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 truncate">{r.full_name}</p>
                                <p className="text-[11px] text-slate-500 font-mono-num truncate">
                                  {r.email} {r.matched_member_number ? `· عضو #${r.matched_member_number}` : ''}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                                r.already_certified
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : r.status === 'completed'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {r.already_certified
                                ? `تم منحه (${r.certificate_number})`
                                : r.status === 'completed'
                                  ? 'أتم التدريب'
                                  : r.status === 'confirmed'
                                    ? 'مسجل / مقبول'
                                    : 'قيد الانتظار'}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {recipientMode === 'manual' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  placeholder="اسم المستفيد الكامل *"
                  value={manualRecipient.recipient_name}
                  onChange={(e) => setManualRecipient((p) => ({ ...p, recipient_name: e.target.value }))}
                  className="px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
                <input
                  placeholder="البريد الإلكتروني (لربطها بحسابه تلقائيًا إن وجد)"
                  value={manualRecipient.recipient_email}
                  onChange={(e) => setManualRecipient((p) => ({ ...p, recipient_email: e.target.value }))}
                  className="px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={issuing}
            className="w-full py-3 px-5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Award className="w-4 h-4" />
            <span>
              {issuing
                ? 'جارٍ إصدار الشهادات...'
                : recipientMode === 'members'
                  ? `إصدار وإضافة الشهادة للأعضاء المحددين (${selectedMemberIds.length})`
                  : recipientMode === 'program'
                    ? `منح الشهادات للمشاركين المحددين (${selectedRegIds.length})`
                    : 'حفظ وإصدار الشهادة الإلكترونية'}
            </span>
          </button>
        </form>

        {/* Live Certificate Preview */}
        <div className="xl:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-950 font-display">المعاينة الحية للشهادة قبل الإصدار</h3>
            <span className="text-[11px] font-bold text-blue-700">
              {ACTIVITY_TYPE_LABELS[studio.activity_type] || 'برنامج معتمد'}
            </span>
          </div>
          <CertificateView
            compactActions
            qrDataUrl=""
            cert={{
              certificate_number: 'CERT-PREVIEW',
              recipient_name: previewRecipientName,
              course_title: studio.course_title || 'اسم التدريب أو الورشة أو الدوري',
              issue_date: studio.issue_date,
              trainer_name: studio.trainer_name,
              template_style: studio.template_style,
              activity_type: studio.activity_type,
              hours_count: studio.hours_count,
              grade_ar: studio.grade_ar,
              title_ar: studio.title_ar,
              subtitle_ar: studio.subtitle_ar,
              body_text_ar: studio.body_text_ar,
              primary_color: studio.primary_color,
              accent_color: studio.accent_color,
              status: 'valid'
            }}
          />
        </div>
      </div>

      {/* Issued Certificates Registry */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-bold font-display">سجل الشهادات الصادرة ({certs.length})</h3>
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث برقم الشهادة أو الاسم..."
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
            />
            <button type="button" onClick={load} className="px-3 py-1.5 text-xs bg-slate-900 text-white rounded-lg">
              بحث
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-2 px-3 text-start">رقم الشهادة</th>
                <th className="py-2 px-3 text-start">المستفيد</th>
                <th className="py-2 px-3 text-start">البرنامج / النشاط</th>
                <th className="py-2 px-3 text-start">النوع والتقدير</th>
                <th className="py-2 px-3 text-start">التاريخ</th>
                <th className="py-2 px-3 text-start">الحالة</th>
                <th className="py-2 px-3 text-start">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {certs.map((c) => (
                <tr key={c.id}>
                  <td className="py-2 px-3 font-mono-num font-bold text-blue-700">{c.certificate_number}</td>
                  <td className="py-2 px-3">
                    <p className="font-semibold text-slate-900">{c.recipient_name}</p>
                    {c.recipient_email && <p className="text-[11px] text-slate-400 font-mono-num">{c.recipient_email}</p>}
                  </td>
                  <td className="py-2 px-3 font-medium">{c.course_title}</td>
                  <td className="py-2 px-3 text-[11px] text-slate-600">
                    {ACTIVITY_TYPE_LABELS[c.activity_type || 'training'] || 'تدريب'}
                    {c.grade_ar ? ` · ${c.grade_ar}` : ''}
                    {c.hours_count ? ` (${c.hours_count} س)` : ''}
                  </td>
                  <td className="py-2 px-3 font-mono-num">{c.issue_date}</td>
                  <td className="py-2 px-3 font-semibold">{c.status === 'valid' ? 'سارية' : 'ملغاة'}</td>
                  <td className="py-2 px-3 flex flex-wrap gap-2">
                    <a href={`/verify?cert=${c.certificate_number}`} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">
                      عرض / PDF
                    </a>
                    <button type="button" onClick={() => setEditingCert({ ...c })} className="text-indigo-700 font-semibold hover:underline">
                      تعديل
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await apiFetch(`/api/admin/certificates/${c.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: c.status === 'valid' ? 'revoked' : 'valid' })
                        });
                        flashNotice('تم تحديث وحفظ حالة الشهادة ✓');
                        load();
                      }}
                      className="text-amber-700 hover:underline"
                    >
                      {c.status === 'valid' ? 'إلغاء' : 'تفعيل'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await apiFetch(`/api/admin/certificates/${c.id}`, { method: 'DELETE' });
                        flashNotice('تم حذف الشهادة وحفظ التغييرات ✓');
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
      </div>

      {/* Edit Certificate Modal */}
      {editingCert && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-950 font-display">تعديل بيانات الشهادة ({editingCert.certificate_number})</h3>
              <button type="button" onClick={() => setEditingCert(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await apiFetch(`/api/admin/certificates/${editingCert.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(editingCert)
                });
                setEditingCert(null);
                flashNotice('تم حفظ تعديلات الشهادة بنجاح ✓');
                load();
              }}
              className="space-y-3"
            >
              <input required placeholder="اسم المستفيد" value={editingCert.recipient_name || ''} onChange={(e) => setEditingCert({ ...editingCert, recipient_name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              <input placeholder="البريد الإلكتروني" value={editingCert.recipient_email || ''} onChange={(e) => setEditingCert({ ...editingCert, recipient_email: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              <input placeholder="عنوان الشهادة" value={editingCert.title_ar || ''} onChange={(e) => setEditingCert({ ...editingCert, title_ar: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              <input required placeholder="اسم التدريب / الورشة / الدوري" value={editingCert.course_title || ''} onChange={(e) => setEditingCert({ ...editingCert, course_title: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              <textarea rows={2} placeholder="نص الاعتماد" value={editingCert.body_text_ar || ''} onChange={(e) => setEditingCert({ ...editingCert, body_text_ar: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" min={0} placeholder="عدد الساعات" value={editingCert.hours_count || 0} onChange={(e) => setEditingCert({ ...editingCert, hours_count: Number(e.target.value) })} className="px-3 py-2 border border-slate-300 rounded-lg font-mono-num" />
                <input placeholder="التقدير" value={editingCert.grade_ar || ''} onChange={(e) => setEditingCert({ ...editingCert, grade_ar: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={editingCert.issue_date || ''} onChange={(e) => setEditingCert({ ...editingCert, issue_date: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
                <input placeholder="المدرب / الجهة المانحة" value={editingCert.trainer_name || ''} onChange={(e) => setEditingCert({ ...editingCert, trainer_name: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <select value={editingCert.status || 'valid'} onChange={(e) => setEditingCert({ ...editingCert, status: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white">
                <option value="valid">سارية</option>
                <option value="revoked">ملغاة</option>
              </select>
              <button type="submit" className="w-full py-2.5 bg-blue-700 text-white rounded-xl font-semibold inline-flex items-center justify-center gap-1.5">
                <Save className="w-4 h-4" /> حفظ التعديلات
              </button>
            </form>
          </div>
        </div>
      )}
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
  const [editingPartner, setEditingPartner] = useState<any | null>(null);
  const [notice, setNotice] = useState('');

  const flashNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3200);
  };

  const load = () => apiFetch('/api/admin/partners').then((r) => r.json()).then((d) => setPartners(Array.isArray(d) ? d : []));
  useEffect(() => { load(); }, []);

  const saveMarquee = async () => {
    await apiFetch('/api/admin/marquee-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(marquee)
    });
    await refreshBootstrap();
    flashNotice('تم حفظ إعدادات الشريط المتحرك والشركاء بنجاح ✓');
  };

  const saveEditPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPartner) return;
    await apiFetch(`/api/admin/partners/${editingPartner.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name_ar: editingPartner.name_ar,
        name_en: editingPartner.name_en,
        partner_type: editingPartner.partner_type,
        description_ar: editingPartner.description_ar,
        description_en: editingPartner.description_en,
        logo_url: editingPartner.logo_url,
        website_url: editingPartner.website_url,
        marquee_order: Number(editingPartner.marquee_order ?? 10),
        show_in_marquee: Boolean(editingPartner.show_in_marquee),
        is_visible: Boolean(editingPartner.is_visible)
      })
    });
    setEditingPartner(null);
    flashNotice('تم حفظ تعديلات بيانات الشريك وموقعه الإلكتروني بنجاح ✓');
    load();
    refreshBootstrap();
  };

  return (
    <div className="space-y-6">
      <AdminSectionSaveBar
        sectionName="الشركاء والشريط المتحرك"
        notice={notice}
        saveLabel="حفظ جميع التغييرات"
        onSave={async () => {
          await saveMarquee();
          await load();
        }}
      />

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
          flashNotice('تم حفظ وإضافة الشريك وموقعه الإلكتروني بنجاح ✓');
          load();
          refreshBootstrap();
        }}
        className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 text-xs"
      >
        <div>
          <h3 className="text-base font-bold text-slate-950 font-display">إضافة جهة / وزارة / شركة / شريك / داعم جديد</h3>
          <p className="text-slate-500 mt-0.5">
            أضف اسم الجهة ورابط موقعها الإلكتروني (اختياري) ليتمكن الزوار من متابعة موقع الشريك أو الوزارة عند الضغط على شعاره.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input required placeholder="اسم الجهة بالعربية *" value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
          <input placeholder="الاسم بالإنجليزية (اختياري)" value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
          <select value={form.partner_type} onChange={(e) => setForm({ ...form, partner_type: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg bg-white">
            <option value="partner">شريك استراتيجي</option>
            <option value="corporate">شركة</option>
            <option value="civil_society">مؤسسة / جمعية</option>
            <option value="government">وزارة / جهة حكومية</option>
            <option value="academic">جهة تعليمية</option>
            <option value="supporter">داعم</option>
          </select>
          <input type="number" placeholder="ترتيب الظهور" value={form.marquee_order} onChange={(e) => setForm({ ...form, marquee_order: Number(e.target.value) })} className="px-3 py-2 border border-slate-300 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input dir="ltr" placeholder="رابط الموقع الإلكتروني للشريك (مثال: https://www.moss.gov.eg)" value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg font-mono-num" />
          <input placeholder="نبذة مختصرة عن الشريك ودوره (اختياري)" value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          <label className="flex items-center justify-center gap-2 border border-dashed border-slate-300 rounded-lg py-2.5 cursor-pointer hover:bg-slate-50">
            <Upload className="w-4 h-4 text-blue-700" />
            <span>{form.logo_url ? 'تم رفع الشعار ✓' : 'رفع شعار الجهة *'}</span>
            <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setForm({ ...form, logo_url: await uploadAdminFile(f, 'logos') }); }} />
          </label>
          <label className="flex items-center gap-2 font-semibold">
            <input type="checkbox" checked={form.show_in_marquee} onChange={(e) => setForm({ ...form, show_in_marquee: e.target.checked })} />
            <span>إظهار الشعار تلقائيًا في الشريط المتحرك</span>
          </label>
        </div>
        <button type="submit" disabled={!form.logo_url} className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold disabled:opacity-50">
          <Save className="w-4 h-4" /> حفظ وإضافة الشريك
        </button>
      </form>

      {/* Partners List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {partners.map((p) => {
          const siteUrl = normalizeExternalUrl(p.website_url);
          return (
            <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3 text-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img src={p.logo_url} alt={p.name_ar} className="w-12 h-12 object-contain border border-slate-100 rounded-lg p-1 shrink-0 bg-white" />
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-bold text-slate-900 truncate">{p.name_ar}</p>
                    <p className="text-slate-500">ترتيب: {p.marquee_order} · {p.show_in_marquee ? 'ظاهر بالشريط' : 'مخفي من الشريط'}</p>
                    {siteUrl ? (
                      <a
                        href={siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        dir="ltr"
                        className="inline-flex items-center gap-1 text-[11px] font-mono-num text-blue-700 hover:underline max-w-full truncate"
                      >
                        <Globe className="w-3 h-3 shrink-0" />
                        <span className="truncate">{siteUrl}</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400">لا يوجد موقع إلكتروني مضاف — اضغط تعديل لإضافته</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPartner({ ...p, show_in_marquee: Boolean(p.show_in_marquee), is_visible: Boolean(p.is_visible) })}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 rounded-lg font-semibold"
                >
                  <Edit3 className="w-3.5 h-3.5" /> تعديل البيانات والموقع
                </button>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={async () => {
                      await apiFetch(`/api/admin/partners/${p.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ show_in_marquee: !p.show_in_marquee })
                      });
                      flashNotice('تم تحديث وحفظ ظهور الشريك في الشريط ✓');
                      load();
                      refreshBootstrap();
                    }}
                    className="px-2.5 py-1 border border-slate-300 rounded-md hover:bg-slate-50"
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
                      flashNotice('تم تحديث وحفظ حالة الشريك ✓');
                      load();
                      refreshBootstrap();
                    }}
                    className="px-2.5 py-1 border border-slate-300 rounded-md hover:bg-slate-50"
                  >
                    {p.is_visible ? 'إخفاء' : 'تفعيل'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await apiFetch(`/api/admin/partners/${p.id}`, { method: 'DELETE' });
                      flashNotice('تم حذف الشريك وحفظ التغييرات ✓');
                      load();
                      refreshBootstrap();
                    }}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"
                    title="حذف الشريك"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Partner Modal */}
      {editingPartner && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 max-h-[92vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-950 font-display">تعديل بيانات الشريك / الجهة: {editingPartner.name_ar}</h3>
              <button type="button" onClick={() => setEditingPartner(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={saveEditPartner} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">اسم الجهة / الشريك (عربي) *</label>
                <input required value={editingPartner.name_ar || ''} onChange={(e) => setEditingPartner({ ...editingPartner, name_ar: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">الاسم بالإنجليزية</label>
                <input value={editingPartner.name_en || ''} onChange={(e) => setEditingPartner({ ...editingPartner, name_en: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">تصنيف الجهة</label>
                  <select value={editingPartner.partner_type || 'partner'} onChange={(e) => setEditingPartner({ ...editingPartner, partner_type: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white">
                    <option value="umbrella">المظلة الرسمية</option>
                    <option value="government">وزارة / جهة حكومية</option>
                    <option value="partner">شريك استراتيجي</option>
                    <option value="corporate">شركة</option>
                    <option value="civil_society">مؤسسة / جمعية</option>
                    <option value="academic">جهة تعليمية</option>
                    <option value="supporter">داعم</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ترتيب الظهور</label>
                  <input type="number" value={editingPartner.marquee_order ?? 10} onChange={(e) => setEditingPartner({ ...editingPartner, marquee_order: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">رابط الموقع الإلكتروني للشريك (اتركه فارغًا إن لم يوجد)</label>
                <input
                  dir="ltr"
                  placeholder="https://www.moss.gov.eg"
                  value={editingPartner.website_url === '/' ? '' : editingPartner.website_url || ''}
                  onChange={(e) => setEditingPartner({ ...editingPartner, website_url: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono-num"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">الوصف بالعربية</label>
                <textarea rows={2} value={editingPartner.description_ar || ''} onChange={(e) => setEditingPartner({ ...editingPartner, description_ar: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                <img src={editingPartner.logo_url} alt={editingPartner.name_ar} className="w-12 h-12 object-contain bg-white border rounded-lg p-1 shrink-0" />
                <label className="flex-1 flex items-center justify-center gap-1.5 border border-dashed border-blue-400 bg-white rounded-lg py-2 cursor-pointer font-semibold text-blue-800">
                  <Upload className="w-3.5 h-3.5" />
                  <span>تغيير / استبدال شعار الشريك</span>
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setEditingPartner({ ...editingPartner, logo_url: await uploadAdminFile(f, 'logos') }); }} />
                </label>
              </div>
              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 font-semibold cursor-pointer">
                  <input type="checkbox" checked={Boolean(editingPartner.show_in_marquee)} onChange={(e) => setEditingPartner({ ...editingPartner, show_in_marquee: e.target.checked })} />
                  <span>إظهار بالشريط المتحرك</span>
                </label>
                <label className="flex items-center gap-2 font-semibold cursor-pointer">
                  <input type="checkbox" checked={Boolean(editingPartner.is_visible)} onChange={(e) => setEditingPartner({ ...editingPartner, is_visible: e.target.checked })} />
                  <span>ظاهر في صفحة الشركاء</span>
                </label>
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
