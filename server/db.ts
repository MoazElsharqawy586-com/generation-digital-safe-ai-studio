import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
for (const sub of ['images', 'logos', 'avatars', 'documents', 'media']) {
  const dir = path.join(UPLOADS_DIR, sub);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export const DB_PATH = path.join(DATA_DIR, 'sdg_initiative.db');
export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      status TEXT NOT NULL DEFAULT 'active',
      avatar_url TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'admin',
      permissions_json TEXT NOT NULL DEFAULT '[]',
      title_ar TEXT DEFAULT 'مشرف',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS committees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name_ar TEXT NOT NULL,
      name_en TEXT NOT NULL DEFAULT '',
      logo_url TEXT DEFAULT '',
      description_ar TEXT NOT NULL DEFAULT '',
      description_en TEXT NOT NULL DEFAULT '',
      tasks_ar TEXT NOT NULL DEFAULT '[]',
      tasks_en TEXT NOT NULL DEFAULT '[]',
      head_name TEXT DEFAULT '',
      head_title TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      member_number TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      full_name_en TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '',
      birth_date TEXT DEFAULT '',
      gender TEXT DEFAULT '',
      governorate TEXT DEFAULT '',
      area TEXT DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      whatsapp TEXT DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      qualification TEXT DEFAULT '',
      university_school TEXT DEFAULT '',
      major TEXT DEFAULT '',
      graduation_year TEXT DEFAULT '',
      committee_id INTEGER,
      position_title TEXT DEFAULT 'عضو عامل',
      status TEXT NOT NULL DEFAULT 'active',
      joined_at TEXT NOT NULL DEFAULT (date('now')),
      renewed_at TEXT DEFAULT '',
      expires_at TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (committee_id) REFERENCES committees(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS membership_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_number TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      avatar_url TEXT DEFAULT '',
      birth_date TEXT DEFAULT '',
      gender TEXT DEFAULT '',
      governorate TEXT DEFAULT '',
      area TEXT DEFAULT '',
      phone TEXT NOT NULL,
      whatsapp TEXT DEFAULT '',
      email TEXT NOT NULL,
      qualification TEXT DEFAULT '',
      university_school TEXT DEFAULT '',
      major TEXT DEFAULT '',
      graduation_year TEXT DEFAULT '',
      experiences TEXT DEFAULT '',
      skills TEXT DEFAULT '',
      interests TEXT DEFAULT '',
      preferred_committee_id INTEGER,
      assigned_committee_id INTEGER,
      reason TEXT DEFAULT '',
      availability TEXT DEFAULT '',
      cv_url TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      admin_notes TEXT DEFAULT '',
      reviewed_by TEXT DEFAULT '',
      reviewed_at TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (preferred_committee_id) REFERENCES committees(id) ON DELETE SET NULL,
      FOREIGN KEY (assigned_committee_id) REFERENCES committees(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS committee_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      committee_id INTEGER NOT NULL,
      member_id INTEGER,
      person_name TEXT NOT NULL,
      role_title TEXT NOT NULL DEFAULT 'عضو لجنة',
      avatar_url TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      joined_at TEXT DEFAULT (date('now')),
      is_head INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (committee_id) REFERENCES committees(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS leadership (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_ar TEXT NOT NULL,
      name_en TEXT DEFAULT '',
      role_ar TEXT NOT NULL,
      role_en TEXT DEFAULT '',
      tier TEXT NOT NULL DEFAULT 'board',
      committee_id INTEGER,
      avatar_url TEXT DEFAULT '',
      bio_ar TEXT DEFAULT '',
      bio_en TEXT DEFAULT '',
      joined_at TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (committee_id) REFERENCES committees(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title_ar TEXT NOT NULL,
      title_en TEXT DEFAULT '',
      excerpt_ar TEXT DEFAULT '',
      excerpt_en TEXT DEFAULT '',
      content_ar TEXT NOT NULL,
      content_en TEXT DEFAULT '',
      cover_image TEXT DEFAULT '',
      gallery_json TEXT NOT NULL DEFAULT '[]',
      author_name TEXT DEFAULT 'المكتب الإعلامي',
      category TEXT DEFAULT 'أخبار المبادرة',
      keywords TEXT DEFAULT '',
      committee_id INTEGER,
      status TEXT NOT NULL DEFAULT 'published',
      published_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (committee_id) REFERENCES committees(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title_ar TEXT NOT NULL,
      title_en TEXT DEFAULT '',
      event_type TEXT NOT NULL DEFAULT 'workshop',
      description_ar TEXT NOT NULL,
      description_en TEXT DEFAULT '',
      cover_image TEXT DEFAULT '',
      gallery_json TEXT NOT NULL DEFAULT '[]',
      event_date TEXT NOT NULL,
      location TEXT DEFAULT '',
      organizer TEXT DEFAULT 'مبادرة جيل رقمي آمن',
      partners_text TEXT DEFAULT '',
      registration_url TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'upcoming',
      committee_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (committee_id) REFERENCES committees(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS event_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      governorate TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS trainings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title_ar TEXT NOT NULL,
      title_en TEXT DEFAULT '',
      track TEXT NOT NULL DEFAULT 'cybersecurity',
      trainer_name TEXT DEFAULT '',
      description_ar TEXT NOT NULL,
      description_en TEXT DEFAULT '',
      cover_image TEXT DEFAULT '',
      start_date TEXT DEFAULT '',
      hours INTEGER NOT NULL DEFAULT 12,
      delivery_mode TEXT NOT NULL DEFAULT 'hybrid',
      seats_total INTEGER NOT NULL DEFAULT 50,
      seats_taken INTEGER NOT NULL DEFAULT 0,
      external_registration_url TEXT DEFAULT '',
      registration_status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS training_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      training_id INTEGER NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      governorate TEXT DEFAULT '',
      member_number TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title_ar TEXT NOT NULL,
      title_en TEXT DEFAULT '',
      description_ar TEXT NOT NULL,
      description_en TEXT DEFAULT '',
      objectives_ar TEXT DEFAULT '',
      objectives_en TEXT DEFAULT '',
      target_audience_ar TEXT DEFAULT '',
      target_audience_en TEXT DEFAULT '',
      cover_image TEXT DEFAULT '',
      gallery_json TEXT NOT NULL DEFAULT '[]',
      execution_date TEXT DEFAULT '',
      partners_text TEXT DEFAULT '',
      results_ar TEXT DEFAULT '',
      results_en TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS partners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_ar TEXT NOT NULL,
      name_en TEXT DEFAULT '',
      partner_type TEXT NOT NULL DEFAULT 'supporter',
      description_ar TEXT DEFAULT '',
      description_en TEXT DEFAULT '',
      logo_url TEXT NOT NULL,
      website_url TEXT DEFAULT '',
      show_in_marquee INTEGER NOT NULL DEFAULT 1,
      marquee_order INTEGER NOT NULL DEFAULT 0,
      is_visible INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS partner_logos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER NOT NULL,
      label TEXT DEFAULT '',
      logo_url TEXT NOT NULL,
      variant TEXT NOT NULL DEFAULT 'color',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS albums (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title_ar TEXT NOT NULL,
      title_en TEXT DEFAULT '',
      category TEXT NOT NULL DEFAULT 'events',
      description_ar TEXT DEFAULT '',
      cover_image TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS gallery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      album_id INTEGER,
      media_type TEXT NOT NULL DEFAULT 'image',
      title_ar TEXT NOT NULL,
      title_en TEXT DEFAULT '',
      url TEXT NOT NULL,
      thumbnail_url TEXT DEFAULT '',
      event_date TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      certificate_number TEXT NOT NULL UNIQUE,
      member_id INTEGER,
      recipient_name TEXT NOT NULL,
      recipient_email TEXT DEFAULT '',
      course_title TEXT NOT NULL,
      issue_date TEXT NOT NULL,
      trainer_name TEXT DEFAULT '',
      template_style TEXT NOT NULL DEFAULT 'official_navy',
      status TEXT NOT NULL DEFAULT 'valid',
      qr_token TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS digital_library (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title_ar TEXT NOT NULL,
      title_en TEXT DEFAULT '',
      category TEXT NOT NULL DEFAULT 'pdf_guide',
      description_ar TEXT DEFAULT '',
      description_en TEXT DEFAULT '',
      file_url TEXT DEFAULT '',
      external_url TEXT DEFAULT '',
      cover_image TEXT DEFAULT '',
      downloads_count INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_email TEXT DEFAULT '',
      target_role TEXT DEFAULT '',
      title_ar TEXT NOT NULL,
      message_ar TEXT NOT NULL,
      ref_type TEXT DEFAULT '',
      ref_id TEXT DEFAULT '',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS card_designs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      card_type TEXT NOT NULL DEFAULT 'standard',
      front_bg TEXT NOT NULL DEFAULT '#0A192F',
      back_bg TEXT NOT NULL DEFAULT '#0F172A',
      accent_color TEXT NOT NULL DEFAULT '#06B6D4',
      text_color TEXT NOT NULL DEFAULT '#FFFFFF',
      orientation TEXT NOT NULL DEFAULT 'landscape',
      show_expiry INTEGER NOT NULL DEFAULT 1,
      footer_note_ar TEXT NOT NULL DEFAULT 'تحت مظلة الاتحاد النوعي للجمعيات العاملة في مجال التنمية المجتمعية (حكاية وطن) — المشهر برقم 1279 لسنة 2025 بوزارة التضامن الاجتماعي',
      is_default INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS card_logos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      logo_url TEXT NOT NULL,
      side TEXT NOT NULL DEFAULT 'front',
      card_type TEXT NOT NULL DEFAULT 'all',
      x_percent REAL NOT NULL DEFAULT 10,
      y_percent REAL NOT NULL DEFAULT 10,
      width_px INTEGER NOT NULL DEFAULT 44,
      height_px INTEGER NOT NULL DEFAULT 44,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS membership_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      card_number TEXT NOT NULL UNIQUE,
      design_id INTEGER,
      issue_date TEXT NOT NULL,
      expiry_date TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      qr_token TEXT NOT NULL,
      issued_by TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
      FOREIGN KEY (design_id) REFERENCES card_designs(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_user_id INTEGER,
      admin_email TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT DEFAULT '',
      details_json TEXT DEFAULT '{}',
      ip_address TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT DEFAULT '',
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS join_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_ar TEXT NOT NULL,
      question_en TEXT DEFAULT '',
      field_type TEXT NOT NULL DEFAULT 'text',
      options_json TEXT NOT NULL DEFAULT '[]',
      placeholder_ar TEXT DEFAULT '',
      is_required INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS brand_logos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title_ar TEXT NOT NULL,
      title_en TEXT DEFAULT '',
      role_key TEXT NOT NULL DEFAULT 'partner',
      logo_url TEXT NOT NULL,
      alt_text TEXT DEFAULT '',
      placement TEXT NOT NULL DEFAULT 'general',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  ensureSchemaMigrations();
  seedInitialData();
  migrateLogosAndDefaults();
}

function ensureColumn(table: string, column: string, definition: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function ensureSchemaMigrations() {
  ensureColumn('members', 'national_id_number', "TEXT DEFAULT ''");
  ensureColumn('members', 'national_id_front_url', "TEXT DEFAULT ''");
  ensureColumn('members', 'national_id_back_url', "TEXT DEFAULT ''");

  ensureColumn('membership_applications', 'national_id_number', "TEXT DEFAULT ''");
  ensureColumn('membership_applications', 'national_id_front_url', "TEXT DEFAULT ''");
  ensureColumn('membership_applications', 'national_id_back_url', "TEXT DEFAULT ''");
  ensureColumn('membership_applications', 'custom_answers_json', "TEXT DEFAULT '[]'");

  // Rich media, SEO & per-entity logo/OG fields
  ensureColumn('news', 'cover_alt', "TEXT DEFAULT ''");
  ensureColumn('news', 'department_ar', "TEXT DEFAULT ''");
  ensureColumn('news', 'share_image_url', "TEXT DEFAULT ''");
  ensureColumn('news', 'logo_url', "TEXT DEFAULT ''");

  ensureColumn('projects', 'cover_alt', "TEXT DEFAULT ''");
  ensureColumn('projects', 'share_image_url', "TEXT DEFAULT ''");
  ensureColumn('projects', 'logo_url', "TEXT DEFAULT ''");

  ensureColumn('events', 'cover_alt', "TEXT DEFAULT ''");
  ensureColumn('events', 'share_image_url', "TEXT DEFAULT ''");
  ensureColumn('events', 'logo_url', "TEXT DEFAULT ''");

  ensureColumn('gallery', 'caption_ar', "TEXT DEFAULT ''");
  ensureColumn('gallery', 'alt_text', "TEXT DEFAULT ''");
  ensureColumn('gallery', 'entity_type', "TEXT DEFAULT 'none'");
  ensureColumn('gallery', 'entity_id', 'INTEGER');
}

const OFFICIAL_SDG_LOGO = '/assets/aistudio/FB_IMG_1789831319399_ac126220.jpg';
const OFFICIAL_HEKAYET_LOGO = '/assets/aistudio/FB_IMG_1790438684231_64912c2d.jpg';
const OFFICIAL_MOSS_LOGO = '/assets/aistudio/FB_IMG_1792797530698_77e851bd.jpg';

function migrateLogosAndDefaults() {
  const replacements: [string, string][] = [
    ['/src/assets/images/official_sdg_logo_1795097552299.jpg', OFFICIAL_SDG_LOGO],
    ['/src/assets/images/official_hekayet_watan_logo_1795097552968.jpg', OFFICIAL_HEKAYET_LOGO],
    ['/src/assets/images/official_moss_logo_1795097553269.jpg', OFFICIAL_MOSS_LOGO],
    ['/src/assets/images/initiative_emblem_logo_1795097420098.jpg', OFFICIAL_SDG_LOGO],
    ['/src/assets/images/hero_digital_safety_1795097420204.jpg', '/assets/images/hero_digital_safety_1795097420204.jpg'],
    ['/src/assets/images/project_community_awareness_1795097420313.jpg', '/assets/images/project_community_awareness_1795097420313.jpg'],
    ['/src/assets/images/training_cybersecurity_cover_1795097420656.jpg', '/assets/images/training_cybersecurity_cover_1795097420656.jpg']
  ];

  for (const [oldUrl, newUrl] of replacements) {
    db.prepare('UPDATE settings SET value = ? WHERE value = ?').run(newUrl, oldUrl);
    db.prepare('UPDATE committees SET logo_url = ? WHERE logo_url = ?').run(newUrl, oldUrl);
    db.prepare('UPDATE partners SET logo_url = ? WHERE logo_url = ?').run(newUrl, oldUrl);
    db.prepare('UPDATE card_logos SET logo_url = ? WHERE logo_url = ?').run(newUrl, oldUrl);
    db.prepare('UPDATE leadership SET avatar_url = ? WHERE avatar_url = ?').run(newUrl, oldUrl);
    db.prepare('UPDATE news SET cover_image = ? WHERE cover_image = ?').run(newUrl, oldUrl);
    db.prepare('UPDATE events SET cover_image = ? WHERE cover_image = ?').run(newUrl, oldUrl);
    db.prepare('UPDATE trainings SET cover_image = ? WHERE cover_image = ?').run(newUrl, oldUrl);
    db.prepare('UPDATE projects SET cover_image = ? WHERE cover_image = ?').run(newUrl, oldUrl);
    db.prepare('UPDATE albums SET cover_image = ? WHERE cover_image = ?').run(newUrl, oldUrl);
    db.prepare('UPDATE gallery SET url = ? WHERE url = ?').run(newUrl, oldUrl);
    db.prepare('UPDATE gallery SET thumbnail_url = ? WHERE thumbnail_url = ?').run(newUrl, oldUrl);
    db.prepare('UPDATE digital_library SET cover_image = ? WHERE cover_image = ?').run(newUrl, oldUrl);
  }

  // Ensure new setting keys exist on existing DBs
  const insertIfMissing = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  insertIfMissing.run('umbrella_logo_url', OFFICIAL_HEKAYET_LOGO);
  insertIfMissing.run('ministry_logo_url', OFFICIAL_MOSS_LOGO);
  insertIfMissing.run('favicon_url', OFFICIAL_SDG_LOGO);
  insertIfMissing.run('og_image_url', OFFICIAL_SDG_LOGO);
  insertIfMissing.run('home_logo_url', OFFICIAL_SDG_LOGO);
  insertIfMissing.run('auto_issue_card_on_apply', '1');

  // Seed initial Brand Logos manager rows if none exist
  const logoCount = (db.prepare('SELECT COUNT(*) as c FROM brand_logos').get() as { c: number }).c;
  if (logoCount === 0) {
    const insLogo = db.prepare(
      `INSERT INTO brand_logos (title_ar, title_en, role_key, logo_url, alt_text, placement, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
    );
    insLogo.run(
      'الشعار الرسمي لمبادرة جيل رقمي آمن',
      'Safe Digital Generation Official Logo',
      'main',
      OFFICIAL_SDG_LOGO,
      'شعار مبادرة جيل رقمي آمن — معًا لمستقبل رقمي آمن',
      'header_home_share',
      1
    );
    insLogo.run(
      'شعار الاتحاد النوعي حكاية وطن',
      'Hikayat Watan Community Development Union Logo',
      'umbrella',
      OFFICIAL_HEKAYET_LOGO,
      'شعار الاتحاد النوعي للجمعيات العاملة في مجال التنمية المجتمعية حكاية وطن',
      'footer_home_partners',
      2
    );
    insLogo.run(
      'شعار وزارة التضامن الاجتماعي',
      'Ministry of Social Solidarity Logo',
      'ministry',
      OFFICIAL_MOSS_LOGO,
      'شعار وزارة التضامن الاجتماعي — إشهار رقم 1279 لسنة 2025',
      'footer_home_partners',
      3
    );
  }

  // Seed starter dynamic questions for /join if none exist
  const qCount = (db.prepare('SELECT COUNT(*) as c FROM join_questions').get() as { c: number }).c;
  if (qCount === 0) {
    const insQ = db.prepare(
      `INSERT INTO join_questions (question_ar, question_en, field_type, options_json, placeholder_ar, is_required, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
    );
    insQ.run(
      'هل لديك خبرة سابقة في العمل التطوعي أو المبادرات الشبابية؟',
      'Do you have previous volunteering or youth initiative experience?',
      'yes_no',
      JSON.stringify(['نعم', 'لا']),
      '',
      1,
      1
    );
    insQ.run(
      'كيف تعرفت على مبادرة جيل رقمي آمن؟',
      'How did you hear about Safe Digital Generation?',
      'select',
      JSON.stringify(['صفحة فيسبوك الرسمية', 'إنستغرام / تيك توك', 'أحد أعضاء المبادرة', 'فعالية أو ندوة بالجامعة', 'أخرى']),
      '',
      0,
      2
    );
  }

  // One-time upgrade for legacy admin permissions_json rows
  const adminRows = db.prepare('SELECT id, role, permissions_json FROM admins').all() as { id: number; role: string; permissions_json: string }[];
  for (const row of adminRows) {
    if (row.role === 'super_admin') continue;
    try {
      const parsed = JSON.parse(row.permissions_json || '[]');
      if (Array.isArray(parsed)) {
        const upgraded = new Set<string>(parsed);
        let changed = false;
        if (!parsed.some((p: string) => p.includes(':create') || p.includes(':edit') || p.includes(':delete') || p === '__granular__')) {
          if (upgraded.has('members')) {
            upgraded.add('members:create');
            upgraded.add('members:edit');
            if (row.role === 'admin') upgraded.add('members:delete');
            changed = true;
          }
          if (upgraded.has('admins')) {
            upgraded.add('admins:create');
            upgraded.add('admins:edit');
            upgraded.add('admins:delete');
            changed = true;
          }
        }
        if ((upgraded.has('settings') || upgraded.has('media')) && !upgraded.has('logos') && !upgraded.has('__granular__')) {
          upgraded.add('logos');
          changed = true;
        }
        if (changed) {
          db.prepare('UPDATE admins SET permissions_json = ? WHERE id = ?').run(JSON.stringify(Array.from(upgraded)), row.id);
        }
      }
    } catch {
      // ignore invalid json
    }
  }
}

function seedInitialData() {
  const existingSetting = db.prepare('SELECT key FROM settings LIMIT 1').get();
  if (existingSetting) {
    // Optional env-based initial admin bootstrap if not yet present
    ensureEnvAdmin();
    return;
  }

  const defaultSettings: Record<string, string> = {
    site_name_ar: 'جيل رقمي آمن',
    site_name_en: 'SAFE DIGITAL GENERATION',
    site_slogan_ar: 'معًا لمستقبل رقمي آمن',
    site_slogan_en: 'Together for a Safe Digital Future',
    umbrella_text_ar:
      'تحت مظلة الاتحاد النوعي للجمعيات العاملة في مجال التنمية المجتمعية (حكاية وطن) — المشهر برقم 1279 لسنة 2025 بوزارة التضامن الاجتماعي',
    umbrella_text_en:
      'Under the umbrella of the Specific Union of Associations Working in Community Development (Hikayat Watan) — Registered No. 1279 of 2025 at the Ministry of Social Solidarity',
    email: 'generationdigitalsafe@gmail.com',
    phone: '01277714301',
    facebook_url: 'https://www.facebook.com/generation.digital.safe',
    instagram_url: 'https://www.instagram.com/generation.digital.safe/',
    tiktok_url: 'https://www.tiktok.com/@generation.digital.safe',
    logo_url: OFFICIAL_SDG_LOGO,
    umbrella_logo_url: OFFICIAL_HEKAYET_LOGO,
    ministry_logo_url: OFFICIAL_MOSS_LOGO,
    auto_issue_card_on_apply: '1',
    hero_image_url: '/src/assets/images/hero_digital_safety_1795097420204.jpg',
    primary_color: '#1d4ed8',
    navy_color: '#0a192f',
    cyan_color: '#06b6d4',
    accent_color: '#0ea5e9',
    marquee_enabled: 'true',
    marquee_speed: '28',
    marquee_direction: 'rtl',
    marquee_color_mode: 'color',
    founded_year: '2025',
    about_summary_ar:
      'مبادرة شبابية تكنولوجية ومجتمعية رائدة تهدف إلى بناء جيل واعٍ رقميًا ومحصّن ضد المخاطر السيبرانية، وقادر على توظيف أدوات البرمجة والذكاء الاصطناعي والتقنيات الحديثة في التنمية المستدامة وخدمة المجتمع.',
    about_summary_en:
      'A pioneering youth technological and community initiative dedicated to building a digitally aware generation resilient against cyber threats, empowered in programming, artificial intelligence, and digital citizenship.',
    vision_ar:
      'مجتمع مصري وعربي آمن رقميًا، يقوده شباب مبدع ومتمكن تكنولوجيًا يوظف الذكاء الاصطناعي والأمن السيبراني لبناء مستقبل مستدام.',
    vision_en:
      'A digitally safe Egyptian and Arab society led by technologically proficient youth leveraging AI and cybersecurity for sustainable development.',
    mission_ar:
      'نشر الوعي بالأمن الرقمي ومكافحة العنف الإلكتروني وتأهيل الشباب بمسارات تدريبية متخصصة في البرمجة والذكاء الاصطناعي والأمن السيبراني وريادة الأعمال الرقمية تحت مظلة مجتمعية رسمية.',
    mission_en:
      'Spreading digital safety awareness, combating cyber violence, and empowering youth through specialized training tracks in programming, AI, cybersecurity, and digital entrepreneurship.',
    values_json: JSON.stringify([
      { title_ar: 'الأمانة الرقمية', title_en: 'Digital Integrity', desc_ar: 'الالتزام بأخلاقيات التكنولوجيا وحماية الخصوصية.' },
      { title_ar: 'التمكين الشبابي', title_en: 'Youth Empowerment', desc_ar: 'صناعة قيادات شابة قادرة على الابتكار والتأثير.' },
      { title_ar: 'الشراكة المجتمعية', title_en: 'Civic Partnership', desc_ar: 'التكامل مع مؤسسات الدولة والمجتمع المدني.' },
      { title_ar: 'التعلم المستمر', title_en: 'Continuous Learning', desc_ar: 'مواكبة التطورات المتسارعة في الأمن السيبراني والذكاء الاصطناعي.' }
    ]),
    goals_json: JSON.stringify([
      { title_ar: 'نشر الوعي بالأمن الرقمي', title_en: 'Promote Digital Security Awareness' },
      { title_ar: 'تعزيز الاستخدام الآمن للتكنولوجيا', title_en: 'Encourage Safe Technology Usage' },
      { title_ar: 'التوعية بالعنف الرقمي والتنمر الإلكتروني', title_en: 'Combat Cyber Violence & Cyberbullying' },
      { title_ar: 'نشر ثقافة الأمن السيبراني', title_en: 'Foster Cybersecurity Culture' },
      { title_ar: 'دعم الشباب في تعلم البرمجة', title_en: 'Support Youth in Learning Programming' },
      { title_ar: 'نشر ثقافة الذكاء الاصطناعي', title_en: 'Advance AI Literacy' },
      { title_ar: 'تنمية المهارات الرقمية', title_en: 'Develop Digital Skills' },
      { title_ar: 'دعم الابتكار', title_en: 'Support Technological Innovation' },
      { title_ar: 'إعداد الشباب لسوق العمل', title_en: 'Prepare Youth for the Labor Market' },
      { title_ar: 'تعزيز المواطنة الرقمية', title_en: 'Strengthen Digital Citizenship' },
      { title_ar: 'تنفيذ برامج تدريبية وتوعوية', title_en: 'Deliver Training & Awareness Programs' },
      { title_ar: 'بناء مجتمع رقمي آمن', title_en: 'Build a Safe Digital Community' }
    ]),
    seo_title: 'جيل رقمي آمن — معًا لمستقبل رقمي آمن | SAFE DIGITAL GENERATION',
    seo_description:
      'المنصة الرسمية لمبادرة جيل رقمي آمن تحت مظلة الاتحاد النوعي حكاية وطن (1279 لسنة 2025) بوزارة التضامن الاجتماعي.',
    gsc_verification: ''
  };

  const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(defaultSettings)) {
    insertSetting.run(k, v);
  }

  // Official 9 Committees
  const committees = [
    {
      slug: 'human-resources',
      name_ar: 'لجنة الموارد البشرية',
      name_en: 'Human Resources Committee',
      description_ar: 'تختص باستقطاب المتطوعين وإدارة شؤون الأعضاء وتقييم الأداء وتنمية القدرات البشرية داخل المبادرة.',
      description_en: 'Responsible for volunteer recruitment, member onboarding, performance evaluation, and talent development.',
      tasks_ar: JSON.stringify(['استقبال وتقييم طلبات العضوية الجديدة', 'توزيع الأعضاء على اللجان وفق المهارات', 'متابعة التزام وتفاعل المتطوعين', 'تنظيم خطط بناء القدرات الداخلية']),
      sort_order: 1
    },
    {
      slug: 'organization',
      name_ar: 'لجنة التنظيم',
      name_en: 'Organization Committee',
      description_ar: 'تتولى التخطيط اللوجستي وتنظيم الفعاليات والمؤتمرات والندوات وورش العمل الميدانية والرقمية.',
      description_en: 'Handles logistical planning and execution of seminars, workshops, conferences, and awareness campaigns.',
      tasks_ar: JSON.stringify(['إعداد خطط التنظيم اللوجستي للفعاليات', 'إدارة القاعات والاستقبال والتسجيل الميداني', 'التنسيق مع اللجان لضمان سير الأنشطة', 'تأمين التجهيزات التقنية للورش']),
      sort_order: 2
    },
    {
      slug: 'training-education',
      name_ar: 'لجنة التدريب والتثقيف',
      name_en: 'Training & Education Committee',
      description_ar: 'تصمم وتنفذ الحقائب التدريبية والورش التوعوية في الأمن السيبراني والذكاء الاصطناعي والمواطنة الرقمية.',
      description_en: 'Designs and delivers training curricula and awareness workshops in cybersecurity, AI, and digital safety.',
      tasks_ar: JSON.stringify(['إعداد المناهج والأدلة التوعوية', 'تنسيق الدورات التدريبية والمدربين', 'تطوير اختبارات التقييم وإصدار الشهادات', 'عقد ندوات التثقيف الرقمي بالمدارس والجامعات']),
      sort_order: 3
    },
    {
      slug: 'technology',
      name_ar: 'لجنة التكنولوجيا',
      name_en: 'Technology Committee',
      description_ar: 'تقود البنية التقنية للمبادرة وتطوير المنصات الرقمية وأدوات الحماية ومبادرات البرمجة والذكاء الاصطناعي.',
      description_en: 'Leads technical infrastructure, digital platforms, cybersecurity tooling, and coding initiatives.',
      tasks_ar: JSON.stringify(['تطوير وصيانة المنصة الإلكترونية', 'تقديم الدعم الفني والأمني للمبادرة', 'قيادة مسارات البرمجة والأمن السيبراني', 'تطوير أدوات التوعية الرقمية التفاعلية']),
      sort_order: 4
    },
    {
      slug: 'public-relations',
      name_ar: 'لجنة العلاقات العامة',
      name_en: 'Public Relations Committee',
      description_ar: 'تبني جسور التعاون مع المؤسسات الحكومية والجمعيات الأهلية والجامعات وشركاء النجاح.',
      description_en: 'Builds partnerships with civic institutions, universities, NGOs, and institutional supporters.',
      tasks_ar: JSON.stringify(['التواصل مع الجهات الشريكة والداعمة', 'التنسيق المؤسسي تحت مظلة اتحاد حكاية وطن', 'تمثيل المبادرة في المحافل والملتقيات', 'توقيع بروتوكولات التعاون المشترك']),
      sort_order: 5
    },
    {
      slug: 'media',
      name_ar: 'لجنة الميديا',
      name_en: 'Media Committee',
      description_ar: 'تنتج المحتوى المرئي والتصاميم التوعوية والتغطية الإعلامية والتصوير الاحترافي لجميع أنشطة المبادرة.',
      description_en: 'Produces visual content, awareness graphics, photography, and video coverage for all activities.',
      tasks_ar: JSON.stringify(['تغطية الفعاليات والندوات بالصور والفيديو', 'إنتاج فيديوهات توعوية قصيرة للسلامة الرقمية', 'تصميم الهوية البصرية والمطبوعات', 'توثيق أرشيف المبادرة الإعلامي']),
      sort_order: 6
    },
    {
      slug: 'marketing',
      name_ar: 'لجنة التسويق',
      name_en: 'Marketing Committee',
      description_ar: 'تدير الحملات الرقمية ومنصات التواصل الاجتماعي لنشر رسالة المبادرة والوصول لأكبر شريحة من الشباب.',
      description_en: 'Manages digital outreach campaigns and social media channels to amplify youth engagement.',
      tasks_ar: JSON.stringify(['إدارة صفحات Facebook وInstagram وTikTok', 'تخطيط حملات التوعية الرقمية', 'تحليل التفاعل والوصول الجماهيري', 'الترويج للبرامج التدريبية والفعاليات']),
      sort_order: 7
    },
    {
      slug: 'monitoring-evaluation',
      name_ar: 'لجنة المتابعة والتقييم',
      name_en: 'Monitoring & Evaluation Committee',
      description_ar: 'تراقب مؤشرات الأداء وجودة البرامج التدريبية وتقيس الأثر المجتمعي لجميع مشروعات المبادرة.',
      description_en: 'Tracks KPIs, program quality, and community impact across all initiative projects.',
      tasks_ar: JSON.stringify(['قياس أثر الندوات والدورات التدريبية', 'إعداد تقارير الأداء الدورية للجان', 'مراجعة استبيانات رضا المستفيدين', 'تقديم توصيات التحسين المستمر']),
      sort_order: 8
    },
    {
      slug: 'research-development',
      name_ar: 'لجنة البحث والتطوير',
      name_en: 'Research & Development Committee',
      description_ar: 'تدرس أحدث التهديدات السيبرانية وتقنيات الذكاء الاصطناعي وتبتكر حلولًا ومشروعات توعوية جديدة.',
      description_en: 'Researches emerging cyber threats and AI trends to design innovative awareness projects.',
      tasks_ar: JSON.stringify(['إعداد أوراق بحثية حول السلامة الرقمية', 'رصد ظواهر التنمر والابتزاز الإلكتروني', 'ابتكار مشروعات ومسابقات تكنولوجية جديدة', 'تحديث محتوى المكتبة الرقمية']),
      sort_order: 9
    }
  ];

  const insertCommittee = db.prepare(`
    INSERT INTO committees (slug, name_ar, name_en, logo_url, description_ar, description_en, tasks_ar, head_name, head_title, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const c of committees) {
    insertCommittee.run(
      c.slug,
      c.name_ar,
      c.name_en,
      OFFICIAL_SDG_LOGO,
      c.description_ar,
      c.description_en,
      c.tasks_ar,
      'يُحدَّث عبر لوحة الإدارة',
      'رئيس اللجنة',
      c.sort_order
    );
  }

  // Official Institutional Partners (Real entities only, NO fake companies!)
  const insertPartner = db.prepare(`
    INSERT INTO partners (name_ar, name_en, partner_type, description_ar, description_en, logo_url, website_url, show_in_marquee, marquee_order, is_visible)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertPartner.run(
    'مبادرة جيل رقمي آمن',
    'Safe Digital Generation Initiative',
    'umbrella',
    'المبادرة الشبابية التكنولوجية الرسمية لنشر الوعي بالأمن الرقمي وبناء القدرات التقنية للشباب.',
    'Official youth technology initiative for digital safety awareness and technical capacity building.',
    OFFICIAL_SDG_LOGO,
    '/',
    1,
    1,
    1
  );
  insertPartner.run(
    'الاتحاد النوعي للجمعيات العاملة في مجال التنمية المجتمعية (حكاية وطن)',
    'Hikayat Watan Community Development Union',
    'umbrella',
    'المظلة الرسمية للمبادرة — المشهر برقم 1279 لسنة 2025 بوزارة التضامن الاجتماعي.',
    'Official umbrella federation — Registered No. 1279 of 2025 at the Ministry of Social Solidarity.',
    OFFICIAL_HEKAYET_LOGO,
    '',
    1,
    2,
    1
  );
  insertPartner.run(
    'وزارة التضامن الاجتماعي (إشهار رقم 1279 لسنة 2025)',
    'Ministry of Social Solidarity (Reg. 1279/2025)',
    'government',
    'الجهة الرسمية المشرفة على إشهار الاتحاد النوعي حكاية وطن الحاضن لمبادرة جيل رقمي آمن.',
    'Official ministry overseeing registration No. 1279 of 2025.',
    OFFICIAL_MOSS_LOGO,
    'https://www.moss.gov.eg',
    1,
    3,
    1
  );

  // Default Electronic Card Design + 3 Flexible Official Logos (Initiative + Hakaya Watan + Ministry)
  const designResult = db
    .prepare(
      `INSERT INTO card_designs (name, card_type, front_bg, back_bg, accent_color, text_color, orientation, show_expiry, footer_note_ar, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      'التصميم الرسمي المعتمد — جيل رقمي آمن',
      'standard',
      '#0A192F',
      '#0F172A',
      '#06B6D4',
      '#FFFFFF',
      'landscape',
      1,
      'تحت مظلة الاتحاد النوعي للجمعيات العاملة في مجال التنمية المجتمعية (حكاية وطن) — المشهر برقم 1279 لسنة 2025 بوزارة التضامن الاجتماعي',
      1
    );

  const insertCardLogo = db.prepare(`
    INSERT INTO card_logos (name, logo_url, side, card_type, x_percent, y_percent, width_px, height_px, sort_order, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertCardLogo.run('شعار مبادرة جيل رقمي آمن', OFFICIAL_SDG_LOGO, 'both', 'all', 4, 7, 46, 46, 1, 1);
  insertCardLogo.run('شعار اتحاد حكاية وطن', OFFICIAL_HEKAYET_LOGO, 'front', 'all', 72, 7, 42, 42, 2, 1);
  insertCardLogo.run('شعار وزارة التضامن الاجتماعي', OFFICIAL_MOSS_LOGO, 'front', 'all', 85, 7, 42, 42, 3, 1);
  insertCardLogo.run('شعار اتحاد حكاية وطن (الخلف)', OFFICIAL_HEKAYET_LOGO, 'back', 'all', 72, 8, 40, 40, 4, 1);
  insertCardLogo.run('شعار وزارة التضامن الاجتماعي (الخلف)', OFFICIAL_MOSS_LOGO, 'back', 'all', 85, 8, 40, 40, 5, 1);

  // Official News
  const insertNews = db.prepare(`
    INSERT INTO news (slug, title_ar, title_en, excerpt_ar, excerpt_en, content_ar, content_en, cover_image, author_name, category, keywords, committee_id, status, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertNews.run(
    'launch-safe-digital-generation-platform',
    'انطلاق المنصة الإلكترونية الرسمية لمبادرة جيل رقمي آمن تحت مظلة اتحاد حكاية وطن',
    'Official Launch of the Safe Digital Generation Platform under Hikayat Watan Union',
    'تدشين المنصة المؤسسية الرسمية لمبادرة جيل رقمي آمن لتعزيز الوعي السيبراني وتنمية المهارات الرقمية للشباب في مختلف المحافظات.',
    'Launching the official institutional platform for the Safe Digital Generation Initiative to empower youth in cybersecurity and digital skills.',
    'أعلنت مبادرة جيل رقمي آمن — SAFE DIGITAL GENERATION، العاملة تحت مظلة الاتحاد النوعي للجمعيات العاملة في مجال التنمية المجتمعية (حكاية وطن) المشهر برقم 1279 لسنة 2025 بوزارة التضامن الاجتماعي، عن إطلاق منصتها الإلكترونية الرسمية.\n\nتتيح المنصة للشباب والمتطوعين التقديم الإلكتروني للانضمام إلى لجان المبادرة التسع، والتسجيل في البرامج التدريبية المتخصصة في الأمن السيبراني والبرمجة والذكاء الاصطناعي، وإصدار كارنيهات العضوية الإلكترونية والشهادات المعتمدة المزودة برموز التحقق الرقمي QR Code.',
    'The Safe Digital Generation Initiative, operating under the Hikayat Watan Community Development Union (Reg. No. 1279/2025, Ministry of Social Solidarity), has officially launched its digital platform enabling youth volunteering, specialized tech training, and verified digital membership cards.',
    '/src/assets/images/hero_digital_safety_1795097420204.jpg',
    'المكتب الإعلامي للمبادرة',
    'بيانات رسمية',
    'جيل رقمي آمن, حكاية وطن, الأمن الرقمي, تدريب الشباب',
    4,
    'published',
    '2026-11-10T10:00:00Z'
  );
  insertNews.run(
    'cyber-safety-and-anti-bullying-campaign',
    'إطلاق الحملة الوطنية للتوعية بالأمن الرقمي ومكافحة العنف الإلكتروني',
    'Launching the National Digital Safety & Anti-Cyberbullying Awareness Campaign',
    'سلسلة ندوات وورش تفاعلية لطلاب الجامعات والمدارس حول حماية الخصوصية والتصدي للتنمر والابتزاز الإلكتروني.',
    'Interactive workshops and seminars for university and school students on digital privacy and combating cyberbullying.',
    'تستعد لجان التدريب والتثقيف والتكنولوجيا والعلاقات العامة بمبادرة جيل رقمي آمن لتنفيذ حزمة من الندوات التوعوية وورش العمل التطبيقية للتعريف بآليات الحماية الشخصية على شبكات التواصل الاجتماعي، ورفع الوعي القانوني والتقني لمواجهة العنف الرقمي والتنمر الإلكتروني.\n\nتستهدف الحملة تمكين الشباب وأولياء الأمور بأدوات عملية للتحقق من الروابط الآمنة، وإدارة الهوية الرقمية، وتفعيل المصادقة الثنائية لحماية البيانات.',
    'The Training, Technology, and PR committees are rolling out interactive sessions empowering students and families with practical cybersecurity hygiene and anti-cyberbullying tools.',
    '/src/assets/images/project_community_awareness_1795097420313.jpg',
    'لجنة التدريب والتثقيف',
    'حملات توعوية',
    'الأمن الرقمي, التنمر الإلكتروني, حماية الخصوصية',
    3,
    'published',
    '2026-11-14T12:00:00Z'
  );
  insertNews.run(
    'youth-ai-and-cybersecurity-bootcamp',
    'بدء التسجيل في المعسكر التدريبي المكثف للأمن السيبراني والذكاء الاصطناعي',
    'Registration Opens for the Intensive Cybersecurity & AI Youth Bootcamp',
    'برنامج تدريبي تطبيقي يجمع بين أساسيات الحماية السيبرانية وبناء حلول الذكاء الاصطناعي وتأهيل الشباب لسوق العمل التقني.',
    'Hands-on training bootcamp combining cybersecurity fundamentals, practical AI, and career readiness.',
    'فتحت لجنة التدريب والتثقيف بالتعاون مع لجنة التكنولوجيا باب التسجيل في الدفعة الجديدة من المعسكر التدريبي للشباب في مجالات الأمن السيبراني، والبرمجة، وتطبيقات الذكاء الاصطناعي المسؤولة.\n\nيحصل المتدربون عند اجتياز التقييم العملي على شهادة إلكترونية معتمدة من المبادرة مزودة برقم تسلسلي ورمز QR للتحقق الفوري عبر المنصة.',
    'Registration is now open for the upcoming youth bootcamp covering cybersecurity, programming, and responsible AI applications with verified digital certificates.',
    '/src/assets/images/training_cybersecurity_cover_1795097420656.jpg',
    'لجنة التكنولوجيا',
    'تدريب وتأهيل',
    'الأمن السيبراني, الذكاء الاصطناعي, البرمجة',
    4,
    'published',
    '2026-11-18T09:00:00Z'
  );

  // Events
  const insertEvent = db.prepare(`
    INSERT INTO events (title_ar, title_en, event_type, description_ar, description_en, cover_image, event_date, location, organizer, partners_text, status, committee_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertEvent.run(
    'ملتقى الشباب والأمن السيبراني 2026',
    'Youth & Cybersecurity Forum 2026',
    'conference',
    'ملتقى شبابي موسع يناقش تحديات الأمن الرقمي، حماية البيانات الشخصية، ودور الذكاء الاصطناعي في تعزيز السلامة المجتمعية.',
    'A comprehensive youth forum addressing cybersecurity challenges, personal data protection, and AI for community safety.',
    '/src/assets/images/project_community_awareness_1795097420313.jpg',
    '2026-12-12 10:00',
    'القاهرة — مركز الإبداع الشبابي والتنمية المجتمعية',
    'مبادرة جيل رقمي آمن',
    'الاتحاد النوعي حكاية وطن',
    'upcoming',
    2
  );
  insertEvent.run(
    'ورشة عمل: كيف تحمي حساباتك من الاختراق والهندسة الاجتماعية',
    'Workshop: Protecting Accounts from Phishing & Social Engineering',
    'workshop',
    'ورشة تطبيقية تفاعلية تستعرض أساليب التصيد الإلكتروني وطرق تأمين الحسابات والبيانات الشخصية عمليًا.',
    'Hands-on interactive workshop covering phishing defense, 2FA, and social engineering awareness.',
    '/src/assets/images/training_cybersecurity_cover_1795097420656.jpg',
    '2026-12-03 18:00',
    'أونلاين (بث تفاعلي مباشر)',
    'لجنة التكنولوجيا ولجنة التدريب',
    'مبادرة جيل رقمي آمن',
    'upcoming',
    4
  );

  // Training Programs (covering core requested tracks)
  const insertTraining = db.prepare(`
    INSERT INTO trainings (title_ar, title_en, track, trainer_name, description_ar, description_en, cover_image, start_date, hours, delivery_mode, seats_total, seats_taken, registration_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertTraining.run(
    'أساسيات الأمن السيبراني وحماية الشبكات',
    'Cybersecurity & Network Defense Fundamentals',
    'cybersecurity',
    'فريق لجنة التكنولوجيا والأمن السيبراني',
    'مسار تدريبي تأسيسي يغطي مفاهيم أمن المعلومات، تحليل الثغرات، حماية الأجهزة، والتعامل الآمن مع الشبكات.',
    'Foundational track covering information security, threat analysis, endpoint safety, and network protection.',
    '/src/assets/images/training_cybersecurity_cover_1795097420656.jpg',
    '2026-12-05',
    24,
    'hybrid',
    60,
    18,
    'open'
  );
  insertTraining.run(
    'الذكاء الاصطناعي التطبيقي وأخلاقيات التقنية',
    'Applied Artificial Intelligence & Tech Ethics',
    'ai',
    'فريق لجنة البحث والتطوير',
    'تدريب عملي على استخدام أدوات الذكاء الاصطناعي في الإنتاجية والبحث العلمي والوعي بمخاطر التزييف العميق.',
    'Practical training on leveraging AI tools productively while recognizing deepfakes and ethical risks.',
    '/src/assets/images/hero_digital_safety_1795097420204.jpg',
    '2026-12-15',
    18,
    'online',
    80,
    24,
    'open'
  );
  insertTraining.run(
    'البرمجة وتطوير تطبيقات الويب الآمنة',
    'Programming & Secure Web Development',
    'programming',
    'لجنة التكنولوجيا',
    'مقدمة شاملة في منطق البرمجة وتطوير الويب الحديث مع مراعاة معايير الأمان البرمجي وحماية بيانات المستخدمين.',
    'Comprehensive introduction to programming logic and secure modern web application development.',
    '/src/assets/images/training_cybersecurity_cover_1795097420656.jpg',
    '2027-01-10',
    36,
    'onsite',
    40,
    12,
    'open'
  );
  insertTraining.run(
    'السلامة الرقمية ومكافحة العنف الإلكتروني',
    'Digital Safety & Anti-Cyber Violence',
    'anti_cyber_violence',
    'لجنة التدريب والتثقيف',
    'برنامج توعوي وتأهيلي لإعداد سفراء السلامة الرقمية ومواجهة التنمر والابتزاز الإلكتروني قانونيًا وتقنيًا.',
    'Awareness and ambassador preparation program for combating online bullying and cyber harassment.',
    '/src/assets/images/project_community_awareness_1795097420313.jpg',
    '2026-12-20',
    12,
    'hybrid',
    100,
    31,
    'open'
  );

  // Projects
  const insertProject = db.prepare(`
    INSERT INTO projects (title_ar, title_en, description_ar, description_en, objectives_ar, target_audience_ar, cover_image, execution_date, partners_text, results_ar, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertProject.run(
    'مشروع سفراء الأمان الرقمي بالجامعات والمدارس',
    'Digital Safety Ambassadors in Universities & Schools',
    'مشروع مجتمعي لإعداد كوادر شبابية مدربة داخل الجامعات ومراكز الشباب لنشر ثقافة الاستخدام الآمن للتكنولوجيا.',
    'Community project training youth ambassadors across universities and youth centers in safe tech practices.',
    'تأهيل سفراء وعي رقمي في كل محافظة، وتقديم ورش تفاعلية للنشء والشباب حول الخصوصية والمواطنة الرقمية.',
    'طلاب الجامعات والمدارس الثانوية وأعضاء مراكز الشباب',
    '/src/assets/images/project_community_awareness_1795097420313.jpg',
    '2025 - 2026',
    'الاتحاد النوعي حكاية وطن',
    'تنفيذ فعاليات توعوية تفاعلية وإطلاق دليل الأسرة المصرية للأمان الرقمي.',
    'active'
  );
  insertProject.run(
    'حاضنة المهارات الرقمية والابتكار الشبابي',
    'Digital Skills & Youth Innovation Incubator',
    'مسار متكامل لتأهيل الشباب تقنيًا في البرمجة والذكاء الاصطناعي والتصميم وريادة الأعمال لسوق العمل.',
    'Integrated technical upskilling track preparing youth in coding, AI, design, and entrepreneurship.',
    'سد الفجوة بين التعليم الأكاديمي ومتطلبات سوق العمل الرقمي وبناء مشروعات تقنية مجتمعية.',
    'الشباب والخريجون من سن 16 إلى 30 عامًا',
    '/src/assets/images/hero_digital_safety_1795097420204.jpg',
    '2026',
    'مبادرة جيل رقمي آمن',
    'تخريج دفعات تدريبية مؤهلة بمشروعات تخرج تقنية تطبيقية.',
    'active'
  );

  // Gallery Albums & Items
  const album1 = db
    .prepare('INSERT INTO albums (title_ar, title_en, category, description_ar, cover_image) VALUES (?, ?, ?, ?, ?)')
    .run('فعاليات وندوات التوعية الرقمية', 'Digital Awareness Seminars', 'events', 'توثيق مرئي لندوات ولقاءات مبادرة جيل رقمي آمن.', '/src/assets/images/project_community_awareness_1795097420313.jpg');
  const album2 = db
    .prepare('INSERT INTO albums (title_ar, title_en, category, description_ar, cover_image) VALUES (?, ?, ?, ?, ?)')
    .run('ورش التدريب التقني والبرمجة', 'Tech & Coding Workshops', 'workshops', 'لقطات من ورش العمل التطبيقية في الأمن السيبراني والذكاء الاصطناعي.', '/src/assets/images/training_cybersecurity_cover_1795097420656.jpg');

  const insertGallery = db.prepare('INSERT INTO gallery (album_id, media_type, title_ar, title_en, url, thumbnail_url, event_date) VALUES (?, ?, ?, ?, ?, ?, ?)');
  insertGallery.run(album1.lastInsertRowid, 'image', 'ندوة المواطنة الرقمية والأمن السيبراني', 'Digital Citizenship Seminar', '/src/assets/images/project_community_awareness_1795097420313.jpg', '/src/assets/images/project_community_awareness_1795097420313.jpg', '2026-11-05');
  insertGallery.run(album2.lastInsertRowid, 'image', 'جلسة تدريب عملي على أمن الشبكات', 'Network Security Lab Session', '/src/assets/images/training_cybersecurity_cover_1795097420656.jpg', '/src/assets/images/training_cybersecurity_cover_1795097420656.jpg', '2026-11-12');
  insertGallery.run(album2.lastInsertRowid, 'image', 'فريق عمل المبادرة أثناء التحضير للبرامج التقنية', 'Tech Initiative Team Collaboration', '/src/assets/images/hero_digital_safety_1795097420204.jpg', '/src/assets/images/hero_digital_safety_1795097420204.jpg', '2026-11-15');

  // Digital Library
  const insertLib = db.prepare(`
    INSERT INTO digital_library (title_ar, title_en, category, description_ar, description_en, file_url, external_url, cover_image, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  insertLib.run(
    'الدليل الإرشادي للأمن الرقمي وحماية الخصوصية',
    'Digital Security & Privacy Protection Guide',
    'awareness_kit',
    'دليل عملي مبسط يوضح خطوات تأمين الحسابات، إدارة كلمات المرور، واكتشاف الروابط الاحتيالية.',
    'Practical guide covering account security, password hygiene, and phishing detection.',
    '',
    'https://www.cisa.gov/secure-our-world',
    '/src/assets/images/initiative_emblem_logo_1795097420098.jpg'
  );
  insertLib.run(
    'حقيبة مواجهة التنمر والعنف الإلكتروني للنشء والأسرة',
    'Anti-Cyberbullying Toolkit for Youth & Families',
    'pdf_guide',
    'مادة توعوية متكاملة للتعامل مع حالات الابتزاز والتنمر الإلكتروني وطرق الإبلاغ الرسمية.',
    'Comprehensive toolkit for preventing and reporting cyberbullying and online harassment.',
    '',
    'https://www.unicef.org/end-violence/how-to-stop-cyberbullying',
    '/src/assets/images/project_community_awareness_1795097420313.jpg'
  );
  insertLib.run(
    'مسار تعلم أساسيات الذكاء الاصطناعي والبرمجة للشباب',
    'Youth AI & Programming Learning Path',
    'training_material',
    'خارطة طريق مجانية ومصادر موثوقة لتعلم مبادئ البرمجة وعلوم الحاسب والذكاء الاصطناعي.',
    'Curated open learning roadmap for programming, computer science, and AI fundamentals.',
    '',
    'https://cs50.harvard.edu/x/',
    '/src/assets/images/training_cybersecurity_cover_1795097420656.jpg'
  );

  // Note: Leadership & Members start clean or with explicit institutional board placeholder entries only if updated by Admin.
  // Actually let's leave design_id reference ready.
  void designResult;
  ensureEnvAdmin();
}

export function ensureEnvAdmin() {
  const adminEmail = 'generationdigitalsafe@gmail.com';
  const envPass = process.env.INITIAL_ADMIN_PASSWORD;
  if (!envPass) return;

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail) as { id: number } | undefined;
  if (!existing) {
    const hash = bcrypt.hashSync(envPass, 12);
    const u = db
      .prepare('INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)')
      .run('المدير العام — جيل رقمي آمن', adminEmail, hash, 'super_admin', 'active');
    db.prepare('INSERT INTO admins (user_id, role, permissions_json, title_ar) VALUES (?, ?, ?, ?)').run(
      u.lastInsertRowid,
      'super_admin',
      JSON.stringify(['*']),
      'المشرف العام للمبادرة'
    );
  }
}

export function generateSafeCode(prefix: string): string {
  const year = new Date().getFullYear();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${year}-${rand}`;
}
