import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Gem,
  GraduationCap,
  Layers,
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
import type { CostumeResponse, CostumeType } from '../types';
import {
  Button,
  ConfirmDialog,
  FormField,
  Input,
  Modal,
  PageHeader,
  Textarea,
} from '@/components/ui';
import { cn } from '@/lib/utils';

interface CostumeTypeFormValues {
  name: string;
  description?: string;
}

const TILE_STYLES: { icon: LucideIcon; classes: string }[] = [
  { icon: GraduationCap, classes: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  { icon: Layers, classes: 'bg-pink-500/15 text-pink-700 dark:text-pink-300' },
  { icon: Shirt, classes: 'bg-blue-500/15 text-blue-700 dark:text-blue-300' },
  { icon: Sparkles, classes: 'bg-violet-500/15 text-violet-700 dark:text-violet-300' },
  { icon: Gem, classes: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
];

const CostumeTypesPage = () => {
  const [types, setTypes] = useState<CostumeType[]>([]);
  const [costumes, setCostumes] = useState<CostumeResponse[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CostumeType | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<CostumeTypeFormValues>();

  const load = async () => {
    try {
      const data = await costumeTypeService.getAll();
      setTypes(data);
      costumeService
        .getAll()
        .then(setCostumes)
        .catch(() => setCostumes(null));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', description: '' });
    setModalOpen(true);
  };

  const openEdit = (t: CostumeType) => {
    setEditing(t);
    reset({ name: t.name, description: t.description ?? '' });
    setModalOpen(true);
  };

  const onSubmit = async (data: CostumeTypeFormValues) => {
    try {
      if (editing) {
        await costumeTypeService.update(editing._id, data);
        toast.success('Cập nhật loại trang phục thành công!');
      } else {
        await costumeTypeService.create(data);
        toast.success('Thêm loại trang phục thành công!');
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
      await costumeTypeService.remove(confirmId);
      toast.success('Đã xoá loại trang phục.');
      await load();
    } catch {
      toast.error('Xoá thất bại, vui lòng thử lại.');
    }
    setConfirmId(null);
  };

  const costumeCounts = useMemo(() => {
    if (!costumes) return null;
    const counts = new Map<string, number>();
    costumes.forEach((c) => {
      if (c.type?._id) counts.set(c.type._id, (counts.get(c.type._id) ?? 0) + 1);
    });
    return counts;
  }, [costumes]);

  return (
    <div>
      <PageHeader
        kicker="Settings"
        title="Loại trang phục"
        description="Phân loại trang phục theo nhóm và kiểu dáng."
        action={
          <Button variant="gradient" onClick={openCreate}>
            <Plus />
            Thêm loại
          </Button>
        }
      />

      {loading ? (
        <div className="rounded-[14px] border bg-card py-10 text-center text-muted-foreground">
          Đang tải…
        </div>
      ) : types.length === 0 ? (
        <div className="rounded-[14px] border bg-card py-10 text-center text-muted-foreground">
          Chưa có loại trang phục nào
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {types.map((t, idx) => {
            const { icon: Icon, classes } = TILE_STYLES[idx % TILE_STYLES.length];
            const count = costumeCounts?.get(t._id) ?? 0;
            return (
              <div key={t._id} className="flex flex-col rounded-[14px] border bg-card p-5">
                <div className="flex items-start justify-between">
                  <span
                    className={cn(
                      'inline-flex h-10 w-10 items-center justify-center rounded-[10px]',
                      classes,
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-[30px] w-[30px] text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(t)}
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
                      onClick={() => setConfirmId(t._id)}
                      title="Xoá"
                      aria-label="Xoá"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <h3 className="mt-4 font-display text-[16px] font-bold">{t.name}</h3>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">{t.description || '—'}</p>
                {costumeCounts && (
                  <div className="mt-4 border-t pt-3 text-xs text-muted-foreground">
                    {count} trang phục
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Xác nhận xoá"
        message="Bạn có chắc muốn xoá loại trang phục này?"
        onConfirm={doDelete}
      />

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Sửa loại trang phục' : 'Thêm loại trang phục'}
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <FormField label="Tên loại" required htmlFor="name">
            <Input
              id="name"
              placeholder="VD: Cử nhân, Trang phục truyền thống..."
              {...register('name', { required: true })}
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
    </div>
  );
};

export default CostumeTypesPage;
