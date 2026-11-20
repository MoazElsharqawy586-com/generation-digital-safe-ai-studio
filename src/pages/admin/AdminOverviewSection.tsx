import React, { useEffect, useState } from 'react';
import { Award, Building2, Calendar, FileText, GraduationCap, ShieldCheck, Users } from 'lucide-react';
import { apiFetch } from '../../lib/authFetch';
import { AdminSectionSaveBar } from './AdminSectionSaveBar';

export const AdminOverviewSection: React.FC<{ onJump: (tab: string) => void }> = ({ onJump }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  const loadDashboard = async () => {
    const r = await apiFetch('/api/admin/dashboard');
    const d = await r.json();
    setData(d);
    setLoading(false);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading || !data) {
    return <div className="p-8 text-center text-slate-500 text-sm">جارٍ تحميل إحصائيات المنصة...</div>;
  }

  const c = data.counts || {};
  const kpis = [
    { label: 'إجمالي الأعضاء', val: c.totalMembers ?? 0, icon: Users, tab: 'members' },
    { label: 'طلبات عضوية جديدة', val: c.pendingApplications ?? 0, icon: ShieldCheck, tab: 'applications' },
    { label: 'الأنشطة والفعاليات', val: c.totalEvents ?? 0, icon: Calendar, tab: 'events' },
    { label: 'البرامج التدريبية', val: c.totalTrainings ?? 0, icon: GraduationCap, tab: 'trainings' },
    { label: 'الأخبار المنشورة', val: c.totalNews ?? 0, icon: FileText, tab: 'news' },
    { label: 'اللجان التخصصية', val: c.totalCommittees ?? 0, icon: Building2, tab: 'committees' },
    { label: 'الشهادات الصادرة', val: c.totalCertificates ?? 0, icon: Award, tab: 'certificates' },
    { label: 'الشركاء والداعمون', val: c.totalPartners ?? 0, icon: Building2, tab: 'partners' }
  ];

  return (
    <div className="space-y-6">
      <AdminSectionSaveBar
        sectionName="نظرة عامة"
        notice={notice}
        saveLabel="حفظ وتحديث الإحصائيات"
        onSave={async () => {
          await loadDashboard();
          setNotice('تم تحديث وحفظ ملخص المنصة بنجاح ✓');
          setTimeout(() => setNotice(''), 3000);
        }}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k, idx) => {
          const Icon = k.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onJump(k.tab)}
              className="text-start bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-4 transition-colors"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium">{k.label}</span>
                <Icon className="w-4 h-4 text-blue-700" />
              </div>
              <p className="text-2xl font-extrabold text-slate-950 font-mono-num">{k.val}</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Applications */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-950 font-display">أحدث طلبات الانضمام</h3>
            <button type="button" onClick={() => onJump('applications')} className="text-xs font-semibold text-blue-700 hover:underline">
              مراجعة الطلبات
            </button>
          </div>
          {data.recentApplications?.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">لا توجد طلبات جديدة حتى الآن.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recentApplications.map((app: any) => (
                <div key={app.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <p className="font-semibold text-slate-900">{app.full_name}</p>
                    <p className="text-slate-500">{app.preferred_committee_name || 'غير محدد'} · <span className="font-mono-num">{app.application_number}</span></p>
                  </div>
                  <span className={`font-semibold ${app.status === 'accepted' ? 'text-emerald-700' : app.status === 'rejected' ? 'text-red-600' : 'text-amber-700'}`}>
                    {app.status === 'accepted' ? 'مقبول' : app.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Committee Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="text-base font-bold text-slate-950 font-display">توزيع الأعضاء على اللجان</h3>
          <div className="space-y-2.5">
            {data.committeeDistribution?.map((cd: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs border-b border-slate-100 pb-2 last:border-0">
                <span className="text-slate-700 font-medium">{cd.name_ar}</span>
                <span className="font-mono-num font-bold text-slate-950">{cd.members_count} عضو</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Trail */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-950 font-display">أحدث العمليات الإدارية</h3>
          <button type="button" onClick={() => onJump('audit')} className="text-xs font-semibold text-blue-700 hover:underline">
            السجل الكامل
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-2 px-3 text-start">المشرف</th>
                <th className="py-2 px-3 text-start">الإجراء</th>
                <th className="py-2 px-3 text-start">العنصر</th>
                <th className="py-2 px-3 text-start">التوقيت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.recentLogs?.map((log: any) => (
                <tr key={log.id}>
                  <td className="py-2 px-3 font-mono-num">{log.admin_email}</td>
                  <td className="py-2 px-3 font-semibold text-slate-800">{log.action}</td>
                  <td className="py-2 px-3 text-slate-600">{log.entity_type} #{log.entity_id}</td>
                  <td className="py-2 px-3 font-mono-num text-slate-500">{log.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
