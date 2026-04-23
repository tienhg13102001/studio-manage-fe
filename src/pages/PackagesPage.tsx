import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { packageService } from '../services/packageService';
import { costumeTypeService } from '../services/costumeTypeService';
import { ConfirmModal, DataTable, Modal } from '../components/organisms';
import type { Column } from '../components/organisms';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchPackages } from '../store/slices/packagesSlice';
import { TableSkeleton, Select } from '../components/atoms';
import { toast } from 'react-toastify';
import type { CostumeType, Package } from '../types';

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
  costumes?: string[];
  crewRatio?: string;
  editingScope?: 'full' | 'partial';
  deliveryDays?: number;
  studentsPerCrew?: number;
  description?: string;
}

const PackagesPage = () => {
  const dispatch = useAppDispatch();
  const { list: packages, loading } = useAppSelector((s) => s.packages);
  const [allCostumes, setAllCostumes] = useState<CostumeType[]>([]);
  const [selectedCostumes, setSelectedCostumes] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting },
  } = useForm<PackageFormValues>();

  useEffect(() => {
    dispatch(fetchPackages());
    costumeTypeService.getAll().then(setAllCostumes);
  }, [dispatch]);

  const openCreate = () => {
    setEditing(null);
    setSelectedCostumes([]);
    reset({ editingScope: 'full' });
    setModalOpen(true);
  };

  const openEdit = (pkg: Package) => {
    setEditing(pkg);
    const costumeIds = (pkg.costumes ?? []).map((c) => c._id);
    setSelectedCostumes(costumeIds);
    reset({
      name: pkg.name,
      pricePerMember: pkg.pricePerMember,
      duration: pkg.duration,
      costumes: costumeIds,
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
      const payload = { ...data, costumes: selectedCostumes };
      if (editing) {
        await packageService.update(editing._id, payload);
        toast.success('Cập nhật gói chụp thành công!');
      } else {
        await packageService.create(payload);
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
        <TableSkeleton cols={8} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <DataTable<Package>
              data={packages}
              keyExtractor={(pkg) => pkg._id}
              emptyTitle="Chưa có gói chụp nào"
              columns={[
                {
                  key: 'name',
                  header: 'Tên gói',
                  render: (pkg) => <span className="font-medium">{pkg.name}</span>,
                },
                {
                  key: 'price',
                  header: 'Giá/thành viên',
                  render: (pkg) => `${pkg.pricePerMember.toLocaleString('vi-VN')}₫`,
                },
                {
                  key: 'duration',
                  header: 'Thời gian',
                  render: (pkg) => (
                    <span className="text-gray-600">
                      {pkg.duration ? durationLabel[pkg.duration] : '—'}
                    </span>
                  ),
                },
                {
                  key: 'crew',
                  header: 'Ekip (hs/thợ)',
                  render: (pkg) => (
                    <span className="text-gray-600">
                      {pkg.studentsPerCrew != null ? `${pkg.studentsPerCrew} hs/thợ` : '—'}
                    </span>
                  ),
                },
                {
                  key: 'costumes',
                  header: 'Trang phục',
                  render: (pkg) => (
                    <span className="text-gray-600">
                      {pkg.costumes && pkg.costumes.length > 0
                        ? pkg.costumes.map((c) => c.name).join(', ')
                        : '—'}
                    </span>
                  ),
                },
                {
                  key: 'editingScope',
                  header: 'Chỉnh sửa',
                  render: (pkg) => (
                    <span className="text-gray-600">
                      {pkg.editingScope ? editingScopeLabel[pkg.editingScope] : '—'}
                    </span>
                  ),
                },
                {
                  key: 'deliveryDays',
                  header: 'Trả file tối đa (ngày)',
                  render: (pkg) => (
                    <span className="text-gray-600">
                      {pkg.deliveryDays != null ? `tối đa ${pkg.deliveryDays} ngày` : '—'}
                    </span>
                  ),
                },
                {
                  key: 'actions',
                  header: '',
                  align: 'right',
                  className: 'whitespace-nowrap',
                  render: (pkg) => (
                    <span className="space-x-2">
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
                    </span>
                  ),
                } satisfies Column<Package>,
              ]}
            />
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
                  {pkg.costumes && pkg.costumes.length > 0 && (
                    <div>👗 {pkg.costumes.map((c) => c.name).join(', ')}</div>
                  )}
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
              <Controller
                name="duration"
                control={control}
                render={({ field }) => (
                  <Select
                    options={[
                      { value: 'half_day', label: '1/2 ngày' },
                      { value: 'two_thirds_day', label: '2/3 ngày' },
                      { value: 'full_day', label: '1 ngày' },
                    ]}
                    value={field.value ?? ''}
                    onChange={(v) => field.onChange(v || undefined)}
                    placeholder="-- Không xác định --"
                  />
                )}
              />
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
              <Select
                multiple
                options={allCostumes.map((c) => ({
                  value: c._id,
                  label: c.name + (c.description ? ` — ${c.description}` : ''),
                }))}
                value={selectedCostumes}
                onChange={(v) => setSelectedCostumes(v as string[])}
                placeholder={
                  allCostumes.length === 0
                    ? 'Chưa có loại trang phục nào'
                    : 'Chọn loại trang phục...'
                }
                disabled={allCostumes.length === 0}
              />
            </div>
            <div>
              <label className="label">Chỉnh sửa ảnh</label>
              <Controller
                name="editingScope"
                control={control}
                render={({ field }) => (
                  <Select
                    options={[
                      { value: 'full', label: 'Toàn bộ file' },
                      { value: 'partial', label: 'Một phần' },
                    ]}
                    value={field.value ?? ''}
                    onChange={(v) => field.onChange(v)}
                  />
                )}
              />
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
