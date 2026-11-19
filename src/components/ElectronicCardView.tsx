import React, { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  CalendarCheck,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  Printer,
  QrCode,
  RotateCw,
  Settings,
  Tag,
  User,
  Users
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
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

export interface ExtraCardField {
  label: string;
  value: string;
}

interface ElectronicCardViewProps {
  member: CardMemberInfo;
  design: CardDesign;
  logos: CardLogo[];
  qrDataUrl: string;
  allowDownload?: boolean;
}

const OFFICIAL_SDG_LOGO = '/assets/aistudio/FB_IMG_1789831319399_ac126220.jpg';
const OFFICIAL_HEKAYET_LOGO = '/assets/aistudio/FB_IMG_1790438684231_64912c2d.jpg';
const OFFICIAL_MOSS_LOGO = '/assets/aistudio/FB_IMG_1792797530698_77e851bd.jpg';
const DEFAULT_UMBRELLA_NOTE =
  'تحت مظلة الاتحاد النوعي للجمعيات العاملة في مجال التنمية المجتمعية (حكاية وطن) — المشهر برقم 1279 لسنة 2025 بوزارة التضامن الاجتماعي';

function formatCardDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim());
  if (m) return `${m[3]} / ${m[2]} / ${m[1]}`;
  return dateStr;
}

function parseExtraRows(raw?: string): ExtraCardField[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && (String(item.label || '').trim() || String(item.value || '').trim()))
      .map((item) => ({
        label: String(item.label || '').trim(),
        value: String(item.value || '').trim()
      }));
  } catch {
    return [];
  }
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
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const ir = img.width / img.height;
  const tr = w / h;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;
  if (ir > tr) {
    sw = img.height * tr;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / tr;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function drawImageContain(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerR: number, innerR: number) {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
    rot += step;
  }
  ctx.closePath();
  ctx.fill();
}

function drawCyberBackdrop(ctx: CanvasRenderingContext2D, W: number, H: number, baseBg: string, accent: string) {
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, baseBg || '#062056');
  grad.addColorStop(0.5, '#083284');
  grad.addColorStop(1, '#04143c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W * 0.78, H * 0.56, 20, W * 0.78, H * 0.56, 360);
  glow.addColorStop(0, 'rgba(56, 189, 248, 0.28)');
  glow.addColorStop(0.55, 'rgba(37, 99, 235, 0.14)');
  glow.addColorStop(1, 'rgba(4, 20, 60, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const leftGlow = ctx.createRadialGradient(W * 0.16, H * 0.52, 20, W * 0.16, H * 0.52, 280);
  leftGlow.addColorStop(0, 'rgba(56, 189, 248, 0.18)');
  leftGlow.addColorStop(1, 'rgba(4, 20, 60, 0)');
  ctx.fillStyle = leftGlow;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.strokeStyle = 'rgba(103, 232, 249, 0.22)';
  ctx.lineWidth = 2;
  const traces: [number, number][][] = [
    [
      [0, 260],
      [75, 260],
      [115, 300],
      [115, 420]
    ],
    [
      [0, 320],
      [55, 320],
      [88, 353],
      [88, 560],
      [130, 602]
    ],
    [
      [0, 620],
      [90, 620],
      [140, 670],
      [280, 670]
    ],
    [
      [W, 250],
      [W - 85, 250],
      [W - 135, 300],
      [W - 135, 410]
    ],
    [
      [W, 330],
      [W - 60, 330],
      [W - 105, 375],
      [W - 105, 535],
      [W - 165, 595]
    ],
    [
      [W, 590],
      [W - 90, 590],
      [W - 135, 635],
      [W - 270, 635]
    ]
  ];
  for (const trace of traces) {
    ctx.beginPath();
    trace.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
    ctx.stroke();
    const last = trace[trace.length - 1];
    ctx.fillStyle = accent || '#38bdf8';
    ctx.beginPath();
    ctx.arc(last[0], last[1], 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const stars = [
    [980, 220, 2],
    [1080, 280, 2.5],
    [910, 480, 2],
    [1130, 510, 2.5],
    [220, 210, 2],
    [150, 660, 2.2],
    [830, 690, 2],
    [450, 710, 1.8],
    [760, 215, 2],
    [1040, 640, 2]
  ];
  ctx.fillStyle = 'rgba(224, 242, 254, 0.45)';
  for (const [sx, sy, sr] of stars) {
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawGoldRibbon(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string, showStars = true) {
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;

  const gold = ctx.createLinearGradient(x, y, x + w, y + h);
  gold.addColorStop(0, '#ca8a04');
  gold.addColorStop(0.2, '#fde68a');
  gold.addColorStop(0.5, '#f59e0b');
  gold.addColorStop(0.8, '#fde047');
  gold.addColorStop(1, '#b45309');

  drawRoundedRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = gold;
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(254, 249, 195, 0.85)';
  ctx.stroke();

  drawRoundedRect(ctx, x + 4, y + 3, w - 8, h - 6, (h - 6) / 2);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(146, 64, 14, 0.35)';
  ctx.stroke();

  ctx.fillStyle = '#081b4b';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  ctx.font = `800 ${Math.round(h * 0.54)}px Cairo, sans-serif`;
  ctx.fillText(label, x + w / 2, y + h / 2 + 1, w - 90);

  if (showStars) {
    ctx.fillStyle = '#fef08a';
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 1.5;
    drawStar(ctx, x + 28, y + h / 2, 5, h * 0.24, h * 0.1);
    ctx.stroke();
    drawStar(ctx, x + w - 28, y + h / 2, 5, h * 0.24, h * 0.1);
    ctx.stroke();
  }
  ctx.restore();
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
  const [autoQrDataUrl, setAutoQrDataUrl] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const verifyCode = member.card_number || member.member_number || '';
  const verifyPath = verifyCode ? `/verify?card=${encodeURIComponent(verifyCode)}` : '/verify';

  useEffect(() => {
    if (qrDataUrl) {
      setAutoQrDataUrl('');
      return;
    }
    let cancelled = false;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const targetUrl = `${origin}${verifyPath}`;
    QRCode.toDataURL(targetUrl, { width: 220, margin: 1 })
      .then((url) => {
        if (!cancelled) setAutoQrDataUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [qrDataUrl, verifyPath]);

  const effectiveQrDataUrl = qrDataUrl || autoQrDataUrl;

  const frontLogos = logos
    .filter((l) => l.is_active && (l.side === 'front' || l.side === 'both'))
    .sort((a, b) => a.sort_order - b.sort_order);

  const backLogosRaw = logos
    .filter((l) => l.is_active && (l.side === 'back' || l.side === 'both'))
    .sort((a, b) => a.sort_order - b.sort_order);

  const accent = design.accent_color || '#06B6D4';
  const frontBg = design.front_bg || '#0A192F';
  const backBg = design.back_bg || '#0F172A';
  const textColor = design.text_color || '#FFFFFF';

  // Customizable texts from Card Designer (preserving official defaults)
  const headerTitleAr = design.header_title_ar?.trim() || 'جيل رقمي آمن';
  const headerTitleEn = design.header_title_en?.trim() || 'SAFE DIGITAL GENERATION';
  const headerSubtitleAr = design.header_subtitle_ar?.trim() || 'معًا لمستقبل رقمي آمن';
  const cardBadgeAr = design.card_badge_ar?.trim() || 'كارنيه عضوية';
  const sideSloganAr = design.side_slogan_ar?.trim() || 'جيل واعٍ .. مجتمع أكثر أماناً';
  const verifyBadgeAr = design.verify_badge_ar?.trim() || 'تحقق من صحة الكارنيه';
  const vpTitleAr = design.vp_title_ar?.trim() || 'نائب رئيس المبادرة';
  const vpNamesLines = (design.vp_names_ar ?? 'د. داليا نصار\nأ. أحمد نصار\nأ. أماني عبد الفتاح')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const presidentTitleAr = design.president_title_ar?.trim() || 'رئيس المبادرة';
  const presidentNameAr = design.president_name_ar?.trim() || 'أ. معاذ الشرقاوي';
  const backTitleAr = design.back_title_ar?.trim() || 'شركاء النجاح والشراكات المؤسسية';
  const backSloganAr = design.back_slogan_ar?.trim() || 'معاً ... نبني مجتمعاً رقمياً آمناً';
  const extraRows = parseExtraRows(design.extra_rows_json);

  const isInitiativeLogo = (l: CardLogo) =>
    l.logo_url.includes('1789831319399') || l.name.includes('جيل رقمي');

  const centerInitiativeLogo = frontLogos.find(isInitiativeLogo)?.logo_url || OFFICIAL_SDG_LOGO;
  const sealLogos = frontLogos.filter((l) => !isInitiativeLogo(l));
  const displaySealLogos =
    sealLogos.length > 0
      ? sealLogos.slice(0, 5)
      : [
          {
            id: -1,
            name: 'حكاية وطن',
            logo_url: OFFICIAL_HEKAYET_LOGO,
            side: 'front' as const,
            card_type: 'all',
            x_percent: 0,
            y_percent: 0,
            width_px: 44,
            height_px: 44,
            sort_order: 1,
            is_active: 1
          },
          {
            id: -2,
            name: 'وزارة التضامن الاجتماعي',
            logo_url: OFFICIAL_MOSS_LOGO,
            side: 'front' as const,
            card_type: 'all',
            x_percent: 0,
            y_percent: 0,
            width_px: 44,
            height_px: 44,
            sort_order: 2,
            is_active: 1
          }
        ];

  const displayBackLogos =
    backLogosRaw.length > 0
      ? backLogosRaw.slice(0, 8)
      : [
          {
            id: -11,
            name: 'مبادرة جيل رقمي آمن',
            logo_url: OFFICIAL_SDG_LOGO,
            side: 'back' as const,
            card_type: 'all',
            x_percent: 0,
            y_percent: 0,
            width_px: 48,
            height_px: 48,
            sort_order: 1,
            is_active: 1
          },
          {
            id: -12,
            name: 'الاتحاد النوعي حكاية وطن',
            logo_url: OFFICIAL_HEKAYET_LOGO,
            side: 'back' as const,
            card_type: 'all',
            x_percent: 0,
            y_percent: 0,
            width_px: 48,
            height_px: 48,
            sort_order: 2,
            is_active: 1
          },
          {
            id: -13,
            name: 'وزارة التضامن الاجتماعي',
            logo_url: OFFICIAL_MOSS_LOGO,
            side: 'back' as const,
            card_type: 'all',
            x_percent: 0,
            y_percent: 0,
            width_px: 48,
            height_px: 48,
            sort_order: 3,
            is_active: 1
          }
        ];

  const isDefaultUmbrella =
    !design.footer_note_ar ||
    design.footer_note_ar.trim() === DEFAULT_UMBRELLA_NOTE ||
    (design.footer_note_ar.includes('حكاية وطن') && design.footer_note_ar.includes('1279') && design.footer_note_ar.includes('المشهر برقم 1279'));

  const memberRows = [
    { label: 'الاسم:', value: member.full_name, icon: User, mono: false },
    { label: 'رقم العضوية:', value: member.member_number || member.card_number, icon: CreditCard, mono: true },
    { label: 'اللجنة:', value: member.committee_name || 'عام', icon: Settings, mono: false },
    { label: 'المنصب:', value: member.position_title || 'عضو', icon: Users, mono: false },
    { label: 'تاريخ الإصدار:', value: formatCardDate(member.issue_date), icon: Calendar, mono: true },
    ...(design.show_expiry
      ? [{ label: 'تاريخ الانتهاء:', value: formatCardDate(member.expiry_date), icon: CalendarCheck, mono: true }]
      : []),
    ...extraRows.map((r) => ({
      label: r.label.endsWith(':') ? r.label : `${r.label}:`,
      value: r.value,
      icon: Tag,
      mono: false
    }))
  ];

  const sideSloganLines = sideSloganAr.includes('..')
    ? sideSloganAr.split('..').map((part, idx, arr) => (idx < arr.length - 1 ? `${part.trim()} ..` : part.trim()))
    : [sideSloganAr];

  const renderCardCanvasDataUrl = async (targetSide: 'front' | 'back'): Promise<string | null> => {
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      await document.fonts.ready;
    }

    const W = 1200;
    const H = 750;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    drawCyberBackdrop(ctx, W, H, targetSide === 'front' ? frontBg : backBg, accent);

    if (targetSide === 'front') {
      // 1. Top Curved White/Silver Header Band (full coverage behind all header text)
      ctx.save();
      const headerGrad = ctx.createLinearGradient(0, 0, 0, 192);
      headerGrad.addColorStop(0, '#ffffff');
      headerGrad.addColorStop(0.8, '#f8fafc');
      headerGrad.addColorStop(1, '#e0f2fe');

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(W, 0);
      ctx.lineTo(W, 156);
      ctx.bezierCurveTo(W * 0.72, 192, W * 0.28, 192, 0, 156);
      ctx.closePath();
      ctx.fillStyle = headerGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, 156);
      ctx.bezierCurveTo(W * 0.28, 192, W * 0.72, 192, W, 156);
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#1d4ed8';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, 162);
      ctx.bezierCurveTo(W * 0.28, 198, W * 0.72, 198, W, 162);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#f59e0b';
      ctx.stroke();
      ctx.restore();

      let exportQrUrl = effectiveQrDataUrl;
      if (!exportQrUrl) {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        exportQrUrl = await QRCode.toDataURL(`${origin}${verifyPath}`, { width: 240, margin: 1 }).catch(() => '');
      }

      const [sdgImg, avatarImg, qrImg, ...sealImgs] = await Promise.all([
        loadImg(centerInitiativeLogo),
        loadImg(member.avatar_url || ''),
        loadImg(exportQrUrl),
        ...displaySealLogos.map((l) => loadImg(l.logo_url))
      ]);

      // Header Right Block: Umbrella Text
      ctx.save();
      ctx.fillStyle = '#081b4b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.direction = 'rtl';
      const rightCenterX = W - 185;
      if (isDefaultUmbrella) {
        ctx.font = '800 17px Cairo, sans-serif';
        ctx.fillText('تحت مظلة', rightCenterX, 24);
        ctx.font = '700 14px Cairo, sans-serif';
        ctx.fillText('الاتحاد النوعي للجمعيات', rightCenterX, 44);
        ctx.fillText('العاملة في مجال التنمية المجتمعية', rightCenterX, 64);
        ctx.font = '800 22px Cairo, sans-serif';
        ctx.fillText('(حكاية وطن)', rightCenterX, 91);
        ctx.font = '700 14px Cairo, sans-serif';
        ctx.fillText('المشهر برقم 1279 لسنة 2025', rightCenterX, 116);
        ctx.fillText('بوزارة التضامن الاجتماعي', rightCenterX, 136);
      } else {
        ctx.font = '700 15px Cairo, sans-serif';
        const words = (design.footer_note_ar || '').split(/\s+/);
        const lines: string[] = [];
        let line = '';
        for (const w of words) {
          const test = line ? `${line} ${w}` : w;
          if (test.length > 28) {
            lines.push(line);
            line = w;
          } else {
            line = test;
          }
        }
        if (line) lines.push(line);
        lines.slice(0, 5).forEach((ln, idx) => {
          ctx.fillText(ln, rightCenterX, 34 + idx * 24, 330);
        });
      }
      ctx.restore();

      // Header Center Block: Initiative Emblem + Brand Lockup
      ctx.save();
      if (sdgImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(695, 78, 52, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.clip();
        drawImageContain(ctx, sdgImg, 645, 28, 100, 100);
        ctx.restore();
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.direction = 'rtl';
      ctx.fillStyle = '#081b4b';
      ctx.font = '800 33px Cairo, sans-serif';
      ctx.fillText(headerTitleAr, 515, 48, 280);

      ctx.direction = 'ltr';
      ctx.fillStyle = '#0284c7';
      ctx.font = '800 18px Cairo, sans-serif';
      ctx.fillText(headerTitleEn, 515, 84, 280);

      ctx.direction = 'rtl';
      ctx.fillStyle = '#1e293b';
      ctx.font = '700 16px Cairo, sans-serif';
      ctx.fillText(headerSubtitleAr, 515, 116, 280);
      ctx.restore();

      // Header Left Block: Institutional & Admin-Added Seals
      const sealCount = displaySealLogos.length;
      const sealSize = sealCount <= 2 ? 96 : sealCount === 3 ? 82 : 66;
      const sealGap = sealCount <= 2 ? 16 : 10;
      sealImgs.forEach((img, idx) => {
        const logoMeta = displaySealLogos[idx];
        const sizeScale = Math.min(1.12, Math.max(0.82, (logoMeta?.width_px || 42) / 42));
        const dSize = Math.round(sealSize * sizeScale);
        const sx = 32 + idx * (sealSize + sealGap);
        const sy = 22 + Math.round((sealSize - dSize) / 2);
        ctx.save();
        ctx.beginPath();
        ctx.arc(sx + dSize / 2, sy + dSize / 2, dSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#cbd5e1';
        ctx.stroke();
        ctx.clip();
        if (img) drawImageContain(ctx, img, sx + 5, sy + 5, dSize - 10, dSize - 10);
        ctx.restore();
      });

      // 2. Gold Membership Ribbon
      drawGoldRibbon(ctx, 375, 184, 450, 52, cardBadgeAr, true);

      // 3. Right Column: Cyber Shield + Padlock + Slogan + Mini Seal
      ctx.save();
      const scx = 1045;
      const scy = 350;
      const shieldGrad = ctx.createLinearGradient(scx - 80, scy - 90, scx + 80, scy + 90);
      shieldGrad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
      shieldGrad.addColorStop(1, 'rgba(37, 99, 235, 0.45)');

      ctx.shadowColor = 'rgba(56, 189, 248, 0.7)';
      ctx.shadowBlur = 22;
      ctx.beginPath();
      ctx.moveTo(scx, scy - 90);
      ctx.lineTo(scx + 82, scy - 54);
      ctx.quadraticCurveTo(scx + 82, scy + 38, scx, scy + 94);
      ctx.quadraticCurveTo(scx - 82, scy + 38, scx - 82, scy - 54);
      ctx.closePath();
      ctx.fillStyle = shieldGrad;
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#67e8f9';
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(scx, scy - 16, 22, Math.PI, 0, false);
      ctx.stroke();
      drawRoundedRect(ctx, scx - 32, scy - 10, 64, 52, 10);
      ctx.fillStyle = '#e0f2fe';
      ctx.fill();
      ctx.fillStyle = '#0369a1';
      ctx.beginPath();
      ctx.arc(scx, scy + 11, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(scx - 3, scy + 14, 6, 14);

      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.direction = 'rtl';
      ctx.font = '800 26px Cairo, sans-serif';
      sideSloganLines.slice(0, 2).forEach((ln, idx) => {
        ctx.fillText(ln, scx, 490 + idx * 38, 220);
      });

      if (sdgImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(1078, 644, 52, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#1d4ed8';
        ctx.stroke();
        ctx.clip();
        drawImageContain(ctx, sdgImg, 1032, 598, 92, 92);
        ctx.restore();
      }
      ctx.restore();

      // 4. Center Column: Tabular Info Rows + Leadership Signatures
      const rowLeft = 282;
      const rowRight = 905;
      const rowW = rowRight - rowLeft;
      const tagW = 205;
      const totalRows = memberRows.length;
      const maxStackH = 272;
      const rowGap = Math.min(45, Math.floor(maxStackH / Math.max(1, totalRows)));
      const rowH = Math.min(39, rowGap - 5);
      const startY = 256;

      memberRows.forEach((row, idx) => {
        const ry = startY + idx * rowGap;

        ctx.save();
        const barGrad = ctx.createLinearGradient(rowLeft, ry, rowRight, ry);
        barGrad.addColorStop(0, '#ffffff');
        barGrad.addColorStop(1, '#f1f5f9');
        drawRoundedRect(ctx, rowLeft, ry, rowW - 8, rowH, rowH / 2);
        ctx.fillStyle = barGrad;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        ctx.fillStyle = '#04133a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.direction = row.mono ? 'ltr' : 'rtl';
        const fontSize = rowH < 32 ? 18 : 22;
        ctx.font = row.mono ? `800 ${fontSize}px "IBM Plex Mono", Cairo, monospace` : `800 ${fontSize}px Cairo, sans-serif`;
        const valCenterX = rowLeft + (rowW - tagW) / 2;
        ctx.fillText(row.value || '—', valCenterX, ry + rowH / 2 + 1, rowW - tagW - 22);

        const tagX = rowRight - tagW;
        const tagGrad = ctx.createLinearGradient(tagX, ry, rowRight, ry);
        tagGrad.addColorStop(0, '#0a3d91');
        tagGrad.addColorStop(1, '#04194a');
        drawRoundedRect(ctx, tagX, ry, tagW, rowH, rowH / 2);
        ctx.fillStyle = tagGrad;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(147, 197, 253, 0.55)';
        ctx.stroke();

        ctx.fillStyle = '#e0f2fe';
        ctx.beginPath();
        ctx.arc(rowRight - 22, ry + rowH / 2, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'right';
        ctx.direction = 'rtl';
        ctx.font = `800 ${rowH < 32 ? 17 : 19}px Cairo, sans-serif`;
        ctx.fillText(row.label, rowRight - 36, ry + rowH / 2 + 1, tagW - 42);
        ctx.restore();
      });

      // Frosted Leadership Signatures Block
      const sigY = 538;
      const sigH = 166;
      ctx.save();
      drawRoundedRect(ctx, rowLeft, sigY, rowW, sigH, 20);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      const midX = rowLeft + rowW / 2 - 20;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(midX, sigY + 18, 2.5, sigH - 36);

      const vpCenterX = midX + (rowRight - midX) / 2;
      ctx.fillStyle = '#04133a';
      ctx.textAlign = 'center';
      ctx.direction = 'rtl';
      ctx.font = '800 21px Cairo, sans-serif';
      ctx.fillText(vpTitleAr, vpCenterX, sigY + 30, rowRight - midX - 20);
      ctx.font = '700 19px Cairo, sans-serif';
      vpNamesLines.slice(0, 4).forEach((name, idx) => {
        ctx.fillText(name, vpCenterX, sigY + 64 + idx * 30, rowRight - midX - 20);
      });

      const presCenterX = rowLeft + (midX - rowLeft) / 2;
      ctx.font = '800 21px Cairo, sans-serif';
      ctx.fillText(presidentTitleAr, presCenterX, sigY + 46, midX - rowLeft - 20);
      ctx.font = '800 24px Cairo, sans-serif';
      ctx.fillText(presidentNameAr, presCenterX, sigY + 96, midX - rowLeft - 20);
      ctx.restore();

      // 5. Left Column: Portrait + QR Code + Verify Badge
      const px = 42;
      const py = 224;
      const pw = 216;
      const ph = 248;

      ctx.save();
      drawRoundedRect(ctx, px, py, pw, ph, 16);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#e2e8f0';
      ctx.stroke();
      ctx.clip();
      if (avatarImg) {
        drawImageCover(ctx, avatarImg, px + 4, py + 4, pw - 8, ph - 8);
      } else {
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(px, py, pw, ph);
        // Subtle person silhouette head & shoulders
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(px + pw / 2, py + ph * 0.36, 36, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px + pw / 2, py + ph * 0.92, 68, Math.PI, 0, false);
        ctx.fill();
        ctx.fillStyle = '#334155';
        ctx.textAlign = 'center';
        ctx.direction = 'rtl';
        ctx.font = '800 20px Cairo, sans-serif';
        ctx.fillText('صورة العضو', px + pw / 2, py + ph - 26);
      }
      ctx.restore();

      const qSize = 166;
      const qx = px + (pw - qSize) / 2;
      const qy = 486;
      ctx.save();
      drawRoundedRect(ctx, qx, qy, qSize, qSize, 16);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#bae6fd';
      ctx.stroke();
      if (qrImg) {
        ctx.drawImage(qrImg, qx + 10, qy + 10, qSize - 20, qSize - 20);
      }
      ctx.restore();

      const vbx = 34;
      const vby = 666;
      const vbw = 232;
      const vbh = 42;
      ctx.save();
      drawRoundedRect(ctx, vbx, vby, vbw, vbh, vbh / 2);
      ctx.fillStyle = '#061a44';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.7)';
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.direction = 'rtl';
      ctx.font = '700 17px Cairo, sans-serif';
      ctx.fillText(`✓  ${verifyBadgeAr}`, vbx + vbw / 2, vby + vbh / 2 + 1, vbw - 20);
      ctx.restore();
    } else {
      // BACK SIDE
      const [sdgImg, ...partnerImgs] = await Promise.all([
        loadImg(centerInitiativeLogo),
        ...displayBackLogos.map((l) => loadImg(l.logo_url))
      ]);

      drawGoldRibbon(ctx, 210, 38, 780, 56, backTitleAr, true);

      const count = displayBackLogos.length;
      const cols = count <= 5 ? count : Math.ceil(count / 2);
      const rows = count <= 5 ? 1 : 2;
      const gap = 20;
      const maxCardW = rows === 1 ? (cols <= 3 ? 250 : cols === 4 ? 225 : 204) : 230;
      const cardH = rows === 1 ? 310 : 148;
      const topCardY = 122;

      displayBackLogos.forEach((logo, idx) => {
        const rowIdx = rows === 1 ? 0 : Math.floor(idx / cols);
        const colIdx = rows === 1 ? idx : idx % cols;
        const itemsInThisRow = rows === 1 ? count : rowIdx === 0 ? cols : count - cols;
        const rowW = itemsInThisRow * maxCardW + (itemsInThisRow - 1) * gap;
        const startX = (W - rowW) / 2;
        const cx = startX + colIdx * (maxCardW + gap);
        const cy = topCardY + rowIdx * (cardH + 16);

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 6;
        drawRoundedRect(ctx, cx, cy, maxCardW, cardH, rows === 1 ? 24 : 18);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        ctx.lineWidth = 4;
        ctx.strokeStyle = '#f59e0b';
        ctx.stroke();

        const img = partnerImgs[idx];
        const imgBoxH = rows === 1 ? 175 : 86;
        if (img) {
          drawImageContain(ctx, img, cx + 18, cy + 14, maxCardW - 36, imgBoxH);
        }

        ctx.fillStyle = '#081b4b';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.direction = 'rtl';
        ctx.font = rows === 1 ? '800 18px Cairo, sans-serif' : '800 14px Cairo, sans-serif';
        if (rows === 1) {
          const words = logo.name.split(/\s+/);
          let l1 = '';
          let l2 = '';
          for (const w of words) {
            if (!l2 && (l1 ? `${l1} ${w}` : w).length <= 20) {
              l1 = l1 ? `${l1} ${w}` : w;
            } else {
              l2 = l2 ? `${l2} ${w}` : w;
            }
          }
          if (l2) {
            ctx.fillText(l1, cx + maxCardW / 2, cy + 234, maxCardW - 22);
            ctx.fillText(l2, cx + maxCardW / 2, cy + 264, maxCardW - 22);
          } else {
            ctx.fillText(l1, cx + maxCardW / 2, cy + 248, maxCardW - 22);
          }
        } else {
          ctx.fillText(logo.name, cx + maxCardW / 2, cy + 120, maxCardW - 18);
        }
        ctx.restore();
      });

      // Egyptian Flag Wave on Bottom-Right
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(W, 470);
      ctx.bezierCurveTo(W - 140, 520, W - 260, 625, W - 470, H);
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.clip();

      ctx.fillStyle = '#ce1126';
      ctx.fillRect(W - 500, 470, 500, 115);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(W - 500, 585, 500, 75);
      ctx.fillStyle = '#09090b';
      ctx.fillRect(W - 500, 660, 500, 95);
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(W, 470);
      ctx.bezierCurveTo(W - 140, 520, W - 260, 625, W - 470, H);
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#f59e0b';
      ctx.stroke();
      ctx.restore();

      // Pyramids Silhouette Bottom-Left
      ctx.save();
      ctx.fillStyle = 'rgba(14, 116, 144, 0.42)';
      ctx.strokeStyle = 'rgba(103, 232, 249, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(20, H);
      ctx.lineTo(130, 595);
      ctx.lineTo(240, H);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(180, H);
      ctx.lineTo(265, 620);
      ctx.lineTo(350, H);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Centered Initiative Logo + Bilingual Name
      ctx.save();
      if (sdgImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(710, 550, 56, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#38bdf8';
        ctx.stroke();
        ctx.clip();
        drawImageContain(ctx, sdgImg, 656, 496, 108, 108);
        ctx.restore();
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.direction = 'rtl';
      ctx.fillStyle = textColor;
      ctx.font = '800 38px Cairo, sans-serif';
      ctx.fillText(headerTitleAr, 510, 535, 300);

      ctx.direction = 'ltr';
      ctx.fillStyle = '#67e8f9';
      ctx.font = '800 19px Cairo, sans-serif';
      ctx.fillText(headerTitleEn, 510, 578, 300);
      ctx.restore();

      drawGoldRibbon(ctx, 295, 646, 610, 52, backSloganAr, false);

      ctx.save();
      ctx.fillStyle = 'rgba(186, 230, 253, 0.78)';
      ctx.textAlign = 'left';
      ctx.direction = 'ltr';
      ctx.font = '600 15px "IBM Plex Mono", monospace';
      ctx.fillText(member.card_number, 28, H - 20);
      ctx.restore();
    }

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

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      pdf.setFillColor(10, 25, 47);
      pdf.rect(0, 0, pageWidth, 24, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(13);
      pdf.text('SAFE DIGITAL GENERATION — OFFICIAL MEMBERSHIP CARD', pageWidth / 2, 10.5, { align: 'center' });
      pdf.setFontSize(9);
      pdf.setTextColor(56, 189, 248);
      pdf.text(`Member ID: ${member.member_number}  |  Card No: ${member.card_number}  |  CR80 Print Sheet`, pageWidth / 2, 17.5, { align: 'center' });

      const cardW = 86;
      const cardH = 54;
      const x = (pageWidth - cardW) / 2;
      const frontY = 42;
      const backY = 120;

      pdf.setTextColor(71, 85, 105);
      pdf.setFontSize(9);
      pdf.text('FRONT SIDE (CR80: 86 x 54 mm)', x, frontY - 3);
      pdf.addImage(frontDataUrl, 'PNG', x, frontY, cardW, cardH, undefined, 'FAST');

      pdf.setDrawColor(148, 163, 184);
      pdf.setLineWidth(0.3);
      pdf.rect(x - 1, frontY - 1, cardW + 2, cardH + 2);

      pdf.text('BACK SIDE (CR80: 86 x 54 mm)', x, backY - 3);
      pdf.addImage(backDataUrl, 'PNG', x, backY, cardW, cardH, undefined, 'FAST');
      pdf.rect(x - 1, backY - 1, cardW + 2, cardH + 2);

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

  const circuitSvg = (
    <svg
      aria-hidden="true"
      viewBox="0 0 1200 750"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 w-full h-full opacity-35"
    >
      <g stroke={accent} strokeWidth="2" fill="none">
        <path d="M0 260 H75 L115 300 V420" />
        <path d="M0 320 H55 L88 353 V560 L130 602" />
        <path d="M0 620 H90 L140 670 H280" />
        <path d="M1200 250 H1115 L1065 300 V410" />
        <path d="M1200 330 H1140 L1095 375 V535 L1035 595" />
        <path d="M1200 590 H1110 L1065 635 H930" />
      </g>
      <g fill={accent}>
        <circle cx="115" cy="420" r="4" />
        <circle cx="130" cy="602" r="4" />
        <circle cx="280" cy="670" r="4" />
        <circle cx="1065" cy="410" r="4" />
        <circle cx="1035" cy="595" r="4" />
        <circle cx="930" cy="635" r="4" />
      </g>
    </svg>
  );

  const compactRows = memberRows.length > 6;

  const [avatarFailed, setAvatarFailed] = useState(false);

  const FrontCard = (
    <div
      dir="rtl"
      style={{
        background: `radial-gradient(circle at 80% 55%, rgba(56,189,248,0.28) 0%, rgba(10,58,138,0.18) 38%, transparent 70%), linear-gradient(135deg, ${frontBg} 0%, #0a3480 52%, #04133a 100%)`,
        color: textColor
      }}
      className="relative w-full max-w-[540px] min-h-[335px] rounded-xl overflow-hidden shadow-xl border border-cyan-300/40 select-none flex flex-col"
    >
      {circuitSvg}

      {/* Top Curved White Header Band (SVG covers full text zone cleanly) */}
      <div className="relative z-10 shrink-0 px-3 sm:px-4 pt-2 pb-3">
        <svg
          aria-hidden="true"
          viewBox="0 0 1200 196"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 w-full h-full"
        >
          <defs>
            <linearGradient id="sdgHeaderFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="82%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#e0f2fe" />
            </linearGradient>
          </defs>
          <path d="M0,0 L1200,0 L1200,162 C880,194 320,194 0,162 Z" fill="url(#sdgHeaderFill)" />
          <path d="M0,162 C320,194 880,194 1200,162" fill="none" stroke="#1d4ed8" strokeWidth="6" />
          <path d="M0,168 C320,200 880,200 1200,168" fill="none" stroke="#f59e0b" strokeWidth="3" />
        </svg>

        <div className="relative z-10 grid grid-cols-12 items-center gap-1 text-slate-900">
          {/* Right Zone: Umbrella Text */}
          <div className="col-span-4 text-center leading-[1.22] text-[#04133a]">
            {isDefaultUmbrella ? (
              <>
                <p className="text-[7px] sm:text-[8.5px] font-black">تحت مظلة</p>
                <p className="text-[6.5px] sm:text-[7.5px] font-bold">الاتحاد النوعي للجمعيات</p>
                <p className="text-[6.5px] sm:text-[7.5px] font-bold">العاملة في مجال التنمية المجتمعية</p>
                <p className="text-[8.5px] sm:text-[10.5px] font-black leading-tight text-[#0a2f7a]">(حكاية وطن)</p>
                <p className="text-[6.5px] sm:text-[7.5px] font-bold">المشهر برقم 1279 لسنة 2025</p>
                <p className="text-[6.5px] sm:text-[7.5px] font-bold">بوزارة التضامن الاجتماعي</p>
              </>
            ) : (
              <p className="text-[7px] sm:text-[8.5px] font-bold leading-snug line-clamp-4">{design.footer_note_ar}</p>
            )}
          </div>

          {/* Center Zone: Emblem + Bilingual Title */}
          <div className="col-span-5 flex items-center justify-center gap-1.5 sm:gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white shadow-sm border border-sky-200 p-0.5 shrink-0 overflow-hidden flex items-center justify-center">
              <SafeImage src={centerInitiativeLogo} alt={headerTitleAr} className="w-full h-full object-contain rounded-full" />
            </div>
            <div className="text-center min-w-0">
              <p className="text-[11px] sm:text-[14.5px] font-black text-[#04133a] font-display leading-tight">
                {headerTitleAr}
              </p>
              <p className="text-[6px] sm:text-[7.5px] font-extrabold tracking-tight text-sky-700 uppercase mt-0.5">
                {headerTitleEn}
              </p>
              <p className="text-[6.5px] sm:text-[8px] font-bold text-slate-800">
                {headerSubtitleAr}
              </p>
            </div>
          </div>

          {/* Left Zone: Institutional & Added Front Seals */}
          <div className="col-span-3 flex items-center justify-end gap-1 flex-wrap">
            {displaySealLogos.map((logo) => {
              const scale = Math.min(1.15, Math.max(0.82, (logo.width_px || 42) / 42));
              const pxSize = Math.round((displaySealLogos.length > 2 ? 28 : 36) * scale);
              return (
                <div
                  key={logo.id}
                  title={logo.name}
                  style={{ width: `${pxSize}px`, height: `${pxSize}px` }}
                  className="rounded-full bg-white p-0.5 shadow border border-slate-200 overflow-hidden flex items-center justify-center shrink-0"
                >
                  <SafeImage src={logo.logo_url} alt={logo.name} className="w-full h-full object-contain rounded-full" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Gold Ribbon Banner */}
      <div className="relative z-10 flex justify-center -mt-1.5 mb-1.5">
        <div
          className="px-5 sm:px-7 py-0.5 rounded-full shadow-md border border-amber-200/90 flex items-center gap-2"
          style={{
            background: 'linear-gradient(135deg, #ca8a04 0%, #fde68a 26%, #f59e0b 54%, #fde047 80%, #b45309 100%)'
          }}
        >
          <span className="text-amber-100 drop-shadow text-[9px] sm:text-[11px]">★</span>
          <span className="text-[9.5px] sm:text-[12px] font-black text-[#04133a] font-display whitespace-nowrap">
            {cardBadgeAr}
          </span>
          <span className="text-amber-100 drop-shadow text-[9px] sm:text-[11px]">★</span>
        </div>
      </div>

      {/* Main 3-Column Body */}
      <div className="relative z-10 flex-1 px-2.5 sm:px-3.5 pb-2.5 grid grid-cols-[18%_1fr_24%] gap-2 items-stretch">
        {/* Right Column: Glowing Cyber Padlock Shield + Slogan + Mini Seal */}
        <div className="flex flex-col items-center justify-between pt-1 pb-0.5">
          <div className="flex flex-col items-center text-center gap-1">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0.5 rounded-full bg-cyan-400/25 blur-sm" />
              <svg viewBox="0 0 120 132" className="relative w-11 h-12 sm:w-14 sm:h-16 drop-shadow-[0_0_8px_rgba(56,189,248,0.65)]">
                <defs>
                  <linearGradient id="shieldBody" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.55" />
                  </linearGradient>
                </defs>
                <path
                  d="M60 8 L108 28 C108 76 88 104 60 122 C32 104 12 76 12 28 Z"
                  fill="url(#shieldBody)"
                  stroke="#67e8f9"
                  strokeWidth="4.5"
                />
                <path d="M44 58 V46 C44 37 51 30 60 30 C69 30 76 37 76 46 V58" fill="none" stroke="#e0f2fe" strokeWidth="6.5" strokeLinecap="round" />
                <rect x="37" y="56" width="46" height="36" rx="7" fill="#e0f2fe" />
                <circle cx="60" cy="70" r="4.5" fill="#0369a1" />
                <rect x="58" y="72" width="4" height="10" rx="1.5" fill="#0369a1" />
              </svg>
            </div>
            <div className="leading-snug font-black text-[8px] sm:text-[9.5px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
              {sideSloganLines.map((ln, idx) => (
                <p key={idx}>{ln}</p>
              ))}
            </div>
          </div>

          <div className="self-start mr-0.5 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white p-0.5 border border-blue-600 ring-1 ring-cyan-300/50 shadow overflow-hidden">
            <SafeImage src={centerInitiativeLogo} alt="ختم المبادرة" className="w-full h-full object-contain rounded-full" />
          </div>
        </div>

        {/* Center Column: Tabular Info Rows + Leadership Names */}
        <div className="flex flex-col justify-between min-w-0 gap-1.5">
          <div className="space-y-1">
            {memberRows.map((row, idx) => {
              const Icon = row.icon;
              return (
                <div
                  key={`${row.label}-${idx}`}
                  className="flex items-stretch min-h-[19px] sm:min-h-[21px] rounded-full overflow-hidden shadow-sm border border-white bg-white"
                >
                  <div className="min-w-[70px] sm:min-w-[88px] shrink-0 flex items-center gap-1 px-2 bg-gradient-to-l from-[#04194a] to-[#0b439c] text-white rounded-full">
                    <Icon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-cyan-200 shrink-0" />
                    <span className="text-[7.5px] sm:text-[9px] font-bold whitespace-nowrap">{row.label}</span>
                  </div>
                  <div className="flex-1 min-w-0 flex items-center justify-center px-2 py-0.5 text-[#04133a]">
                    <span
                      className={`${compactRows ? 'text-[7.5px] sm:text-[9px]' : 'text-[8px] sm:text-[9.5px]'} font-black leading-tight text-center break-words ${row.mono ? 'font-mono-num' : ''}`}
                      dir={row.mono ? 'ltr' : 'rtl'}
                    >
                      {row.value || '—'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Leadership Signatures Block */}
          <div className="rounded-lg bg-white/95 border border-white shadow-inner px-2 py-1.5 text-[#04133a] grid grid-cols-2 items-center">
            <div className="text-center border-l border-slate-700/70 pl-1.5 space-y-0.5 leading-snug">
              <p className="text-[7.5px] sm:text-[9px] font-black">{vpTitleAr}</p>
              {vpNamesLines.map((name, idx) => (
                <p key={idx} className="text-[7px] sm:text-[8.5px] font-bold">
                  {name}
                </p>
              ))}
            </div>
            <div className="text-center pr-1.5 space-y-0.5 leading-snug">
              <p className="text-[7.5px] sm:text-[9px] font-black">{presidentTitleAr}</p>
              <p className="text-[8.5px] sm:text-[10px] font-black">{presidentNameAr}</p>
            </div>
          </div>
        </div>

        {/* Left Column: Person Portrait Slot + Real Scannable QR Code + Interactive Verify Link */}
        <div className="flex flex-col items-center justify-between gap-1.5">
          <div className="relative w-full max-w-[74px] sm:max-w-[90px] aspect-[4/4.6] rounded-lg overflow-hidden bg-slate-100 border-2 border-white shadow-md">
            {member.avatar_url && !avatarFailed ? (
              <img
                src={member.avatar_url}
                alt={member.full_name}
                referrerPolicy="no-referrer"
                onError={() => setAvatarFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-b from-slate-100 to-slate-200 flex flex-col items-center justify-center p-1 text-center text-slate-600">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-300/80 flex items-center justify-center mb-0.5">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                </div>
                <span className="text-[7.5px] sm:text-[8.5px] font-extrabold text-slate-700 leading-tight">صورة الشخص</span>
              </div>
            )}
            {member.card_status === 'suspended' && (
              <div className="absolute inset-x-0 bottom-0 bg-red-700/90 text-white text-[7px] font-bold text-center py-0.5">
                عضوية موقوفة
              </div>
            )}
          </div>

          <a
            href={verifyPath}
            target="_blank"
            rel="noopener noreferrer"
            title="فتح صفحة التحقق الرقمي"
            className="bg-white p-1 rounded-md shadow border border-sky-200 hover:border-cyan-400 transition-colors"
          >
            {effectiveQrDataUrl ? (
              <img src={effectiveQrDataUrl} alt="QR Verification" className="w-12 h-12 sm:w-15 sm:h-15 object-contain" />
            ) : (
              <div className="w-12 h-12 sm:w-15 sm:h-15 flex items-center justify-center text-slate-500">
                <QrCode className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
            )}
          </a>

          <a
            href={verifyPath}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full rounded-full bg-[#061a44] hover:bg-[#0b2a6b] border border-sky-200/80 px-2 py-1 flex items-center justify-center gap-1 text-white shadow transition-colors"
          >
            <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-cyan-300 shrink-0" />
            <span className="text-[6.5px] sm:text-[8px] font-bold whitespace-nowrap">{verifyBadgeAr}</span>
          </a>
        </div>
      </div>
    </div>
  );

  const backGridCols =
    displayBackLogos.length <= 5 ? 'flex items-stretch justify-center gap-2' : 'grid grid-cols-4 gap-1.5 place-items-stretch';

  const BackCard = (
    <div
      dir="rtl"
      style={{
        background: `radial-gradient(circle at 50% 45%, rgba(56,189,248,0.22) 0%, transparent 65%), linear-gradient(135deg, ${backBg} 0%, #0a3480 52%, #04133a 100%)`,
        color: textColor
      }}
      className="relative w-full max-w-[540px] min-h-[335px] rounded-xl overflow-hidden shadow-xl border border-cyan-300/40 select-none flex flex-col justify-between"
    >
      {circuitSvg}

      {/* Top Gold Metallic Banner */}
      <div className="relative z-10 pt-2.5 sm:pt-3 px-3 flex justify-center">
        <div
          className="px-5 sm:px-8 py-1 rounded-full shadow-md border border-amber-200/90 flex items-center gap-2"
          style={{
            background: 'linear-gradient(135deg, #ca8a04 0%, #fde68a 26%, #f59e0b 54%, #fde047 80%, #b45309 100%)'
          }}
        >
          <span className="text-amber-100 drop-shadow text-[10px] sm:text-xs">★</span>
          <span className="text-[9.5px] sm:text-[12px] font-black text-[#04133a] font-display whitespace-nowrap">
            {backTitleAr}
          </span>
          <span className="text-amber-100 drop-shadow text-[10px] sm:text-xs">★</span>
        </div>
      </div>

      {/* Horizontal Partner Cards Row */}
      <div className={`relative z-10 px-3 sm:px-5 py-2.5 flex-1 min-h-[140px] ${backGridCols}`}>
        {displayBackLogos.map((logo) => (
          <div
            key={logo.id}
            className="flex-1 w-full max-w-[115px] bg-white rounded-xl border border-amber-400 ring-1 ring-cyan-300/20 shadow-lg p-1.5 flex flex-col items-center justify-between text-center min-h-[115px]"
          >
            <div className="flex-1 w-full min-h-0 flex items-center justify-center p-1">
              <SafeImage src={logo.logo_url} alt={logo.name} className="max-h-full max-w-full object-contain" />
            </div>
            <p className="text-[7px] sm:text-[8.5px] font-black text-[#04133a] leading-snug line-clamp-2 pt-1">
              {logo.name}
            </p>
          </div>
        ))}
      </div>

      {/* Bottom Showcase Strip: Egyptian Flag Wave + Pyramids + Centered Brand + Gold Slogan */}
      <div className="relative z-10 h-[106px] sm:h-[114px] shrink-0 flex flex-col items-center justify-end pb-2.5 overflow-hidden">
        <svg
          aria-hidden="true"
          viewBox="0 0 1200 240"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 w-full h-full"
        >
          <defs>
            <clipPath id="egyptWaveClip">
              <path d="M1200,0 C1060,55 930,145 730,240 L1200,240 Z" />
            </clipPath>
          </defs>
          <g fill="rgba(14,116,144,0.45)" stroke="rgba(103,232,249,0.35)" strokeWidth="2">
            <polygon points="15,240 125,110 235,240" />
            <polygon points="175,240 265,135 355,240" />
          </g>
          <g clipPath="url(#egyptWaveClip)">
            <rect x="700" y="0" width="500" height="90" fill="#ce1126" />
            <rect x="700" y="90" width="500" height="75" fill="#ffffff" />
            <rect x="700" y="165" width="500" height="80" fill="#09090b" />
          </g>
          <path d="M1200,0 C1060,55 930,145 730,240" fill="none" stroke="#f59e0b" strokeWidth="5" />
        </svg>

        <div className="relative z-10 flex items-center justify-center gap-2 mb-1.5">
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white p-0.5 border border-cyan-300 shadow overflow-hidden shrink-0">
            <SafeImage src={centerInitiativeLogo} alt={headerTitleAr} className="w-full h-full object-contain rounded-full" />
          </div>
          <div className="text-center">
            <p className="text-xs sm:text-sm font-black text-white font-display leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {headerTitleAr}
            </p>
            <p className="text-[6.5px] sm:text-[8px] font-extrabold text-cyan-300 tracking-wider uppercase mt-0.5 drop-shadow">
              {headerTitleEn}
            </p>
          </div>
        </div>

        <div
          className="relative z-10 px-5 sm:px-8 py-0.5 rounded-full shadow border border-amber-200/90"
          style={{
            background: 'linear-gradient(135deg, #ca8a04 0%, #fde68a 26%, #f59e0b 54%, #fde047 80%, #b45309 100%)'
          }}
        >
          <span className="text-[8.5px] sm:text-[10.5px] font-black text-[#04133a] font-display whitespace-nowrap">
            {backSloganAr}
          </span>
        </div>

        <span className="absolute left-3 bottom-2 z-10 text-[7.5px] sm:text-[9px] font-mono-num text-cyan-200/90" dir="ltr">
          {member.card_number}
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div ref={printRef} className="print-area flex flex-col items-center gap-4">
        <div className="w-full flex justify-center print:hidden">{side === 'front' ? FrontCard : BackCard}</div>
        <div className="hidden print:flex flex-col items-center gap-6">
          {FrontCard}
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
