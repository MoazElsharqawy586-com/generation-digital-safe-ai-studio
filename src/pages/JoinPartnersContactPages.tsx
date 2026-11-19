import React, { useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, ExternalLink, KeyRound, Mail, Phone, Search, ShieldCheck, Upload } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SafeImage } from '../components/SafeImage';
import { ElectronicCardView } from '../components/ElectronicCardView';
import { apiFetch } from '../lib/authFetch';
import type { PartnerItem } from '../types';

export const JoinPage: React.FC = () => {
  const { committees, joinQuestions, t, navigate, applyAuthSession } = useApp();
  const [tab, setTab] = useState<'apply' | 'track'>('apply');
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    application_number: string;
    message: string;
    member_number?: string;
    card_number?: string;
    cardData?: any;
  } | null>(null);
  const [error, setError] = useState('');
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});

  // Inline password activation after card issuance
  const [actPassword, setActPassword] = useState('');
  const [actStatus, setActStatus] = useState<{ ok?: string; err?: string; loading?: boolean }>({});

  const [form, setForm] = useState({
    full_name: '',
    avatar_url: '',
    national_id_number: '',
    national_id_front_url: '',
    national_id_back_url: '',
    birth_date: '',
    gender: 'ذكر',
    governorate: '',
    area: '',
    phone: '',
    whatsapp: '',
    email: '',
    qualification: 'طالب جامعي',
    university_school: '',
    major: '',
    graduation_year: '',
    experiences: '',
    skills: '',
    interests: '',
    preferred_committee_id: '',
    reason: '',
    availability: '5 - 10 ساعات أسبوعيًا',
    cv_url: ''
  });

  // Tracker state
  const [trackCode, setTrackCode] = useState('');
  const [trackPhone, setTrackPhone] = useState('');
  const [trackResult, setTrackResult] = useState<any>(null);
  const [trackError, setTrackError] = useState('');

  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  const uploadFile = async (file: File, field: 'avatar_url' | 'cv_url' | 'national_id_front_url' | 'national_id_back_url') => {
    setUploadingField(field);
    setError('');
    if (field !== 'cv_url') {
      const localUrl = URL.createObjectURL(file);
      setPreviewUrls((prev) => ({ ...prev, [field]: localUrl }));
    }
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/public/upload-application-file', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل رفع الملف');
      setForm((f) => ({ ...f, [field]: data.url }));
    } catch (e: any) {
      setError(e.message);
      setPreviewUrls((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    } finally {
      setUploadingField(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.national_id_front_url || !form.national_id_back_url) {
      setError(t('يرجى رفع صورة الوجه الأمامي والوجه الخلفي للبطاقة الشخصية.', 'Please upload both front and back photos of your National ID.'));
      return;
    }

    // Validate required dynamic custom questions cleanly before sending
    for (const q of joinQuestions) {
      if (q.is_required && !String(customAnswers[String(q.id)] || '').trim()) {
        setError(t(`يرجى الإجابة على السؤال المطلوب: ${q.question_ar}`, `Please answer required question: ${q.question_en || q.question_ar}`));
        return;
      }
    }

    const structuredCustomAnswers = joinQuestions
      .map((q) => ({
        question_id: q.id,
        question_ar: q.question_ar,
        answer: String(customAnswers[String(q.id)] || '').trim()
      }))
      .filter((item) => item.answer !== '');

    setSubmitting(true);
    try {
      const res = await fetch('/api/public/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, custom_answers: structuredCustomAnswers })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'تعذر إرسال الطلب');
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInlineActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!result) return;
    setActStatus({ loading: true });
    try {
      const res = await apiFetch('/api/auth/activate-member-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          identifier: result.member_number || result.application_number || form.phone,
          password: actPassword
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'تعذر تفعيل كلمة المرور');
      applyAuthSession(data.user, data.token);
      setActStatus({ ok: t('تم تفعيل كلمة مرور حسابك بنجاح! يمكنك الآن الدخول إلى بوابة العضو.', 'Account password activated!') });
    } catch (err: any) {
      setActStatus({ err: err.message });
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackError('');
    setTrackResult(null);
    const res = await fetch(`/api/public/applications/status?code=${encodeURIComponent(trackCode)}&phone=${encodeURIComponent(trackPhone)}`);
    const data = await res.json();
    if (!res.ok) {
      setTrackError(data.error || 'لم يتم العثور على الطلب');
    } else {
      setTrackResult(data);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <section className="bg-slate-950 text-white py-14" style={{ backgroundColor: 'var(--sdg-navy, #0a192f)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <p className="text-xs font-semibold text-cyan-400">{t('بوابة الانضمام والتطوع', 'Membership & Volunteer Portal')}</p>
          <h1 className="text-3xl sm:text-4xl font-bold font-display">{t('انضم إلى مبادرة جيل رقمي آمن', 'Join Safe Digital Generation')}</h1>
          <p className="text-slate-300 max-w-2xl">
            {t('املأ استمارة العضوية والتطوع الإلكترونية، وأرفق صورة البطاقة الشخصية واختر اللجنة المناسبة ليصدر لك رقم العضوية والكارنيه الإلكتروني فور التقديم.', 'Complete the electronic membership form, attach your ID photos, and receive your official digital card right after submission.')}
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex gap-2 p-1 bg-white border border-slate-200 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setTab('apply')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg ${tab === 'apply' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
          >
            {t('تقديم طلب جديد', 'New Application')}
          </button>
          <button
            type="button"
            onClick={() => setTab('track')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg ${tab === 'track' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
          >
            {t('متابعة حالة طلب سابق', 'Track Application')}
          </button>
        </div>

        {tab === 'track' ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 max-w-2xl">
            <h2 className="text-xl font-bold text-slate-950 font-display">{t('الاستعلام عن حالة الطلب', 'Check Application Status')}</h2>
            <form onSubmit={handleTrack} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                required
                placeholder={t('رقم الطلب (مثال: APP-2026-...)', 'Application Number')}
                value={trackCode}
                onChange={(e) => setTrackCode(e.target.value)}
                className="px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl font-mono-num"
              />
              <input
                required
                placeholder={t('رقم الهاتف المسجل بالطلب', 'Registered Phone')}
                value={trackPhone}
                onChange={(e) => setTrackPhone(e.target.value)}
                className="px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl font-mono-num"
              />
              <button type="submit" className="sm:col-span-2 py-2.5 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-xl inline-flex items-center justify-center gap-2">
                <Search className="w-4 h-4" />
                <span>{t('استعلام', 'Search')}</span>
              </button>
            </form>

            {trackError && <p className="text-sm text-red-600">{trackError}</p>}
            {trackResult && (
              <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-950">{trackResult.application.full_name}</span>
                  <span className="font-mono-num text-xs font-semibold text-blue-700">{trackResult.application.application_number}</span>
                </div>
                <p className="text-sm">
                  {t('الحالة:', 'Status:')}{' '}
                  <strong className={trackResult.application.status === 'accepted' ? 'text-emerald-700' : trackResult.application.status === 'rejected' ? 'text-red-700' : 'text-amber-700'}>
                    {trackResult.application.status === 'accepted'
                      ? t('مقبول', 'Accepted')
                      : trackResult.application.status === 'rejected'
                        ? t('مرفوض', 'Rejected')
                        : trackResult.application.status === 'needs_info'
                          ? t('مطلوب استكمال بيانات', 'More Info Needed')
                          : t('قيد المراجعة', 'Pending Review')}
                  </strong>
                </p>
                {trackResult.application.assigned_committee_name && (
                  <p className="text-sm text-slate-600">{t('اللجنة:', 'Committee:')} {trackResult.application.assigned_committee_name}</p>
                )}
                {trackResult.application.admin_notes && (
                  <p className="text-sm text-slate-700 bg-white border border-slate-200 p-3 rounded-lg">{trackResult.application.admin_notes}</p>
                )}
                {trackResult.memberCard?.card_number && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/verify?card=${trackResult.memberCard.card_number}`)}
                      className="px-4 py-2 text-xs font-semibold bg-emerald-700 text-white rounded-lg"
                    >
                      {t('عرض وتحميل الكارنيه الإلكتروني', 'View & Download Electronic Card')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : result ? (
          <div className="space-y-8">
            <div className="bg-white border border-emerald-200 rounded-2xl p-6 sm:p-8 text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h2 className="text-2xl font-bold text-slate-950 font-display">
                {result.cardData ? t('تم تسجيل طلبك وإصدار الكارنيه الإلكتروني بنجاح!', 'Application Approved & Electronic Card Issued!') : t('تم تسجيل طلبك بنجاح!', 'Application Submitted!')}
              </h2>
              <p className="text-sm text-slate-600 max-w-xl mx-auto">{result.message}</p>

              <div className="flex flex-wrap justify-center gap-4 pt-2">
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3">
                  <p className="text-[11px] text-slate-500">{t('رقم الطلب', 'Application No.')}</p>
                  <p className="text-lg font-extrabold font-mono-num text-slate-900">{result.application_number}</p>
                </div>
                {result.member_number && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3">
                    <p className="text-[11px] text-blue-700">{t('رقم العضوية الرسمي', 'Member Number')}</p>
                    <p className="text-lg font-extrabold font-mono-num text-blue-800">{result.member_number}</p>
                  </div>
                )}
                {result.card_number && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3">
                    <p className="text-[11px] text-emerald-700">{t('رقم الكارنيه الإلكتروني', 'Card Number')}</p>
                    <p className="text-lg font-extrabold font-mono-num text-emerald-800">{result.card_number}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Immediate Electronic Membership Card */}
            {result.cardData && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-blue-700" />
                    <h3 className="text-lg font-bold text-slate-950 font-display">{t('الكارنيه الإلكتروني الرسمي الخاص بك', 'Your Official Electronic Card')}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/verify?card=${result.cardData.card.card_number}`)}
                    className="text-xs font-semibold text-blue-700 hover:underline"
                  >
                    {t('فتح رابط التحقق العام', 'Public Verify Link')}
                  </button>
                </div>

                <ElectronicCardView
                  member={{
                    ...result.cardData.card,
                    ...(result.cardData.member || {}),
                    card_number: result.cardData.card.card_number,
                    issue_date: result.cardData.card.issue_date,
                    expiry_date: result.cardData.card.expiry_date,
                    card_status: result.cardData.card.status
                  }}
                  design={result.cardData.design}
                  logos={result.cardData.logos}
                  qrDataUrl={result.cardData.qrDataUrl}
                  allowDownload={true}
                />
              </div>
            )}

            {/* Quick Member Password Activation */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-xl mx-auto space-y-4">
              <div className="flex items-center gap-2 text-blue-700">
                <KeyRound className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-950 font-display">
                  {t('تفعيل كلمة مرور حساب العضو (اختياري للدخول لاحقًا)', 'Activate Member Account Password')}
                </h3>
              </div>
              <p className="text-xs text-slate-600">
                {t('عيّن كلمة مرور لحسابك المسجل بالبريد الإلكتروني:', 'Set a password for your email:')} <strong className="font-mono-num">{form.email}</strong>
              </p>

              {actStatus.ok ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 text-sm text-emerald-800">
                  <p className="font-semibold">{actStatus.ok}</p>
                  <button
                    type="button"
                    onClick={() => navigate('/member')}
                    className="px-4 py-2 text-xs font-semibold bg-emerald-700 text-white rounded-lg"
                  >
                    {t('الدخول إلى بوابة العضو الآن', 'Go to Member Portal')}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleInlineActivate} className="flex flex-col sm:flex-row gap-3">
                  <input
                    required
                    type="password"
                    minLength={8}
                    value={actPassword}
                    onChange={(e) => setActPassword(e.target.value)}
                    placeholder={t('كلمة مرور جديدة (8 أحرف على الأقل)', 'New Password (8+ chars)')}
                    className="flex-1 px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl"
                  />
                  <button
                    type="submit"
                    disabled={actStatus.loading}
                    className="px-5 py-2.5 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-xl whitespace-nowrap"
                  >
                    {actStatus.loading ? t('جارٍ التفعيل...', 'Activating...') : t('تفعيل كلمة المرور', 'Activate Password')}
                  </button>
                </form>
              )}
              {actStatus.err && <p className="text-xs text-red-600">{actStatus.err}</p>}
            </div>

            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setTrackCode(result.application_number);
                  setTrackPhone(form.phone);
                  setTab('track');
                }}
                className="px-5 py-2.5 text-xs font-semibold bg-slate-900 text-white rounded-xl"
              >
                {t('متابعة حالة الطلب', 'Track Status')}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-8">
            {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{error}</div>}

            {/* Section 1: Personal */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-950 font-display border-b border-slate-200 pb-2">
                {t('1. البيانات الشخصية', '1. Personal Information')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t('الاسم بالكامل *', 'Full Name *')}</label>
                  <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t('تاريخ الميلاد', 'Birth Date')}</label>
                  <input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t('النوع', 'Gender')}</label>
                  <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl">
                    <option value="ذكر">{t('ذكر', 'Male')}</option>
                    <option value="أنثى">{t('أنثى', 'Female')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t('المحافظة *', 'Governorate *')}</label>
                  <input required value={form.governorate} onChange={(e) => setForm({ ...form, governorate: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl" placeholder={t('القاهرة، الجيزة، الإسكندرية...', 'Cairo, Giza...')} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t('المركز / المنطقة', 'District / Area')}</label>
                  <input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t('رقم الهاتف *', 'Phone *')}</label>
                  <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl font-mono-num" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t('رقم WhatsApp', 'WhatsApp')}</label>
                  <input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl font-mono-num" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t('البريد الإلكتروني *', 'Email *')}</label>
                  <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t('الصورة الشخصية (للكارنيه)', 'Personal Photo')}</label>
                  <label className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium border border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50">
                    <Upload className="w-4 h-4 text-blue-700" />
                    <span>{form.avatar_url ? t('تم رفع الصورة ✓', 'Uploaded ✓') : uploadingField === 'avatar_url' ? t('جارٍ الرفع...', 'Uploading...') : t('اختيار صورة', 'Choose Image')}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], 'avatar_url')} />
                  </label>
                  {(form.avatar_url || previewUrls.avatar_url) && (
                    <div className="mt-2 flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <img
                        src={form.avatar_url || previewUrls.avatar_url}
                        alt="معاينة الصورة الشخصية"
                        onClick={() => setZoomImage(form.avatar_url || previewUrls.avatar_url)}
                        className="w-11 h-11 rounded-lg object-cover border border-slate-200 cursor-zoom-in"
                      />
                      <div className="text-[11px] flex-1 min-w-0">
                        <p className="font-semibold text-emerald-700">{t('جاهزة للكارنيه', 'Ready for Card')}</p>
                        <button
                          type="button"
                          onClick={() => {
                            setForm((f) => ({ ...f, avatar_url: '' }));
                            setPreviewUrls((p) => { const n = { ...p }; delete n.avatar_url; return n; });
                          }}
                          className="text-red-600 hover:underline"
                        >
                          {t('إزالة الصورة', 'Remove')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: National ID Photos & Number */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h2 className="text-lg font-bold text-slate-950 font-display">
                  {t('2. بيانات وصور البطاقة الشخصية (معاينة قبل الإرسال)', '2. National ID Verification (Preview Before Submit)')}
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{t('محمية ومشفرة للإدارة فقط', 'Protected')}</span>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t('الرقم القومي (14 رقم)', 'National ID Number')}</label>
                  <input
                    value={form.national_id_number}
                    onChange={(e) => setForm({ ...form, national_id_number: e.target.value })}
                    placeholder="2990101..."
                    maxLength={14}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl font-mono-num"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t('صورة البطاقة — الوجه الأمامي *', 'National ID — Front Side *')}</label>
                  <label className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium border border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50">
                    <Upload className="w-4 h-4 text-blue-700" />
                    <span>{form.national_id_front_url ? t('تم رفع الوجه الأمامي ✓', 'Front Uploaded ✓') : uploadingField === 'national_id_front_url' ? t('جارٍ الرفع...', 'Uploading...') : t('رفع الوجه الأمامي', 'Upload Front')}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], 'national_id_front_url')} />
                  </label>
                  {(form.national_id_front_url || previewUrls.national_id_front_url) && (
                    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-2 space-y-1.5">
                      <img
                        src={form.national_id_front_url || previewUrls.national_id_front_url}
                        alt="معاينة الوجه الأمامي للبطاقة"
                        onClick={() => setZoomImage(form.national_id_front_url || previewUrls.national_id_front_url)}
                        className="h-28 w-full object-cover rounded-lg border border-slate-200 cursor-zoom-in"
                      />
                      <div className="flex items-center justify-between text-[11px] px-1">
                        <span className="text-emerald-700 font-semibold">{t('اضغط للتكبير والمعاينة', 'Click to inspect')}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setForm((f) => ({ ...f, national_id_front_url: '' }));
                            setPreviewUrls((p) => { const n = { ...p }; delete n.national_id_front_url; return n; });
                          }}
                          className="text-red-600 hover:underline"
                        >
                          {t('حذف', 'Remove')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t('صورة البطاقة — الوجه الخلفي *', 'National ID — Back Side *')}</label>
                  <label className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium border border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50">
                    <Upload className="w-4 h-4 text-blue-700" />
                    <span>{form.national_id_back_url ? t('تم رفع الوجه الخلفي ✓', 'Back Uploaded ✓') : uploadingField === 'national_id_back_url' ? t('جارٍ الرفع...', 'Uploading...') : t('رفع الوجه الخلفي', 'Upload Back')}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], 'national_id_back_url')} />
                  </label>
                  {(form.national_id_back_url || previewUrls.national_id_back_url) && (
                    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-2 space-y-1.5">
                      <img
                        src={form.national_id_back_url || previewUrls.national_id_back_url}
                        alt="معاينة الوجه الخلفي للبطاقة"
                        onClick={() => setZoomImage(form.national_id_back_url || previewUrls.national_id_back_url)}
                        className="h-28 w-full object-cover rounded-lg border border-slate-200 cursor-zoom-in"
                      />
                      <div className="flex items-center justify-between text-[11px] px-1">
                        <span className="text-emerald-700 font-semibold">{t('اضغط للتكبير والمعاينة', 'Click to inspect')}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setForm((f) => ({ ...f, national_id_back_url: '' }));
                            setPreviewUrls((p) => { const n = { ...p }; delete n.national_id_back_url; return n; });
                          }}
                          className="text-red-600 hover:underline"
                        >
                          {t('حذف', 'Remove')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {zoomImage && (
              <div
                onClick={() => setZoomImage(null)}
                className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4 cursor-zoom-out"
              >
                <img src={zoomImage} alt="معاينة الصورة" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl border border-white/20" />
              </div>
            )}

            {/* Section 3: Education */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-950 font-display border-b border-slate-200 pb-2">
                {t('3. البيانات التعليمية', '3. Educational Details')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t('المؤهل', 'Qualification')}</label>
                  <input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t('جهة الدراسة (الجامعة / المدرسة)', 'University / School')}</label>
                  <input value={form.university_school} onChange={(e) => setForm({ ...form, university_school: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t('التخصص', 'Major')}</label>
                  <input value={form.major} onChange={(e) => setForm({ ...form, major: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t('سنة الدراسة أو التخرج', 'Study / Graduation Year')}</label>
                  <input value={form.graduation_year} onChange={(e) => setForm({ ...form, graduation_year: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl" />
                </div>
              </div>
            </div>

            {/* Section 4: Volunteering */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-950 font-display border-b border-slate-200 pb-2">
                {t('4. بيانات التطوع واللجنة المرغوبة', '4. Volunteering & Committee')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t('اللجنة المرغوبة *', 'Preferred Committee *')}</label>
                  <select
                    required
                    value={form.preferred_committee_id}
                    onChange={(e) => setForm({ ...form, preferred_committee_id: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl"
                  >
                    <option value="">{t('-- اختر اللجنة --', '-- Select Committee --')}</option>
                    {committees.map((c) => (
                      <option key={c.id} value={c.id}>{t(c.name_ar, c.name_en)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t('أوقات التفرغ', 'Availability')}</label>
                  <input value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t('المهارات', 'Skills')}</label>
                  <textarea rows={2} value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t('الخبرات السابقة', 'Previous Experience')}</label>
                  <textarea rows={2} value={form.experiences} onChange={(e) => setForm({ ...form, experiences: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t('المجالات المهتم بها', 'Areas of Interest')}</label>
                  <input value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl" placeholder={t('الأمن السيبراني، البرمجة، الميديا...', 'Cybersecurity, Coding...')} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t('السيرة الذاتية (PDF اختياري)', 'CV / Resume (Optional PDF)')}</label>
                  <label className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium border border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50">
                    <Upload className="w-4 h-4 text-blue-700" />
                    <span>{form.cv_url ? t('تم إرفاق السيرة الذاتية ✓', 'CV Attached ✓') : t('رفع ملف PDF', 'Upload PDF')}</span>
                    <input type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], 'cv_url')} />
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t('سبب الرغبة في الانضمام للمبادرة *', 'Why do you want to join? *')}</label>
                  <textarea rows={3} required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl" />
                </div>
              </div>
            </div>

            {/* Section 5: Admin-Managed Dynamic Join Questions */}
            {joinQuestions.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-950 font-display border-b border-slate-200 pb-2">
                  {t('5. أسئلة التقييم الإضافية', '5. Additional Evaluation Questions')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {joinQuestions.map((q) => {
                    let opts: string[] = [];
                    try {
                      opts = JSON.parse(q.options_json || '[]');
                    } catch {
                      opts = [];
                    }
                    const qKey = String(q.id);
                    const val = customAnswers[qKey] || '';
                    return (
                      <div key={q.id} className={q.field_type === 'textarea' ? 'sm:col-span-2' : ''}>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t(q.question_ar, q.question_en || q.question_ar)}
                          {q.is_required ? ' *' : ''}
                        </label>
                        {q.field_type === 'textarea' ? (
                          <textarea
                            rows={2}
                            required={Boolean(q.is_required)}
                            value={val}
                            onChange={(e) => setCustomAnswers({ ...customAnswers, [qKey]: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                          />
                        ) : q.field_type === 'select' ? (
                          <select
                            required={Boolean(q.is_required)}
                            value={val}
                            onChange={(e) => setCustomAnswers({ ...customAnswers, [qKey]: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                          >
                            <option value="">{t('-- اختر إجابة --', '-- Select --')}</option>
                            {opts.map((opt, idx) => (
                              <option key={idx} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : q.field_type === 'yes_no' ? (
                          <select
                            required={Boolean(q.is_required)}
                            value={val}
                            onChange={(e) => setCustomAnswers({ ...customAnswers, [qKey]: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                          >
                            <option value="">{t('-- اختر --', '-- Choose --')}</option>
                            <option value="نعم">{t('نعم', 'Yes')}</option>
                            <option value="لا">{t('لا', 'No')}</option>
                          </select>
                        ) : q.field_type === 'radio' ? (
                          <div className="flex flex-wrap gap-3 pt-1">
                            {opts.map((opt, idx) => (
                              <label key={idx} className="inline-flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`jq_${q.id}`}
                                  required={Boolean(q.is_required)}
                                  checked={val === opt}
                                  onChange={() => setCustomAnswers({ ...customAnswers, [qKey]: opt })}
                                />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <input
                            type={q.field_type === 'number' ? 'number' : 'text'}
                            required={Boolean(q.is_required)}
                            value={val}
                            onChange={(e) => setCustomAnswers({ ...customAnswers, [qKey]: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || Boolean(uploadingField)}
              className="w-full sm:w-auto px-8 py-3 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--sdg-primary, #1d4ed8)' }}
            >
              {submitting ? t('جارٍ إرسال الطلب وإصدار الكارنيه...', 'Submitting...') : t('إرسال طلب العضوية وإصدار الكارنيه', 'Submit Application & Get Card')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export const PartnersPage: React.FC = () => {
  const { t } = useApp();
  const [partners, setPartners] = useState<PartnerItem[]>([]);

  useEffect(() => {
    fetch('/api/public/partners')
      .then((r) => r.json())
      .then((d) => setPartners(Array.isArray(d) ? d : []));
  }, []);

  return (
    <div className="bg-slate-50 min-h-screen">
      <section className="bg-slate-950 text-white py-14" style={{ backgroundColor: 'var(--sdg-navy, #0a192f)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <p className="text-xs font-semibold text-cyan-400">{t('الجهات الرسمية والداعمة', 'Official Umbrella & Partners')}</p>
          <h1 className="text-3xl sm:text-4xl font-bold font-display">{t('شركاء المبادرة والداعمون', 'Partners & Supporters')}</h1>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        {partners.map((p) => (
          <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="h-28 flex items-center justify-center bg-slate-50 rounded-xl p-3 border border-slate-100">
                <SafeImage src={p.logo_url} alt={p.name_ar} className="max-h-24 w-auto object-contain" />
              </div>
              <div>
                <span className="text-xs font-semibold text-blue-700">
                  {p.partner_type === 'umbrella' ? t('المظلة الرسمية', 'Official Umbrella') : p.partner_type === 'government' ? t('جهة حكومية مشرفة', 'Government Body') : t('شريك استراتيجي', 'Partner')}
                </span>
                <h2 className="text-lg font-bold text-slate-950 font-display mt-1">{t(p.name_ar, p.name_en)}</h2>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{t(p.description_ar, p.description_en)}</p>
              </div>
            </div>
            {p.website_url && p.website_url !== '/' && (
              <a
                href={p.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline"
              >
                <span>{t('زيارة الموقع الرسمي', 'Official Website')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const ContactPage: React.FC = () => {
  const { settings, t } = useApp();
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [sent, setSent] = useState('');
  const [err, setErr] = useState('');

  const email = settings.email || 'generationdigitalsafe@gmail.com';
  const phone = settings.phone || '01277714301';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    const res = await fetch('/api/public/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const data = await res.json();
    if (res.ok) {
      setSent(data.message);
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } else {
      setErr(data.error || 'تعذر الإرسال');
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <section className="bg-slate-950 text-white py-14" style={{ backgroundColor: 'var(--sdg-navy, #0a192f)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <p className="text-xs font-semibold text-cyan-400">{t('قنوات التواصل الرسمية', 'Official Channels')}</p>
          <h1 className="text-3xl sm:text-4xl font-bold font-display">{t('تواصل معنا', 'Contact Us')}</h1>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-950 font-display">{t('بيانات التواصل المباشر', 'Direct Contact Info')}</h2>
            <a href={`mailto:${email}`} className="flex items-center gap-3 text-sm text-slate-700 hover:text-blue-700">
              <Mail className="w-5 h-5 text-blue-700 shrink-0" />
              <span className="font-mono-num">{email}</span>
            </a>
            <a href={`tel:${phone}`} className="flex items-center gap-3 text-sm text-slate-700 hover:text-blue-700">
              <Phone className="w-5 h-5 text-blue-700 shrink-0" />
              <span className="font-mono-num" dir="ltr">{phone}</span>
            </a>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
            <h3 className="text-base font-bold text-slate-950 font-display">{t('منصات التواصل الاجتماعي', 'Social Media')}</h3>
            <div className="flex flex-col gap-2 text-sm">
              <a href={settings.facebook_url || 'https://www.facebook.com/generation.digital.safe'} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-blue-400">
                <span>Facebook — جيل رقمي آمن</span>
                <ExternalLink className="w-4 h-4 text-blue-700" />
              </a>
              <a href={settings.instagram_url || 'https://www.instagram.com/generation.digital.safe/'} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-blue-400">
                <span>Instagram — @generation.digital.safe</span>
                <ExternalLink className="w-4 h-4 text-blue-700" />
              </a>
              <a href={settings.tiktok_url || 'https://www.tiktok.com/@generation.digital.safe'} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-blue-400">
                <span>TikTok — @generation.digital.safe</span>
                <ExternalLink className="w-4 h-4 text-blue-700" />
              </a>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-950 font-display mb-4">{t('أرسل رسالة لإدارة المبادرة', 'Send a Message')}</h2>
          {sent ? (
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{sent}</span>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {err && <p className="text-sm text-red-600">{err}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input required placeholder={t('الاسم *', 'Name *')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl" />
                <input required type="email" placeholder={t('البريد الإلكتروني *', 'Email *')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input placeholder={t('رقم الهاتف', 'Phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl" />
                <input required placeholder={t('موضوع الرسالة *', 'Subject *')} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl" />
              </div>
              <textarea required rows={4} placeholder={t('نص الرسالة *', 'Message *')} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl" />
              <button type="submit" className="px-6 py-3 text-sm font-semibold text-white rounded-xl" style={{ backgroundColor: 'var(--sdg-primary, #1d4ed8)' }}>
                {t('إرسال الرسالة', 'Send Message')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
