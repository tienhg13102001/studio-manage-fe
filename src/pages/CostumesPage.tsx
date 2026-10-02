import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Check, Pencil, Plus, Settings2, Shirt, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { costumeService } from '../services/costumeService';
import { costumeTypeService } from '../services/costumeTypeService';
import type { Costume, CostumeResponse, CostumeType } from '../types';
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  FormField,
  Input,
  Modal,
  PageHeader,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/components/ui';
import type { Column } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  CostumeTypeManagerModal,
  CostumeTypeQuickCreate,
  getTypeTile,
  type CostumeTypeChange,
} from '@/components/organisms/costumes';

interface CostumeFormValues {
  name: string;
  description?: string;
  gender: 'male' | 'female' | 'unisex';
  type?: string | null;
}

const GENDER_LABEL: Record<Costume['gender'], string> = {
  male: 'Nam',
  female: 'Nữ',
  unisex: 'Nam / Nữ',
};

const NO_TYPE = '__none__';
const CREATE_TYPE = '__create__';
const FORM_SELECT = 'h-10 data-[state=open]:border-primary max-sm:h-11 max-sm:text-base';
const FORM_LABEL = 'block text-[12.5px] font-semibold leading-[15px] text-muted-foreground';

const sortTypes = (types: CostumeType[]) =>
  [...types].sort((a, b) => a.name.localeCompare(b.name, 'vi'));

type GenderFilter = 'all' | Costume['gender'];

const GENDER_BADGE: Record<Costume['gender'], 'info' | 'pink' | 'violet'> = {
  male: 'info',
  female: 'pink',
  unisex: 'violet',
};

const CostumeThumb = ({ costume, className }: { costume: CostumeResponse; className?: string }) => {
  const { icon: Icon, classes } = getTypeTile(costume.type?._id ?? costume.name);
  return (
    <span
      className={cn(
        'inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] border',
        classes,
        className,
      )}
    >
      <Icon className="h-[15px] w-[15px]" />
    </span>
  );
};

const RowActions = ({
  onEdit,
  onDelete,
  className,
}: {
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}) => (
  <span className={cn('inline-flex items-center justify-end gap-1 [&_svg]:size-[15px]', className)}>
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-[30px] w-[30px] text-muted-foreground hover:text-foreground"
      onClick={onEdit}
      title="Sửa"
      aria-label="Sửa"
    >
      <Pencil className="h-3.5 w-3.5" />
    </Button>
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-[30px] w-[30px] text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
      onClick={onDelete}
      title="Xoá"
      aria-label="Xoá"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  </span>
);

const getTypeId = (type: CostumeType | null | undefined): string => type?._id ?? '';
const getTypeName = (type: CostumeType | null | undefined): string => type?.name ?? '—';

const CostumesPage = () => {
  const [costumes, setCostumes] = useState<CostumeResponse[]>([]);
  const [costumeTypes, setCostumeTypes] = useState<CostumeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CostumeResponse | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [typeManagerOpen, setTypeManagerOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const pendingCreateRef = useRef(false);
  const [pendingTypeId, setPendingTypeId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { isSubmitting },
  } = useForm<CostumeFormValues>();

  const load = async () => {
    try {
      const data = await costumeService.getAll();
      setCostumes(data);
    } finally {
      setLoading(false);
    }
  };

  const reloadTypes = async () => {
    const data = await costumeTypeService.getAll();
    setCostumeTypes(sortTypes(data));
  };

  const refreshAll = () => Promise.all([load(), reloadTypes()]);

  useEffect(() => {
    load();
    reloadTypes();
  }, []);

  const handleTypesChanged = async (change: CostumeTypeChange) => {
    if (change.kind === 'created') {
      setCostumeTypes((prev) => sortTypes([...prev, change.type]));
    } else {
      await refreshAll();
    }
  };

  // Select the new type only after its option has rendered: Radix syncs a hidden
  // native <select>, which falls back to '' when the value has no matching option.
  useEffect(() => {
    if (pendingTypeId && costumeTypes.some((t) => t._id === pendingTypeId)) {
      setValue('type', pendingTypeId, { shouldDirty: true });
      setPendingTypeId(null);
    }
  }, [pendingTypeId, costumeTypes, setValue]);

  const handleTypeQuickCreated = (type: CostumeType) => {
    setCostumeTypes((prev) => sortTypes([...prev, type]));
    setPendingTypeId(type._id);
    setQuickCreateOpen(false);
  };

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', description: '', gender: 'unisex', type: null });
    setQuickCreateOpen(false);
    setPendingTypeId(null);
    setModalOpen(true);
  };

  const openEdit = (costume: CostumeResponse) => {
    setEditing(costume);
    reset({
      name: costume.name,
      description: costume.description ?? '',
      gender: costume.gender ?? 'unisex',
      type: getTypeId(costume.type) || null,
    });
    setQuickCreateOpen(false);
    setPendingTypeId(null);
    setModalOpen(true);
  };

  const onSubmit = async (data: CostumeFormValues) => {
    const payload = { ...data, type: data.type || null };
    try {
      if (editing) {
        await costumeService.update(editing._id, payload);
        toast.success('Cập nhật trang phục thành công!');
      } else {
        await costumeService.create(payload);
        toast.success('Thêm trang phục thành công!');
      }
      setModalOpen(false);
      await load();
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const doDelete = async () => {
    if (!confirmId) return;
    try {
      await costumeService.remove(confirmId);
      toast.success('Đã xoá trang phục.');
      await load();
    } catch {
      toast.error('Xoá thất bại, vui lòng thử lại.');
    }
    setConfirmId(null);
  };

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    costumes.forEach((c) => {
      const id = getTypeId(c.type);
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    });
    return counts;
  }, [costumes]);

  const filtered = useMemo(
    () =>
      costumes.filter(
        (c) =>
          (typeFilter === 'all' || getTypeId(c.type) === typeFilter) &&
          (genderFilter === 'all' || c.gender === genderFilter),
      ),
    [costumes, typeFilter, genderFilter],
  );

  useEffect(() => {
    if (typeFilter !== 'all' && !typeCounts.has(typeFilter)) setTypeFilter('all');
  }, [typeFilter, typeCounts]);

  const emptyText =
    costumes.length > 0 ? 'Không có trang phục phù hợp bộ lọc' : 'Chưa có trang phục nào';

  const chips = [
    { id: 'all', label: 'Tất cả', count: costumes.length },
    ...costumeTypes
      .filter((t) => typeCounts.has(t._id))
      .map((t) => ({ id: t._id, label: t.name, count: typeCounts.get(t._id) ?? 0 })),
  ];

  const columns: Column<CostumeResponse>[] = [
    {
      key: 'name',
      header: 'Tên trang phục',
      render: (c) => (
        <span className="inline-flex items-center gap-2.5 text-[13.5px] font-semibold">
          <CostumeThumb costume={c} />
          {c.name}
        </span>
      ),
    },
    {
      key: 'gender',
      header: 'Giới tính',
      render: (c) =>
        c.gender ? (
          <Badge variant={GENDER_BADGE[c.gender]}>{GENDER_LABEL[c.gender]}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'type',
      header: 'Loại',
      render: (c) => (
        <span className="text-[13.5px] text-muted-foreground">{getTypeName(c.type)}</span>
      ),
    },
    {
      key: 'description',
      header: 'Mô tả',
      render: (c) => (
        <span className="text-[13px] text-[color:var(--text-faint)]">{c.description ?? '—'}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      className: 'whitespace-nowrap',
      render: (c) => <RowActions onEdit={() => openEdit(c)} onDelete={() => setConfirmId(c._id)} />,
    },
  ];

  return (
    <div className="flex flex-col md:min-h-0 md:flex-1">
      <PageHeader
        kicker="Settings"
        title="Trang phục"
        description="Quản lý danh mục trang phục dùng trong các buổi chụp."
        className="mb-3 md:mb-6 max-md:[&>div:first-child>span]:hidden max-md:[&>div:last-child]:hidden max-md:[&_h2]:hidden max-md:[&_p]:!mt-0 max-md:[&_p]:text-[13px]"
        action={
          <Button variant="gradient" className="hidden md:inline-flex" onClick={openCreate}>
            <Plus />
            Thêm trang phục
          </Button>
        }
      />

      {/* Mobile header actions */}
      <div className="mb-3.5 flex gap-2 md:hidden">
        <Button variant="gradient" className="h-[42px] flex-1" onClick={openCreate}>
          <Plus />
          Thêm trang phục
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-[42px] px-3.5"
          onClick={() => setTypeManagerOpen(true)}
        >
          <Settings2 />
          Quản lý loại
        </Button>
      </div>

      <div className="mb-3.5 flex flex-col gap-3.5 md:mb-6 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-2">
        <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] md:flex-wrap md:overflow-visible">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setTypeFilter(chip.id)}
              className={cn(
                'shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12.5px] font-semibold leading-[15px] transition-colors',
                typeFilter === chip.id
                  ? 'border-foreground bg-foreground text-background'
                  : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {chip.label} · {chip.count}
            </button>
          ))}
          <span className="hidden shrink-0 items-center gap-2 md:inline-flex">
            <span className="h-[18px] w-px bg-border" aria-hidden />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-[31px] gap-1.5 px-2.5 text-[12.5px] font-semibold text-muted-foreground [&_svg]:size-3.5"
              onClick={() => setTypeManagerOpen(true)}
            >
              <Settings2 />
              Quản lý loại
            </Button>
          </span>
        </div>
        <SegmentedControl<GenderFilter>
          value={genderFilter}
          onChange={setGenderFilter}
          className="rounded-[9px] [&>button]:min-w-0 [&>button]:rounded-[7px] [&>button]:leading-[15px] max-md:order-first max-md:flex max-md:w-full max-md:[&>button]:flex-1 max-md:[&>button]:px-1.5 max-md:[&>button]:py-[7px] max-md:[&>button]:text-[12.5px] md:[&>button]:px-2.5 md:[&>button]:py-[5px] md:[&>button]:text-[12px]"
          items={[
            { value: 'all', label: 'Tất cả' },
            { value: 'male', label: 'Nam' },
            { value: 'female', label: 'Nữ' },
            { value: 'unisex', label: 'Nam / Nữ' },
          ]}
        />
      </div>

      <div className="hidden md:flex md:min-h-0 md:flex-1 md:flex-col">
        <DataTable<CostumeResponse>
          fill
          className="min-h-0"
          loading={loading}
          data={filtered}
          keyExtractor={(c) => c._id}
          emptyTitle={emptyText}
          columns={columns}
          footer={
            !loading &&
            filtered.length > 0 && (
              <div className="border-t px-5 py-3 text-[12.5px] leading-[15px] text-[color:var(--text-faint)]">
                Hiển thị 1–{filtered.length} trong {filtered.length} trang phục
              </div>
            )
          }
        />
      </div>

      {/* Mobile list */}
      <div className="md:hidden">
        <div className="divide-y overflow-hidden rounded-[14px] border bg-card">
          {loading ? (
            <div className="py-10 text-center text-muted-foreground">Đang tải…</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">{emptyText}</div>
          ) : (
            filtered.map((c) => (
              <div key={c._id} className="flex items-start gap-3 px-3.5 py-3">
                <CostumeThumb costume={c} className="h-10 w-10 rounded-[10px] [&>svg]:size-4" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-semibold">{c.name}</span>
                    {c.gender && (
                      <Badge variant={GENDER_BADGE[c.gender]} className="shrink-0">
                        {GENDER_LABEL[c.gender]}
                      </Badge>
                    )}
                  </div>
                  {c.description && (
                    <p className="break-words text-xs text-[color:var(--text-faint)]">
                      {c.description}
                    </p>
                  )}
                  {c.type && (
                    <span className="text-xs font-medium text-muted-foreground">
                      {getTypeName(c.type)}
                    </span>
                  )}
                </div>
                <RowActions
                  className="shrink-0 gap-0.5"
                  onEdit={() => openEdit(c)}
                  onDelete={() => setConfirmId(c._id)}
                />
              </div>
            ))
          )}
        </div>
        {!loading && filtered.length > 0 && (
          <p className="mt-3.5 px-1 text-[12.5px] text-[color:var(--text-faint)]">
            Hiển thị {filtered.length} trang phục
          </p>
        )}
      </div>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Sửa trang phục' : 'Thêm trang phục'}
        size="sm"
        contentClassName="sm:max-w-[480px]"
        mobileSheet
        onEscapeKeyDown={(e) => {
          if (quickCreateOpen) {
            e.preventDefault();
            setQuickCreateOpen(false);
          }
        }}
        icon={<Shirt />}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Huỷ
            </Button>
            <Button type="submit" form="costume-form" variant="gradient" disabled={isSubmitting}>
              <Check />
              Lưu
            </Button>
          </>
        }
      >
        <form id="costume-form" onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
          <FormField label="Tên trang phục" required htmlFor="name" labelClassName={FORM_LABEL}>
            <Input
              id="name"
              className="max-sm:h-11"
              placeholder="VD: Đồng phục trường, Áo dài, Tự do..."
              {...register('name', { required: true })}
            />
          </FormField>
          <FormField label="Giới tính" required labelClassName={FORM_LABEL}>
            <Controller
              name="gender"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? 'unisex'} onValueChange={field.onChange}>
                  <SelectTrigger className={FORM_SELECT}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Nam</SelectItem>
                    <SelectItem value="female">Nữ</SelectItem>
                    <SelectItem value="unisex">Nam / Nữ</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label="Loại trang phục" htmlFor="costume-type" labelClassName={FORM_LABEL}>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || NO_TYPE}
                  onValueChange={(v) => {
                    // '' only comes from the hidden native select resync, never from a user pick
                    if (!v) return;
                    if (v === CREATE_TYPE) {
                      pendingCreateRef.current = true;
                      setQuickCreateOpen(true);
                      return;
                    }
                    field.onChange(v === NO_TYPE ? null : v);
                  }}
                >
                  <SelectTrigger
                    id="costume-type"
                    className={cn(FORM_SELECT, !field.value && 'text-[color:var(--text-faint)]')}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    onCloseAutoFocus={(e) => {
                      if (pendingCreateRef.current) {
                        e.preventDefault();
                        pendingCreateRef.current = false;
                      }
                    }}
                  >
                    <SelectItem value={NO_TYPE} className="text-[color:var(--text-faint)]">
                      — Không phân loại —
                    </SelectItem>
                    {costumeTypes.map((t) => (
                      <SelectItem key={t._id} value={t._id}>
                        {t.name}
                      </SelectItem>
                    ))}
                    <SelectSeparator />
                    <SelectItem
                      value={CREATE_TYPE}
                      className="bg-amber-500/15 py-[9px] font-semibold text-amber-700 focus:bg-amber-500/25 focus:text-amber-700 dark:text-amber-300 dark:focus:text-amber-300"
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-[6px] bg-amber-500 text-amber-950">
                          <Plus className="h-3.5 w-3.5" />
                        </span>
                        Tạo loại mới
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {quickCreateOpen && (
              <div className="mt-2">
                <CostumeTypeQuickCreate
                  existingNames={costumeTypes.map((t) => t.name)}
                  onCreated={handleTypeQuickCreated}
                  onCancel={() => setQuickCreateOpen(false)}
                  autoFocus
                />
              </div>
            )}
          </FormField>
          <FormField label="Mô tả" htmlFor="description" labelClassName={FORM_LABEL}>
            <Textarea
              id="description"
              rows={2}
              className="h-16 resize-none"
              placeholder="Mô tả thêm về trang phục..."
              {...register('description')}
            />
          </FormField>
        </form>
      </Modal>

      <CostumeTypeManagerModal
        open={typeManagerOpen}
        onOpenChange={setTypeManagerOpen}
        types={costumeTypes}
        costumeCounts={typeCounts}
        onChanged={handleTypesChanged}
      />

      <ConfirmDialog
        contentClassName="max-sm:max-w-[calc(100%-32px)] max-sm:rounded-[18px]"
        open={!!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Xác nhận xoá"
        message="Bạn có chắc muốn xoá trang phục này?"
        onConfirm={doDelete}
      />
    </div>
  );
};

export default CostumesPage;
