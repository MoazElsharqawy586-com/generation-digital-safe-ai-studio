import React, { useEffect, useRef, useState } from 'react';
import { Award, CheckCircle2, Edit3, Eye, Infinity as InfinityIcon, Plus, RotateCcw, Save, Trash2, Upload, X } from 'lucide-react';
import { ElectronicCardView, type ExtraCardField } from '../../components/ElectronicCardView';
import { useApp } from '../../context/AppContext';
import { uploadAdminFile } from './adminHelpers';
import { apiFetch } from '../../lib/authFetch';
import { AdminSectionSaveBar } from './AdminSectionSaveBar';
import type { CardDesign, CardLogo } from '../../types';

const OFFICIAL_STAMP_URL = '/assets/aistudio/file_000000006a4c820a8bb98e0bc0a1a48d_248264a5.png';

function parseExtraFields(raw?: string): ExtraCardField[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

type LogoPresetOption = { label: string; url: string };
const BUILTIN_LOGO_PRESETS: LogoPresetOption[] = [
  { label: 'شعار مبادرة جيل رقمي آمن', url: '/assets/aistudio/FB_IMG_1789831319399_ac126220.jpg' },
  { label: 'شعار اتحاد حكاية وطن', url: '/assets/aistudio/FB_IMG_1790438684231_64912c2d.jpg' },
  { label: 'شعار وزارة التضامن الاجتماعي', url: '/assets/aistudio/FB_IMG_1792797530698_77e851bd.jpg' },
  { label: 'الختم الرسمي — جيل رقمي آمن وحكاية وطن', url: '/assets/aistudio/file_000000006a4c820a8bb98e0bc0a1a48d_248264a5.png' }
];

export const AdminCardDesignerSection: React.FC = () => {
  const { committees } = useApp();
  const [cards, setCards] = useState<any[]>([]);
  const [designs, setDesigns] = useState<CardDesign[]>([]);
  const [logos, setLogos] = useState<CardLogo[]>([]);
  const [activeDesign, setActiveDesign] = useState<CardDesign | null>(null);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [editCardForm, setEditCardForm] = useState({
    card_number: '',
    issue_date: '',
    expiry_date: '',
    no_expiry: false,
    status: 'active',
    design_id: 1,
    full_name: '',
    position_title: '',
    national_id_number: '',
    governorate: '',
    committee_id: '',
    avatar_url: ''
  });
  const [savingCard, setSavingCard] = useState(false);
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
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const designDirtyRef = useRef(false);
  const activeDesignRef = useRef<CardDesign | null>(null);
  const dirtyLogosRef = useRef<Record<number, CardLogo>>({});

  // Live preview mode ('latest' | 'president' | 'vp' | 'selected') & Quick Leadership Card Issuance
  const [previewMode, setPreviewMode] = useState<'latest' | 'president' | 'vp' | 'selected'>('latest');
  const [selectedCardPreview, setSelectedCardPreview] = useState<any>(null);
  const [leaderForm, setLeaderForm] = useState({
    role_type: 'president' as 'president' | 'vice_president',
    full_name: 'أ. معاذ الشرقاوي',
    national_id_number: '',
    governorate: '',
    email: '',
    phone: '',
    avatar_url: '',
    no_expiry: true,
    expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  });
  const [issuingLeader, setIssuingLeader] = useState(false);
  const [leaderMsg, setLeaderMsg] = useState('');

  const flashSaved = (msg: string) => {
    setErrorMsg('');
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(''), 3500);
  };

  const flashError = (msg: string) => {
    setSavedMsg('');
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 4500);
  };

  const load = async () => {
    const [res, pRes] = await Promise.all([apiFetch('/api/admin/cards'), apiFetch('/api/public/partners')]);
    const data = await res.json();
    const partners = await pRes.json();
    setCards(data.cards || []);
    setDesigns(data.designs || []);
    setLogos(data.logos || []);
    if (data.designs?.[0]) {
      const fresh = data.designs[0] as CardDesign;
      setActiveDesign((prev) => {
        const next = prev && designDirtyRef.current ? { ...fresh, ...prev, id: fresh.id } : fresh;
        activeDesignRef.current = next;
        return next;
      });
    }
    setPartnersLibrary(Array.isArray(partners) ? partners : []);
  };

  useEffect(() => {
    load();
  }, []);

  const persistDesign = async (designToSave: CardDesign, message: string, keepalive = false) => {
    setSaving(true);
    try {
      const res = await apiFetch(`/api/admin/card-designs/${designToSave.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(designToSave),
        keepalive
      });
      if (res.ok) {
        const updated = (await res.json()) as CardDesign;
        setDesigns((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
        if (message) flashSaved(message);
      } else {
        const err = await res.json().catch(() => ({}));
        flashError(err.error || 'تعذر حفظ التعديلات على الكارنيه');
      }
    } catch {
      flashError('تعذر الاتصال بالخادم لحفظ تعديلات الكارنيه');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    activeDesignRef.current = activeDesign;
  }, [activeDesign]);

  useEffect(() => {
    if (!designDirtyRef.current || !activeDesign) return;
    const snapshot = activeDesign;
    const timer = setTimeout(() => {
      designDirtyRef.current = false;
      persistDesign(snapshot, 'تم حفظ التعديل وتطبيقه تلقائيًا على جميع الكارنيهات ✓');
    }, 650);
    return () => clearTimeout(timer);
  }, [activeDesign]);

  // Flush any pending unsaved design or logo edits on tab switch / page close
  useEffect(() => {
    const flushPending = () => {
      if (designDirtyRef.current && activeDesignRef.current) {
        const snap = activeDesignRef.current;
        designDirtyRef.current = false;
        apiFetch(`/api/admin/card-designs/${snap.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(snap),
          keepalive: true
        }).catch(() => {});
      }
      const pendingLogos = Object.values(dirtyLogosRef.current);
      if (pendingLogos.length > 0) {
        dirtyLogosRef.current = {};
        pendingLogos.forEach((logo) => {
          apiFetch(`/api/admin/card-logos/${logo.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logo),
            keepalive: true
          }).catch(() => {});
        });
      }
    };
    window.addEventListener('beforeunload', flushPending);
    return () => {
      window.removeEventListener('beforeunload', flushPending);
      flushPending();
    };
  }, []);

  const updateDesignField = <K extends keyof CardDesign>(key: K, val: CardDesign[K]) => {
    designDirtyRef.current = true;
    setActiveDesign((prev) => {
      const next = prev ? { ...prev, [key]: val } : prev;
      activeDesignRef.current = next;
      return next;
    });
  };

  const updateAndSaveDesignPatch = async (patch: Partial<CardDesign>, message: string) => {
    const base = activeDesignRef.current || activeDesign;
    if (!base) return;
    const next = { ...base, ...patch };
    designDirtyRef.current = false;
    activeDesignRef.current = next;
    setActiveDesign(next);
    await persistDesign(next, message);
  };

  const extraFields = parseExtraFields(activeDesign?.extra_rows_json);

  const addExtraField = async () => {
    const base = activeDesignRef.current || activeDesign;
    if (!base) return;
    const label = newExtraField.label.trim();
    const value = newExtraField.value.trim();
    if (!label && !value) {
      flashError('يرجى كتابة عنوان الحقل أو قيمته قبل الإضافة');
      return;
    }
    const nextRows = [...parseExtraFields(base.extra_rows_json), { label: label || 'معلومة', value }];
    setNewExtraField({ label: '', value: '' });
    await updateAndSaveDesignPatch(
      { extra_rows_json: JSON.stringify(nextRows) },
      'تمت إضافة الحقل إلى الكارنيه وحفظه بنجاح ✓'
    );
  };

  const removeExtraField = async (index: number) => {
    const base = activeDesignRef.current || activeDesign;
    if (!base) return;
    const nextRows = parseExtraFields(base.extra_rows_json).filter((_, i) => i !== index);
    await updateAndSaveDesignPatch(
      { extra_rows_json: JSON.stringify(nextRows) },
      'تم حذف الحقل من الكارنيه وحفظ التعديل ✓'
    );
  };

  const saveDesign = async () => {
    const target = activeDesignRef.current || activeDesign;
    if (!target) return;
    designDirtyRef.current = false;
    await persistDesign(target, 'تم حفظ كافة التعديلات على تصميم الكارنيه وتطبيقها بنجاح ✓');
  };

  const addLogo = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newLogo.name.trim();
    if (!trimmedName || !newLogo.logo_url) {
      flashError('يرجى إدخال اسم الشعار واختيار أو رفع صورة الشعار أولاً');
      return;
    }
    try {
      const res = await apiFetch('/api/admin/card-logos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newLogo, name: trimmedName })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        flashError(err.error || 'تعذر إضافة الشعار');
        return;
      }
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
      flashSaved('تمت إضافة الشعار إلى الكارنيه وحفظه بنجاح ✓');
    } catch {
      flashError('حدث خطأ أثناء إضافة الشعار');
    }
  };

  const updateLogo = async (logo: CardLogo, showFlash = false) => {
    delete dirtyLogosRef.current[logo.id];
    const res = await apiFetch(`/api/admin/card-logos/${logo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logo)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      flashError(err.error || 'تعذر حفظ تعديل الشعار');
      return;
    }
    if (showFlash) {
      flashSaved('تم حفظ تعديل شعار الكارنيه بنجاح ✓');
    }
  };

  const saveAllLogos = async () => {
    setSaving(true);
    try {
      await Promise.all(logos.map((l) => updateLogo(l, false)));
      flashSaved('تم حفظ جميع شعارات الكارنيه بنجاح ✓');
    } finally {
      setSaving(false);
    }
  };

  const deleteLogo = async (id: number) => {
    delete dirtyLogosRef.current[id];
    const res = await apiFetch(`/api/admin/card-logos/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      flashError(err.error || 'تعذر حذف الشعار');
      return;
    }
    setLogos((prev) => prev.filter((l) => l.id !== id));
    flashSaved('تم حذف الشعار من الكارنيه نهائيًا ✓');
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

  const makePermanent = async (id: number) => {
    await apiFetch(`/api/admin/cards/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active', expiry_date: '' })
    });
    load();
  };

  const openEditCard = (c: any) => {
    setEditingCard(c);
    setEditCardForm({
      card_number: c.card_number || '',
      issue_date: c.issue_date || '',
      expiry_date: c.expiry_date || '',
      no_expiry: !c.expiry_date,
      status: c.status || 'active',
      design_id: c.design_id || activeDesign?.id || 1,
      full_name: c.full_name || '',
      position_title: c.position_title || 'عضو عامل',
      national_id_number: c.national_id_number || '',
      governorate: c.governorate || '',
      committee_id: String(c.committee_id || ''),
      avatar_url: c.avatar_url || ''
    });
  };

  const saveEditedCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard) return;
    setSavingCard(true);
    try {
      const res = await apiFetch(`/api/admin/cards/${editingCard.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editCardForm,
          expiry_date: editCardForm.no_expiry ? '' : editCardForm.expiry_date
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setEditingCard(null);
        if (selectedCardPreview?.id === updated.id) {
          setSelectedCardPreview(updated);
        }
        await load();
        setSavedMsg(`تم حفظ تعديلات الكارنيه (${updated.card_number}) بنجاح ✓`);
        setTimeout(() => setSavedMsg(''), 3000);
      }
    } finally {
      setSavingCard(false);
    }
  };

  const deleteCard = async (id: number) => {
    await apiFetch(`/api/admin/cards/${id}`, { method: 'DELETE' });
    await load();
    setSavedMsg('تم حذف الكارنيه بنجاح ✓');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  const issueLeadershipCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaderForm.full_name.trim()) return;
    setIssuingLeader(true);
    setLeaderMsg('');
    try {
      const positionTitle = leaderForm.role_type === 'president' ? 'رئيس المبادرة' : 'نائب رئيس المبادرة';
      const res = await apiFetch('/api/admin/cards/issue-leadership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: leaderForm.full_name.trim(),
          position_title: positionTitle,
          national_id_number: leaderForm.national_id_number.trim(),
          governorate: leaderForm.governorate.trim(),
          email: leaderForm.email.trim(),
          phone: leaderForm.phone.trim(),
          avatar_url: leaderForm.avatar_url,
          no_expiry: leaderForm.no_expiry,
          expiry_date: leaderForm.no_expiry ? '' : leaderForm.expiry_date,
          design_id: activeDesign?.id || 1
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'تعذر إصدار الكارنيه');
      if (data.card) {
        setSelectedCardPreview(data.card);
        setPreviewMode('selected');
      }
      setLeaderMsg(`تم إصدار كارنيه (${positionTitle}) بنجاح لـ ${leaderForm.full_name} ✓`);
      load();
    } catch (err: any) {
      setLeaderMsg(err.message || 'حدث خطأ أثناء الإصدار');
    } finally {
      setIssuingLeader(false);
    }
  };

  const vpSuggestions = (activeDesign?.vp_names_ar || 'د. داليا نصار\nأ. أحمد نصار\nأ. أماني عبد الفتاح')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const latestIssued = cards[0];
  const sampleMember =
    previewMode === 'selected' && selectedCardPreview
      ? {
          full_name: selectedCardPreview.full_name,
          member_number: selectedCardPreview.member_number,
          national_id_number: selectedCardPreview.national_id_number || '',
          card_number: selectedCardPreview.card_number,
          committee_name: selectedCardPreview.committee_name || (selectedCardPreview.position_title?.includes('رئيس المبادرة') ? 'القيادة العليا' : 'عام'),
          position_title: selectedCardPreview.position_title || 'عضو عامل',
          governorate: selectedCardPreview.governorate || '',
          avatar_url: selectedCardPreview.avatar_url || '',
          issue_date: selectedCardPreview.issue_date || new Date().toISOString().slice(0, 10),
          expiry_date: selectedCardPreview.expiry_date || ''
        }
      : previewMode === 'president'
        ? {
            full_name: activeDesign?.president_name_ar || 'أ. معاذ الشرقاوي',
            member_number: '000001',
            national_id_number: '',
            card_number: 'CARD-PRES-001',
            committee_name: 'القيادة العليا',
            position_title: activeDesign?.president_title_ar || 'رئيس المبادرة',
            governorate: '',
            avatar_url: '',
            issue_date: new Date().toISOString().slice(0, 10),
            expiry_date: ''
          }
        : previewMode === 'vp'
          ? {
              full_name: vpSuggestions[0] || 'نائب رئيس المبادرة',
              member_number: '000002',
              national_id_number: '',
              card_number: 'CARD-VP-002',
              committee_name: 'القيادة العليا',
              position_title: activeDesign?.vp_title_ar || 'نائب رئيس المبادرة',
              governorate: '',
              avatar_url: '',
              issue_date: new Date().toISOString().slice(0, 10),
              expiry_date: ''
            }
          : {
              full_name: latestIssued?.full_name || 'معاذ محمود فتحي أحمد',
              member_number: latestIssued?.member_number || '000001',
              national_id_number: latestIssued?.national_id_number || '',
              card_number: latestIssued?.card_number || 'CARD-2026-PREVIEW',
              committee_name: latestIssued?.committee_name || 'لجنة التكنولوجيا',
              position_title: latestIssued?.position_title || 'عضو عامل',
              governorate: latestIssued?.governorate || 'القاهرة',
              avatar_url: latestIssued?.avatar_url || '',
              issue_date: latestIssued?.issue_date || '2026-01-01',
              expiry_date: latestIssued ? latestIssued.expiry_date : '2027-01-01'
            };

  return (
    <div className="space-y-8">
      <AdminSectionSaveBar
        sectionName="الكارنيهات والشعارات"
        notice={savedMsg}
        onSave={async () => {
          await saveDesign();
          await saveAllLogos();
        }}
        saving={saving}
        saveLabel="حفظ تصميم وشعارات الكارنيه"
      />

      {/* Live Designer + Controls */}
      {activeDesign && (
        <div className="space-y-6">
          {/* Full-Width Clear Live Preview */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-950 font-display">
                  معاينة الكارنيه قبل الإصدار (أي تعديل هنا يُطبق فورًا على جميع الكارنيهات)
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  مقاس طباعة قياسي CR80 (85.6 × 54 مم) جاهز للقص والتركيب مباشرة داخل جراب الـ ID
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewMode('latest')}
                  className={`px-3 py-1.5 rounded-lg font-semibold border ${
                    previewMode === 'latest' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  معاينة عضو
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('president')}
                  className={`px-3 py-1.5 rounded-lg font-semibold border ${
                    previewMode === 'president' ? 'bg-blue-700 text-white border-blue-700' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  رئيس المبادرة (بدون انتهاء)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('vp')}
                  className={`px-3 py-1.5 rounded-lg font-semibold border ${
                    previewMode === 'vp' ? 'bg-indigo-700 text-white border-indigo-700' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  نائب رئيس المبادرة
                </button>
                {selectedCardPreview && (
                  <button
                    type="button"
                    onClick={() => setPreviewMode('selected')}
                    className={`px-3 py-1.5 rounded-lg font-semibold border ${
                      previewMode === 'selected' ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    المختار: {selectedCardPreview.full_name}
                  </button>
                )}
              </div>
            </div>

            {savedMsg && <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">{savedMsg}</div>}
            {errorMsg && <div className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{errorMsg}</div>}

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

              {/* Official Round Stamp Control */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-slate-900">الختم الرسمي على الكارنيه وموضعه</p>
                  <label className="flex items-center gap-1.5 font-semibold cursor-pointer text-slate-800">
                    <input
                      type="checkbox"
                      checked={Boolean(activeDesign.show_stamp)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        updateAndSaveDesignPatch(
                          checked && !activeDesign.stamp_url
                            ? { show_stamp: 1, stamp_url: OFFICIAL_STAMP_URL }
                            : { show_stamp: checked ? 1 : 0 },
                          checked ? 'تم تفعيل الختم على الكارنيه ✓' : 'تم إخفاء الختم من الكارنيه ✓'
                        );
                      }}
                    />
                    <span>إظهار الختم الرسمي</span>
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-white border-2 border-amber-300 p-1 shadow-sm flex items-center justify-center shrink-0 overflow-hidden">
                    {activeDesign.stamp_url ? (
                      <img
                        src={activeDesign.stamp_url}
                        alt="الختم الرسمي"
                        className="w-full h-full object-contain rounded-full"
                      />
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 text-center leading-tight">لا يوجد ختم</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-[200px] space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-2 border border-dashed border-slate-300 rounded-lg cursor-pointer bg-white hover:bg-slate-100 font-semibold">
                        <Upload className="w-3.5 h-3.5 text-blue-700" />
                        <span>تغيير / رفع ختم جديد</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const url = await uploadAdminFile(file, 'logos');
                              await updateAndSaveDesignPatch({ stamp_url: url, show_stamp: 1 }, 'تم رفع وحفظ الختم الجديد ✓');
                            }
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          updateAndSaveDesignPatch(
                            { stamp_url: OFFICIAL_STAMP_URL, show_stamp: 1 },
                            'تمت استعادة الختم الرسمي المعتمد ✓'
                          )
                        }
                        className="inline-flex items-center gap-1 px-3 py-2 border border-slate-300 rounded-lg bg-white hover:bg-slate-100 font-semibold text-slate-700"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> استعادة الختم الرسمي المعتمد
                      </button>
                      {(activeDesign.stamp_url || Boolean(activeDesign.show_stamp)) && (
                        <button
                          type="button"
                          onClick={() =>
                            updateAndSaveDesignPatch(
                              { stamp_url: '', show_stamp: 0 },
                              'تم حذف الختم من الكارنيه ✓'
                            )
                          }
                          className="inline-flex items-center gap-1 px-3 py-2 border border-red-200 rounded-lg bg-white hover:bg-red-50 font-semibold text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> حذف الختم
                        </button>
                      )}
                    </div>
                    <label className="block space-y-1">
                      <span className="font-semibold text-slate-700">مكان الختم على الكارنيه</span>
                      <select
                        value={activeDesign.stamp_position || 'over_signature'}
                        onChange={(e) => updateDesignField('stamp_position', e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                      >
                        <option value="over_signature">متداخل على طرف الصورة وتوقيع رئيس المبادرة (ختم اعتماد)</option>
                        <option value="right_bottom">الجهة اليمنى أسفل العبارة</option>
                        <option value="right_center">الجهة اليمنى أعلى العبارة</option>
                        <option value="back_left">الوجه الخلفي للكارنيه (أسفل اليسار)</option>
                      </select>
                    </label>
                  </div>
                </div>
              </div>

              {/* Leadership Signatures */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="font-bold text-slate-900">توقيع رئيس المبادرة (تحت الصورة) وأسماء النواب (الناحية الأخرى)</p>
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
                      <span className="font-semibold text-slate-700">اسم رئيس المبادرة (يظهر تحت الصورة)</span>
                      <input
                        value={activeDesign.president_name_ar ?? 'أ. معاذ الشرقاوي'}
                        onChange={(e) => updateDesignField('president_name_ar', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="font-semibold text-slate-700">نص الإمضاء (تحت اسم الرئيس)</span>
                      <input
                        placeholder="مثال: م. الشرقاوي أو يُترك فارغًا للاسم التلقائي"
                        value={activeDesign.president_signature_text ?? ''}
                        onChange={(e) => updateDesignField('president_signature_text', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </label>
                    <div className="space-y-1">
                      <span className="font-semibold text-slate-700 block">أو رفع صورة إمضاء/توقيع رئيس المبادرة</span>
                      <div className="flex items-center gap-2">
                        <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-slate-300 rounded-lg cursor-pointer bg-white hover:bg-slate-50">
                          <Upload className="w-3.5 h-3.5 text-blue-700" />
                          <span>{activeDesign.president_signature_url ? 'تم رفع صورة الإمضاء ✓ (اضغط للتبديل)' : 'رفع صورة التوقيع (PNG/JPG)'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const url = await uploadAdminFile(file, 'logos');
                                await updateAndSaveDesignPatch({ president_signature_url: url }, 'تم رفع وحفظ صورة التوقيع ✓');
                              }
                            }}
                          />
                        </label>
                        {activeDesign.president_signature_url && (
                          <button
                            type="button"
                            onClick={() => updateAndSaveDesignPatch({ president_signature_url: '' }, 'تم حذف صورة التوقيع ✓')}
                            className="px-2.5 py-2 text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50"
                            title="حذف صورة الإمضاء"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block space-y-1">
                      <span className="font-semibold text-slate-700">المسمى الوظيفي للنواب (الناحية الأخرى)</span>
                      <input
                        value={activeDesign.vp_title_ar ?? 'نائب رئيس المبادرة'}
                        onChange={(e) => updateDesignField('vp_title_ar', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="font-semibold text-slate-700">أسماء النواب (اسم في كل سطر)</span>
                      <textarea
                        rows={5}
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addExtraField();
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  />
                  <input
                    placeholder="القيمة المعروضة (مثال: القاهرة)"
                    value={newExtraField.value}
                    onChange={(e) => setNewExtraField((p) => ({ ...p, value: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addExtraField();
                      }
                    }}
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
                        <button
                          type="button"
                          onClick={() => removeExtraField(idx)}
                          className="inline-flex items-center gap-1 text-red-600 hover:bg-red-50 px-2 py-1 rounded font-semibold"
                          title="حذف الحقل من الكارنيه"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> حذف
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
                    onChange={(e) =>
                      updateAndSaveDesignPatch(
                        { show_expiry: e.target.checked ? 1 : 0 },
                        e.target.checked ? 'تم إظهار تاريخ الانتهاء على الكارنيه ✓' : 'تم إخفاء تاريخ الانتهاء من الكارنيه ✓'
                      )
                    }
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
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-950 font-display">نظام إدارة شعارات الكارنيه (الأمام والخلف)</h2>
                <p className="text-xs text-slate-500 mt-1">
                  أي شعار تضيفه أو تعدله هنا يظهر مباشرةً في أختام الوجه الأمامي أو في بطاقات شركاء الوجه الخلفي.
                </p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={saveAllLogos}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shrink-0"
              >
                <Save className="w-3.5 h-3.5" /> حفظ الشعارات
              </button>
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
                  value={
                    BUILTIN_LOGO_PRESETS.some((p) => p.url === newLogo.logo_url) ||
                    partnersLibrary.some((p) => p.logo_url === newLogo.logo_url)
                      ? newLogo.logo_url
                      : ''
                  }
                  onChange={(e) => {
                    const url = e.target.value;
                    if (!url) return;
                    const label = e.target.options[e.target.selectedIndex]?.text || '';
                    setNewLogo((prev) => ({
                      ...prev,
                      logo_url: url,
                      name: prev.name.trim() ? prev.name : label
                    }));
                  }}
                  className="px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">-- اختيار من مكتبة شعارات الجهات --</option>
                  {BUILTIN_LOGO_PRESETS.map((p) => (
                    <option key={p.url} value={p.url}>
                      {p.label}
                    </option>
                  ))}
                  {partnersLibrary.map((p) => (
                    <option key={p.id} value={p.logo_url}>
                      {p.name_ar}
                    </option>
                  ))}
                </select>

                <label className="flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-slate-300 rounded-lg cursor-pointer bg-white hover:bg-slate-50">
                  <Upload className="w-3.5 h-3.5 text-blue-700" />
                  <span>{newLogo.logo_url ? 'تم تحديد الشعار ✓ (اضغط للتبديل)' : 'أو رفع شعار جديد'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = await uploadAdminFile(file, 'logos');
                        const baseName = file.name.replace(/\.[^.]+$/, '');
                        setNewLogo((prev) => ({
                          ...prev,
                          logo_url: url,
                          name: prev.name.trim() ? prev.name : baseName
                        }));
                      }
                    }}
                  />
                </label>
              </div>

              {newLogo.logo_url && (
                <div className="flex items-center justify-between gap-2 bg-white border border-emerald-200 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <img src={newLogo.logo_url} alt={newLogo.name || 'معاينة الشعار'} className="w-9 h-9 object-contain rounded border border-slate-200 p-0.5 shrink-0" />
                    <span className="text-[11px] font-semibold text-emerald-700 truncate">
                      الشعار جاهز للإضافة ({newLogo.side === 'front' ? 'الوجه الأمامي' : newLogo.side === 'back' ? 'الوجه الخلفي' : 'الوجهين'})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewLogo((prev) => ({ ...prev, logo_url: '' }))}
                    className="p-1 text-slate-400 hover:text-red-600 rounded"
                    title="إلغاء الشعار المحدد"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

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
                          dirtyLogosRef.current[l.id] = updated;
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
                            updateLogo(updated, true);
                          }}
                        />
                        <span>مفعل</span>
                      </label>
                      <button type="button" onClick={() => updateLogo(l, true)} className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded font-semibold inline-flex items-center gap-1">
                        <Save className="w-3 h-3" /> حفظ
                      </button>
                      <button type="button" onClick={() => deleteLogo(l.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="حذف الشعار">
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
                        updateLogo(updated, true);
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
                        dirtyLogosRef.current[l.id] = updated;
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
                        dirtyLogosRef.current[l.id] = updated;
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
                            updateLogo(updated, true);
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

      {/* Quick Leadership Card Issuance (President without Expiry + Vice Presidents) */}
      <div className="bg-white border border-blue-200 rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-950 font-display flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-700" />
              <span>إصدار كارنيه قيادي سريع (رئيس المبادرة بدون انتهاء / نواب رئيس المبادرة)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              أصدر كارنيهًا فوريًا لرئيس المبادرة (دائم من غير تاريخ انتهاء) أو لأحد نواب رئيس المبادرة مع حفظ البيانات وطباعة مقاس ID مباشرة.
            </p>
          </div>
          {leaderMsg && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5" /> {leaderMsg}
            </span>
          )}
        </div>

        <form onSubmit={issueLeadershipCard} className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="sm:col-span-3 space-y-1">
            <span className="font-semibold text-slate-700 block">الصفة القيادية *</span>
            <select
              value={leaderForm.role_type}
              onChange={(e) => {
                const role = e.target.value as 'president' | 'vice_president';
                setLeaderForm((prev) => ({
                  ...prev,
                  role_type: role,
                  full_name:
                    role === 'president'
                      ? activeDesign?.president_name_ar || 'أ. معاذ الشرقاوي'
                      : vpSuggestions[0] || '',
                  no_expiry: true
                }));
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
            >
              <option value="president">رئيس المبادرة (بدون انتهاء)</option>
              <option value="vice_president">نائب رئيس المبادرة</option>
            </select>
          </div>

          <div className="sm:col-span-4 space-y-1">
            <span className="font-semibold text-slate-700 block">الاسم الكامل *</span>
            <input
              required
              list="sdg-leader-names"
              placeholder="الاسم كما سيظهر على الكارنيه"
              value={leaderForm.full_name}
              onChange={(e) => setLeaderForm({ ...leaderForm, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
            <datalist id="sdg-leader-names">
              <option value={activeDesign?.president_name_ar || 'أ. معاذ الشرقاوي'} />
              {vpSuggestions.map((n, i) => (
                <option key={i} value={n} />
              ))}
            </datalist>
          </div>

          <div className="sm:col-span-3 space-y-1">
            <span className="font-semibold text-slate-700 block">الرقم القومي (14 رقمًا)</span>
            <input
              inputMode="numeric"
              maxLength={14}
              placeholder="يظهر تحت الاسم اختياريًا"
              value={leaderForm.national_id_number}
              onChange={(e) => setLeaderForm({ ...leaderForm, national_id_number: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono-num"
            />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <span className="font-semibold text-slate-700 block">الصورة الشخصية</span>
            <label className="flex items-center justify-center gap-1 px-2.5 py-2 border border-dashed border-slate-300 rounded-lg cursor-pointer bg-white hover:bg-slate-50">
              <Upload className="w-3.5 h-3.5 text-blue-700" />
              <span>{leaderForm.avatar_url ? 'تم الرفع ✓' : 'رفع صورة'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) setLeaderForm({ ...leaderForm, avatar_url: await uploadAdminFile(file, 'avatars') });
                }}
              />
            </label>
          </div>

          <div className="sm:col-span-3 space-y-1">
            <span className="font-semibold text-slate-700 block">المحافظة / النطاق</span>
            <input
              placeholder="مثال: القيادة المركزية / القاهرة"
              value={leaderForm.governorate}
              onChange={(e) => setLeaderForm({ ...leaderForm, governorate: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>

          <div className="sm:col-span-3 space-y-1">
            <span className="font-semibold text-slate-700 block">رقم الهاتف (اختياري)</span>
            <input
              placeholder="01xxxxxxxxx"
              value={leaderForm.phone}
              onChange={(e) => setLeaderForm({ ...leaderForm, phone: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono-num"
            />
          </div>

          <div className="sm:col-span-3 flex flex-col justify-end">
            <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg cursor-pointer font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={leaderForm.no_expiry}
                onChange={(e) => setLeaderForm({ ...leaderForm, no_expiry: e.target.checked })}
              />
              <InfinityIcon className="w-3.5 h-3.5 text-blue-700 shrink-0" />
              <span>بدون تاريخ انتهاء (دائم)</span>
            </label>
          </div>

          {!leaderForm.no_expiry && (
            <div className="sm:col-span-3 space-y-1">
              <span className="font-semibold text-slate-700 block">تاريخ الانتهاء</span>
              <input
                type="date"
                value={leaderForm.expiry_date}
                onChange={(e) => setLeaderForm({ ...leaderForm, expiry_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              />
            </div>
          )}

          <div className={`${leaderForm.no_expiry ? 'sm:col-span-3' : 'sm:col-span-12'} flex items-end justify-end`}>
            <button
              type="submit"
              disabled={issuingLeader}
              className="w-full sm:w-auto px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{issuingLeader ? 'جارٍ الإصدار...' : 'إصدار الكارنيه ومعاينته الآن'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Issued Membership Cards Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <h3 className="text-base font-bold text-slate-950 font-display">الكارنيهات الإلكترونية الصادرة ({cards.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-2.5 px-3 text-start">رقم الكارنيه</th>
                <th className="py-2.5 px-3 text-start">العضو / المنصب</th>
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
                    لم تُصدر كارنيهات بعد. عند قبول طلب عضوية أو الضغط على إصدار كارنيه قيادي أو لعضو سيظهر هنا.
                  </td>
                </tr>
              ) : (
                cards.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2.5 px-3 font-mono-num font-bold text-blue-700">{c.card_number}</td>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-slate-900">{c.full_name}</p>
                      <p className="text-[11px] text-slate-500">{c.position_title || 'عضو عامل'}</p>
                    </td>
                    <td className="py-2.5 px-3">{c.committee_name || 'عام'}</td>
                    <td className="py-2.5 px-3 font-mono-num">
                      {c.issue_date} →{' '}
                      {c.expiry_date ? (
                        c.expiry_date
                      ) : (
                        <span className="font-sans font-bold text-emerald-700">دائم (بدون انتهاء)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-semibold">{c.status === 'active' ? 'ساري' : 'موقوف'}</td>
                    <td className="py-2.5 px-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCardPreview(c);
                          setPreviewMode('selected');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="inline-flex items-center gap-1 text-indigo-700 font-semibold hover:underline"
                      >
                        <Eye className="w-3.5 h-3.5" /> معاينة/طباعة
                      </button>
                      <a href={`/verify?card=${c.card_number}`} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">
                        رابط التحقق
                      </a>
                      <button type="button" onClick={() => makePermanent(c.id)} className="text-emerald-700 font-semibold hover:underline">
                        بدون انتهاء
                      </button>
                      <button type="button" onClick={() => renewCard(c.id)} className="text-cyan-700 hover:underline">
                        تجديد عام
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditCard(c)}
                        className="inline-flex items-center gap-1 text-blue-700 font-semibold hover:underline"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> تعديل بيانات
                      </button>
                      <button
                        type="button"
                        onClick={() => updateCardStatus(c.id, c.status === 'active' ? 'suspended' : 'active')}
                        className="text-amber-700 hover:underline"
                      >
                        {c.status === 'active' ? 'إيقاف' : 'تفعيل'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCard(c.id)}
                        className="text-red-600 hover:underline"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Issued Card & Cardholder Data Modal */}
      {editingCard && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold font-display text-slate-950">تعديل بيانات الكارنيه: {editingCard.card_number}</h3>
              <button type="button" onClick={() => setEditingCard(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={saveEditedCard} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="font-semibold text-slate-700">الاسم الكامل على الكارنيه *</span>
                  <input
                    required
                    value={editCardForm.full_name}
                    onChange={(e) => setEditCardForm({ ...editCardForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="font-semibold text-slate-700">الصفة / المنصب *</span>
                  <input
                    required
                    value={editCardForm.position_title}
                    onChange={(e) => setEditCardForm({ ...editCardForm, position_title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="font-semibold text-slate-700">رقم الكارنيه *</span>
                  <input
                    required
                    value={editCardForm.card_number}
                    onChange={(e) => setEditCardForm({ ...editCardForm, card_number: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono-num"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="font-semibold text-slate-700">الرقم القومي</span>
                  <input
                    inputMode="numeric"
                    maxLength={14}
                    value={editCardForm.national_id_number}
                    onChange={(e) => setEditCardForm({ ...editCardForm, national_id_number: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono-num"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="font-semibold text-slate-700">اللجنة</span>
                  <select
                    value={editCardForm.committee_id}
                    onChange={(e) => setEditCardForm({ ...editCardForm, committee_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">-- عام / قيادة --</option>
                    {committees.map((cm) => (
                      <option key={cm.id} value={cm.id}>{cm.name_ar}</option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="font-semibold text-slate-700">المحافظة</span>
                  <input
                    value={editCardForm.governorate}
                    onChange={(e) => setEditCardForm({ ...editCardForm, governorate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="font-semibold text-slate-700">تاريخ الإصدار</span>
                  <input
                    type="date"
                    value={editCardForm.issue_date}
                    onChange={(e) => setEditCardForm({ ...editCardForm, issue_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="font-semibold text-slate-700">حالة الكارنيه</span>
                  <select
                    value={editCardForm.status}
                    onChange={(e) => setEditCardForm({ ...editCardForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="active">ساري</option>
                    <option value="suspended">موقوف</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pt-1">
                <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editCardForm.no_expiry}
                    onChange={(e) =>
                      setEditCardForm({
                        ...editCardForm,
                        no_expiry: e.target.checked,
                        expiry_date: e.target.checked ? '' : editCardForm.expiry_date
                      })
                    }
                  />
                  <span>دائم بدون تاريخ انتهاء</span>
                </label>
                {!editCardForm.no_expiry && (
                  <input
                    type="date"
                    value={editCardForm.expiry_date}
                    onChange={(e) => setEditCardForm({ ...editCardForm, expiry_date: e.target.value })}
                    className="px-3 py-2 border border-slate-300 rounded-lg"
                  />
                )}
              </div>

              <label className="flex items-center justify-center gap-2 border border-dashed border-slate-300 rounded-lg py-2 cursor-pointer hover:bg-slate-50">
                <Upload className="w-4 h-4 text-blue-700" />
                <span>{editCardForm.avatar_url ? 'تغيير الصورة الشخصية على الكارنيه ✓' : 'رفع صورة شخصية'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) setEditCardForm({ ...editCardForm, avatar_url: await uploadAdminFile(f, 'avatars') });
                  }}
                />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingCard(null)} className="px-4 py-2 border border-slate-300 rounded-xl font-semibold">
                  إلغاء
                </button>
                <button type="submit" disabled={savingCard} className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-semibold inline-flex items-center gap-1.5 disabled:opacity-50">
                  <Save className="w-4 h-4" /> {savingCard ? 'جارٍ الحفظ...' : 'حفظ تعديلات الكارنيه'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
