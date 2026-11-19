import React, { useEffect, useState } from 'react';
import { Plus, Save, Trash2, Upload } from 'lucide-react';
import { ElectronicCardView, type ExtraCardField } from '../../components/ElectronicCardView';
import { uploadAdminFile } from './adminHelpers';
import { apiFetch } from '../../lib/authFetch';
import type { CardDesign, CardLogo } from '../../types';

function parseExtraFields(raw?: string): ExtraCardField[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export const AdminCardDesignerSection: React.FC = () => {
  const [cards, setCards] = useState<any[]>([]);
  const [designs, setDesigns] = useState<CardDesign[]>([]);
  const [logos, setLogos] = useState<CardLogo[]>([]);
  const [activeDesign, setActiveDesign] = useState<CardDesign | null>(null);
  const [partnersLibrary, setPartnersLibrary] = useState<any[]>([]);
  const [newExtraField, setNewExtraField] = useState<ExtraCardField>({ label: '', value: '' });
  const [newLogo, setNewLogo] = useState({
    name: '',
    logo_url: '',
    side: 'front' as 'front' | 'back' | 'both',
    card_type: 'all',
    x_percent: 60,
    y_percent: 8,
    width_px: 42,
    height_px: 42,
    sort_order: 10
  });
  const [savedMsg, setSavedMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [res, pRes] = await Promise.all([apiFetch('/api/admin/cards'), apiFetch('/api/public/partners')]);
    const data = await res.json();
    const partners = await pRes.json();
    setCards(data.cards || []);
    setDesigns(data.designs || []);
    setLogos(data.logos || []);
    if (data.designs?.[0]) {
      setActiveDesign((prev) => {
        const fresh = data.designs[0] as CardDesign;
        return prev ? { ...fresh, ...prev, id: fresh.id } : fresh;
      });
    }
    setPartnersLibrary(Array.isArray(partners) ? partners : []);
  };

  useEffect(() => {
    load();
  }, []);

  const updateDesignField = <K extends keyof CardDesign>(key: K, val: CardDesign[K]) => {
    setActiveDesign((prev) => (prev ? { ...prev, [key]: val } : prev));
  };

  const extraFields = parseExtraFields(activeDesign?.extra_rows_json);

  const addExtraField = () => {
    if (!activeDesign || !newExtraField.label.trim() || !newExtraField.value.trim()) return;
    const next = [...extraFields, { label: newExtraField.label.trim(), value: newExtraField.value.trim() }];
    updateDesignField('extra_rows_json', JSON.stringify(next));
    setNewExtraField({ label: '', value: '' });
  };

  const removeExtraField = (index: number) => {
    if (!activeDesign) return;
    const next = extraFields.filter((_, i) => i !== index);
    updateDesignField('extra_rows_json', JSON.stringify(next));
  };

  const saveDesign = async () => {
    if (!activeDesign) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/admin/card-designs/${activeDesign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeDesign)
      });
      if (res.ok) {
        const updated = (await res.json()) as CardDesign;
        setActiveDesign(updated);
        setSavedMsg('تم حفظ كافة التعديلات على تصميم الكارنيه بنجاح');
        setTimeout(() => setSavedMsg(''), 3000);
      }
      const listRes = await apiFetch('/api/admin/cards');
      if (listRes.ok) {
        const data = await listRes.json();
        setDesigns(data.designs || []);
      }
    } finally {
      setSaving(false);
    }
  };

  const addLogo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogo.name || !newLogo.logo_url) return;
    const res = await apiFetch('/api/admin/card-logos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLogo)
    });
    if (res.ok) {
      const created = (await res.json()) as CardLogo;
      setLogos((prev) => [...prev, created].sort((a, b) => a.sort_order - b.sort_order));
      setNewLogo({
        name: '',
        logo_url: '',
        side: 'front',
        card_type: 'all',
        x_percent: 60,
        y_percent: 8,
        width_px: 42,
        height_px: 42,
        sort_order: 10
      });
    }
  };

  const updateLogo = async (logo: CardLogo) => {
    await apiFetch(`/api/admin/card-logos/${logo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logo)
    });
  };

  const deleteLogo = async (id: number) => {
    await apiFetch(`/api/admin/card-logos/${id}`, { method: 'DELETE' });
    setLogos((prev) => prev.filter((l) => l.id !== id));
  };

  const updateCardStatus = async (id: number, status: string) => {
    await apiFetch(`/api/admin/cards/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    load();
  };

  const renewCard = async (id: number) => {
    const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await apiFetch(`/api/admin/cards/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active', expiry_date: nextYear })
    });
    load();
  };

  const latestIssued = cards[0];
  const sampleMember = {
    full_name: latestIssued?.full_name || 'معاذ محمود فتحي أحمد',
    member_number: latestIssued?.member_number || '000001',
    card_number: latestIssued?.card_number || 'CARD-2026-PREVIEW',
    committee_name: latestIssued?.committee_name || 'لجنة التكنولوجيا',
    position_title: latestIssued?.position_title || 'عضو عامل',
    governorate: 'القاهرة',
    avatar_url: latestIssued?.avatar_url || '',
    issue_date: latestIssued?.issue_date || '2026-01-01',
    expiry_date: latestIssued?.expiry_date || '2027-01-01'
  };

  return (
    <div className="space-y-8">
      {/* Live Designer + Controls */}
      {activeDesign && (
        <div className="space-y-6">
          {/* Full-Width Clear Live Preview */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-slate-950 font-display">
                معاينة الكارنيه قبل الإصدار (أي تعديل هنا يُطبق فورًا على الكارنيه)
              </h2>
              {savedMsg && <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">{savedMsg}</span>}
            </div>

            <div className="flex justify-center py-2">
              <ElectronicCardView member={sampleMember} design={activeDesign} logos={logos} qrDataUrl="" allowDownload={true} />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Design Form */}
            <div className="xl:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
              <h3 className="text-base font-bold text-slate-950 font-display">تخصيص الألوان والنصوص والحقول على الكارنيه</h3>
              {/* Colors & Display Settings */}
              <div className="space-y-5 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <label className="space-y-1 block">
                  <span className="font-semibold text-slate-700">خلفية الأمام</span>
                  <input
                    type="color"
                    value={activeDesign.front_bg}
                    onChange={(e) => updateDesignField('front_bg', e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-300"
                  />
                </label>
                <label className="space-y-1 block">
                  <span className="font-semibold text-slate-700">خلفية الخلف</span>
                  <input
                    type="color"
                    value={activeDesign.back_bg}
                    onChange={(e) => updateDesignField('back_bg', e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-300"
                  />
                </label>
                <label className="space-y-1 block">
                  <span className="font-semibold text-slate-700">اللون التمييزي</span>
                  <input
                    type="color"
                    value={activeDesign.accent_color}
                    onChange={(e) => updateDesignField('accent_color', e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-300"
                  />
                </label>
                <label className="space-y-1 block">
                  <span className="font-semibold text-slate-700">لون النص الأساسي</span>
                  <input
                    type="color"
                    value={activeDesign.text_color}
                    onChange={(e) => updateDesignField('text_color', e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-300"
                  />
                </label>
              </div>

              {/* Front Texts */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="font-bold text-slate-900">نصوص وعناوين الوجه الأمامي</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="block space-y-1">
                    <span className="font-semibold text-slate-700">اسم المبادرة (عربي)</span>
                    <input
                      value={activeDesign.header_title_ar ?? 'جيل رقمي آمن'}
                      onChange={(e) => updateDesignField('header_title_ar', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="font-semibold text-slate-700">اسم المبادرة (إنجليزي)</span>
                    <input
                      dir="ltr"
                      value={activeDesign.header_title_en ?? 'SAFE DIGITAL GENERATION'}
                      onChange={(e) => updateDesignField('header_title_en', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="font-semibold text-slate-700">الشعار أسفل الاسم</span>
                    <input
                      value={activeDesign.header_subtitle_ar ?? 'معًا لمستقبل رقمي آمن'}
                      onChange={(e) => updateDesignField('header_subtitle_ar', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="block space-y-1">
                    <span className="font-semibold text-slate-700">عنوان الشريط الذهبي</span>
                    <input
                      value={activeDesign.card_badge_ar ?? 'كارنيه عضوية'}
                      onChange={(e) => updateDesignField('card_badge_ar', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="font-semibold text-slate-700">عبارة الدرع الجانبي</span>
                    <input
                      value={activeDesign.side_slogan_ar ?? 'جيل واعٍ .. مجتمع أكثر أماناً'}
                      onChange={(e) => updateDesignField('side_slogan_ar', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="font-semibold text-slate-700">شارة التحقق أسفل QR</span>
                    <input
                      value={activeDesign.verify_badge_ar ?? 'تحقق من صحة الكارنيه'}
                      onChange={(e) => updateDesignField('verify_badge_ar', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </label>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">نص المظلة الرسمية أعلى يمين الكارنيه</label>
                  <input
                    value={activeDesign.footer_note_ar}
                    onChange={(e) => updateDesignField('footer_note_ar', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              {/* Leadership Signatures */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="font-bold text-slate-900">توقيعات وأسماء القيادة أسفل الكارنيه</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="block space-y-1">
                      <span className="font-semibold text-slate-700">المسمى الوظيفي للرئيس</span>
                      <input
                        value={activeDesign.president_title_ar ?? 'رئيس المبادرة'}
                        onChange={(e) => updateDesignField('president_title_ar', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="font-semibold text-slate-700">اسم رئيس المبادرة</span>
                      <input
                        value={activeDesign.president_name_ar ?? 'أ. معاذ الشرقاوي'}
                        onChange={(e) => updateDesignField('president_name_ar', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </label>
                  </div>
                  <div className="space-y-2">
                    <label className="block space-y-1">
                      <span className="font-semibold text-slate-700">المسمى الوظيفي للنواب</span>
                      <input
                        value={activeDesign.vp_title_ar ?? 'نائب رئيس المبادرة'}
                        onChange={(e) => updateDesignField('vp_title_ar', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="font-semibold text-slate-700">أسماء النواب (اسم في كل سطر)</span>
                      <textarea
                        rows={3}
                        value={activeDesign.vp_names_ar ?? 'د. داليا نصار\nأ. أحمد نصار\nأ. أماني عبد الفتاح'}
                        onChange={(e) => updateDesignField('vp_names_ar', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Back Side Texts */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="font-bold text-slate-900">نصوص الوجه الخلفي للكارنيه</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block space-y-1">
                    <span className="font-semibold text-slate-700">عنوان الشريط الذهبي العلوي</span>
                    <input
                      value={activeDesign.back_title_ar ?? 'شركاء النجاح والشراكات المؤسسية'}
                      onChange={(e) => updateDesignField('back_title_ar', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="font-semibold text-slate-700">شعار الشريط الذهبي السفلي</span>
                    <input
                      value={activeDesign.back_slogan_ar ?? 'معاً ... نبني مجتمعاً رقمياً آمناً'}
                      onChange={(e) => updateDesignField('back_slogan_ar', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </label>
                </div>
              </div>

              {/* Custom Extra Fields on Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="font-bold text-slate-900">إضافة بيانات أو صفوف إضافية على الكارنيه</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    placeholder="عنوان الحقل (مثال: المحافظة أو التخصص)"
                    value={newExtraField.label}
                    onChange={(e) => setNewExtraField((p) => ({ ...p, label: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  />
                  <input
                    placeholder="القيمة المعروضة (مثال: القاهرة)"
                    value={newExtraField.value}
                    onChange={(e) => setNewExtraField((p) => ({ ...p, value: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  />
                  <button
                    type="button"
                    onClick={addExtraField}
                    className="inline-flex items-center justify-center gap-1 px-3.5 py-2 bg-slate-900 text-white rounded-lg font-semibold shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> إضافة للكارنيه
                  </button>
                </div>
                {extraFields.length > 0 && (
                  <div className="space-y-1.5">
                    {extraFields.map((field, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
                        <span>
                          <strong>{field.label}:</strong> {field.value}
                        </span>
                        <button type="button" onClick={() => removeExtraField(idx)} className="text-red-600 hover:bg-red-50 p-1 rounded">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <label className="flex items-center gap-2 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(activeDesign.show_expiry)}
                    onChange={(e) => updateDesignField('show_expiry', e.target.checked ? 1 : 0)}
                  />
                  <span>إظهار تاريخ الانتهاء على الكارنيه</span>
                </label>
                <button
                  type="button"
                  disabled={saving}
                  onClick={saveDesign}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {saving ? 'جارٍ الحفظ...' : 'حفظ تصميم الكارنيه بالكامل'}
                </button>
              </div>
            </div>
          </div>

          {/* Flexible Card Logos Manager */}
          <div className="xl:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-950 font-display">نظام إدارة شعارات الكارنيه (الأمام والخلف)</h2>
              <p className="text-xs text-slate-500 mt-1">
                أي شعار تضيفه أو تعدله هنا يظهر مباشرةً في أختام الوجه الأمامي أو في بطاقات شركاء الوجه الخلفي.
              </p>
            </div>

            {/* Add Logo Form */}
            <form onSubmit={addLogo} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
              <p className="font-bold text-slate-900">إضافة شعار جديد إلى الكارنيه</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  required
                  placeholder="اسم الشعار (مثال: وزارة الشباب / شريك)"
                  value={newLogo.name}
                  onChange={(e) => setNewLogo({ ...newLogo, name: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
                <select
                  value={newLogo.side}
                  onChange={(e) => setNewLogo({ ...newLogo, side: e.target.value as any })}
                  className="px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="front">الوجه الأمامي فقط</option>
                  <option value="back">الوجه الخلفي فقط (شركاء النجاح)</option>
                  <option value="both">الوجهين الأمامي والخلفي</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) setNewLogo({ ...newLogo, logo_url: e.target.value });
                  }}
                  className="px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">-- اختيار من مكتبة شعارات الجهات --</option>
                  <option value="/assets/aistudio/FB_IMG_1789831319399_ac126220.jpg">شعار مبادرة جيل رقمي آمن</option>
                  <option value="/assets/aistudio/FB_IMG_1790438684231_64912c2d.jpg">شعار اتحاد حكاية وطن</option>
                  <option value="/assets/aistudio/FB_IMG_1792797530698_77e851bd.jpg">شعار وزارة التضامن الاجتماعي</option>
                  {partnersLibrary.map((p) => (
                    <option key={p.id} value={p.logo_url}>
                      {p.name_ar}
                    </option>
                  ))}
                </select>

                <label className="flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-slate-300 rounded-lg cursor-pointer bg-white hover:bg-slate-50">
                  <Upload className="w-3.5 h-3.5 text-blue-700" />
                  <span>{newLogo.logo_url ? 'تم تحديد الشعار ✓' : 'أو رفع شعار جديد'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) setNewLogo({ ...newLogo, logo_url: await uploadAdminFile(file, 'logos') });
                    }}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-slate-600">ترتيب الظهور</span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={newLogo.sort_order}
                    onChange={(e) => setNewLogo({ ...newLogo, sort_order: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-600">حجم الشعار (px)</span>
                  <input
                    type="number"
                    min={24}
                    max={80}
                    value={newLogo.width_px}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setNewLogo({ ...newLogo, width_px: v, height_px: v });
                    }}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
                  />
                </label>
              </div>

              <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold">
                <Plus className="w-3.5 h-3.5" /> إضافة الشعار إلى الكارنيه
              </button>
            </form>

            {/* Active Logos Controls */}
            <div className="space-y-3 max-h-[540px] overflow-y-auto">
              {logos.map((l) => (
                <div key={l.id} className="border border-slate-200 rounded-xl p-3 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <img src={l.logo_url} alt={l.name} className="w-9 h-9 object-contain rounded border border-slate-200 bg-white p-0.5 shrink-0" />
                      <input
                        value={l.name}
                        onChange={(e) => {
                          const updated = { ...l, name: e.target.value };
                          setLogos((prev) => prev.map((x) => (x.id === l.id ? updated : x)));
                        }}
                        onBlur={() => updateLogo(l)}
                        className="font-bold text-slate-900 px-2 py-1 border border-slate-200 rounded w-full min-w-0"
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(l.is_active)}
                          onChange={(e) => {
                            const updated = { ...l, is_active: e.target.checked ? 1 : 0 };
                            setLogos((prev) => prev.map((x) => (x.id === l.id ? updated : x)));
                            updateLogo(updated);
                          }}
                        />
                        <span>مفعل</span>
                      </label>
                      <button type="button" onClick={() => deleteLogo(l.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 items-center">
                    <select
                      value={l.side}
                      onChange={(e) => {
                        const updated = { ...l, side: e.target.value as any };
                        setLogos((prev) => prev.map((x) => (x.id === l.id ? updated : x)));
                        updateLogo(updated);
                      }}
                      className="px-2 py-1 border border-slate-200 rounded"
                    >
                      <option value="front">أمامي</option>
                      <option value="back">خلفي</option>
                      <option value="both">كلاهما</option>
                    </select>
                    <input
                      type="number"
                      title="ترتيب الظهور"
                      value={l.sort_order}
                      onChange={(e) => {
                        const updated = { ...l, sort_order: Number(e.target.value) };
                        setLogos((prev) => prev.map((x) => (x.id === l.id ? updated : x)));
                      }}
                      onBlur={() => updateLogo(l)}
                      className="px-2 py-1 border border-slate-200 rounded font-mono-num"
                    />
                    <input
                      type="number"
                      title="الحجم px"
                      value={l.width_px}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        const updated = { ...l, width_px: v, height_px: v };
                        setLogos((prev) => prev.map((x) => (x.id === l.id ? updated : x)));
                      }}
                      onBlur={() => updateLogo(l)}
                      className="px-2 py-1 border border-slate-200 rounded font-mono-num"
                    />
                    <label className="text-center px-2 py-1 border border-slate-200 rounded cursor-pointer hover:bg-slate-50">
                      تبديل
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = await uploadAdminFile(file, 'logos');
                            const updated = { ...l, logo_url: url };
                            setLogos((prev) => prev.map((x) => (x.id === l.id ? updated : x)));
                            updateLogo(updated);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Issued Membership Cards Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <h3 className="text-base font-bold text-slate-950 font-display">الكارنيهات الإلكترونية الصادرة ({cards.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-2.5 px-3 text-start">رقم الكارنيه</th>
                <th className="py-2.5 px-3 text-start">العضو</th>
                <th className="py-2.5 px-3 text-start">اللجنة</th>
                <th className="py-2.5 px-3 text-start">الإصدار / الانتهاء</th>
                <th className="py-2.5 px-3 text-start">الحالة</th>
                <th className="py-2.5 px-3 text-start">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cards.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    لم تُصدر كارنيهات بعد. عند قبول طلب عضوية أو الضغط على إصدار كارنيه لعضو سيظهر هنا.
                  </td>
                </tr>
              ) : (
                cards.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2.5 px-3 font-mono-num font-bold text-blue-700">{c.card_number}</td>
                    <td className="py-2.5 px-3 font-semibold">{c.full_name}</td>
                    <td className="py-2.5 px-3">{c.committee_name || 'عام'}</td>
                    <td className="py-2.5 px-3 font-mono-num">
                      {c.issue_date} → {c.expiry_date || '-'}
                    </td>
                    <td className="py-2.5 px-3 font-semibold">{c.status === 'active' ? 'ساري' : 'موقوف'}</td>
                    <td className="py-2.5 px-3 flex items-center gap-2">
                      <a href={`/verify?card=${c.card_number}`} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">
                        معاينة/تحميل
                      </a>
                      <button type="button" onClick={() => renewCard(c.id)} className="text-emerald-700 hover:underline">
                        تجديد عام
                      </button>
                      <button
                        type="button"
                        onClick={() => updateCardStatus(c.id, c.status === 'active' ? 'suspended' : 'active')}
                        className="text-amber-700 hover:underline"
                      >
                        {c.status === 'active' ? 'إيقاف' : 'تفعيل'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
