import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Gem,
  GraduationCap,
  Pencil,
  Plus,
  Shirt,
  Sparkles,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
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
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/components/ui';
import type { Column } from '@/components/ui';
import { cn } from '@/lib/utils';

interface CostumeFormValues {
  name: string;
  description?: string;
  gender: 'male' | 'female' | 'unisex';
  type?: string;
}

const GENDER_LABEL: Record<Costume['gender'], string> = {
  male: 'Nam',
  female: 'Nữ',
  unisex: 'Nam / Nữ',
};

const NO_TYPE = '__none__';

type GenderFilter = 'all' | Costume['gender'];

const GENDER_BADGE: Record<Costume['gender'], 'info' | 'pink' | 'violet'> = {
  male: 'info',
  female: 'pink',
  unisex: 'violet',
};

const THUMB_STYLES: { icon: LucideIcon; classes: string }[] = [
  { icon: GraduationCap, classes: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  { icon: Shirt, classes: 'bg-blue-500/15 text-blue-700 dark:text-blue-300' },
  { icon: Sparkles, classes: 'bg-violet-500/15 text-violet-700 dark:text-violet-300' },
  { icon: Gem, classes: 'bg-pink-500/15 text-pink-700 dark:text-pink-300' },
];

const hashString = (str: string) =>
  [...str].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

const CostumeThumb = ({ costume }: { costume: CostumeResponse }) => {
  const { icon: Icon, classes } =
    THUMB_STYLES[hashString(costume.type?._id ?? costume.name) % THUMB_STYLES.length];
  return (
    <span
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]',
        classes,
      )}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
};

const RowActions = ({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) => (
  <span className="inline-flex items-center justify-end gap-1">
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

const getTypeId = (type: CostumeType | undefined): string => type?._id ?? '';
const getTypeName = (type: CostumeType | undefined): string => type?.name ?? '—';

const CostumesPage = () => {
  const [costumes, setCostumes] = useState<CostumeResponse[]>([]);
  const [costumeTypes, setCostumeTypes] = useState<CostumeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CostumeResponse | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');

  const {
    register,
    handleSubmit,
    reset,
    control,
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

  useEffect(() => {
    load();
    costumeTypeService.getAll().then(setCostumeTypes);
  }, []);

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', description: '', gender: 'unisex', type: '' });
    setModalOpen(true);
  };

  const openEdit = (costume: CostumeResponse) => {
    setEditing(costume);
    reset({
      name: costume.name,
      description: costume.description ?? '',
      gender: costume.gender ?? 'unisex',
      type: getTypeId(costume.type),
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: CostumeFormValues) => {
    try {
      if (editing) {
        await costumeService.update(editing._id, data);
        toast.success('Cập nhật trang phục thành công!');
      } else {
        await costumeService.create(data);
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
        <span className="inline-flex items-center gap-3 font-semibold">
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
      render: (c) => <span>{getTypeName(c.type)}</span>,
    },
    {
      key: 'description',
      header: 'Mô tả',
      render: (c) => <span className="text-muted-foreground">{c.description ?? '—'}</span>,
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
    <div>
      <PageHeader
        kicker="Settings"
        title="Trang phục"
        description="Quản lý danh mục trang phục dùng trong các buổi chụp."
        action={
          <Button variant="gradient" onClick={openCreate}>
            <Plus />
            Thêm trang phục
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setTypeFilter(chip.id)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors',
                typeFilter === chip.id
                  ? 'border-foreground bg-foreground text-background'
                  : 'bg-card text-foreground hover:bg-muted',
              )}
            >
              {chip.label} · {chip.count}
            </button>
          ))}
        </div>
        <SegmentedControl<GenderFilter>
          value={genderFilter}
          onChange={setGenderFilter}
          items={[
            { value: 'all', label: 'Tất cả' },
            { value: 'male', label: 'Nam' },
            { value: 'female', label: 'Nữ' },
            { value: 'unisex', label: 'Nam / Nữ' },
          ]}
        />
      </div>

      <div className="hidden md:block">
        <DataTable<CostumeResponse>
          loading={loading}
          data={filtered}
          keyExtractor={(c) => c._id}
          emptyTitle={emptyText}
          columns={columns}
        />
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="rounded-xl border bg-card py-10 text-center text-muted-foreground">
            Đang tải…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border bg-card py-10 text-center text-muted-foreground">
            {emptyText}
          </div>
        ) : (
          filtered.map((c) => (
            <div key={c._id} className="rounded-[14px] border bg-card p-4">
              <div className="flex items-start gap-3">
                <CostumeThumb costume={c} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{c.name}</div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {c.gender && (
                      <Badge variant={GENDER_BADGE[c.gender]}>{GENDER_LABEL[c.gender]}</Badge>
                    )}
                    {c.type && <Badge variant="neutral">{getTypeName(c.type)}</Badge>}
                  </div>
                </div>
                <RowActions onEdit={() => openEdit(c)} onDelete={() => setConfirmId(c._id)} />
              </div>
              {c.description && (
                <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>
              )}
            </div>
          ))
        )}
      </div>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Sửa trang phục' : 'Thêm trang phục'}
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <FormField label="Tên trang phục" required htmlFor="name">
            <Input
              id="name"
              placeholder="VD: Đồng phục trường, Áo dài, Tự do..."
              {...register('name', { required: true })}
            />
          </FormField>
          <FormField label="Giới tính" required>
            <Controller
              name="gender"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? 'unisex'} onValueChange={field.onChange}>
                  <SelectTrigger>
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
          <FormField label="Loại trang phục">
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || NO_TYPE}
                  onValueChange={(v) => field.onChange(v === NO_TYPE ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_TYPE}>-- Không phân loại --</SelectItem>
                    {costumeTypes.map((t) => (
                      <SelectItem key={t._id} value={t._id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label="Mô tả" htmlFor="description">
            <Textarea
              id="description"
              rows={2}
              placeholder="Mô tả thêm về loại trang phục..."
              {...register('description')}
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Huỷ
            </Button>
            <Button type="submit" variant="gradient" disabled={isSubmitting}>
              Lưu
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
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
