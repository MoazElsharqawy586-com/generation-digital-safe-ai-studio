import React, { useEffect, useState } from 'react';
import { Plus, Save, Trash2, Upload } from 'lucide-react';
import { ElectronicCardView } from '../../components/ElectronicCardView';
import { uploadAdminFile } from './adminHelpers';
import { apiFetch } from '../../lib/authFetch';
import type { CardDesign, CardLogo } from '../../types';

export const AdminCardDesignerSection: React.FC = () => {
  const [cards, setCards] = useState<any[]>([]);
  const [designs, setDesigns] = useState<CardDesign[]>([]);
  const [logos, setLogos] = useState<CardLogo[]>([]);
  const [activeDesign, setActiveDesign] = useState<CardDesign | null>(null);
  const [partnersLibrary, setPartnersLibrary] = useState<any[]>([]);
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

  const load = async () => {
    const [res, pRes] = await Promise.all([apiFetch('/api/admin/cards'), apiFetch('/api/public/partners')]);
    const data = await res.json();
    const partners = await pRes.json();
    setCards(data.cards || []);
    setDesigns(data.designs || []);
    setLogos(data.logos || []);
    if (data.designs?.[0]) setActiveDesign(data.designs[0]);
    setPartnersLibrary(Array.isArray(partners) ? partners : []);
  };

  useEffect(() => {
    load();
  }, []);

  const saveDesign = async () => {
    if (!activeDesign) return;
    await apiFetch(`/api/admin/card-designs/${activeDesign.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activeDesign)
    });
    setSavedMsg('تم حفظ إعدادات تصميم الكارنيه');
    setTimeout(() => setSavedMsg(''), 2500);
    load();
  };

  const addLogo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogo.name || !newLogo.logo_url) return;
    await apiFetch('/api/admin/card-logos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLogo)
    });
    setNewLogo({ name: '', logo_url: '', side: 'front', card_type: 'all', x_percent: 60, y_percent: 8, width_px: 42, height_px: 42, sort_order: 10 });
    load();
  };

  const updateLogo = async (logo: CardLogo) => {
    await apiFetch(`/api/admin/card-logos/${logo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logo)
    });
    load();
  };

  const deleteLogo = async (id: number) => {
    await apiFetch(`/api/admin/card-logos/${id}`, { method: 'DELETE' });
    load();
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

  const sampleMember = {
    full_name: 'معاينة نموذجية لبطاقة العضو',
    member_number: 'SDG-2026-SAMPLE',
    card_number: 'CARD-2026-PREVIEW',
    committee_name: 'لجنة التكنولوجيا',
    position_title: 'عضو عامل',
    governorate: 'القاهرة',
    avatar_url: '/assets/aistudio/FB_IMG_1789831319399_ac126220.jpg',
    issue_date: new Date().toISOString().slice(0, 10),
    expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  };

  return (
    <div className="space-y-8">
      {/* Live Designer + Controls */}
      {activeDesign && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Live Preview */}
          <div className="xl:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-950 font-display">معاينة الكارنيه قبل الإصدار (وجه أمامي وخلفي)</h2>
              {savedMsg && <span className="text-xs font-semibold text-emerald-700">{savedMsg}</span>}
            </div>
            <ElectronicCardView member={sampleMember} design={activeDesign} logos={logos} qrDataUrl="" allowDownload={false} />

            {/* Colors & Footer Settings */}
            <div className="pt-4 border-t border-slate-200 space-y-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <label className="space-y-1 block">
                  <span className="font-semibold text-slate-700">خلفية الأمام</span>
                  <input type="color" value={activeDesign.front_bg} onChange={(e) => setActiveDesign({ ...activeDesign, front_bg: e.target.value })} className="w-full h-9 rounded-lg border border-slate-300" />
                </label>
                <label className="space-y-1 block">
                  <span className="font-semibold text-slate-700">خلفية الخلف</span>
                  <input type="color" value={activeDesign.back_bg} onChange={(e) => setActiveDesign({ ...activeDesign, back_bg: e.target.value })} className="w-full h-9 rounded-lg border border-slate-300" />
                </label>
                <label className="space-y-1 block">
                  <span className="font-semibold text-slate-700">اللون التمييزي</span>
                  <input type="color" value={activeDesign.accent_color} onChange={(e) => setActiveDesign({ ...activeDesign, accent_color: e.target.value })} className="w-full h-9 rounded-lg border border-slate-300" />
                </label>
                <label className="space-y-1 block">
                  <span className="font-semibold text-slate-700">لون النص</span>
                  <input type="color" value={activeDesign.text_color} onChange={(e) => setActiveDesign({ ...activeDesign, text_color: e.target.value })} className="w-full h-9 rounded-lg border border-slate-300" />
                </label>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">نص المظلة الرسمية أسفل الكارنيه</label>
                <input value={activeDesign.footer_note_ar} onChange={(e) => setActiveDesign({ ...activeDesign, footer_note_ar: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 font-semibold">
                  <input type="checkbox" checked={Boolean(activeDesign.show_expiry)} onChange={(e) => setActiveDesign({ ...activeDesign, show_expiry: e.target.checked ? 1 : 0 })} />
                  <span>إظهار تاريخ الانتهاء على الكارنيه</span>
                </label>
                <button type="button" onClick={saveDesign} className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 text-white rounded-lg font-semibold">
                  <Save className="w-3.5 h-3.5" /> حفظ تصميم الكارنيه
                </button>
              </div>
            </div>
          </div>

          {/* Flexible Card Logos Manager */}
          <div className="xl:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            <h2 className="text-base font-bold text-slate-950 font-display">نظام إدارة شعارات الكارنيه (الأمام والخلف)</h2>

            {/* Add Logo Form */}
            <form onSubmit={addLogo} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
              <p className="font-bold text-slate-900">إضافة شعار جديد إلى الكارنيه</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input required placeholder="اسم الشعار (مثال: شعار المبادرة / شريك)" value={newLogo.name} onChange={(e) => setNewLogo({ ...newLogo, name: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg bg-white" />
                <select value={newLogo.side} onChange={(e) => setNewLogo({ ...newLogo, side: e.target.value as any })} className="px-3 py-2 border border-slate-300 rounded-lg bg-white">
                  <option value="front">الوجه الأمامي فقط</option>
                  <option value="back">الوجه الخلفي فقط</option>
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
                    <option key={p.id} value={p.logo_url}>{p.name_ar}</option>
                  ))}
                </select>

                <label className="flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-slate-300 rounded-lg cursor-pointer bg-white hover:bg-slate-50">
                  <Upload className="w-3.5 h-3.5 text-blue-700" />
                  <span>{newLogo.logo_url ? 'تم تحديد الشعار ✓' : 'أو رفع شعار جديد'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) setNewLogo({ ...newLogo, logo_url: await uploadAdminFile(file, 'logos') });
                  }} />
                </label>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <label className="block"><span>أفقي %</span><input type="number" min={0} max={92} value={newLogo.x_percent} onChange={(e) => setNewLogo({ ...newLogo, x_percent: Number(e.target.value) })} className="w-full px-2 py-1 border border-slate-300 rounded bg-white" /></label>
                <label className="block"><span>رأسي %</span><input type="number" min={0} max={85} value={newLogo.y_percent} onChange={(e) => setNewLogo({ ...newLogo, y_percent: Number(e.target.value) })} className="w-full px-2 py-1 border border-slate-300 rounded bg-white" /></label>
                <label className="block"><span>العرض px</span><input type="number" min={20} max={90} value={newLogo.width_px} onChange={(e) => setNewLogo({ ...newLogo, width_px: Number(e.target.value) })} className="w-full px-2 py-1 border border-slate-300 rounded bg-white" /></label>
                <label className="block"><span>الارتفاع px</span><input type="number" min={20} max={90} value={newLogo.height_px} onChange={(e) => setNewLogo({ ...newLogo, height_px: Number(e.target.value) })} className="w-full px-2 py-1 border border-slate-300 rounded bg-white" /></label>
              </div>

              <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold">
                <Plus className="w-3.5 h-3.5" /> إضافة الشعار إلى الكارنيه
              </button>
            </form>

            {/* Active Logos Controls */}
            <div className="space-y-3 max-h-[380px] overflow-y-auto">
              {logos.map((l) => (
                <div key={l.id} className="border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={l.logo_url} alt={l.name} className="w-9 h-9 object-contain rounded border border-slate-200 bg-white p-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{l.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {l.side === 'both' ? 'الوجهان' : l.side === 'front' ? 'الأمامي' : 'الخلفي'} · ترتيب {l.sort_order}
                        </p>
                      </div>
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
                      <button type="button" onClick={() => deleteLogo(l.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-2 items-center">
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
                      title="الموضع الأفقي %"
                      value={l.x_percent}
                      onChange={(e) => {
                        const updated = { ...l, x_percent: Number(e.target.value) };
                        setLogos((prev) => prev.map((x) => (x.id === l.id ? updated : x)));
                      }}
                      onBlur={() => updateLogo(l)}
                      className="px-2 py-1 border border-slate-200 rounded font-mono-num"
                    />
                    <input
                      type="number"
                      title="الموضع الرأسي %"
                      value={l.y_percent}
                      onChange={(e) => {
                        const updated = { ...l, y_percent: Number(e.target.value) };
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
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = await uploadAdminFile(file, 'logos');
                          const updated = { ...l, logo_url: url };
                          setLogos((prev) => prev.map((x) => (x.id === l.id ? updated : x)));
                          updateLogo(updated);
                        }
                      }} />
                    </label>
                  </div>
                </div>
              ))}
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
                <tr><td colSpan={6} className="py-6 text-center text-slate-500">لم تُصدر كارنيهات بعد. عند قبول طلب عضوية أو الضغط على إصدار كارنيه لعضو سيظهر هنا.</td></tr>
              ) : (
                cards.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2.5 px-3 font-mono-num font-bold text-blue-700">{c.card_number}</td>
                    <td className="py-2.5 px-3 font-semibold">{c.full_name}</td>
                    <td className="py-2.5 px-3">{c.committee_name || 'عام'}</td>
                    <td className="py-2.5 px-3 font-mono-num">{c.issue_date} → {c.expiry_date || '-'}</td>
                    <td className="py-2.5 px-3 font-semibold">{c.status === 'active' ? 'ساري' : 'موقوف'}</td>
                    <td className="py-2.5 px-3 flex items-center gap-2">
                      <a href={`/verify?card=${c.card_number}`} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">معاينة/تحميل</a>
                      <button type="button" onClick={() => renewCard(c.id)} className="text-emerald-700 hover:underline">تجديد عام</button>
                      <button type="button" onClick={() => updateCardStatus(c.id, c.status === 'active' ? 'suspended' : 'active')} className="text-amber-700 hover:underline">
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
