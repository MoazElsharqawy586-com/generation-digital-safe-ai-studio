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
  activity_type?: string;
  hours_count?: number;
  grade_ar?: string;
  title_ar?: string;
  subtitle_ar?: string;
  body_text_ar?: string;
  primary_color?: string;
  accent_color?: string;
  status: string;
}

interface CertificateViewProps {
  cert: CertificateDisplayData;
  qrDataUrl: string;
  compactActions?: boolean;
}

const STYLE_PRESETS: Record<string, { primary: string; accent: string; bgTint: string }> = {
  official_navy: { primary: '#0A192F', accent: '#06B6D4', bgTint: '#F8FAFC' },
  cyber_cyan: { primary: '#0F172A', accent: '#0284C7', bgTint: '#F0F9FF' },
  royal_gold: { primary: '#451A03', accent: '#D97706', bgTint: '#FFFBEB' },
  emerald_honor: { primary: '#064E3B', accent: '#10B981', bgTint: '#ECFDF5' }
};

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  training: 'برنامج تدريبي معتمد',
  workshop: 'ورشة عمل تطبيقية',
  periodic: 'دورة / دوري توعوي',
  honor: 'شهادة تكريم وتميز'
};

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(/\s+/).filter(Boolean);
  let line = '';
  let currY = y;
  for (let i = 0; i < words.length; i++) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currY);
      line = words[i];
      currY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, x, currY);
    currY += lineHeight;
  }
  return currY;
}

export const CertificateView: React.FC<CertificateViewProps> = ({ cert, qrDataUrl, compactActions = false }) => {
  const [exporting, setExporting] = useState(false);

  const preset = STYLE_PRESETS[cert.template_style || 'official_navy'] || STYLE_PRESETS.official_navy;
  const primaryColor = cert.primary_color || preset.primary;
  const accentColor = cert.accent_color || preset.accent;
  const titleAr = cert.title_ar || 'شهادة إتمام وتقدير رسمية';
  const subtitleAr = cert.subtitle_ar || 'SAFE DIGITAL GENERATION — شهادة معتمدة';
  const activityLabel = ACTIVITY_TYPE_LABELS[cert.activity_type || 'training'] || 'برنامج معتمد';
  const bodyTextAr =
    cert.body_text_ar ||
    'تشهد إدارة مبادرة جيل رقمي آمن بأن المشارك / المتدرب قد أتم بنجاح جميع المتطلبات والمهارات العملية المقررة في:';

  const downloadPng = async () => {
    setExporting(true);
    try {
      const W = 1400;
      const H = 990;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, W, H);

      // Subtle corner glow
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, preset.bgTint);
      bgGrad.addColorStop(0.5, '#FFFFFF');
      bgGrad.addColorStop(1, preset.bgTint);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(48, 48, W - 96, H - 96);

      // Outer primary border & inner accent border
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 26;
      ctx.strokeRect(24, 24, W - 48, H - 48);

      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 4;
      ctx.strokeRect(52, 52, W - 104, H - 104);

      const load = (src: string) =>
        new Promise<HTMLImageElement | null>((res) => {
          if (!src) return res(null);
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

      if (l1) ctx.drawImage(l1, W / 2 - 62, 76, 124, 124);
      if (l2) ctx.drawImage(l2, W - 230, 82, 118, 118);
      if (l3) ctx.drawImage(l3, 112, 82, 118, 118);

      ctx.textAlign = 'center';
      ctx.fillStyle = accentColor;
      ctx.font = 'bold 21px Cairo, sans-serif';
      ctx.fillText(`${subtitleAr}  •  ${activityLabel}`, W / 2, 244);

      ctx.fillStyle = primaryColor;
      ctx.font = 'bold 48px Cairo, sans-serif';
      ctx.fillText(titleAr, W / 2, 304);

      // Divider
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 220, 328);
      ctx.lineTo(W / 2 + 220, 328);
      ctx.stroke();

      ctx.fillStyle = '#475569';
      ctx.font = '600 22px Cairo, sans-serif';
      const afterBodyY = wrapCanvasText(ctx, bodyTextAr, W / 2, 378, 1060, 34);

      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 52px Cairo, sans-serif';
      ctx.fillText(cert.recipient_name, W / 2, Math.max(afterBodyY + 42, 465));

      ctx.fillStyle = primaryColor;
      ctx.font = 'bold 34px Cairo, sans-serif';
      wrapCanvasText(ctx, cert.course_title, W / 2, Math.max(afterBodyY + 115, 540), 1080, 42);

      const metaParts = [
        cert.hours_count && cert.hours_count > 0 ? `عدد الساعات: ${cert.hours_count} ساعة` : '',
        cert.grade_ar ? `التقدير: ${cert.grade_ar}` : ''
      ].filter(Boolean);
      if (metaParts.length > 0) {
        ctx.fillStyle = accentColor;
        ctx.font = 'bold 24px Cairo, sans-serif';
        ctx.fillText(metaParts.join('   |   '), W / 2, 650);
      }

      ctx.fillStyle = '#475569';
      ctx.font = '600 20px Cairo, sans-serif';
      ctx.fillText(
        `تاريخ الإصدار: ${cert.issue_date}   |   الجهة المانحة / المدرب: ${cert.trainer_name || 'لجنة التدريب والتثقيف'}   |   رقم الشهادة: ${cert.certificate_number}`,
        W / 2,
        715
      );

      if (qrImg) {
        ctx.drawImage(qrImg, 110, 745, 130, 130);
      }

      ctx.fillStyle = '#64748B';
      ctx.font = '500 17px Cairo, sans-serif';
      ctx.fillText(
        'تحت مظلة الاتحاد النوعي للجمعيات العاملة في مجال التنمية المجتمعية (حكاية وطن) — المشهر برقم 1279 لسنة 2025 بوزارة التضامن الاجتماعي',
        W / 2,
        910
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
      <div
        className="print-area bg-white rounded-xl p-5 sm:p-8 shadow-xl max-w-4xl mx-auto relative"
        style={{ border: `10px solid ${primaryColor}` }}
      >
        <div
          className="rounded-lg p-5 sm:p-8 space-y-5 text-center"
          style={{
            border: `2px solid ${accentColor}`,
            background: `linear-gradient(135deg, ${preset.bgTint} 0%, #ffffff 45%, ${preset.bgTint} 100%)`
          }}
        >
          {/* Official Seals Row */}
          <div className="flex items-center justify-between gap-4">
            <SafeImage src="/assets/aistudio/FB_IMG_1790438684231_64912c2d.jpg" alt="حكاية وطن" className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-lg bg-white p-1" />
            <SafeImage src="/assets/aistudio/FB_IMG_1789831319399_ac126220.jpg" alt="جيل رقمي آمن" className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-lg bg-white p-1" />
            <SafeImage src="/assets/aistudio/FB_IMG_1792797530698_77e851bd.jpg" alt="وزارة التضامن الاجتماعي" className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-lg bg-white p-1" />
          </div>

          <div className="space-y-1.5">
            <div
              className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full bg-white/90 border"
              style={{ color: accentColor, borderColor: accentColor }}
            >
              <Award className="w-4 h-4" />
              <span>{subtitleAr}</span>
              <span>·</span>
              <span>{activityLabel}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display" style={{ color: primaryColor }}>
              {titleAr}
            </h2>
          </div>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">{bodyTextAr}</p>
          <p className="text-2xl sm:text-4xl font-bold text-slate-950 font-display">{cert.recipient_name}</p>
          <p className="text-xl sm:text-2xl font-bold font-display" style={{ color: primaryColor }}>
            {cert.course_title}
          </p>

          {(Number(cert.hours_count || 0) > 0 || cert.grade_ar) && (
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-bold">
              {Number(cert.hours_count || 0) > 0 && (
                <span className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 font-mono-num">
                  المدة التدريبية: {cert.hours_count} ساعة
                </span>
              )}
              {cert.grade_ar && (
                <span
                  className="px-3 py-1 rounded-lg bg-white border font-bold"
                  style={{ borderColor: accentColor, color: primaryColor }}
                >
                  التقدير: {cert.grade_ar}
                </span>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
            <div className="text-start space-y-1">
              <p>
                رقم الشهادة: <span className="font-mono-num font-bold text-slate-900">{cert.certificate_number}</span>
              </p>
              <p>
                تاريخ الإصدار: <span className="font-mono-num">{cert.issue_date}</span>
              </p>
              <p>الجهة المانحة / المدرب: {cert.trainer_name || 'إدارة التدريب والتثقيف'}</p>
            </div>
            {qrDataUrl && (
              <div className="flex flex-col items-center gap-1">
                <img src={qrDataUrl} alt="QR" className="w-20 h-20 border border-slate-200 rounded-lg p-1 bg-white" />
                <span className="text-[10px] text-slate-500">تحقق إلكتروني فوري</span>
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-500 pt-1">
            تحت مظلة الاتحاد النوعي للجمعيات العاملة في مجال التنمية المجتمعية (حكاية وطن) — المشهر برقم 1279 لسنة 2025 بوزارة التضامن الاجتماعي
          </p>
        </div>
      </div>

      {!compactActions && (
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
      )}
    </div>
  );
};
