import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { costumeService } from '../services/costumeService';
import { costumeTypeService } from '../services/costumeTypeService';
import { ConfirmModal, DataTable, Modal } from '../components/organisms';
import type { Column } from '../components/organisms';
import { toast } from 'react-toastify';
import type { Costume, CostumeResponse, CostumeType } from '../types';

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

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-kicker">Settings</span>
          <h2 className="page-title">Trang phục</h2>
          <p className="page-subtitle">Quản lý danh mục trang phục dùng trong các buổi chụp.</p>
        </div>
        <button onClick={openCreate} className="btn-primary self-start md:self-auto">
          + Thêm trang phục
        </button>
      </div>

      <div className="hidden md:block">
        <DataTable<CostumeResponse>
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
              key: 'gender',
              header: 'Giới tính',
              render: (c) => (
                <span className="theme-text-muted">{GENDER_LABEL[c.gender] ?? '—'}</span>
              ),
            },
            {
              key: 'type',
              header: 'Loại',
              render: (c) => <span className="theme-text-muted">{getTypeName(c.type)}</span>,
            },
            {
              key: 'description',
              header: 'Mô tả',
              render: (c) => <span className="theme-text-muted">{c.description ?? '—'}</span>,
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
                    className="text-blue-500 hover:underline text-xs"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => setConfirmId(c._id)}
                    className="text-red-500 hover:underline text-xs"
                  >
                    Xoá
                  </button>
                </span>
              ),
            } satisfies Column<CostumeResponse>,
          ]}
        />
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="card py-10 text-center theme-text-muted">Đang tải…</div>
        ) : costumes.length === 0 ? (
          <div className="card py-10 text-center theme-text-muted">Chưa có trang phục nào</div>
        ) : (
          costumes.map((c) => {
            const genderStyle =
              c.gender === 'male'
                ? 'bg-blue-500/15 text-blue-500'
                : c.gender === 'female'
                  ? 'bg-pink-500/15 text-pink-500'
                  : 'bg-purple-500/15 text-purple-500';
            return (
              <div key={c._id} className="card p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold theme-text-primary truncate">{c.name}</div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className={`badge text-xs ${genderStyle}`}>
                        {GENDER_LABEL[c.gender] ?? '—'}
                      </span>
                      {c.type && (
                        <span className="badge text-xs bg-[var(--input-bg)] theme-text-muted border border-[color:var(--input-border)]">
                          {getTypeName(c.type)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {c.description && (
                  <p className="text-sm theme-text-muted italic">{c.description}</p>
                )}
                <div className="flex justify-end gap-3 mt-3 pt-3 theme-divider-top">
                  <button
                    onClick={() => openEdit(c)}
                    className="text-blue-500 text-xs font-medium hover:underline"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => setConfirmId(c._id)}
                    className="text-red-500 text-xs font-medium hover:underline"
                  >
                    Xoá
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

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
            <label className="label">Giới tính *</label>
            <select
              {...register('gender', { required: true })}
              className="input"
              defaultValue="unisex"
            >
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="unisex">Nam / Nữ</option>
            </select>
          </div>
          <div>
            <label className="label">Loại trang phục</label>
            <select {...register('type')} className="input">
              <option value="">-- Không phân loại --</option>
              {costumeTypes.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
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
