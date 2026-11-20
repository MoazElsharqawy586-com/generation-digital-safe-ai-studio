import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2, CreditCard, LogOut, QrCode, Search, ShieldAlert, ShieldCheck, UserCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ElectronicCardView } from '../components/ElectronicCardView';
import { CertificateView } from '../components/CertificateView';
import { apiFetch } from '../lib/authFetch';
import { normalizeArabicDigits, parseEgyptianNationalId, type ParsedEgyptianNationalId } from '../lib/egyptianNationalId';
import { trackEvent } from '../lib/analytics';

export const VerifyPage: React.FC = () => {
  const { t, navigate } = useApp();
  const [mode, setMode] = useState<'card' | 'cert' | 'nid'>('card');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cardRes, setCardRes] = useState<any>(null);
  const [certRes, setCertRes] = useState<any>(null);
  const [nidCivil, setNidCivil] = useState<ParsedEgyptianNationalId | null>(null);

  const runVerify = async (type: 'card' | 'cert' | 'nid', code: string) => {
    const normalized = normalizeArabicDigits(code).trim();
    if (!normalized) return;
    setLoading(true);
    setError('');
    setCardRes(null);
    setCertRes(null);
    setNidCivil(null);

    if (type === 'nid') {
      const parsed = parseEgyptianNationalId(normalized);
      setNidCivil(parsed);
      if (!parsed.isValid) {
        setError(parsed.errorAr || t('يرجى إدخال رقم قومي مصري صحيح مكون من 14 رقمًا.', 'Please enter a valid 14-digit Egyptian National ID.'));
        trackEvent('verify_lookup', { mode: 'nid', found: false, civil_valid: false });
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/public/verify/card/${encodeURIComponent(parsed.clean)}`);
        if (res.ok) {
          const data = await res.json();
          setCardRes(data);
          trackEvent('verify_lookup', { mode: 'nid', found: true, civil_valid: true });
        } else {
          trackEvent('verify_lookup', { mode: 'nid', found: false, civil_valid: true });
        }
      } catch {
        trackEvent('verify_lookup', { mode: 'nid', found: false, civil_valid: true });
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const url = type === 'card' ? `/api/public/verify/card/${encodeURIComponent(normalized)}` : `/api/public/verify/certificate/${encodeURIComponent(normalized)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'غير موجود');
      if (type === 'card') setCardRes(data);
      else setCertRes(data);
      trackEvent('verify_lookup', { mode: type, found: true });
    } catch (e: any) {
      trackEvent('verify_lookup', { mode: type, found: false });
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nid = params.get('nid');
    const card = params.get('card') || params.get('token') || params.get('member');
    const cert = params.get('cert');
    if (nid) {
      setMode('nid');
      setQuery(nid);
      runVerify('nid', nid);
    } else if (card) {
      setMode('card');
      setQuery(card);
      runVerify('card', card);
    } else if (cert) {
      setMode('cert');
      setQuery(cert);
      runVerify('cert', cert);
    }
  }, []);

  return (
    <div className="bg-slate-50 min-h-screen">
      <section className="bg-slate-950 text-white py-14" style={{ backgroundColor: 'var(--sdg-navy, #0a192f)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <div className="inline-flex items-center gap-2 text-cyan-400 text-xs font-semibold">
            <QrCode className="w-4 h-4" />
            <span>{t('نظام التوثيق والتحقق الرقمي', 'QR Digital Verification')}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-display">{t('التحقق من صحة العضوية والشهادات والرقم القومي', 'Verify Cards, Certificates & National ID')}</h1>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setMode('card');
                setError('');
                setNidCivil(null);
              }}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border ${
                mode === 'card' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>{t('التحقق من كارنيه العضوية', 'Verify Membership Card')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('nid');
                setError('');
                setCertRes(null);
              }}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border ${
                mode === 'nid' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>{t('التحقق من الرقم القومي', 'Verify National ID')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('cert');
                setError('');
                setNidCivil(null);
              }}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border ${
                mode === 'cert' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>{t('التحقق من الشهادة الإلكترونية', 'Verify Certificate')}</span>
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              runVerify(mode, query);
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <input
              required
              inputMode={mode === 'nid' ? 'numeric' : undefined}
              maxLength={mode === 'nid' ? 14 : undefined}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                mode === 'nid'
                  ? t('أدخل الرقم القومي المصري المكون من 14 رقمًا لفحصه والتحقق من العضوية', 'Enter 14-digit Egyptian National ID')
                  : mode === 'card'
                    ? t('أدخل رقم العضوية (000001) أو رقم الكارنيه (CARD-...) أو الرقم القومي (14 رقمًا)', 'Enter Member No. (000001), Card No., or National ID')
                    : t('أدخل رقم الشهادة (CERT-...)', 'Enter Certificate Number')
              }
              className="flex-1 px-4 py-3 text-sm border border-slate-300 rounded-xl font-mono-num"
            />
            <button type="submit" disabled={loading} className="px-6 py-3 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-xl inline-flex items-center justify-center gap-2">
              <Search className="w-4 h-4" />
              <span>{loading ? t('جارٍ التحقق...', 'Checking...') : mode === 'nid' ? t('فحص وتحقق', 'Inspect & Verify') : t('تحقق الآن', 'Verify')}</span>
            </button>
          </form>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Egyptian National ID Civil Verification Unit Output */}
        {mode === 'nid' && nidCivil?.isValid && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-950 font-display">{t('وحدة فحص وتحقق الرقم القومي', 'National ID Verification Unit')}</h2>
                  <p className="text-xs text-slate-500 font-mono-num">{nidCivil.clean}</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                {t('رقم قومي مصري صحيح (14 رقمًا)', 'Valid Egyptian National ID (14 digits)')}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 p-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">{t('تاريخ الميلاد', 'Birth Date')}</p>
                <p className="text-sm sm:text-base font-bold text-slate-900">{nidCivil.birthDateAr}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">{t('النوع', 'Gender')}</p>
                <p className="text-sm sm:text-base font-bold text-slate-900">{nidCivil.gender}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">{t('السن', 'Age')}</p>
                <p className="text-sm sm:text-base font-bold text-slate-900 font-mono-num">{nidCivil.age} {t('سنة', 'yrs')}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">{t('محافظة الميلاد', 'Birth Governorate')}</p>
                <p className="text-sm sm:text-base font-bold text-slate-900">
                  {nidCivil.governorate} <span className="text-xs font-mono-num text-slate-500">({nidCivil.governorateCode})</span>
                </p>
              </div>
            </div>

            {!cardRes && (
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700">
                <span>{t('الرقم القومي صحيح مدنيًا، ولا يوجد له كارنيه عضوية نشط مسجل بالمبادرة حاليًا.', 'National ID is civilly valid, with no active initiative card registered under this ID.')}</span>
                <button
                  type="button"
                  onClick={() => navigate('/join')}
                  className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold"
                >
                  {t('التقديم على العضوية الآن', 'Apply for Membership')}
                </button>
              </div>
            )}
          </div>
        )}

        {cardRes && (
          <div className="space-y-6">
            <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-semibold ${cardRes.valid ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <span>
                {cardRes.valid
                  ? !cardRes.card.expiry_date
                    ? t(`عضوية قيادية موثقة وسارية (دائمة بدون تاريخ انتهاء) — ${cardRes.card.full_name}`, `Verified Permanent Leadership Card — ${cardRes.card.full_name}`)
                    : t(`عضوية موثقة وسارية — ${cardRes.card.full_name}`, `Verified Active Membership — ${cardRes.card.full_name}`)
                  : t('هذه البطاقة موقوفة أو منتهية الصلاحية', 'This membership card is suspended or expired')}
              </span>
            </div>
            <ElectronicCardView
              member={cardRes.card}
              design={cardRes.design}
              logos={cardRes.logos}
              qrDataUrl={cardRes.qrDataUrl}
              allowDownload={cardRes.valid}
            />
          </div>
        )}

        {certRes && (
          <div className="space-y-6">
            <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-semibold ${certRes.valid ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>
                {certRes.valid
                  ? t(`شهادة معتمدة وصحيحة — صادرة باسم ${certRes.certificate.recipient_name}`, `Verified Valid Certificate — ${certRes.certificate.recipient_name}`)
                  : t('هذه الشهادة ملغاة', 'This certificate has been revoked')}
              </span>
            </div>
            <CertificateView cert={certRes.certificate} qrDataUrl={certRes.qrDataUrl} />
          </div>
        )}
      </div>
    </div>
  );
};

export const MemberPortalPage: React.FC = () => {
  const { user, t, navigate, logout } = useApp();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    apiFetch('/api/member/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setProfile(d))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <p className="text-slate-600">{t('يرجى تسجيل الدخول لعرض بوابة العضو والكارنيه الإلكتروني.', 'Please login to view your Member Portal.')}</p>
        <button type="button" onClick={() => navigate('/login')} className="px-5 py-2.5 bg-blue-700 text-white rounded-xl text-sm font-semibold">
          {t('تسجيل الدخول', 'Login')}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-950 font-display">{user.name}</h1>
              <p className="text-xs text-slate-500 font-mono-num">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user.adminRole && (
              <button type="button" onClick={() => navigate('/admin')} className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg">
                {t('فتح لوحة الإدارة', 'Open Admin')}
              </button>
            )}
            <button type="button" onClick={logout} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">
              <LogOut className="w-3.5 h-3.5" />
              <span>{t('تسجيل الخروج', 'Logout')}</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">{t('جارٍ التحميل...', 'Loading...')}</div>
        ) : !profile?.member ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
            <h2 className="text-lg font-bold text-slate-900">{t('حسابك غير مرتبط بملف عضوية معتمد بعد', 'No active membership profile linked yet')}</h2>
            <p className="text-sm text-slate-600">{t('إذا قدمت طلب عضوية بنفس البريد الإلكتروني، سيظهر كارنيهك الإلكتروني هنا تلقائيًا بمجرد موافقة الإدارة.', 'Once your application with this email is approved, your electronic card will appear here automatically.')}</p>
            <button type="button" onClick={() => navigate('/join')} className="px-5 py-2.5 bg-blue-700 text-white rounded-xl text-sm font-semibold">
              {t('تقديم أو متابعة طلب العضوية', 'Apply or Track Application')}
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {profile.cardData && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                <h2 className="text-lg font-bold text-slate-950 font-display">{t('الكارنيه الإلكتروني الرسمي', 'Official Electronic Membership Card')}</h2>
                <ElectronicCardView
                  member={{
                    ...profile.member,
                    card_number: profile.cardData.card.card_number,
                    issue_date: profile.cardData.card.issue_date,
                    expiry_date: profile.cardData.card.expiry_date,
                    card_status: profile.cardData.card.status
                  }}
                  design={profile.cardData.design}
                  logos={profile.cardData.logos}
                  qrDataUrl={profile.cardData.qrDataUrl}
                />
              </div>
            )}

            {profile.certificates?.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-bold text-slate-950 font-display flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-700" />
                    <span>{t(`شهاداتي المعتمدة (${profile.certificates.length})`, `My Verified Certificates (${profile.certificates.length})`)}</span>
                  </h2>
                </div>
                <div className="space-y-8">
                  {profile.certificates.map((cert: any) => (
                    <div key={cert.id} className="space-y-3 border-t border-slate-100 pt-6 first:border-t-0 first:pt-0">
                      <CertificateView cert={cert} qrDataUrl={cert.qrDataUrl || ''} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {profile.notifications?.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
                <h2 className="text-lg font-bold text-slate-950 font-display">{t('الإشعارات', 'Notifications')}</h2>
                {profile.notifications.map((n: any) => (
                  <div key={n.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                    <p className="font-semibold text-slate-900">{n.title_ar}</p>
                    <p className="text-slate-600 text-xs mt-0.5">{n.message_ar}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const LoginPage: React.FC = () => {
  const { t, applyAuthSession, navigate } = useApp();
  const [mode, setMode] = useState<'login' | 'bootstrap'>('login');
  const [needsAdminSetup, setNeedsAdminSetup] = useState(false);
  const [officialEmail, setOfficialEmail] = useState('generationdigitalsafe@gmail.com');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch('/api/auth/setup-status')
      .then((r) => r.json())
      .then((d) => {
        if (d.needsAdminSetup) {
          setNeedsAdminSetup(true);
          setOfficialEmail(d.officialAdminEmail || 'generationdigitalsafe@gmail.com');
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const endpoint = mode === 'bootstrap' ? '/api/auth/bootstrap-admin' : '/api/auth/login';
      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشلت العملية');
      applyAuthSession(data.user || null, data.token || null);
      if (data.user?.adminRole) {
        navigate('/admin');
      } else {
        navigate('/member');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-slate-950 font-display">
            {mode === 'bootstrap'
              ? t('تفعيل حساب المدير العام الأول', 'Activate Super Admin Account')
              : t('تسجيل الدخول إلى المنصة', 'Platform Login')}
          </h1>
          <p className="text-xs text-slate-500">{t('مبادرة جيل رقمي آمن — SAFE DIGITAL GENERATION', 'Safe Digital Generation Initiative')}</p>
        </div>

        {needsAdminSetup && mode !== 'bootstrap' && (
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-2">
            <p className="font-semibold">{t('تهيئة المنصة لأول مرة:', 'First-time Platform Setup:')}</p>
            <p>{t('لم يتم إنشاء حساب المدير العام بعد. يمكنك تفعيل البريد الإداري الرسمي وتعيين كلمة المرور الخاصة بك الآن.', 'No Super Admin exists yet. Activate the official admin email now.')}</p>
            <button
              type="button"
              onClick={() => {
                setMode('bootstrap');
                setForm({ name: 'المدير العام — جيل رقمي آمن', email: officialEmail, password: '' });
              }}
              className="px-3 py-1.5 bg-blue-700 text-white rounded-lg font-semibold"
            >
              {t('تفعيل حساب المدير العام', 'Activate Super Admin')}
            </button>
          </div>
        )}

        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'bootstrap' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t('الاسم الكامل', 'Full Name')}</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl" />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{t('البريد الإلكتروني', 'Email')}</label>
            <input
              required
              type="email"
              readOnly={mode === 'bootstrap'}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder={mode === 'bootstrap' ? officialEmail : 'name@example.com'}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl read-only:bg-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{t('كلمة المرور', 'Password')}</label>
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

          <button type="submit" disabled={loading} className="w-full py-3 text-sm font-semibold text-white rounded-xl" style={{ backgroundColor: 'var(--sdg-primary, #1d4ed8)' }}>
            {loading
              ? t('جارٍ التنفيذ...', 'Processing...')
              : mode === 'bootstrap'
                ? t('إنشاء وتفعيل حساب المدير العام', 'Create & Activate Super Admin')
                : t('دخول', 'Sign In')}
          </button>
        </form>

        {mode !== 'bootstrap' && (
          <div className="pt-3 border-t border-slate-100 text-center space-y-1.5">
            <p className="text-xs text-slate-500">{t('عضو جديد وتريد الانضمام للمبادرة؟', 'New applicant looking to join?')}</p>
            <button
              type="button"
              onClick={() => navigate('/join')}
              className="text-xs font-semibold text-blue-700 hover:text-blue-800 hover:underline"
            >
              {t('قدّم طلب الانضمام وأنشئ كلمة المرور الآن', 'Submit membership application & create password')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
