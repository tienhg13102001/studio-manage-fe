import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { costumeService } from '../services/costumeService';
import { ConfirmModal, Modal } from '../components/organisms';
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

      {loading ? (
        <div className="card p-6 text-center text-gray-400">Đang tải...</div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 border-b">
              <tr>
                <th className="text-left px-4 py-3">Tên trang phục</th>
                <th className="text-left px-4 py-3">Mô tả</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {costumes.map((c) => (
                <tr key={c._id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.description ?? '—'}</td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
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
                  </td>
                </tr>
              ))}
              {costumes.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                    Chưa có trang phục nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

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
