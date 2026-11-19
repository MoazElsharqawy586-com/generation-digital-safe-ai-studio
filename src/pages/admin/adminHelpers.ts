import { apiFetch } from '../../lib/authFetch';

export async function uploadAdminFile(file: File, folder: 'images' | 'logos' | 'avatars' | 'documents' | 'media' = 'images'): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await apiFetch(`/api/admin/upload?folder=${folder}`, {
    method: 'POST',
    body: fd
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'فشل رفع الملف');
  return data.url as string;
}

export function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const val = String(r[h] ?? '').replace(/"/g, '""');
          return `"${val}"`;
        })
        .join(',')
    )
  ].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
