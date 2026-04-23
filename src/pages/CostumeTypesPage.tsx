import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { ConfirmModal, DataTable, Modal } from '../components/organisms';
import type { Column } from '../components/organisms';
import { costumeTypeService } from '../services/costumeTypeService';
import type { CostumeType } from '../types';

interface CostumeTypeFormValues {
  name: string;
  description?: string;
}

const CostumeTypesPage = () => {
  const [types, setTypes] = useState<CostumeType[]>([]);
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

  const columns: Column<CostumeType>[] = [
    {
      key: 'name',
      header: 'Tên loại',
      render: (t) => <span className="font-medium">{t.name}</span>,
    },
    {
      key: 'description',
      header: 'Mô tả',
      render: (t) => <span className="text-gray-600">{t.description ?? '—'}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      className: 'whitespace-nowrap',
      render: (t) => (
        <span className="space-x-2">
          <button onClick={() => openEdit(t)} className="text-blue-600 hover:underline text-xs">
            Sửa
          </button>
          <button
            onClick={() => setConfirmId(t._id)}
            className="text-red-600 hover:underline text-xs"
          >
            Xoá
          </button>
        </span>
      ),
    } satisfies Column<CostumeType>,
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Loại trang phục</h2>
        <button onClick={openCreate} className="btn-primary">
          + Thêm loại
        </button>
      </div>

      <DataTable<CostumeType>
        loading={loading}
        data={types}
        keyExtractor={(t) => t._id}
        emptyTitle="Chưa có loại trang phục nào"
        columns={columns}
        onRowClick={openEdit}
      />

      <ConfirmModal
        isOpen={!!confirmId}
        message="Bạn có chắc muốn xoá loại trang phục này?"
        onConfirm={doDelete}
        onCancel={() => setConfirmId(null)}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Sửa loại trang phục' : 'Thêm loại trang phục'}
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="label">Tên loại *</label>
            <input
              {...register('name', { required: true })}
              className="input"
              placeholder="VD: Cử nhân, Trang phục truyền thống..."
            />
          </div>
          <div>
            <label className="label">Mô tả</label>
            <textarea
              {...register('description')}
              className="input"
              rows={2}
              placeholder="Mô tả thêm về loại trang phục..."
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
    </div>
  );
};

export default CostumeTypesPage;
