import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { transactionService } from '../services/transactionService';
import { ConfirmModal, Modal } from '../components/organisms';
import { toast } from 'react-toastify';
import { formatDate, formatCurrency } from '../utils/format';
import type { Transaction, Customer, Category, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchTransactions, fetchTransactionSummary } from '../store/slices/transactionsSlice';
import { fetchCustomers } from '../store/slices/customersSlice';
import { fetchCategories } from '../store/slices/categoriesSlice';
import { TableSkeleton } from '../components/atoms';
import { fetchUsers } from '../store/slices/usersSlice';

interface FilterState {
  type: string;
  customerId: string;
  categoryId: string;
  dateFrom: string;
  dateTo: string;
}

const defaultFilter: FilterState = {
  type: '',
  customerId: '',
  categoryId: '',
  dateFrom: '',
  dateTo: '',
};

const FinancePage = () => {
  const { user } = useAuth();
  const isAdmin = user?.roles.some((r) => r === 0 || r === 1) ?? false;

  const dispatch = useAppDispatch();
  const { list: transactions, summary, loading } = useAppSelector((s) => s.transactions);
  const { list: customers } = useAppSelector((s) => s.customers);
  const { list: categories } = useAppSelector((s) => s.categories);
  const { list: users } = useAppSelector((s) => s.users);
  const [filter, setFilter] = useState<FilterState>(defaultFilter);
  const [tab, setTab] = useState<'list' | 'summary'>('list');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting },
  } = useForm<Partial<Transaction>>();

  const selectedType = watch('type');

  const buildListParams = (f: FilterState): Record<string, string> => {
    const params: Record<string, string> = {};
    if (f.type) params.type = f.type;
    if (f.customerId) params.customerId = f.customerId;
    if (f.categoryId) params.categoryId = f.categoryId;
    if (f.dateFrom) params.dateFrom = f.dateFrom;
    if (f.dateTo) params.dateTo = f.dateTo;
    return params;
  };

  useEffect(() => {
    dispatch(fetchTransactions({}));
    dispatch(fetchTransactionSummary());
    dispatch(fetchCustomers({ limit: 200 }));
    dispatch(fetchCategories());
    if (isAdmin) dispatch(fetchUsers());
  }, [dispatch, isAdmin]);

  const openCreate = () => {
    setEditing(null);
    reset({ type: 'income', date: new Date().toISOString().slice(0, 10) });
    setModalOpen(true);
  };

  const openEdit = (t: Transaction) => {
    setEditing(t);
    reset({
      ...t,
      customerId:
        typeof t.customerId === 'object' && t.customerId
          ? (t.customerId as Customer)._id
          : (t.customerId ?? ''),
      categoryId: typeof t.categoryId === 'object' ? (t.categoryId as Category)._id : t.categoryId,
      date: t.date.slice(0, 10),
      createdBy:
        typeof t.createdBy === 'object' && t.createdBy
          ? (t.createdBy as User)._id
          : (t.createdBy ?? ''),
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: Partial<Transaction>) => {
    const payload = { ...data, customerId: data.customerId || null };
    try {
      if (editing) {
        await transactionService.update(editing._id, payload);
        toast.success('Cập nhật giao dịch thành công!');
      } else {
        await transactionService.create(payload);
        toast.success('Thêm giao dịch thành công!');
      }
      setModalOpen(false);
      dispatch(fetchTransactions(buildListParams(filter)));
      dispatch(fetchTransactionSummary({ dateFrom: filter.dateFrom, dateTo: filter.dateTo }));
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleDelete = (id: string) => setConfirmId(id);

  const doDelete = async () => {
    if (!confirmId) return;
    try {
      await transactionService.remove(confirmId);
      toast.success('Đã xoá giao dịch.');
      dispatch(fetchTransactions(buildListParams(filter)));
      dispatch(fetchTransactionSummary({ dateFrom: filter.dateFrom, dateTo: filter.dateTo }));
    } catch {
      toast.error('Xoá thất bại, vui lòng thử lại.');
    }
    setConfirmId(null);
  };

  const applyFilter = () => {
    dispatch(fetchTransactions(buildListParams(filter)));
    dispatch(fetchTransactionSummary({ dateFrom: filter.dateFrom, dateTo: filter.dateTo }));
  };
  const resetFilter = () => {
    setFilter(defaultFilter);
    dispatch(fetchTransactions({}));
    dispatch(fetchTransactionSummary());
  };

  const filteredCategories = categories.filter((c) => !selectedType || c.type === selectedType);

  const grandTotal = summary.reduce(
    (acc, r) => ({
      income: acc.income + r.income,
      expense: acc.expense + r.expense,
      profit: acc.profit + r.profit,
    }),
    { income: 0, expense: 0, profit: 0 },
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Quản lý Thu Chi</h2>
        <button onClick={openCreate} className="btn-primary">
          + Thêm giao dịch
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="flex flex-wrap gap-2">
          <select
            className="input flex-1 min-w-[7rem]"
            value={filter.type}
            onChange={(e) => setFilter((f) => ({ ...f, type: e.target.value }))}
          >
            <option value="">Tất cả</option>
            <option value="income">Thu</option>
            <option value="expense">Chi</option>
          </select>
          <select
            className="input flex-1 min-w-[8rem]"
            value={filter.customerId}
            onChange={(e) => setFilter((f) => ({ ...f, customerId: e.target.value }))}
          >
            <option value="">Tất cả lớp</option>
            {customers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.className}
              </option>
            ))}
          </select>
          <select
            className="input flex-1 min-w-[8rem]"
            value={filter.categoryId}
            onChange={(e) => setFilter((f) => ({ ...f, categoryId: e.target.value }))}
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="input flex-1 min-w-[8rem]"
            value={filter.dateFrom}
            onChange={(e) => setFilter((f) => ({ ...f, dateFrom: e.target.value }))}
          />
          <input
            type="date"
            className="input flex-1 min-w-[8rem]"
            value={filter.dateTo}
            onChange={(e) => setFilter((f) => ({ ...f, dateTo: e.target.value }))}
          />
          <button onClick={applyFilter} className="btn-primary">
            Lọc
          </button>
          <button onClick={resetFilter} className="btn-secondary">
            Xoá
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('list')}
          className={tab === 'list' ? 'btn-primary' : 'btn-secondary'}
        >
          Danh sách
        </button>
        <button
          onClick={() => setTab('summary')}
          className={tab === 'summary' ? 'btn-primary' : 'btn-secondary'}
        >
          Tổng hợp theo lớp
        </button>
      </div>

      {tab === 'list' &&
        (loading ? (
          <TableSkeleton cols={8} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 border-b">
                  <tr>
                    <th className="text-left px-4 py-3">Ngày</th>
                    <th className="text-left px-4 py-3">Loại</th>
                    <th className="text-left px-4 py-3">Danh mục</th>
                    <th className="text-left px-4 py-3">Lớp</th>
                    <th className="text-left px-4 py-3">Mô tả</th>
                    <th className="text-left px-4 py-3">Người thực hiện</th>
                    <th className="text-right px-4 py-3">Số tiền</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t._id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3">{formatDate(t.date)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`badge ${t.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                        >
                          {t.type === 'income' ? 'Thu' : 'Chi'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {typeof t.categoryId === 'object' ? (t.categoryId as Category).name : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {t.customerId && typeof t.customerId === 'object'
                          ? (t.customerId as Customer).className
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{t.description}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {t.createdBy && typeof t.createdBy === 'object'
                          ? ((t.createdBy as User).name ?? (t.createdBy as User).username)
                          : '—'}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {t.type === 'expense' ? '-' : '+'}
                        {formatCurrency(t.amount)}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => openEdit(t)}
                          className="text-blue-600 hover:underline text-xs"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDelete(t._id)}
                          className="text-red-600 hover:underline text-xs"
                        >
                          Xoá
                        </button>
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                        Chưa có dữ liệu
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {transactions.map((t) => (
                <div key={t._id} className="card p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-sm text-gray-500">{formatDate(t.date)}</div>
                      <div className="text-sm text-gray-600 mt-0.5">
                        {typeof t.categoryId === 'object' ? (t.categoryId as Category).name : '—'}
                      </div>
                      {t.customerId && typeof t.customerId === 'object' && (
                        <div className="text-xs text-gray-400">
                          {(t.customerId as Customer).className}
                        </div>
                      )}
                      {t.description && (
                        <div className="text-xs text-gray-400 mt-0.5">{t.description}</div>
                      )}
                      {t.createdBy && typeof t.createdBy === 'object' && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          👤 {(t.createdBy as User).name ?? (t.createdBy as User).username}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <span
                        className={`badge ${t.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {t.type === 'income' ? 'Thu' : 'Chi'}
                      </span>
                      <div
                        className={`font-semibold text-sm mt-1 ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {t.type === 'expense' ? '-' : '+'}
                        {formatCurrency(t.amount)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => openEdit(t)}
                      className="text-blue-600 text-xs font-medium"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(t._id)}
                      className="text-red-600 text-xs font-medium"
                    >
                      Xoá
                    </button>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="card py-10 text-center text-gray-400">Chưa có dữ liệu</div>
              )}
            </div>
          </>
        ))}

      {tab === 'summary' && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 border-b">
                <tr>
                  <th className="text-left px-4 py-3">Lớp</th>
                  <th className="text-left px-4 py-3">Trường</th>
                  <th className="text-right px-4 py-3 text-green-600">Tổng thu</th>
                  <th className="text-right px-4 py-3 text-red-600">Tổng chi</th>
                  <th className="text-right px-4 py-3">Lợi nhuận</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row) => (
                  <tr key={row._id ?? 'unknown'} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      {row.customer?.className ?? '(Không có lớp)'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.customer?.school}</td>
                    <td className="px-4 py-3 text-right text-green-600">
                      {formatCurrency(row.income)}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600">
                      {formatCurrency(row.expense)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${row.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {formatCurrency(row.profit)}
                    </td>
                  </tr>
                ))}
                {summary.length > 0 && (
                  <tr className="border-t bg-gray-50 font-semibold">
                    <td className="px-4 py-3" colSpan={2}>
                      Tổng cộng
                    </td>
                    <td className="px-4 py-3 text-right text-green-600">
                      {formatCurrency(grandTotal.income)}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600">
                      {formatCurrency(grandTotal.expense)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right ${grandTotal.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {formatCurrency(grandTotal.profit)}
                    </td>
                  </tr>
                )}
                {summary.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      Chưa có dữ liệu
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {summary.map((row) => (
              <div key={row._id ?? 'unknown'} className="card p-4">
                <div className="font-semibold text-gray-900 mb-0.5">
                  {row.customer?.className ?? '(Không có lớp)'}
                </div>
                {row.customer?.school && (
                  <div className="text-sm text-gray-500 mb-2">🏫 {row.customer.school}</div>
                )}
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <div className="text-xs text-gray-400">Thu</div>
                    <div className="text-green-600 font-medium">{formatCurrency(row.income)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Chi</div>
                    <div className="text-red-600 font-medium">{formatCurrency(row.expense)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Lợi nhuận</div>
                    <div
                      className={`font-semibold ${row.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {formatCurrency(row.profit)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {summary.length > 0 && (
              <div className="card p-4 bg-gray-50">
                <div className="font-semibold text-gray-900 mb-2">Tổng cộng</div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <div className="text-xs text-gray-400">Thu</div>
                    <div className="text-green-600 font-semibold">
                      {formatCurrency(grandTotal.income)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Chi</div>
                    <div className="text-red-600 font-semibold">
                      {formatCurrency(grandTotal.expense)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Lợi nhuận</div>
                    <div
                      className={`font-semibold ${grandTotal.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {formatCurrency(grandTotal.profit)}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {summary.length === 0 && (
              <div className="card py-10 text-center text-gray-400">Chưa có dữ liệu</div>
            )}
          </div>
        </>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Sửa giao dịch' : 'Thêm giao dịch'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Loại *</label>
              <select {...register('type', { required: true })} className="input">
                <option value="income">Thu</option>
                <option value="expense">Chi</option>
              </select>
            </div>
            <div>
              <label className="label">Danh mục *</label>
              <select {...register('categoryId', { required: true })} className="input">
                <option value="">-- Chọn danh mục --</option>
                {filteredCategories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Số tiền *</label>
              <input
                {...register('amount', { required: true, valueAsNumber: true, min: 0 })}
                type="number"
                className="input"
              />
            </div>
            <div>
              <label className="label">Ngày *</label>
              <input {...register('date', { required: true })} type="date" className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Lớp (tuỳ chọn)</label>
              <select {...register('customerId')} className="input">
                <option value="">-- Không có lớp --</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.className} – {c.school}
                  </option>
                ))}
              </select>
            </div>
            {isAdmin && (
              <div className="sm:col-span-2">
                <label className="label">Người thực hiện</label>
                <select {...register('createdBy')} className="input">
                  <option value="">-- Mặc định (tôi) --</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name ?? u.username}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="label">Mô tả</label>
              <textarea {...register('description')} className="input" rows={2} />
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
        message="Bạn có chắc muốn xoá giao dịch này?"
        onConfirm={doDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
};

export default FinancePage;
