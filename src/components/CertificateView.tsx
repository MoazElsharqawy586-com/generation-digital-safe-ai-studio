import React, { useState } from 'react';
import { Award, Download, Printer } from 'lucide-react';
import { SafeImage } from './SafeImage';

export interface CertificateDisplayData {
  certificate_number: string;
  recipient_name: string;
  course_title: string;
  issue_date: string;
  trainer_name?: string;
  template_style?: string;
  status: string;
}

interface CertificateViewProps {
  cert: CertificateDisplayData;
  qrDataUrl: string;
}

export const CertificateView: React.FC<CertificateViewProps> = ({ cert, qrDataUrl }) => {
  const [exporting, setExporting] = useState(false);

  const downloadPng = async () => {
    setExporting(true);
    try {
      const W = 1200;
      const H = 850;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, W, H);

      // Outer navy border & inner cyan line
      ctx.strokeStyle = '#0A192F';
      ctx.lineWidth = 22;
      ctx.strokeRect(24, 24, W - 48, H - 48);

      ctx.strokeStyle = '#06B6D4';
      ctx.lineWidth = 3;
      ctx.strokeRect(46, 46, W - 92, H - 92);

      // Load 3 official logos
      const load = (src: string) =>
        new Promise<HTMLImageElement | null>((res) => {
          const i = new Image();
          i.crossOrigin = 'anonymous';
          i.onload = () => res(i);
          i.onerror = () => res(null);
          i.src = src;
        });

      const [l1, l2, l3, qrImg] = await Promise.all([
        load('/assets/aistudio/FB_IMG_1789831319399_ac126220.jpg'),
        load('/assets/aistudio/FB_IMG_1790438684231_64912c2d.jpg'),
        load('/assets/aistudio/FB_IMG_1792797530698_77e851bd.jpg'),
        load(qrDataUrl)
      ]);

      if (l1) ctx.drawImage(l1, W / 2 - 55, 72, 110, 110);
      if (l2) ctx.drawImage(l2, W - 210, 75, 110, 110);
      if (l3) ctx.drawImage(l3, 100, 75, 110, 110);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#0A192F';
      ctx.font = 'bold 42px Cairo, sans-serif';
      ctx.fillText('شهادة إتمام وتقدير رسمية', W / 2, 245);

      ctx.fillStyle = '#0284C7';
      ctx.font = '600 20px Cairo, sans-serif';
      ctx.fillText('مبادرة جيل رقمي آمن — SAFE DIGITAL GENERATION', W / 2, 285);

      ctx.fillStyle = '#475569';
      ctx.font = '500 22px Cairo, sans-serif';
      ctx.fillText('تشهد إدارة مبادرة جيل رقمي آمن بأن المتدرب / المشارك:', W / 2, 355);

      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 46px Cairo, sans-serif';
      ctx.fillText(cert.recipient_name, W / 2, 425);

      ctx.fillStyle = '#334155';
      ctx.font = '500 22px Cairo, sans-serif';
      ctx.fillText('قد أتم بنجاح متطلبات البرنامج التدريبي / النشاط:', W / 2, 490);

      ctx.fillStyle = '#1D4ED8';
      ctx.font = 'bold 32px Cairo, sans-serif';
      ctx.fillText(cert.course_title, W / 2, 545);

      ctx.fillStyle = '#475569';
      ctx.font = '500 18px Cairo, sans-serif';
      ctx.fillText(
        `تاريخ الإصدار: ${cert.issue_date}   |   المدرب / الجهة: ${cert.trainer_name || 'لجنة التدريب والتثقيف'}   |   رقم الشهادة: ${cert.certificate_number}`,
        W / 2,
        615
      );

      if (qrImg) {
        ctx.drawImage(qrImg, 95, 645, 120, 120);
      }

      ctx.fillStyle = '#64748B';
      ctx.font = '500 15px Cairo, sans-serif';
      ctx.fillText(
        'تحت مظلة الاتحاد النوعي للجمعيات العاملة في مجال التنمية المجتمعية (حكاية وطن) — المشهر برقم 1279 لسنة 2025 بوزارة التضامن الاجتماعي',
        W / 2,
        785
      );

      const link = document.createElement('a');
      link.download = `SDG-Certificate-${cert.certificate_number}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="print-area bg-white border-[10px] border-slate-900 rounded-xl p-6 sm:p-10 shadow-xl max-w-4xl mx-auto relative">
        <div className="border-2 border-cyan-500/70 rounded-lg p-6 sm:p-8 space-y-6 text-center">
          {/* Official Seals Row */}
          <div className="flex items-center justify-between gap-4">
            <SafeImage src="/assets/aistudio/FB_IMG_1790438684231_64912c2d.jpg" alt="حكاية وطن" className="w-16 h-16 sm:w-20 sm:h-20 object-contain" />
            <SafeImage src="/assets/aistudio/FB_IMG_1789831319399_ac126220.jpg" alt="جيل رقمي آمن" className="w-20 h-20 sm:w-24 sm:h-24 object-contain" />
            <SafeImage src="/assets/aistudio/FB_IMG_1792797530698_77e851bd.jpg" alt="وزارة التضامن الاجتماعي" className="w-16 h-16 sm:w-20 sm:h-20 object-contain" />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-blue-700 text-xs font-semibold">
              <Award className="w-4 h-4" />
              <span>SAFE DIGITAL GENERATION — شهادة معتمدة</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 font-display">شهادة إتمام وتقدير رسمية</h2>
          </div>

          <p className="text-sm sm:text-base text-slate-600">تشهد مبادرة جيل رقمي آمن بأن المشارك / المتدرب:</p>
          <p className="text-2xl sm:text-4xl font-bold text-slate-950 font-display">{cert.recipient_name}</p>
          <p className="text-sm sm:text-base text-slate-600">قد أتم بنجاح متطلبات البرنامج التدريبي:</p>
          <p className="text-xl sm:text-2xl font-bold text-blue-700 font-display">{cert.course_title}</p>

          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
            <div className="text-start space-y-1">
              <p>رقم الشهادة: <span className="font-mono-num font-bold text-slate-900">{cert.certificate_number}</span></p>
              <p>تاريخ الإصدار: <span className="font-mono-num">{cert.issue_date}</span></p>
              <p>الجهة المانحة: {cert.trainer_name || 'إدارة التدريب والتثقيف'}</p>
            </div>
            {qrDataUrl && (
              <div className="flex flex-col items-center gap-1">
                <img src={qrDataUrl} alt="QR" className="w-20 h-20 border border-slate-200 rounded-lg p-1 bg-white" />
                <span className="text-[10px] text-slate-500">تحقق إلكتروني فوري</span>
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-500 pt-2">
            تحت مظلة الاتحاد النوعي للجمعيات العاملة في مجال التنمية المجتمعية (حكاية وطن) — المشهر برقم 1279 لسنة 2025 بوزارة التضامن الاجتماعي
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 no-print">
        <button
          type="button"
          disabled={exporting}
          onClick={downloadPng}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-lg"
        >
          <Download className="w-4 h-4" />
          <span>{exporting ? 'جارٍ التحضير...' : 'تحميل الشهادة PNG'}</span>
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة / حفظ PDF</span>
        </button>
      </div>
    </div>
  );
};
