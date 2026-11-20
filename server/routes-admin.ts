import { Router, type Response } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { GoogleGenAI, Type } from '@google/genai';
import { db, generateSafeCode, generateNextMemberNumber } from './db.ts';
import {
  type AuthedRequest,
  PERMISSION_GROUPS,
  ROLE_PERMISSIONS,
  logAudit,
  requireAnyPermission,
  requireAuth,
  requirePermission,
  requireSuperAdmin
} from './auth.ts';
import { syncPublicSeoFiles } from './seo.ts';

const router = Router();
router.use(requireAuth);

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const folder = String((req.query.folder as string) || 'images').replace(/[^a-z0-9_-]/gi, '');
    const allowed = ['images', 'logos', 'avatars', 'documents', 'media'];
    const safeFolder = allowed.includes(folder) ? folder : 'images';
    cb(null, path.resolve(process.cwd(), 'uploads', safeFolder));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '') || '.bin';
    const name = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
      'application/pdf',
      'video/mp4',
      'video/webm'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مدعوم'));
    }
  }
});

// Upload any image/document/video from Admin
router.post('/upload', (req: AuthedRequest, res: Response) => {
  if (!req.user?.adminRole) {
    res.status(403).json({ error: 'ممنوع' });
    return;
  }
  upload.single('file')(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err.message || 'فشل رفع الملف' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'لم يتم إرفاق أي ملف' });
      return;
    }
    const folder = path.basename(path.dirname(req.file.path));
    const url = `/uploads/${folder}/${req.file.filename}`;
    logAudit(req, 'upload_file', 'media', req.file.filename, { url, size: req.file.size });
    res.json({ url, filename: req.file.filename, size: req.file.size, mimetype: req.file.mimetype });
  });
});

// Dashboard overview
router.get('/dashboard', requirePermission('dashboard'), (_req: AuthedRequest, res: Response) => {
  const counts = {
    totalMembers: (db.prepare('SELECT COUNT(*) as c FROM members').get() as { c: number }).c,
    activeMembers: (db.prepare("SELECT COUNT(*) as c FROM members WHERE status = 'active'").get() as { c: number }).c,
    pendingApplications: (db.prepare("SELECT COUNT(*) as c FROM membership_applications WHERE status = 'pending'").get() as { c: number }).c,
    totalApplications: (db.prepare('SELECT COUNT(*) as c FROM membership_applications').get() as { c: number }).c,
    totalEvents: (db.prepare('SELECT COUNT(*) as c FROM events').get() as { c: number }).c,
    totalTrainings: (db.prepare('SELECT COUNT(*) as c FROM trainings').get() as { c: number }).c,
    totalNews: (db.prepare('SELECT COUNT(*) as c FROM news').get() as { c: number }).c,
    totalCommittees: (db.prepare('SELECT COUNT(*) as c FROM committees').get() as { c: number }).c,
    totalPartners: (db.prepare('SELECT COUNT(*) as c FROM partners').get() as { c: number }).c,
    totalCertificates: (db.prepare('SELECT COUNT(*) as c FROM certificates').get() as { c: number }).c,
    totalCards: (db.prepare('SELECT COUNT(*) as c FROM membership_cards').get() as { c: number }).c,
    totalProjects: (db.prepare('SELECT COUNT(*) as c FROM projects').get() as { c: number }).c,
    unreadContacts: (db.prepare("SELECT COUNT(*) as c FROM contact_messages WHERE status = 'new'").get() as { c: number }).c
  };

  const recentApplications = db
    .prepare(
      `SELECT a.*, c.name_ar as preferred_committee_name
       FROM membership_applications a
       LEFT JOIN committees c ON c.id = a.preferred_committee_id
       ORDER BY a.created_at DESC LIMIT 6`
    )
    .all();

  const recentLogs = db
    .prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10')
    .all();

  const committeeDistribution = db
    .prepare(
      `SELECT c.name_ar, COUNT(m.id) as members_count
       FROM committees c
       LEFT JOIN members m ON m.committee_id = c.id
       GROUP BY c.id
       ORDER BY c.sort_order ASC`
    )
    .all();

  res.json({ counts, recentApplications, recentLogs, committeeDistribution });
});

// ==================== APPLICATIONS ====================
router.get('/applications', requirePermission('applications'), (req: AuthedRequest, res: Response) => {
  const status = req.query.status ? String(req.query.status) : '';
  const search = req.query.search ? `%${String(req.query.search).trim()}%` : '';
  let sql = `
    SELECT a.*, c1.name_ar as preferred_committee_name, c2.name_ar as assigned_committee_name
    FROM membership_applications a
    LEFT JOIN committees c1 ON c1.id = a.preferred_committee_id
    LEFT JOIN committees c2 ON c2.id = a.assigned_committee_id
    WHERE 1=1
  `;
  const params: unknown[] = [];
  if (status) {
    sql += ' AND a.status = ?';
    params.push(status);
  }
  if (search) {
    sql += ' AND (a.full_name LIKE ? OR a.application_number LIKE ? OR a.email LIKE ? OR a.phone LIKE ?)';
    params.push(search, search, search, search);
  }
  sql += ' ORDER BY a.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

router.patch('/applications/:id', requirePermission('applications'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const appRow = db.prepare('SELECT * FROM membership_applications WHERE id = ?').get(id) as any;
  if (!appRow) {
    res.status(404).json({ error: 'الطلب غير موجود' });
    return;
  }

  const b = req.body;
  const { status, assigned_committee_id, position_title, admin_notes, issue_card } = b;
  const nextStatus = status || appRow.status;
  const committeeId =
    assigned_committee_id !== undefined
      ? assigned_committee_id
        ? Number(assigned_committee_id)
        : null
      : appRow.assigned_committee_id || appRow.preferred_committee_id;

  db.prepare(
    `UPDATE membership_applications
     SET full_name = ?, phone = ?, whatsapp = ?, email = ?, governorate = ?, area = ?,
         national_id_number = ?, qualification = ?, university_school = ?, major = ?, graduation_year = ?,
         preferred_committee_id = ?, skills = ?, experiences = ?, reason = ?,
         status = ?, assigned_committee_id = ?, admin_notes = ?, reviewed_by = ?, reviewed_at = datetime('now')
     WHERE id = ?`
  ).run(
    b.full_name ?? appRow.full_name,
    b.phone ?? appRow.phone,
    b.whatsapp ?? appRow.whatsapp,
    b.email ?? appRow.email,
    b.governorate ?? appRow.governorate,
    b.area ?? appRow.area,
    b.national_id_number ?? appRow.national_id_number,
    b.qualification ?? appRow.qualification,
    b.university_school ?? appRow.university_school,
    b.major ?? appRow.major,
    b.graduation_year ?? appRow.graduation_year,
    b.preferred_committee_id !== undefined
      ? b.preferred_committee_id
        ? Number(b.preferred_committee_id)
        : null
      : appRow.preferred_committee_id,
    b.skills ?? appRow.skills,
    b.experiences ?? appRow.experiences,
    b.reason ?? appRow.reason,
    nextStatus,
    committeeId || null,
    admin_notes ?? appRow.admin_notes,
    req.user?.email || '',
    id
  );

  const savedApp = (db.prepare('SELECT * FROM membership_applications WHERE id = ?').get(id) as any) || appRow;

  let createdMember: any = null;
  let createdCard: any = null;

  if (nextStatus === 'accepted') {
    const existingMember = db
      .prepare("SELECT * FROM members WHERE email = ? OR (phone = ? AND phone != '')")
      .get(savedApp.email, savedApp.phone) as any;

    if (!existingMember) {
      const matchedUser = db.prepare('SELECT id FROM users WHERE lower(email) = lower(?)').get(savedApp.email) as { id: number } | undefined;
      const memberNumber = generateNextMemberNumber();
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
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
          matchedUser?.id || null,
          memberNumber,
          savedApp.full_name,
          savedApp.avatar_url || '',
          savedApp.birth_date || '',
          savedApp.gender || '',
          savedApp.governorate || '',
          savedApp.area || '',
          savedApp.phone,
          savedApp.whatsapp || '',
          savedApp.email,
          savedApp.qualification || '',
          savedApp.university_school || '',
          savedApp.major || '',
          savedApp.graduation_year || '',
          savedApp.national_id_number || '',
          savedApp.national_id_front_url || '',
          savedApp.national_id_back_url || '',
          committeeId || null,
          position_title || 'عضو عامل',
          expiresAt
        );

      createdMember = db.prepare('SELECT * FROM members WHERE id = ?').get(mRes.lastInsertRowid);

      if (committeeId) {
        db.prepare(
          `INSERT INTO committee_members (committee_id, member_id, person_name, role_title, avatar_url)
           VALUES (?, ?, ?, ?, ?)`
        ).run(committeeId, createdMember.id, savedApp.full_name, position_title || 'عضو لجنة', savedApp.avatar_url || '');
      }

      if (issue_card !== false) {
        const defaultDesign = db.prepare('SELECT id FROM card_designs ORDER BY is_default DESC, id ASC LIMIT 1').get() as { id: number } | undefined;
        const cardNumber = generateSafeCode('CARD');
        const qrToken = crypto.randomBytes(12).toString('hex');
        const cRes = db
          .prepare(
            `INSERT INTO membership_cards (member_id, card_number, design_id, issue_date, expiry_date, status, qr_token, issued_by)
             VALUES (?, ?, ?, date('now'), ?, 'active', ?, ?)`
          )
          .run(createdMember.id, cardNumber, defaultDesign?.id || null, expiresAt, qrToken, req.user?.email || '');
        createdCard = db.prepare('SELECT * FROM membership_cards WHERE id = ?').get(cRes.lastInsertRowid);
      }
    }
  }

  const notifTitle =
    nextStatus === 'accepted'
      ? 'تم قبول طلب العضوية في مبادرة جيل رقمي آمن'
      : nextStatus === 'rejected'
        ? 'تحديث بشأن طلب العضوية'
        : 'مطلوب استكمال بيانات طلب العضوية';
  const notifMessage =
    nextStatus === 'accepted'
      ? `تهانينا ${savedApp.full_name}! تم قبول طلبك رقم ${savedApp.application_number}${createdMember ? ` وإصدار رقم العضوية ${createdMember.member_number}` : ''}.`
      : admin_notes || `حالة طلبك (${savedApp.application_number}) أصبحت: ${nextStatus}`;

  db.prepare(
    `INSERT INTO notifications (target_email, title_ar, message_ar, ref_type, ref_id)
     VALUES (?, ?, ?, 'application', ?)`
  ).run(savedApp.email, notifTitle, notifMessage, savedApp.application_number);

  logAudit(req, `application_${nextStatus}`, 'membership_application', id, {
    application_number: appRow.application_number,
    committeeId,
    createdMember: createdMember?.member_number
  });

  res.json({ success: true, member: createdMember, card: createdCard });
});

router.delete('/applications/:id', requirePermission('applications'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM membership_applications WHERE id = ?').run(id);
  logAudit(req, 'delete', 'membership_application', id);
  res.json({ success: true });
});

// ==================== JOIN FORM QUESTIONS ====================
router.get('/join-questions', requirePermission('applications'), (_req: AuthedRequest, res: Response) => {
  res.json(db.prepare('SELECT * FROM join_questions ORDER BY sort_order ASC, id ASC').all());
});

router.post('/join-questions', requirePermission('applications'), (req: AuthedRequest, res: Response) => {
  const b = req.body;
  if (!b.question_ar) {
    res.status(400).json({ error: 'نص السؤال مطلوب' });
    return;
  }
  const opts = Array.isArray(b.options)
    ? JSON.stringify(b.options)
    : typeof b.options_text === 'string'
      ? JSON.stringify(b.options_text.split('\n').map((s: string) => s.trim()).filter(Boolean))
      : '[]';
  const info = db
    .prepare(
      `INSERT INTO join_questions (question_ar, question_en, field_type, options_json, placeholder_ar, is_required, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      String(b.question_ar).trim(),
      b.question_en || '',
      b.field_type || 'text',
      opts,
      b.placeholder_ar || '',
      b.is_required ? 1 : 0,
      Number(b.sort_order || 0),
      b.is_active !== false ? 1 : 0
    );
  logAudit(req, 'create', 'join_question', info.lastInsertRowid);
  res.json(db.prepare('SELECT * FROM join_questions WHERE id = ?').get(info.lastInsertRowid));
});

router.patch('/join-questions/:id', requirePermission('applications'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM join_questions WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ error: 'السؤال غير موجود' });
    return;
  }
  const b = req.body;
  const opts = Array.isArray(b.options)
    ? JSON.stringify(b.options)
    : typeof b.options_text === 'string'
      ? JSON.stringify(b.options_text.split('\n').map((s: string) => s.trim()).filter(Boolean))
      : existing.options_json;
  db.prepare(
    `UPDATE join_questions SET question_ar = ?, question_en = ?, field_type = ?, options_json = ?,
      placeholder_ar = ?, is_required = ?, sort_order = ?, is_active = ? WHERE id = ?`
  ).run(
    b.question_ar ?? existing.question_ar,
    b.question_en ?? existing.question_en,
    b.field_type ?? existing.field_type,
    opts,
    b.placeholder_ar ?? existing.placeholder_ar,
    b.is_required !== undefined ? (b.is_required ? 1 : 0) : existing.is_required,
    b.sort_order !== undefined ? Number(b.sort_order) : existing.sort_order,
    b.is_active !== undefined ? (b.is_active ? 1 : 0) : existing.is_active,
    id
  );
  logAudit(req, 'update', 'join_question', id);
  res.json(db.prepare('SELECT * FROM join_questions WHERE id = ?').get(id));
});

router.delete('/join-questions/:id', requirePermission('applications'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM join_questions WHERE id = ?').run(id);
  logAudit(req, 'delete', 'join_question', id);
  res.json({ success: true });
});

// ==================== MEMBERS ====================
router.get('/members', requirePermission('members'), (req: AuthedRequest, res: Response) => {
  const search = req.query.search ? `%${String(req.query.search).trim()}%` : '';
  const status = req.query.status ? String(req.query.status) : '';
  const committeeId = req.query.committee_id ? Number(req.query.committee_id) : 0;
  let sql = `
    SELECT m.*, c.name_ar as committee_name,
      (CASE WHEN m.user_id IS NOT NULL OR EXISTS(SELECT 1 FROM users u WHERE lower(u.email) = lower(m.email) AND m.email != '') THEN 1 ELSE 0 END) as has_account,
      (SELECT card_number FROM membership_cards mc WHERE mc.member_id = m.id ORDER BY mc.id DESC LIMIT 1) as card_number,
      (SELECT status FROM membership_cards mc WHERE mc.member_id = m.id ORDER BY mc.id DESC LIMIT 1) as card_status
    FROM members m
    LEFT JOIN committees c ON c.id = m.committee_id
    WHERE 1=1
  `;
  const params: unknown[] = [];
  if (search) {
    sql += ' AND (m.full_name LIKE ? OR m.member_number LIKE ? OR m.email LIKE ? OR m.phone LIKE ?)';
    params.push(search, search, search, search);
  }
  if (status) {
    sql += ' AND m.status = ?';
    params.push(status);
  }
  if (committeeId) {
    sql += ' AND m.committee_id = ?';
    params.push(committeeId);
  }
  sql += ' ORDER BY m.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

router.post('/members', requirePermission('members:create'), (req: AuthedRequest, res: Response) => {
  const b = req.body;
  if (!b.full_name) {
    res.status(400).json({ error: 'الاسم مطلوب' });
    return;
  }
  const memberNumber = (b.member_number && String(b.member_number).trim()) || generateNextMemberNumber();
  const isNoExpiry = Boolean(b.no_expiry) || String(b.position_title || '').includes('رئيس المبادرة');
  const expiresAt = isNoExpiry
    ? ''
    : b.expires_at || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const info = db
    .prepare(
      `INSERT INTO members (
        member_number, full_name, full_name_en, avatar_url, birth_date, gender, governorate, area,
        phone, whatsapp, email, national_id_number, qualification, university_school, major, graduation_year,
        committee_id, position_title, status, joined_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      memberNumber,
      b.full_name,
      b.full_name_en || '',
      b.avatar_url || '',
      b.birth_date || '',
      b.gender || '',
      b.governorate || '',
      b.area || '',
      b.phone || '',
      b.whatsapp || '',
      b.email || '',
      b.national_id_number || '',
      b.qualification || '',
      b.university_school || '',
      b.major || '',
      b.graduation_year || '',
      b.committee_id ? Number(b.committee_id) : null,
      b.position_title || 'عضو عامل',
      b.status || 'active',
      b.joined_at || new Date().toISOString().slice(0, 10),
      expiresAt
    );

  if (b.committee_id) {
    db.prepare(
      `INSERT INTO committee_members (committee_id, member_id, person_name, role_title, avatar_url)
       VALUES (?, ?, ?, ?, ?)`
    ).run(Number(b.committee_id), info.lastInsertRowid, b.full_name, b.position_title || 'عضو لجنة', b.avatar_url || '');
  }

  logAudit(req, 'create', 'member', info.lastInsertRowid, { memberNumber });
  res.json(db.prepare('SELECT * FROM members WHERE id = ?').get(info.lastInsertRowid));
});

router.patch('/members/:id', requirePermission('members:edit'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM members WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ error: 'العضو غير موجود' });
    return;
  }
  const b = req.body;
  const nextMemberNumber =
    b.member_number && String(b.member_number).trim()
      ? String(b.member_number).trim()
      : existing.member_number;
  db.prepare(
    `UPDATE members SET
      member_number = ?, full_name = ?, full_name_en = ?, avatar_url = ?, birth_date = ?, gender = ?, governorate = ?, area = ?,
      phone = ?, whatsapp = ?, email = ?, national_id_number = ?, qualification = ?, university_school = ?, major = ?, graduation_year = ?,
      committee_id = ?, position_title = ?, status = ?, renewed_at = ?, expires_at = ?
     WHERE id = ?`
  ).run(
    nextMemberNumber,
    b.full_name ?? existing.full_name,
    b.full_name_en ?? existing.full_name_en,
    b.avatar_url ?? existing.avatar_url,
    b.birth_date ?? existing.birth_date,
    b.gender ?? existing.gender,
    b.governorate ?? existing.governorate,
    b.area ?? existing.area,
    b.phone ?? existing.phone,
    b.whatsapp ?? existing.whatsapp,
    b.email ?? existing.email,
    b.national_id_number ?? existing.national_id_number,
    b.qualification ?? existing.qualification,
    b.university_school ?? existing.university_school,
    b.major ?? existing.major,
    b.graduation_year ?? existing.graduation_year,
    b.committee_id !== undefined ? (b.committee_id ? Number(b.committee_id) : null) : existing.committee_id,
    b.position_title ?? existing.position_title,
    b.status ?? existing.status,
    b.renewed_at ?? existing.renewed_at,
    b.expires_at ?? existing.expires_at,
    id
  );
  logAudit(req, 'update', 'member', id, { status: b.status });
  res.json(db.prepare('SELECT * FROM members WHERE id = ?').get(id));
});

router.delete('/members/:id', requirePermission('members:delete'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM members WHERE id = ?').run(id);
  logAudit(req, 'delete', 'member', id);
  res.json({ success: true });
});

router.post('/members/:id/activate-account', requirePermission('members:edit'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(id) as any;
  if (!member) {
    res.status(404).json({ error: 'العضو غير موجود' });
    return;
  }
  const email = String(req.body.email || member.email || '').trim().toLowerCase();
  if (!email) {
    res.status(400).json({ error: 'يجب توفر بريد إلكتروني للعضو لتفعيل حسابه' });
    return;
  }
  let plainPassword = String(req.body.password || '').trim();
  if (!plainPassword) {
    plainPassword = `SDG@${crypto.randomBytes(4).toString('hex')}`;
  }
  if (plainPassword.length < 8) {
    res.status(400).json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' });
    return;
  }

  const hash = bcrypt.hashSync(plainPassword, 12);
  let targetUserId = member.user_id as number | null;
  const existingUser = targetUserId
    ? (db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId) as any)
    : (db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(email) as any);

  if (existingUser) {
    db.prepare("UPDATE users SET password_hash = ?, status = 'active' WHERE id = ?").run(hash, existingUser.id);
    targetUserId = existingUser.id;
  } else {
    const uRes = db
      .prepare("INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, 'member', 'active')")
      .run(member.full_name, email, hash);
    targetUserId = Number(uRes.lastInsertRowid);
  }

  db.prepare('UPDATE members SET user_id = ?, email = ? WHERE id = ?').run(targetUserId, email, id);
  logAudit(req, 'activate_member_account', 'member', id, { email });
  res.json({ success: true, email, password: plainPassword, user_id: targetUserId });
});

// ==================== CARDS, DESIGNS & FLEXIBLE LOGOS ====================
router.get('/cards', requirePermission('cards'), (_req: AuthedRequest, res: Response) => {
  const cards = db
    .prepare(
      `SELECT mc.*, m.full_name, m.member_number, m.national_id_number, m.governorate, m.avatar_url, m.position_title, c.name_ar as committee_name
       FROM membership_cards mc
       JOIN members m ON m.id = mc.member_id
       LEFT JOIN committees c ON c.id = m.committee_id
       ORDER BY mc.created_at DESC`
    )
    .all();
  const designs = db.prepare('SELECT * FROM card_designs ORDER BY id ASC').all();
  const logos = db.prepare('SELECT * FROM card_logos ORDER BY sort_order ASC, id ASC').all();
  res.json({ cards, designs, logos });
});

router.post('/cards/issue', requirePermission('cards'), (req: AuthedRequest, res: Response) => {
  const { member_id, design_id, expiry_date, no_expiry } = req.body;
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(Number(member_id)) as any;
  if (!member) {
    res.status(404).json({ error: 'العضو غير موجود' });
    return;
  }
  const cardNumber = generateSafeCode('CARD');
  const qrToken = crypto.randomBytes(12).toString('hex');
  const isPresident = String(member.position_title || '').includes('رئيس المبادرة') && !String(member.position_title || '').includes('نائب');
  const isPermanent = Boolean(no_expiry) || (expiry_date === '' && isPresident);
  const exp = isPermanent
    ? ''
    : expiry_date !== undefined
      ? String(expiry_date)
      : member.expires_at || (isPresident ? '' : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const info = db
    .prepare(
      `INSERT INTO membership_cards (member_id, card_number, design_id, issue_date, expiry_date, status, qr_token, issued_by)
       VALUES (?, ?, ?, date('now'), ?, 'active', ?, ?)`
    )
    .run(member.id, cardNumber, design_id ? Number(design_id) : 1, exp, qrToken, req.user?.email || '');
  logAudit(req, 'issue_card', 'membership_card', info.lastInsertRowid, { cardNumber, member_id, no_expiry: isPermanent });
  res.json(db.prepare('SELECT * FROM membership_cards WHERE id = ?').get(info.lastInsertRowid));
});

router.post('/cards/issue-leadership', requirePermission('cards'), (req: AuthedRequest, res: Response) => {
  const b = req.body;
  const fullName = String(b.full_name || '').trim();
  if (!fullName) {
    res.status(400).json({ error: 'الاسم الكامل مطلوب لإصدار الكارنيه القيادي' });
    return;
  }

  const positionTitle = String(b.position_title || 'رئيس المبادرة').trim();
  const isPresidentRole = positionTitle.includes('رئيس المبادرة') && !positionTitle.includes('نائب');
  const isNoExpiry = b.no_expiry !== undefined ? Boolean(b.no_expiry) : isPresidentRole;
  const expiryDate = isNoExpiry
    ? ''
    : String(b.expiry_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));

  const nationalId = String(b.national_id_number || '')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/\D/g, '');
  const email = String(b.email || '').trim().toLowerCase();
  const phone = String(b.phone || '').trim();

  let member =
    (nationalId ? (db.prepare('SELECT * FROM members WHERE national_id_number = ? LIMIT 1').get(nationalId) as any) : null) ||
    (email ? (db.prepare('SELECT * FROM members WHERE lower(email) = lower(?) LIMIT 1').get(email) as any) : null) ||
    (db.prepare('SELECT * FROM members WHERE trim(full_name) = ? LIMIT 1').get(fullName) as any);

  if (!member) {
    const memberNumber = (b.member_number && String(b.member_number).trim()) || generateNextMemberNumber();
    const mRes = db
      .prepare(
        `INSERT INTO members (
          member_number, full_name, avatar_url, governorate, phone, email, national_id_number,
          committee_id, position_title, status, joined_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', date('now'), ?)`
      )
      .run(
        memberNumber,
        fullName,
        b.avatar_url || '',
        b.governorate || '',
        phone,
        email,
        nationalId,
        b.committee_id ? Number(b.committee_id) : null,
        positionTitle,
        expiryDate
      );
    member = db.prepare('SELECT * FROM members WHERE id = ?').get(mRes.lastInsertRowid);
  } else {
    db.prepare(
      `UPDATE members SET
        full_name = ?,
        avatar_url = COALESCE(NULLIF(?, ''), avatar_url),
        governorate = COALESCE(NULLIF(?, ''), governorate),
        phone = COALESCE(NULLIF(?, ''), phone),
        email = COALESCE(NULLIF(?, ''), email),
        national_id_number = COALESCE(NULLIF(?, ''), national_id_number),
        position_title = ?,
        status = 'active',
        expires_at = ?
       WHERE id = ?`
    ).run(
      fullName,
      b.avatar_url || '',
      b.governorate || '',
      phone,
      email,
      nationalId,
      positionTitle,
      expiryDate,
      member.id
    );
    member = db.prepare('SELECT * FROM members WHERE id = ?').get(member.id);
  }

  const cardNumber = generateSafeCode('CARD');
  const qrToken = crypto.randomBytes(12).toString('hex');
  const designId = b.design_id ? Number(b.design_id) : 1;
  const cRes = db
    .prepare(
      `INSERT INTO membership_cards (member_id, card_number, design_id, issue_date, expiry_date, status, qr_token, issued_by)
       VALUES (?, ?, ?, date('now'), ?, 'active', ?, ?)`
    )
    .run(member.id, cardNumber, designId, expiryDate, qrToken, req.user?.email || '');

  const card = db
    .prepare(
      `SELECT mc.*, m.full_name, m.member_number, m.national_id_number, m.governorate, m.avatar_url, m.position_title, c.name_ar as committee_name
       FROM membership_cards mc
       JOIN members m ON m.id = mc.member_id
       LEFT JOIN committees c ON c.id = m.committee_id
       WHERE mc.id = ?`
    )
    .get(cRes.lastInsertRowid);

  logAudit(req, 'issue_leadership_card', 'membership_card', cRes.lastInsertRowid, {
    cardNumber,
    fullName,
    positionTitle,
    no_expiry: isNoExpiry
  });

  res.status(201).json({ card, member });
});

router.patch('/cards/:id', requirePermission('cards'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM membership_cards WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ error: 'الكارنيه غير موجود' });
    return;
  }
  const b = req.body;
  const { status, expiry_date, issue_date, card_number, design_id } = b;
  db.prepare(
    'UPDATE membership_cards SET card_number = ?, issue_date = ?, status = ?, expiry_date = ?, design_id = ? WHERE id = ?'
  ).run(
    card_number !== undefined && String(card_number).trim() ? String(card_number).trim() : existing.card_number,
    issue_date !== undefined && String(issue_date).trim() ? String(issue_date).trim() : existing.issue_date,
    status ?? existing.status,
    expiry_date !== undefined ? String(expiry_date) : existing.expiry_date,
    design_id !== undefined ? Number(design_id) : existing.design_id,
    id
  );

  // Also allow updating cardholder member profile fields directly when edited from the Cards section
  if (
    existing.member_id &&
    (b.full_name !== undefined ||
      b.position_title !== undefined ||
      b.national_id_number !== undefined ||
      b.governorate !== undefined ||
      b.committee_id !== undefined ||
      b.avatar_url !== undefined)
  ) {
    const memberRow = db.prepare('SELECT * FROM members WHERE id = ?').get(existing.member_id) as any;
    if (memberRow) {
      db.prepare(
        `UPDATE members SET full_name = ?, position_title = ?, national_id_number = ?, governorate = ?, committee_id = ?, avatar_url = ? WHERE id = ?`
      ).run(
        b.full_name !== undefined ? String(b.full_name).trim() : memberRow.full_name,
        b.position_title !== undefined ? String(b.position_title).trim() : memberRow.position_title,
        b.national_id_number !== undefined ? String(b.national_id_number).trim() : memberRow.national_id_number,
        b.governorate !== undefined ? String(b.governorate).trim() : memberRow.governorate,
        b.committee_id !== undefined ? (b.committee_id ? Number(b.committee_id) : null) : memberRow.committee_id,
        b.avatar_url !== undefined ? String(b.avatar_url) : memberRow.avatar_url,
        memberRow.id
      );
    }
  }

  logAudit(req, 'update', 'membership_card', id, { status, expiry_date, card_number });
  const updated = db
    .prepare(
      `SELECT mc.*, m.full_name, m.member_number, m.national_id_number, m.governorate, m.avatar_url, m.position_title, m.committee_id, c.name_ar as committee_name
       FROM membership_cards mc
       JOIN members m ON m.id = mc.member_id
       LEFT JOIN committees c ON c.id = m.committee_id
       WHERE mc.id = ?`
    )
    .get(id);
  res.json(updated);
});

router.delete('/cards/:id', requirePermission('cards'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM membership_cards WHERE id = ?').run(id);
  logAudit(req, 'delete', 'membership_card', id);
  res.json({ success: true });
});

router.patch('/card-designs/:id', requirePermission('cards'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM card_designs WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ error: 'التصميم غير موجود' });
    return;
  }
  const b = req.body;
  const extraRowsJson =
    b.extra_rows_json !== undefined
      ? typeof b.extra_rows_json === 'string'
        ? b.extra_rows_json
        : JSON.stringify(b.extra_rows_json)
      : existing.extra_rows_json || '[]';

  db.prepare(
    `UPDATE card_designs SET
      name = ?, card_type = ?, front_bg = ?, back_bg = ?, accent_color = ?, text_color = ?,
      orientation = ?, show_expiry = ?, footer_note_ar = ?,
      header_title_ar = ?, header_title_en = ?, header_subtitle_ar = ?, card_badge_ar = ?,
      side_slogan_ar = ?, verify_badge_ar = ?, vp_title_ar = ?, vp_names_ar = ?,
      president_title_ar = ?, president_name_ar = ?, president_signature_url = ?, president_signature_text = ?,
      stamp_url = ?, show_stamp = ?, stamp_position = ?, whatsapp_number = ?,
      back_title_ar = ?, back_slogan_ar = ?,
      extra_rows_json = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    b.name ?? existing.name,
    b.card_type ?? existing.card_type,
    b.front_bg ?? existing.front_bg,
    b.back_bg ?? existing.back_bg,
    b.accent_color ?? existing.accent_color,
    b.text_color ?? existing.text_color,
    b.orientation ?? existing.orientation,
    b.show_expiry !== undefined ? (b.show_expiry ? 1 : 0) : existing.show_expiry,
    b.footer_note_ar ?? existing.footer_note_ar,
    b.header_title_ar ?? existing.header_title_ar ?? 'جيل رقمي آمن',
    b.header_title_en ?? existing.header_title_en ?? 'SAFE DIGITAL GENERATION',
    b.header_subtitle_ar ?? existing.header_subtitle_ar ?? 'معًا لمستقبل رقمي آمن',
    b.card_badge_ar ?? existing.card_badge_ar ?? 'كارنيه عضوية',
    b.side_slogan_ar ?? existing.side_slogan_ar ?? 'جيل واعٍ .. مجتمع أكثر أماناً',
    b.verify_badge_ar ?? existing.verify_badge_ar ?? 'تحقق من صحة الكارنيه',
    b.vp_title_ar ?? existing.vp_title_ar ?? 'نائب رئيس المبادرة',
    b.vp_names_ar ?? existing.vp_names_ar ?? 'د. داليا نصار\nأ. أحمد نصار\nأ. أماني عبد الفتاح',
    b.president_title_ar ?? existing.president_title_ar ?? 'رئيس المبادرة',
    b.president_name_ar ?? existing.president_name_ar ?? 'أ. معاذ الشرقاوي',
    b.president_signature_url ?? existing.president_signature_url ?? '',
    b.president_signature_text ?? existing.president_signature_text ?? '',
    b.stamp_url !== undefined ? b.stamp_url : existing.stamp_url ?? '/assets/aistudio/file_000000006a4c820a8bb98e0bc0a1a48d_248264a5.png',
    b.show_stamp !== undefined ? (b.show_stamp ? 1 : 0) : existing.show_stamp ?? 0,
    b.stamp_position ?? existing.stamp_position ?? 'over_signature',
    b.whatsapp_number !== undefined ? String(b.whatsapp_number) : existing.whatsapp_number ?? '01277714301',
    b.back_title_ar ?? existing.back_title_ar ?? 'شركاء النجاح والشراكات المؤسسية',
    b.back_slogan_ar ?? existing.back_slogan_ar ?? 'معاً ... نبني مجتمعاً رقمياً آمناً',
    extraRowsJson,
    id
  );
  logAudit(req, 'update', 'card_design', id, b);
  res.json(db.prepare('SELECT * FROM card_designs WHERE id = ?').get(id));
});

router.post('/card-logos', requirePermission('cards'), (req: AuthedRequest, res: Response) => {
  const b = req.body;
  if (!b.name || !b.logo_url) {
    res.status(400).json({ error: 'اسم الشعار ورابطه مطلوبان' });
    return;
  }
  const info = db
    .prepare(
      `INSERT INTO card_logos (name, logo_url, side, card_type, x_percent, y_percent, width_px, height_px, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      b.name,
      b.logo_url,
      b.side || 'front',
      b.card_type || 'all',
      Number(b.x_percent ?? 10),
      Number(b.y_percent ?? 8),
      Number(b.width_px ?? 42),
      Number(b.height_px ?? 42),
      Number(b.sort_order ?? 10),
      b.is_active !== false ? 1 : 0
    );
  logAudit(req, 'create', 'card_logo', info.lastInsertRowid, { name: b.name, side: b.side });
  res.json(db.prepare('SELECT * FROM card_logos WHERE id = ?').get(info.lastInsertRowid));
});

router.patch('/card-logos/:id', requirePermission('cards'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM card_logos WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ error: 'الشعار غير موجود' });
    return;
  }
  const b = req.body;
  db.prepare(
    `UPDATE card_logos SET
      name = ?, logo_url = ?, side = ?, card_type = ?, x_percent = ?, y_percent = ?,
      width_px = ?, height_px = ?, sort_order = ?, is_active = ?
     WHERE id = ?`
  ).run(
    b.name ?? existing.name,
    b.logo_url ?? existing.logo_url,
    b.side ?? existing.side,
    b.card_type ?? existing.card_type,
    b.x_percent !== undefined ? Number(b.x_percent) : existing.x_percent,
    b.y_percent !== undefined ? Number(b.y_percent) : existing.y_percent,
    b.width_px !== undefined ? Number(b.width_px) : existing.width_px,
    b.height_px !== undefined ? Number(b.height_px) : existing.height_px,
    b.sort_order !== undefined ? Number(b.sort_order) : existing.sort_order,
    b.is_active !== undefined ? (b.is_active ? 1 : 0) : existing.is_active,
    id
  );
  logAudit(req, 'update', 'card_logo', id, b);
  res.json(db.prepare('SELECT * FROM card_logos WHERE id = ?').get(id));
});

router.delete('/card-logos/:id', requirePermission('cards'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM card_logos WHERE id = ?').run(id);
  logAudit(req, 'delete', 'card_logo', id);
  res.json({ success: true });
});

// ==================== LEADERSHIP ====================
router.get('/leadership', requirePermission('leadership'), (_req: AuthedRequest, res: Response) => {
  res.json(
    db
      .prepare(
        `SELECT l.*, c.name_ar as committee_name
         FROM leadership l LEFT JOIN committees c ON c.id = l.committee_id
         ORDER BY l.sort_order ASC, l.id ASC`
      )
      .all()
  );
});

router.post('/leadership', requirePermission('leadership'), (req: AuthedRequest, res: Response) => {
  const b = req.body;
  const info = db
    .prepare(
      `INSERT INTO leadership (name_ar, name_en, role_ar, role_en, tier, committee_id, governorate, avatar_url, bio_ar, bio_en, joined_at, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      b.name_ar,
      b.name_en || '',
      b.role_ar,
      b.role_en || '',
      b.tier || 'board',
      b.committee_id ? Number(b.committee_id) : null,
      b.governorate || '',
      b.avatar_url || '',
      b.bio_ar || '',
      b.bio_en || '',
      b.joined_at || new Date().toISOString().slice(0, 10),
      Number(b.sort_order ?? 0),
      b.is_active !== false ? 1 : 0
    );
  logAudit(req, 'create', 'leadership', info.lastInsertRowid, { name_ar: b.name_ar });
  syncPublicSeoFiles();
  res.json(db.prepare('SELECT * FROM leadership WHERE id = ?').get(info.lastInsertRowid));
});

router.patch('/leadership/:id', requirePermission('leadership'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM leadership WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ error: 'غير موجود' });
    return;
  }
  const b = req.body;
  db.prepare(
    `UPDATE leadership SET name_ar = ?, name_en = ?, role_ar = ?, role_en = ?, tier = ?, committee_id = ?, governorate = ?,
      avatar_url = ?, bio_ar = ?, bio_en = ?, joined_at = ?, sort_order = ?, is_active = ? WHERE id = ?`
  ).run(
    b.name_ar ?? existing.name_ar,
    b.name_en ?? existing.name_en,
    b.role_ar ?? existing.role_ar,
    b.role_en ?? existing.role_en,
    b.tier ?? existing.tier,
    b.committee_id !== undefined ? (b.committee_id ? Number(b.committee_id) : null) : existing.committee_id,
    b.governorate ?? existing.governorate ?? '',
    b.avatar_url ?? existing.avatar_url,
    b.bio_ar ?? existing.bio_ar,
    b.bio_en ?? existing.bio_en,
    b.joined_at ?? existing.joined_at,
    b.sort_order !== undefined ? Number(b.sort_order) : existing.sort_order,
    b.is_active !== undefined ? (b.is_active ? 1 : 0) : existing.is_active,
    id
  );
  logAudit(req, 'update', 'leadership', id);
  syncPublicSeoFiles();
  res.json(db.prepare('SELECT * FROM leadership WHERE id = ?').get(id));
});

router.delete('/leadership/:id', requirePermission('leadership'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM leadership WHERE id = ?').run(id);
  logAudit(req, 'delete', 'leadership', id);
  syncPublicSeoFiles();
  res.json({ success: true });
});

// ==================== COMMITTEES ====================
router.get('/committees', requirePermission('committees'), (_req: AuthedRequest, res: Response) => {
  const list = db.prepare('SELECT * FROM committees ORDER BY sort_order ASC, id ASC').all() as any[];
  const membersStmt = db.prepare('SELECT * FROM committee_members WHERE committee_id = ? ORDER BY is_head DESC, id ASC');
  res.json(list.map((c) => ({ ...c, members: membersStmt.all(c.id) })));
});

router.post('/committees', requirePermission('committees'), (req: AuthedRequest, res: Response) => {
  const b = req.body;
  const slug = b.slug || `committee-${Date.now()}`;
  const info = db
    .prepare(
      `INSERT INTO committees (slug, name_ar, name_en, logo_url, description_ar, description_en, tasks_ar, head_name, head_title, deputy_head_name, coordinator_name, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      slug,
      b.name_ar,
      b.name_en || '',
      b.logo_url || '',
      b.description_ar || '',
      b.description_en || '',
      Array.isArray(b.tasks_ar) ? JSON.stringify(b.tasks_ar) : b.tasks_ar || '[]',
      b.head_name || '',
      b.head_title || 'رئيس اللجنة',
      b.deputy_head_name || '',
      b.coordinator_name || '',
      Number(b.sort_order ?? 10),
      b.is_active !== false ? 1 : 0
    );
  logAudit(req, 'create', 'committee', info.lastInsertRowid, { name_ar: b.name_ar });
  syncPublicSeoFiles();
  res.json(db.prepare('SELECT * FROM committees WHERE id = ?').get(info.lastInsertRowid));
});

router.patch('/committees/:id', requirePermission('committees'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM committees WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ error: 'اللجنة غير موجودة' });
    return;
  }
  const b = req.body;
  db.prepare(
    `UPDATE committees SET name_ar = ?, name_en = ?, logo_url = ?, description_ar = ?, description_en = ?,
      tasks_ar = ?, head_name = ?, head_title = ?, deputy_head_name = ?, coordinator_name = ?, sort_order = ?, is_active = ? WHERE id = ?`
  ).run(
    b.name_ar ?? existing.name_ar,
    b.name_en ?? existing.name_en,
    b.logo_url ?? existing.logo_url,
    b.description_ar ?? existing.description_ar,
    b.description_en ?? existing.description_en,
    b.tasks_ar !== undefined ? (Array.isArray(b.tasks_ar) ? JSON.stringify(b.tasks_ar) : b.tasks_ar) : existing.tasks_ar,
    b.head_name ?? existing.head_name,
    b.head_title ?? existing.head_title,
    b.deputy_head_name ?? existing.deputy_head_name ?? '',
    b.coordinator_name ?? existing.coordinator_name ?? '',
    b.sort_order !== undefined ? Number(b.sort_order) : existing.sort_order,
    b.is_active !== undefined ? (b.is_active ? 1 : 0) : existing.is_active,
    id
  );
  logAudit(req, 'update', 'committee', id);
  syncPublicSeoFiles();
  res.json(db.prepare('SELECT * FROM committees WHERE id = ?').get(id));
});

router.delete('/committees/:id', requirePermission('committees'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM committees WHERE id = ?').run(id);
  logAudit(req, 'delete', 'committee', id);
  syncPublicSeoFiles();
  res.json({ success: true });
});

router.post('/committees/:id/members', requirePermission('committees'), (req: AuthedRequest, res: Response) => {
  const committeeId = Number(req.params.id);
  const b = req.body;
  const info = db
    .prepare(
      `INSERT INTO committee_members (committee_id, member_id, person_name, role_title, avatar_url, bio, is_head)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(committeeId, b.member_id ? Number(b.member_id) : null, b.person_name, b.role_title || 'عضو لجنة', b.avatar_url || '', b.bio || '', b.is_head ? 1 : 0);
  if (b.is_head) {
    db.prepare('UPDATE committees SET head_name = ?, head_title = ? WHERE id = ?').run(b.person_name, b.role_title || 'رئيس اللجنة', committeeId);
  }
  logAudit(req, 'add_committee_member', 'committee_member', info.lastInsertRowid, { committeeId });
  res.json(db.prepare('SELECT * FROM committee_members WHERE id = ?').get(info.lastInsertRowid));
});

router.patch('/committee-members/:cmId', requirePermission('committees'), (req: AuthedRequest, res: Response) => {
  const cmId = Number(req.params.cmId);
  const existing = db.prepare('SELECT * FROM committee_members WHERE id = ?').get(cmId) as any;
  if (!existing) {
    res.status(404).json({ error: 'غير موجود' });
    return;
  }
  const b = req.body;
  const nextCommitteeId = b.committee_id ? Number(b.committee_id) : existing.committee_id;
  const nextName = b.person_name !== undefined ? String(b.person_name).trim() : existing.person_name;
  const nextRole = b.role_title !== undefined ? String(b.role_title).trim() : existing.role_title;
  const nextIsHead = b.is_head !== undefined ? (b.is_head ? 1 : 0) : existing.is_head;
  db.prepare('UPDATE committee_members SET committee_id = ?, person_name = ?, role_title = ?, is_head = ? WHERE id = ?').run(
    nextCommitteeId,
    nextName,
    nextRole,
    nextIsHead,
    cmId
  );
  if (nextIsHead) {
    db.prepare('UPDATE committees SET head_name = ?, head_title = ? WHERE id = ?').run(nextName, nextRole || 'رئيس اللجنة', nextCommitteeId);
  }
  if (existing.member_id && (b.committee_id || b.role_title)) {
    db.prepare('UPDATE members SET committee_id = ?, position_title = ? WHERE id = ?').run(nextCommitteeId, nextRole, existing.member_id);
  }
  logAudit(req, 'update', 'committee_member', cmId, b);
  res.json(db.prepare('SELECT * FROM committee_members WHERE id = ?').get(cmId));
});

router.delete('/committee-members/:cmId', requirePermission('committees'), (req: AuthedRequest, res: Response) => {
  const cmId = Number(req.params.cmId);
  db.prepare('DELETE FROM committee_members WHERE id = ?').run(cmId);
  logAudit(req, 'delete', 'committee_member', cmId);
  res.json({ success: true });
});

// ==================== NEWS ====================
router.get('/news', requirePermission('news'), (_req: AuthedRequest, res: Response) => {
  res.json(db.prepare('SELECT * FROM news ORDER BY published_at DESC, id DESC').all());
});

router.post('/news', requirePermission('news'), (req: AuthedRequest, res: Response) => {
  const b = req.body;
  const slugBase =
    (b.slug || b.title_en || `news-${Date.now()}`)
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF-]+/gi, '-')
      .replace(/^-|-$/g, '') || `news-${Date.now()}`;
  const slug = `${slugBase}-${crypto.randomBytes(2).toString('hex')}`;
  const galleryValue = Array.isArray(b.gallery) ? JSON.stringify(b.gallery) : typeof b.gallery_json === 'string' ? b.gallery_json : '[]';
  const info = db
    .prepare(
      `INSERT INTO news (slug, title_ar, title_en, excerpt_ar, excerpt_en, content_ar, content_en, cover_image, cover_alt, gallery_json, author_name, department_ar, category, keywords, share_image_url, logo_url, committee_id, status, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      slug,
      b.title_ar,
      b.title_en || '',
      b.excerpt_ar || '',
      b.excerpt_en || '',
      b.content_ar,
      b.content_en || '',
      b.cover_image || '',
      b.cover_alt || '',
      galleryValue,
      b.author_name || req.user?.name || 'المكتب الإعلامي',
      b.department_ar || 'مبادرة جيل رقمي آمن',
      b.category || 'أخبار المبادرة',
      b.keywords || '',
      b.share_image_url || '',
      b.logo_url || '',
      b.committee_id ? Number(b.committee_id) : null,
      b.status || 'published',
      b.published_at || new Date().toISOString()
    );
  logAudit(req, 'create', 'news', info.lastInsertRowid, { slug });
  syncPublicSeoFiles();
  res.json(db.prepare('SELECT * FROM news WHERE id = ?').get(info.lastInsertRowid));
});

router.patch('/news/:id', requirePermission('news'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM news WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ error: 'الخبر غير موجود' });
    return;
  }
  const b = req.body;
  const nextGalleryJson =
    b.gallery !== undefined
      ? JSON.stringify(Array.isArray(b.gallery) ? b.gallery : [])
      : b.gallery_json !== undefined
        ? String(b.gallery_json)
        : existing.gallery_json;
  db.prepare(
    `UPDATE news SET title_ar = ?, title_en = ?, excerpt_ar = ?, excerpt_en = ?, content_ar = ?, content_en = ?,
      cover_image = ?, cover_alt = ?, gallery_json = ?, author_name = ?, department_ar = ?, category = ?, keywords = ?,
      share_image_url = ?, logo_url = ?, committee_id = ?, status = ?, published_at = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(
    b.title_ar ?? existing.title_ar,
    b.title_en ?? existing.title_en,
    b.excerpt_ar ?? existing.excerpt_ar,
    b.excerpt_en ?? existing.excerpt_en,
    b.content_ar ?? existing.content_ar,
    b.content_en ?? existing.content_en,
    b.cover_image ?? existing.cover_image,
    b.cover_alt ?? existing.cover_alt,
    nextGalleryJson,
    b.author_name ?? existing.author_name,
    b.department_ar ?? existing.department_ar,
    b.category ?? existing.category,
    b.keywords ?? existing.keywords,
    b.share_image_url ?? existing.share_image_url,
    b.logo_url ?? existing.logo_url,
    b.committee_id !== undefined ? (b.committee_id ? Number(b.committee_id) : null) : existing.committee_id,
    b.status ?? existing.status,
    b.published_at ?? existing.published_at,
    id
  );
  logAudit(req, 'update', 'news', id);
  syncPublicSeoFiles();
  res.json(db.prepare('SELECT * FROM news WHERE id = ?').get(id));
});

router.delete('/news/:id', requirePermission('news'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM news WHERE id = ?').run(id);
  logAudit(req, 'delete', 'news', id);
  syncPublicSeoFiles();
  res.json({ success: true });
});

// ==================== EVENTS ====================
router.get('/events', requirePermission('events'), (_req: AuthedRequest, res: Response) => {
  const rows = db
    .prepare(
      `SELECT e.*, (SELECT COUNT(*) FROM event_registrations r WHERE r.event_id = e.id) as registrations_count
       FROM events e ORDER BY e.event_date DESC`
    )
    .all();
  res.json(rows);
});

router.post('/events', requirePermission('events'), (req: AuthedRequest, res: Response) => {
  const b = req.body;
  const galleryValue = Array.isArray(b.gallery) ? JSON.stringify(b.gallery) : typeof b.gallery_json === 'string' ? b.gallery_json : '[]';
  const info = db
    .prepare(
      `INSERT INTO events (title_ar, title_en, event_type, description_ar, description_en, cover_image, cover_alt, gallery_json, event_date, attendance_mode, location, location_url, organizer, partners_text, registration_url, share_image_url, logo_url, status, committee_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      b.title_ar,
      b.title_en || '',
      b.event_type || 'workshop',
      b.description_ar || '',
      b.description_en || '',
      b.cover_image || '',
      b.cover_alt || '',
      galleryValue,
      b.event_date,
      b.attendance_mode || 'onsite',
      b.location || '',
      b.location_url || '',
      b.organizer || 'مبادرة جيل رقمي آمن',
      b.partners_text || '',
      b.registration_url || '',
      b.share_image_url || '',
      b.logo_url || '',
      b.status || 'upcoming',
      b.committee_id ? Number(b.committee_id) : null
    );
  logAudit(req, 'create', 'event', info.lastInsertRowid);
  syncPublicSeoFiles();
  res.json(db.prepare('SELECT * FROM events WHERE id = ?').get(info.lastInsertRowid));
});

router.patch('/events/:id', requirePermission('events'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ error: 'النشاط غير موجود' });
    return;
  }
  const b = req.body;
  const nextGalleryJson =
    b.gallery !== undefined
      ? JSON.stringify(Array.isArray(b.gallery) ? b.gallery : [])
      : b.gallery_json !== undefined
        ? String(b.gallery_json)
        : existing.gallery_json;
  db.prepare(
    `UPDATE events SET title_ar = ?, title_en = ?, event_type = ?, description_ar = ?, description_en = ?,
      cover_image = ?, cover_alt = ?, gallery_json = ?, event_date = ?, attendance_mode = ?, location = ?, location_url = ?, organizer = ?, partners_text = ?, registration_url = ?, share_image_url = ?, logo_url = ?, status = ?, committee_id = ?
     WHERE id = ?`
  ).run(
    b.title_ar ?? existing.title_ar,
    b.title_en ?? existing.title_en,
    b.event_type ?? existing.event_type,
    b.description_ar ?? existing.description_ar,
    b.description_en ?? existing.description_en,
    b.cover_image ?? existing.cover_image,
    b.cover_alt ?? existing.cover_alt,
    nextGalleryJson,
    b.event_date ?? existing.event_date,
    b.attendance_mode ?? existing.attendance_mode ?? 'onsite',
    b.location ?? existing.location,
    b.location_url ?? existing.location_url ?? '',
    b.organizer ?? existing.organizer,
    b.partners_text ?? existing.partners_text,
    b.registration_url ?? existing.registration_url,
    b.share_image_url ?? existing.share_image_url,
    b.logo_url ?? existing.logo_url,
    b.status ?? existing.status,
    b.committee_id !== undefined ? (b.committee_id ? Number(b.committee_id) : null) : existing.committee_id,
    id
  );
  logAudit(req, 'update', 'event', id);
  syncPublicSeoFiles();
  res.json(db.prepare('SELECT * FROM events WHERE id = ?').get(id));
});

router.delete('/events/:id', requirePermission('events'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM events WHERE id = ?').run(id);
  logAudit(req, 'delete', 'event', id);
  syncPublicSeoFiles();
  res.json({ success: true });
});

router.get('/events/:id/registrations', requirePermission('events'), (req: AuthedRequest, res: Response) => {
  res.json(db.prepare('SELECT * FROM event_registrations WHERE event_id = ? ORDER BY created_at DESC').all(Number(req.params.id)));
});

// ==================== TRAININGS ====================
router.get('/trainings', requirePermission('trainings'), (_req: AuthedRequest, res: Response) => {
  res.json(db.prepare('SELECT * FROM trainings ORDER BY created_at DESC').all());
});

router.post('/trainings', requirePermission('trainings'), (req: AuthedRequest, res: Response) => {
  const b = req.body;
  const info = db
    .prepare(
      `INSERT INTO trainings (title_ar, title_en, track, trainer_name, description_ar, description_en, cover_image, start_date, hours, delivery_mode, location, location_url, seats_total, external_registration_url, registration_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      b.title_ar,
      b.title_en || '',
      b.track || 'cybersecurity',
      b.trainer_name || '',
      b.description_ar || '',
      b.description_en || '',
      b.cover_image || '',
      b.start_date || '',
      Number(b.hours ?? 12),
      b.delivery_mode || 'hybrid',
      b.location || '',
      b.location_url || '',
      Number(b.seats_total ?? 50),
      b.external_registration_url || '',
      b.registration_status || 'open'
    );
  logAudit(req, 'create', 'training', info.lastInsertRowid);
  syncPublicSeoFiles();
  res.json(db.prepare('SELECT * FROM trainings WHERE id = ?').get(info.lastInsertRowid));
});

router.patch('/trainings/:id', requirePermission('trainings'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM trainings WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ error: 'الدورة غير موجودة' });
    return;
  }
  const b = req.body;
  db.prepare(
    `UPDATE trainings SET title_ar = ?, title_en = ?, track = ?, trainer_name = ?, description_ar = ?, description_en = ?,
      cover_image = ?, start_date = ?, hours = ?, delivery_mode = ?, location = ?, location_url = ?, seats_total = ?, external_registration_url = ?, registration_status = ?
     WHERE id = ?`
  ).run(
    b.title_ar ?? existing.title_ar,
    b.title_en ?? existing.title_en,
    b.track ?? existing.track,
    b.trainer_name ?? existing.trainer_name,
    b.description_ar ?? existing.description_ar,
    b.description_en ?? existing.description_en,
    b.cover_image ?? existing.cover_image,
    b.start_date ?? existing.start_date,
    b.hours !== undefined ? Number(b.hours) : existing.hours,
    b.delivery_mode ?? existing.delivery_mode,
    b.location ?? existing.location ?? '',
    b.location_url ?? existing.location_url ?? '',
    b.seats_total !== undefined ? Number(b.seats_total) : existing.seats_total,
    b.external_registration_url ?? existing.external_registration_url,
    b.registration_status ?? existing.registration_status,
    id
  );
  logAudit(req, 'update', 'training', id);
  syncPublicSeoFiles();
  res.json(db.prepare('SELECT * FROM trainings WHERE id = ?').get(id));
});

router.delete('/trainings/:id', requirePermission('trainings'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM trainings WHERE id = ?').run(id);
  logAudit(req, 'delete', 'training', id);
  syncPublicSeoFiles();
  res.json({ success: true });
});

router.get('/trainings/:id/registrations', requirePermission('trainings'), (req: AuthedRequest, res: Response) => {
  res.json(db.prepare('SELECT * FROM training_registrations WHERE training_id = ? ORDER BY created_at DESC').all(Number(req.params.id)));
});

router.patch('/training-registrations/:regId', requirePermission('trainings'), (req: AuthedRequest, res: Response) => {
  const regId = Number(req.params.regId);
  db.prepare('UPDATE training_registrations SET status = ? WHERE id = ?').run(req.body.status, regId);
  logAudit(req, 'update', 'training_registration', regId, { status: req.body.status });
  res.json({ success: true });
});

// ==================== PROJECTS ====================
router.get('/projects', requirePermission('projects'), (_req: AuthedRequest, res: Response) => {
  res.json(db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all());
});

router.post('/projects', requirePermission('projects'), (req: AuthedRequest, res: Response) => {
  const b = req.body;
  const galleryValue = Array.isArray(b.gallery) ? JSON.stringify(b.gallery) : typeof b.gallery_json === 'string' ? b.gallery_json : '[]';
  const info = db
    .prepare(
      `INSERT INTO projects (title_ar, title_en, description_ar, description_en, objectives_ar, target_audience_ar, cover_image, cover_alt, gallery_json, execution_date, partners_text, results_ar, attendance_mode, location, location_url, external_url, share_image_url, logo_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      b.title_ar,
      b.title_en || '',
      b.description_ar || '',
      b.description_en || '',
      b.objectives_ar || '',
      b.target_audience_ar || '',
      b.cover_image || '',
      b.cover_alt || '',
      galleryValue,
      b.execution_date || '',
      b.partners_text || '',
      b.results_ar || '',
      b.attendance_mode || 'onsite',
      b.location || '',
      b.location_url || '',
      b.external_url || '',
      b.share_image_url || '',
      b.logo_url || '',
      b.status || 'active'
    );
  logAudit(req, 'create', 'project', info.lastInsertRowid);
  syncPublicSeoFiles();
  res.json(db.prepare('SELECT * FROM projects WHERE id = ?').get(info.lastInsertRowid));
});

router.patch('/projects/:id', requirePermission('projects'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ error: 'المشروع غير موجود' });
    return;
  }
  const b = req.body;
  const nextGalleryJson =
    b.gallery !== undefined
      ? JSON.stringify(Array.isArray(b.gallery) ? b.gallery : [])
      : b.gallery_json !== undefined
        ? String(b.gallery_json)
        : existing.gallery_json;
  db.prepare(
    `UPDATE projects SET title_ar = ?, title_en = ?, description_ar = ?, description_en = ?, objectives_ar = ?,
      target_audience_ar = ?, cover_image = ?, cover_alt = ?, gallery_json = ?, execution_date = ?, partners_text = ?, results_ar = ?, attendance_mode = ?, location = ?, location_url = ?, external_url = ?, share_image_url = ?, logo_url = ?, status = ? WHERE id = ?`
  ).run(
    b.title_ar ?? existing.title_ar,
    b.title_en ?? existing.title_en,
    b.description_ar ?? existing.description_ar,
    b.description_en ?? existing.description_en,
    b.objectives_ar ?? existing.objectives_ar,
    b.target_audience_ar ?? existing.target_audience_ar,
    b.cover_image ?? existing.cover_image,
    b.cover_alt ?? existing.cover_alt,
    nextGalleryJson,
    b.execution_date ?? existing.execution_date,
    b.partners_text ?? existing.partners_text,
    b.results_ar ?? existing.results_ar,
    b.attendance_mode ?? existing.attendance_mode ?? 'onsite',
    b.location ?? existing.location ?? '',
    b.location_url ?? existing.location_url ?? '',
    b.external_url ?? existing.external_url ?? '',
    b.share_image_url ?? existing.share_image_url,
    b.logo_url ?? existing.logo_url,
    b.status ?? existing.status,
    id
  );
  logAudit(req, 'update', 'project', id);
  syncPublicSeoFiles();
  res.json(db.prepare('SELECT * FROM projects WHERE id = ?').get(id));
});

router.delete('/projects/:id', requirePermission('projects'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  logAudit(req, 'delete', 'project', id);
  syncPublicSeoFiles();
  res.json({ success: true });
});

// ==================== PARTNERS & MARQUEE ====================
router.get('/partners', requirePermission('partners'), (_req: AuthedRequest, res: Response) => {
  res.json(db.prepare('SELECT * FROM partners ORDER BY marquee_order ASC, id ASC').all());
});

function normalizePartnerWebsiteUrl(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (!s || s === '/' || s === '#') return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('//')) return `https:${s}`;
  if (s.includes('.') && !s.startsWith('/')) return `https://${s}`;
  return s;
}

router.post('/partners', requirePermission('partners'), (req: AuthedRequest, res: Response) => {
  const b = req.body;
  const cleanUrl = normalizePartnerWebsiteUrl(b.website_url);
  const info = db
    .prepare(
      `INSERT INTO partners (name_ar, name_en, partner_type, description_ar, description_en, logo_url, website_url, show_in_marquee, marquee_order, is_visible)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      b.name_ar,
      b.name_en || '',
      b.partner_type || 'partner',
      b.description_ar || '',
      b.description_en || '',
      b.logo_url,
      cleanUrl,
      b.show_in_marquee !== false ? 1 : 0,
      Number(b.marquee_order ?? 10),
      b.is_visible !== false ? 1 : 0
    );
  db.prepare('INSERT INTO partner_logos (partner_id, label, logo_url, sort_order) VALUES (?, ?, ?, ?)').run(
    info.lastInsertRowid,
    b.name_ar,
    b.logo_url,
    Number(b.marquee_order ?? 10)
  );
  logAudit(req, 'create', 'partner', info.lastInsertRowid, { name_ar: b.name_ar, website_url: cleanUrl });
  syncPublicSeoFiles();
  res.json(db.prepare('SELECT * FROM partners WHERE id = ?').get(info.lastInsertRowid));
});

router.patch('/partners/:id', requirePermission('partners'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM partners WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ error: 'الشريك غير موجود' });
    return;
  }
  const b = req.body;
  const nextWebsiteUrl = b.website_url !== undefined ? normalizePartnerWebsiteUrl(b.website_url) : existing.website_url;
  const nextNameAr = b.name_ar ?? existing.name_ar;
  const nextLogoUrl = b.logo_url ?? existing.logo_url;
  const nextOrder = b.marquee_order !== undefined ? Number(b.marquee_order) : existing.marquee_order;

  db.prepare(
    `UPDATE partners SET name_ar = ?, name_en = ?, partner_type = ?, description_ar = ?, description_en = ?,
      logo_url = ?, website_url = ?, show_in_marquee = ?, marquee_order = ?, is_visible = ? WHERE id = ?`
  ).run(
    nextNameAr,
    b.name_en ?? existing.name_en,
    b.partner_type ?? existing.partner_type,
    b.description_ar ?? existing.description_ar,
    b.description_en ?? existing.description_en,
    nextLogoUrl,
    nextWebsiteUrl,
    b.show_in_marquee !== undefined ? (b.show_in_marquee ? 1 : 0) : existing.show_in_marquee,
    nextOrder,
    b.is_visible !== undefined ? (b.is_visible ? 1 : 0) : existing.is_visible,
    id
  );
  db.prepare('UPDATE partner_logos SET label = ?, logo_url = ?, sort_order = ? WHERE partner_id = ?').run(
    nextNameAr,
    nextLogoUrl,
    nextOrder,
    id
  );
  logAudit(req, 'update', 'partner', id, b);
  syncPublicSeoFiles();
  res.json(db.prepare('SELECT * FROM partners WHERE id = ?').get(id));
});

router.delete('/partners/:id', requirePermission('partners'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM partners WHERE id = ?').run(id);
  logAudit(req, 'delete', 'partner', id);
  syncPublicSeoFiles();
  res.json({ success: true });
});

router.patch('/marquee-settings', requirePermission('partners'), (req: AuthedRequest, res: Response) => {
  const { marquee_enabled, marquee_speed, marquee_direction, marquee_color_mode } = req.body;
  const upsert = db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))");
  if (marquee_enabled !== undefined) upsert.run('marquee_enabled', String(Boolean(marquee_enabled)));
  if (marquee_speed !== undefined) upsert.run('marquee_speed', String(Math.max(8, Math.min(120, Number(marquee_speed)))));
  if (marquee_direction !== undefined) upsert.run('marquee_direction', marquee_direction === 'ltr' ? 'ltr' : 'rtl');
  if (marquee_color_mode !== undefined) upsert.run('marquee_color_mode', marquee_color_mode === 'white' ? 'white' : 'color');
  logAudit(req, 'update_marquee', 'settings', 'marquee', req.body);
  res.json({ success: true });
});

// ==================== MEDIA / ALBUMS & GALLERY ====================
router.get('/media', requirePermission('media'), (_req: AuthedRequest, res: Response) => {
  const albums = db.prepare('SELECT * FROM albums ORDER BY created_at DESC').all();
  const items = db
    .prepare(
      `SELECT g.*, a.title_ar as album_title
       FROM gallery g LEFT JOIN albums a ON a.id = g.album_id
       ORDER BY g.created_at DESC, g.id DESC`
    )
    .all();
  const newsEntities = db.prepare('SELECT id, title_ar, cover_image FROM news ORDER BY id DESC').all();
  const projectEntities = db.prepare('SELECT id, title_ar, cover_image FROM projects ORDER BY id DESC').all();
  const eventEntities = db.prepare('SELECT id, title_ar, cover_image FROM events ORDER BY id DESC').all();
  res.json({ albums, items, entities: { news: newsEntities, projects: projectEntities, events: eventEntities } });
});

router.post('/albums', requirePermission('media'), (req: AuthedRequest, res: Response) => {
  const b = req.body;
  const info = db
    .prepare('INSERT INTO albums (title_ar, title_en, category, description_ar, cover_image) VALUES (?, ?, ?, ?, ?)')
    .run(b.title_ar, b.title_en || '', b.category || 'events', b.description_ar || '', b.cover_image || '');
  logAudit(req, 'create', 'album', info.lastInsertRowid);
  res.json(db.prepare('SELECT * FROM albums WHERE id = ?').get(info.lastInsertRowid));
});

router.patch('/albums/:id', requirePermission('media'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM albums WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ error: 'الألبوم غير موجود' });
    return;
  }
  const b = req.body;
  db.prepare('UPDATE albums SET title_ar = ?, title_en = ?, category = ?, description_ar = ?, cover_image = ? WHERE id = ?').run(
    b.title_ar ?? existing.title_ar,
    b.title_en ?? existing.title_en,
    b.category ?? existing.category,
    b.description_ar ?? existing.description_ar,
    b.cover_image ?? existing.cover_image,
    id
  );
  logAudit(req, 'update', 'album', id);
  res.json(db.prepare('SELECT * FROM albums WHERE id = ?').get(id));
});

router.delete('/albums/:id', requirePermission('media'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM albums WHERE id = ?').run(id);
  logAudit(req, 'delete', 'album', id);
  res.json({ success: true });
});

router.post('/gallery', requirePermission('media'), (req: AuthedRequest, res: Response) => {
  const b = req.body;
  const entityType = ['news', 'project', 'event'].includes(String(b.entity_type)) ? String(b.entity_type) : 'none';
  const entityId = entityType !== 'none' && b.entity_id ? Number(b.entity_id) : null;
  const info = db
    .prepare(
      `INSERT INTO gallery (album_id, media_type, title_ar, title_en, url, thumbnail_url, event_date, caption_ar, alt_text, entity_type, entity_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      b.album_id ? Number(b.album_id) : null,
      b.media_type || 'image',
      b.title_ar,
      b.title_en || '',
      b.url,
      b.thumbnail_url || b.url,
      b.event_date || new Date().toISOString().slice(0, 10),
      b.caption_ar || '',
      b.alt_text || b.title_ar || '',
      entityType,
      entityId
    );
  logAudit(req, 'create', 'gallery', info.lastInsertRowid);
  syncPublicSeoFiles();
  res.json(db.prepare('SELECT * FROM gallery WHERE id = ?').get(info.lastInsertRowid));
});

router.patch('/gallery/:id', requirePermission('media'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM gallery WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ error: 'العنصر غير موجود' });
    return;
  }
  const b = req.body;
  const entityType =
    b.entity_type !== undefined
      ? ['news', 'project', 'event'].includes(String(b.entity_type))
        ? String(b.entity_type)
        : 'none'
      : existing.entity_type || 'none';
  const entityId =
    entityType === 'none'
      ? null
      : b.entity_id !== undefined
        ? b.entity_id
          ? Number(b.entity_id)
          : null
        : existing.entity_id;

  db.prepare(
    `UPDATE gallery SET album_id = ?, media_type = ?, title_ar = ?, title_en = ?, url = ?, thumbnail_url = ?,
      event_date = ?, caption_ar = ?, alt_text = ?, entity_type = ?, entity_id = ? WHERE id = ?`
  ).run(
    b.album_id !== undefined ? (b.album_id ? Number(b.album_id) : null) : existing.album_id,
    b.media_type ?? existing.media_type,
    b.title_ar ?? existing.title_ar,
    b.title_en ?? existing.title_en,
    b.url ?? existing.url,
    b.thumbnail_url ?? (b.url || existing.thumbnail_url),
    b.event_date ?? existing.event_date,
    b.caption_ar ?? existing.caption_ar,
    b.alt_text ?? existing.alt_text,
    entityType,
    entityId,
    id
  );
  logAudit(req, 'update', 'gallery', id);
  res.json(db.prepare('SELECT * FROM gallery WHERE id = ?').get(id));
});

router.post('/gallery/:id/set-cover', requirePermission('media'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const item = db.prepare('SELECT * FROM gallery WHERE id = ?').get(id) as any;
  if (!item) {
    res.status(404).json({ error: 'العنصر غير موجود' });
    return;
  }
  const targetType = String(req.body.entity_type || item.entity_type || '');
  const targetId = Number(req.body.entity_id || item.entity_id || 0);
  if (!targetId || !['news', 'project', 'event'].includes(targetType)) {
    res.status(400).json({ error: 'اختر الخبر أو المبادرة أو الفعالية لتعيين الصورة الرئيسية لها' });
    return;
  }
  const table = targetType === 'news' ? 'news' : targetType === 'project' ? 'projects' : 'events';
  db.prepare(`UPDATE ${table} SET cover_image = ?, cover_alt = ? WHERE id = ?`).run(
    item.url,
    item.alt_text || item.title_ar || '',
    targetId
  );
  db.prepare('UPDATE gallery SET entity_type = ?, entity_id = ? WHERE id = ?').run(targetType, targetId, id);
  logAudit(req, 'set_entity_cover', targetType, targetId, { galleryId: id, url: item.url });
  res.json({ success: true, entity_type: targetType, entity_id: targetId, cover_image: item.url });
});

router.delete('/gallery/:id', requirePermission('media'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM gallery WHERE id = ?').run(id);
  logAudit(req, 'delete', 'gallery', id);
  syncPublicSeoFiles();
  res.json({ success: true });
});

// ==================== BRAND LOGOS & VISUAL IDENTITY ====================
const LOGO_SLOT_MAP: Record<string, string> = {
  main: 'logo_url',
  favicon: 'favicon_url',
  og_share: 'og_image_url',
  home: 'home_logo_url',
  umbrella: 'umbrella_logo_url',
  ministry: 'ministry_logo_url'
};

router.get('/brand-logos', requireAnyPermission(['logos', 'settings']), (_req: AuthedRequest, res: Response) => {
  const logos = db.prepare('SELECT * FROM brand_logos ORDER BY sort_order ASC, id ASC').all();
  const rows = db.prepare("SELECT key, value FROM settings WHERE key IN ('logo_url', 'favicon_url', 'og_image_url', 'home_logo_url', 'umbrella_logo_url', 'ministry_logo_url')").all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const r of rows) settings[r.key] = r.value;
  res.json({ logos, settings });
});

router.post('/brand-logos', requireAnyPermission(['logos', 'settings']), (req: AuthedRequest, res: Response) => {
  const b = req.body;
  if (!b.title_ar || !b.logo_url) {
    res.status(400).json({ error: 'عنوان الشعار وملف الصورة مطلوبان' });
    return;
  }
  const roleKey = String(b.role_key || 'partner');
  const info = db
    .prepare(
      `INSERT INTO brand_logos (title_ar, title_en, role_key, logo_url, alt_text, placement, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      b.title_ar,
      b.title_en || '',
      roleKey,
      b.logo_url,
      b.alt_text || b.title_ar,
      b.placement || 'general',
      Number(b.sort_order ?? 10),
      b.is_active !== false ? 1 : 0
    );

  if (b.assign_slot && LOGO_SLOT_MAP[String(b.assign_slot)]) {
    db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))").run(
      LOGO_SLOT_MAP[String(b.assign_slot)],
      b.logo_url
    );
  }
  logAudit(req, 'create', 'brand_logo', info.lastInsertRowid, { title_ar: b.title_ar, roleKey });
  res.json(db.prepare('SELECT * FROM brand_logos WHERE id = ?').get(info.lastInsertRowid));
});

router.patch('/brand-logos/:id', requireAnyPermission(['logos', 'settings']), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM brand_logos WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ error: 'الشعار غير موجود' });
    return;
  }
  const b = req.body;
  db.prepare(
    `UPDATE brand_logos SET title_ar = ?, title_en = ?, role_key = ?, logo_url = ?, alt_text = ?, placement = ?, sort_order = ?, is_active = ? WHERE id = ?`
  ).run(
    b.title_ar ?? existing.title_ar,
    b.title_en ?? existing.title_en,
    b.role_key ?? existing.role_key,
    b.logo_url ?? existing.logo_url,
    b.alt_text ?? existing.alt_text,
    b.placement ?? existing.placement,
    b.sort_order !== undefined ? Number(b.sort_order) : existing.sort_order,
    b.is_active !== undefined ? (b.is_active ? 1 : 0) : existing.is_active,
    id
  );

  // Keep synced setting up to date if url changed and this logo was active for that slot
  const nextUrl = b.logo_url ?? existing.logo_url;
  const nextRole = b.role_key ?? existing.role_key;
  if (LOGO_SLOT_MAP[nextRole] && existing.logo_url && nextUrl !== existing.logo_url) {
    const cur = db.prepare('SELECT value FROM settings WHERE key = ?').get(LOGO_SLOT_MAP[nextRole]) as { value: string } | undefined;
    if (!cur || cur.value === existing.logo_url) {
      db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))").run(
        LOGO_SLOT_MAP[nextRole],
        nextUrl
      );
    }
  }

  logAudit(req, 'update', 'brand_logo', id);
  res.json(db.prepare('SELECT * FROM brand_logos WHERE id = ?').get(id));
});

router.post('/brand-logos/:id/assign', requireAnyPermission(['logos', 'settings']), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const slot = String(req.body.slot || '');
  const settingKey = LOGO_SLOT_MAP[slot];
  if (!settingKey) {
    res.status(400).json({ error: 'موضع التعيين غير صالح' });
    return;
  }
  const existing = db.prepare('SELECT * FROM brand_logos WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ error: 'الشعار غير موجود' });
    return;
  }
  db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))").run(
    settingKey,
    existing.logo_url
  );
  logAudit(req, 'assign_logo_slot', 'settings', settingKey, { brandLogoId: id, logo_url: existing.logo_url });
  res.json({ success: true, slot, settingKey, logo_url: existing.logo_url });
});

router.put('/brand-logos/quick-settings', requireAnyPermission(['logos', 'settings']), (req: AuthedRequest, res: Response) => {
  const allowedKeys = new Set(['logo_url', 'favicon_url', 'og_image_url', 'home_logo_url', 'umbrella_logo_url', 'ministry_logo_url']);
  const upsert = db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))");
  const tx = db.transaction(() => {
    for (const [k, v] of Object.entries(req.body || {})) {
      if (allowedKeys.has(k) && typeof v === 'string') {
        upsert.run(k, v);
      }
    }
  });
  tx();
  logAudit(req, 'update_brand_slots', 'settings', 'brand_logos', req.body || {});
  res.json({ success: true });
});

router.delete('/brand-logos/:id', requireAnyPermission(['logos', 'settings']), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM brand_logos WHERE id = ?').run(id);
  logAudit(req, 'delete', 'brand_logo', id);
  res.json({ success: true });
});

// ==================== CERTIFICATES & AI CERTIFICATE STUDIO ====================
router.get('/certificates', requirePermission('certificates'), (req: AuthedRequest, res: Response) => {
  const q = req.query.search ? `%${String(req.query.search).trim()}%` : '';
  if (q) {
    res.json(
      db
        .prepare(
          `SELECT * FROM certificates
           WHERE certificate_number LIKE ? OR recipient_name LIKE ? OR course_title LIKE ? OR recipient_email LIKE ?
           ORDER BY created_at DESC, id DESC`
        )
        .all(q, q, q, q)
    );
    return;
  }
  res.json(db.prepare('SELECT * FROM certificates ORDER BY created_at DESC, id DESC').all());
});

router.get('/certificates/options', requirePermission('certificates'), (_req: AuthedRequest, res: Response) => {
  const members = db
    .prepare(
      `SELECT m.id, m.member_number, m.full_name, m.email, m.governorate, m.position_title, c.name_ar as committee_name
       FROM members m
       LEFT JOIN committees c ON c.id = m.committee_id
       WHERE m.status = 'active'
       ORDER BY m.id DESC`
    )
    .all();
  const trainings = db
    .prepare('SELECT id, title_ar, track, trainer_name, hours, start_date, registration_status FROM trainings ORDER BY created_at DESC')
    .all();
  const events = db
    .prepare('SELECT id, title_ar, event_type, event_date, organizer, location, status FROM events ORDER BY event_date DESC')
    .all();
  res.json({ members, trainings, events });
});

router.get('/certificates/program-registrants', requirePermission('certificates'), (req: AuthedRequest, res: Response) => {
  const sourceType = String(req.query.source_type || '');
  const sourceId = Number(req.query.source_id || 0);
  if (!sourceId || (sourceType !== 'training' && sourceType !== 'event')) {
    res.status(400).json({ error: 'حدد البرنامج التدريبي أو الورشة/الفعالية أولاً' });
    return;
  }

  if (sourceType === 'training') {
    const rows = db
      .prepare('SELECT * FROM training_registrations WHERE training_id = ? ORDER BY created_at DESC')
      .all(sourceId) as any[];
    const enriched = rows.map((r) => {
      const matchedMember =
        (r.member_number
          ? (db.prepare('SELECT id, member_number, full_name, email FROM members WHERE member_number = ? LIMIT 1').get(r.member_number) as any)
          : null) ||
        (r.email
          ? (db.prepare('SELECT id, member_number, full_name, email FROM members WHERE lower(email) = lower(?) LIMIT 1').get(r.email) as any)
          : null);
      const existingCert = db
        .prepare(
          `SELECT id, certificate_number FROM certificates
           WHERE training_id = ? AND status = 'valid'
             AND ((member_id IS NOT NULL AND member_id = ?) OR (recipient_email != '' AND lower(recipient_email) = lower(?)) OR trim(recipient_name) = trim(?))
           LIMIT 1`
        )
        .get(sourceId, matchedMember?.id || -1, r.email || '', r.full_name || '') as any;
      return {
        ...r,
        member_id: matchedMember?.id || null,
        matched_member_number: matchedMember?.member_number || r.member_number || '',
        already_certified: Boolean(existingCert),
        certificate_number: existingCert?.certificate_number || null
      };
    });
    res.json(enriched);
    return;
  }

  const rows = db
    .prepare('SELECT * FROM event_registrations WHERE event_id = ? ORDER BY created_at DESC')
    .all(sourceId) as any[];
  const enriched = rows.map((r) => {
    const matchedMember = r.email
      ? (db.prepare('SELECT id, member_number, full_name, email FROM members WHERE lower(email) = lower(?) LIMIT 1').get(r.email) as any)
      : null;
    const existingCert = db
      .prepare(
        `SELECT id, certificate_number FROM certificates
         WHERE event_id = ? AND status = 'valid'
           AND ((member_id IS NOT NULL AND member_id = ?) OR (recipient_email != '' AND lower(recipient_email) = lower(?)) OR trim(recipient_name) = trim(?))
         LIMIT 1`
      )
      .get(sourceId, matchedMember?.id || -1, r.email || '', r.full_name || '') as any;
    return {
      ...r,
      status: 'confirmed',
      member_id: matchedMember?.id || null,
      matched_member_number: matchedMember?.member_number || '',
      already_certified: Boolean(existingCert),
      certificate_number: existingCert?.certificate_number || null
    };
  });
  res.json(enriched);
});

router.post('/certificates/ai-generate', requirePermission('certificates'), async (req: AuthedRequest, res: Response) => {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    res.status(500).json({
      error: 'مفتاح الذكاء الاصطناعي (GEMINI_API_KEY) غير متاح حاليًا. يرجى التأكد من إعداده في لوحة الأسرار (Settings > Secrets).'
    });
    return;
  }

  const b = req.body || {};
  const promptText = String(b.prompt || '').trim();
  const activityType = String(b.activity_type || 'training').trim();
  const programTitle = String(b.program_title || '').trim();
  const trainerName = String(b.trainer_name || '').trim();
  const hoursCount = Number(b.hours_count || 0);
  const stylePreference = String(b.style_preference || '').trim();

  if (!promptText && !programTitle) {
    res.status(400).json({ error: 'يرجى كتابة وصف للشهادة أو اختيار اسم التدريب/الورشة/الدوري' });
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const activityLabels: Record<string, string> = {
      training: 'برنامج تدريبي متخصص',
      workshop: 'ورشة عمل تطبيقية',
      periodic: 'دورة / دوري توعوي ومنافسة رقمية',
      honor: 'تكريم ومشاركة مجتمعية'
    };

    const userPrompt = [
      `نوع الفعالية: ${activityLabels[activityType] || activityType}`,
      programTitle ? `اسم التدريب/الورشة/الدوري: ${programTitle}` : '',
      trainerName ? `المدرب / الجهة المشرفة: ${trainerName}` : '',
      hoursCount > 0 ? `عدد الساعات التدريبية: ${hoursCount}` : '',
      stylePreference ? `الطابع البصري المطلوب: ${stylePreference}` : '',
      promptText ? `تفاصيل ووصف المطلوب: ${promptText}` : ''
    ]
      .filter(Boolean)
      .join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: userPrompt,
      config: {
        systemInstruction:
          'أنت خبير تصميم وصياغة شهادات رسمية لمبادرة "جيل رقمي آمن" (تحت مظلة الاتحاد النوعي حكاية وطن المشهر برقم 1279 لسنة 2025 بوزارة التضامن الاجتماعي). أنشئ محتوى شهادة عربية احترافية ورصينة ومناسبة للتدريبات وورش العمل والدوريات الرقمية. اختر template_style من القيم المسموحة فقط: official_navy أو cyber_cyan أو royal_gold أو emerald_honor، وألوان hex متناسقة وواضحة للطباعة.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title_ar: {
              type: Type.STRING,
              description: 'عنوان الشهادة الرئيسي بالعربية (مثل: شهادة إتمام وتقدير رسمية أو شهادة اجتياز ورشة عمل).'
            },
            subtitle_ar: {
              type: Type.STRING,
              description: 'شارة أو عنوان فرعي مختصر للشهادة (مثل: SAFE DIGITAL GENERATION — اعتماد تدريبي).'
            },
            course_title: {
              type: Type.STRING,
              description: 'اسم التدريب أو الورشة أو الدوري بصياغة رسمية واضحة.'
            },
            body_text_ar: {
              type: Type.STRING,
              description: 'نص الشهادة الرسمي الذي يسبق اسم البرنامج أو يصف الإنجاز بعبارة احترافية موجزة (جملة إلى جملتين).'
            },
            suggested_hours: {
              type: Type.INTEGER,
              description: 'عدد الساعات التدريبية المقترح (رقم صحيح، 0 إذا لم يكن مناسبًا).'
            },
            suggested_grade: {
              type: Type.STRING,
              description: 'التقدير المقترح بالعربية (مثل: امتياز، اجتياز بنجاح، مشاركة فعالة).'
            },
            template_style: {
              type: Type.STRING,
              description: 'أحد القيم: official_navy, cyber_cyan, royal_gold, emerald_honor'
            },
            primary_color: {
              type: Type.STRING,
              description: 'كود لون أساسي داكن بصيغة hex مثل #0A192F أو #064E3B أو #78350F.'
            },
            accent_color: {
              type: Type.STRING,
              description: 'كود لون تمييزي بصيغة hex مثل #06B6D4 أو #D97706 أو #10B981.'
            }
          },
          required: ['title_ar', 'subtitle_ar', 'course_title', 'body_text_ar', 'suggested_hours', 'suggested_grade', 'template_style', 'primary_color', 'accent_color']
        }
      }
    });

    const rawText = (response.text || '').trim();
    if (!rawText) {
      res.status(502).json({ error: 'لم يُرجع نموذج الذكاء الاصطناعي استجابة صالحة. يرجى المحاولة مرة أخرى.' });
      return;
    }

    const parsed = JSON.parse(rawText);
    const allowedStyles = ['official_navy', 'cyber_cyan', 'royal_gold', 'emerald_honor'];
    const safeStyle = allowedStyles.includes(parsed.template_style) ? parsed.template_style : 'official_navy';
    res.json({
      ...parsed,
      template_style: safeStyle
    });
  } catch (err: any) {
    const statusCode = Number(err?.status || err?.code || 500);
    const msg = String(err?.message || 'حدث خطأ أثناء الاتصال بخدمة الذكاء الاصطناعي');
    if (statusCode === 400 || statusCode === 403 || /API_KEY|PERMISSION_DENIED/i.test(msg)) {
      res.status(400).json({ error: 'مفتاح Gemini API غير صالح أو يفتقر للصلاحية. راجع الإعداد في Settings > Secrets.' });
      return;
    }
    if (statusCode === 429 || /RESOURCE_EXHAUSTED|quota/i.test(msg)) {
      res.status(429).json({ error: 'تم استهلاك الحد المسموح للطلبات حاليًا. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.' });
      return;
    }
    res.status(500).json({ error: `تعذر توليد الشهادة بالذكاء الاصطناعي: ${msg}` });
  }
});

function insertSingleCertificate(params: {
  member_id: number | null;
  recipient_name: string;
  recipient_email: string;
  course_title: string;
  issue_date: string;
  trainer_name: string;
  template_style: string;
  activity_type: string;
  training_id: number | null;
  event_id: number | null;
  hours_count: number;
  grade_ar: string;
  title_ar: string;
  subtitle_ar: string;
  body_text_ar: string;
  primary_color: string;
  accent_color: string;
}) {
  const certNumber = generateSafeCode('CERT');
  const qrToken = crypto.randomBytes(10).toString('hex');
  const info = db
    .prepare(
      `INSERT INTO certificates (
         certificate_number, member_id, recipient_name, recipient_email, course_title,
         issue_date, trainer_name, template_style, activity_type, training_id, event_id,
         hours_count, grade_ar, title_ar, subtitle_ar, body_text_ar, primary_color, accent_color,
         status, qr_token
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'valid', ?)`
    )
    .run(
      certNumber,
      params.member_id,
      params.recipient_name,
      params.recipient_email,
      params.course_title,
      params.issue_date,
      params.trainer_name,
      params.template_style,
      params.activity_type,
      params.training_id,
      params.event_id,
      params.hours_count,
      params.grade_ar,
      params.title_ar,
      params.subtitle_ar,
      params.body_text_ar,
      params.primary_color,
      params.accent_color,
      qrToken
    );

  if (params.recipient_email) {
    db.prepare(
      `INSERT INTO notifications (target_email, title_ar, message_ar, ref_type, ref_id)
       VALUES (?, ?, ?, 'certificate', ?)`
    ).run(
      params.recipient_email,
      'شهادة إلكترونية جديدة معتمدة',
      `تم إصدار شهادة "${params.course_title}" برقم ${certNumber}. يمكنك عرضها وتحميلها من بوابة العضو.`,
      certNumber
    );
  }

  return db.prepare('SELECT * FROM certificates WHERE id = ?').get(info.lastInsertRowid) as any;
}

router.post('/certificates', requirePermission('certificates'), (req: AuthedRequest, res: Response) => {
  const b = req.body || {};
  const courseTitle = String(b.course_title || '').trim();
  if (!courseTitle) {
    res.status(400).json({ error: 'اسم التدريب أو الورشة أو الدوري مطلوب لإصدار الشهادة' });
    return;
  }

  const basePayload = {
    course_title: courseTitle,
    issue_date: String(b.issue_date || new Date().toISOString().slice(0, 10)),
    trainer_name: String(b.trainer_name || 'إدارة التدريب والتثقيف'),
    template_style: String(b.template_style || 'official_navy'),
    activity_type: String(b.activity_type || 'training'),
    training_id: b.training_id ? Number(b.training_id) : null,
    event_id: b.event_id ? Number(b.event_id) : null,
    hours_count: Number(b.hours_count || 0),
    grade_ar: String(b.grade_ar || ''),
    title_ar: String(b.title_ar || 'شهادة إتمام وتقدير رسمية'),
    subtitle_ar: String(b.subtitle_ar || ''),
    body_text_ar: String(b.body_text_ar || ''),
    primary_color: String(b.primary_color || '#0A192F'),
    accent_color: String(b.accent_color || '#06B6D4')
  };

  const memberIds: number[] = Array.isArray(b.member_ids)
    ? b.member_ids.map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n) && n > 0)
    : b.member_id
      ? [Number(b.member_id)]
      : [];

  if (memberIds.length > 0) {
    const created: any[] = [];
    for (const mId of memberIds) {
      const m = db.prepare('SELECT id, full_name, email FROM members WHERE id = ?').get(mId) as any;
      if (!m) continue;
      const row = insertSingleCertificate({
        ...basePayload,
        member_id: m.id,
        recipient_name: m.full_name,
        recipient_email: m.email || ''
      });
      created.push(row);
    }
    if (created.length === 0) {
      res.status(404).json({ error: 'لم يتم العثور على الأعضاء المحددين' });
      return;
    }
    logAudit(req, 'create_bulk', 'certificate', created.map((c) => c.certificate_number).join(','), {
      count: created.length,
      course_title: courseTitle
    });
    res.json({ ...created[0], created, count: created.length });
    return;
  }

  const recipientName = String(b.recipient_name || '').trim();
  if (!recipientName) {
    res.status(400).json({ error: 'يرجى اختيار عضو واحد على الأقل أو كتابة اسم المستفيد' });
    return;
  }

  const recipientEmail = String(b.recipient_email || '').trim().toLowerCase();
  const matchedMember = recipientEmail
    ? (db.prepare('SELECT id FROM members WHERE lower(email) = lower(?) LIMIT 1').get(recipientEmail) as any)
    : null;

  const created = insertSingleCertificate({
    ...basePayload,
    member_id: matchedMember?.id || null,
    recipient_name: recipientName,
    recipient_email: recipientEmail
  });
  logAudit(req, 'create', 'certificate', created.id, { certNumber: created.certificate_number, recipient_name: recipientName });
  res.json({ ...created, created: [created], count: 1 });
});

router.post('/certificates/award-from-program', requirePermission('certificates'), (req: AuthedRequest, res: Response) => {
  const b = req.body || {};
  const sourceType = String(b.source_type || '');
  const sourceId = Number(b.source_id || 0);
  if (!sourceId || (sourceType !== 'training' && sourceType !== 'event')) {
    res.status(400).json({ error: 'حدد التدريب أو الورشة/الفعالية أولاً' });
    return;
  }

  const program =
    sourceType === 'training'
      ? (db.prepare('SELECT * FROM trainings WHERE id = ?').get(sourceId) as any)
      : (db.prepare('SELECT * FROM events WHERE id = ?').get(sourceId) as any);

  if (!program) {
    res.status(404).json({ error: 'البرنامج أو الورشة غير موجودة' });
    return;
  }

  const selectedRegIds: number[] = Array.isArray(b.registration_ids)
    ? b.registration_ids.map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n) && n > 0)
    : [];

  let registrations =
    sourceType === 'training'
      ? (db.prepare('SELECT * FROM training_registrations WHERE training_id = ?').all(sourceId) as any[])
      : (db.prepare('SELECT * FROM event_registrations WHERE event_id = ?').all(sourceId) as any[]);

  if (selectedRegIds.length > 0) {
    registrations = registrations.filter((r) => selectedRegIds.includes(Number(r.id)));
  } else if (sourceType === 'training' && b.only_completed) {
    registrations = registrations.filter((r) => r.status === 'completed' || r.status === 'confirmed');
  }

  if (registrations.length === 0) {
    res.status(400).json({ error: 'لا يوجد مشاركون مطابقون لإصدار الشهادات لهم' });
    return;
  }

  const defaultActivityType =
    b.activity_type ||
    (sourceType === 'training'
      ? 'training'
      : program.event_type === 'competition'
        ? 'periodic'
        : 'workshop');

  const basePayload = {
    course_title: String(b.course_title || program.title_ar),
    issue_date: String(b.issue_date || new Date().toISOString().slice(0, 10)),
    trainer_name: String(b.trainer_name || program.trainer_name || program.organizer || 'إدارة التدريب والتثقيف'),
    template_style: String(b.template_style || 'official_navy'),
    activity_type: String(defaultActivityType),
    training_id: sourceType === 'training' ? sourceId : null,
    event_id: sourceType === 'event' ? sourceId : null,
    hours_count: Number(b.hours_count ?? program.hours ?? 0),
    grade_ar: String(b.grade_ar || ''),
    title_ar: String(
      b.title_ar ||
        (defaultActivityType === 'workshop'
          ? 'شهادة حضور ومشاركة في ورشة عمل'
          : defaultActivityType === 'periodic'
            ? 'شهادة تقدير ومشاركة في الدوري التوعوي'
            : 'شهادة إتمام برنامج تدريبي')
    ),
    subtitle_ar: String(b.subtitle_ar || ''),
    body_text_ar: String(b.body_text_ar || ''),
    primary_color: String(b.primary_color || '#0A192F'),
    accent_color: String(b.accent_color || '#06B6D4')
  };

  const created: any[] = [];
  let skipped = 0;

  for (const reg of registrations) {
    const matchedMember =
      (reg.member_number
        ? (db.prepare('SELECT id, full_name, email FROM members WHERE member_number = ? LIMIT 1').get(reg.member_number) as any)
        : null) ||
      (reg.email
        ? (db.prepare('SELECT id, full_name, email FROM members WHERE lower(email) = lower(?) LIMIT 1').get(reg.email) as any)
        : null);

    const dup =
      sourceType === 'training'
        ? db
            .prepare(
              `SELECT id FROM certificates WHERE training_id = ? AND status = 'valid'
               AND ((member_id IS NOT NULL AND member_id = ?) OR (recipient_email != '' AND lower(recipient_email) = lower(?)) OR trim(recipient_name) = trim(?))
               LIMIT 1`
            )
            .get(sourceId, matchedMember?.id || -1, reg.email || '', reg.full_name || '')
        : db
            .prepare(
              `SELECT id FROM certificates WHERE event_id = ? AND status = 'valid'
               AND ((member_id IS NOT NULL AND member_id = ?) OR (recipient_email != '' AND lower(recipient_email) = lower(?)) OR trim(recipient_name) = trim(?))
               LIMIT 1`
            )
            .get(sourceId, matchedMember?.id || -1, reg.email || '', reg.full_name || '');

    if (dup) {
      skipped++;
      continue;
    }

    const row = insertSingleCertificate({
      ...basePayload,
      member_id: matchedMember?.id || null,
      recipient_name: matchedMember?.full_name || reg.full_name,
      recipient_email: matchedMember?.email || reg.email || ''
    });
    created.push(row);

    if (sourceType === 'training' && reg.status !== 'completed') {
      db.prepare("UPDATE training_registrations SET status = 'completed' WHERE id = ?").run(reg.id);
    }
  }

  logAudit(req, 'award_from_program', 'certificate', `${sourceType}:${sourceId}`, {
    count: created.length,
    skipped
  });

  res.json({ created, count: created.length, skipped });
});

router.patch('/certificates/:id', requirePermission('certificates'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM certificates WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ error: 'الشهادة غير موجودة' });
    return;
  }
  const b = req.body;
  db.prepare(
    `UPDATE certificates SET
      recipient_name = ?, recipient_email = ?, course_title = ?, issue_date = ?, trainer_name = ?,
      status = ?, template_style = ?, activity_type = ?, hours_count = ?, grade_ar = ?,
      title_ar = ?, subtitle_ar = ?, body_text_ar = ?, primary_color = ?, accent_color = ?
     WHERE id = ?`
  ).run(
    b.recipient_name ?? existing.recipient_name,
    b.recipient_email ?? existing.recipient_email,
    b.course_title ?? existing.course_title,
    b.issue_date ?? existing.issue_date,
    b.trainer_name ?? existing.trainer_name,
    b.status ?? existing.status,
    b.template_style ?? existing.template_style,
    b.activity_type ?? existing.activity_type ?? 'training',
    b.hours_count !== undefined ? Number(b.hours_count) : Number(existing.hours_count || 0),
    b.grade_ar ?? existing.grade_ar ?? '',
    b.title_ar ?? existing.title_ar ?? 'شهادة إتمام وتقدير رسمية',
    b.subtitle_ar ?? existing.subtitle_ar ?? '',
    b.body_text_ar ?? existing.body_text_ar ?? '',
    b.primary_color ?? existing.primary_color ?? '#0A192F',
    b.accent_color ?? existing.accent_color ?? '#06B6D4',
    id
  );
  logAudit(req, 'update', 'certificate', id, req.body);
  res.json(db.prepare('SELECT * FROM certificates WHERE id = ?').get(id));
});

router.delete('/certificates/:id', requirePermission('certificates'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM certificates WHERE id = ?').run(id);
  logAudit(req, 'delete', 'certificate', id);
  res.json({ success: true });
});

// ==================== DIGITAL LIBRARY ====================
router.get('/library', requirePermission('library'), (_req: AuthedRequest, res: Response) => {
  res.json(db.prepare('SELECT * FROM digital_library ORDER BY created_at DESC').all());
});

router.post('/library', requirePermission('library'), (req: AuthedRequest, res: Response) => {
  const b = req.body;
  const info = db
    .prepare(
      `INSERT INTO digital_library (title_ar, title_en, category, description_ar, description_en, file_url, external_url, cover_image, is_published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      b.title_ar,
      b.title_en || '',
      b.category || 'pdf_guide',
      b.description_ar || '',
      b.description_en || '',
      b.file_url || '',
      b.external_url || '',
      b.cover_image || '',
      b.is_published !== false ? 1 : 0
    );
  logAudit(req, 'create', 'digital_library', info.lastInsertRowid);
  syncPublicSeoFiles();
  res.json(db.prepare('SELECT * FROM digital_library WHERE id = ?').get(info.lastInsertRowid));
});

router.patch('/library/:id', requirePermission('library'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM digital_library WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ error: 'غير موجود' });
    return;
  }
  const b = req.body;
  db.prepare(
    `UPDATE digital_library SET title_ar = ?, title_en = ?, category = ?, description_ar = ?, description_en = ?,
      file_url = ?, external_url = ?, cover_image = ?, is_published = ? WHERE id = ?`
  ).run(
    b.title_ar ?? existing.title_ar,
    b.title_en ?? existing.title_en,
    b.category ?? existing.category,
    b.description_ar ?? existing.description_ar,
    b.description_en ?? existing.description_en,
    b.file_url ?? existing.file_url,
    b.external_url ?? existing.external_url,
    b.cover_image ?? existing.cover_image,
    b.is_published !== undefined ? (b.is_published ? 1 : 0) : existing.is_published,
    id
  );
  logAudit(req, 'update', 'digital_library', id);
  syncPublicSeoFiles();
  res.json(db.prepare('SELECT * FROM digital_library WHERE id = ?').get(id));
});

router.delete('/library/:id', requirePermission('library'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM digital_library WHERE id = ?').run(id);
  logAudit(req, 'delete', 'digital_library', id);
  syncPublicSeoFiles();
  res.json({ success: true });
});

// ==================== CONTACTS ====================
router.get('/contacts', requirePermission('contacts'), (_req: AuthedRequest, res: Response) => {
  res.json(db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC').all());
});

router.patch('/contacts/:id', requirePermission('contacts'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  db.prepare('UPDATE contact_messages SET status = ? WHERE id = ?').run(req.body.status || 'replied', id);
  logAudit(req, 'update', 'contact_message', id, { status: req.body.status });
  res.json({ success: true });
});

router.delete('/contacts/:id', requirePermission('contacts'), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM contact_messages WHERE id = ?').run(id);
  logAudit(req, 'delete', 'contact_message', id);
  res.json({ success: true });
});

// ==================== SETTINGS ====================
router.get('/settings', requirePermission('settings'), (_req: AuthedRequest, res: Response) => {
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  res.json(map);
});

router.put('/settings', requirePermission('settings'), (req: AuthedRequest, res: Response) => {
  const entries = Object.entries(req.body || {});
  const upsert = db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))");
  const tx = db.transaction(() => {
    for (const [k, v] of entries) {
      upsert.run(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
  });
  tx();
  logAudit(req, 'update_settings', 'settings', 'global', { keys: entries.map(([k]) => k) });
  syncPublicSeoFiles();
  res.json({ success: true });
});

// ==================== USERS & RBAC ADMINS ====================
router.get('/admins', requirePermission('admins'), (_req: AuthedRequest, res: Response) => {
  const rows = db
    .prepare(
      `SELECT u.id as user_id, u.name, u.email, u.status, u.created_at, a.id as admin_id, a.role as admin_role, a.title_ar, a.permissions_json
       FROM admins a JOIN users u ON u.id = a.user_id
       ORDER BY a.id ASC`
    )
    .all();
  res.json({
    admins: rows,
    roles: Object.keys(ROLE_PERMISSIONS),
    permissionGroups: PERMISSION_GROUPS,
    roleDefaults: ROLE_PERMISSIONS
  });
});

router.post('/admins', requirePermission('admins:create'), (req: AuthedRequest, res: Response) => {
  const { name, email, password, admin_role, title_ar, permissions } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    res.status(400).json({ error: 'البريد الإلكتروني مطلوب' });
    return;
  }
  const roleKey = ROLE_PERMISSIONS[admin_role] ? admin_role : 'content_editor';
  if (roleKey === 'super_admin' && req.user?.adminRole !== 'super_admin') {
    res.status(403).json({ error: 'تعيين مدير عام مسموح للمدير العام فقط' });
    return;
  }

  let initialPerms = ROLE_PERMISSIONS[roleKey];
  if (Array.isArray(permissions) && req.user?.adminRole === 'super_admin') {
    initialPerms = permissions.filter((p) => typeof p === 'string');
  } else if (req.user?.adminRole !== 'super_admin') {
    // Non-super-admin cannot grant admin management permissions
    initialPerms = initialPerms.filter((p) => !p.startsWith('admins'));
  }

  const existing = db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(normalizedEmail) as any;
  if (existing) {
    const existingAdmin = db.prepare('SELECT * FROM admins WHERE user_id = ?').get(existing.id) as any;
    if (existingAdmin) {
      res.status(400).json({ error: 'هذا البريد مضاف بالفعل في قائمة الإدارة' });
      return;
    }
    if (password && String(password).length >= 8) {
      db.prepare('UPDATE users SET password_hash = ?, role = ?, name = COALESCE(?, name), status = ? WHERE id = ?').run(
        bcrypt.hashSync(String(password), 12),
        roleKey,
        name ? String(name).trim() : null,
        'active',
        existing.id
      );
    } else {
      db.prepare('UPDATE users SET role = ?, name = COALESCE(?, name), status = ? WHERE id = ?').run(
        roleKey,
        name ? String(name).trim() : null,
        'active',
        existing.id
      );
    }
    db.prepare('INSERT INTO admins (user_id, role, permissions_json, title_ar) VALUES (?, ?, ?, ?)').run(
      existing.id,
      roleKey,
      JSON.stringify(initialPerms),
      title_ar || roleKey
    );
    logAudit(req, 'promote_admin', 'admin', existing.id, { email: normalizedEmail, role: roleKey });
    res.json({ success: true, user_id: existing.id, promoted: true });
    return;
  }

  if (!name || !password || String(password).length < 8) {
    res.status(400).json({ error: 'الاسم وكلمة مرور (8 أحرف على الأقل) مطلوبة للحساب الجديد' });
    return;
  }
  const hash = bcrypt.hashSync(String(password), 12);
  const u = db
    .prepare('INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)')
    .run(String(name).trim(), normalizedEmail, hash, roleKey, 'active');
  db.prepare('INSERT INTO admins (user_id, role, permissions_json, title_ar) VALUES (?, ?, ?, ?)').run(
    u.lastInsertRowid,
    roleKey,
    JSON.stringify(initialPerms),
    title_ar || roleKey
  );
  logAudit(req, 'create_admin', 'admin', u.lastInsertRowid, { email: normalizedEmail, role: roleKey });
  res.json({ success: true, user_id: u.lastInsertRowid });
});

router.patch('/admins/:userId', requirePermission('admins:edit'), (req: AuthedRequest, res: Response) => {
  const userId = Number(req.params.userId);
  const targetAdmin = db.prepare('SELECT role FROM admins WHERE user_id = ?').get(userId) as { role: string } | undefined;
  const { admin_role, status, title_ar, password, name, email } = req.body;
  if ((targetAdmin?.role === 'super_admin' || admin_role === 'super_admin') && req.user?.adminRole !== 'super_admin') {
    res.status(403).json({ error: 'تعديل حساب المدير العام مقتصر على المدير العام فقط' });
    return;
  }
  if (name) {
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(String(name).trim(), userId);
  }
  if (email && String(email).trim()) {
    const cleanEmail = String(email).trim().toLowerCase();
    const conflict = db.prepare('SELECT id FROM users WHERE lower(email) = lower(?) AND id != ?').get(cleanEmail, userId);
    if (conflict) {
      res.status(400).json({ error: 'البريد الإلكتروني مستخدم لحساب آخر بالفعل' });
      return;
    }
    db.prepare('UPDATE users SET email = ? WHERE id = ?').run(cleanEmail, userId);
  }
  if (title_ar !== undefined) {
    db.prepare('UPDATE admins SET title_ar = ? WHERE user_id = ?').run(String(title_ar).trim(), userId);
  }
  if (admin_role && ROLE_PERMISSIONS[admin_role]) {
    let nextPerms = ROLE_PERMISSIONS[admin_role];
    if (req.user?.adminRole !== 'super_admin') {
      nextPerms = nextPerms.filter((p) => !p.startsWith('admins'));
    }
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(admin_role, userId);
    db.prepare('UPDATE admins SET role = ?, permissions_json = ?, title_ar = COALESCE(?, title_ar) WHERE user_id = ?').run(
      admin_role,
      JSON.stringify(nextPerms),
      title_ar ?? null,
      userId
    );
  }
  if (status) {
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, userId);
  }
  if (password && String(password).length >= 8) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(String(password), 12), userId);
  }
  logAudit(req, 'update_admin', 'admin', userId, { admin_role, status, email });
  res.json({ success: true });
});

// Exclusive Super Admin Granular Permission Control
router.patch('/admins/:userId/permissions', requireSuperAdmin, (req: AuthedRequest, res: Response) => {
  const userId = Number(req.params.userId);
  const targetAdmin = db.prepare('SELECT id, role FROM admins WHERE user_id = ?').get(userId) as { id: number; role: string } | undefined;
  if (!targetAdmin) {
    res.status(404).json({ error: 'حساب المشرف غير موجود' });
    return;
  }
  if (targetAdmin.role === 'super_admin') {
    res.status(400).json({ error: 'يمتلك المسؤول الرئيسي كافة الصلاحيات بشكل دائم' });
    return;
  }
  const rawPerms = Array.isArray(req.body.permissions) ? req.body.permissions : [];
  const validKeys = new Set<string>(PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key)));
  validKeys.add('committees:read');
  validKeys.add('events:read');
  validKeys.add('members:read');

  const cleaned = Array.from(new Set(rawPerms.filter((p: unknown) => typeof p === 'string' && validKeys.has(p))));
  // Include marker so empty permission set stays intentionally empty instead of falling back
  const toSave = cleaned.length > 0 ? cleaned : ['__granular__'];

  db.prepare('UPDATE admins SET permissions_json = ? WHERE user_id = ?').run(JSON.stringify(toSave), userId);
  logAudit(req, 'update_permissions', 'admin', userId, { permissions: cleaned });
  res.json({ success: true, permissions: cleaned });
});

router.delete('/admins/:userId', requirePermission('admins:delete'), (req: AuthedRequest, res: Response) => {
  const userId = Number(req.params.userId);
  const targetAdmin = db.prepare('SELECT role FROM admins WHERE user_id = ?').get(userId) as { role: string } | undefined;
  if (targetAdmin?.role === 'super_admin' && req.user?.adminRole !== 'super_admin') {
    res.status(403).json({ error: 'حذف المدير العام مقتصر على المدير العام فقط' });
    return;
  }
  if (req.user?.userId === userId) {
    res.status(400).json({ error: 'لا يمكنك حذف حسابك الحالي' });
    return;
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  logAudit(req, 'delete_admin', 'admin', userId);
  res.json({ success: true });
});

// ==================== AUDIT LOGS ====================
router.get('/audit-logs', requirePermission('audit'), (_req: AuthedRequest, res: Response) => {
  res.json(db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200').all());
});

export default router;
