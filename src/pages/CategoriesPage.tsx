import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { FaArrowDown, FaArrowUp, FaPencilAlt, FaPlus, FaRegFolderOpen, FaTrash } from 'react-icons/fa';
import { categoryService } from '../services/categoryService';
import { ConfirmModal, Modal } from '../components/organisms';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchCategories } from '../store/slices/categoriesSlice';
import { toast } from 'react-toastify';
import { Select } from '../components/atoms';
import type { Category } from '../types';

const CategoriesPage = () => {
  const dispatch = useAppDispatch();
  const { list: categories } = useAppSelector((s) => s.categories);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting },
  } = useForm<Partial<Category>>();

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const openCreate = () => {
    setEditing(null);
    reset({ type: 'income' });
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
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const handleDelete = (id: string) => setConfirmId(id);

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

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-kicker">Settings</span>
          <h2 className="page-title">Danh mục thu / chi</h2>
          <p className="page-subtitle">Quản lý các danh mục khoản thu và khoản chi.</p>
        </div>
        <button onClick={openCreate} className="btn-primary self-start md:self-auto inline-flex items-center gap-2">
          <FaPlus className="text-xs" />
          Thêm danh mục
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {[
          {
            key: 'income',
            label: 'Khoản thu',
            list: income,
            icon: <FaArrowDown />,
            accent: 'emerald',
          },
          {
            key: 'expense',
            label: 'Khoản chi',
            list: expense,
            icon: <FaArrowUp />,
            accent: 'rose',
          },
        ].map(({ key, label, list, icon, accent }) => {
          const accentClasses =
            accent === 'emerald'
              ? {
                  bg: 'bg-emerald-500/10',
                  text: 'text-emerald-600 dark:text-emerald-400',
                  ring: 'ring-emerald-500/20',
                  dot: 'bg-emerald-500',
                }
              : {
                  bg: 'bg-rose-500/10',
                  text: 'text-rose-600 dark:text-rose-400',
                  ring: 'ring-rose-500/20',
                  dot: 'bg-rose-500',
                };
          return (
            <div
              key={key}
              className="card p-0 overflow-hidden border border-[color:var(--card-border)]"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--card-border)]">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1 ${accentClasses.bg} ${accentClasses.text} ${accentClasses.ring}`}
                  >
                    {icon}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold theme-text-primary">{label}</h3>
                    <p className="text-xs theme-text-muted">
                      {list.length} danh mục
                    </p>
                  </div>
                </div>
              </div>

              <ul className="divide-y divide-[color:var(--card-border)]">
                {list.map((c) => (
                  <li
                    key={c._id}
                    className="group flex items-center justify-between gap-3 px-5 py-3 hover:bg-[var(--table-row-hover)] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${accentClasses.dot}`} />
                      <span className="text-sm font-medium theme-text-primary truncate">
                        {c.name}
                      </span>
                      {c.isDefault && (
                        <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full bg-slate-500/10 theme-text-muted">
                          Mặc định
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-blue-600 hover:bg-blue-500/10 dark:text-blue-400"
                        title="Sửa"
                      >
                        <FaPencilAlt className="text-xs" />
                      </button>
                      {!c.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleDelete(c._id)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                          title="Xoá"
                        >
                          <FaTrash className="text-xs" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
                {list.length === 0 && (
                  <li className="flex flex-col items-center justify-center gap-2 px-5 py-10 theme-text-muted">
                    <FaRegFolderOpen className="text-2xl opacity-60" />
                    <span className="text-sm">Chưa có danh mục</span>
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Sửa danh mục' : 'Thêm danh mục'}
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="label">Tên danh mục *</label>
            <input {...register('name', { required: true })} className="input" />
          </div>
          <div>
            <label className="label">Loại *</label>
            <Controller
              name="type"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Select
                  options={[
                    { value: 'income', label: 'Thu' },
                    { value: 'expense', label: 'Chi' },
                  ]}
                  value={field.value ?? ''}
                  onChange={(v) => field.onChange(v)}
                />
              )}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Huỷ
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              Lưu
            </button>
          </div>
        </form>
      </Modal>
      <ConfirmModal
        isOpen={!!confirmId}
        message="Bạn có chắc muốn xoá danh mục này?"
        onConfirm={doDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
};

export default CategoriesPage;
