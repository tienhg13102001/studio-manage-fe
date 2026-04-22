import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { costumeService } from '../services/costumeService';
import { ConfirmModal, DataTable, Modal } from '../components/organisms';
import type { Column } from '../components/organisms';
import { toast } from 'react-toastify';
import type { Costume } from '../types';

interface CostumeFormValues {
  name: string;
  description?: string;
}

const CostumesPage = () => {
  const [costumes, setCostumes] = useState<Costume[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Costume | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
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
  }, []);

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', description: '' });
    setModalOpen(true);
  };

  const openEdit = (costume: Costume) => {
    setEditing(costume);
    reset({ name: costume.name, description: costume.description ?? '' });
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Trang phục</h2>
        <button onClick={openCreate} className="btn-primary">
          + Thêm trang phục
        </button>
      </div>

      <DataTable<Costume>
        loading={loading}
        data={costumes}
        keyExtractor={(c) => c._id}
        emptyTitle="Chưa có trang phục nào"
        columns={[
          {
            key: 'name',
            header: 'Tên trang phục',
            render: (c) => <span className="font-medium">{c.name}</span>,
          },
          {
            key: 'description',
            header: 'Mô tả',
            render: (c) => <span className="text-gray-600">{c.description ?? '—'}</span>,
          },
          {
            key: 'actions',
            header: '',
            align: 'right',
            className: 'whitespace-nowrap',
            render: (c) => (
              <span className="space-x-2">
                <button
                  onClick={() => openEdit(c)}
                  className="text-blue-600 hover:underline text-xs"
                >
                  Sửa
                </button>
                <button
                  onClick={() => setConfirmId(c._id)}
                  className="text-red-600 hover:underline text-xs"
                >
                  Xoá
                </button>
              </span>
            ),
          } satisfies Column<Costume>,
        ]}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Sửa trang phục' : 'Thêm trang phục'}
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="label">Tên trang phục *</label>
            <input
              {...register('name', { required: true })}
              className="input"
              placeholder="VD: Đồng phục trường, Áo dài, Tự do..."
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

      <ConfirmModal
        isOpen={!!confirmId}
        message="Bạn có chắc muốn xoá trang phục này?"
        onConfirm={doDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
};

export default CostumesPage;
