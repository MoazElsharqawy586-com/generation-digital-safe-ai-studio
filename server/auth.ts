import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { NextFunction, Request, Response } from 'express';
import { db } from './db.ts';

const SECRET_FILE = path.resolve(process.cwd(), 'data', '.session_secret');

function getSessionSecret(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16) {
    return process.env.SESSION_SECRET;
  }
  if (fs.existsSync(SECRET_FILE)) {
    return fs.readFileSync(SECRET_FILE, 'utf8').trim();
  }
  const secret = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(SECRET_FILE, secret, { mode: 0o600 });
  return secret;
}

const SESSION_SECRET = getSessionSecret();
export const SESSION_COOKIE_NAME = 'sdg_session';

export const PERMISSION_GROUPS = [
  {
    id: 'admins_group',
    title_ar: 'صلاحيات المسؤولين والمشرفين',
    items: [
      { key: 'admins', label_ar: 'عرض قائمة المسؤولين والصلاحيات' },
      { key: 'admins:create', label_ar: 'إضافة / ترقية مسؤولين جدد' },
      { key: 'admins:edit', label_ar: 'تعديل بيانات وأدوار وكلمات مرور المسؤولين' },
      { key: 'admins:delete', label_ar: 'حذف / إيقاف حسابات المسؤولين' }
    ]
  },
  {
    id: 'members_group',
    title_ar: 'صلاحيات المستخدمين والأعضاء',
    items: [
      { key: 'members', label_ar: 'عرض قائمة الأعضاء' },
      { key: 'members:create', label_ar: 'إضافة عضو / مستخدم جديد' },
      { key: 'members:edit', label_ar: 'تعديل بيانات الأعضاء وتفعيل كلمات المرور' },
      { key: 'members:delete', label_ar: 'حذف الأعضاء' }
    ]
  },
  {
    id: 'membership_group',
    title_ar: 'طلبات الانضمام والكارنيهات',
    items: [
      { key: 'applications', label_ar: 'مراجعة طلبات العضوية وإدارة أسئلة الانضمام' },
      { key: 'cards', label_ar: 'إصدار وتصميم الكارنيهات الإلكترونية' }
    ]
  },
  {
    id: 'content_group',
    title_ar: 'المحتوى الإعلامي واللجان والفعاليات',
    items: [
      { key: 'dashboard', label_ar: 'عرض لوحة الإحصائيات العامة' },
      { key: 'leadership', label_ar: 'إدارة القيادات والهيكل التنظيمي' },
      { key: 'committees', label_ar: 'إدارة اللجان التخصصية' },
      { key: 'news', label_ar: 'إدارة الأخبار والبيانات الإعلامية' },
      { key: 'events', label_ar: 'إدارة الأنشطة والفعاليات' },
      { key: 'projects', label_ar: 'إدارة المبادرات والمشروعات' },
      { key: 'media', label_ar: 'إدارة معرض الصور والفيديوهات' },
      { key: 'partners', label_ar: 'إدارة الشركاء والشريط المتحرك' }
    ]
  },
  {
    id: 'academy_settings_group',
    title_ar: 'التدريب والشهادات والإعدادات',
    items: [
      { key: 'trainings', label_ar: 'إدارة البرامج التدريبية' },
      { key: 'certificates', label_ar: 'إصدار الشهادات الإلكترونية' },
      { key: 'library', label_ar: 'إدارة المكتبة الرقمية' },
      { key: 'contacts', label_ar: 'إدارة رسائل تواصل معنا' },
      { key: 'logos', label_ar: 'إدارة الشعارات والهوية البصرية' },
      { key: 'settings', label_ar: 'إعدادات الموقع والهوية البصرية و SEO' },
      { key: 'audit', label_ar: 'عرض سجل التدقيق والعمليات' }
    ]
  }
];

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['*'],
  admin: [
    'dashboard',
    'members',
    'members:create',
    'members:edit',
    'members:delete',
    'applications',
    'cards',
    'leadership',
    'committees',
    'news',
    'events',
    'trainings',
    'projects',
    'media',
    'certificates',
    'partners',
    'library',
    'contacts',
    'logos',
    'settings',
    'admins',
    'admins:create',
    'admins:edit',
    'admins:delete',
    'audit'
  ],
  membership_manager: ['dashboard', 'members', 'members:create', 'members:edit', 'applications', 'cards', 'committees:read'],
  media_manager: ['dashboard', 'news', 'media', 'partners', 'logos', 'events:read'],
  training_manager: ['dashboard', 'trainings', 'certificates', 'library'],
  committee_manager: ['dashboard', 'committees', 'leadership', 'events', 'members:read'],
  content_editor: ['dashboard', 'news', 'projects', 'library', 'events']
};

export interface SessionPayload {
  userId: number;
  email: string;
  name: string;
  role: string;
  adminRole?: string;
  permissions: string[];
  exp: number;
}

export interface AuthedRequest extends Request {
  user?: SessionPayload;
}

export function signSession(payload: Omit<SessionPayload, 'exp'>): string {
  const full: SessionPayload = {
    ...payload,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7 // 7 days
  };
  const encoded = Buffer.from(JSON.stringify(full)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySession(token: string | undefined): SessionPayload | null {
  if (!token || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionPayload;
    if (!parsed.exp || Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getFreshUserSession(userId: number): SessionPayload | null {
  const user = db
    .prepare('SELECT id, name, email, role, status FROM users WHERE id = ?')
    .get(userId) as { id: number; name: string; email: string; role: string; status: string } | undefined;
  if (!user || user.status !== 'active') return null;

  const admin = db
    .prepare('SELECT role, permissions_json FROM admins WHERE user_id = ?')
    .get(user.id) as { role: string; permissions_json: string } | undefined;

  let perms: string[] = [];
  if (admin) {
    if (admin.role === 'super_admin') {
      perms = ['*'];
    } else {
      try {
        const custom = JSON.parse(admin.permissions_json || '[]');
        perms = Array.isArray(custom) ? custom : ROLE_PERMISSIONS[admin.role] || [];
      } catch {
        perms = ROLE_PERMISSIONS[admin.role] || [];
      }
    }
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    adminRole: admin?.role,
    permissions: perms,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7
  };
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const bearer = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7).trim() : undefined;
  const token = bearer || req.cookies?.[SESSION_COOKIE_NAME];
  const payload = verifySession(token);
  if (!payload) {
    res.status(401).json({ error: 'يجب تسجيل الدخول للوصول إلى هذا المورد' });
    return;
  }
  const fresh = getFreshUserSession(payload.userId);
  if (!fresh) {
    res.status(401).json({ error: 'الحساب غير نشط أو غير موجود' });
    return;
  }
  req.user = fresh;
  next();
}

export function requireSuperAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'غير مصرح' });
    return;
  }
  if (req.user.adminRole !== 'super_admin') {
    res.status(403).json({ error: 'هذا الإجراء مقتصر على المسؤول الرئيسي (Super Admin) فقط' });
    return;
  }
  next();
}

export function requirePermission(permission: string) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'غير مصرح' });
      return;
    }
    if (!req.user.adminRole) {
      res.status(403).json({ error: 'هذا المسار مخصص للمشرفين فقط' });
      return;
    }
    const perms = req.user.permissions || [];
    if (
      perms.includes('*') ||
      perms.includes(permission) ||
      (permission.endsWith(':read') && perms.includes(permission.replace(':read', '')))
    ) {
      next();
      return;
    }
    res.status(403).json({ error: 'ليس لديك صلاحية تنفيذ هذا الإجراء' });
  };
}

export function requireAnyPermission(allowed: string[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'غير مصرح' });
      return;
    }
    if (!req.user.adminRole) {
      res.status(403).json({ error: 'هذا المسار مخصص للمشرفين فقط' });
      return;
    }
    const perms = req.user.permissions || [];
    if (perms.includes('*') || allowed.some((p) => perms.includes(p))) {
      next();
      return;
    }
    res.status(403).json({ error: 'ليس لديك صلاحية تنفيذ هذا الإجراء' });
  };
}

export function logAudit(
  req: AuthedRequest,
  action: string,
  entityType: string,
  entityId: string | number | bigint = '',
  details: Record<string, unknown> = {}
) {
  try {
    db.prepare(
      `INSERT INTO audit_logs (admin_user_id, admin_email, action, entity_type, entity_id, details_json, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      req.user?.userId || null,
      req.user?.email || 'system',
      action,
      entityType,
      String(entityId),
      JSON.stringify(details),
      req.ip || req.socket?.remoteAddress || ''
    );
  } catch (err) {
    console.error('Audit log error:', err);
  }
}
