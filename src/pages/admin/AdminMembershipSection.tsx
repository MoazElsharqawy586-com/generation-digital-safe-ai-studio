import React, { useEffect, useState } from 'react';
import { Check, Copy, Download, Edit3, HelpCircle, KeyRound, Plus, Save, Search, Trash2, Upload, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { exportCsv, uploadAdminFile } from './adminHelpers';
import { apiFetch } from '../../lib/authFetch';
import { AdminSectionSaveBar } from './AdminSectionSaveBar';
import type { JoinQuestion } from '../../types';

export const AdminApplicationsTab: React.FC = () => {
  const { committees, refreshBootstrap } = useApp();
  const [apps, setApps] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [reviewing, setReviewing] = useState<any>(null);
  const [reviewForm, setReviewForm] = useState({
    full_name: '',
    national_id_number: '',
    phone: '',
    whatsapp: '',
    email: '',
    governorate: '',
    area: '',
    qualification: '',
    university_school: '',
    major: '',
    graduation_year: '',
    preferred_committee_id: '',
    skills: '',
    experiences: '',
    reason: '',
    status: 'accepted',
    assigned_committee_id: '',
    position_title: 'عضو عامل',
    admin_notes: '',
    issue_card: true
  });

  // Dynamic Join Questions Manager
  const [showQuestions, setShowQuestions] = useState(false);
  const [questions, setQuestions] = useState<JoinQuestion[]>([]);
  const [editingQ, setEditingQ] = useState<JoinQuestion | null>(null);
  const [qForm, setQForm] = useState({ question_ar: '', question_en: '', field_type: 'text', optionsText: '', is_required: false });

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3000);
  };

  const load = () => {
    const qs = new URLSearchParams();
    if (statusFilter) qs.set('status', statusFilter);
    if (search) qs.set('search', search);
    return apiFetch(`/api/admin/applications?${qs}`)
      .then((r) => r.json())
      .then((d) => setApps(Array.isArray(d) ? d : []));
  };

  const loadQuestions = () => {
    return apiFetch('/api/admin/join-questions')
      .then((r) => r.json())
      .then((d) => setQuestions(Array.isArray(d) ? d : []));
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  useEffect(() => {
    loadQuestions();
  }, []);

  const saveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const options = qForm.optionsText
      .split(/[\n,،]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const url = editingQ ? `/api/admin/join-questions/${editingQ.id}` : '/api/admin/join-questions';
    const res = await apiFetch(url, {
      method: editingQ ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_ar: qForm.question_ar,
        question_en: qForm.question_en,
        field_type: qForm.field_type,
        options,
        is_required: qForm.is_required ? 1 : 0,
        is_active: editingQ ? editingQ.is_active : 1,
        sort_order: editingQ ? editingQ.sort_order : questions.length + 1
      })
    });
    if (res.ok) {
      setEditingQ(null);
      setQForm({ question_ar: '', question_en: '', field_type: 'text', optionsText: '', is_required: false });
      await loadQuestions();
      await refreshBootstrap();
      flash(editingQ ? 'تم تعديل وحفظ السؤال بنجاح ✓' : 'تمت إضافة وحفظ السؤال الجديد بنجاح ✓');
    }
  };

  const toggleQuestion = async (q: JoinQuestion, patch: Partial<JoinQuestion>) => {
    await apiFetch(`/api/admin/join-questions/${q.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });
    await loadQuestions();
    await refreshBootstrap();
    flash('تم حفظ حالة السؤال ✓');
  };

  const deleteQuestion = async (id: number) => {
    await apiFetch(`/api/admin/join-questions/${id}`, { method: 'DELETE' });
    await loadQuestions();
    await refreshBootstrap();
    flash('تم حذف السؤال بنجاح ✓');
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewing) return;
    await apiFetch(`/api/admin/applications/${reviewing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reviewForm)
    });
    setReviewing(null);
    await load();
    flash('تم حفظ تعديل البيانات والقرار بنجاح ✓');
  };

  const removeApp = async (id: number) => {
    await apiFetch(`/api/admin/applications/${id}`, { method: 'DELETE' });
    await load();
    flash('تم حذف الطلب بنجاح ✓');
  };

  const renderCustomAnswers = (jsonStr?: string) => {
    if (!jsonStr) return null;
    try {
      const parsed = JSON.parse(jsonStr);
      const entries = Object.entries(parsed || {}).filter(([, val]) => String(val || '').trim() !== '');
      if (entries.length === 0) return null;
      return (
        <div className="pt-2 border-t border-slate-200 space-y-1">
          <p className="font-bold text-slate-900">إجابات الأسئلة الإضافية:</p>
          {entries.map(([qId, answer]) => {
            const qObj = questions.find((x) => String(x.id) === String(qId));
            return (
              <p key={qId}>
                <strong>{qObj ? qObj.question_ar : `سؤال #${qId}`}:</strong> {String(answer)}
              </p>
            );
          })}
        </div>
      );
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-4">
      <AdminSectionSaveBar
        sectionName="طلبات العضوية والانضمام"
        notice={notice}
        onSave={async () => {
          await load();
          await loadQuestions();
          await refreshBootstrap();
          flash('تم حفظ ومزامنة طلبات العضوية والأسئلة بنجاح ✓');
        }}
      />

      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم، رقم الطلب، الهاتف..."
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg w-60"
          />
          <button type="button" onClick={load} className="px-3 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg inline-flex items-center gap-1">
            <Search className="w-3.5 h-3.5" /> بحث
          </button>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 text-xs border border-slate-300 rounded-lg">
            <option value="">جميع الحالات</option>
            <option value="pending">قيد المراجعة</option>
            <option value="accepted">مقبول</option>
            <option value="needs_info">استكمال بيانات</option>
            <option value="rejected">مرفوض</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowQuestions((s) => !s)}
            className={`px-3 py-2 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 border ${
              showQuestions ? 'bg-blue-700 text-white border-blue-700' : 'border-blue-300 text-blue-800 bg-blue-50 hover:bg-blue-100'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" /> إدارة أسئلة استمارة الانضمام ({questions.length})
          </button>
          <button type="button" onClick={() => exportCsv('applications.csv', apps)} className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg inline-flex items-center gap-1.5 hover:bg-slate-50">
            <Download className="w-3.5 h-3.5" /> تصدير CSV
          </button>
        </div>
      </div>

      {/* Dynamic Join Form Questions Panel */}
      {showQuestions && (
        <div className="bg-white border border-blue-200 rounded-2xl p-5 space-y-5 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-950 font-display">أسئلة استمارة الانضمام الإضافية</h3>
              <p className="text-slate-500 mt-0.5">تظهر هذه الأسئلة مباشرة للراغبين في الانضمام بصفحة التطوع وتصل إجاباتهم مع الطلب.</p>
            </div>
            <button type="button" onClick={() => setShowQuestions(false)} className="text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={saveQuestion} className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <input
              required
              placeholder="نص السؤال بالعربية *"
              value={qForm.question_ar}
              onChange={(e) => setQForm({ ...qForm, question_ar: e.target.value })}
              className="sm:col-span-5 px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
            <select
              value={qForm.field_type}
              onChange={(e) => setQForm({ ...qForm, field_type: e.target.value })}
              className="sm:col-span-3 px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="text">إجابة نصية قصيرة</option>
              <option value="textarea">فقرة نصية طويلة</option>
              <option value="select">قائمة اختيارات (Select)</option>
              <option value="radio">اختيار من متعدد (Radio)</option>
              <option value="yes_no">نعم / لا</option>
              <option value="number">رقم</option>
            </select>
            <label className="sm:col-span-2 flex items-center gap-1.5 font-semibold text-slate-700 px-2">
              <input
                type="checkbox"
                checked={qForm.is_required}
                onChange={(e) => setQForm({ ...qForm, is_required: e.target.checked })}
              />
              <span>سؤال إجباري</span>
            </label>
            <button type="submit" className="sm:col-span-2 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold inline-flex items-center justify-center gap-1">
              <Save className="w-3.5 h-3.5" /> {editingQ ? 'حفظ التعديل' : 'حفظ وإضافة السؤال'}
            </button>
            {editingQ && (
              <button
                type="button"
                onClick={() => {
                  setEditingQ(null);
                  setQForm({ question_ar: '', question_en: '', field_type: 'text', optionsText: '', is_required: false });
                }}
                className="sm:col-span-12 px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 font-semibold w-fit"
              >
                إلغاء تعديل السؤال
              </button>
            )}
            {(qForm.field_type === 'select' || qForm.field_type === 'radio') && (
              <input
                placeholder="الخيارات مفصولة بفاصلة (مثال: مبتدئ، متوسط، متقدم)"
                value={qForm.optionsText}
                onChange={(e) => setQForm({ ...qForm, optionsText: e.target.value })}
                className="sm:col-span-12 px-3 py-2 border border-slate-300 rounded-lg bg-white"
              />
            )}
          </form>

          <div className="divide-y divide-slate-100">
            {questions.length === 0 ? (
              <p className="py-4 text-center text-slate-500">لا توجد أسئلة إضافية مضافة بعد.</p>
            ) : (
              questions.map((q) => (
                <div key={q.id} className="py-2.5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">
                      {q.question_ar}{' '}
                      {q.is_required ? <span className="text-red-600">*</span> : null}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      النوع: {q.field_type} {q.options_json && q.options_json !== '[]' ? `· الخيارات: ${q.options_json}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(q.is_active)}
                        onChange={(e) => toggleQuestion(q, { is_active: e.target.checked ? 1 : 0 })}
                      />
                      <span>مفعل</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(q.is_required)}
                        onChange={(e) => toggleQuestion(q, { is_required: e.target.checked ? 1 : 0 })}
                      />
                      <span>إجباري</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        let parsedOpts: string[] = [];
                        try {
                          const p = JSON.parse(q.options_json || '[]');
                          if (Array.isArray(p)) parsedOpts = p;
                        } catch {
                          parsedOpts = [];
                        }
                        setEditingQ(q);
                        setQForm({
                          question_ar: q.question_ar || '',
                          question_en: q.question_en || '',
                          field_type: q.field_type || 'text',
                          optionsText: parsedOpts.join('، '),
                          is_required: Boolean(q.is_required)
                        });
                      }}
                      className="text-blue-700 font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> تعديل
                    </button>
                    <button type="button" onClick={() => deleteQuestion(q.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-xs text-start">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr>
              <th className="py-3 px-3 text-start">رقم الطلب</th>
              <th className="py-3 px-3 text-start">المتقدم</th>
              <th className="py-3 px-3 text-start">الهاتف / البريد</th>
              <th className="py-3 px-3 text-start">المحافظة</th>
              <th className="py-3 px-3 text-start">اللجنة المرغوبة</th>
              <th className="py-3 px-3 text-start">الحالة</th>
              <th className="py-3 px-3 text-start">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {apps.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">لا توجد طلبات مطابقة</td>
              </tr>
            ) : (
              apps.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-mono-num font-bold text-blue-700">{a.application_number}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{a.full_name}</td>
                  <td className="py-2.5 px-3 font-mono-num text-slate-600">{a.phone}<br />{a.email}</td>
                  <td className="py-2.5 px-3 text-slate-600">{a.governorate}</td>
                  <td className="py-2.5 px-3 text-slate-700">{a.preferred_committee_name || '-'}</td>
                  <td className="py-2.5 px-3 font-semibold">
                    {a.status === 'accepted' ? 'مقبول' : a.status === 'rejected' ? 'مرفوض' : a.status === 'needs_info' ? 'استكمال' : 'قيد المراجعة'}
                  </td>
                  <td className="py-2.5 px-3 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setReviewing(a);
                        setReviewForm({
                          full_name: a.full_name || '',
                          national_id_number: a.national_id_number || '',
                          phone: a.phone || '',
                          whatsapp: a.whatsapp || '',
                          email: a.email || '',
                          governorate: a.governorate || '',
                          area: a.area || '',
                          qualification: a.qualification || '',
                          university_school: a.university_school || '',
                          major: a.major || '',
                          graduation_year: a.graduation_year || '',
                          preferred_committee_id: String(a.preferred_committee_id || ''),
                          skills: a.skills || '',
                          experiences: a.experiences || '',
                          reason: a.reason || '',
                          status: a.status === 'pending' ? 'accepted' : a.status,
                          assigned_committee_id: String(a.assigned_committee_id || a.preferred_committee_id || ''),
                          position_title: 'عضو عامل',
                          admin_notes: a.admin_notes || '',
                          issue_card: true
                        });
                      }}
                      className="px-2.5 py-1 bg-blue-700 text-white rounded-md font-semibold"
                    >
                      تعديل ومراجعة
                    </button>
                    <button type="button" onClick={() => removeApp(a.id)} className="p-1 text-red-600 hover:bg-red-50 rounded-md">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {reviewing && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display text-slate-950">تعديل ومراجعة طلب العضوية: {reviewing.full_name}</h3>
              <button type="button" onClick={() => setReviewing(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            {(reviewing.national_id_front_url || reviewing.national_id_back_url || reviewing.custom_answers_json || reviewing.cv_url) && (
              <div className="bg-slate-50 rounded-xl p-4 text-xs space-y-1.5 text-slate-700">
                {(reviewing.national_id_front_url || reviewing.national_id_back_url) && (
                  <div className="space-y-2">
                    <p className="font-bold text-slate-900">صور البطاقة الشخصية:</p>
                    <div className="grid grid-cols-2 gap-3">
                      {reviewing.national_id_front_url && (
                        <a href={reviewing.national_id_front_url} target="_blank" rel="noopener noreferrer" className="block space-y-1">
                          <span className="text-[11px] text-slate-500">الوجه الأمامي (اضغط للتكبير)</span>
                          <img src={reviewing.national_id_front_url} alt="وجه البطاقة الأمامي" className="w-full h-28 object-cover rounded-lg border border-slate-200" />
                        </a>
                      )}
                      {reviewing.national_id_back_url && (
                        <a href={reviewing.national_id_back_url} target="_blank" rel="noopener noreferrer" className="block space-y-1">
                          <span className="text-[11px] text-slate-500">الوجه الخلفي (اضغط للتكبير)</span>
                          <img src={reviewing.national_id_back_url} alt="وجه البطاقة الخلفي" className="w-full h-28 object-cover rounded-lg border border-slate-200" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {renderCustomAnswers(reviewing.custom_answers_json)}

                {reviewing.cv_url && (
                  <a href={reviewing.cv_url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline inline-block pt-1">
                    عرض السيرة الذاتية المرفقة
                  </a>
                )}
              </div>
            )}
            <form onSubmit={submitReview} className="space-y-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="font-bold text-slate-900">تعديل بيانات المتقدم</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">الاسم الكامل *</label>
                    <input required value={reviewForm.full_name} onChange={(e) => setReviewForm({ ...reviewForm, full_name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">الرقم القومي</label>
                    <input inputMode="numeric" maxLength={14} value={reviewForm.national_id_number} onChange={(e) => setReviewForm({ ...reviewForm, national_id_number: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono-num" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">رقم الهاتف</label>
                    <input value={reviewForm.phone} onChange={(e) => setReviewForm({ ...reviewForm, phone: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono-num" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">رقم الواتساب</label>
                    <input value={reviewForm.whatsapp} onChange={(e) => setReviewForm({ ...reviewForm, whatsapp: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono-num" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">البريد الإلكتروني</label>
                    <input type="email" value={reviewForm.email} onChange={(e) => setReviewForm({ ...reviewForm, email: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">المحافظة</label>
                    <input value={reviewForm.governorate} onChange={(e) => setReviewForm({ ...reviewForm, governorate: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">المنطقة / المركز</label>
                    <input value={reviewForm.area} onChange={(e) => setReviewForm({ ...reviewForm, area: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">المؤهل</label>
                    <input value={reviewForm.qualification} onChange={(e) => setReviewForm({ ...reviewForm, qualification: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">الجامعة / المدرسة</label>
                    <input value={reviewForm.university_school} onChange={(e) => setReviewForm({ ...reviewForm, university_school: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">التخصص</label>
                    <input value={reviewForm.major} onChange={(e) => setReviewForm({ ...reviewForm, major: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">سنة التخرج</label>
                    <input value={reviewForm.graduation_year} onChange={(e) => setReviewForm({ ...reviewForm, graduation_year: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono-num" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">اللجنة المرغوبة</label>
                    <select value={reviewForm.preferred_committee_id} onChange={(e) => setReviewForm({ ...reviewForm, preferred_committee_id: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white">
                      <option value="">-- اختر اللجنة --</option>
                      {committees.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block font-semibold mb-1">المهارات</label>
                  <input value={reviewForm.skills} onChange={(e) => setReviewForm({ ...reviewForm, skills: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">الخبرات</label>
                  <input value={reviewForm.experiences} onChange={(e) => setReviewForm({ ...reviewForm, experiences: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">سبب الانضمام</label>
                  <textarea rows={2} value={reviewForm.reason} onChange={(e) => setReviewForm({ ...reviewForm, reason: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white" />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">القرار</label>
                <select value={reviewForm.status} onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                  <option value="accepted">قبول العضوية وتفعيل الملف</option>
                  <option value="needs_info">طلب استكمال البيانات</option>
                  <option value="rejected">رفض الطلب</option>
                  <option value="pending">إعادة لقيد المراجعة</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">اللجنة المعينة</label>
                <select value={reviewForm.assigned_committee_id} onChange={(e) => setReviewForm({ ...reviewForm, assigned_committee_id: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                  <option value="">-- اختر اللجنة --</option>
                  {committees.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">المسمى / المنصب</label>
                <input list="sdg-position-presets" value={reviewForm.position_title} onChange={(e) => setReviewForm({ ...reviewForm, position_title: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                <datalist id="sdg-position-presets">
                  <option value="عضو عامل" />
                  <option value="عضو لجنة" />
                  <option value="منسق عام لجنة" />
                  <option value="نائب رئيس لجنة" />
                  <option value="رئيس لجنة" />
                  <option value="منسق عام محافظة" />
                  <option value="نائب منسق عام محافظة" />
                </datalist>
              </div>
              <div>
                <label className="block font-semibold mb-1">ملاحظات الإدارة (تصل للمتقدم عند الاستعلام)</label>
                <textarea rows={2} value={reviewForm.admin_notes} onChange={(e) => setReviewForm({ ...reviewForm, admin_notes: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              {reviewForm.status === 'accepted' && (
                <label className="flex items-center gap-2 font-semibold text-slate-800">
                  <input type="checkbox" checked={reviewForm.issue_card} onChange={(e) => setReviewForm({ ...reviewForm, issue_card: e.target.checked })} />
                  <span>إصدار رقم عضوية وكارنيه إلكتروني مع QR Code تلقائيًا</span>
                </label>
              )}
              <button type="submit" className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-semibold inline-flex items-center justify-center gap-1.5">
                <Check className="w-4 h-4" /> حفظ البيانات والقرار
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const AdminMembersTab: React.FC = () => {
  const { committees, hasPermission } = useApp();
  const canCreateMember = hasPermission('members:create');
  const canEditMember = hasPermission('members:edit');
  const canDeleteMember = hasPermission('members:delete');
  const [members, setMembers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [committeeFilter, setCommitteeFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({
    member_number: '',
    full_name: '',
    national_id_number: '',
    email: '',
    phone: '',
    whatsapp: '',
    governorate: '',
    area: '',
    qualification: '',
    university_school: '',
    major: '',
    graduation_year: '',
    committee_id: '',
    position_title: 'عضو عامل',
    avatar_url: '',
    status: 'active',
    expires_at: '',
    no_expiry: false
  });

  // Member password activation modal state
  const [pwdModalMember, setPwdModalMember] = useState<any>(null);
  const [pwdInput, setPwdInput] = useState('');
  const [pwdResult, setPwdResult] = useState<{ email: string; password: string; message: string } | null>(null);
  const [pwdError, setPwdError] = useState('');

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3000);
  };

  const load = () => {
    const qs = new URLSearchParams();
    if (search) qs.set('search', search);
    if (statusFilter) qs.set('status', statusFilter);
    if (committeeFilter) qs.set('committee_id', committeeFilter);
    return apiFetch(`/api/admin/members?${qs}`)
      .then((r) => r.json())
      .then((d) => setMembers(Array.isArray(d) ? d : []));
  };

  useEffect(() => {
    load();
  }, [statusFilter, committeeFilter]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      member_number: '',
      full_name: '',
      national_id_number: '',
      email: '',
      phone: '',
      whatsapp: '',
      governorate: '',
      area: '',
      qualification: '',
      university_school: '',
      major: '',
      graduation_year: '',
      committee_id: '',
      position_title: 'عضو عامل',
      avatar_url: '',
      status: 'active',
      expires_at: '',
      no_expiry: false
    });
    setModalOpen(true);
  };

  const openEdit = (m: any) => {
    setEditing(m);
    setForm({
      member_number: m.member_number || '',
      full_name: m.full_name || '',
      national_id_number: m.national_id_number || '',
      email: m.email || '',
      phone: m.phone || '',
      whatsapp: m.whatsapp || '',
      governorate: m.governorate || '',
      area: m.area || '',
      qualification: m.qualification || '',
      university_school: m.university_school || '',
      major: m.major || '',
      graduation_year: m.graduation_year || '',
      committee_id: String(m.committee_id || ''),
      position_title: m.position_title || 'عضو عامل',
      avatar_url: m.avatar_url || '',
      status: m.status || 'active',
      expires_at: m.expires_at || '',
      no_expiry: !m.expires_at
    });
    setModalOpen(true);
  };

  const saveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editing ? `/api/admin/members/${editing.id}` : '/api/admin/members';
    const method = editing ? 'PATCH' : 'POST';
    await apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, expires_at: form.no_expiry ? '' : form.expires_at })
    });
    setModalOpen(false);
    await load();
    flash(editing ? 'تم حفظ تعديلات بيانات العضو بنجاح ✓' : 'تمت إضافة وحفظ العضو بنجاح ✓');
  };

  const issueCardForMember = async (m: any) => {
    const isPermanent = !m.expires_at || (String(m.position_title || '').includes('رئيس المبادرة') && !String(m.position_title || '').includes('نائب'));
    await apiFetch('/api/admin/cards/issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: m.id, no_expiry: isPermanent, expiry_date: isPermanent ? '' : m.expires_at })
    });
    await load();
    flash(`تم إصدار وحفظ كارنيه العضو ${m.full_name} بنجاح ✓`);
  };

  const deleteMember = async (id: number) => {
    await apiFetch(`/api/admin/members/${id}`, { method: 'DELETE' });
    await load();
    flash('تم حذف العضو بنجاح ✓');
  };

  const activateMemberPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdModalMember) return;
    setPwdError('');
    setPwdResult(null);
    const res = await apiFetch(`/api/admin/members/${pwdModalMember.id}/activate-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwdInput.trim() || undefined })
    });
    const d = await res.json();
    if (!res.ok) {
      setPwdError(d.error || 'تعذر تفعيل الحساب');
      return;
    }
    setPwdResult(d);
    await load();
    flash('تم حفظ وتفعيل كلمة مرور العضو بنجاح ✓');
  };

  return (
    <div className="space-y-4">
      <AdminSectionSaveBar
        sectionName="إدارة الأعضاء"
        notice={notice}
        onSave={async () => {
          await load();
          flash('تم حفظ ومزامنة بيانات الأعضاء بنجاح ✓');
        }}
      />

      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو رقم العضوية..." className="px-3 py-2 text-xs border border-slate-300 rounded-lg w-52" />
          <button type="button" onClick={load} className="px-3 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg">بحث</button>
          <select value={committeeFilter} onChange={(e) => setCommitteeFilter(e.target.value)} className="px-3 py-2 text-xs border border-slate-300 rounded-lg">
            <option value="">كل اللجان</option>
            {committees.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 text-xs border border-slate-300 rounded-lg">
            <option value="">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="suspended">موقوف</option>
            <option value="expired">منتهي</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => exportCsv('members.csv', members)} className="px-3 py-2 text-xs border border-slate-300 rounded-lg inline-flex items-center gap-1">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          {canCreateMember && (
            <button type="button" onClick={openAdd} className="px-3 py-2 text-xs font-semibold bg-blue-700 text-white rounded-lg inline-flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> إضافة عضو
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-xs text-start">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr>
              <th className="py-3 px-3 text-start">رقم العضوية</th>
              <th className="py-3 px-3 text-start">الاسم</th>
              <th className="py-3 px-3 text-start">اللجنة والمنصب</th>
              <th className="py-3 px-3 text-start">الكارنيه</th>
              <th className="py-3 px-3 text-start">حساب الدخول</th>
              <th className="py-3 px-3 text-start">الحالة</th>
              <th className="py-3 px-3 text-start">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-slate-500">لا يوجد أعضاء مسجلون بعد</td></tr>
            ) : (
              members.map((m) => (
                <tr key={m.id}>
                  <td className="py-2.5 px-3 font-mono-num font-bold text-blue-700">{m.member_number}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    {m.full_name}
                    <p className="text-[11px] font-normal font-mono-num text-slate-500">{m.email}</p>
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">{m.committee_name || 'عام'} · {m.position_title}</td>
                  <td className="py-2.5 px-3 font-mono-num">
                    {m.card_number ? (
                      <span className="text-emerald-700 font-semibold">{m.card_number}</span>
                    ) : (
                      <button type="button" onClick={() => issueCardForMember(m)} className="text-blue-700 underline">إصدار كارنيه</button>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    {canEditMember ? (
                      <button
                        type="button"
                        onClick={() => {
                          setPwdModalMember(m);
                          setPwdInput('');
                          setPwdResult(null);
                          setPwdError('');
                        }}
                        className={`inline-flex items-center gap-1 font-semibold hover:underline ${m.has_account ? 'text-emerald-700' : 'text-blue-700'}`}
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>{m.has_account ? 'تعيين كلمة مرور' : 'تفعيل كلمة مرور'}</span>
                      </button>
                    ) : (
                      <span className="text-slate-400">{m.has_account ? 'مفعل' : 'غير مفعل'}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-semibold">{m.status === 'active' ? 'نشط' : m.status === 'suspended' ? 'موقوف' : 'منتهي'}</td>
                  <td className="py-2.5 px-3 flex items-center gap-2">
                    {canEditMember && (
                      <button type="button" onClick={() => openEdit(m)} className="text-blue-700 font-semibold hover:underline">تعديل</button>
                    )}
                    {canDeleteMember && (
                      <button type="button" onClick={() => deleteMember(m.id)} className="text-red-600 hover:underline">حذف</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display">{editing ? 'تعديل بيانات العضو' : 'إضافة عضو جديد'}</h3>
              <button type="button" onClick={() => setModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={saveMember} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input required placeholder="الاسم بالكامل *" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
                <input placeholder="رقم العضوية (تلقائي إذا تُرك فارغًا)" value={form.member_number} onChange={(e) => setForm({ ...form, member_number: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg font-mono-num" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="الرقم القومي (14 رقمًا)" inputMode="numeric" maxLength={14} value={form.national_id_number} onChange={(e) => setForm({ ...form, national_id_number: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg font-mono-num" />
                <input placeholder="المحافظة" value={form.governorate} onChange={(e) => setForm({ ...form, governorate: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <input placeholder="المنطقة / المركز" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
                <input placeholder="البريد الإلكتروني" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
                <input placeholder="رقم الهاتف" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg font-mono-num" />
                <input placeholder="رقم الواتساب" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg font-mono-num" />
                <input placeholder="المؤهل" value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
                <input placeholder="الجامعة / المدرسة" value={form.university_school} onChange={(e) => setForm({ ...form, university_school: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
                <input placeholder="التخصص" value={form.major} onChange={(e) => setForm({ ...form, major: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
                <input placeholder="سنة التخرج" value={form.graduation_year} onChange={(e) => setForm({ ...form, graduation_year: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg font-mono-num" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select value={form.committee_id} onChange={(e) => setForm({ ...form, committee_id: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg">
                  <option value="">-- اللجنة --</option>
                  {committees.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                </select>
                <input list="sdg-position-presets-members" placeholder="المنصب (منسق عام محافظة / رئيس لجنة...)" value={form.position_title} onChange={(e) => setForm({ ...form, position_title: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
                <datalist id="sdg-position-presets-members">
                  <option value="رئيس المبادرة" />
                  <option value="نائب رئيس المبادرة" />
                  <option value="عضو عامل" />
                  <option value="عضو لجنة" />
                  <option value="منسق عام لجنة" />
                  <option value="نائب رئيس لجنة" />
                  <option value="رئيس لجنة" />
                  <option value="منسق عام محافظة" />
                  <option value="نائب منسق عام محافظة" />
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-3 items-center">
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg">
                  <option value="active">نشط</option>
                  <option value="suspended">موقوف</option>
                  <option value="expired">منتهي</option>
                </select>
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.no_expiry}
                      onChange={(e) => setForm({ ...form, no_expiry: e.target.checked, expires_at: e.target.checked ? '' : form.expires_at })}
                    />
                    <span>بدون تاريخ انتهاء (دائم)</span>
                  </label>
                  {!form.no_expiry && (
                    <input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg" />
                  )}
                </div>
              </div>
              <label className="flex items-center justify-center gap-2 py-2 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">
                <Upload className="w-4 h-4 text-blue-700" />
                <span>{form.avatar_url ? 'تم رفع الصورة ✓' : 'رفع صورة العضو'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) setForm({ ...form, avatar_url: await uploadAdminFile(file, 'avatars') });
                }} />
              </label>
              <button type="submit" className="w-full py-2.5 bg-blue-700 text-white rounded-xl font-semibold inline-flex items-center justify-center gap-1.5">
                <Save className="w-4 h-4" /> حفظ بيانات العضو
              </button>
            </form>
          </div>
        </div>
      )}

      {pwdModalMember && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display">تفعيل / تعيين كلمة مرور العضو</h3>
              <button type="button" onClick={() => setPwdModalMember(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-900">{pwdModalMember.full_name}</p>
              <p className="font-mono-num">{pwdModalMember.email || 'لا يوجد بريد إلكتروني مسجل'}</p>
            </div>

            {pwdError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">{pwdError}</div>}

            {pwdResult ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 text-xs text-emerald-900">
                <p className="font-bold">{pwdResult.message}</p>
                <div className="bg-white border border-emerald-200 rounded-lg p-3 space-y-1 font-mono-num">
                  <p>البريد: {pwdResult.email}</p>
                  <p>كلمة المرور: <strong>{pwdResult.password}</strong></p>
                </div>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(`البريد: ${pwdResult.email}\nكلمة المرور: ${pwdResult.password}`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 text-white rounded-lg font-semibold"
                >
                  <Copy className="w-3.5 h-3.5" /> نسخ بيانات الدخول
                </button>
              </div>
            ) : (
              <form onSubmit={activateMemberPassword} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">كلمة المرور الجديدة (اتركها فارغة للتوليد التلقائي)</label>
                  <input
                    type="text"
                    value={pwdInput}
                    onChange={(e) => setPwdInput(e.target.value)}
                    placeholder="مثال: SafeGen2026 (8 أحرف على الأقل أو فارغ)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono-num"
                  />
                </div>
                <button type="submit" className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-semibold">
                  تفعيل وحفظ كلمة المرور
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
