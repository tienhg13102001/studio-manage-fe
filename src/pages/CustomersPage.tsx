import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { customerService } from '../services/customerService';
import { ConfirmModal, Modal } from '../components/organisms';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchCustomers } from '../store/slices/customersSlice';
import { TableSkeleton } from '../components/atoms';
import { toast } from 'react-toastify';
import type { Customer } from '../types';

type FormValues = Omit<Customer, '_id' | 'createdAt'>;

const CustomersPage = () => {
  const dispatch = useAppDispatch();
  const { list: customers, loading } = useAppSelector((s) => s.customers);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
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
      contactEmail: '',
      studentCount: 0,
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
          <div className="hidden md:block card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 border-b">
                <tr>
                  <th className="text-left px-4 py-3">Tên lớp</th>
                  <th className="text-left px-4 py-3">Trường</th>
                  <th className="text-left px-4 py-3">Liên hệ</th>
                  <th className="text-left px-4 py-3">SĐT</th>
                  <th className="text-right px-4 py-3">Sĩ số</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c._id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/customers/${c._id}`}
                        className="font-medium text-primary-600 hover:underline"
                      >
                        {c.className}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.school}</td>
                    <td className="px-4 py-3 text-gray-600">{c.contactName}</td>
                    <td className="px-4 py-3 text-gray-600">{c.contactPhone}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{c.studentCount}</td>
                    <td className="px-4 py-3 text-right space-x-2">
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
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      Chưa có dữ liệu
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
                  {c.studentCount != null && (
                    <span className="text-sm text-gray-500 ml-2">{c.studentCount} hs</span>
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
                {...register('studentCount', { valueAsNumber: true })}
                type="number"
                className="input"
              />
            </div>
            <div>
              <label className="label">Người liên hệ</label>
              <input {...register('contactName')} className="input" />
            </div>
            <div>
              <label className="label">Số điện thoại</label>
              <input {...register('contactPhone')} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Email</label>
              <input {...register('contactEmail')} type="email" className="input" />
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
