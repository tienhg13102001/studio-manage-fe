import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Plus } from 'lucide-react';
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

const getTypeId = (type: CostumeType | undefined): string => type?._id ?? '';
const getTypeName = (type: CostumeType | undefined): string => type?.name ?? '—';

const CostumesPage = () => {
  const [costumes, setCostumes] = useState<CostumeResponse[]>([]);
  const [costumeTypes, setCostumeTypes] = useState<CostumeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CostumeResponse | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

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

  const columns: Column<CostumeResponse>[] = [
    {
      key: 'name',
      header: 'Tên trang phục',
      render: (c) => <span className="font-medium">{c.name}</span>,
    },
    {
      key: 'gender',
      header: 'Giới tính',
      render: (c) => (
        <span className="text-muted-foreground">{GENDER_LABEL[c.gender] ?? '—'}</span>
      ),
    },
    {
      key: 'type',
      header: 'Loại',
      render: (c) => <span className="text-muted-foreground">{getTypeName(c.type)}</span>,
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
      render: (c) => (
        <span className="space-x-2">
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs text-primary"
            onClick={() => openEdit(c)}
          >
            Sửa
          </Button>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs text-destructive"
            onClick={() => setConfirmId(c._id)}
          >
            Xoá
          </Button>
        </span>
      ),
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

      <div className="hidden md:block">
        <DataTable<CostumeResponse>
          loading={loading}
          data={costumes}
          keyExtractor={(c) => c._id}
          emptyTitle="Chưa có trang phục nào"
          columns={columns}
        />
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="rounded-xl border bg-card py-10 text-center text-muted-foreground">
            Đang tải…
          </div>
        ) : costumes.length === 0 ? (
          <div className="rounded-xl border bg-card py-10 text-center text-muted-foreground">
            Chưa có trang phục nào
          </div>
        ) : (
          costumes.map((c) => {
            const genderStyle =
              c.gender === 'male'
                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                : c.gender === 'female'
                  ? 'bg-pink-500/15 text-pink-600 dark:text-pink-400'
                  : 'bg-purple-500/15 text-purple-600 dark:text-purple-400';
            return (
              <div key={c._id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{c.name}</div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <Badge variant="outline" className={cn('border-transparent', genderStyle)}>
                        {GENDER_LABEL[c.gender] ?? '—'}
                      </Badge>
                      {c.type && <Badge variant="outline">{getTypeName(c.type)}</Badge>}
                    </div>
                  </div>
                </div>
                {c.description && (
                  <p className="text-sm text-muted-foreground italic">{c.description}</p>
                )}
                <div className="flex justify-end gap-3 mt-3 pt-3 border-t">
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => openEdit(c)}
                  >
                    Sửa
                  </Button>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs text-destructive"
                    onClick={() => setConfirmId(c._id)}
                  >
                    Xoá
                  </Button>
                </div>
              </div>
            );
          })
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
