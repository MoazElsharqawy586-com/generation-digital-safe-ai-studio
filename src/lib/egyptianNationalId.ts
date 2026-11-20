export const EGYPTIAN_GOVERNORATES: Record<string, string> = {
  '01': 'القاهرة',
  '02': 'الإسكندرية',
  '03': 'بورسعيد',
  '04': 'السويس',
  '11': 'دمياط',
  '12': 'الدقهلية',
  '13': 'الشرقية',
  '14': 'القليوبية',
  '15': 'كفر الشيخ',
  '16': 'الغربية',
  '17': 'المنوفية',
  '18': 'البحيرة',
  '19': 'الإسماعيلية',
  '21': 'الجيزة',
  '22': 'بني سويف',
  '23': 'الفيوم',
  '24': 'المنيا',
  '25': 'أسيوط',
  '26': 'سوهاج',
  '27': 'قنا',
  '28': 'أسوان',
  '29': 'الأقصر',
  '31': 'البحر الأحمر',
  '32': 'الوادي الجديد',
  '33': 'مطروح',
  '34': 'شمال سيناء',
  '35': 'جنوب سيناء',
  '88': 'خارج الجمهورية'
};

const AR_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر'
];

export interface ParsedEgyptianNationalId {
  clean: string;
  isValid: boolean;
  errorAr: string;
  birthDateISO: string;
  birthDateAr: string;
  gender: 'ذكر' | 'أنثى' | '';
  age: number | null;
  governorateCode: string;
  governorate: string;
}

export function normalizeArabicDigits(raw: string): string {
  return String(raw || '').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

export function parseEgyptianNationalId(raw: string): ParsedEgyptianNationalId {
  const clean = normalizeArabicDigits(raw).replace(/\D/g, '').slice(0, 14);

  if (clean.length < 14) {
    return {
      clean,
      isValid: false,
      errorAr: clean.length > 0 ? 'يجب أن يتكون الرقم القومي من 14 رقمًا' : '',
      birthDateISO: '',
      birthDateAr: '',
      gender: '',
      age: null,
      governorateCode: '',
      governorate: ''
    };
  }

  if (!/^[23]\d{13}$/.test(clean)) {
    return {
      clean,
      isValid: false,
      errorAr: 'الرقم القومي المصري يجب أن يبدأ بـ 2 أو 3 ويتكون من 14 رقمًا',
      birthDateISO: '',
      birthDateAr: '',
      gender: '',
      age: null,
      governorateCode: '',
      governorate: ''
    };
  }

  const century = clean[0] === '2' ? 1900 : 2000;
  const year = century + Number(clean.slice(1, 3));
  const month = Number(clean.slice(3, 5));
  const day = Number(clean.slice(5, 7));
  const governorateCode = clean.slice(7, 9);
  const governorate = EGYPTIAN_GOVERNORATES[governorateCode] || '';

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return {
      clean,
      isValid: false,
      errorAr: 'تاريخ الميلاد داخل الرقم القومي غير صحيح',
      birthDateISO: '',
      birthDateAr: '',
      gender: '',
      age: null,
      governorateCode,
      governorate
    };
  }

  const dt = new Date(Date.UTC(year, month - 1, day));
  const now = new Date();
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day ||
    dt.getTime() > now.getTime()
  ) {
    return {
      clean,
      isValid: false,
      errorAr: 'تاريخ الميلاد داخل الرقم القومي غير صالح',
      birthDateISO: '',
      birthDateAr: '',
      gender: '',
      age: null,
      governorateCode,
      governorate
    };
  }

  if (!governorate) {
    return {
      clean,
      isValid: false,
      errorAr: `كود المحافظة (${governorateCode}) غير مسجل ضمن أكواد المحافظات المصرية`,
      birthDateISO: '',
      birthDateAr: '',
      gender: '',
      age: null,
      governorateCode,
      governorate: ''
    };
  }

  const genderDigit = Number(clean[12]);
  const gender: 'ذكر' | 'أنثى' = genderDigit % 2 === 1 ? 'ذكر' : 'أنثى';
  const birthDateISO = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const birthDateAr = `${day} ${AR_MONTHS[month - 1]} ${year}`;

  let age = now.getFullYear() - year;
  const monthDiff = now.getMonth() + 1 - month;
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < day)) {
    age--;
  }

  return {
    clean,
    isValid: true,
    errorAr: '',
    birthDateISO,
    birthDateAr,
    gender,
    age: Math.max(0, age),
    governorateCode,
    governorate
  };
}
