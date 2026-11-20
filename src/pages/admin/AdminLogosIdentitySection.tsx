import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  Layers,
  Plus,
  Save,
  Share2,
  Sparkles,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { apiFetch } from '../../lib/authFetch';
import { uploadAdminFile } from './adminHelpers';
import { SafeImage } from '../../components/SafeImage';
import { AdminSectionSaveBar } from './AdminSectionSaveBar';
import type { BrandLogo } from '../../types';

const ROLE_OPTIONS = [
  { value: 'main', label: 'الشعار الرئيسي للمبادرة' },
  { value: 'favicon', label: 'أيقونة الموقع (Favicon)' },
  { value: 'og_share', label: 'شعار / صورة مشاركة الروابط' },
  { value: 'home', label: 'شعار الصفحة الرئيسية' },
  { value: 'umbrella', label: 'شعار المظلة الرسمية / الاتحاد' },
  { value: 'ministry', label: 'شعار وزارة / جهة إشرافية' },
  { value: 'partner', label: 'شعار جهة شريكة' },
  { value: 'custom', label: 'شعار مخصص للأخبار أو المبادرات' }
];

const PLACEMENT_OPTIONS = [
  { value: 'header_home_share', label: 'الهيدر + الرئيسية + المشاركة' },
  { value: 'footer_home_partners', label: 'الرئيسية + الفوتر + الشركاء' },
  { value: 'home_featured', label: 'الصفحة الرئيسية فقط' },
  { value: 'partners_strip', label: 'شريط الجهات الشريكة والوزارات' },
  { value: 'news_initiatives', label: 'الأخبار والمبادرات' },
  { value: 'general', label: 'عام / أرشيف الشعارات' }
];

export const AdminLogosIdentitySection: React.FC = () => {
  const { settings, refreshBootstrap } = useApp();
  const [logos, setLogos] = useState<BrandLogo[]>([]);
  const [slots, setSlots] = useState<Record<string, string>>({
    logo_url: '',
    favicon_url: '',
    og_image_url: '',
    home_logo_url: '',
    umbrella_logo_url: '',
    ministry_logo_url: ''
  });
  const [savingSlots, setSavingSlots] = useState(false);
  const [notice, setNotice] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BrandLogo | null>(null);
  const [form, setForm] = useState({
    title_ar: '',
    title_en: '',
    role_key: 'partner',
    logo_url: '',
    alt_text: '',
    placement: 'general',
    sort_order: 10,
    is_active: true,
    assign_slot: ''
  });

  const load = async () => {
    const res = await apiFetch('/api/admin/brand-logos');
    if (res.ok) {
      const data = await res.json();
      setLogos(Array.isArray(data.logos) ? data.logos : []);
      setSlots({
        logo_url: data.settings?.logo_url || '',
        favicon_url: data.settings?.favicon_url || data.settings?.logo_url || '',
        og_image_url: data.settings?.og_image_url || data.settings?.logo_url || '',
        home_logo_url: data.settings?.home_logo_url || data.settings?.logo_url || '',
        umbrella_logo_url: data.settings?.umbrella_logo_url || '',
        ministry_logo_url: data.settings?.ministry_logo_url || ''
      });
    }
  };

  useEffect(() => {
    load();
  }, []);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3500);
  };

  const saveQuickSlots = async () => {
    setSavingSlots(true);
    try {
      const res = await apiFetch('/api/admin/brand-logos/quick-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slots)
      });
      if (res.ok) {
        await refreshBootstrap();
        flash('تم حفظ توزيع الشعارات والأيقونات وتحديث الموقع الفوري بنجاح ✓');
      }
    } finally {
      setSavingSlots(false);
    }
  };

  const uploadToSlot = async (slotKey: string, file: File) => {
    const url = await uploadAdminFile(file, 'logos');
    const nextSlots = { ...slots, [slotKey]: url };
    setSlots(nextSlots);
    await apiFetch('/api/admin/brand-logos/quick-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [slotKey]: url })
    });
    await refreshBootstrap();
    flash('تم رفع الشعار الجديد وحفظه مباشرة في قاعدة البيانات ✓');
  };

  const assignLogoToSlot = async (logoId: number, slot: string, slotLabel: string) => {
    const res = await apiFetch(`/api/admin/brand-logos/${logoId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot })
    });
    if (res.ok) {
      await load();
      await refreshBootstrap();
      flash(`تم تعيين الشعار بنجاح لخانة: ${slotLabel} ✓`);
    }
  };

  const saveLogoModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.logo_url) return;
    const url = editing ? `/api/admin/brand-logos/${editing.id}` : '/api/admin/brand-logos';
    const res = await apiFetch(url, {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      setModalOpen(false);
      await load();
      await refreshBootstrap();
      flash(editing ? 'تم تعديل الشعار وتحديث الموقع ✓' : 'تمت إضافة الشعار الجديد بنجاح ✓');
    }
  };

  const deleteLogo = async (id: number) => {
    await apiFetch(`/api/admin/brand-logos/${id}`, { method: 'DELETE' });
    await load();
    await refreshBootstrap();
    flash('تم حذف الشعار بنجاح');
  };

  const slotCards = [
    { key: 'logo_url', title: 'الشعار الرئيسي للمنصة', desc: 'يظهر في شريط التنقل العلوي، التذييل، ونتائج بحث Google (Organization)', accept: 'image/*' },
    { key: 'favicon_url', title: 'أيقونة الموقع (Favicon)', desc: 'تظهر في تبويب المتصفح ونتائج البحث والمفضلة (PNG / JPG / SVG)', accept: 'image/png,image/jpeg,image/svg+xml,image/webp,image/x-icon' },
    { key: 'og_image_url', title: 'شعار / صورة مشاركة الرابط', desc: 'تظهر تلقائيًا عند مشاركة رابط الموقع عبر واتساب وفيسبوك وتيليجرام', accept: 'image/*' },
    { key: 'home_logo_url', title: 'شعار الصفحة الرئيسية', desc: 'الشعار الرسمي المعروض في بطاقة الهوية بالصفحة الرئيسية', accept: 'image/*' },
    { key: 'umbrella_logo_url', title: 'شعار المظلة (حكاية وطن)', desc: 'شعار الاتحاد النوعي المشهر برقم 1279 لسنة 2025', accept: 'image/*' },
    { key: 'ministry_logo_url', title: 'شعار وزارة التضامن الاجتماعي', desc: 'شعار الجهة الإشرافية الرسمية للمبادرة', accept: 'image/*' }
  ];

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://generation-digital-safe.ai.studio';
  const sharePreviewImg = slots.og_image_url || slots.logo_url || '/assets/aistudio/FB_IMG_1789831319399_ac126220.jpg';

  return (
    <div className="space-y-8 text-xs">
      <AdminSectionSaveBar
        sectionName="إدارة الشعارات والهوية البصرية"
        notice={notice}
        onSave={saveQuickSlots}
        saving={savingSlots}
        saveLabel="حفظ الشعارات والهوية"
      />

      {/* 1. Primary Brand Slots */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-950 font-display flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-700" />
              <span>التحكم الفوري في شعارات المنصة الأساسية</span>
            </h2>
            <p className="text-slate-500 mt-0.5">
              أي تعديل هنا يُحفظ مباشرة في قاعدة البيانات وينعكس فورًا على الهيدر، الصفحة الرئيسية، Favicon، ومشاركة الروابط.
            </p>
          </div>
          <button
            type="button"
            disabled={savingSlots}
            onClick={saveQuickSlots}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-semibold disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{savingSlots ? 'جارٍ الحفظ...' : 'حفظ جميع الشعارات'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {slotCards.map((slot) => (
            <div key={slot.key} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 p-1.5 flex items-center justify-center shrink-0 overflow-hidden">
                  <SafeImage src={slots[slot.key]} alt={slot.title} className="w-full h-full object-contain" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-950">{slot.title}</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">{slot.desc}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-dashed border-blue-400 hover:bg-blue-50 text-blue-800 font-semibold rounded-lg cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>رفع / استبدال من الجهاز</span>
                  <input
                    type="file"
                    accept={slot.accept}
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) await uploadToSlot(slot.key, f);
                    }}
                  />
                </label>
              </div>
              <input
                value={slots[slot.key] || ''}
                onChange={(e) => setSlots({ ...slots, [slot.key]: e.target.value })}
                placeholder="أو رابط HTTPS مباشر للشعار..."
                dir="ltr"
                className="w-full px-2.5 py-1.5 text-[11px] font-mono-num bg-white border border-slate-200 rounded-lg text-slate-600"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 2. Live Link Share Preview (WhatsApp / Facebook / Google) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-950 font-display flex items-center gap-2">
              <Share2 className="w-4 h-4 text-emerald-600" />
              <span>معاينة مشاركة رابط المنصة (واتساب / فيسبوك / تيليجرام)</span>
            </h3>
            <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
              Open Graph + Twitter Cards مفعّلة
            </span>
          </div>

          <div className="max-w-md border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
            <div className="aspect-[1.91/1] bg-white border-b border-slate-200 flex items-center justify-center p-4 overflow-hidden">
              <SafeImage src={sharePreviewImg} alt="معاينة المشاركة" className="max-h-full w-auto object-contain" />
            </div>
            <div className="p-3.5 space-y-1">
              <p className="text-[10px] font-mono-num text-slate-500 truncate" dir="ltr">
                {origin}
              </p>
              <p className="text-sm font-bold text-slate-950 line-clamp-1">
                {settings.seo_title || 'جيل رقمي آمن — معًا لمستقبل رقمي آمن | SAFE DIGITAL GENERATION'}
              </p>
              <p className="text-[11px] text-slate-600 line-clamp-2">
                {settings.seo_description ||
                  'المنصة الرسمية لمبادرة جيل رقمي آمن تحت مظلة الاتحاد النوعي حكاية وطن (1279 لسنة 2025) بوزارة التضامن الاجتماعي.'}
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-950 font-display flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-700" />
            <span>جاهزية الظهور في محرك بحث Google</span>
          </h3>
          <p className="text-slate-600 leading-relaxed">
            المنصة مهيأة ببيانات Schema.org (`Organization` و `NewsArticle`) وملف تحقق Google Search Console ومخطط الموقع:
          </p>
          <div className="space-y-2 text-[11px]">
            {[
              { label: 'ملف إثبات ملكية Google HTML', href: '/googlef3c013b384f88d85.html' },
              { label: 'ملف Web App Manifest المعتمد', href: '/manifest.webmanifest' },
              { label: 'خريطة الموقع XML Sitemap', href: '/sitemap.xml' },
              { label: 'ملف فهرسة محركات البحث robots.txt', href: '/robots.txt' }
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
              >
                <span>{item.label}</span>
                <ExternalLink className="w-3.5 h-3.5 text-blue-700" />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Full Logos Registry (Add / Edit / Replace / Sort / Assign / Delete) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-950 font-display flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-700" />
              <span>سجل الشعارات والجهات الشريكة والوزارات ({logos.length})</span>
            </h3>
            <p className="text-slate-500 mt-0.5">
              أضف شعارات المبادرة والاتحادات والوزارات والشركاء من الهاتف أو الكمبيوتر، وتحكم في ترتيبها وأماكن ظهورها.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setForm({
                title_ar: '',
                title_en: '',
                role_key: 'partner',
                logo_url: '',
                alt_text: '',
                placement: 'partners_strip',
                sort_order: logos.length + 1,
                is_active: true,
                assign_slot: ''
              });
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة شعار جديد</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {logos.map((logo) => (
            <div key={logo.id} className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-4 bg-white">
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 p-1.5 flex items-center justify-center shrink-0 overflow-hidden">
                  <SafeImage src={logo.logo_url} alt={logo.alt_text || logo.title_ar} className="w-full h-full object-contain" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="font-bold text-slate-950 truncate">{logo.title_ar}</p>
                    <span className="font-mono-num text-[10px] text-slate-400">#{logo.sort_order}</span>
                  </div>
                  <p className="text-[11px] text-blue-700 font-medium">
                    {ROLE_OPTIONS.find((r) => r.value === logo.role_key)?.label || logo.role_key}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {PLACEMENT_OPTIONS.find((p) => p.value === logo.placement)?.label || logo.placement}
                  </p>
                  <span
                    className={`inline-block text-[10px] px-2 py-0.5 rounded font-semibold ${
                      logo.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {logo.is_active ? 'مفعّل' : 'مخفي'}
                  </span>
                </div>
              </div>

              {/* Quick Assign Actions */}
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => assignLogoToSlot(logo.id, 'main', 'الشعار الرئيسي')}
                  className="px-2 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-800 rounded"
                >
                  تعيين كرئيسي
                </button>
                <button
                  type="button"
                  onClick={() => assignLogoToSlot(logo.id, 'favicon', 'Favicon')}
                  className="px-2 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-800 rounded"
                >
                  Favicon
                </button>
                <button
                  type="button"
                  onClick={() => assignLogoToSlot(logo.id, 'og_share', 'شعار المشاركة')}
                  className="px-2 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-800 rounded"
                >
                  شعار المشاركة
                </button>
                <button
                  type="button"
                  onClick={() => assignLogoToSlot(logo.id, 'home', 'الصفحة الرئيسية')}
                  className="px-2 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-800 rounded"
                >
                  للرئيسية
                </button>
              </div>

              {/* Edit & Delete */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(logo);
                    setForm({
                      title_ar: logo.title_ar,
                      title_en: logo.title_en || '',
                      role_key: logo.role_key || 'partner',
                      logo_url: logo.logo_url,
                      alt_text: logo.alt_text || '',
                      placement: logo.placement || 'general',
                      sort_order: logo.sort_order || 0,
                      is_active: Boolean(logo.is_active),
                      assign_slot: ''
                    });
                    setModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 text-blue-700 font-semibold hover:underline"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>تعديل / استبدال</span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteLogo(logo.id)}
                  className="inline-flex items-center gap-1 text-red-600 hover:underline"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit Brand Logo Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-950 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-700" />
                <span>{editing ? 'تعديل أو استبدال الشعار' : 'إضافة شعار جديد للهوية البصرية'}</span>
              </h3>
              <button type="button" onClick={() => setModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={saveLogoModal} className="space-y-3">
              <input
                required
                placeholder="اسم الشعار أو الجهة (مثال: شعار مبادرة جيل رقمي آمن)"
                value={form.title_ar}
                onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
              <input
                placeholder="الاسم بالإنجليزية (اختياري)"
                value={form.title_en}
                onChange={(e) => setForm({ ...form, title_en: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">تصنيف / دور الشعار</label>
                  <select
                    value={form.role_key}
                    onChange={(e) => setForm({ ...form, role_key: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {ROLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">مكان الظهور</label>
                  <select
                    value={form.placement}
                    onChange={(e) => setForm({ ...form, placement: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {PLACEMENT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <input
                placeholder="النص البديل لمحركات البحث (Alt Text)"
                value={form.alt_text}
                onChange={(e) => setForm({ ...form, alt_text: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ترتيب العرض</label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <label className="flex items-center gap-2 pt-5 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  />
                  <span>مفعّل ويظهر بالموقع</span>
                </label>
              </div>

              {!editing && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">تعيين تلقائي فوري (اختياري)</label>
                  <select
                    value={form.assign_slot}
                    onChange={(e) => setForm({ ...form, assign_slot: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">-- حفظ في سجل الشعارات فقط --</option>
                    <option value="main">تعيين كالشعار الرئيسي للمنصة</option>
                    <option value="favicon">تعيين كأيقونة Favicon</option>
                    <option value="og_share">تعيين كشعار مشاركة الروابط</option>
                    <option value="home">تعيين كشعار الصفحة الرئيسية</option>
                    <option value="umbrella">تعيين كشعار المظلة الرسمية</option>
                    <option value="ministry">تعيين كشعار وزارة التضامن</option>
                  </select>
                </div>
              )}

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                {form.logo_url && (
                  <div className="flex items-center gap-3">
                    <SafeImage src={form.logo_url} alt="معاينة الشعار" className="w-16 h-16 object-contain rounded-lg bg-white border p-1" />
                    <span className="text-[11px] font-mono-num text-slate-500 break-all">{form.logo_url}</span>
                  </div>
                )}
                <label className="flex items-center justify-center gap-2 border border-dashed border-blue-400 bg-white rounded-lg py-2.5 cursor-pointer text-blue-800 font-semibold">
                  <Upload className="w-4 h-4" />
                  <span>{form.logo_url ? 'استبدال صورة الشعار من الهاتف / الكمبيوتر' : 'رفع صورة الشعار من الهاتف / الكمبيوتر'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const uploaded = await uploadAdminFile(f, 'logos');
                        setForm((prev) => ({ ...prev, logo_url: uploaded }));
                      }
                    }}
                  />
                </label>
              </div>

              <button type="submit" disabled={!form.logo_url} className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-semibold disabled:opacity-50">
                {editing ? 'حفظ التعديلات' : 'إضافة الشعار'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
