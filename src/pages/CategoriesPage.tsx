import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { AlertTriangle, FolderOpen, Pencil, Plus, RotateCw, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { categoryService } from '../services/categoryService';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchCategories } from '../store/slices/categoriesSlice';
import type { Category } from '../types';
import {
  Button,
  ConfirmDialog,
  FormField,
  Input,
  Modal,
  PageHeader,
  RowActions,
  Skeleton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { cn } from '@/lib/utils';

const CategoriesPage = () => {
  const dispatch = useAppDispatch();
  const { list: categories, loading, error } = useAppSelector((s) => s.categories);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting, errors },
  } = useForm<Partial<Category>>();

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const openCreate = (type: Category['type'] = 'income') => {
    setEditing(null);
    reset({ type });
    setModalOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    reset(c);
    setModalOpen(true);
  };

  const onSubmit = async (data: Partial<Category>) => {
    try {
      if (editing) {
        await categoryService.update(editing._id, data);
        toast.success('Cập nhật danh mục thành công!');
      } else {
        await categoryService.create(data);
        toast.success('Thêm danh mục thành công!');
      }
      setModalOpen(false);
      dispatch(fetchCategories());
    } catch {
      toast.error('Không lưu được danh mục. Kiểm tra kết nối rồi thử lại.');
    }
  };

  const doDelete = async () => {
    if (!confirmId) return;
    try {
      await categoryService.remove(confirmId);
      toast.success('Đã xoá danh mục.');
      dispatch(fetchCategories());
    } catch {
      toast.error('Xoá thất bại, vui lòng thử lại.');
    }
    setConfirmId(null);
  };

  const income = categories.filter((c) => c.type === 'income');
  const expense = categories.filter((c) => c.type === 'expense');

  const groups = [
    { type: 'income' as const, label: 'Khoản thu', list: income, dot: 'bg-emerald-600' },
    { type: 'expense' as const, label: 'Khoản chi', list: expense, dot: 'bg-red-600' },
  ];

  return (
    <div>
      <PageHeader
        title="Danh mục thu chi"
        description={
          loading && !categories.length
            ? 'Đang tải danh mục…'
            : error && !categories.length
              ? 'Phân loại giao dịch ở trang Tài chính.'
              : `${income.length} khoản thu · ${expense.length} khoản chi. Dùng để phân loại giao dịch ở trang Tài chính.`
        }
        action={
          <Button onClick={() => openCreate()} className="max-md:w-full">
            <Plus />
            Thêm danh mục
          </Button>
        }
      />

      {error && !categories.length ? (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-lg border bg-card px-6 py-12 text-center"
        >
          <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden />
          <p className="text-sm font-semibold text-foreground">Không tải được danh mục</p>
          <Button variant="outline" size="sm" onClick={() => dispatch(fetchCategories())}>
            <RotateCw /> Thử lại
          </Button>
        </div>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2 md:gap-5">
          {groups.map(({ type, label, list, dot }) => (
            <section
              key={type}
              aria-labelledby={`cat-${type}`}
              className="overflow-hidden rounded-lg border bg-card"
            >
              <div className="flex items-center justify-between gap-3 border-b px-4 py-3 md:px-5">
                <div className="flex items-baseline gap-2">
                  <span className={cn('h-2.5 w-2.5 self-center rounded-full', dot)} aria-hidden />
                  <h3 id={`cat-${type}`} className="font-display text-lg font-bold">
                    {label}
                  </h3>
                  <span className="tabular text-[13px] text-muted-foreground">{list.length}</span>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => openCreate(type)}>
                  <Plus /> Thêm
                </Button>
              </div>

              <ul className="divide-y">
                {loading && !categories.length
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <li key={i} className="px-5 py-3.5">
                        <Skeleton className="h-4 w-2/3" />
                      </li>
                    ))
                  : list.map((c) => (
                      <li
                        key={c._id}
                        className="flex items-center justify-between gap-3 py-1.5 pl-4 pr-2 md:pl-5"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="truncate text-sm font-medium text-foreground">
                            {c.name}
                          </span>
                          {c.isDefault && (
                            <span
                              className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                              title="Danh mục hệ thống dùng tự động, không xoá được"
                            >
                              Mặc định
                            </span>
                          )}
                        </div>
                        <RowActions
                          subject={`danh mục ${c.name}`}
                          primary={{
                            label: 'Sửa',
                            icon: <Pencil className="h-4 w-4" />,
                            onSelect: () => openEdit(c),
                          }}
                          actions={[
                            {
                              label: 'Xoá danh mục',
                              icon: <Trash2 className="h-4 w-4" />,
                              onSelect: () => setConfirmId(c._id),
                              destructive: true,
                              disabled: c.isDefault,
                            },
                          ]}
                        />
                      </li>
                    ))}
                {!loading && list.length === 0 && (
                  <li className="flex flex-col items-center justify-center gap-2 px-5 py-10 text-muted-foreground">
                    <FolderOpen className="h-6 w-6 opacity-60" aria-hidden />
                    <span className="text-sm">Chưa có {label.toLowerCase()}</span>
                  </li>
                )}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Sửa danh mục' : 'Thêm danh mục'}
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <FormField label="Tên danh mục" required htmlFor="name" error={errors.name?.message}>
            <Input
              id="name"
              aria-invalid={!!errors.name}
              {...register('name', {
                setValueAs: (v) => (v ?? '').trim(),
                validate: (v) => (v ?? '').trim() !== '' || 'Vui lòng nhập tên danh mục',
              })}
            />
          </FormField>
          <FormField label="Loại" required>
            <Controller
              name="type"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Thu</SelectItem>
                    <SelectItem value="expense">Chi</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Huỷ
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {editing ? 'Lưu thay đổi' : 'Thêm danh mục'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Xoá danh mục này?"
        message="Giao dịch đã gắn danh mục này sẽ không còn danh mục. Không thể hoàn tác."
        onConfirm={doDelete}
      />
    </div>
  );
};

export default CategoriesPage;
