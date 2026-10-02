import { useState, type KeyboardEvent } from 'react';
import {
  Check,
  CircleAlert,
  Info,
  Layers,
  Package,
  Pencil,
  Plus,
  ShieldAlert,
  Shirt,
  Trash2,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { costumeTypeService } from '@/services/costumeTypeService';
import type { CostumeType, CostumeTypeUsage } from '@/types';
import {
  Button,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  FormField,
  Input,
  Modal,
  Textarea,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { errMessage, getTypeTile, normalizeTypeName } from './utils';

export type CostumeTypeChange =
  | { kind: 'created'; type: CostumeType }
  | { kind: 'updated'; type: CostumeType }
  | { kind: 'deleted'; id: string };

export interface CostumeTypeManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  types: CostumeType[];
  costumeCounts: ReadonlyMap<string, number>;
  onChanged: (change: CostumeTypeChange) => void | Promise<void>;
}

/** Nhãn field theo design: 12.5px semibold màu muted */
const FIELD_LABEL = 'block text-[12.5px] font-semibold leading-[15px] text-muted-foreground';

const DUPLICATE_MSG = 'Loại trang phục đã tồn tại';

type ApiError = { response?: { status?: number; data?: { data?: unknown } } };

type EditorState = { mode: 'add' } | { mode: 'edit'; id: string };

interface BlockedState {
  id: string;
  name: string;
  usage: CostumeTypeUsage;
}

const isInUse = (u: CostumeTypeUsage) => u.costumeCount > 0 || u.packageCount > 0;

const usageLine = (count: number, label: string, names: string[]) =>
  `${count} ${label}${names.length ? ` · ${names.join(', ')}${count > names.length ? '…' : ''}` : ''}`;

const blockedMessage = ({ name, usage }: BlockedState) => {
  const parts: string[] = [];
  if (usage.costumeCount > 0) parts.push(`${usage.costumeCount} trang phục`);
  if (usage.packageCount > 0) parts.push(`${usage.packageCount} gói chụp`);
  const hint =
    usage.costumeCount > 0 && usage.packageCount > 0
      ? 'Hãy chuyển các trang phục sang loại khác hoặc gỡ khỏi gói chụp trước khi xoá.'
      : usage.costumeCount > 0
        ? 'Hãy chuyển các trang phục sang loại khác trước khi xoá.'
        : 'Hãy gỡ loại này khỏi gói chụp trước khi xoá.';
  return `Loại “${name}” đang được dùng cho ${parts.join(' và ')}. ${hint}`;
};

const CostumeTypeManagerModal = ({
  open,
  onOpenChange,
  types,
  costumeCounts,
  onChanged,
}: CostumeTypeManagerModalProps) => {
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [confirmType, setConfirmType] = useState<CostumeType | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [blocked, setBlocked] = useState<BlockedState | null>(null);

  const busy = saving || deleting || checkingId !== null;
  const isMobile = !useMediaQuery('(min-width: 640px)');

  const openEditor = (next: EditorState, initial?: CostumeType) => {
    if (busy) return;
    setEditor(next);
    setName(initial?.name ?? '');
    setDescription(initial?.description ?? '');
    setNameError(null);
  };

  const closeEditor = () => {
    setEditor(null);
    setNameError(null);
  };

  /** Lỗi khi tải lại danh sách không được hiện như lỗi của thao tác vừa thành công */
  const notifyChanged = async (change: CostumeTypeChange) => {
    try {
      await onChanged(change);
    } catch {
      toast.error('Không tải lại được danh sách');
    }
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) closeEditor();
    onOpenChange(o);
  };

  const save = async () => {
    if (!editor || saving) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Nhập tên loại');
      return;
    }
    const editingId = editor.mode === 'edit' ? editor.id : null;
    const key = normalizeTypeName(trimmed);
    if (types.some((t) => t._id !== editingId && normalizeTypeName(t.name) === key)) {
      setNameError(DUPLICATE_MSG);
      return;
    }
    setSaving(true);
    let change: CostumeTypeChange | null = null;
    try {
      const payload = { name: trimmed, description: description.trim() };
      if (editingId) {
        const type = await costumeTypeService.update(editingId, payload);
        toast.success('Cập nhật loại thành công!');
        change = { kind: 'updated', type };
      } else {
        const type = await costumeTypeService.create(payload);
        toast.success('Thêm loại thành công!');
        change = { kind: 'created', type };
      }
      closeEditor();
    } catch (err) {
      if ((err as ApiError)?.response?.status === 409) {
        setNameError(errMessage(err, DUPLICATE_MSG));
      } else {
        toast.error(errMessage(err, 'Có lỗi xảy ra, vui lòng thử lại.'));
      }
    }
    if (change) await notifyChanged(change);
    setSaving(false);
  };

  const onNameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void save();
    }
  };

  const requestDelete = async (t: CostumeType) => {
    if (busy) return;
    setCheckingId(t._id);
    try {
      const usage = await costumeTypeService.getUsage(t._id);
      if (isInUse(usage)) setBlocked({ id: t._id, name: t.name, usage });
      else setConfirmType(t);
    } catch (err) {
      toast.error(errMessage(err, 'Có lỗi xảy ra, vui lòng thử lại.'));
    } finally {
      setCheckingId(null);
    }
  };

  const doDelete = async () => {
    if (!confirmType || deleting) return;
    const target = confirmType;
    setDeleting(true);
    let deleted = false;
    try {
      await costumeTypeService.remove(target._id);
      toast.success('Đã xoá loại trang phục.');
      setConfirmType(null);
      if (editor?.mode === 'edit' && editor.id === target._id) closeEditor();
      deleted = true;
    } catch (err) {
      const res = (err as ApiError)?.response;
      if (res?.status === 409 && res.data?.data) {
        setConfirmType(null);
        setBlocked({
          id: target._id,
          name: target.name,
          usage: res.data.data as CostumeTypeUsage,
        });
      } else {
        toast.error(errMessage(err, 'Xoá thất bại, vui lòng thử lại.'));
      }
    }
    if (deleted) await notifyChanged({ kind: 'deleted', id: target._id });
    setDeleting(false);
  };

  const renderEditor = () => (
    <div
      className={cn(
        isMobile
          ? 'space-y-3.5'
          : 'space-y-3 rounded-xl border-[1.5px] border-primary bg-muted/40 p-3.5',
        !isMobile && nameError && 'border-rose-500',
      )}
    >
      {!isMobile && (
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
            {editor?.mode === 'edit' ? (
              <Pencil className="h-3.5 w-3.5" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
          </span>
          <p className="text-[13.5px] font-bold">
            {editor?.mode === 'edit' ? 'Sửa loại' : 'Loại mới'}
          </p>
        </div>
      )}
      <FormField label="Tên loại" required htmlFor="costume-type-name" labelClassName={FIELD_LABEL}>
        <Input
          id="costume-type-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError) setNameError(null);
          }}
          onKeyDown={onNameKeyDown}
          autoFocus
          disabled={saving}
          placeholder="VD: Cử nhân, Trang phục truyền thống..."
          aria-invalid={!!nameError}
          className={cn(
            isMobile ? 'h-11' : 'md:text-[13.5px]',
            nameError &&
              'border-rose-500 focus-visible:border-rose-500 focus-visible:ring-rose-500/20',
          )}
        />
        {nameError && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
            <CircleAlert className="h-[13px] w-[13px] shrink-0" />
            {nameError}
          </p>
        )}
      </FormField>
      <FormField label="Mô tả" htmlFor="costume-type-description" labelClassName={FIELD_LABEL}>
        <Textarea
          id="costume-type-description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={saving}
          placeholder="Mô tả thêm về loại trang phục..."
          className={cn('resize-none', isMobile ? 'min-h-[72px]' : 'h-16 min-h-0 md:text-[13.5px]')}
        />
      </FormField>
      <div className={isMobile ? 'grid grid-cols-2 gap-2.5' : 'flex justify-end gap-2'}>
        <Button
          type="button"
          variant={isMobile ? 'outline' : 'ghost'}
          className={isMobile ? 'h-11' : 'h-[34px]'}
          onClick={closeEditor}
          disabled={saving}
        >
          Huỷ
        </Button>
        <Button
          type="button"
          variant="gradient"
          className={isMobile ? 'h-11' : 'h-[34px]'}
          onClick={() => void save()}
          disabled={saving}
        >
          <Check />
          Lưu
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Modal
        open={open}
        onOpenChange={handleOpenChange}
        title="Quản lý loại trang phục"
        description="Loại dùng để phân nhóm và lọc trang phục."
        size="sm"
        contentClassName="sm:max-w-[560px]"
        className="space-y-3 pb-5 pt-3.5 max-sm:space-y-3.5"
        icon={<Layers />}
        footer={
          isMobile ? undefined : (
            <>
              <p className="flex min-w-0 flex-1 items-center gap-1.5 text-[12px] text-[var(--text-faint)]">
                <Info className="h-3.5 w-3.5 shrink-0" />
                Loại chưa có trang phục sẽ không hiện ở bộ lọc.
              </p>
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                onClick={() => handleOpenChange(false)}
              >
                Đóng
              </Button>
            </>
          )
        }
        onEscapeKeyDown={(e) => {
          // Mobile: Esc ở màn thêm/sửa quay về danh sách thay vì đóng sheet
          if (isMobile && editor) {
            e.preventDefault();
            closeEditor();
          }
        }}
        mobileSheet
        mobileTitle={
          editor
            ? editor.mode === 'edit'
              ? 'Sửa loại trang phục'
              : 'Thêm loại trang phục'
            : 'Loại trang phục'
        }
        mobileDescription={editor ? null : 'Phân nhóm và lọc trang phục.'}
      >
        {isMobile && editor ? (
          renderEditor()
        ) : (
          <>
            <div className="divide-y overflow-hidden rounded-xl border bg-card">
              {types.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Chưa có loại trang phục nào
                </div>
              ) : (
                types.map((t) => {
                  if (editor?.mode === 'edit' && editor.id === t._id) {
                    return (
                      <div key={t._id} className="p-2">
                        {renderEditor()}
                      </div>
                    );
                  }
                  const { icon: Icon, classes } = getTypeTile(t._id);
                  const count = costumeCounts.get(t._id) ?? 0;
                  return (
                    <div
                      key={t._id}
                      className={cn(
                        'flex items-center gap-3 py-3 pl-3.5 pr-3 transition-colors max-sm:gap-2.5 max-sm:py-[11px] max-sm:pl-3 max-sm:pr-2',
                        blocked?.id === t._id && 'bg-amber-500/10',
                        confirmType?._id === t._id && 'bg-rose-500/10',
                      )}
                    >
                      <span
                        className={cn(
                          'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]',
                          classes,
                        )}
                      >
                        <Icon className="h-[17px] w-[17px]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-semibold leading-4 max-sm:text-[14px] max-sm:leading-[17px]">
                          {t.name}
                        </p>
                        <p className="mt-0.5 truncate text-[12px] leading-[15px] text-[var(--text-faint)] max-sm:whitespace-normal">
                          {t.description || '—'}
                          <span className="sm:hidden"> · {count} trang phục</span>
                        </p>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 text-[12px] font-medium max-sm:hidden',
                          count === 0 ? 'text-[var(--text-faint)]' : 'text-muted-foreground',
                        )}
                      >
                        {count} trang phục
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 max-sm:gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-[30px] w-[30px] text-muted-foreground hover:text-foreground max-sm:h-[34px] max-sm:w-[34px]"
                          onClick={() => openEditor({ mode: 'edit', id: t._id }, t)}
                          disabled={busy}
                          title="Sửa"
                          aria-label="Sửa"
                        >
                          <Pencil className="h-3.5 w-3.5 max-sm:h-4 max-sm:w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-[30px] w-[30px] text-rose-600 hover:bg-rose-500/10 dark:text-rose-400 max-sm:h-[34px] max-sm:w-[34px]"
                          onClick={() => void requestDelete(t)}
                          disabled={busy}
                          title="Xoá"
                          aria-label="Xoá"
                        >
                          <Trash2
                            className={cn(
                              'h-3.5 w-3.5 max-sm:h-4 max-sm:w-4',
                              checkingId === t._id && 'animate-pulse',
                            )}
                          />
                        </Button>
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {editor?.mode === 'add' ? (
              renderEditor()
            ) : (
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full rounded-[10px] border-[1.5px] text-[13px] font-semibold text-muted-foreground [&_svg]:size-[15px] max-sm:h-11 max-sm:text-[14px] max-sm:[&_svg]:size-4"
                onClick={() => openEditor({ mode: 'add' })}
                disabled={busy}
              >
                <Plus />
                Thêm loại
              </Button>
            )}
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmType}
        onOpenChange={(o) => !o && !deleting && setConfirmType(null)}
        title="Xoá loại trang phục?"
        message={`Bạn có chắc muốn xoá loại “${confirmType?.name ?? ''}”? Hành động này không thể hoàn tác.`}
        icon={<Trash2 />}
        iconClassName="bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
        confirmIcon={<Trash2 />}
        confirmClassName="dark:bg-rose-400 dark:text-[#14151F] dark:hover:bg-rose-400/90"
        contentClassName="sm:max-w-[420px] sm:rounded-2xl [&>button:last-child]:hidden max-sm:max-w-[calc(100%-32px)] max-sm:rounded-[18px]"
        onConfirm={() => void doDelete()}
      />

      <Dialog open={!!blocked} onOpenChange={(o) => !o && setBlocked(null)}>
        <DialogContent className="grid-cols-[minmax(0,1fr)] sm:max-w-[420px] sm:rounded-2xl [&>button:last-child]:hidden max-sm:max-w-[calc(100%-32px)] max-sm:rounded-[18px]">
          {blocked && (
            <div className="space-y-4">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                <ShieldAlert className="h-5 w-5" />
              </span>
              <div className="space-y-1.5">
                <DialogTitle className="text-[18px]">Không thể xoá loại này</DialogTitle>
                <DialogDescription className="text-[13.5px]">
                  {blockedMessage(blocked)}
                </DialogDescription>
              </div>
              <div className="space-y-1.5 rounded-[10px] bg-muted/60 px-3 py-2.5 text-[12.5px] text-muted-foreground">
                {blocked.usage.costumeCount > 0 && (
                  <p className="flex items-start gap-2">
                    <Shirt className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--text-faint)]" />
                    <span className="min-w-0">
                      {usageLine(
                        blocked.usage.costumeCount,
                        'trang phục',
                        blocked.usage.costumeNames,
                      )}
                    </span>
                  </p>
                )}
                {blocked.usage.packageCount > 0 && (
                  <p className="flex items-start gap-2">
                    <Package className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--text-faint)]" />
                    <span className="min-w-0">
                      {usageLine(
                        blocked.usage.packageCount,
                        'gói chụp',
                        blocked.usage.packageNames,
                      )}
                    </span>
                  </p>
                )}
              </div>
              <div className="flex justify-end">
                <Button type="button" variant="gradient" onClick={() => setBlocked(null)}>
                  Đã hiểu
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CostumeTypeManagerModal;
