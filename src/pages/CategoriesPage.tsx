import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { categoryService } from '../services/categoryService';
import { ConfirmModal, Modal } from '../components/organisms';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchCategories } from '../store/slices/categoriesSlice';
import { toast } from 'react-toastify';
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Danh mục thu / chi</h2>
        <button onClick={openCreate} className="btn-primary">
          + Thêm danh mục
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {[
          { label: 'Thu', list: income, color: 'text-green-600' },
          { label: 'Chi', list: expense, color: 'text-red-600' },
        ].map(({ label, list, color }) => (
          <div key={label} className="card p-0 overflow-hidden">
            <div className={`px-6 py-3 border-b bg-gray-50 font-semibold ${color}`}>{label}</div>
            <ul>
              {list.map((c) => (
                <li
                  key={c._id}
                  className="flex items-center justify-between px-6 py-3 border-b last:border-0 hover:bg-gray-50"
                >
                  <span className="text-sm font-medium text-gray-800">
                    {c.name}
                    {c.isDefault && <span className="ml-2 text-xs text-gray-400">(mặc định)</span>}
                  </span>
                  <div className="space-x-2">
                    <button
                      onClick={() => openEdit(c)}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      Sửa
                    </button>
                    {!c.isDefault && (
                      <button
                        onClick={() => handleDelete(c._id)}
                        className="text-red-600 hover:underline text-xs"
                      >
                        Xoá
                      </button>
                    )}
                  </div>
                </li>
              ))}
              {list.length === 0 && (
                <li className="px-6 py-4 text-sm text-gray-400">Chưa có danh mục</li>
              )}
            </ul>
          </div>
        ))}
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
            <select {...register('type', { required: true })} className="input">
              <option value="income">Thu</option>
              <option value="expense">Chi</option>
            </select>
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
