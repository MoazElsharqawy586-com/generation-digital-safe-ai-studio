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
import { trackEvent } from '../lib/analytics';

export interface CardMemberInfo {
  full_name: string;
  full_name_en?: string;
  member_number: string;
  national_id_number?: string;
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
const OFFICIAL_STAMP_URL = '/assets/aistudio/file_000000006a4c820a8bb98e0bc0a1a48d_248264a5.png';
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

  const pickText = (val: string | null | undefined, fallback: string): string =>
    val !== undefined && val !== null ? val.trim() : fallback;

  // Customizable texts from Card Designer (preserving empty "" when intentionally deleted)
  const headerTitleAr = pickText(design.header_title_ar, 'جيل رقمي آمن');
  const headerTitleEn = pickText(design.header_title_en, 'SAFE DIGITAL GENERATION');
  const headerSubtitleAr = pickText(design.header_subtitle_ar, 'معًا لمستقبل رقمي آمن');
  const cardBadgeAr = pickText(design.card_badge_ar, 'كارنيه عضوية');
  const sideSloganAr = pickText(design.side_slogan_ar, 'جيل واعٍ .. مجتمع أكثر أماناً');
  const verifyBadgeAr = pickText(design.verify_badge_ar, 'تحقق من صحة الكارنيه');
  const vpTitleAr = pickText(design.vp_title_ar, 'نائب رئيس المبادرة');
  const vpNamesRaw =
    design.vp_names_ar !== undefined && design.vp_names_ar !== null
      ? design.vp_names_ar
      : 'د. داليا نصار\nأ. أحمد نصار\nأ. أماني عبد الفتاح';
  const vpNamesLines = vpNamesRaw
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const showVpBox = Boolean(vpTitleAr || vpNamesLines.length > 0);
  const presidentTitleAr = pickText(design.president_title_ar, 'رئيس المبادرة');
  const presidentNameAr = pickText(design.president_name_ar, 'أ. معاذ الشرقاوي');
  const presidentSignatureUrl = design.president_signature_url?.trim() || '';
  const presidentSignatureText = design.president_signature_text?.trim() || '';
  const showPresidentBox = Boolean(
    presidentTitleAr || presidentNameAr || presidentSignatureUrl || presidentSignatureText
  );
  const stampUrl = design.stamp_url?.trim() || '';
  const showStamp = Boolean(design.show_stamp) && Boolean(stampUrl);
  const stampPosition = (design.stamp_position || 'over_signature') as
    | 'over_signature'
    | 'right_center'
    | 'right_bottom'
    | 'back_left';
  const backTitleAr = pickText(design.back_title_ar, 'شركاء النجاح والشراكات المؤسسية');
  const backSloganAr = pickText(design.back_slogan_ar, 'معاً ... نبني مجتمعاً رقمياً آمناً');
  const extraRows = parseExtraRows(design.extra_rows_json);

  const centerFrontLogo =
    frontLogos.find((l) => l.name.trim() === 'شعار مبادرة جيل رقمي آمن') ||
    frontLogos.find((l) => l.id === 1) ||
    frontLogos.find((l) => l.logo_url.includes('1789831319399')) ||
    null;
  const centerBackLogo =
    backLogosRaw.find((l) => l.name.trim() === 'شعار مبادرة جيل رقمي آمن') ||
    backLogosRaw.find((l) => l.id === 1) ||
    backLogosRaw.find((l) => l.logo_url.includes('1789831319399')) ||
    centerFrontLogo;
  const centerInitiativeLogo = centerFrontLogo?.logo_url || '';
  const backCenterInitiativeLogo = centerBackLogo?.logo_url || '';
  const displaySealLogos = frontLogos.filter((l) => l.id !== centerFrontLogo?.id);
  const displayBackLogos = backLogosRaw;

  const rawFooterNote = design.footer_note_ar;
  const trimmedFooterNote =
    rawFooterNote !== undefined && rawFooterNote !== null ? rawFooterNote.trim() : DEFAULT_UMBRELLA_NOTE;
  const isDefaultUmbrella =
    trimmedFooterNote === DEFAULT_UMBRELLA_NOTE ||
    (trimmedFooterNote.includes('حكاية وطن') &&
      trimmedFooterNote.includes('1279') &&
      trimmedFooterNote.includes('المشهر برقم 1279'));

  const formattedPosition =
    member.position_title && member.governorate && member.position_title.includes('محافظة') && !member.position_title.includes(member.governorate)
      ? `${member.position_title} — ${member.governorate}`
      : member.position_title || 'عضو';

  const isPresidentMember =
    Boolean(member.position_title?.includes('رئيس المبادرة')) && !Boolean(member.position_title?.includes('نائب'));
  const hasExpiryDate = Boolean(member.expiry_date && member.expiry_date !== 'permanent' && member.expiry_date !== 'none');

  const memberRows = [
    { label: 'الاسم:', value: member.full_name, icon: User, mono: false },
    ...(member.national_id_number
      ? [{ label: 'الرقم القومي:', value: member.national_id_number, icon: Tag, mono: true }]
      : []),
    { label: 'رقم العضوية:', value: member.member_number || member.card_number, icon: CreditCard, mono: true },
    {
      label: 'اللجنة:',
      value: member.committee_name || (isPresidentMember ? 'القيادة العليا' : 'عام'),
      icon: Settings,
      mono: false
    },
    { label: 'المنصب:', value: formattedPosition, icon: Users, mono: false },
    { label: 'تاريخ الإصدار:', value: formatCardDate(member.issue_date), icon: Calendar, mono: true },
    ...(design.show_expiry && hasExpiryDate
      ? [{ label: 'تاريخ الانتهاء:', value: formatCardDate(member.expiry_date), icon: CalendarCheck, mono: true }]
      : []),
    ...extraRows.map((r) => ({
      label: r.label ? (r.label.endsWith(':') ? r.label : `${r.label}:`) : 'بيان:',
      value: r.value,
      icon: Tag,
      mono: false
    }))
  ];

  const sideSloganLines = !sideSloganAr
    ? []
    : sideSloganAr.includes('..')
      ? sideSloganAr.split('..').map((part, idx, arr) => (idx < arr.length - 1 ? `${part.trim()} ..` : part.trim())).filter(Boolean)
      : [sideSloganAr];

  const renderCardCanvasDataUrl = async (targetSide: 'front' | 'back'): Promise<string | null> => {
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      await document.fonts.ready;
    }

    const W = 1200;
    const H = 750;
    const DPI_SCALE = 2;
    const canvas = document.createElement('canvas');
    canvas.width = W * DPI_SCALE;
    canvas.height = H * DPI_SCALE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.scale(DPI_SCALE, DPI_SCALE);

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

      const [sdgImg, avatarImg, qrImg, sigImg, stampImg, ...sealImgs] = await Promise.all([
        loadImg(centerInitiativeLogo),
        loadImg(member.avatar_url || ''),
        loadImg(exportQrUrl),
        loadImg(presidentSignatureUrl),
        loadImg(showStamp ? stampUrl : ''),
        ...displaySealLogos.map((l) => loadImg(l.logo_url))
      ]);

      // Header Right Block: Umbrella Text
      if (isDefaultUmbrella || trimmedFooterNote) {
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
          const words = trimmedFooterNote.split(/\s+/);
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
      }

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
      const titleCenterX = sdgImg ? 515 : 585;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (headerTitleAr) {
        ctx.direction = 'rtl';
        ctx.fillStyle = '#081b4b';
        ctx.font = '800 33px Cairo, sans-serif';
        ctx.fillText(headerTitleAr, titleCenterX, 48, 280);
      }

      if (headerTitleEn) {
        ctx.direction = 'ltr';
        ctx.fillStyle = '#0284c7';
        ctx.font = '800 18px Cairo, sans-serif';
        ctx.fillText(headerTitleEn, titleCenterX, 84, 280);
      }

      if (headerSubtitleAr) {
        ctx.direction = 'rtl';
        ctx.fillStyle = '#1e293b';
        ctx.font = '700 16px Cairo, sans-serif';
        ctx.fillText(headerSubtitleAr, titleCenterX, 116, 280);
      }
      ctx.restore();

      // Header Left Block: Institutional & Admin-Added Seals (wraps cleanly for any count)
      const sealCount = displaySealLogos.length;
      const sealPerRow = sealCount <= 4 ? Math.max(1, sealCount) : Math.ceil(sealCount / 2);
      const sealRows = sealCount === 0 ? 0 : Math.ceil(sealCount / sealPerRow);
      const sealSize = sealRows <= 1 ? (sealCount <= 2 ? 96 : sealCount === 3 ? 80 : 62) : Math.min(54, Math.floor(310 / sealPerRow) - 6);
      const sealGap = sealRows <= 1 ? (sealCount <= 2 ? 16 : 10) : 8;
      sealImgs.forEach((img, idx) => {
        const logoMeta = displaySealLogos[idx];
        const sizeScale = Math.min(1.12, Math.max(0.82, (logoMeta?.width_px || 42) / 42));
        const dSize = Math.round(sealSize * sizeScale);
        const rIdx = Math.floor(idx / sealPerRow);
        const cIdx = idx % sealPerRow;
        const sx = 28 + cIdx * (sealSize + sealGap);
        const sy = (sealRows <= 1 ? 22 : 14) + rIdx * (sealSize + 6) + Math.round((sealSize - dSize) / 2);
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
      if (cardBadgeAr) {
        drawGoldRibbon(ctx, 375, 184, 450, 52, cardBadgeAr, true);
      }

      // 3. Right Column: Official Stamp (when placed on right) or Initiative Emblem + Slogan (Shield & WhatsApp removed)
      ctx.save();
      const scx = 1048;

      if (showStamp && stampImg && stampPosition === 'right_center') {
        const stampR = 92;
        const stampCy = 320;
        ctx.save();
        ctx.shadowColor = 'rgba(56, 189, 248, 0.45)';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(scx, stampCy, stampR, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#fbbf24';
        ctx.stroke();
        ctx.clip();
        drawImageContain(ctx, stampImg, scx - stampR + 4, stampCy - stampR + 4, (stampR - 4) * 2, (stampR - 4) * 2);
        ctx.restore();

        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.direction = 'rtl';
        ctx.font = '800 24px Cairo, sans-serif';
        sideSloganLines.slice(0, 2).forEach((ln, idx) => {
          ctx.fillText(ln, scx, 456 + idx * 36, 224);
        });
      } else if (showStamp && stampImg && stampPosition === 'right_bottom') {
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.direction = 'rtl';
        ctx.font = '800 24px Cairo, sans-serif';
        sideSloganLines.slice(0, 2).forEach((ln, idx) => {
          ctx.fillText(ln, scx, 286 + idx * 36, 224);
        });

        const stampR = 88;
        const stampCy = 468;
        ctx.save();
        ctx.shadowColor = 'rgba(56, 189, 248, 0.45)';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(scx, stampCy, stampR, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#fbbf24';
        ctx.stroke();
        ctx.clip();
        drawImageContain(ctx, stampImg, scx - stampR + 4, stampCy - stampR + 4, (stampR - 4) * 2, (stampR - 4) * 2);
        ctx.restore();
      } else {
        if (sdgImg) {
          const emblemR = 68;
          const emblemCy = 326;
          ctx.save();
          ctx.shadowColor = 'rgba(56, 189, 248, 0.45)';
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.arc(scx, emblemCy, emblemR, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#38bdf8';
          ctx.stroke();
          ctx.clip();
          drawImageContain(ctx, sdgImg, scx - emblemR + 6, emblemCy - emblemR + 6, (emblemR - 6) * 2, (emblemR - 6) * 2);
          ctx.restore();
        }
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.direction = 'rtl';
        ctx.font = '800 25px Cairo, sans-serif';
        sideSloganLines.slice(0, 2).forEach((ln, idx) => {
          ctx.fillText(ln, scx, 442 + idx * 38, 224);
        });
      }
      ctx.restore();

      // 4. Center Column: Tabular Info Rows + Opposite Side Vice Presidents Block
      const rowLeft = 282;
      const rowRight = 900;
      const rowW = rowRight - rowLeft;
      const tagW = 205;
      const totalRows = memberRows.length;
      const maxStackH = showVpBox ? 290 : 420;
      const rowGap = Math.min(44, Math.floor(maxStackH / Math.max(1, totalRows)));
      const rowH = Math.min(38, Math.max(20, rowGap - 4));
      const startY = 250;

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
        const fontSize = Math.max(12, Math.min(21, Math.round(rowH * 0.56)));
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
        ctx.arc(rowRight - 22, ry + rowH / 2, Math.min(6, rowH * 0.18), 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'right';
        ctx.direction = 'rtl';
        const lblFontSize = Math.max(11, Math.min(18, Math.round(rowH * 0.48)));
        ctx.font = `800 ${lblFontSize}px Cairo, sans-serif`;
        ctx.fillText(row.label, rowRight - 36, ry + rowH / 2 + 1, tagW - 42);
        ctx.restore();
      });

      // Opposite Side Block: Vice Presidents Names (في الناحية الأخرى أسماء النواب)
      if (showVpBox) {
        const vpY = 554;
        const vpH = 152;
        ctx.save();
        drawRoundedRect(ctx, rowLeft, vpY, rowW, vpH, 20);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        if (vpTitleAr) {
          const vpHeaderW = 280;
          const vpHeaderH = 34;
          const vpHeaderX = rowLeft + (rowW - vpHeaderW) / 2;
          const vpHeaderY = vpY + 12;
          const vpHeaderGrad = ctx.createLinearGradient(vpHeaderX, vpHeaderY, vpHeaderX + vpHeaderW, vpHeaderY);
          vpHeaderGrad.addColorStop(0, '#0a3d91');
          vpHeaderGrad.addColorStop(1, '#04194a');
          drawRoundedRect(ctx, vpHeaderX, vpHeaderY, vpHeaderW, vpHeaderH, vpHeaderH / 2);
          ctx.fillStyle = vpHeaderGrad;
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.direction = 'rtl';
          ctx.font = '800 18px Cairo, sans-serif';
          ctx.fillText(vpTitleAr, vpHeaderX + vpHeaderW / 2, vpHeaderY + vpHeaderH / 2 + 1, vpHeaderW - 24);
        }

        const vpList = vpNamesLines.slice(0, 6);
        ctx.fillStyle = '#04133a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.direction = 'rtl';
        if (vpList.length > 0 && vpList.length <= 3) {
          const colW = rowW / vpList.length;
          ctx.font = `800 ${vpList.length <= 2 ? 22 : 20}px Cairo, sans-serif`;
          vpList.forEach((name, idx) => {
            const itemCenterX = rowRight - colW * (idx + 0.5);
            ctx.fillText(name, itemCenterX, vpY + (vpTitleAr ? 98 : 76), colW - 20);
            if (idx < vpList.length - 1) {
              ctx.fillStyle = '#cbd5e1';
              ctx.fillRect(rowRight - colW * (idx + 1), vpY + 68, 2, 58);
              ctx.fillStyle = '#04133a';
            }
          });
        } else if (vpList.length > 3) {
          const half = Math.ceil(vpList.length / 2);
          ctx.font = '800 18px Cairo, sans-serif';
          vpList.forEach((name, idx) => {
            const colIdx = Math.floor(idx / half);
            const rowIdx = idx % half;
            const xPos = colIdx === 0 ? rowLeft + rowW * 0.72 : rowLeft + rowW * 0.28;
            ctx.fillText(name, xPos, vpY + 68 + rowIdx * 28, rowW * 0.44);
          });
        }
        ctx.restore();
      }

      // 5. Left Column: Portrait -> President Name & Signature Below Portrait -> QR -> Verify Badge
      const px = 54;
      const py = 212;
      const pw = 190;
      const ph = 188;

      ctx.save();
      drawRoundedRect(ctx, px, py, pw, ph, 16);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = '#e2e8f0';
      ctx.stroke();
      ctx.clip();
      if (avatarImg) {
        drawImageCover(ctx, avatarImg, px + 4, py + 4, pw - 8, ph - 8);
      } else {
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(px, py, pw, ph);
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(px + pw / 2, py + ph * 0.36, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px + pw / 2, py + ph * 0.92, 56, Math.PI, 0, false);
        ctx.fill();
        ctx.fillStyle = '#334155';
        ctx.textAlign = 'center';
        ctx.direction = 'rtl';
        ctx.font = '800 17px Cairo, sans-serif';
        ctx.fillText('صورة العضو', px + pw / 2, py + ph - 20);
      }
      ctx.restore();

      const presBoxX = 36;
      const presBoxY = 408;
      const presBoxW = 226;
      const presBoxH = 112;
      if (showPresidentBox) {
        ctx.save();
        drawRoundedRect(ctx, presBoxX, presBoxY, presBoxW, presBoxH, 14);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fbbf24';
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.direction = 'rtl';
        if (presidentTitleAr) {
          ctx.fillStyle = '#0a3d91';
          ctx.font = '800 15px Cairo, sans-serif';
          ctx.fillText(presidentTitleAr, presBoxX + presBoxW / 2, presBoxY + 20, presBoxW - 16);
        }

        if (presidentNameAr) {
          ctx.fillStyle = '#04133a';
          ctx.font = '800 19px Cairo, sans-serif';
          ctx.fillText(presidentNameAr, presBoxX + presBoxW / 2, presBoxY + 46, presBoxW - 14);
        }

        if (sigImg) {
          drawImageContain(ctx, sigImg, presBoxX + 26, presBoxY + 58, presBoxW - 52, 46);
        } else if (presidentSignatureText || presidentNameAr) {
          const sigLabel = presidentSignatureText || presidentNameAr;
          ctx.fillStyle = '#1e3a8a';
          ctx.font = 'italic 700 16px Cairo, serif';
          ctx.fillText(sigLabel, presBoxX + presBoxW / 2, presBoxY + 76, presBoxW - 24);
          ctx.beginPath();
          ctx.moveTo(presBoxX + 42, presBoxY + 95);
          ctx.bezierCurveTo(presBoxX + 95, presBoxY + 86, presBoxX + 145, presBoxY + 102, presBoxX + presBoxW - 38, presBoxY + 90);
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#1d4ed8';
          ctx.stroke();
        }
        ctx.restore();
      }

      if (showStamp && stampImg && stampPosition === 'over_signature') {
        const scxLeft = 232;
        const scyLeft = 404;
        const sRad = 54;
        ctx.save();
        ctx.translate(scxLeft, scyLeft);
        ctx.rotate(-0.18);
        ctx.shadowColor = 'rgba(15, 23, 42, 0.35)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, sRad, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = 'rgba(30, 58, 138, 0.45)';
        ctx.stroke();
        ctx.clip();
        drawImageContain(ctx, stampImg, -sRad + 3, -sRad + 3, (sRad - 3) * 2, (sRad - 3) * 2);
        ctx.restore();
      }

      const qSize = 118;
      const qx = presBoxX + (presBoxW - qSize) / 2;
      const qy = 528;
      ctx.save();
      drawRoundedRect(ctx, qx, qy, qSize, qSize, 14);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#bae6fd';
      ctx.stroke();
      if (qrImg) {
        ctx.drawImage(qrImg, qx + 8, qy + 8, qSize - 16, qSize - 16);
      }
      ctx.restore();

      if (verifyBadgeAr) {
        const vbx = 36;
        const vby = 656;
        const vbw = 226;
        const vbh = 40;
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
        ctx.font = '700 16px Cairo, sans-serif';
        ctx.fillText(`✓  ${verifyBadgeAr}`, vbx + vbw / 2, vby + vbh / 2 + 1, vbw - 18);
        ctx.restore();
      }
    } else {
      // BACK SIDE
      const [sdgImg, backStampImg, ...partnerImgs] = await Promise.all([
        loadImg(backCenterInitiativeLogo),
        loadImg(showStamp && stampPosition === 'back_left' ? stampUrl : ''),
        ...displayBackLogos.map((l) => loadImg(l.logo_url))
      ]);

      if (backTitleAr) {
        drawGoldRibbon(ctx, 210, 34, 780, 54, backTitleAr, true);
      }

      const count = displayBackLogos.length;
      const maxPerRow = count <= 6 ? count : count <= 12 ? Math.ceil(count / 2) : count <= 18 ? Math.ceil(count / 3) : Math.ceil(count / 4);
      const cols = Math.max(1, maxPerRow);
      const rows = Math.max(1, Math.ceil(count / cols));
      const gapX = count <= 5 ? 26 : count <= 12 ? 18 : 14;
      const gapY = rows === 1 ? 0 : rows === 2 ? 18 : 12;
      const areaW = W - 96;
      const areaH = 344;
      const topCardY = 108;

      const slotW = Math.min(rows === 1 && cols <= 3 ? 250 : 210, Math.floor((areaW - (cols - 1) * gapX) / cols));
      const slotH = Math.min(rows === 1 ? 290 : 190, Math.floor((areaH - (rows - 1) * gapY) / rows));
      const totalGridH = rows * slotH + (rows - 1) * gapY;
      const startGridY = topCardY + Math.max(0, Math.floor((areaH - totalGridH) / 2));

      displayBackLogos.forEach((logo, idx) => {
        const rowIdx = Math.floor(idx / cols);
        const colIdx = idx % cols;
        const itemsInThisRow = rowIdx < rows - 1 ? cols : count - rowIdx * cols;
        const rowW = itemsInThisRow * slotW + (itemsInThisRow - 1) * gapX;
        const startX = (W - rowW) / 2;
        const cx = startX + colIdx * (slotW + gapX);
        const cy = startGridY + rowIdx * (slotH + gapY);

        const img = partnerImgs[idx];
        if (img) {
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
          ctx.shadowBlur = 12;
          ctx.shadowOffsetY = 3;
          const sizeScale = Math.min(1.12, Math.max(0.78, (logo.width_px || 48) / 48));
          const drawW = Math.min(slotW, Math.round(slotW * sizeScale));
          const drawH = Math.min(slotH, Math.round(slotH * sizeScale));
          const dx = cx + (slotW - drawW) / 2;
          const dy = cy + (slotH - drawH) / 2;
          drawImageContain(ctx, img, dx, dy, drawW, drawH);
          ctx.restore();
        }
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
      const backTitleCenterX = sdgImg ? 510 : 590;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (headerTitleAr) {
        ctx.direction = 'rtl';
        ctx.fillStyle = textColor;
        ctx.font = '800 38px Cairo, sans-serif';
        ctx.fillText(headerTitleAr, backTitleCenterX, 535, 300);
      }

      if (headerTitleEn) {
        ctx.direction = 'ltr';
        ctx.fillStyle = '#67e8f9';
        ctx.font = '800 19px Cairo, sans-serif';
        ctx.fillText(headerTitleEn, backTitleCenterX, 578, 300);
      }
      ctx.restore();

      if (backSloganAr) {
        drawGoldRibbon(ctx, 295, 646, 610, 52, backSloganAr, false);
      }

      if (showStamp && backStampImg && stampPosition === 'back_left') {
        const bsx = 128;
        const bsy = 618;
        const bsr = 68;
        ctx.save();
        ctx.shadowColor = 'rgba(15, 23, 42, 0.4)';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(bsx, bsy, bsr, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#fbbf24';
        ctx.stroke();
        ctx.clip();
        drawImageContain(ctx, backStampImg, bsx - bsr + 4, bsy - bsr + 4, (bsr - 4) * 2, (bsr - 4) * 2);
        ctx.restore();
      }

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
      trackEvent('card_png_download', { side: targetSide, member_number: member.member_number });
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

      const cardW = 85.6;
      const cardH = 54;

      const drawCropMarks = (doc: jsPDF, x: number, y: number, w: number, h: number) => {
        const m = 4;
        const offset = 1.5;
        doc.setDrawColor(100, 116, 139);
        doc.setLineWidth(0.25);
        // Top-left
        doc.line(x - offset - m, y, x - offset, y);
        doc.line(x, y - offset - m, x, y - offset);
        // Top-right
        doc.line(x + w + offset, y, x + w + offset + m, y);
        doc.line(x + w, y - offset - m, x + w, y - offset);
        // Bottom-left
        doc.line(x - offset - m, y + h, x - offset, y + h);
        doc.line(x, y + h + offset, x, y + h + offset + m);
        // Bottom-right
        doc.line(x + w + offset, y + h, x + w + offset + m, y + h);
        doc.line(x + w, y + h + offset, x + w, y + h + offset + m);
      };

      // Page 1: True-to-scale 1:1 A4 Print & Cut Sheet (CR80 85.6 x 54 mm for Lanyard ID Holder)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      pdf.setFillColor(10, 25, 47);
      pdf.rect(0, 0, pageWidth, 22, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(12);
      pdf.text('SAFE DIGITAL GENERATION — OFFICIAL ID BADGE (CR80 1:1)', pageWidth / 2, 9.5, { align: 'center' });
      pdf.setFontSize(8.5);
      pdf.setTextColor(56, 189, 248);
      pdf.text(
        `Member: ${member.member_number}  |  Card: ${member.card_number}  |  Print at 100% Scale (85.6 x 54 mm)`,
        pageWidth / 2,
        16,
        { align: 'center' }
      );

      const x = (pageWidth - cardW) / 2;
      const frontY = 38;
      const backY = 108;
      const foldFrontY = 186;
      const foldBackY = foldFrontY + cardH;

      pdf.setTextColor(51, 65, 85);
      pdf.setFontSize(8.5);
      pdf.text('FRONT SIDE — 85.6 x 54 mm (Cut along marks)', x, frontY - 3);
      pdf.addImage(frontDataUrl, 'PNG', x, frontY, cardW, cardH, undefined, 'FAST');
      drawCropMarks(pdf, x, frontY, cardW, cardH);

      pdf.text('BACK SIDE — 85.6 x 54 mm (Cut along marks)', x, backY - 3);
      pdf.addImage(backDataUrl, 'PNG', x, backY, cardW, cardH, undefined, 'FAST');
      drawCropMarks(pdf, x, backY, cardW, cardH);

      // Fold-over pair for effortless instant ID lanyard sleeve insert
      pdf.text('FOLD & INSERT INTO ID HOLDER (Back-to-Back 85.6 x 54 mm)', x, foldFrontY - 3);
      pdf.addImage(frontDataUrl, 'PNG', x, foldFrontY, cardW, cardH, undefined, 'FAST');
      pdf.addImage(backDataUrl, 'PNG', x, foldBackY, cardW, cardH, undefined, 'FAST');
      drawCropMarks(pdf, x, foldFrontY, cardW, cardH * 2);
      pdf.setDrawColor(148, 163, 184);
      pdf.setLineWidth(0.2);
      pdf.line(x - 3, foldBackY, x + cardW + 3, foldBackY);

      pdf.setFontSize(7.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text(
        'Print Page 1 at 100% Actual Size for lanyard ID pouch · Pages 2-3 are direct 85.6x54mm PVC printer pages',
        pageWidth / 2,
        290,
        { align: 'center' }
      );

      // Pages 2 & 3: Direct edge-to-edge CR80 (85.6 x 54 mm) for PVC Card Printers
      pdf.addPage([cardW, cardH], 'landscape');
      pdf.addImage(frontDataUrl, 'PNG', 0, 0, cardW, cardH, undefined, 'FAST');
      pdf.addPage([cardW, cardH], 'landscape');
      pdf.addImage(backDataUrl, 'PNG', 0, 0, cardW, cardH, undefined, 'FAST');

      pdf.save(`SDG-ID-Card-${member.member_number}.pdf`);
      trackEvent('card_pdf_download', { member_number: member.member_number, card_number: member.card_number });
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
      className="print-id-card relative w-full max-w-[540px] aspect-[85.6/54] min-h-[330px] rounded-xl overflow-hidden shadow-xl border border-cyan-300/40 select-none flex flex-col"
    >
      {circuitSvg}
      {/* Sweeping Gold & Cyan Bottom Corner Ribbons matching reference mockup */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1200 750"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 w-full h-full z-0"
      >
        <defs>
          <linearGradient id="sdgCornerGold" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ca8a04" />
            <stop offset="45%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>
        <path d="M0,590 C130,680 280,720 430,750 L0,750 Z" fill="rgba(14,116,144,0.35)" />
        <path d="M0,625 C120,695 250,730 380,750 L0,750 Z" fill="url(#sdgCornerGold)" opacity="0.88" />
        <path d="M1200,590 C1070,680 920,720 770,750 L1200,750 Z" fill="rgba(14,116,144,0.35)" />
        <path d="M1200,625 C1080,695 950,730 820,750 L1200,750 Z" fill="url(#sdgCornerGold)" opacity="0.88" />
      </svg>

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
            ) : trimmedFooterNote ? (
              <p className="text-[7px] sm:text-[8.5px] font-bold leading-snug line-clamp-4">{trimmedFooterNote}</p>
            ) : null}
          </div>

          {/* Center Zone: Emblem + Bilingual Title */}
          <div className="col-span-5 flex items-center justify-center gap-1.5 sm:gap-2">
            {centerInitiativeLogo && (
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white shadow-sm border border-sky-200 p-0.5 shrink-0 overflow-hidden flex items-center justify-center">
                <SafeImage src={centerInitiativeLogo} alt={headerTitleAr || 'شعار المبادرة'} className="w-full h-full object-contain rounded-full" />
              </div>
            )}
            <div className="text-center min-w-0">
              {headerTitleAr && (
                <p className="text-[11px] sm:text-[14.5px] font-black text-[#04133a] font-display leading-tight">
                  {headerTitleAr}
                </p>
              )}
              {headerTitleEn && (
                <p className="text-[6px] sm:text-[7.5px] font-extrabold tracking-tight text-sky-700 uppercase mt-0.5">
                  {headerTitleEn}
                </p>
              )}
              {headerSubtitleAr && (
                <p className="text-[6.5px] sm:text-[8px] font-bold text-slate-800">
                  {headerSubtitleAr}
                </p>
              )}
            </div>
          </div>

          {/* Left Zone: Institutional & Added Front Seals */}
          <div className="col-span-3 flex items-center justify-end gap-1 flex-wrap">
            {displaySealLogos.map((logo) => {
              const scale = Math.min(1.15, Math.max(0.82, (logo.width_px || 42) / 42));
              const basePx =
                displaySealLogos.length > 5 ? 20 : displaySealLogos.length > 3 ? 25 : displaySealLogos.length > 2 ? 28 : 36;
              const pxSize = Math.round(basePx * scale);
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
      {cardBadgeAr ? (
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
      ) : (
        <div className="mb-1.5" />
      )}

      {/* Main 3-Column Body */}
      <div className="relative z-10 flex-1 px-2.5 sm:px-3.5 pb-2.5 grid grid-cols-[19%_1fr_24%] gap-2 items-stretch">
        {/* Right Column: Official Stamp (if right) or Initiative Emblem + Slogan */}
        <div className="flex flex-col items-center justify-center gap-2 pt-1 pb-2">
          {showStamp && stampPosition === 'right_center' && (
            <div className="w-16 h-16 sm:w-[82px] sm:h-[82px] rounded-full bg-white p-0.5 sm:p-1 border-2 border-amber-300 shadow-[0_0_16px_rgba(56,189,248,0.4)] overflow-hidden flex items-center justify-center shrink-0">
              <SafeImage src={stampUrl} alt="الختم الرسمي للمبادرة" className="w-full h-full object-contain rounded-full" />
            </div>
          )}

          {centerInitiativeLogo && (!showStamp || (stampPosition !== 'right_center' && stampPosition !== 'right_bottom')) && (
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white p-1 border-2 border-cyan-300 shadow-[0_0_16px_rgba(56,189,248,0.4)] overflow-hidden flex items-center justify-center shrink-0">
              <SafeImage src={centerInitiativeLogo} alt={headerTitleAr || 'شعار المبادرة'} className="w-full h-full object-contain rounded-full" />
            </div>
          )}

          {sideSloganLines.length > 0 && (
            <div className="leading-snug font-black text-[7.5px] sm:text-[9.5px] text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
              {sideSloganLines.map((ln, idx) => (
                <p key={idx}>{ln}</p>
              ))}
            </div>
          )}

          {showStamp && stampPosition === 'right_bottom' && (
            <div className="w-16 h-16 sm:w-[80px] sm:h-[80px] rounded-full bg-white p-0.5 sm:p-1 border-2 border-amber-300 shadow-[0_0_16px_rgba(56,189,248,0.4)] overflow-hidden flex items-center justify-center shrink-0">
              <SafeImage src={stampUrl} alt="الختم الرسمي للمبادرة" className="w-full h-full object-contain rounded-full" />
            </div>
          )}
        </div>

        {/* Center Column: Tabular Info Rows + Opposite Side Vice Presidents Box */}
        <div className="flex flex-col justify-between min-w-0 gap-1.5">
          <div className="space-y-0.5 sm:space-y-1">
            {memberRows.map((row, idx) => {
              const Icon = row.icon;
              return (
                <div
                  key={`${row.label}-${idx}`}
                  className={`flex items-stretch ${memberRows.length > 8 ? 'min-h-[15px]' : 'min-h-[17px] sm:min-h-[20px]'} rounded-full overflow-hidden shadow-sm border border-white bg-white`}
                >
                  <div className="min-w-[66px] sm:min-w-[84px] shrink-0 flex items-center gap-1 px-1.5 sm:px-2 bg-gradient-to-l from-[#04194a] to-[#0b439c] text-white rounded-full">
                    <Icon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-cyan-200 shrink-0" />
                    <span className="text-[7px] sm:text-[8.5px] font-bold whitespace-nowrap">{row.label}</span>
                  </div>
                  <div className="flex-1 min-w-0 flex items-center justify-center px-1.5 py-0.5 text-[#04133a]">
                    <span
                      className={`${memberRows.length > 8 ? 'text-[6.5px] sm:text-[7.5px]' : compactRows ? 'text-[7px] sm:text-[8.5px]' : 'text-[7.5px] sm:text-[9px]'} font-black leading-tight text-center break-words ${row.mono ? 'font-mono-num' : ''}`}
                      dir={row.mono ? 'ltr' : 'rtl'}
                    >
                      {row.value || '—'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Opposite Side: Vice Presidents Names Box */}
          {showVpBox && (
            <div className="rounded-lg bg-white/95 border border-white shadow-inner px-2 py-1.5 text-[#04133a] flex flex-col items-center gap-1">
              {vpTitleAr && (
                <span className="px-3 py-0.5 rounded-full bg-gradient-to-l from-[#04194a] to-[#0a3d91] text-white text-[7px] sm:text-[8.5px] font-black leading-tight">
                  {vpTitleAr}
                </span>
              )}
              {vpNamesLines.length > 0 && (
                <div
                  className={`w-full grid ${
                    vpNamesLines.length <= 1
                      ? 'grid-cols-1'
                      : vpNamesLines.length === 2
                        ? 'grid-cols-2 divide-x divide-x-reverse divide-slate-300'
                        : vpNamesLines.length === 3
                          ? 'grid-cols-3 divide-x divide-x-reverse divide-slate-300'
                          : 'grid-cols-2 gap-x-2'
                  } text-center items-center`}
                >
                  {vpNamesLines.slice(0, 6).map((name, idx) => (
                    <p key={idx} className="text-[6.5px] sm:text-[8px] font-extrabold px-1 leading-snug truncate">
                      {name}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Left Column: Portrait -> President Name & Signature Under Photo -> QR -> Verify */}
        <div className="flex flex-col items-center justify-between gap-1">
          <div className="relative w-full flex flex-col items-center gap-1">
            <div className="relative w-full max-w-[68px] sm:max-w-[82px] aspect-[4/4.2] rounded-lg overflow-hidden bg-slate-100 border-2 border-white shadow-md">
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
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-300/80 flex items-center justify-center mb-0.5">
                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />
                  </div>
                  <span className="text-[7px] sm:text-[8px] font-extrabold text-slate-700 leading-tight">صورة الشخص</span>
                </div>
              )}
              {member.card_status === 'suspended' && (
                <div className="absolute inset-x-0 bottom-0 bg-red-700/90 text-white text-[6.5px] font-bold text-center py-0.5">
                  عضوية موقوفة
                </div>
              )}
            </div>

            {/* President Name + Signature directly under Photo */}
            {showPresidentBox && (
              <div className="w-full rounded-md bg-white/95 border border-amber-400 shadow-sm px-1.5 py-0.5 text-center leading-tight">
                {presidentTitleAr && <p className="text-[6px] sm:text-[7px] font-extrabold text-[#0a3d91]">{presidentTitleAr}</p>}
                {presidentNameAr && <p className="text-[7px] sm:text-[8.5px] font-black text-[#04133a] truncate">{presidentNameAr}</p>}
                {presidentSignatureUrl ? (
                  <img src={presidentSignatureUrl} alt="إمضاء رئيس المبادرة" className="h-3.5 sm:h-4.5 mx-auto object-contain mt-0.5" />
                ) : (presidentSignatureText || presidentNameAr) ? (
                  <div className="flex flex-col items-center">
                    <span className="text-[6px] sm:text-[7.5px] italic font-bold text-blue-900 leading-none mt-0.5">
                      {presidentSignatureText || presidentNameAr}
                    </span>
                    <svg viewBox="0 0 80 10" className="w-10 sm:w-12 h-1.5 text-blue-700">
                      <path d="M4,6 Q28,1 48,6 T76,4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </div>
                ) : null}
              </div>
            )}

            {showStamp && stampPosition === 'over_signature' && (
              <div className="pointer-events-none absolute -right-1 top-[43%] z-20 w-12 h-12 sm:w-[56px] sm:h-[56px] rounded-full bg-white/95 p-0.5 border border-blue-900/40 shadow-md -rotate-12 overflow-hidden flex items-center justify-center">
                <SafeImage src={stampUrl} alt="الختم الرسمي" className="w-full h-full object-contain rounded-full" />
              </div>
            )}
          </div>

          <a
            href={verifyPath}
            target="_blank"
            rel="noopener noreferrer"
            title="فتح صفحة التحقق الرقمي"
            className="bg-white p-0.5 sm:p-1 rounded-md shadow border border-sky-200 hover:border-cyan-400 transition-colors"
          >
            {effectiveQrDataUrl ? (
              <img src={effectiveQrDataUrl} alt="QR Verification" className="w-9 h-9 sm:w-11 sm:h-11 object-contain" />
            ) : (
              <div className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center text-slate-500">
                <QrCode className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
            )}
          </a>

          {verifyBadgeAr && (
            <a
              href={verifyPath}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full rounded-full bg-[#061a44] hover:bg-[#0b2a6b] border border-sky-200/80 px-1.5 py-0.5 sm:py-1 flex items-center justify-center gap-1 text-white shadow transition-colors"
            >
              <CheckCircle2 className="w-2.5 h-2.5 text-cyan-300 shrink-0" />
              <span className="text-[6px] sm:text-[7.5px] font-bold whitespace-nowrap">{verifyBadgeAr}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );

  const backCount = displayBackLogos.length;
  const backLayoutClass =
    backCount <= 5
      ? 'flex flex-wrap items-center justify-center gap-3 sm:gap-4'
      : backCount <= 12
        ? 'grid grid-cols-6 gap-2 sm:gap-2.5 place-items-center'
        : backCount <= 18
          ? 'grid grid-cols-6 gap-1.5 sm:gap-2 place-items-center'
          : 'grid grid-cols-8 gap-1.5 place-items-center';

  const backLogoSizeClass =
    backCount <= 3
      ? 'h-20 sm:h-24 w-24 sm:w-28'
      : backCount <= 5
        ? 'h-16 sm:h-20 w-16 sm:w-20'
        : backCount <= 12
          ? 'h-12 sm:h-14 w-full'
          : backCount <= 18
            ? 'h-9 sm:h-11 w-full'
            : 'h-8 sm:h-9 w-full';

  const BackCard = (
    <div
      dir="rtl"
      style={{
        background: `radial-gradient(circle at 50% 45%, rgba(56,189,248,0.22) 0%, transparent 65%), linear-gradient(135deg, ${backBg} 0%, #0a3480 52%, #04133a 100%)`,
        color: textColor
      }}
      className="print-id-card relative w-full max-w-[540px] aspect-[85.6/54] min-h-[330px] rounded-xl overflow-hidden shadow-xl border border-cyan-300/40 select-none flex flex-col justify-between"
    >
      {circuitSvg}

      {/* Top Gold Metallic Banner */}
      {backTitleAr ? (
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
      ) : (
        <div className="pt-2" />
      )}

      {/* Partner Logos Grid / Row (Logos Only — No White Boxes) */}
      <div className={`relative z-10 px-3 sm:px-5 py-2 flex-1 min-h-[140px] content-center ${backLayoutClass}`}>
        {displayBackLogos.map((logo) => (
          <div
            key={logo.id}
            title={logo.name}
            className={`${backLogoSizeClass} flex items-center justify-center`}
          >
            <SafeImage
              src={logo.logo_url}
              alt={logo.name}
              className="max-h-full max-w-full object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
            />
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
          {backCenterInitiativeLogo && (
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white p-0.5 border border-cyan-300 shadow overflow-hidden shrink-0">
              <SafeImage src={backCenterInitiativeLogo} alt={headerTitleAr || 'شعار المبادرة'} className="w-full h-full object-contain rounded-full" />
            </div>
          )}
          {(headerTitleAr || headerTitleEn) && (
            <div className="text-center">
              {headerTitleAr && (
                <p className="text-xs sm:text-sm font-black text-white font-display leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {headerTitleAr}
                </p>
              )}
              {headerTitleEn && (
                <p className="text-[6.5px] sm:text-[8px] font-extrabold text-cyan-300 tracking-wider uppercase mt-0.5 drop-shadow">
                  {headerTitleEn}
                </p>
              )}
            </div>
          )}
        </div>

        {backSloganAr && (
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
        )}

        {showStamp && stampPosition === 'back_left' && (
          <div className="absolute left-4 bottom-7 z-10 w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white p-0.5 border-2 border-amber-300 shadow-lg overflow-hidden flex items-center justify-center">
            <SafeImage src={stampUrl} alt="الختم الرسمي" className="w-full h-full object-contain rounded-full" />
          </div>
        )}

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
              <span>{exporting ? 'جارٍ التجهيز...' : 'تحميل للطباعة PDF (مقاس ID)'}</span>
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
