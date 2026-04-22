import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { customerService } from '../services/customerService';
import { ConfirmModal, DataTable, Modal } from '../components/organisms';
import type { Column } from '../components/organisms';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchCustomers } from '../store/slices/customersSlice';
import { TableSkeleton } from '../components/atoms';
import { toast } from 'react-toastify';
import type { Customer } from '../types';

type FormValues = Omit<Customer, '_id' | 'createdAt'>;

const CustomersPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list: customers, loading } = useAppSelector((s) => s.customers);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>();

  useEffect(() => {
    dispatch(fetchCustomers({}));
  }, [dispatch]);

  const openCreate = () => {
    setEditing(null);
    reset({
      className: '',
      school: '',
      contactName: '',
      contactPhone: '',
      contactAddress: '',
      total: 0,
      totalMale: 0,
      totalFemale: 0,
      notes: '',
    });
    setModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    reset(c);
    setModalOpen(true);
  };

  const onSubmit = async (data: FormValues) => {
    try {
      if (editing) {
        await customerService.update(editing._id, data);
        toast.success('Cập nhật lớp thành công!');
      } else {
        await customerService.create(data);
        toast.success('Thêm lớp thành công!');
      }
      setModalOpen(false);
      dispatch(fetchCustomers({}));
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const handleDelete = (id: string) => setConfirmId(id);

  const doDelete = async () => {
    if (!confirmId) return;
    try {
      await customerService.remove(confirmId);
      toast.success('Đã xoá lớp.');
      dispatch(fetchCustomers({}));
    } catch {
      toast.error('Xoá thất bại, vui lòng thử lại.');
    }
    setConfirmId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Khách hàng (Lớp)</h2>
        <button onClick={openCreate} className="btn-primary">
          + Thêm lớp
        </button>
      </div>

      <div className="mb-4 flex gap-2 flex-wrap">
        <input
          className="input flex-1 min-w-[12rem]"
          placeholder="Tìm kiếm lớp, trường…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && dispatch(fetchCustomers(search ? { search } : {}))}
        />
        <button
          className="btn-secondary"
          onClick={() => dispatch(fetchCustomers(search ? { search } : {}))}
        >
          Tìm
        </button>
        {search && (
          <button
            className="btn-secondary"
            onClick={() => {
              setSearch('');
              dispatch(fetchCustomers({}));
            }}
          >
            Xoá bộ lọc
          </button>
        )}
      </div>

      {loading ? (
        <TableSkeleton cols={6} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <DataTable<Customer>
              data={customers}
              keyExtractor={(c) => c._id}
              emptyTitle="Chưa có dữ liệu"
              onRowClick={(c) => navigate(`/customers/${c._id}`)}
              columns={[
                {
                  key: 'className',
                  header: 'Tên lớp',
                  render: (c) => (
                    <Link
                      to={`/customers/${c._id}`}
                      className="font-medium text-primary-600 hover:underline"
                    >
                      {c.className}
                    </Link>
                  ),
                },
                {
                  key: 'school',
                  header: 'Trường',
                  render: (c) => <span className="text-gray-600">{c.school}</span>,
                },
                {
                  key: 'contactName',
                  header: 'Liên hệ',
                  render: (c) => <span className="text-gray-600">{c.contactName}</span>,
                },
                {
                  key: 'contactPhone',
                  header: 'SĐT',
                  render: (c) => <span className="text-gray-600">{c.contactPhone}</span>,
                },
                {
                  key: 'contactAddress',
                  header: 'Địa chỉ',
                  render: (c) => <span className="text-gray-600">{c.contactAddress}</span>,
                },
                {
                  key: 'total',
                  header: 'Sĩ số',
                  align: 'right',
                  render: (c) => <span className="text-gray-600">{c.total}</span>,
                },
                {
                  key: 'gender',
                  header: 'Nam / Nữ',
                  align: 'right',
                  render: (c) => (
                    <span className="text-gray-600">
                      {c.totalMale ?? 0} / {c.totalFemale ?? 0}
                    </span>
                  ),
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
                        onClick={() => handleDelete(c._id)}
                        className="text-red-600 hover:underline text-xs"
                      >
                        Xoá
                      </button>
                    </span>
                  ),
                } satisfies Column<Customer>,
              ]}
            />
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {customers.map((c) => (
              <div key={c._id} className="card p-4">
                <div className="flex items-start justify-between mb-1">
                  <Link
                    to={`/customers/${c._id}`}
                    className="font-semibold text-primary-600 hover:underline text-base"
                  >
                    {c.className}
                  </Link>
                  {c.total != null && (
                    <span className="text-sm text-gray-500 ml-2">{c.total} hs</span>
                  )}
                </div>
                {c.school && <div className="text-sm text-gray-600">🏫 {c.school}</div>}
                {c.contactName && (
                  <div className="text-sm text-gray-600 mt-0.5">{c.contactName}</div>
                )}
                {c.contactPhone && <div className="text-sm text-gray-600">📞 {c.contactPhone}</div>}
                <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100">
                  <button onClick={() => openEdit(c)} className="text-blue-600 text-xs font-medium">
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(c._id)}
                    className="text-red-600 text-xs font-medium"
                  >
                    Xoá
                  </button>
                </div>
              </div>
            ))}
            {customers.length === 0 && (
              <div className="card py-10 text-center text-gray-400">Chưa có dữ liệu</div>
            )}
          </div>
        </>
      )}

      <ConfirmModal
        isOpen={!!confirmId}
        message="Bạn có chắc muốn xoá lớp này?"
        onConfirm={doDelete}
        onCancel={() => setConfirmId(null)}
      />
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Sửa lớp' : 'Thêm lớp mới'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="label">Tên lớp *</label>
              <input {...register('className', { required: true })} className="input" />
            </div>
            <div>
              <label className="label">Trường</label>
              <input {...register('school')} className="input" />
            </div>
            <div>
              <label className="label">Sĩ số</label>
              <input
                {...register('total', { valueAsNumber: true })}
                type="number"
                className="input"
              />
            </div>
            <div>
              <label className="label">Số nam</label>
              <input
                {...register('totalMale', { valueAsNumber: true })}
                type="number"
                min={0}
                className="input"
              />
            </div>
            <div>
              <label className="label">Số nữ</label>
              <input
                {...register('totalFemale', { valueAsNumber: true })}
                type="number"
                min={0}
                className="input"
              />
            </div>
            <div>
              <label className="label">
                Người liên hệ <span className="text-rose-500">*</span>
              </label>
              <input
                {...register('contactName', { required: 'Vui lòng nhập người liên hệ' })}
                className="input"
              />
              {errors.contactName && (
                <p className="text-xs text-red-500 mt-1">{errors.contactName.message}</p>
              )}
            </div>
            <div>
              <label className="label">
                Số điện thoại <span className="text-rose-500">*</span>
              </label>
              <input
                {...register('contactPhone', {
                  required: 'Vui lòng nhập số điện thoại',
                  pattern: {
                    value: /^[0-9+\-\s()]{8,}$/,
                    message: 'Số điện thoại không hợp lệ',
                  },
                })}
                className="input"
              />
              {errors.contactPhone && (
                <p className="text-xs text-red-500 mt-1">{errors.contactPhone.message}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="label">
                Địa chỉ (người liên hệ) <span className="text-rose-500">*</span>
              </label>
              <input
                {...register('contactAddress', { required: 'Vui lòng nhập địa chỉ' })}
                className="input"
              />
              {errors.contactAddress && (
                <p className="text-xs text-red-500 mt-1">{errors.contactAddress.message}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="label">Ghi chú</label>
              <textarea {...register('notes')} className="input" rows={2} />
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
    </div>
  );
};

export default CustomersPage;
