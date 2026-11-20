import express from 'express';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import { db, initDatabase, generateSafeCode, generateNextMemberNumber } from './server/db.ts';
import {
  type AuthedRequest,
  SESSION_COOKIE_NAME,
  getFreshUserSession,
  requireAuth,
  signSession,
  verifySession
} from './server/auth.ts';
import adminRoutes from './server/routes-admin.ts';
import {
  buildRobotsTxt,
  buildSitemapIndexXml,
  buildSitemapXml,
  buildSsrFallbackHtml,
  getSettingsMap,
  guessImageMime,
  resolveBaseUrl,
  syncPublicSeoFiles,
  toPublicUrl
} from './server/seo.ts';

initDatabase();

const app = express();
const distIndexPath = path.resolve(process.cwd(), 'dist', 'index.html');
const isProd =
  process.env.NODE_ENV === 'production' ||
  process.env.npm_lifecycle_event === 'start' ||
  (process.env.NODE_ENV !== 'development' && fs.existsSync(distIndexPath));
const PORT = isProd ? Number(process.env.PORT) || 3000 : 3000;

app.set('trust proxy', 1);
app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get(['/health', '/api/health'], (_req, res) => {
  res.status(200).json({ ok: true });
});

// Serve uploaded assets permanently from disk
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Public application upload (avatar & CV)
const publicUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, file, cb) => {
      const sub = file.mimetype === 'application/pdf' ? 'documents' : 'avatars';
      cb(null, path.resolve(process.cwd(), 'uploads', sub));
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '') || '.bin';
      cb(null, `app_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`);
    }
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    cb(null, allowed.includes(file.mimetype));
  }
});

// ==================== AUTH ROUTES ====================
function getCookieOptions(req: express.Request) {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || isProd;
  return {
    httpOnly: true,
    sameSite: (isHttps ? 'none' : 'lax') as 'none' | 'lax',
    secure: isHttps,
    maxAge: 7 * 24 * 60 * 60 * 1000
  };
}

app.get('/api/auth/setup-status', (_req, res) => {
  const count = (db.prepare("SELECT COUNT(*) as c FROM admins WHERE role = 'super_admin'").get() as { c: number }).c;
  res.json({
    needsAdminSetup: count === 0,
    officialAdminEmail: 'generationdigitalsafe@gmail.com'
  });
});

app.post('/api/auth/bootstrap-admin', (req, res) => {
  const existingCount = (db.prepare("SELECT COUNT(*) as c FROM admins WHERE role = 'super_admin'").get() as { c: number }).c;
  if (existingCount > 0) {
    res.status(403).json({ error: 'تم إعداد حساب المدير العام مسبقًا' });
    return;
  }
  const { email, password, name } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (normalizedEmail !== 'generationdigitalsafe@gmail.com') {
    res.status(403).json({ error: 'يجب استخدام البريد الإداري الرسمي للمبادرة: generationdigitalsafe@gmail.com' });
    return;
  }
  if (!password || String(password).length < 8) {
    res.status(400).json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' });
    return;
  }
  const hash = bcrypt.hashSync(String(password), 12);
  const u = db
    .prepare('INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)')
    .run(name || 'المدير العام — جيل رقمي آمن', normalizedEmail, hash, 'super_admin', 'active');
  db.prepare('INSERT INTO admins (user_id, role, permissions_json, title_ar) VALUES (?, ?, ?, ?)').run(
    u.lastInsertRowid,
    'super_admin',
    JSON.stringify(['*']),
    'المشرف العام للمبادرة'
  );
  const session = getFreshUserSession(Number(u.lastInsertRowid))!;
  const token = signSession(session);
  res.cookie(SESSION_COOKIE_NAME, token, getCookieOptions(req));
  res.json({ user: session, token });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const normalized = String(email || '').trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalized) as any;
  if (!user || !bcrypt.compareSync(String(password || ''), user.password_hash)) {
    res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    return;
  }
  if (user.status !== 'active') {
    res.status(403).json({ error: 'هذا الحساب موقوف حاليًا' });
    return;
  }
  const session = getFreshUserSession(user.id);
  if (!session) {
    res.status(401).json({ error: 'تعذر تحميل الجلسة' });
    return;
  }
  const token = signSession(session);
  res.cookie(SESSION_COOKIE_NAME, token, getCookieOptions(req));
  res.json({ user: session, token });
});

// Public registration strictly creates 'member' role — NEVER admin!
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || String(password).length < 8) {
    res.status(400).json({ error: 'الاسم والبريد الإلكتروني وكلمة مرور (8 أحرف على الأقل) مطلوبة' });
    return;
  }
  const normalized = String(email).trim().toLowerCase();
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(normalized)) {
    res.status(400).json({ error: 'البريد الإلكتروني مسجل بالفعل' });
    return;
  }
  const hash = bcrypt.hashSync(String(password), 12);
  const info = db
    .prepare("INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, 'member', 'active')")
    .run(String(name).trim(), normalized, hash);

  // Link if an approved member already matches this email
  db.prepare('UPDATE members SET user_id = ? WHERE lower(email) = ? AND user_id IS NULL').run(info.lastInsertRowid, normalized);

  const session = getFreshUserSession(Number(info.lastInsertRowid))!;
  const token = signSession(session);
  res.cookie(SESSION_COOKIE_NAME, token, getCookieOptions(req));
  res.json({ user: session, token });
});

app.post('/api/auth/logout', (req, res) => {
  const opts = getCookieOptions(req);
  res.clearCookie(SESSION_COOKIE_NAME, { httpOnly: opts.httpOnly, sameSite: opts.sameSite, secure: opts.secure });
  res.json({ success: true });
});

// Public member account password activation (verifies email + phone or member_number or application_number)
app.post('/api/auth/activate-member-account', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const identifier = String(req.body.identifier || req.body.verify_value || '').trim();
  const password = String(req.body.password || '');

  if (!email || !identifier || password.length < 8) {
    res.status(400).json({ error: 'البريد الإلكتروني ورقم الهاتف أو العضوية وكلمة مرور (8 أحرف على الأقل) مطلوبة' });
    return;
  }

  let member = db
    .prepare(
      `SELECT * FROM members
       WHERE lower(email) = lower(?) AND (phone = ? OR upper(member_number) = upper(?))`
    )
    .get(email, identifier, identifier) as any;

  // Also check accepted/submitted application by application_number or phone
  if (!member) {
    const appRow = db
      .prepare(
        `SELECT * FROM membership_applications
         WHERE lower(email) = lower(?) AND (phone = ? OR upper(application_number) = upper(?))
         ORDER BY id DESC LIMIT 1`
      )
      .get(email, identifier, identifier) as any;

    if (appRow) {
      member = db
        .prepare("SELECT * FROM members WHERE lower(email) = lower(?) OR (phone = ? AND phone != '') LIMIT 1")
        .get(appRow.email, appRow.phone) as any;
    }
  }

  if (!member) {
    res.status(404).json({ error: 'لم يتم العثور على سجل عضوية مطابق للبريد الإلكتروني ورقم الهاتف/العضوية المدخل' });
    return;
  }

  const hash = bcrypt.hashSync(password, 12);
  const existingUser = member.user_id
    ? (db.prepare('SELECT * FROM users WHERE id = ?').get(member.user_id) as any)
    : (db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(email) as any);

  let resolvedUserId: number;
  if (existingUser) {
    if (existingUser.role === 'super_admin') {
      res.status(403).json({ error: 'لا يمكن إعادة ضبط كلمة مرور المدير العام من بوابة الأعضاء' });
      return;
    }
    db.prepare("UPDATE users SET password_hash = ?, status = 'active' WHERE id = ?").run(hash, existingUser.id);
    resolvedUserId = Number(existingUser.id);
  } else {
    const info = db
      .prepare("INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, 'member', 'active')")
      .run(member.full_name, email, hash);
    resolvedUserId = Number(info.lastInsertRowid);
  }

  db.prepare('UPDATE members SET user_id = ? WHERE id = ?').run(resolvedUserId, member.id);

  const session = getFreshUserSession(resolvedUserId)!;
  const token = signSession(session);
  res.cookie(SESSION_COOKIE_NAME, token, getCookieOptions(req));
  res.json({ user: session, token, message: 'تم تفعيل كلمة مرور حساب العضو بنجاح!' });
});

app.get('/api/auth/me', (req, res) => {
  const bearer = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7).trim() : undefined;
  const token = bearer || req.cookies?.[SESSION_COOKIE_NAME];
  const payload = verifySession(token);
  if (!payload) {
    res.json({ user: null });
    return;
  }
  const fresh = getFreshUserSession(payload.userId);
  res.json({ user: fresh });
});

// ==================== PUBLIC API ROUTES (NO PII LEAKAGE) ====================

app.get('/api/public/bootstrap', (_req, res) => {
  const settings = getSettingsMap();
  const committees = db
    .prepare('SELECT id, slug, name_ar, name_en, logo_url, description_ar, description_en, head_name, head_title, deputy_head_name, coordinator_name, sort_order FROM committees WHERE is_active = 1 ORDER BY sort_order ASC')
    .all();
  const marqueePartners = db
    .prepare('SELECT id, name_ar, name_en, partner_type, logo_url, website_url, marquee_order FROM partners WHERE is_visible = 1 AND show_in_marquee = 1 ORDER BY marquee_order ASC, id ASC')
    .all();
  const brandLogos = db
    .prepare('SELECT * FROM brand_logos WHERE is_active = 1 ORDER BY sort_order ASC, id ASC')
    .all();
  const joinQuestions = db
    .prepare('SELECT * FROM join_questions WHERE is_active = 1 ORDER BY sort_order ASC, id ASC')
    .all();

  const stats = {
    membersCount: (db.prepare("SELECT COUNT(*) as c FROM members WHERE status = 'active'").get() as { c: number }).c,
    committeesCount: committees.length,
    trainingsCount: (db.prepare('SELECT COUNT(*) as c FROM trainings').get() as { c: number }).c,
    eventsCount: (db.prepare('SELECT COUNT(*) as c FROM events').get() as { c: number }).c,
    projectsCount: (db.prepare('SELECT COUNT(*) as c FROM projects').get() as { c: number }).c,
    partnersCount: (db.prepare('SELECT COUNT(*) as c FROM partners WHERE is_visible = 1').get() as { c: number }).c,
    certificatesCount: (db.prepare("SELECT COUNT(*) as c FROM certificates WHERE status = 'valid'").get() as { c: number }).c
  };

  res.json({ settings, committees, marqueePartners, brandLogos, joinQuestions, stats });
});

app.get('/api/public/home', (_req, res) => {
  const news = db
    .prepare("SELECT * FROM news WHERE status = 'published' ORDER BY published_at DESC LIMIT 6")
    .all();
  const events = db
    .prepare('SELECT * FROM events ORDER BY event_date DESC LIMIT 4')
    .all();
  const trainings = db
    .prepare('SELECT * FROM trainings ORDER BY created_at DESC LIMIT 4')
    .all();
  const projects = db
    .prepare('SELECT * FROM projects ORDER BY created_at DESC LIMIT 4')
    .all();
  const partners = db
    .prepare('SELECT * FROM partners WHERE is_visible = 1 ORDER BY marquee_order ASC, id ASC')
    .all();
  const gallery = db
    .prepare('SELECT * FROM gallery ORDER BY created_at DESC LIMIT 8')
    .all();
  const leadership = db
    .prepare('SELECT l.*, c.name_ar as committee_name FROM leadership l LEFT JOIN committees c ON c.id = l.committee_id WHERE l.is_active = 1 ORDER BY l.sort_order ASC LIMIT 6')
    .all();
  res.json({ news, events, trainings, projects, partners, gallery, leadership });
});

app.get('/api/public/committees', (_req, res) => {
  const list = db.prepare('SELECT * FROM committees WHERE is_active = 1 ORDER BY sort_order ASC').all() as any[];
  res.json(list);
});

app.get('/api/public/committees/:slug', (req, res) => {
  const committee = db.prepare('SELECT * FROM committees WHERE slug = ? AND is_active = 1').get(req.params.slug) as any;
  if (!committee) {
    res.status(404).json({ error: 'اللجنة غير موجودة' });
    return;
  }
  const members = db
    .prepare('SELECT id, person_name, role_title, avatar_url, bio, joined_at, is_head FROM committee_members WHERE committee_id = ? ORDER BY is_head DESC, id ASC')
    .all(committee.id);
  const events = db.prepare('SELECT * FROM events WHERE committee_id = ? ORDER BY event_date DESC').all(committee.id);
  const news = db.prepare("SELECT * FROM news WHERE committee_id = ? AND status = 'published' ORDER BY published_at DESC").all(committee.id);
  res.json({ committee, members, events, news });
});

app.get('/api/public/leadership', (_req, res) => {
  res.json(
    db
      .prepare('SELECT l.*, c.name_ar as committee_name FROM leadership l LEFT JOIN committees c ON c.id = l.committee_id WHERE l.is_active = 1 ORDER BY l.sort_order ASC, l.id ASC')
      .all()
  );
});

app.get('/api/public/news', (req, res) => {
  const category = req.query.category ? String(req.query.category) : '';
  if (category) {
    res.json(db.prepare("SELECT * FROM news WHERE status = 'published' AND category = ? ORDER BY published_at DESC").all(category));
    return;
  }
  res.json(db.prepare("SELECT * FROM news WHERE status = 'published' ORDER BY published_at DESC").all());
});

app.get('/api/public/news/:slug', (req, res) => {
  const item = db.prepare("SELECT * FROM news WHERE slug = ? AND status = 'published'").get(req.params.slug);
  if (!item) {
    res.status(404).json({ error: 'الخبر غير موجود' });
    return;
  }
  res.json(item);
});

app.get('/api/public/events', (_req, res) => {
  res.json(db.prepare('SELECT * FROM events ORDER BY event_date DESC').all());
});

app.get('/api/public/events/:id', (req, res) => {
  const id = Number(req.params.id);
  const item = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  if (!item) {
    res.status(404).json({ error: 'الفعالية غير موجودة' });
    return;
  }
  res.json(item);
});

app.post('/api/public/events/:id/register', (req, res) => {
  const eventId = Number(req.params.id);
  const ev = db.prepare('SELECT id FROM events WHERE id = ?').get(eventId);
  if (!ev) {
    res.status(404).json({ error: 'الفعالية غير موجودة' });
    return;
  }
  const { full_name, email, phone, governorate, notes } = req.body;
  if (!full_name || !email || !phone) {
    res.status(400).json({ error: 'الاسم والبريد الإلكتروني ورقم الهاتف مطلوبة' });
    return;
  }
  db.prepare('INSERT INTO event_registrations (event_id, full_name, email, phone, governorate, notes) VALUES (?, ?, ?, ?, ?, ?)').run(
    eventId,
    full_name,
    email,
    phone,
    governorate || '',
    notes || ''
  );
  res.json({ success: true, message: 'تم تسجيل حضورك في الفعالية بنجاح' });
});

app.get('/api/public/trainings', (_req, res) => {
  res.json(db.prepare('SELECT * FROM trainings ORDER BY created_at DESC').all());
});

app.post('/api/public/trainings/:id/register', (req, res) => {
  const trainingId = Number(req.params.id);
  const tr = db.prepare('SELECT * FROM trainings WHERE id = ?').get(trainingId) as any;
  if (!tr) {
    res.status(404).json({ error: 'الدورة غير موجودة' });
    return;
  }
  if (tr.registration_status !== 'open') {
    res.status(400).json({ error: 'التسجيل في هذه الدورة مغلق حاليًا' });
    return;
  }
  const { full_name, email, phone, governorate, member_number } = req.body;
  if (!full_name || !email || !phone) {
    res.status(400).json({ error: 'يرجى إدخال البيانات المطلوبة' });
    return;
  }
  db.prepare(
    'INSERT INTO training_registrations (training_id, full_name, email, phone, governorate, member_number) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(trainingId, full_name, email, phone, governorate || '', member_number || '');
  db.prepare('UPDATE trainings SET seats_taken = seats_taken + 1 WHERE id = ?').run(trainingId);
  res.json({ success: true, message: 'تم تسجيلك في البرنامج التدريبي بنجاح' });
});

app.get('/api/public/projects', (_req, res) => {
  res.json(db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all());
});

app.get('/api/public/gallery', (_req, res) => {
  const albums = db.prepare('SELECT * FROM albums ORDER BY created_at DESC').all();
  const items = db.prepare('SELECT * FROM gallery ORDER BY created_at DESC').all();
  res.json({ albums, items });
});

app.get('/api/public/partners', (_req, res) => {
  res.json(db.prepare('SELECT * FROM partners WHERE is_visible = 1 ORDER BY marquee_order ASC, id ASC').all());
});

app.get('/api/public/library', (_req, res) => {
  res.json(db.prepare('SELECT * FROM digital_library WHERE is_published = 1 ORDER BY created_at DESC').all());
});

app.post('/api/public/library/:id/download', (req, res) => {
  db.prepare('UPDATE digital_library SET downloads_count = downloads_count + 1 WHERE id = ?').run(Number(req.params.id));
  res.json({ success: true });
});

// Public Membership / Volunteer Application upload helper
app.post('/api/public/upload-application-file', (req, res) => {
  publicUpload.single('file')(req, res, (err) => {
    if (err || !req.file) {
      res.status(400).json({ error: 'فشل رفع الملف (الحد الأقصى 8MB، صور أو PDF فقط)' });
      return;
    }
    const sub = path.basename(path.dirname(req.file.path));
    res.json({ url: `/uploads/${sub}/${req.file.filename}` });
  });
});

function parseEgyptianNationalIdServer(raw: string): { birthDate: string; gender: 'ذكر' | 'أنثى' } | null {
  const normalized = raw.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, '');
  if (!/^[23]\d{13}$/.test(normalized)) return null;
  const century = normalized[0] === '2' ? 1900 : 2000;
  const year = century + Number(normalized.slice(1, 3));
  const month = Number(normalized.slice(3, 5));
  const day = Number(normalized.slice(5, 7));
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day || dt.getTime() > Date.now()) {
    return null;
  }
  const genderDigit = Number(normalized[12]);
  const gender: 'ذكر' | 'أنثى' = genderDigit % 2 === 1 ? 'ذكر' : 'أنثى';
  const birthDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { birthDate, gender };
}

app.post('/api/public/applications', async (req, res) => {
  try {
  const b = req.body;
  if (!b.full_name || !b.phone || !b.email) {
    res.status(400).json({ error: 'الاسم الكامل ورقم الهاتف والبريد الإلكتروني حقول إلزامية' });
    return;
  }

  const normalizedEmail = String(b.email).trim().toLowerCase();
  const normalizedPhone = String(b.phone).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).trim();
  const normalizedNationalId = String(b.national_id_number || '')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/\D/g, '');
  const parsedId = parseEgyptianNationalIdServer(normalizedNationalId);
  if (!parsedId) {
    res.status(400).json({ error: 'يرجى إدخال رقم قومي مصري صحيح مكون من 14 رقمًا' });
    return;
  }

  const password = String(b.password || '');
  if (password.length < 8) {
    res.status(400).json({ error: 'كلمة المرور إلزامية ويجب أن تكون 8 أحرف على الأقل' });
    return;
  }

  const existingUser = db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(normalizedEmail) as any;
  if (existingUser) {
    res.status(400).json({ error: 'هذا البريد الإلكتروني مسجل بالفعل، يمكنك تسجيل الدخول مباشرة' });
    return;
  }

  const allQuestions = db.prepare('SELECT id, question_ar, is_required FROM join_questions WHERE is_active = 1').all() as {
    id: number;
    question_ar: string;
    is_required: number;
  }[];
  const questionMap = new Map(allQuestions.map((q) => [q.id, q.question_ar]));

  let customAnswers: { question_id: number; question_ar: string; answer: string }[] = [];
  if (Array.isArray(b.custom_answers)) {
    customAnswers = b.custom_answers
      .map((a: any) => ({
        question_id: Number(a.question_id),
        question_ar: String(a.question_ar || questionMap.get(Number(a.question_id)) || ''),
        answer: String(a.answer ?? '').trim()
      }))
      .filter((a: any) => a.question_id && a.answer !== '');
  } else if (b.custom_answers && typeof b.custom_answers === 'object') {
    customAnswers = Object.entries(b.custom_answers)
      .map(([k, v]) => ({
        question_id: Number(k),
        question_ar: questionMap.get(Number(k)) || '',
        answer: String(v ?? '').trim()
      }))
      .filter((a) => a.question_id && a.answer !== '');
  }

  // Validate required custom questions
  for (const rq of allQuestions.filter((q) => q.is_required === 1)) {
    const found = customAnswers.find((a) => a.question_id === rq.id && a.answer !== '');
    if (!found) {
      res.status(400).json({ error: `يرجى الإجابة على السؤال المطلوب: ${rq.question_ar}` });
      return;
    }
  }

  // Create member login account immediately with password set during Join
  const passwordHash = bcrypt.hashSync(password, 12);
  const userRes = db
    .prepare("INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, 'member', 'active')")
    .run(String(b.full_name).trim(), normalizedEmail, passwordHash);
  const newUserId = Number(userRes.lastInsertRowid);

  const appNumber = generateSafeCode('APP');
  const settingsMap = getSettingsMap();
  const autoIssue = settingsMap.auto_issue_card_on_apply !== '0';
  const prefCommitteeId = b.preferred_committee_id ? Number(b.preferred_committee_id) : null;
  const resolvedBirthDate = parsedId.birthDate || b.birth_date || '';
  const resolvedGender = parsedId.gender || b.gender || '';

  const info = db
    .prepare(
      `INSERT INTO membership_applications (
        application_number, full_name, avatar_url, birth_date, gender, governorate, area,
        phone, whatsapp, email, qualification, university_school, major, graduation_year,
        experiences, skills, interests, preferred_committee_id, assigned_committee_id,
        reason, availability, cv_url, national_id_number, national_id_front_url, national_id_back_url,
        custom_answers_json, status, admin_notes, reviewed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      appNumber,
      String(b.full_name).trim(),
      b.avatar_url || '',
      resolvedBirthDate,
      resolvedGender,
      b.governorate || '',
      b.area || '',
      normalizedPhone,
      b.whatsapp || normalizedPhone,
      normalizedEmail,
      b.qualification || '',
      b.university_school || '',
      b.major || '',
      b.graduation_year || '',
      b.experiences || '',
      b.skills || '',
      b.interests || '',
      prefCommitteeId,
      autoIssue ? prefCommitteeId : null,
      b.reason || '',
      b.availability || '',
      b.cv_url || '',
      normalizedNationalId,
      b.national_id_front_url || '',
      b.national_id_back_url || '',
      JSON.stringify(customAnswers),
      autoIssue ? 'accepted' : 'pending',
      autoIssue ? 'تم القبول المبدئي وإصدار الكارنيه الإلكتروني تلقائيًا فور التقديم' : '',
      autoIssue ? new Date().toISOString().replace('T', ' ').slice(0, 19) : ''
    );

  let cardData: any = null;
  let memberNumber: string | null = null;
  let cardNumber: string | null = null;

  if (autoIssue) {
    let member = db
      .prepare("SELECT * FROM members WHERE lower(email) = lower(?) OR (phone = ? AND phone != '')")
      .get(normalizedEmail, normalizedPhone) as any;

    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    if (!member) {
      memberNumber = generateNextMemberNumber();
      const mRes = db
        .prepare(
          `INSERT INTO members (
             user_id, member_number, full_name, avatar_url, birth_date, gender, governorate, area,
             phone, whatsapp, email, qualification, university_school, major, graduation_year,
             national_id_number, national_id_front_url, national_id_back_url,
             committee_id, position_title, status, joined_at, expires_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', date('now'), ?)`
        )
        .run(
          newUserId,
          memberNumber,
          String(b.full_name).trim(),
          b.avatar_url || '',
          resolvedBirthDate,
          resolvedGender,
          b.governorate || '',
          b.area || '',
          normalizedPhone,
          b.whatsapp || normalizedPhone,
          normalizedEmail,
          b.qualification || '',
          b.university_school || '',
          b.major || '',
          b.graduation_year || '',
          normalizedNationalId,
          b.national_id_front_url || '',
          b.national_id_back_url || '',
          prefCommitteeId,
          'عضو عامل',
          expiresAt
        );
      member = db.prepare('SELECT * FROM members WHERE id = ?').get(mRes.lastInsertRowid);

      if (prefCommitteeId) {
        db.prepare(
          `INSERT INTO committee_members (committee_id, member_id, person_name, role_title, avatar_url)
           VALUES (?, ?, ?, ?, ?)`
        ).run(prefCommitteeId, member.id, String(b.full_name).trim(), 'عضو لجنة', b.avatar_url || '');
      }
    } else {
      memberNumber = member.member_number;
      if (!member.user_id) {
        db.prepare('UPDATE members SET user_id = ? WHERE id = ?').run(newUserId, member.id);
      }
    }

    let card = db.prepare("SELECT * FROM membership_cards WHERE member_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1").get(member.id) as any;
    const defaultDesign = db.prepare('SELECT * FROM card_designs ORDER BY is_default DESC, id ASC LIMIT 1').get() as any;

    if (!card) {
      cardNumber = generateSafeCode('CARD');
      const qrToken = crypto.randomBytes(12).toString('hex');
      const cRes = db
        .prepare(
          `INSERT INTO membership_cards (member_id, card_number, design_id, issue_date, expiry_date, status, qr_token, issued_by)
           VALUES (?, ?, ?, date('now'), ?, 'active', ?, 'auto_apply')`
        )
        .run(member.id, cardNumber, defaultDesign?.id || null, expiresAt, qrToken);
      card = db.prepare('SELECT * FROM membership_cards WHERE id = ?').get(cRes.lastInsertRowid);
    } else {
      cardNumber = card.card_number;
    }

    const committeeRow = member.committee_id
      ? (db.prepare('SELECT name_ar FROM committees WHERE id = ?').get(member.committee_id) as { name_ar: string } | undefined)
      : undefined;
    const logos = db.prepare('SELECT * FROM card_logos WHERE is_active = 1 ORDER BY sort_order ASC, id ASC').all();
    const baseUrl = resolveBaseUrl(req);
    const verifyUrl = `${baseUrl}/verify?card=${encodeURIComponent(card.card_number)}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 240, margin: 1 });

    cardData = {
      card: {
        ...card,
        full_name: member.full_name,
        full_name_en: member.full_name_en,
        member_number: member.member_number,
        national_id_number: member.national_id_number,
        avatar_url: member.avatar_url,
        position_title: member.position_title,
        governorate: member.governorate,
        committee_name: committeeRow?.name_ar || 'عضوية عامة',
        card_status: card.status
      },
      design: defaultDesign,
      logos,
      qrDataUrl,
      verifyUrl
    };
  }

  db.prepare(
    `INSERT INTO notifications (target_role, title_ar, message_ar, ref_type, ref_id)
     VALUES ('membership_manager', 'طلب عضوية جديد', ?, 'application', ?)`
  ).run(`تقدم ${b.full_name} بطلب انضمام برقم ${appNumber}${cardNumber ? ` (كارنيه: ${cardNumber})` : ''}`, appNumber);

  const session = getFreshUserSession(newUserId);
  const token = session ? signSession(session) : null;
  if (token) {
    res.cookie(SESSION_COOKIE_NAME, token, getCookieOptions(req));
  }

  res.status(201).json({
    success: true,
    id: info.lastInsertRowid,
    application_number: appNumber,
    member_number: memberNumber,
    card_number: cardNumber,
    cardData,
    user: session,
    token,
    message: autoIssue
      ? 'تم تسجيل طلبك وإنشاء حسابك وإصدار الكارنيه الإلكتروني الرسمي فورًا!'
      : 'تم استلام طلب الانضمام وإنشاء حسابك بنجاح! يمكنك متابعة حالة طلبك باستخدام رقم الطلب ورقم الهاتف.'
  });
  } catch (err) {
    console.error('Error in POST /api/public/applications:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الطلب، يرجى المحاولة مرة أخرى' });
  }
});

// Safe application status check (requires BOTH application_number and phone — never exposes other applicants)
app.get('/api/public/applications/status', (req, res) => {
  const code = String(req.query.code || '').trim().toUpperCase();
  const phone = String(req.query.phone || '').trim();
  if (!code || !phone) {
    res.status(400).json({ error: 'أدخل رقم الطلب ورقم الهاتف' });
    return;
  }
  const row = db
    .prepare(
      `SELECT a.application_number, a.full_name, a.status, a.admin_notes, a.created_at, a.reviewed_at,
              c.name_ar as assigned_committee_name
       FROM membership_applications a
       LEFT JOIN committees c ON c.id = COALESCE(a.assigned_committee_id, a.preferred_committee_id)
       WHERE upper(a.application_number) = ? AND a.phone = ?`
    )
    .get(code, phone) as any;

  if (!row) {
    res.status(404).json({ error: 'لم يتم العثور على طلب مطابق لهذه البيانات' });
    return;
  }

  let memberCard: any = null;
  if (row.status === 'accepted') {
    const member = db.prepare('SELECT id, member_number FROM members WHERE phone = ?').get(phone) as any;
    if (member) {
      const card = db.prepare('SELECT card_number FROM membership_cards WHERE member_id = ? ORDER BY id DESC LIMIT 1').get(member.id) as any;
      memberCard = { member_number: member.member_number, card_number: card?.card_number || null };
    }
  }
  res.json({ application: row, memberCard });
});

app.post('/api/public/contact', (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !message) {
    res.status(400).json({ error: 'يرجى استيفاء الاسم والبريد والرسالة' });
    return;
  }
  db.prepare('INSERT INTO contact_messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)').run(
    name,
    email,
    phone || '',
    subject || 'رسالة تواصل عبر المنصة',
    message
  );
  res.json({ success: true, message: 'تم إرسال رسالتك بنجاح وسيتواصل معك فريق المبادرة.' });
});

// ==================== QR VERIFICATION & ELECTRONIC CARDS ====================
app.get('/api/public/verify/card/:cardNumber', async (req, res) => {
  const rawCode = String(req.params.cardNumber || '').trim();
  const normalizedCode = rawCode.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).trim();
  const paddedNumeric = /^\d+$/.test(normalizedCode) && normalizedCode.length <= 6 ? normalizedCode.padStart(6, '0') : normalizedCode;

  const row = db
    .prepare(
      `SELECT mc.id, mc.card_number, mc.issue_date, mc.expiry_date, mc.status as card_status, mc.design_id,
              m.full_name, m.full_name_en, m.member_number, m.national_id_number, m.avatar_url, m.governorate, m.position_title, m.status as member_status,
              c.name_ar as committee_name, c.name_en as committee_name_en
       FROM membership_cards mc
       JOIN members m ON m.id = mc.member_id
       LEFT JOIN committees c ON c.id = m.committee_id
       WHERE upper(mc.card_number) = upper(?)
          OR upper(m.member_number) = upper(?)
          OR m.member_number = ?
          OR m.national_id_number = ?
          OR mc.qr_token = ?
       ORDER BY mc.id DESC
       LIMIT 1`
    )
    .get(normalizedCode, normalizedCode, paddedNumeric, normalizedCode, normalizedCode) as any;

  if (!row) {
    if (/^[23]\d{13}$/.test(normalizedCode)) {
      const pendingApp = db
        .prepare('SELECT status, application_number FROM membership_applications WHERE national_id_number = ? ORDER BY id DESC LIMIT 1')
        .get(normalizedCode) as { status: string; application_number: string } | undefined;
      if (pendingApp) {
        const msg =
          pendingApp.status === 'rejected'
            ? `الطلب المرتبط بهذا الرقم القومي (${pendingApp.application_number}) مرفوض حاليًا.`
            : `الطلب (${pendingApp.application_number}) المرتبط بهذا الرقم القومي قيد المراجعة ولم يُصدر له كارنيه بعد.`;
        res.status(404).json({ valid: false, error: msg });
        return;
      }
    }
    res.status(404).json({ valid: false, error: 'رقم الكارنيه أو رقم العضوية أو الرقم القومي غير مسجل' });
    return;
  }

  const design =
    db.prepare('SELECT * FROM card_designs WHERE id = ?').get(row.design_id || 1) ||
    db.prepare('SELECT * FROM card_designs ORDER BY is_default DESC LIMIT 1').get();
  const logos = db
    .prepare('SELECT * FROM card_logos WHERE is_active = 1 ORDER BY sort_order ASC, id ASC')
    .all();

  const baseUrl = resolveBaseUrl(req);
  const verifyUrl = `${baseUrl}/verify?card=${encodeURIComponent(row.card_number)}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 220, margin: 1 });

  res.json({
    valid: row.card_status === 'active' && row.member_status === 'active',
    card: row,
    design,
    logos,
    qrDataUrl,
    verifyUrl
  });
});

app.get('/api/public/verify/certificate/:certNumber', async (req, res) => {
  const code = String(req.params.certNumber || '').trim();
  const cert = db
    .prepare(
      `SELECT certificate_number, recipient_name, course_title, issue_date, trainer_name, template_style,
              activity_type, hours_count, grade_ar, title_ar, subtitle_ar, body_text_ar, primary_color, accent_color, status
       FROM certificates WHERE upper(certificate_number) = upper(?)`
    )
    .get(code) as any;
  if (!cert) {
    res.status(404).json({ valid: false, error: 'الشهادة غير موجودة' });
    return;
  }
  const baseUrl = resolveBaseUrl(req);
  const verifyUrl = `${baseUrl}/verify?cert=${encodeURIComponent(cert.certificate_number)}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 200, margin: 1 });
  res.json({ valid: cert.status === 'valid', certificate: cert, qrDataUrl, verifyUrl });
});

// ==================== MEMBER PORTAL ====================
app.get('/api/member/profile', requireAuth, async (req: AuthedRequest, res) => {
  const member = db
    .prepare(
      `SELECT m.*, c.name_ar as committee_name
       FROM members m LEFT JOIN committees c ON c.id = m.committee_id
       WHERE m.user_id = ? OR lower(m.email) = lower(?)`
    )
    .get(req.user!.userId, req.user!.email) as any;

  const notifications = db
    .prepare('SELECT * FROM notifications WHERE lower(target_email) = lower(?) ORDER BY created_at DESC LIMIT 20')
    .all(req.user!.email);

  const rawCertificates = db
    .prepare('SELECT * FROM certificates WHERE lower(recipient_email) = lower(?) OR member_id = ? ORDER BY issue_date DESC, id DESC')
    .all(req.user!.email, member?.id || -1) as any[];

  const baseUrl = resolveBaseUrl(req);
  const certificates = await Promise.all(
    rawCertificates.map(async (c) => {
      const verifyUrl = `${baseUrl}/verify?cert=${encodeURIComponent(c.certificate_number)}`;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 200, margin: 1 });
      return { ...c, verifyUrl, qrDataUrl };
    })
  );

  let cardData: any = null;
  if (member) {
    const card = db.prepare('SELECT * FROM membership_cards WHERE member_id = ? ORDER BY id DESC LIMIT 1').get(member.id) as any;
    if (card) {
      const design =
        db.prepare('SELECT * FROM card_designs WHERE id = ?').get(card.design_id || 1) ||
        db.prepare('SELECT * FROM card_designs ORDER BY is_default DESC, id ASC LIMIT 1').get();
      const logos = db.prepare('SELECT * FROM card_logos WHERE is_active = 1 ORDER BY sort_order ASC, id ASC').all();
      const verifyUrl = `${baseUrl}/verify?card=${encodeURIComponent(card.card_number)}`;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 220, margin: 1 });
      cardData = { card, design, logos, qrDataUrl };
    }
  }

  res.json({ member, cardData, notifications, certificates });
});

// ==================== ADMIN ROUTES ====================
app.use('/api/admin', adminRoutes);

// ==================== URL, GOOGLE VERIFICATION, MANIFEST, SITEMAP & ROBOTS ====================
// Explicit Google Search Console HTML Verification endpoint (never redirected to SPA)
app.get('/googlef3c013b384f88d85.html', (_req, res) => {
  res.status(200).type('text/html; charset=utf-8').send('google-site-verification: googlef3c013b384f88d85.html');
});

// Dynamic Web App Manifest linked to DB branding & favicon
app.get('/manifest.webmanifest', (req, res) => {
  const settings = getSettingsMap();
  const baseUrl = resolveBaseUrl(req);
  const faviconUrl = toPublicUrl(settings.favicon_url || settings.logo_url, baseUrl);
  const mainLogoUrl = toPublicUrl(settings.logo_url, baseUrl);
  const favMime = guessImageMime(faviconUrl);
  const mainMime = guessImageMime(mainLogoUrl);

  const rawFav = String(settings.favicon_url || '').trim();
  const isDefaultFav =
    !rawFav || rawFav === '/icons/logo-192.png' || rawFav.includes('FB_IMG_1789831319399_ac126220');
  const rawMainLogo = String(settings.logo_url || '').trim();
  const isDefaultMain = !rawMainLogo || rawMainLogo.includes('FB_IMG_1789831319399_ac126220');

  const manifestIcons = [
    { src: `${baseUrl}/icons/logo-48.png`, sizes: '48x48', type: 'image/png', purpose: 'any' },
    { src: `${baseUrl}/icons/logo-96.png`, sizes: '96x96', type: 'image/png', purpose: 'any' },
    { src: `${baseUrl}/icons/logo-144.png`, sizes: '144x144', type: 'image/png', purpose: 'any' },
    {
      src: isDefaultFav ? `${baseUrl}/icons/logo-192.png` : faviconUrl,
      sizes: '192x192',
      type: isDefaultFav ? 'image/png' : favMime,
      purpose: 'any maskable'
    },
    {
      src: isDefaultMain ? `${baseUrl}/icons/logo-512.png` : mainLogoUrl,
      sizes: '512x512',
      type: isDefaultMain ? 'image/png' : mainMime,
      purpose: 'any maskable'
    }
  ];

  const manifest = {
    name: `${settings.site_name_ar || 'جيل رقمي آمن'} — ${settings.site_name_en || 'SAFE DIGITAL GENERATION'}`,
    short_name: settings.site_name_ar || 'جيل رقمي آمن',
    description: settings.seo_description || settings.about_summary_ar || 'المنصة الرسمية لمبادرة جيل رقمي آمن',
    start_url: '/',
    scope: '/',
    dir: 'rtl',
    lang: 'ar',
    display: 'standalone',
    theme_color: settings.navy_color || '#0a192f',
    background_color: '#f8fafc',
    icons: manifestIcons
  };
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(JSON.stringify(manifest, null, 2));
});

app.get('/robots.txt', (req, res) => {
  const baseUrl = resolveBaseUrl(req);
  res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).type('text/plain; charset=utf-8').send(buildRobotsTxt(baseUrl));
});

app.get('/sitemap.xml', (req, res) => {
  const baseUrl = resolveBaseUrl(req);
  res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, follow');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).type('application/xml; charset=utf-8').send(buildSitemapXml(baseUrl));
});

app.get(['/sitemap_index.xml', '/sitemap-index.xml'], (req, res) => {
  const baseUrl = resolveBaseUrl(req);
  res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, follow');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).type('application/xml; charset=utf-8').send(buildSitemapIndexXml(baseUrl));
});

// ==================== HTML SERVING + DYNAMIC ALL-ROUTE OPEN GRAPH, TWITTER CARDS & SCHEMA.ORG ====================
function injectDynamicSeoAndOpenGraph(html: string, req: express.Request): { html: string; noindex: boolean } {
  const settings = getSettingsMap();
  const baseUrl = resolveBaseUrl(req);
  const rawPathname = (req.originalUrl || req.url || req.path || '/').split('?')[0].split('#')[0] || '/';
  const cleanPath = rawPathname === '/' ? '/' : rawPathname.replace(/\/+$/, '');
  const siteName = `${settings.site_name_ar || 'جيل رقمي آمن'} — ${settings.site_name_en || 'SAFE DIGITAL GENERATION'}`;
  const defaultTitle = settings.seo_title || 'جيل رقمي آمن — معًا لمستقبل رقمي آمن | SAFE DIGITAL GENERATION';
  const defaultDesc =
    settings.seo_description ||
    'المنصة الرسمية لمبادرة جيل رقمي آمن تحت مظلة الاتحاد النوعي حكاية وطن (1279 لسنة 2025) بوزارة التضامن الاجتماعي.';

  const rawFavSetting = String(settings.favicon_url || '').trim();
  const isDefaultFavicon =
    !rawFavSetting ||
    rawFavSetting === '/icons/logo-192.png' ||
    rawFavSetting.includes('FB_IMG_1789831319399_ac126220');
  const rawMainLogoSetting = String(settings.logo_url || '').trim();
  const isDefaultMainLogo = !rawMainLogoSetting || rawMainLogoSetting.includes('FB_IMG_1789831319399_ac126220');

  const faviconUrl = isDefaultFavicon ? '/icons/logo-192.png' : toPublicUrl(rawFavSetting, baseUrl);
  const orgLogoUrl = isDefaultMainLogo ? `${baseUrl}/icons/logo-512.png` : toPublicUrl(rawMainLogoSetting, baseUrl);
  const defaultShareImage = toPublicUrl(settings.og_image_url || settings.logo_url, baseUrl);

  const routeMetaMap: Record<string, { title: string; desc: string; noindex?: boolean }> = {
    '/': { title: defaultTitle, desc: defaultDesc },
    '/about': {
      title: `من نحن والرؤية | ${settings.site_name_ar || 'جيل رقمي آمن'}`,
      desc: settings.about_summary_ar || defaultDesc
    },
    '/goals': {
      title: `أهداف المبادرة | ${settings.site_name_ar || 'جيل رقمي آمن'}`,
      desc: 'الأهداف الاستراتيجية لمبادرة جيل رقمي آمن في التوعية بالأمن الرقمي، البرمجة، الذكاء الاصطناعي، والمواطنة الرقمية.'
    },
    '/leadership': {
      title: `قيادات المبادرة والهيكل التنظيمي | ${settings.site_name_ar || 'جيل رقمي آمن'}`,
      desc: 'تعرف على القيادات والهيكل التنظيمي ومجالس اللجان في مبادرة جيل رقمي آمن.'
    },
    '/committees': {
      title: `اللجان المتخصصة | ${settings.site_name_ar || 'جيل رقمي آمن'}`,
      desc: 'استكشف اللجان التخصصية التسع في مبادرة جيل رقمي آمن ومهامها وفرق العمل.'
    },
    '/events': {
      title: `الأنشطة والفعاليات | ${settings.site_name_ar || 'جيل رقمي آمن'}`,
      desc: 'جدول الندوات وورش العمل والمؤتمرات والحملات التوعوية لمبادرة جيل رقمي آمن.'
    },
    '/news-and-events': {
      title: `الأخبار والأنشطة والفعاليات | ${settings.site_name_ar || 'جيل رقمي آمن'}`,
      desc: 'تابع أحدث أخبار وبيانات مبادرة جيل رقمي آمن والفعاليات والأنشطة القادمة.'
    },
    '/trainings': {
      title: `البرامج التدريبية المتخصصة | ${settings.site_name_ar || 'جيل رقمي آمن'}`,
      desc: 'دورات ومسارات تدريبية مجانية في الأمن السيبراني والبرمجة والذكاء الاصطناعي بشهادات معتمدة.'
    },
    '/news': {
      title: `الأخبار والبيانات الإعلامية | ${settings.site_name_ar || 'جيل رقمي آمن'}`,
      desc: 'المركز الإعلامي والتغطيات الإخبارية والبيانات الرسمية لمبادرة جيل رقمي آمن.'
    },
    '/projects': {
      title: `المبادرات والمشروعات المجتمعية | ${settings.site_name_ar || 'جيل رقمي آمن'}`,
      desc: 'المشروعات التنموية والرقمية لمبادرة جيل رقمي آمن في الجامعات والمدارس والمجتمع.'
    },
    '/gallery': {
      title: `معرض الصور والفيديوهات | ${settings.site_name_ar || 'جيل رقمي آمن'}`,
      desc: 'التوثيق البصري لفعاليات وورش عمل ومشاركات مبادرة جيل رقمي آمن.'
    },
    '/join': {
      title: `انضم إلى المبادرة (العضوية والتطوع) | ${settings.site_name_ar || 'جيل رقمي آمن'}`,
      desc: 'قدّم طلب الانضمام والتطوع في مبادرة جيل رقمي آمن واحصل على رقم العضوية والكارنيه الإلكتروني.'
    },
    '/partners': {
      title: `الشركاء والمظلة الرسمية | ${settings.site_name_ar || 'جيل رقمي آمن'}`,
      desc: 'الجهات الرسمية والشركاء والداعمون لمبادرة جيل رقمي آمن تحت مظلة اتحاد حكاية وطن.'
    },
    '/library': {
      title: `المكتبة الرقمية والأدلة التوعوية | ${settings.site_name_ar || 'جيل رقمي آمن'}`,
      desc: 'أدلة السلامة الرقمية، مكافحة التنمر الإلكتروني، ومصادر تعلم البرمجة والذكاء الاصطناعي.'
    },
    '/contact': {
      title: `تواصل معنا | ${settings.site_name_ar || 'جيل رقمي آمن'}`,
      desc: 'تواصل مع إدارة مبادرة جيل رقمي آمن للاستفسارات والشراكات المؤسسية والتدريب.'
    },
    '/verify': {
      title: `التحقق من الكارنيه والشهادات | ${settings.site_name_ar || 'جيل رقمي آمن'}`,
      desc: 'بوابة التحقق الرقمي الفوري من صحة كارنيه العضوية والشهادات الصادرة عن المبادرة.'
    },
    '/admin': { title: `لوحة الإدارة | ${settings.site_name_ar || 'جيل رقمي آمن'}`, desc: defaultDesc, noindex: true },
    '/dashboard': { title: `لوحة التحكم | ${settings.site_name_ar || 'جيل رقمي آمن'}`, desc: defaultDesc, noindex: true },
    '/login': { title: `تسجيل الدخول | ${settings.site_name_ar || 'جيل رقمي آمن'}`, desc: defaultDesc, noindex: true },
    '/member': { title: `بوابة العضو والكارنيه الإلكتروني | ${settings.site_name_ar || 'جيل رقمي آمن'}`, desc: defaultDesc, noindex: true }
  };

  let pageTitle = routeMetaMap[cleanPath]?.title || defaultTitle;
  let pageDesc = routeMetaMap[cleanPath]?.desc || defaultDesc;
  let canonicalUrl = `${baseUrl}${cleanPath}`;
  let ogType: 'website' | 'article' = 'website';
  let ogImage = defaultShareImage;
  let ogImageAlt = settings.site_name_ar || 'جيل رقمي آمن';
  let robotsContent = routeMetaMap[cleanPath]?.noindex ? 'noindex, nofollow' : 'index, follow';
  let extraMeta = '';

  const sameAs = [settings.facebook_url, settings.instagram_url, settings.tiktok_url].filter((u) => Boolean(u && u.trim()));
  const logoImageObject: Record<string, unknown> = {
    '@type': 'ImageObject',
    '@id': `${baseUrl}/#logo`,
    inLanguage: 'ar',
    url: orgLogoUrl,
    contentUrl: orgLogoUrl,
    caption: siteName
  };
  if (isDefaultMainLogo) {
    logoImageObject.width = 512;
    logoImageObject.height = 512;
  }

  const orgSchema: Record<string, unknown> = {
    '@type': 'Organization',
    '@id': `${baseUrl}/#organization`,
    name: siteName,
    alternateName: settings.site_name_en || 'Safe Digital Generation Initiative',
    url: `${baseUrl}/`,
    slogan: settings.site_slogan_ar || 'معًا لمستقبل رقمي آمن',
    logo: logoImageObject,
    image: { '@id': `${baseUrl}/#logo` },
    email: settings.email || 'generationdigitalsafe@gmail.com',
    telephone: settings.phone || '+201277714301',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: settings.phone || '+201277714301',
      email: settings.email || 'generationdigitalsafe@gmail.com',
      contactType: 'customer support',
      availableLanguage: ['Arabic', 'English']
    },
    sameAs
  };

  const websiteSchema: Record<string, unknown> = {
    '@type': 'WebSite',
    '@id': `${baseUrl}/#website`,
    url: `${baseUrl}/`,
    name: siteName,
    description: defaultDesc,
    publisher: { '@id': `${baseUrl}/#organization` },
    inLanguage: 'ar'
  };

  const graphItems: Record<string, unknown>[] = [orgSchema, websiteSchema];

  function safeDecode(val: string): string {
    try {
      return decodeURIComponent(val);
    } catch {
      return val;
    }
  }

  // Dynamic News Article Route (/news/:slug)
  const newsMatch = cleanPath.match(/^\/news\/([^/]+)$/);
  if (newsMatch) {
    const slug = safeDecode(newsMatch[1]);
    const item = db.prepare("SELECT * FROM news WHERE slug = ? AND status = 'published'").get(slug) as any;
    if (item) {
      ogType = 'article';
      canonicalUrl = `${baseUrl}/news/${encodeURIComponent(item.slug)}`;
      pageTitle = `${item.title_ar} | ${settings.site_name_ar || 'جيل رقمي آمن'}`;
      pageDesc = (item.excerpt_ar || item.content_ar || '').replace(/\s+/g, ' ').trim().slice(0, 165) || defaultDesc;
      const chosenRawImg = item.share_image_url || item.cover_image || item.logo_url || settings.og_image_url || settings.logo_url;
      ogImage = toPublicUrl(chosenRawImg, baseUrl);
      ogImageAlt = item.cover_alt || item.title_ar;
      extraMeta = `
    <meta property="article:published_time" content="${escHtml(item.published_at || '')}" />
    <meta property="article:modified_time" content="${escHtml(item.updated_at || item.published_at || '')}" />
    <meta property="article:section" content="${escHtml(item.category || 'أخبار المبادرة')}" />`;

      graphItems.push({
        '@type': 'NewsArticle',
        mainEntityOfPage: canonicalUrl,
        headline: item.title_ar,
        description: pageDesc,
        image: [ogImage],
        datePublished: item.published_at,
        dateModified: item.updated_at || item.published_at,
        author: {
          '@type': 'Organization',
          name: item.department_ar || item.author_name || siteName
        },
        publisher: {
          '@id': `${baseUrl}/#organization`
        },
        articleSection: item.category || 'أخبار المبادرة',
        keywords: item.keywords || ''
      });
    }
  }

  // Dynamic Committee Route (/committees/:slug)
  const committeeMatch = cleanPath.match(/^\/committees\/([^/]+)$/);
  if (committeeMatch) {
    const slug = safeDecode(committeeMatch[1]);
    const com = db.prepare('SELECT * FROM committees WHERE slug = ? AND is_active = 1').get(slug) as any;
    if (com) {
      canonicalUrl = `${baseUrl}/committees/${encodeURIComponent(com.slug)}`;
      pageTitle = `${com.name_ar} | ${settings.site_name_ar || 'جيل رقمي آمن'}`;
      pageDesc = (com.description_ar || defaultDesc).slice(0, 165);
      ogImage = toPublicUrl(com.logo_url || settings.og_image_url || settings.logo_url, baseUrl);
      ogImageAlt = com.name_ar;
    }
  }

  // Dynamic Event Route (/events/:id)
  const eventMatch = cleanPath.match(/^\/events\/(\d+)$/);
  if (eventMatch) {
    const evId = Number(eventMatch[1]);
    const ev = db.prepare('SELECT * FROM events WHERE id = ?').get(evId) as any;
    if (ev) {
      canonicalUrl = `${baseUrl}/events/${ev.id}`;
      pageTitle = `${ev.title_ar} | ${settings.site_name_ar || 'جيل رقمي آمن'}`;
      pageDesc = (ev.description_ar || defaultDesc).replace(/\s+/g, ' ').trim().slice(0, 165);
      ogImage = toPublicUrl(ev.share_image_url || ev.cover_image || ev.logo_url || settings.og_image_url || settings.logo_url, baseUrl);
      ogImageAlt = ev.cover_alt || ev.title_ar;
      graphItems.push({
        '@type': 'Event',
        name: ev.title_ar,
        description: pageDesc,
        startDate: ev.event_date,
        image: [ogImage],
        url: canonicalUrl,
        eventStatus: ev.status === 'completed' ? 'https://schema.org/EventScheduled' : 'https://schema.org/EventScheduled',
        location: {
          '@type': 'Place',
          name: ev.location || 'مصر',
          address: ev.location || 'مصر'
        },
        organizer: {
          '@type': 'Organization',
          name: ev.organizer || siteName,
          url: `${baseUrl}/`
        }
      });
    }
  }

  // Structured data for Events & News-and-Events list pages
  if (cleanPath === '/events' || cleanPath === '/news-and-events') {
    const upcomingEvents = db.prepare('SELECT * FROM events ORDER BY event_date DESC LIMIT 10').all() as any[];
    for (const ev of upcomingEvents) {
      graphItems.push({
        '@type': 'Event',
        name: ev.title_ar,
        description: (ev.description_ar || '').replace(/\s+/g, ' ').trim().slice(0, 160),
        startDate: ev.event_date,
        url: `${baseUrl}/events/${ev.id}`,
        image: [toPublicUrl(ev.cover_image || settings.og_image_url || settings.logo_url, baseUrl)],
        location: {
          '@type': 'Place',
          name: ev.location || 'مصر'
        },
        organizer: { '@id': `${baseUrl}/#organization` }
      });
    }
  }

  function escHtml(s: string): string {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  const favMime = guessImageMime(faviconUrl);
  const ogImgEsc = escHtml(ogImage);
  const ogImageMime = guessImageMime(ogImage);
  const isOfficialSquareLogo = ogImage.includes('FB_IMG_1789831319399_ac126220') || ogImage.includes('/icons/logo-512.png');

  if (!routeMetaMap[cleanPath]?.noindex) {
    graphItems.push({
      '@type': 'WebPage',
      '@id': `${canonicalUrl}#webpage`,
      url: canonicalUrl,
      name: pageTitle,
      description: pageDesc,
      isPartOf: { '@id': `${baseUrl}/#website` },
      about: { '@id': `${baseUrl}/#organization` },
      primaryImageOfPage: {
        '@type': 'ImageObject',
        url: ogImage
      },
      inLanguage: 'ar'
    });
  }

  const safeSchemaJson = JSON.stringify({ '@context': 'https://schema.org', '@graph': graphItems }).replace(/</g, '\\u003c');

  let pageKeywords =
    'جيل رقمي آمن, SAFE DIGITAL GENERATION, حكاية وطن, وزارة التضامن الاجتماعي, الأمن السيبراني, التوعية الرقمية, الذكاء الاصطناعي, البرمجة للشباب';
  if (newsMatch) {
    const slug = safeDecode(newsMatch[1]);
    const kwRow = db.prepare("SELECT keywords FROM news WHERE slug = ? AND status = 'published'").get(slug) as { keywords?: string } | undefined;
    if (kwRow?.keywords) pageKeywords = kwRow.keywords;
  }

  const iconLinksHtml = isDefaultFavicon
    ? `<link rel="icon" type="image/png" sizes="48x48" href="/icons/logo-48.png" />
    <link rel="icon" type="image/png" sizes="96x96" href="/icons/logo-96.png" />
    <link rel="icon" type="image/png" sizes="144x144" href="/icons/logo-144.png" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icons/logo-192.png" />
    <link rel="shortcut icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" sizes="192x192" href="/icons/logo-192.png" />`
    : `<link rel="icon" type="${escHtml(favMime)}" href="${escHtml(faviconUrl)}" />
    <link rel="icon" type="image/png" sizes="48x48" href="/icons/logo-48.png" />
    <link rel="shortcut icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" href="${escHtml(faviconUrl)}" />`;

  const ogDimsHtml = ogImage.includes('FB_IMG_1789831319399_ac126220')
    ? `\n    <meta property="og:image:width" content="1254" />\n    <meta property="og:image:height" content="1254" />`
    : ogImage.includes('/icons/logo-512.png')
      ? `\n    <meta property="og:image:width" content="512" />\n    <meta property="og:image:height" content="512" />`
      : '';

  const thumbnailUrl = isOfficialSquareLogo ? `${baseUrl}/icons/logo-512.png` : ogImage;

  const metaBlock = `
    <title>${escHtml(pageTitle)}</title>
    <meta name="description" content="${escHtml(pageDesc)}" />
    <meta name="keywords" content="${escHtml(pageKeywords)}" />
    <meta name="robots" content="${escHtml(robotsContent)}" />
    <link rel="canonical" href="${escHtml(canonicalUrl)}" />
    ${iconLinksHtml}
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta property="og:type" content="${ogType}" />
    <meta property="og:locale" content="ar_EG" />
    <meta property="og:site_name" content="${escHtml(siteName)}" />
    <meta property="og:url" content="${escHtml(canonicalUrl)}" />
    <meta property="og:title" content="${escHtml(pageTitle)}" />
    <meta property="og:description" content="${escHtml(pageDesc)}" />
    <meta property="og:image" content="${ogImgEsc}" />${
      ogImage.startsWith('https://') ? `\n    <meta property="og:image:secure_url" content="${ogImgEsc}" />` : ''
    }
    <meta property="og:image:type" content="${escHtml(ogImageMime)}" />${ogDimsHtml}
    <meta property="og:image:alt" content="${escHtml(ogImageAlt)}" />
    <meta name="thumbnail" content="${escHtml(thumbnailUrl)}" />${extraMeta}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escHtml(pageTitle)}" />
    <meta name="twitter:description" content="${escHtml(pageDesc)}" />
    <meta name="twitter:image" content="${ogImgEsc}" />
    <meta name="twitter:image:alt" content="${escHtml(ogImageAlt)}" />
    <script type="application/ld+json">${safeSchemaJson}</script>
  `;

  let outputHtml = html
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta[^>]+name="description"[^>]*>/gi, '')
    .replace(/<meta[^>]+name="keywords"[^>]*>/gi, '')
    .replace(/<meta[^>]+name="robots"[^>]*>/gi, '')
    .replace(/<meta[^>]+name="thumbnail"[^>]*>/gi, '')
    .replace(/<meta[^>]+property="og:[^"]+"[^>]*>/gi, '')
    .replace(/<meta[^>]+property="article:[^"]+"[^>]*>/gi, '')
    .replace(/<meta[^>]+name="twitter:[^"]+"[^>]*>/gi, '')
    .replace(/<link[^>]+rel="canonical"[^>]*>/gi, '')
    .replace(/<link[^>]+rel="icon"[^>]*>/gi, '')
    .replace(/<link[^>]+rel="shortcut icon"[^>]*>/gi, '')
    .replace(/<link[^>]+rel="apple-touch-icon"[^>]*>/gi, '')
    .replace(/<link[^>]+rel="manifest"[^>]*>/gi, '')
    .replace(/<script[^>]+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace('</head>', `${metaBlock}\n  </head>`);

  const isNoindex = robotsContent.includes('noindex');
  if (!isNoindex) {
    const ssrFallback = buildSsrFallbackHtml(cleanPath, pageTitle, pageDesc, settings);
    if (ssrFallback) {
      outputHtml = outputHtml.replace('<div id="root"></div>', `<div id="root">${ssrFallback}</div>`);
    }
  }

  return { html: outputHtml, noindex: isNoindex };
}

async function startServer() {
  try {
    syncPublicSeoFiles();
  } catch (err) {
    console.warn('SEO file sync warning:', err);
  }

  // Return clean 404 JSON for unmatched API routes before SPA HTML fallback
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'نقطة النهاية غير موجودة' });
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom'
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/uploads')) {
        next();
        return;
      }
      try {
        const template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');
        const transformed = await vite.transformIndexHtml(req.originalUrl, template);
        const { html, noindex } = injectDynamicSeoAndOpenGraph(transformed, req);
        res
          .status(200)
          .set({
            'Content-Type': 'text/html; charset=utf-8',
            'X-Robots-Tag': noindex ? 'noindex, nofollow' : 'index, follow'
          })
          .end(html);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    const publicDir = path.resolve(process.cwd(), 'public');
    const htmlPath = path.join(distDir, 'index.html');
    const cachedProdHtml = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf8') : '';

    app.use(express.static(distDir, { index: false }));
    if (fs.existsSync(publicDir)) {
      app.use(express.static(publicDir, { index: false }));
    }
    app.get('*', (req, res) => {
      const baseHtml = cachedProdHtml || (fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf8') : '');
      if (!baseHtml) {
        res.status(503).type('text/plain; charset=utf-8').send('Application build not found.');
        return;
      }
      let html = baseHtml;
      let noindex = false;
      try {
        const rendered = injectDynamicSeoAndOpenGraph(baseHtml, req);
        html = rendered.html;
        noindex = rendered.noindex;
      } catch (err) {
        console.warn('SEO injection fallback:', err);
      }
      res
        .status(200)
        .set({
          'Content-Type': 'text/html; charset=utf-8',
          'X-Robots-Tag': noindex ? 'noindex, nofollow' : 'index, follow'
        })
        .end(html);
    });
  }

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled server error:', err);
    if (res.headersSent) return;
    res.status(err?.status || 500).json({ error: 'حدث خطأ غير متوقع في الخادم' });
  });

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Safe Digital Generation platform running at http://0.0.0.0:${PORT}`);
  });

  const shutdown = () => {
    server.close(() => {
      try {
        db.close();
      } catch {
        // Ignore if already closed
      }
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 2000).unref();
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

startServer();
