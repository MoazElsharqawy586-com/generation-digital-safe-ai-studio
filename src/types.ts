export interface UserSession {
  userId: number;
  email: string;
  name: string;
  role: string;
  adminRole?: string;
  permissions: string[];
}

export interface Committee {
  id: number;
  slug: string;
  name_ar: string;
  name_en: string;
  logo_url: string;
  description_ar: string;
  description_en: string;
  tasks_ar: string;
  tasks_en?: string;
  head_name: string;
  head_title: string;
  deputy_head_name?: string;
  coordinator_name?: string;
  sort_order: number;
  is_active: number;
  members?: CommitteeMember[];
}

export interface CommitteeMember {
  id: number;
  committee_id: number;
  member_id: number | null;
  person_name: string;
  role_title: string;
  avatar_url: string;
  bio: string;
  joined_at: string;
  is_head: number;
}

export type LeadershipTier =
  | 'president'
  | 'vice_president'
  | 'board'
  | 'governorate_coordinator'
  | 'deputy_governorate_coordinator'
  | 'committee_coordinator'
  | 'committee_head'
  | 'deputy_committee_head'
  | 'committee_member';

export interface LeadershipItem {
  id: number;
  name_ar: string;
  name_en: string;
  role_ar: string;
  role_en: string;
  tier: LeadershipTier;
  committee_id: number | null;
  committee_name?: string;
  governorate?: string;
  avatar_url: string;
  bio_ar: string;
  bio_en: string;
  joined_at: string;
  sort_order: number;
  is_active: number;
}

export interface NewsItem {
  id: number;
  slug: string;
  title_ar: string;
  title_en: string;
  excerpt_ar: string;
  excerpt_en: string;
  content_ar: string;
  content_en: string;
  cover_image: string;
  cover_alt?: string;
  gallery_json: string;
  author_name: string;
  department_ar?: string;
  category: string;
  keywords: string;
  share_image_url?: string;
  logo_url?: string;
  committee_id: number | null;
  status: 'published' | 'draft' | 'hidden';
  published_at: string;
}

export interface EventItem {
  id: number;
  title_ar: string;
  title_en: string;
  event_type: string;
  description_ar: string;
  description_en: string;
  cover_image: string;
  cover_alt?: string;
  gallery_json: string;
  event_date: string;
  location: string;
  location_url?: string;
  attendance_mode?: 'online' | 'onsite' | 'hybrid';
  organizer: string;
  partners_text: string;
  registration_url: string;
  share_image_url?: string;
  logo_url?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  committee_id: number | null;
  registrations_count?: number;
}

export interface TrainingItem {
  id: number;
  title_ar: string;
  title_en: string;
  track: string;
  trainer_name: string;
  description_ar: string;
  description_en: string;
  cover_image: string;
  start_date: string;
  hours: number;
  delivery_mode: 'online' | 'onsite' | 'hybrid';
  location?: string;
  location_url?: string;
  seats_total: number;
  seats_taken: number;
  external_registration_url: string;
  registration_status: 'open' | 'closed' | 'completed';
}

export interface ProjectItem {
  id: number;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  objectives_ar: string;
  target_audience_ar: string;
  cover_image: string;
  cover_alt?: string;
  gallery_json?: string;
  execution_date: string;
  partners_text: string;
  results_ar: string;
  attendance_mode?: 'online' | 'onsite' | 'hybrid';
  location?: string;
  location_url?: string;
  external_url?: string;
  share_image_url?: string;
  logo_url?: string;
  status: 'active' | 'completed' | 'planned';
}

export interface PartnerItem {
  id: number;
  name_ar: string;
  name_en: string;
  partner_type: string;
  description_ar: string;
  description_en: string;
  logo_url: string;
  website_url: string;
  show_in_marquee: number;
  marquee_order: number;
  is_visible: number;
}

export interface BrandLogo {
  id: number;
  title_ar: string;
  title_en: string;
  role_key: string;
  logo_url: string;
  alt_text: string;
  placement: string;
  sort_order: number;
  is_active: number;
}

export interface AlbumItem {
  id: number;
  title_ar: string;
  title_en: string;
  category: string;
  description_ar: string;
  cover_image: string;
}

export interface GalleryItem {
  id: number;
  album_id: number | null;
  album_title?: string;
  media_type: 'image' | 'video';
  title_ar: string;
  title_en: string;
  url: string;
  thumbnail_url: string;
  event_date: string;
  caption_ar?: string;
  alt_text?: string;
  entity_type?: string;
  entity_id?: number | null;
}

export interface LibraryItem {
  id: number;
  title_ar: string;
  title_en: string;
  category: string;
  description_ar: string;
  description_en: string;
  file_url: string;
  external_url: string;
  cover_image: string;
  downloads_count: number;
  is_published: number;
}

export interface CardDesign {
  id: number;
  name: string;
  card_type: string;
  front_bg: string;
  back_bg: string;
  accent_color: string;
  text_color: string;
  orientation: string;
  show_expiry: number;
  footer_note_ar: string;
  header_title_ar?: string;
  header_title_en?: string;
  header_subtitle_ar?: string;
  card_badge_ar?: string;
  side_slogan_ar?: string;
  verify_badge_ar?: string;
  vp_title_ar?: string;
  vp_names_ar?: string;
  president_title_ar?: string;
  president_name_ar?: string;
  president_signature_url?: string;
  president_signature_text?: string;
  stamp_url?: string;
  show_stamp?: number;
  stamp_position?: 'over_signature' | 'right_center' | 'right_bottom' | 'back_left';
  whatsapp_number?: string;
  back_title_ar?: string;
  back_slogan_ar?: string;
  extra_rows_json?: string;
}

export interface CardLogo {
  id: number;
  name: string;
  logo_url: string;
  side: 'front' | 'back' | 'both';
  card_type: string;
  x_percent: number;
  y_percent: number;
  width_px: number;
  height_px: number;
  sort_order: number;
  is_active: number;
}

export interface CertificateItem {
  id: number;
  certificate_number: string;
  member_id: number | null;
  recipient_name: string;
  recipient_email: string;
  course_title: string;
  issue_date: string;
  trainer_name: string;
  template_style: string;
  activity_type?: string;
  training_id?: number | null;
  event_id?: number | null;
  hours_count?: number;
  grade_ar?: string;
  title_ar?: string;
  subtitle_ar?: string;
  body_text_ar?: string;
  primary_color?: string;
  accent_color?: string;
  status: 'valid' | 'revoked';
}

export interface JoinQuestion {
  id: number;
  question_ar: string;
  question_en: string;
  field_type: 'text' | 'textarea' | 'select' | 'radio' | 'yes_no' | 'number';
  options_json: string;
  placeholder_ar: string;
  is_required: number;
  sort_order: number;
  is_active: number;
}

export interface SiteStats {
  membersCount: number;
  committeesCount: number;
  trainingsCount: number;
  eventsCount: number;
  projectsCount: number;
  partnersCount: number;
  certificatesCount: number;
}
