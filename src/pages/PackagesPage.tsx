import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { packageService } from '../services/packageService';
import { ConfirmModal, Modal } from '../components/organisms';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchPackages } from '../store/slices/packagesSlice';
import { toast } from 'react-toastify';
import type { Package } from '../types';

const editingScopeLabel: Record<string, string> = {
  full: 'Toàn bộ',
  partial: 'Một phần',
};

const durationLabel: Record<string, string> = {
  full_day: '1 ngày',
  half_day: '1/2 ngày',
  two_thirds_day: '2/3 ngày',
};

interface PackageFormValues {
  name: string;
  pricePerMember: number;
  duration?: 'full_day' | 'half_day' | 'two_thirds_day';
  costume?: string;
  crewRatio?: string;
  editingScope?: 'full' | 'partial';
  deliveryDays?: number;
  studentsPerCrew?: number;
  description?: string;
}

const PackagesPage = () => {
  const dispatch = useAppDispatch();
  const { list: packages, loading } = useAppSelector((s) => s.packages);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<PackageFormValues>();

  useEffect(() => {
    dispatch(fetchPackages());
  }, [dispatch]);

  const openCreate = () => {
    setEditing(null);
    reset({ editingScope: 'full' });
    setModalOpen(true);
  };

  const openEdit = (pkg: Package) => {
    setEditing(pkg);
    reset({
      name: pkg.name,
      pricePerMember: pkg.pricePerMember,
      duration: pkg.duration,
      costume: pkg.costume,
      crewRatio: pkg.crewRatio,
      editingScope: pkg.editingScope ?? 'full',
      deliveryDays: pkg.deliveryDays,
      studentsPerCrew: pkg.studentsPerCrew,
      description: pkg.description,
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: PackageFormValues) => {
    try {
      if (editing) {
        await packageService.update(editing._id, data);
        toast.success('Cập nhật gói chụp thành công!');
      } else {
        await packageService.create(data);
        toast.success('Thêm gói chụp thành công!');
      }
      setModalOpen(false);
      dispatch(fetchPackages());
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const handleDelete = (id: string) => setConfirmId(id);

  const doDelete = async () => {
    if (!confirmId) return;
    try {
      await packageService.remove(confirmId);
      toast.success('Đã xoá gói chụp.');
      dispatch(fetchPackages());
    } catch {
      toast.error('Xoá thất bại, vui lòng thử lại.');
    }
    setConfirmId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Gói chụp</h2>
        <button onClick={openCreate} className="btn-primary">
          + Thêm gói
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Đang tải…</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 border-b">
                <tr>
                  <th className="text-left px-4 py-3">Tên gói</th>
                  <th className="text-left px-4 py-3">Giá/thành viên</th>
                  <th className="text-left px-4 py-3">Thời gian</th>
                  <th className="text-left px-4 py-3">Ekip (hs/thợ)</th>
                  <th className="text-left px-4 py-3">Trang phục</th>
                  <th className="text-left px-4 py-3">Chỉnh sửa</th>
                  <th className="text-left px-4 py-3">Trả file tối đa (ngày)</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg) => (
                  <tr key={pkg._id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{pkg.name}</td>
                    <td className="px-4 py-3">{pkg.pricePerMember.toLocaleString('vi-VN')}₫</td>
                    <td className="px-4 py-3 text-gray-600">
                      {pkg.duration ? durationLabel[pkg.duration] : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {pkg.studentsPerCrew != null ? `${pkg.studentsPerCrew} hs/thợ` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-pre-line">
                      {pkg.costume ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {pkg.editingScope ? editingScopeLabel[pkg.editingScope] : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {pkg.deliveryDays != null ? `tối đa ${pkg.deliveryDays} ngày` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => openEdit(pkg)}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(pkg._id)}
                        className="text-red-600 hover:underline text-xs"
                      >
                        Xoá
                      </button>
                    </td>
                  </tr>
                ))}
                {packages.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      Chưa có gói chụp nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {packages.map((pkg) => (
              <div key={pkg._id} className="card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold text-gray-900">{pkg.name}</div>
                    <div className="text-primary-600 text-sm mt-0.5">
                      {pkg.pricePerMember.toLocaleString('vi-VN')}₫/thành viên
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => openEdit(pkg)}
                      className="text-blue-600 text-xs font-medium"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(pkg._id)}
                      className="text-red-600 text-xs font-medium"
                    >
                      Xoá
                    </button>
                  </div>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  {pkg.duration && <div>⏱ {durationLabel[pkg.duration]}</div>}
                  {pkg.studentsPerCrew != null && (
                    <div>👥 {pkg.studentsPerCrew} học sinh / thợ</div>
                  )}
                  {pkg.costume && <div className="whitespace-pre-line">👗 {pkg.costume}</div>}
                  {pkg.editingScope && <div>✂️ {editingScopeLabel[pkg.editingScope]}</div>}
                  {pkg.deliveryDays != null && (
                    <div>📦 Trả file tối đa: {pkg.deliveryDays} ngày</div>
                  )}
                  {pkg.description && <div className="text-gray-500 italic">{pkg.description}</div>}
                </div>
              </div>
            ))}
            {packages.length === 0 && (
              <div className="card py-10 text-center text-gray-400">Chưa có gói chụp nào</div>
            )}
          </div>
        </>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Sửa gói chụp' : 'Thêm gói chụp'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="label">Tên gói *</label>
              <input
                {...register('name', { required: true })}
                className="input"
                placeholder="VD: Gói cơ bản, Gói nâng cao..."
              />
            </div>
            <div>
              <label className="label">Giá/thành viên (₫) *</label>
              <input
                {...register('pricePerMember', { required: true, valueAsNumber: true })}
                type="number"
                min={0}
                className="input"
                placeholder="VD: 150000"
              />
            </div>
            <div>
              <label className="label">Thời gian</label>
              <select {...register('duration')} className="input">
                <option value="">-- Không xác định --</option>
                <option value="half_day">1/2 ngày</option>
                <option value="two_thirds_day">2/3 ngày</option>
                <option value="full_day">1 ngày</option>
              </select>
            </div>
            <div>
              <label className="label">Ekip (số học sinh / 1 thợ)</label>
              <input
                {...register('studentsPerCrew', { valueAsNumber: true })}
                type="number"
                min={1}
                className="input"
                placeholder="Ví dụ: 20"
              />
            </div>
            <div>
              <label className="label">Trang phục</label>
              <textarea
                {...register('costume')}
                className="input"
                rows={3}
                placeholder="VD: Đồng phục trường, tự do..."
              />
            </div>
            <div>
              <label className="label">Chỉnh sửa ảnh</label>
              <select {...register('editingScope')} className="input">
                <option value="full">Toàn bộ file</option>
                <option value="partial">Một phần</option>
              </select>
            </div>
            <div>
              <label className="label">Trả file sau tối đa (ngày)</label>
              <input
                {...register('deliveryDays', { valueAsNumber: true })}
                type="number"
                min={1}
                className="input"
                placeholder="VD: 7"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Mô tả thêm</label>
              <textarea
                {...register('description')}
                className="input"
                rows={2}
                placeholder="Thông tin bổ sung..."
              />
            </div>
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
        message="Bạn có chắc muốn xoá gói chụp này?"
        onConfirm={doDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
};

export default PackagesPage;
