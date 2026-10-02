import { useState, type KeyboardEvent } from 'react';
import { CircleAlert, Info, Tag, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { costumeTypeService } from '@/services/costumeTypeService';
import type { CostumeType } from '@/types';
import { Button, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import { errMessage, normalizeTypeName } from './utils';

export interface CostumeTypeQuickCreateProps {
  existingNames: string[];
  onCreated: (type: CostumeType) => void;
  onCancel: () => void;
  autoFocus?: boolean;
}

const CostumeTypeQuickCreate = ({
  existingNames,
  onCreated,
  onCancel,
  autoFocus = true,
}: CostumeTypeQuickCreateProps) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (busy) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Nhập tên loại');
      return;
    }
    const key = normalizeTypeName(trimmed);
    if (existingNames.some((n) => normalizeTypeName(n) === key)) {
      setError('Loại trang phục đã tồn tại');
      return;
    }
    setBusy(true);
    let created: CostumeType | null = null;
    try {
      created = await costumeTypeService.create({ name: trimmed });
      toast.success(`Đã thêm loại “${created.name}”`);
    } catch (err) {
      setError(errMessage(err, 'Có lỗi xảy ra, vui lòng thử lại.'));
    } finally {
      setBusy(false);
    }
    if (created) onCreated(created);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void create();
    }
  };

  return (
    <div className="mt-1 space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={onKeyDown}
            autoFocus={autoFocus}
            disabled={busy}
            placeholder="Tên loại mới"
            aria-label="Tên loại mới"
            aria-invalid={!!error}
            className={cn(
              'h-9 pl-9 max-sm:h-10',
              error &&
                'border-rose-500 focus-visible:border-rose-500 focus-visible:ring-rose-500/20',
            )}
          />
        </div>
        <Button
          type="button"
          variant="gradient"
          className="h-9 shrink-0 px-3 max-sm:h-10 max-sm:px-3.5"
          onClick={() => void create()}
          disabled={busy}
        >
          Thêm
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 max-sm:h-10 max-sm:w-10"
          onClick={onCancel}
          disabled={busy}
          title="Huỷ"
          aria-label="Huỷ"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      {error ? (
        <p className="flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
          <CircleAlert className="h-[13px] w-[13px] shrink-0" />
          {error}
        </p>
      ) : (
        <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <Info className="h-[13px] w-[13px] shrink-0" />
          <span className="sm:hidden">Loại mới sẽ được tạo và chọn ngay.</span>
          <span className="hidden sm:inline">
            Loại mới sẽ được tạo và chọn ngay cho trang phục này.
          </span>
        </p>
      )}
    </div>
  );
};

export default CostumeTypeQuickCreate;
