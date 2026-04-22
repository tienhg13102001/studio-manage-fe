import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-toastify';
import { ConfirmModal, Modal, ScheduleCalendar } from '../components/organisms';
import { scheduleService } from '../services/scheduleService';
import type { Customer, Package, Schedule, User } from '../types';
import { ROLE_LABELS } from '../types';
import { formatDate } from '../utils/format';
import { TableSkeleton, Select } from '../components/atoms';
import {
  SCHEDULE_STATUS_COLOR as statusColor,
  SCHEDULE_STATUS_LABEL as statusLabel,
} from '../utils/scheduleConstants';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchSchedules } from '../store/slices/schedulesSlice';
import { fetchCustomers } from '../store/slices/customersSlice';
import { fetchPackages } from '../store/slices/packagesSlice';
import { fetchPhotographers, fetchSales } from '../store/slices/usersSlice';

interface FilterState {
  status: string;
  dateFrom: string;
  dateTo: string;
  customerId: string;
}

const defaultFilter: FilterState = { status: '', dateFrom: '', dateTo: '', customerId: '' };

interface ScheduleFormValues {
  customerId: string;
  packageId?: string;
  shootDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  leadPhotographer?: string;
  bookedBy?: string;
  notes?: string;
}

const SchedulesPage = () => {
  const dispatch = useAppDispatch();
  const { list: schedules, loading } = useAppSelector((s) => s.schedules);
  const { list: customers } = useAppSelector((s) => s.customers);
  const { list: packages } = useAppSelector((s) => s.packages);
  const { photographers, sales: salesUsers } = useAppSelector((s) => s.users);
  const [filter, setFilter] = useState<FilterState>(defaultFilter);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [supportIds, setSupportIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting },
    watch,
  } = useForm<ScheduleFormValues>();

  const buildFilterParams = (f: FilterState): Record<string, string> => {
    const params: Record<string, string> = {};
    if (f.status) params.status = f.status;
    if (f.dateFrom) params.dateFrom = f.dateFrom;
    if (f.dateTo) params.dateTo = f.dateTo;
    if (f.customerId) params.customerId = f.customerId;
    return params;
  };

  useEffect(() => {
    dispatch(fetchSchedules({}));
    dispatch(fetchCustomers({ limit: 200 }));
    dispatch(fetchPackages());
    dispatch(fetchPhotographers());
    dispatch(fetchSales());
  }, [dispatch]);

  const openCreate = () => {
    setEditing(null);
    setSupportIds([]);
    reset({ status: 'pending' });
    setModalOpen(true);
  };

  const openEdit = (s: Schedule) => {
    setEditing(s);
    const leadId =
      typeof s.leadPhotographer === 'object'
        ? (s.leadPhotographer as User)._id
        : (s.leadPhotographer ?? '');
    const supIds = (s.supportPhotographers ?? []).map((u) =>
      typeof u === 'object' ? (u as User)._id : u,
    );
    setSupportIds(supIds);
    reset({
      customerId: typeof s.customerId === 'object' ? (s.customerId as Customer)._id : s.customerId,
      packageId:
        typeof s.packageId === 'object' ? (s.packageId as Package)._id : (s.packageId ?? ''),
      shootDate: s.shootDate.slice(0, 10),
      startTime: s.startTime,
      endTime: s.endTime,
      location: s.location,
      status: s.status,
      notes: s.notes,
      leadPhotographer: leadId,
      bookedBy: typeof s.bookedBy === 'object' ? (s.bookedBy as User)._id : (s.bookedBy ?? ''),
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: ScheduleFormValues) => {
    const payload = {
      ...data,
      leadPhotographer: data.leadPhotographer || undefined,
      bookedBy: data.bookedBy || undefined,
      supportPhotographers: supportIds,
    };
    try {
      if (editing) {
        await scheduleService.update(editing._id, payload);
        toast.success('Cập nhật lịch chụp thành công!');
      } else {
        await scheduleService.create(payload);
        toast.success('Thêm lịch chụp thành công!');
      }
      setModalOpen(false);
      dispatch(fetchSchedules(buildFilterParams(filter)));
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleDelete = (id: string) => setConfirmId(id);

  const doDelete = async () => {
    if (!confirmId) return;
    try {
      await scheduleService.remove(confirmId);
      toast.success('Đã xoá lịch chụp.');
      dispatch(fetchSchedules(buildFilterParams(filter)));
    } catch {
      toast.error('Xoá thất bại, vui lòng thử lại.');
    }
    setConfirmId(null);
  };

  const handleDownloadContract = async (s: Schedule) => {
    const customer = typeof s.customerId === 'object' ? (s.customerId as Customer) : null;
    const filename = `${customer?.className?.replace(/\s+/g, '-') ?? s._id}-${customer?.school?.replace(/\s+/g, '-') ?? ''}`;
    await scheduleService.downloadContract(s._id, filename);
  };

  const applyFilter = () => dispatch(fetchSchedules(buildFilterParams(filter)));
  const resetFilter = () => {
    setFilter(defaultFilter);
    dispatch(fetchSchedules({}));
  };

  const calendarItems = useMemo(
    () =>
      schedules.map((s) => ({
        _id: s._id,
        shootDate: s.shootDate,
        startTime: s.startTime,
        endTime: s.endTime,
        location: s.location,
        status: s.status,
        notes: s.notes,
        className: typeof s.customerId === 'object' ? (s.customerId as Customer).className : '—',
        leadName:
          typeof s.leadPhotographer === 'object'
            ? ((s.leadPhotographer as User).name ?? (s.leadPhotographer as User).username)
            : (s.leadPhotographer ?? undefined),
      })),
    [schedules],
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Lịch chụp</h2>
        <div className="flex items-center gap-2 justify-between w-full md:w-auto">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'table' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              ☰ Bảng
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-gray-200 ${viewMode === 'calendar' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              ◫ Lịch
            </button>
          </div>
          <button onClick={openCreate} className="btn-primary">
            + Thêm lịch
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="flex flex-wrap gap-2">
          <div className="flex-1 min-w-[8rem]">
            <Select
              options={[
                { value: '', label: 'Tất cả trạng thái' },
                ...Object.entries(statusLabel).map(([v, l]) => ({ value: v, label: l })),
              ]}
              value={filter.status}
              onChange={(v) => setFilter((f) => ({ ...f, status: v as string }))}
            />
          </div>
          <div className="flex-1 min-w-[8rem]">
            <Select
              options={[
                { value: '', label: 'Tất cả lớp' },
                ...customers.map((c) => ({ value: c._id, label: c.className })),
              ]}
              value={filter.customerId}
              onChange={(v) => setFilter((f) => ({ ...f, customerId: v as string }))}
            />
          </div>
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
            Xoá lọc
          </button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton cols={11} />
      ) : viewMode === 'calendar' ? (
        <div className="card p-4">
          <ScheduleCalendar
            items={calendarItems}
            onEdit={(id) => {
              const s = schedules.find((x) => x._id === id);
              if (s) openEdit(s);
            }}
            onDelete={handleDelete}
          />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 border-b">
                <tr>
                  <th className="text-left px-4 py-3">Ngày chụp</th>
                  <th className="text-left px-4 py-3">Lớp</th>
                  <th className="text-left px-4 py-3">Gói chụp</th>
                  <th className="text-left px-4 py-3">Ghi chú</th>
                  <th className="text-left px-4 py-3">Giờ</th>
                  <th className="text-left px-4 py-3">Địa điểm</th>
                  <th className="text-left px-4 py-3">Sale</th>
                  <th className="text-left px-4 py-3">Leader</th>
                  <th className="text-left px-4 py-3">Support</th>
                  <th className="text-left px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => {
                  const customer =
                    typeof s.customerId === 'object' ? (s.customerId as Customer) : null;
                  return (
                    <tr key={s._id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{formatDate(s.shootDate)}</td>
                      <td className="px-4 py-3 text-primary-600">{customer?.className ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {typeof s.packageId === 'object'
                          ? (s.packageId as Package)?.name
                          : (s.packageId ?? '—')}
                      </td>
                      <td className="px-4 py-3 max-w-[14rem]">
                        <span
                          className="inline-block bg-yellow-50 text-yellow-800 text-xs font-medium px-2 py-1 rounded-md border border-yellow-200 max-w-full whitespace-pre-line"
                          title={s.notes}
                        >
                          {s.notes || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {s.startTime}
                        {s.endTime ? ` – ${s.endTime}` : ''}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{s.location}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {typeof s.bookedBy === 'object'
                          ? ((s.bookedBy as User)?.name ?? (s.bookedBy as User)?.username)
                          : (s.bookedBy ?? '—')}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {typeof s.leadPhotographer === 'object'
                          ? (s.leadPhotographer as User)?.name
                          : (s.leadPhotographer ?? '—')}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {(s.supportPhotographers ?? [])
                          .map((u) => (typeof u === 'object' ? (u as User)?.name : u))
                          .join(', ') || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${statusColor[s.status]}`}>
                          {statusLabel[s.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => handleDownloadContract(s)}
                          className="text-green-600 hover:underline text-xs"
                        >
                          Hợp đồng
                        </button>
                        <button
                          onClick={() => openEdit(s)}
                          className="text-blue-600 hover:underline text-xs"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDelete(s._id)}
                          className="text-red-600 hover:underline text-xs"
                        >
                          Xoá
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {schedules.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                      Chưa có dữ liệu
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {schedules.map((s) => {
              const customer = typeof s.customerId === 'object' ? (s.customerId as Customer) : null;
              const leadName =
                typeof s.leadPhotographer === 'object'
                  ? ((s.leadPhotographer as User)?.name ?? (s.leadPhotographer as User)?.username)
                  : (s.leadPhotographer ?? null);
              const bookedByName =
                typeof s.bookedBy === 'object'
                  ? ((s.bookedBy as User)?.name ?? (s.bookedBy as User)?.username)
                  : (s.bookedBy ?? null);
              const supports = (s.supportPhotographers ?? [])
                .map((u) =>
                  typeof u === 'object' ? ((u as User)?.name ?? (u as User)?.username) : u,
                )
                .join(', ');
              return (
                <div key={s._id} className="card p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-semibold text-gray-900">{formatDate(s.shootDate)}</div>
                      <div className="text-primary-600 text-sm mt-0.5">
                        {customer?.className ?? '—'}
                      </div>
                    </div>
                    <span className={`badge ${statusColor[s.status]}`}>
                      {statusLabel[s.status]}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    {(s.startTime || s.endTime) && (
                      <div>
                        ⏰ {s.startTime}
                        {s.endTime ? ` – ${s.endTime}` : ''}
                      </div>
                    )}
                    {s.location && <div>📍 {s.location}</div>}
                    {leadName && <div>Leader: {leadName}</div>}
                    {supports && <div>Support: {supports}</div>}
                    {s.notes && (
                      <div className="bg-yellow-50 text-yellow-800 text-xs font-medium px-2 py-1 rounded-md border border-yellow-200 mt-1 whitespace-pre-line">
                        📝 <br />
                        {s.notes}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleDownloadContract(s)}
                      className="text-green-600 text-xs font-medium"
                    >
                      Hợp đồng
                    </button>
                    <button
                      onClick={() => openEdit(s)}
                      className="text-blue-600 text-xs font-medium"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(s._id)}
                      className="text-red-600 text-xs font-medium"
                    >
                      Xoá
                    </button>
                    {bookedByName && (
                      <span className="ml-auto bg-primary-50 text-primary-700 text-xs font-medium px-2 py-0.5 rounded-full border border-primary-200">
                        {bookedByName}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {schedules.length === 0 && (
              <div className="card py-10 text-center text-gray-400">Chưa có dữ liệu</div>
            )}
          </div>
        </>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Sửa lịch chụp' : 'Thêm lịch chụp'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="label">Lớp *</label>
              <Controller
                name="customerId"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select
                    options={customers.map((c) => ({
                      value: c._id,
                      label: `${c.className} – ${c.school}`,
                    }))}
                    value={field.value ?? ''}
                    onChange={(v) => field.onChange(v)}
                    placeholder="-- Chọn lớp --"
                  />
                )}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Gói chụp</label>
              <Controller
                name="packageId"
                control={control}
                render={({ field }) => (
                  <Select
                    options={packages.map((p) => ({
                      value: p._id,
                      label: `${p.name} – ${p.pricePerMember.toLocaleString('vi-VN')}₫/thành viên`,
                    }))}
                    value={field.value ?? ''}
                    onChange={(v) => field.onChange(v || undefined)}
                    placeholder="-- Không chọn gói --"
                  />
                )}
              />
            </div>
            <div>
              <label className="label">Ngày chụp *</label>
              <input {...register('shootDate', { required: true })} type="date" className="input" />
            </div>
            <div>
              <label className="label">Trạng thái</label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select
                    options={Object.entries(statusLabel).map(([v, l]) => ({ value: v, label: l }))}
                    value={field.value ?? ''}
                    onChange={(v) => field.onChange(v)}
                  />
                )}
              />
            </div>
            <div>
              <label className="label">Giờ bắt đầu</label>
              <input {...register('startTime')} type="time" className="input" />
            </div>
            <div>
              <label className="label">Giờ kết thúc</label>
              <input {...register('endTime')} type="time" className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Địa điểm</label>
              <input {...register('location')} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Người chốt lớp (Sale)</label>
              <Controller
                name="bookedBy"
                control={control}
                render={({ field }) => (
                  <Select
                    options={salesUsers.map((u) => ({
                      value: u._id,
                      label: u.username + (u.name ? ` (${u.name})` : ''),
                    }))}
                    value={field.value ?? ''}
                    onChange={(v) => field.onChange(v || undefined)}
                    placeholder="-- Không chỉ định --"
                  />
                )}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Thợ leader</label>
              <Controller
                name="leadPhotographer"
                control={control}
                render={({ field }) => (
                  <Select
                    options={photographers.map((u) => ({
                      value: u._id,
                      label: `${u.username}${u.name ? ` (${u.name})` : ''} – ${ROLE_LABELS[3]}`,
                    }))}
                    value={field.value ?? ''}
                    onChange={(v) => field.onChange(v || undefined)}
                    placeholder="-- Không chỉ định --"
                  />
                )}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Thợ support</label>
              <div className="border border-gray-200 rounded-lg p-2 max-h-36 overflow-y-auto space-y-1">
                {photographers
                  .filter((u) => u._id !== watch('leadPhotographer'))
                  .map((u) => (
                    <label
                      key={u._id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded"
                    >
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={supportIds.includes(u._id)}
                        onChange={(e) =>
                          setSupportIds((prev) =>
                            e.target.checked ? [...prev, u._id] : prev.filter((id) => id !== u._id),
                          )
                        }
                      />
                      <span className="text-sm text-gray-700">
                        {u.username}
                        {u.name ? ` (${u.name})` : ''}
                      </span>
                      -<span className="text-xs text-gray-400">{ROLE_LABELS[3]}</span>
                    </label>
                  ))}
                {photographers.length === 0 && (
                  <p className="text-sm text-gray-400 px-1">Không có người dùng phù hợp</p>
                )}
              </div>
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
      <ConfirmModal
        isOpen={!!confirmId}
        message="Bạn có chắc muốn xoá lịch chụp này?"
        onConfirm={doDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
};

export default SchedulesPage;
