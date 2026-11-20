import React, { useState } from 'react';
import { CheckCircle2, Save } from 'lucide-react';

interface AdminSectionSaveBarProps {
  sectionName: string;
  notice?: string;
  onSave?: () => Promise<void> | void;
  saving?: boolean;
  saveLabel?: string;
  extraActions?: React.ReactNode;
}

export const AdminSectionSaveBar: React.FC<AdminSectionSaveBarProps> = ({
  sectionName,
  notice,
  onSave,
  saving = false,
  saveLabel = 'حفظ',
  extraActions
}) => {
  const [localSaved, setLocalSaved] = useState(false);

  const handleSave = async () => {
    if (onSave) {
      await onSave();
    }
    setLocalSaved(true);
    setTimeout(() => setLocalSaved(false), 3000);
  };

  return (
    <div className="space-y-3">
      {(notice || localSaved) && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice || 'تم الحفظ بنجاح وتحديث بيانات الموقع ✓'}</span>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="text-slate-600 font-medium">
          القسم: <strong className="text-slate-950">{sectionName}</strong> — يمكنك الإضافة أو التعديل أو الحذف ثم الضغط على حفظ لتأكيد التغييرات.
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {extraActions}
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors disabled:opacity-60 shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'جارٍ الحفظ...' : localSaved ? 'تم الحفظ ✓' : saveLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
