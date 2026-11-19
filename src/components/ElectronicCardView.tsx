import React, { useRef, useState } from 'react';
import { Download, FileText, Printer, RotateCw, ShieldCheck } from 'lucide-react';
import { jsPDF } from 'jspdf';
import type { CardDesign, CardLogo } from '../types';
import { SafeImage } from './SafeImage';

export interface CardMemberInfo {
  full_name: string;
  full_name_en?: string;
  member_number: string;
  card_number: string;
  committee_name?: string;
  position_title?: string;
  governorate?: string;
  avatar_url?: string;
  issue_date: string;
  expiry_date?: string;
  card_status?: string;
}

interface ElectronicCardViewProps {
  member: CardMemberInfo;
  design: CardDesign;
  logos: CardLogo[];
  qrDataUrl: string;
  allowDownload?: boolean;
}

async function loadImg(src: string): Promise<HTMLImageElement | null> {
  if (!src) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export const ElectronicCardView: React.FC<ElectronicCardViewProps> = ({
  member,
  design,
  logos,
  qrDataUrl,
  allowDownload = true
}) => {
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [exporting, setExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const frontLogos = logos
    .filter((l) => l.is_active && (l.side === 'front' || l.side === 'both'))
    .sort((a, b) => a.sort_order - b.sort_order);

  const backLogos = logos
    .filter((l) => l.is_active && (l.side === 'back' || l.side === 'both'))
    .sort((a, b) => a.sort_order - b.sort_order);

  const accent = design.accent_color || '#06B6D4';
  const frontBg = design.front_bg || '#0A192F';
  const backBg = design.back_bg || '#0F172A';
  const textColor = design.text_color || '#FFFFFF';

  const renderLogosStrip = (items: CardLogo[]) => {
    if (items.length === 0) return null;
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        {items.slice(0, 4).map((logo) => (
          <div
            key={logo.id}
            style={{
              width: `${Math.min(42, Math.max(30, logo.width_px || 36))}px`,
              height: `${Math.min(42, Math.max(30, logo.height_px || 36))}px`
            }}
            className="rounded-lg bg-white p-0.5 shadow-md ring-1 ring-white/40 flex items-center justify-center overflow-hidden shrink-0"
            title={logo.name}
          >
            <SafeImage src={logo.logo_url} alt={logo.name} className="w-full h-full object-contain" />
          </div>
        ))}
      </div>
    );
  };

  const renderCardCanvasDataUrl = async (targetSide: 'front' | 'back'): Promise<string | null> => {
    const W = 1200;
    const H = 750;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

      // Rich Executive Gradient Background
      const grad = ctx.createLinearGradient(0, 0, W, H);
      if (targetSide === 'front') {
        grad.addColorStop(0, frontBg);
        grad.addColorStop(0.55, '#102A4C');
        grad.addColorStop(1, frontBg);
      } else {
        grad.addColorStop(0, backBg);
        grad.addColorStop(0.5, '#162844');
        grad.addColorStop(1, backBg);
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Subtle architectural grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.035)';
      ctx.lineWidth = 1;
      for (let gx = 40; gx < W; gx += 48) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, H);
        ctx.stroke();
      }
      for (let gy = 40; gy < H; gy += 48) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(W, gy);
        ctx.stroke();
      }

      // Top metallic accent strip
      const topGrad = ctx.createLinearGradient(0, 0, W, 0);
      topGrad.addColorStop(0, '#1D4ED8');
      topGrad.addColorStop(0.5, accent);
      topGrad.addColorStop(1, '#38BDF8');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, W, 12);

      // Clean Top Header Band
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(0, 12, W, 146);
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 158);
      ctx.lineTo(W, 158);
      ctx.stroke();

      // Draw active logos neatly on the header band (left & right corners, never overlapping centered text)
      const sideLogos = targetSide === 'front' ? frontLogos : backLogos;
      const loadedLogos = await Promise.all(sideLogos.map(async (l) => ({ logo: l, img: await loadImg(l.logo_url) })));

      // Put first logo on right, remaining logos on left in clean row
      if (loadedLogos.length > 0) {
        const rightMost = loadedLogos[0];
        const rx = W - 134;
        const ry = 32;
        ctx.save();
        drawRoundedRect(ctx, rx, ry, 94, 94, 18);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.clip();
        if (rightMost.img) ctx.drawImage(rightMost.img, rx + 6, ry + 6, 82, 82);
        ctx.restore();

        loadedLogos.slice(1, 4).forEach((entry, idx) => {
          const lx = 40 + idx * 96;
          const ly = 40;
          ctx.save();
          drawRoundedRect(ctx, lx, ly, 82, 82, 16);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          ctx.clip();
          if (entry.img) ctx.drawImage(entry.img, lx + 5, ly + 5, 72, 72);
          ctx.restore();
        });
      }

      // Centered Header Title
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.font = 'bold 34px Cairo, sans-serif';
      ctx.fillText('مبادرة جيل رقمي آمن', W / 2, 76);
      ctx.font = '700 18px Cairo, sans-serif';
      ctx.fillStyle = accent;
      ctx.fillText('SAFE DIGITAL GENERATION — بطاقة عضوية رسمية', W / 2, 114);

      if (targetSide === 'front') {
        // Framed Member Portrait (Right side)
        const avatarImg = await loadImg(member.avatar_url || '');
        const ax = W - 275;
        const ay = 200;
        const aw = 225;
        const ah = 275;
        ctx.save();
        drawRoundedRect(ctx, ax, ay, aw, ah, 22);
        ctx.fillStyle = '#1E293B';
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = accent;
        ctx.stroke();
        ctx.clip();
        if (avatarImg) {
          ctx.drawImage(avatarImg, ax, ay, aw, ah);
        } else {
          ctx.fillStyle = '#94A3B8';
          ctx.font = '600 22px Cairo, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('صورة العضو', ax + aw / 2, ay + ah / 2);
        }
        ctx.restore();

        // QR Frame (Left side)
        const qrImg = await loadImg(qrDataUrl);
        ctx.save();
        drawRoundedRect(ctx, 48, 210, 200, 200, 20);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.stroke();
        ctx.restore();
        if (qrImg) {
          ctx.drawImage(qrImg, 62, 224, 172, 172);
        }
        ctx.textAlign = 'center';
        ctx.fillStyle = '#94A3B8';
        ctx.font = '600 15px Cairo, sans-serif';
        ctx.fillText('امسح للتحقق الفوري', 148, 438);

        // Member Details (Center-Right RTL)
        ctx.textAlign = 'right';
        ctx.fillStyle = textColor;
        ctx.font = 'bold 40px Cairo, sans-serif';
        ctx.fillText(member.full_name, W - 310, 248);

        ctx.fillStyle = accent;
        ctx.font = 'bold 24px Cairo, sans-serif';
        ctx.fillText(member.position_title || 'عضو عامل', W - 310, 294);

        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(280, 314, W - 590, 2);

        ctx.fillStyle = '#E2E8F0';
        ctx.font = '600 22px Cairo, sans-serif';
        ctx.fillText(`اللجنة: ${member.committee_name || 'عام'}`, W - 310, 355);
        if (member.governorate) {
          ctx.fillText(`المحافظة: ${member.governorate}`, W - 310, 393);
        }
        ctx.fillText(`رقم العضوية: ${member.member_number}`, W - 310, member.governorate ? 433 : 398);
        ctx.fillText(`رقم الكارنيه: ${member.card_number}`, W - 310, member.governorate ? 473 : 440);

        ctx.font = '500 18px Cairo, sans-serif';
        ctx.fillStyle = '#CBD5E1';
        const dateLine = `تاريخ الإصدار: ${member.issue_date}${design.show_expiry && member.expiry_date ? `  ·  صالح حتى: ${member.expiry_date}` : ''}`;
        ctx.fillText(dateLine, W - 310, 526);
      } else {
        // Back Side Content
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(0, 180, W, 56);
        ctx.textAlign = 'center';
        ctx.fillStyle = accent;
        ctx.font = 'bold 24px Cairo, sans-serif';
        ctx.fillText('بطاقة تعريف إلكترونية موثقة — التحقق الرقمي الفوري', W / 2, 217);

        ctx.fillStyle = '#E2E8F0';
        ctx.font = '500 22px Cairo, sans-serif';
        ctx.fillText('هذه البطاقة صادرة عن المنصة الرسمية لمبادرة جيل رقمي آمن وتُثبت صفة حاملها.', W / 2, 295);
        ctx.fillText('للتأكد من الصلاحية والموثوقية، امسح رمز QR أو زر بوابة التحقق على الموقع الرسمي.', W / 2, 335);

        const qrImg = await loadImg(qrDataUrl);
        if (qrImg) {
          ctx.save();
          drawRoundedRect(ctx, W / 2 - 105, 365, 210, 210, 20);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          ctx.restore();
          ctx.drawImage(qrImg, W / 2 - 90, 380, 180, 180);
        }

        ctx.fillStyle = accent;
        ctx.font = 'bold 20px monospace';
        ctx.fillText(`${member.card_number}  |  ${member.member_number}`, W / 2, 610);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '500 17px Cairo, sans-serif';
        ctx.fillText('generationdigitalsafe@gmail.com  ·  01277714301', W / 2, 646);
      }

      // Footer strip
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.fillRect(0, H - 72, W, 72);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.moveTo(0, H - 72);
      ctx.lineTo(W, H - 72);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#CBD5E1';
      ctx.font = '500 16px Cairo, sans-serif';
      ctx.fillText(
        design.footer_note_ar ||
          'تحت مظلة الاتحاد النوعي للجمعيات العاملة في مجال التنمية المجتمعية (حكاية وطن) — المشهر برقم 1279 لسنة 2025 بوزارة التضامن الاجتماعي',
        W / 2,
        H - 29
      );

      return canvas.toDataURL('image/png');
  };

  const exportCardPng = async (targetSide: 'front' | 'back') => {
    setExporting(true);
    try {
      const dataUrl = await renderCardCanvasDataUrl(targetSide);
      if (!dataUrl) return;
      const link = document.createElement('a');
      link.download = `SDG-Card-${member.member_number}-${targetSide}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setExporting(false);
    }
  };

  const exportCardPdf = async () => {
    setExporting(true);
    try {
      const [frontDataUrl, backDataUrl] = await Promise.all([
        renderCardCanvasDataUrl('front'),
        renderCardCanvasDataUrl('back')
      ]);
      if (!frontDataUrl || !backDataUrl) return;

      // Printable A4 sheet containing Front & Back at standard CR80 dimensions (85.6 x 53.98 mm) + enlarged preview
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      // Top institutional header in clean ASCII/English + card number metadata
      pdf.setFillColor(10, 25, 47);
      pdf.rect(0, 0, pageWidth, 24, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(13);
      pdf.text('SAFE DIGITAL GENERATION — OFFICIAL MEMBERSHIP CARD', pageWidth / 2, 10.5, { align: 'center' });
      pdf.setFontSize(9);
      pdf.setTextColor(56, 189, 248);
      pdf.text(`Member ID: ${member.member_number}  |  Card No: ${member.card_number}  |  CR80 Print Sheet`, pageWidth / 2, 17.5, { align: 'center' });

      // Enlarged sharp printable cards (136mm x 85mm) centered cleanly on A4 with crop guides
      const cardW = 136;
      const cardH = 85;
      const x = (pageWidth - cardW) / 2;
      const frontY = 36;
      const backY = 144;

      pdf.setTextColor(71, 85, 105);
      pdf.setFontSize(9);
      pdf.text('FRONT SIDE', x, frontY - 3);
      pdf.addImage(frontDataUrl, 'PNG', x, frontY, cardW, cardH, undefined, 'FAST');

      // Crop corner guides
      pdf.setDrawColor(148, 163, 184);
      pdf.setLineWidth(0.3);
      pdf.rect(x - 1, frontY - 1, cardW + 2, cardH + 2);

      pdf.text('BACK SIDE', x, backY - 3);
      pdf.addImage(backDataUrl, 'PNG', x, backY, cardW, cardH, undefined, 'FAST');
      pdf.rect(x - 1, backY - 1, cardW + 2, cardH + 2);

      // Footer note
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.text(
        'Hikayat Watan Union (Reg. 1279/2025 - Ministry of Social Solidarity) · generationdigitalsafe@gmail.com · 01277714301',
        pageWidth / 2,
        282,
        { align: 'center' }
      );

      pdf.save(`SDG-Card-${member.member_number}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  const cardSurfaceStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${frontBg} 0%, #102a4c 55%, ${frontBg} 100%)`,
    color: textColor
  };

  const backSurfaceStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${backBg} 0%, #162844 50%, ${backBg} 100%)`,
    color: textColor
  };

  const rightLogo = frontLogos[0];
  const leftLogos = frontLogos.slice(1, 4);

  const FrontCard = (
    <div
      style={cardSurfaceStyle}
      className="relative w-full max-w-[560px] aspect-[1.6/1] rounded-2xl overflow-hidden shadow-2xl border border-cyan-400/30 select-none flex flex-col justify-between"
    >
      {/* Subtle geometric security grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Top Metallic Accent Bar */}
      <div
        className="h-1.5 w-full relative z-10"
        style={{ background: `linear-gradient(90deg, #1d4ed8 0%, ${accent} 50%, #38bdf8 100%)` }}
      />

      {/* Clean Header Strip with Balanced Official Seals & Zero Overlap */}
      <div className="relative z-10 bg-white/[0.06] border-b border-white/15 px-4 py-2.5 flex items-center justify-between gap-2">
        {rightLogo ? renderLogosStrip([rightLogo]) : <div className="w-9 shrink-0" />}

        <div className="text-center min-w-0 flex-1 px-1">
          <p className="text-xs sm:text-sm font-extrabold tracking-tight font-display truncate">مبادرة جيل رقمي آمن</p>
          <p style={{ color: accent }} className="text-[9px] sm:text-[10px] font-bold tracking-wider truncate">
            SAFE DIGITAL GENERATION · بطاقة عضوية رسمية
          </p>
        </div>

        {leftLogos.length > 0 ? renderLogosStrip(leftLogos) : <div className="w-9 shrink-0" />}
      </div>

      {/* Main Content Zone */}
      <div className="relative z-10 px-4 sm:px-5 py-3 flex items-center justify-between gap-3.5 flex-1 min-h-0">
        {/* Member Portrait */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div
            className="w-20 h-24 sm:w-24 sm:h-28 rounded-xl overflow-hidden border-2 bg-slate-800 shadow-lg ring-2 ring-white/15"
            style={{ borderColor: accent }}
          >
            <SafeImage src={member.avatar_url} alt={member.full_name} fallbackTitle={member.full_name} className="w-full h-full object-cover" />
          </div>
          <span
            className="text-[9px] font-bold tracking-wide"
            style={{ color: member.card_status === 'suspended' ? '#fca5a5' : accent }}
          >
            {member.card_status === 'suspended' ? 'عضوية موقوفة' : 'عضوية سارية'}
          </span>
        </div>

        {/* Member Info */}
        <div className="flex-1 min-w-0 text-start space-y-1">
          <p className="text-sm sm:text-lg font-extrabold truncate font-display leading-tight">{member.full_name}</p>
          <p style={{ color: accent }} className="text-xs font-bold truncate">
            {member.position_title || 'عضو عامل'}
          </p>
          <div className="h-px bg-white/15 my-1" />
          <p className="text-[11px] text-slate-200 truncate">
            اللجنة: <span className="font-semibold text-white">{member.committee_name || 'عام'}</span>
            {member.governorate ? ` · ${member.governorate}` : ''}
          </p>
          <div className="pt-0.5 space-y-0.5 text-[10px] sm:text-[11px] font-mono-num text-slate-200">
            <p>
              رقم العضوية: <strong className="text-white">{member.member_number}</strong>
            </p>
            <p className="text-slate-300">
              الإصدار: {member.issue_date}
              {design.show_expiry && member.expiry_date ? ` · صالح حتى: ${member.expiry_date}` : ''}
            </p>
          </div>
        </div>

        {/* QR Code Badge */}
        <div className="shrink-0 flex flex-col items-center gap-1">
          <div className="bg-white p-1.5 rounded-xl shadow-lg ring-2 ring-cyan-300/30">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Verification" className="w-16 h-16 sm:w-20 sm:h-20 object-contain" />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center text-slate-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
            )}
          </div>
          <span className="text-[9px] text-slate-300">تحقق فوري</span>
        </div>
      </div>

      {/* Bottom Institutional Strip */}
      <div className="relative z-10 px-4 py-2 bg-black/35 border-t border-white/15 flex items-center justify-between gap-2 text-[9px] sm:text-[10px] text-slate-300">
        <span className="truncate">{design.footer_note_ar}</span>
        <span className="font-mono-num font-bold shrink-0" style={{ color: accent }}>
          {member.card_number}
        </span>
      </div>
    </div>
  );

  const BackCard = (
    <div
      style={backSurfaceStyle}
      className="relative w-full max-w-[560px] aspect-[1.6/1] rounded-2xl overflow-hidden shadow-2xl border border-cyan-400/30 select-none flex flex-col justify-between"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      <div
        className="h-1.5 w-full relative z-10"
        style={{ background: `linear-gradient(90deg, #1d4ed8 0%, ${accent} 50%, #38bdf8 100%)` }}
      />

      {/* Top Strip */}
      <div className="relative z-10 bg-white/[0.06] border-b border-white/15 px-4 py-2.5 flex items-center justify-between gap-2">
        {backLogos[0] ? renderLogosStrip([backLogos[0]]) : <div className="w-9 shrink-0" />}
        <p className="text-xs sm:text-sm font-bold text-slate-100 text-center truncate">
          الوجه الخلفي — بطاقة تعريف إلكترونية موثقة
        </p>
        {backLogos.length > 1 ? renderLogosStrip(backLogos.slice(1, 4)) : <div className="w-9 shrink-0" />}
      </div>

      {/* Security Bar */}
      <div className="relative z-10 h-5 bg-slate-950/70 border-b border-white/10 flex items-center justify-between px-4 text-[9px] font-mono-num text-slate-400">
        <span>ID: {member.member_number}</span>
        <span>REG: 1279 / 2025</span>
      </div>

      <div className="relative z-10 flex-1 px-5 py-3 flex items-center justify-between gap-4">
        <div className="space-y-1.5 text-start flex-1">
          <p className="text-xs font-bold" style={{ color: accent }}>
            مبادرة جيل رقمي آمن — التحقق الرقمي الفوري
          </p>
          <p className="text-[11px] text-slate-200 leading-relaxed">
            هذه البطاقة صادرة عن المنصة الرسمية لمبادرة جيل رقمي آمن وتُثبت صفة حاملها. يُمكن لأي جهة التحقق من صلاحيتها فوريًا عبر مسح رمز الاستجابة السريع.
          </p>
          <p className="text-[10px] font-mono-num text-slate-400 pt-1">
            generationdigitalsafe@gmail.com · 01277714301
          </p>
        </div>
        <div className="bg-white p-2 rounded-xl shadow-lg shrink-0">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code" className="w-20 h-20 object-contain" />
          ) : (
            <div className="w-20 h-20 flex items-center justify-center text-slate-400">
              <ShieldCheck className="w-7 h-7" />
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 px-4 py-2 bg-black/35 border-t border-white/15 text-[9px] sm:text-[10px] text-slate-300 text-center truncate">
        {design.footer_note_ar}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div ref={printRef} className="print-area flex flex-col items-center gap-4">
        <div className="w-full flex justify-center">{side === 'front' ? FrontCard : BackCard}</div>
        {/* Visible during Print/PDF so both sides print together */}
        <div className="hidden print:flex flex-col items-center gap-6 mt-4">
          {BackCard}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 no-print">
        <button
          type="button"
          onClick={() => setSide((s) => (s === 'front' ? 'back' : 'front'))}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>{side === 'front' ? 'عرض الوجه الخلفي' : 'عرض الوجه الأمامي'}</span>
        </button>

        {allowDownload && (
          <>
            <button
              type="button"
              disabled={exporting}
              onClick={exportCardPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{exporting ? 'جارٍ التجهيز...' : 'تحميل الكارنيه للطباعة PDF'}</span>
            </button>
            <button
              type="button"
              disabled={exporting}
              onClick={() => exportCardPng(side)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exporting ? 'جارٍ التصدير...' : 'تحميل صورة PNG'}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة مباشرة</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
